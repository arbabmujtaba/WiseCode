// AudioWorklet that converts microphone audio to 16 kHz mono PCM16 and posts
// ~40 ms chunks to the main thread. Also reports RMS level for the UI/VAD.
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0; // fractional read position for resampling
    this.chunk = new Int16Array(640); // 40 ms @ 16 kHz
    this.filled = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
    const rms = Math.sqrt(sum / input.length);

    // Linear-interpolation downsample to 16 kHz.
    while (this.pos < input.length) {
      const i = Math.floor(this.pos);
      const frac = this.pos - i;
      const a = input[i];
      const b = i + 1 < input.length ? input[i + 1] : a;
      const s = Math.max(-1, Math.min(1, a + (b - a) * frac));
      this.chunk[this.filled++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.filled === this.chunk.length) {
        this.port.postMessage({ pcm: this.chunk.buffer, rms }, [this.chunk.buffer]);
        this.chunk = new Int16Array(640);
        this.filled = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= input.length;
    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
