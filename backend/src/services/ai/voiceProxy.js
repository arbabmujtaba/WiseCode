// Real-time voice tutor: a WebSocket proxy between the browser and the Gemini Live API.
//
// The Gemini API key never leaves the server. The browser connects to
//   ws(s)://<host>/api/ai/live?problemId=<id>
// authenticated by the normal session cookie, then exchanges:
//
// browser -> server
//   JSON  { type: 'start', mode: 'learning'|'direct', voice, history: [{role,text}] }   (first message)
//   binary  16 kHz mono PCM16 (little endian) microphone audio
//   JSON  { type: 'text', text }                 typed message (text fallback)
//   JSON  { type: 'audioEnd' }                   mic paused/muted
//   JSON  { type: 'toolResult', id, context }    answer to a 'tool' request (editor state)
//
// server -> browser
//   binary  24 kHz mono PCM16 model speech
//   JSON  { type: 'ready', model } | { type: 'inputTranscript', text } | { type: 'outputTranscript', text }
//         { type: 'interrupted' } | { type: 'turnComplete' } | { type: 'tool', id, name }
//         { type: 'reconnecting' } | { type: 'error', message, fatal }
const mongoose = require('mongoose');
const WebSocket = require('ws');
const Problem = require('../../models/Problem');
const { authenticateToken } = require('../../middleware/auth');
const { env, isAllowedOrigin } = require('../../config/env');
const { buildVoicePrompt, sanitizeContext, sanitizeHistory, TOOLS } = require('./voicePrompt');

const GEMINI_LIVE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];
const MAX_SESSIONS_PER_USER = 2;
const SETUP_TIMEOUT_MS = 15000;
const TOOL_TIMEOUT_MS = 5000;

const activeSessions = new Map(); // userId -> count

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((p) => p.trim().split('='))
      .filter(([k, v]) => k && v !== undefined)
      .map(([k, ...v]) => {
        try {
          return [k, decodeURIComponent(v.join('='))];
        } catch {
          return [k, v.join('=')];
        }
      })
  );

const rejectUpgrade = (socket, status, message) => {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\n${message}`);
  socket.destroy();
};

const friendlyClose = (code, reason) => {
  const r = String(reason || '');
  if (/API key|PERMISSION|unauthori/i.test(r)) return 'Voice is unavailable: the server Gemini API key was rejected.';
  if (/quota|RESOURCE_EXHAUSTED|rate/i.test(r)) return 'Voice tutor rate limit reached. Try again in a minute.';
  if (/not found|not supported|no longer available/i.test(r)) return 'The configured voice model is not available.';
  if (/demand|overload|UNAVAILABLE/i.test(r) || code === 1013) return 'The voice model is overloaded right now. Try again shortly.';
  return r ? `Voice session ended: ${r.slice(0, 160)}` : 'Voice session ended unexpectedly.';
};

class VoiceSession {
  constructor(client, user, problem) {
    this.client = client;
    this.user = user;
    this.problem = problem;
    this.upstream = null;
    this.ready = false;
    this.closed = false;
    this.resumeHandle = null;
    this.models = env.gemini.liveModels;
    this.modelIndex = 0;
    this.pendingTools = new Map(); // id -> timer
    this.options = null;
    this.startedAt = Date.now();
  }

  send(obj) {
    if (this.client.readyState === WebSocket.OPEN) this.client.send(JSON.stringify(obj));
  }

  fail(message) {
    this.send({ type: 'error', message, fatal: true });
    this.close(1011, 'error');
  }

  start(options) {
    this.options = {
      mode: options?.mode === 'direct' ? 'direct' : 'learning',
      voice: VOICES.includes(options?.voice) ? options.voice : 'Puck',
      history: sanitizeHistory(options?.history),
    };
    this.lifetime = setTimeout(() => {
      this.send({ type: 'error', message: 'Voice session time limit reached. Start a new session to continue.', fatal: true });
      this.close(1000, 'time limit');
    }, env.gemini.voiceMaxMs);
    this.connectUpstream();
  }

  setupMessage(model) {
    return {
      setup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.options.voice } } },
        },
        systemInstruction: {
          parts: [{ text: buildVoicePrompt({ problem: this.problem, mode: this.options.mode, history: this.options.history }) }],
        },
        tools: TOOLS,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        realtimeInputConfig: {
          automaticActivityDetection: {
            // Let the student pause to think without the model jumping in.
            endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
            silenceDurationMs: 700,
          },
          activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
        },
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: this.resumeHandle ? { handle: this.resumeHandle } : {},
      },
    };
  }

  connectUpstream() {
    if (this.closed) return;
    const model = this.models[this.modelIndex];
    const upstream = new WebSocket(GEMINI_LIVE_URL, { headers: { 'x-goog-api-key': env.gemini.key } });
    this.upstream = upstream;
    this.ready = false;
    let setupDone = false;

    const setupTimer = setTimeout(() => {
      if (!setupDone) upstream.terminate();
    }, SETUP_TIMEOUT_MS);

    upstream.on('open', () => upstream.send(JSON.stringify(this.setupMessage(model))));

    upstream.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.setupComplete) {
        setupDone = true;
        clearTimeout(setupTimer);
        this.ready = true;
        this.model = model;
        this.send({ type: 'ready', model });
        return;
      }
      this.handleUpstream(msg);
    });

    upstream.on('unexpected-response', (req, res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => this.onUpstreamClosed(upstream, setupDone, res.statusCode, body));
    });

    upstream.on('error', (err) => console.error('Gemini Live socket error:', err.message));

    upstream.on('close', (code, reason) => {
      clearTimeout(setupTimer);
      this.onUpstreamClosed(upstream, setupDone, code, reason?.toString());
    });
  }

  onUpstreamClosed(upstream, setupDone, code, reason) {
    if (upstream !== this.upstream || this.closed) return;
    this.upstream = null;
    this.ready = false;
    console.warn(`Gemini Live closed (model ${this.models[this.modelIndex]}): ${code} ${String(reason || '').slice(0, 200)}`);

    // Setup failed: try the next model.
    if (!setupDone && this.modelIndex < this.models.length - 1 && !/API key/i.test(String(reason))) {
      this.modelIndex++;
      return this.connectUpstream();
    }
    // Mid-session drop (e.g. after goAway): resume transparently if we have a handle.
    if (setupDone && this.resumeHandle) {
      this.send({ type: 'reconnecting' });
      return this.connectUpstream();
    }
    this.fail(friendlyClose(code, reason));
  }

  handleUpstream(msg) {
    if (msg.sessionResumptionUpdate) {
      if (msg.sessionResumptionUpdate.resumable && msg.sessionResumptionUpdate.newHandle) {
        this.resumeHandle = msg.sessionResumptionUpdate.newHandle;
      }
      return;
    }

    if (msg.goAway) {
      // Server will drop the connection soon; reconnect now using the resumption handle.
      if (this.resumeHandle && this.upstream) {
        const old = this.upstream;
        this.upstream = null;
        this.send({ type: 'reconnecting' });
        old.removeAllListeners('close');
        old.close();
        this.connectUpstream();
      }
      return;
    }

    if (msg.toolCall) {
      for (const call of msg.toolCall.functionCalls || []) {
        if (call.name !== 'get_editor_state') {
          this.sendToolResponse(call, { error: `Unknown tool ${call.name}` });
          continue;
        }
        // Ask the browser for the live editor state; answer with "unavailable" if it does not respond.
        const timer = setTimeout(() => {
          this.pendingTools.delete(call.id);
          this.sendToolResponse(call, { error: 'Editor state unavailable' });
        }, TOOL_TIMEOUT_MS);
        this.pendingTools.set(call.id, { call, timer });
        this.send({ type: 'tool', id: call.id, name: call.name });
      }
      return;
    }

    if (msg.toolCallCancellation) {
      for (const id of msg.toolCallCancellation.ids || []) {
        const pending = this.pendingTools.get(id);
        if (pending) clearTimeout(pending.timer);
        this.pendingTools.delete(id);
      }
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    for (const part of sc.modelTurn?.parts || []) {
      if (part.inlineData?.data && this.client.readyState === WebSocket.OPEN) {
        this.client.send(Buffer.from(part.inlineData.data, 'base64'), { binary: true });
      }
    }
    if (sc.inputTranscription?.text) this.send({ type: 'inputTranscript', text: sc.inputTranscription.text });
    if (sc.outputTranscription?.text) this.send({ type: 'outputTranscript', text: sc.outputTranscription.text });
    if (sc.interrupted) this.send({ type: 'interrupted' });
    if (sc.turnComplete) this.send({ type: 'turnComplete' });
  }

  sendToolResponse(call, response) {
    this.sendUpstream({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response }] } });
  }

  sendUpstream(obj) {
    if (this.ready && this.upstream?.readyState === WebSocket.OPEN) {
      this.upstream.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  handleClient(data, isBinary) {
    if (isBinary) {
      // Microphone audio; drop silently while (re)connecting.
      if (data.length && data.length <= 64000) {
        this.sendUpstream({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: data.toString('base64') } } });
      }
      return;
    }

    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'start':
        if (!this.options) this.start(msg);
        break;
      case 'text': {
        const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 4000) : '';
        if (text && !this.sendUpstream({ realtimeInput: { text } })) {
          this.send({ type: 'error', message: 'Still connecting… try again in a second.', fatal: false });
        }
        break;
      }
      case 'audioEnd':
        this.sendUpstream({ realtimeInput: { audioStreamEnd: true } });
        break;
      case 'toolResult': {
        const pending = this.pendingTools.get(msg.id);
        if (!pending) break;
        clearTimeout(pending.timer);
        this.pendingTools.delete(msg.id);
        this.sendToolResponse(pending.call, sanitizeContext(msg.context));
        break;
      }
      default:
        break;
    }
  }

  close(code = 1000, reason = '') {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.lifetime);
    for (const { timer } of this.pendingTools.values()) clearTimeout(timer);
    this.pendingTools.clear();
    if (this.upstream) {
      this.upstream.removeAllListeners('close');
      this.upstream.close();
    }
    if (this.client.readyState === WebSocket.OPEN) this.client.close(code, reason);
  }
}

// Attaches the /api/ai/live WebSocket endpoint to an existing HTTP server.
const attachVoiceServer = (server) => {
  const wss = new WebSocket.WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

  server.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/ai/live') return rejectUpgrade(socket, 404, 'Not Found');
    if (!isAllowedOrigin(req.headers.origin)) return rejectUpgrade(socket, 403, 'Forbidden origin');
    if (!env.gemini.key) return rejectUpgrade(socket, 503, 'Voice tutor is not configured');

    let user;
    try {
      user = await authenticateToken(parseCookies(req.headers.cookie).token);
    } catch {
      return rejectUpgrade(socket, 401, 'Unauthorized');
    }

    const problemId = url.searchParams.get('problemId');
    if (!mongoose.isValidObjectId(problemId)) return rejectUpgrade(socket, 400, 'Invalid problem id');
    const problem = await Problem.findById(problemId).select('title description difficulty tags visibleTestCases').lean();
    if (!problem) return rejectUpgrade(socket, 404, 'Problem not found');

    const userId = String(user._id);
    if ((activeSessions.get(userId) || 0) >= MAX_SESSIONS_PER_USER) {
      return rejectUpgrade(socket, 429, 'Too many voice sessions');
    }

    wss.handleUpgrade(req, socket, head, (client) => {
      activeSessions.set(userId, (activeSessions.get(userId) || 0) + 1);
      const session = new VoiceSession(client, user, problem);

      // Keep idle connections alive through proxies.
      client.isAlive = true;
      client.on('pong', () => (client.isAlive = true));

      client.on('message', (data, isBinary) => session.handleClient(data, isBinary));
      client.on('close', () => {
        session.close();
        const n = (activeSessions.get(userId) || 1) - 1;
        if (n > 0) activeSessions.set(userId, n);
        else activeSessions.delete(userId);
      });
      client.on('error', () => session.close());
    });
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (!client.isAlive) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
};

module.exports = { attachVoiceServer };
