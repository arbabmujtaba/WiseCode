import { useCallback, useEffect, useRef, useState } from 'react';
import { MicCapture, PcmPlayer, VOICE_SUPPORTED, liveUrl } from '../lib/voiceAudio';

// Voice session state machine:
//   idle -> connecting -> listening <-> (userSpeaking -> thinking -> speaking) ... -> idle | error
export const VOICE_STATUS = {
  idle: 'Voice off',
  connecting: 'Connecting…',
  listening: 'Listening',
  userSpeaking: 'Hearing you',
  thinking: 'Thinking…',
  speaking: 'Speaking',
  reconnecting: 'Reconnecting…',
  error: 'Voice unavailable',
};

const chatKey = (id) => `wisecode:chat:${id}`;
const SPEECH_RMS = 0.04; // mic level that counts as speech
const BARGE_IN_CHUNKS = 3; // ~120 ms of sustained speech interrupts playback locally
const SILENCE_CHUNKS = 15; // ~600 ms of quiet ends "hearing you"

// Shared with the text tutor (ChatAi) so both modes see one conversation.
const readChat = (problemId) => {
  try {
    return JSON.parse(sessionStorage.getItem(chatKey(problemId))) || [];
  } catch {
    return [];
  }
};
const appendChat = (problemId, role, text) => {
  if (!text?.trim()) return;
  const list = readChat(problemId);
  list.push({ role, parts: [{ text: text.trim() }], via: 'voice' });
  sessionStorage.setItem(chatKey(problemId), JSON.stringify(list.slice(-30)));
};

const permissionMessage = (err) => {
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError')
    return 'Microphone access was blocked. Allow it in your browser’s site settings, or use text chat.';
  if (err?.name === 'NotFoundError') return 'No microphone was found. Plug one in, or use text chat.';
  if (err?.name === 'NotReadableError') return 'Your microphone is in use by another app.';
  return err?.message || 'Could not start the microphone.';
};

/**
 * Real-time voice conversation with the AI tutor.
 * @param problemId current problem
 * @param getContext () => { language, code, cursorLine, lastRun, lastSubmit } – read when the model asks
 */
export function useVoiceSession({ problemId, getContext }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [mode, setMode] = useState(() => localStorage.getItem('wisecode:voice-mode') || 'learning');
  const [voice, setVoice] = useState(() => localStorage.getItem('wisecode:voice-name') || 'Puck');
  const [turns, setTurns] = useState([]); // [{ id, role, text, final, interrupted }]
  const [model, setModel] = useState('');

  const ws = useRef(null);
  const mic = useRef(null);
  const player = useRef(null);
  const contextRef = useRef(getContext);
  const live = useRef({ user: null, model: null, loud: 0, quiet: 0, seq: 0, stopping: false });
  const statusRef = useRef(status);

  useEffect(() => {
    contextRef.current = getContext;
  }, [getContext]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => localStorage.setItem('wisecode:voice-mode', mode), [mode]);
  useEffect(() => localStorage.setItem('wisecode:voice-name', voice), [voice]);

  const set = (s) => {
    statusRef.current = s;
    setStatus(s);
  };

  // Append text to the in-progress turn for `role`, creating it if needed.
  const addText = useCallback((role, text) => {
    const L = live.current;
    setTurns((prev) => {
      const id = L[role];
      const idx = id == null ? -1 : prev.findIndex((t) => t.id === id);
      if (idx === -1) {
        const nid = ++L.seq;
        L[role] = nid;
        return [...prev, { id: nid, role, text: text.trimStart(), final: false }].slice(-60);
      }
      const next = prev.slice();
      next[idx] = { ...next[idx], text: next[idx].text + text };
      return next;
    });
  }, []);

  // Close the open turn for `role` and persist it to the shared chat history.
  const finalize = useCallback(
    (role, extra = {}) => {
      const L = live.current;
      const id = L[role];
      if (id == null) return;
      L[role] = null;
      setTurns((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          appendChat(problemId, role, t.text + (extra.interrupted ? ' …' : ''));
          return { ...t, ...extra, final: true };
        })
      );
    },
    [problemId]
  );

  const teardown = useCallback(async () => {
    live.current.stopping = true;
    const socket = ws.current;
    ws.current = null;
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      if (socket.readyState <= 1) socket.close(1000, 'user ended');
    }
    await Promise.all([mic.current?.stop(), player.current?.stop()]);
    mic.current = null;
    player.current = null;
  }, []);

  const stop = useCallback(async () => {
    finalize('user');
    finalize('model');
    await teardown();
    set('idle');
  }, [finalize, teardown]);

  const failWith = useCallback(
    async (message) => {
      finalize('user');
      finalize('model');
      await teardown();
      setError(message);
      set('error');
    },
    [finalize, teardown]
  );

  const sendToolResult = (id) => {
    let context = {};
    try {
      context = contextRef.current?.() || {};
    } catch {
      /* ignore */
    }
    ws.current?.send(JSON.stringify({ type: 'toolResult', id, context }));
  };

  const onServerMessage = (msg) => {
    switch (msg.type) {
      case 'ready':
        setModel(msg.model);
        set('listening');
        break;
      case 'inputTranscript':
        addText('user', msg.text);
        if (statusRef.current === 'listening') set('userSpeaking');
        break;
      case 'outputTranscript':
        finalize('user');
        addText('model', msg.text);
        break;
      case 'interrupted':
        // Server VAD heard the student: cut playback immediately.
        player.current?.flush();
        finalize('model', { interrupted: true });
        set('userSpeaking');
        break;
      case 'turnComplete':
        finalize('user');
        finalize('model');
        if (!player.current?.playing) set('listening');
        break;
      case 'tool':
        set('thinking');
        sendToolResult(msg.id);
        break;
      case 'reconnecting':
        set('reconnecting');
        break;
      case 'error':
        if (msg.fatal) failWith(msg.message);
        else setError(msg.message);
        break;
      default:
        break;
    }
  };

  const start = useCallback(async () => {
    if (!VOICE_SUPPORTED) {
      setError('Voice needs a modern browser with microphone support. Use text chat instead.');
      set('error');
      return;
    }
    if (ws.current) return;
    setError('');
    set('connecting');
    live.current = { user: null, model: null, loud: 0, quiet: 0, seq: live.current.seq, stopping: false };

    // 1. Audio output first (must be created in the click handler for autoplay policies).
    const out = new PcmPlayer({
      onPlayingChange: (playing) => {
        if (playing) set('speaking');
        else if (statusRef.current === 'speaking') set('listening');
      },
    });
    player.current = out;
    try {
      await out.start();
      out.setMuted(speakerMuted);
    } catch {
      return failWith('Could not start audio playback in this browser.');
    }

    // 2. Microphone.
    const capture = new MicCapture({
      onChunk: (pcm) => {
        if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(pcm);
      },
      onLevel: (rms) => {
        const L = live.current;
        if (rms > SPEECH_RMS) {
          L.loud++;
          L.quiet = 0;
          // Local barge-in: stop the tutor as soon as the student clearly starts talking.
          if (L.loud >= BARGE_IN_CHUNKS && player.current?.playing) {
            player.current.flush();
            finalize('model', { interrupted: true });
            set('userSpeaking');
          } else if (L.loud >= BARGE_IN_CHUNKS && statusRef.current === 'listening') {
            set('userSpeaking');
          }
        } else {
          L.quiet++;
          if (L.quiet >= SILENCE_CHUNKS) {
            L.loud = 0;
            if (statusRef.current === 'userSpeaking') set('thinking');
          }
        }
      },
    });
    capture.onEnded = () => failWith('The microphone was disconnected.');
    mic.current = capture;
    try {
      await capture.start();
      capture.setMuted(micMuted);
    } catch (err) {
      return failWith(permissionMessage(err));
    }

    // 3. WebSocket to our backend (session cookie authenticates it).
    const socket = new WebSocket(liveUrl(problemId));
    socket.binaryType = 'arraybuffer';
    ws.current = socket;
    let opened = false;

    socket.onopen = () => {
      opened = true;
      const history = readChat(problemId)
        .slice(-12)
        .map((m) => ({ role: m.role, text: m.parts?.[0]?.text || '' }));
      socket.send(JSON.stringify({ type: 'start', mode, voice, history }));
    };
    socket.onmessage = (e) => {
      if (typeof e.data === 'string') {
        try {
          onServerMessage(JSON.parse(e.data));
        } catch {
          /* ignore malformed */
        }
      } else if (!live.current.stopping) {
        player.current?.enqueue(e.data);
      }
    };
    socket.onerror = () => {};
    socket.onclose = (e) => {
      if (live.current.stopping) return;
      ws.current = null;
      failWith(
        opened
          ? e.reason || 'The voice connection was closed.'
          : 'Could not connect to the voice tutor. Check that you are signed in and the server is running.'
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, mode, voice, micMuted, speakerMuted, failWith, finalize]);

  const sendText = useCallback(
    (text) => {
      const t = text.trim();
      if (!t || ws.current?.readyState !== WebSocket.OPEN) return false;
      player.current?.flush();
      finalize('model', { interrupted: player.current?.playing });
      finalize('user');
      const id = ++live.current.seq;
      setTurns((prev) => [...prev, { id, role: 'user', text: t, final: true, typed: true }].slice(-60));
      appendChat(problemId, 'user', t);
      ws.current.send(JSON.stringify({ type: 'text', text: t }));
      set('thinking');
      return true;
    },
    [finalize, problemId]
  );

  const interrupt = useCallback(() => {
    player.current?.flush();
    finalize('model', { interrupted: true });
    if (ws.current) set('listening');
  }, [finalize]);

  const toggleMic = useCallback(() => {
    setMicMuted((m) => {
      const next = !m;
      mic.current?.setMuted(next);
      if (next && ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: 'audioEnd' }));
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerMuted((m) => {
      player.current?.setMuted(!m);
      return !m;
    });
  }, []);

  const clearTurns = useCallback(() => setTurns([]), []);

  // End the session when the problem changes or the page unmounts.
  useEffect(() => {
    return () => {
      teardown();
      statusRef.current = 'idle';
      setStatus('idle');
    };
  }, [problemId, teardown]);

  // Release the microphone when the page is closed or navigated away.
  useEffect(() => {
    const onHide = () => teardown();
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [teardown]);

  const active = !['idle', 'error'].includes(status);

  return {
    supported: VOICE_SUPPORTED,
    status,
    active,
    error,
    model,
    turns,
    mode,
    setMode,
    voice,
    setVoice,
    micMuted,
    speakerMuted,
    start,
    stop,
    sendText,
    interrupt,
    toggleMic,
    toggleSpeaker,
    clearTurns,
    dismissError: () => {
      setError('');
      if (statusRef.current === 'error') set('idle');
    },
    analysers: () => ({ mic: mic.current?.analyser, out: player.current?.analyser }),
  };
}
