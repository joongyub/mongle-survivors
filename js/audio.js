// audio.js — 효과음과 배경음악을 WebAudio로 직접 합성합니다 (외부 파일 없음).
(function () {
  const G = (window.G = window.G || {});
  const A = (G.audio = { ctx: null, sfxOn: true, bgmOn: true, master: null, sfxBus: null, bgmBus: null, last: {} });

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      A.ctx = new C();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.7; A.master.connect(A.ctx.destination);
      A.sfxBus = A.ctx.createGain(); A.sfxBus.gain.value = 0.55; A.sfxBus.connect(A.master);
      A.bgmBus = A.ctx.createGain(); A.bgmBus.gain.value = 0.22; A.bgmBus.connect(A.master);
      A.noiseBuf = A.ctx.createBuffer(1, A.ctx.sampleRate * 0.3, A.ctx.sampleRate);
      const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { A.ctx = null; }
  };

  function throttle(key, ms) {
    const now = performance.now();
    if (A.last[key] && now - A.last[key] < ms) return false;
    A.last[key] = now; return true;
  }
  function tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0, bus) {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + delay;
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(bus || A.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2, freq = 1200, delay = 0) {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + delay;
    const s = A.ctx.createBufferSource(); s.buffer = A.noiseBuf;
    const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = A.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t); s.stop(t + dur + 0.02);
  }

  const SFX = {
    hit() { if (throttle('hit', 45)) { tone(380 + Math.random() * 120, 0.06, 'square', 0.07, 0.5); tone(130 + Math.random() * 30, 0.07, 'sine', 0.12, 0.4); noise(0.05, 0.09, 2200); } },
    crit() { if (throttle('crit', 70)) { tone(900, 0.08, 'square', 0.08, 0.6); tone(1400, 0.1, 'triangle', 0.08, 0.8, 0.02); } },
    kill() { if (throttle('kill', 40)) { tone(600 + Math.random() * 200, 0.07, 'triangle', 0.08, 1.8); } },
    swing() { if (throttle('swing', 60)) noise(0.12, 0.09, 900); },
    shoot() { if (throttle('shoot', 50)) tone(700, 0.05, 'triangle', 0.05, 1.4); },
    boom() { if (throttle('boom', 60)) { noise(0.25, 0.18, 300); tone(140, 0.25, 'sine', 0.2, 0.5); } },
    gem(combo) { if (throttle('gem', 30)) tone(880 * Math.pow(2, Math.min(combo, 24) / 24), 0.07, 'sine', 0.09); },
    bell() { tone(1320, 0.12, 'triangle', 0.1); tone(1760, 0.18, 'triangle', 0.08, 1, 0.06); },
    heal() { [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.1, 1, i * 0.06)); },
    hurt() { if (throttle('hurt', 120)) { tone(220, 0.18, 'square', 0.12, 0.5); noise(0.12, 0.12, 500); } },
    levelup() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.07, 1, i * 0.07)); },
    pick() { tone(988, 0.08, 'square', 0.07); tone(1319, 0.12, 'square', 0.07, 1, 0.07); },
    click() { tone(660, 0.05, 'triangle', 0.08); },
    chest() { [392, 523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, 1, i * 0.09)); },
    evolve() { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => { tone(f, 0.25, 'square', 0.06, 1, i * 0.08); tone(f / 2, 0.25, 'triangle', 0.08, 1, i * 0.08); }); },
    warn() { for (let i = 0; i < 3; i++) { tone(440, 0.25, 'square', 0.08, 1, i * 0.4); tone(330, 0.25, 'square', 0.08, 1, i * 0.4 + 0.2); } },
    death() { [523, 440, 349, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, 1, i * 0.18)); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.22, 'square', 0.07, 1, i * 0.12)); },
    magnet() { tone(400, 0.4, 'sine', 0.1, 3); },
  };
  A.play = function (name, arg) { if (!A.ctx || !A.sfxOn) return; try { SFX[name] && SFX[name](arg); } catch (e) {} };

  // ---------- 배경음악: 귀여운 마을 루프 ----------
  // 각 마디: [멜로디 음 8개 (0=쉼)], 코드 루트
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const SONG = {
    bpm: 118,
    mel: [
      72, 0, 76, 79, 77, 76, 74, 0, 71, 0, 74, 77, 76, 74, 72, 0,
      69, 72, 76, 74, 72, 71, 72, 0, 74, 0, 72, 71, 67, 0, 0, 0,
      72, 0, 76, 79, 81, 79, 77, 76, 77, 0, 74, 77, 81, 79, 77, 0,
      76, 77, 79, 76, 72, 74, 76, 72, 74, 0, 71, 74, 72, 0, 0, 0,
    ],
    bass: [48, 48, 43, 43, 45, 45, 43, 43, 48, 48, 50, 50, 52, 50, 43, 48],
  };
  let step = 0, nextT = 0, timer = null, intense = 0;
  A.setIntensity = (v) => { intense = v; };
  function schedule() {
    if (!A.ctx) return;
    const spb = 60 / SONG.bpm / 2; // 8분음표
    while (nextT < A.ctx.currentTime + 0.15) {
      const m = SONG.mel[step % SONG.mel.length];
      if (m) tone(N(m), spb * 1.6, 'triangle', 0.18, 1, nextT - A.ctx.currentTime, A.bgmBus);
      if (step % 4 === 0) {
        const b = SONG.bass[Math.floor(step / 4) % SONG.bass.length];
        tone(N(b), spb * 3.2, 'square', 0.07, 1, nextT - A.ctx.currentTime, A.bgmBus);
      }
      if (intense > 0 && step % 2 === 0) noiseHat(nextT, intense);
      nextT += spb; step++;
    }
  }
  function noiseHat(t, v) {
    const s = A.ctx.createBufferSource(); s.buffer = A.noiseBuf;
    const f = A.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.05 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(A.bgmBus); s.start(t); s.stop(t + 0.06);
  }
  A.startBgm = function () {
    if (!A.ctx || timer) return;
    nextT = A.ctx.currentTime + 0.1; step = 0;
    timer = setInterval(() => { if (A.bgmOn) schedule(); else nextT = A.ctx.currentTime + 0.1; }, 50);
  };
  A.stopBgm = function () { if (timer) clearInterval(timer); timer = null; };
  A.duck = function (on) { if (A.bgmBus) A.bgmBus.gain.value = on ? 0.08 : 0.22; };
})();
