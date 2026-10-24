// Browser audio plumbing for the voice tutor (no third-party libraries).
//   MicCapture   – getUserMedia + AudioWorklet -> 16 kHz PCM16 chunks
//   PcmPlayer    – gapless playback of 24 kHz PCM16 chunks with instant stop (barge-in)
// Both expose an AnalyserNode so the UI can draw a live waveform.

export const VOICE_SUPPORTED =
  typeof window !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof AudioWorkletNode !== 'undefined' &&
  typeof WebSocket !== 'undefined';

const AudioCtx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;

export class MicCapture {
  constructor({ onChunk, onLevel }) {
    this.onChunk = onChunk;
    this.onLevel = onLevel;
    this.muted = false;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.ctx = new AudioCtx();
    await this.ctx.audioWorklet.addModule('/worklets/pcm-capture.js');
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.node = new AudioWorkletNode(this.ctx, 'pcm-capture');
    this.node.port.onmessage = ({ data }) => {
      this.onLevel?.(this.muted ? 0 : data.rms);
      if (!this.muted) this.onChunk?.(data.pcm);
    };
    this.source.connect(this.analyser);
    this.source.connect(this.node);
    // The worklet must be pulled by the graph; route it to a muted gain.
    const sink = this.ctx.createGain();
    sink.gain.value = 0;
    this.node.connect(sink).connect(this.ctx.destination);

    // Detect the mic being unplugged / permission revoked.
    this.stream.getAudioTracks()[0]?.addEventListener('ended', () => this.onEnded?.());
  }

  setMuted(muted) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  async stop() {
    this.node?.port && (this.node.port.onmessage = null);
    this.stream?.getTracks().forEach((t) => t.stop());
    try {
      await this.ctx?.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
  }
}

export class PcmPlayer {
  constructor({ sampleRate = 24000, onPlayingChange } = {}) {
    this.sampleRate = sampleRate;
    this.onPlayingChange = onPlayingChange;
    this.sources = new Set();
    this.nextTime = 0;
    this.playing = false;
    this.volume = 1;
  }

  async start() {
    this.ctx = new AudioCtx({ sampleRate: this.sampleRate });
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = this.volume;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.gain.connect(this.analyser).connect(this.ctx.destination);
  }

  setPlaying(p) {
    if (p !== this.playing) {
      this.playing = p;
      this.onPlayingChange?.(p);
    }
  }

  // Queue one PCM16 chunk (ArrayBuffer) right after the previous one.
  enqueue(arrayBuffer) {
    if (!this.ctx) return;
    const pcm = new Int16Array(arrayBuffer);
    if (!pcm.length) return;
    const buffer = this.ctx.createBuffer(1, pcm.length, this.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);
    // Small lead time absorbs network jitter without adding noticeable latency.
    const startAt = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
    src.start(startAt);
    this.nextTime = startAt + buffer.duration;
    this.sources.add(src);
    this.setPlaying(true);
    src.onended = () => {
      this.sources.delete(src);
      if (!this.sources.size) this.setPlaying(false);
    };
  }

  // Immediately silence everything that is queued (user interrupted).
  flush() {
    for (const src of this.sources) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* not started */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
    this.setPlaying(false);
  }

  setMuted(muted) {
    this.volume = muted ? 0 : 1;
    if (this.gain) this.gain.gain.value = this.volume;
  }

  async stop() {
    this.flush();
    try {
      await this.ctx?.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
  }
}

// Builds the ws(s):// URL for the voice endpoint from the REST API base URL.
export const liveUrl = (problemId) => {
  const base = new URL(import.meta.env.VITE_API_URL || 'http://localhost:3000', window.location.href);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = `${base.pathname.replace(/\/$/, '')}/ai/live`;
  base.search = `?problemId=${encodeURIComponent(problemId)}`;
  return base.toString();
};
