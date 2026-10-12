// 아주 간단한 효과음 (코드로 만든 소리). 나중에 음원 파일로 바꿀 수 있어.
import { state } from './state/GameState.js';

let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.15, slide = 0, delay = 0 } = {}) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(660, 0.07, { vol: 0.06 }),
  plant: () => { tone(320, 0.12, { type: 'triangle', slide: 1.5 }); tone(480, 0.1, { type: 'triangle', delay: 0.08, vol: 0.1 }); },
  water: () => { for (let i = 0; i < 4; i++) tone(900 + Math.random() * 500, 0.06, { vol: 0.05, delay: i * 0.06, slide: 0.7 }); },
  harvest: () => { tone(520, 0.1, { type: 'triangle', slide: 1.6 }); tone(880, 0.16, { type: 'sine', delay: 0.09, vol: 0.12 }); },
  coin: () => { tone(988, 0.08, { type: 'square', vol: 0.05 }); tone(1319, 0.18, { type: 'square', vol: 0.05, delay: 0.07 }); },
  open: () => tone(560, 0.08, { type: 'triangle', slide: 1.3, vol: 0.08 }),
  nope: () => tone(220, 0.12, { type: 'triangle', slide: 0.8, vol: 0.08 }),
  place: () => { tone(300, 0.08, { type: 'triangle', vol: 0.12 }); tone(450, 0.1, { type: 'triangle', vol: 0.08, delay: 0.06 }); },
  build: () => { for (let i = 0; i < 3; i++) tone(180, 0.07, { type: 'square', vol: 0.05, delay: i * 0.13, slide: 0.7 }); },
  built: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.35 : 0.12, { type: 'triangle', vol: 0.12, delay: i * 0.1 })); },
  chop: () => { tone(260, 0.06, { type: 'square', vol: 0.06, slide: 0.6 }); tone(220, 0.06, { type: 'square', vol: 0.05, delay: 0.1, slide: 0.6 }); },
  pick: () => { tone(1200, 0.05, { type: 'square', vol: 0.04 }); tone(900, 0.06, { type: 'square', vol: 0.04, delay: 0.08 }); },
};

export function sfx(name) {
  if (state.settings.muted) return;
  SOUNDS[name]?.();
}
