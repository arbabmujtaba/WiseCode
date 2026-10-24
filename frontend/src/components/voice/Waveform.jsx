import { useEffect, useRef } from 'react';

// Live waveform drawn from the mic analyser (user speaking) or the output analyser (AI speaking).
// Falls back to a gentle idle animation when there is no audio.
export default function Waveform({ getAnalysers, status, height = 56, bars = 36, className = '' }) {
  const canvasRef = useRef(null);
  const statusRef = useRef(status);
  const analysersRef = useRef(getAnalysers);

  useEffect(() => {
    statusRef.current = status;
    analysersRef.current = getAnalysers;
  }, [status, getAnalysers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const data = new Uint8Array(256);
    const levels = new Float32Array(bars);
    let raf;
    let t = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const s = statusRef.current;
      const { mic, out } = analysersRef.current?.() || {};
      const analyser = s === 'speaking' ? out : ['listening', 'userSpeaking'].includes(s) ? mic : null;
      const styles = getComputedStyle(canvas);
      const color =
        s === 'speaking'
          ? styles.getPropertyValue('--color-secondary')
          : s === 'userSpeaking'
            ? styles.getPropertyValue('--color-success')
            : s === 'error'
              ? styles.getPropertyValue('--color-error')
              : styles.getPropertyValue('--color-primary');

      if (analyser) analyser.getByteFrequencyData(data);
      t += 0.05;

      const gap = 3;
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars);
      for (let i = 0; i < bars; i++) {
        let target;
        if (analyser) {
          // Speech energy lives in the low bins; mirror around the centre.
          const centre = Math.abs(i - (bars - 1) / 2) / (bars / 2);
          const bin = Math.floor(centre * 48) + 2;
          target = (data[bin] / 255) ** 1.4;
        } else if (s === 'thinking' || s === 'connecting' || s === 'reconnecting') {
          target = 0.15 + 0.25 * Math.max(0, Math.sin(t * 3 - i * 0.35));
        } else {
          target = reduced ? 0.06 : 0.05 + 0.04 * Math.sin(t + i * 0.5);
        }
        levels[i] += (target - levels[i]) * 0.35;
        const bh = Math.max(3, levels[i] * h);
        ctx.fillStyle = color || '#8b5cf6';
        ctx.globalAlpha = 0.45 + levels[i] * 0.55;
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, bw, bh, bw / 2) : ctx.rect(x, y, bw, bh);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bars]);

  return <canvas ref={canvasRef} className={`w-full ${className}`} style={{ height }} aria-hidden="true" />;
}
