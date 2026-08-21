// Hệ thống âm thanh tương tác sử dụng Web Audio API tích hợp
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export type SoundType = "correct" | "wrong" | "timeup" | "tick" | "fanfare";

export function playSound(type: SoundType) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "correct") {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "wrong") {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(150);
      }
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "tick") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "timeup") {
      osc.type = "square";
      osc.frequency.setValueAtTime(450, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.setValueAtTime(0.2, now + 0.15);
      gain.gain.setValueAtTime(0, now + 0.2);
      gain.gain.setValueAtTime(0.2, now + 0.25);
      gain.gain.setValueAtTime(0.2, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === "fanfare") {
      // Âm thanh hoàn thành bài thi
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(f, now + i * 0.1);
        g.gain.setValueAtTime(0.2, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.35);
      });
    }
  } catch (err) {
    console.warn("Audio error:", err);
  }
}
