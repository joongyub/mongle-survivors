// game.js — 전투 엔진: 플레이어, 적, 무기, 경험치, 렌더링
(function () {
  const G = (window.G = window.G || {});
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  // ---------- 저장 ----------
  const SAVE_KEY = 'mongle-survivors-v1';
  const defSave = () => ({ bells: 0, shop: {}, best: {}, settings: { sfx: true, bgm: true, numbers: true, shake: true }, runs: 0, totalKills: 0, lastChar: 'momo' });
  G.save = defSave();
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) G.save = Object.assign(defSave(), s, { settings: Object.assign(defSave().settings, s.settings || {}) }); } catch (e) {}
  G.saveNow = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {} };

  // ---------- 상태 ----------
  const game = (G.game = { state: 'title', time: 0 });
  let P = null; // 플레이어
  let enemies = [], attacks = [], gems = [], pickups = [], particles = [], texts = [], eshots = [];
  let cam = { x: 0, y: 0 };
  let shake = 0, timeScale = 1, slowmoT = 0;
  let spawnT = 0, eliteT = 0, bossIdx = 0, eventIdx = 0, gemCombo = 0, gemComboT = 0;
  let banner = null;
  let combo = 0, comboT = 0, comboPop = 0, comboFlash = null, hitstop = 0;
  let boss = null;

  // ---------- 화면 ----------
  let canvas, ctx, W = 0, H = 0, S = 4, viewW = 0, viewH = 0, U = 1, offX = 0, offY = 0;
  G.resize = function (w, h) {
    W = canvas.width = Math.round(w); H = canvas.height = Math.round(h);
    S = Math.max(1, Math.round(H / 270)); viewW = W / S; viewH = H / S; U = (H / 360) * (G.uiScale || 1);
    ctx.imageSmoothingEnabled = false;
  };

  // ---------- 입력 ----------
  const keys = {};
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
  G.input = { keys, joy };

  // ---------- 플레이어 스탯 ----------
  function baseStats() {
    return { maxHp: 100, speed: 1, might: 1, area: 1, cd: 1, amount: 0, armor: 0, regen: 0, crit: 0.05, critMult: 2, luck: 1, magnet: 1, growth: 1, pspeed: 1, dur: 1, greed: 1, rerolls: 2, revives: 0 };
  }
  function recalc() {
    const st = baseStats();
    const ch = G.CHARS.find((c) => c.id === P.char);
    for (const k in ch.bonus) st[k] += ch.bonus[k];
    for (const it of G.SHOP) { const l = G.save.shop[it.id] || 0; if (l) it.apply(st, l); }
    for (const id in P.passives) G.PASSIVES[id].apply(st, P.passives[id]);
    st.critMult = 2 + Math.max(0, st.crit - 0.05) * 2; // 치명타가 오를수록 배율도 상승
    const hpRatio = P.st ? P.hp / P.st.maxHp : 1;
    const keepRR = P.st ? P.rerollsLeft : null;
    P.st = st;
    P.hp = Math.min(st.maxHp, Math.max(1, hpRatio * st.maxHp));
    if (keepRR == null) { P.rerollsLeft = st.rerolls; P.revivesLeft = st.revives; }
    for (const w of P.weapons) w.s = wstats(w);
    if (P.base) P.base.s = wstats(P.base);
  }
  function wstats(w) {
    const def = G.WEAPONS[w.id];
    const s = Object.assign({}, def.base);
    for (let i = 0; i < w.lvl - 1 && i < def.ups.length; i++) {
      const u = def.ups[i][1];
      for (const k in u) { if (k === 'cdm') s.cd *= 1 + u[k]; else s[k] = (s[k] || 0) + u[k]; }
    }
    const st = P.st;
    s.cdF = s.cd * TEMPO * Math.max(0.3, st.cd); // TEMPO: 공격이 끊기지 않게 전체 쿨타임을 짧게
    s.areaF = s.area * st.area;
    s.amountF = s.amount + st.amount;
    s.speedF = (s.speed || 1) * st.pspeed;
    s.durF = (s.dur || 1) * st.dur;
    return s;
  }
  const TEMPO = 0.62;
  G.weaponMax = (id) => (G.WEAPONS[id].evolved ? 1 : G.WEAPONS[id].ups.length + 1);
  const xpNeed = (lv) => Math.floor((5 + (lv - 1) * 6 + Math.pow(lv - 1, 1.62)) * (lv > 20 ? 1 + (lv - 20) * 0.05 : 1));

  // ---------- 런 시작 ----------
  G.startRun = function (charId) {
    const ch = G.CHARS.find((c) => c.id === charId);
    P = G.player = { char: charId, x: 0, y: 0, r: 7, hp: 100, st: null, weapons: [], passives: {}, level: 1, xp: 0, facing: 1, aimX: 1, aimY: 0, moving: false, anim: 0, iframe: 0, hurtT: 0, pendingLv: 0, bells: 0, kills: 0, rerollsLeft: 0, revivesLeft: 0 };
    enemies = []; attacks = []; gems = []; pickups = []; particles = []; texts = []; eshots = [];
    combo = 0; comboT = 0; comboFlash = null; hitstop = 0;
    game.time = 0; spawnT = 0; eliteT = 120; bossIdx = 0; eventIdx = 0; boss = null; banner = null; shake = 0; timeScale = 1; slowmoT = 0;
    game.won = false; game.endT = 0;
    recalc();
    P.hp = P.st.maxHp;
    addWeapon(ch.weapon);
    P.base = { id: 'base', lvl: 1, t: 0.4, s: null, dealt: 0, kills: 0, since: 0, icon: G.WEAPONS[ch.weapon].icon };
    P.base.s = wstats(P.base);
    G.save.lastChar = charId; G.saveNow();
    game.state = 'play';
    showBanner(G.t('deploy', { name: ch.name }), G.t('deploySub'), 2.2);
  };

  function addWeapon(id) {
    const w = { id, lvl: 1, t: 0.3, s: null, dealt: 0, kills: 0, since: game.time };
    w.s = wstats(w);
    P.weapons.push(w);
    return w;
  }

  // ---------- 업그레이드 선택지 ----------
  G.buildChoices = function () {
    const pool = [];
    const ownedW = new Set(P.weapons.map((w) => w.id));
    const evoPartners = new Set(P.weapons.filter((w) => !G.WEAPONS[w.id].evolved).map((w) => G.WEAPONS[w.id].evo.need));
    for (const w of P.weapons) {
      const d = G.WEAPONS[w.id];
      if (d.evolved || w.lvl >= G.weaponMax(w.id)) continue;
      pool.push({ type: 'weapon', id: w.id, lvl: w.lvl + 1, wgt: 1.3 });
    }
    if (P.weapons.length < 6) {
      for (const id in G.WEAPONS) {
        const d = G.WEAPONS[id];
        if (d.evolved || d.hidden || ownedW.has(id) || ownedW.has(d.evo.into)) continue;
        const partner = P.passives[d.evo.need] ? 1.4 : 1;
        pool.push({ type: 'weapon', id, lvl: 1, wgt: 0.75 * partner });
      }
    }
    const pCount = Object.keys(P.passives).length;
    for (const id in G.PASSIVES) {
      const l = P.passives[id] || 0;
      if (l >= G.PASSIVES[id].max) continue;
      if (!l && pCount >= 6) continue;
      pool.push({ type: 'passive', id, lvl: l + 1, wgt: (l ? 1.1 : 0.8) * (evoPartners.has(id) ? 1.7 : 1) });
    }
    const n = 3 + (P.st.luck >= 1.25 ? 1 : 0);
    const out = [];
    while (out.length < n && pool.length) {
      let tot = 0; for (const o of pool) tot += o.wgt;
      let r = Math.random() * tot, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].wgt; if (r <= 0) break; }
      out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    if (!out.length) { out.push({ type: 'heal' }, { type: 'bells' }); }
    for (const o of out) {
      if (o.type === 'passive') o.evoHint = evoPartners.has(o.id);
      if (o.type === 'weapon') o.evoHint = !!P.passives[G.WEAPONS[o.id].evo.need];
    }
    return out;
  };
  G.applyChoice = function (o) {
    if (o.type === 'weapon') {
      const w = P.weapons.find((x) => x.id === o.id);
      if (w) { w.lvl++; w.s = wstats(w); } else addWeapon(o.id);
    } else if (o.type === 'passive') {
      P.passives[o.id] = (P.passives[o.id] || 0) + 1; recalc();
    } else if (o.type === 'heal') { P.hp = Math.min(P.st.maxHp, P.hp + 30); }
    else if (o.type === 'bells') { P.bells += 25; }
  };
  G.describeChoice = function (o) {
    if (o.type === 'weapon') {
      const d = G.WEAPONS[o.id];
      return { name: d.name, icon: d.icon, lvl: o.lvl, isNew: o.lvl === 1, kind: 'weapon', text: o.lvl === 1 ? d.desc : d.ups[o.lvl - 2][0], evoHint: o.evoHint, max: G.weaponMax(o.id) };
    }
    if (o.type === 'passive') {
      const d = G.PASSIVES[o.id];
      return { name: d.name, icon: d.icon, lvl: o.lvl, isNew: o.lvl === 1, kind: 'item', text: d.desc, evoHint: o.evoHint, max: d.max };
    }
    if (o.type === 'heal') return { name: G.t('apple'), icon: 'apple', kind: 'heal', text: G.t('appleTx') };
    return { name: G.t('bellBag'), icon: 'bell', kind: 'bonus', text: G.t('bellBagTx') };
  };

  // ---------- 보물상자 ----------
  function openChest(big) {
    const res = { evolved: null, ups: [], bells: 0 };
    const cand = P.weapons.filter((w) => { const d = G.WEAPONS[w.id]; return !d.evolved && w.lvl >= G.weaponMax(w.id) && P.passives[d.evo.need]; });
    if (cand.length) {
      const w = cand[0];
      const from = w.id, into = G.WEAPONS[w.id].evo.into;
      attacks = attacks.filter((a) => a.w !== w);
      w.id = into; w.lvl = 1; w.t = 0.2; w.s = wstats(w);
      res.evolved = { from, into };
    } else {
      let n = big ? 3 : Math.random() < 0.15 * P.st.luck ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const opts = G.buildChoices().filter((o) => (o.type === 'weapon' || o.type === 'passive') && o.lvl > 1);
        if (!opts.length) break;
        const o = pick(opts); G.applyChoice(o); res.ups.push(G.describeChoice(o));
      }
    }
    res.bells = Math.round((big ? 120 : 40) * P.st.greed * rand(0.8, 1.3));
    P.bells += res.bells;
    return res;
  }

  // ---------- 공간 분할 ----------
  const CELL = 40;
  const grid = new Map();
  function gridBuild() {
    grid.clear();
    for (const e of enemies) {
      const k = ((Math.floor(e.x / CELL) + 32768) << 16) | (Math.floor(e.y / CELL) + 32768);
      let c = grid.get(k); if (!c) grid.set(k, (c = [])); c.push(e);
    }
  }
  function gridQuery(x, y, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const c = grid.get(((cx + 32768) << 16) | (cy + 32768));
      if (c) for (const e of c) if (!e.dead) fn(e);
    }
  }
  function nearestEnemies(x, y, n, maxD = 260) {
    const list = [];
    for (const e of enemies) { if (e.dead) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < maxD * maxD) list.push([d, e]); }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((a) => a[1]);
  }
  function onScreen(e, m = 0) { return Math.abs(e.x - cam.x) < viewW / 2 + m && Math.abs(e.y - cam.y) < viewH / 2 + m; }

  // ---------- 데미지 ----------
  function hitEnemy(e, w, base, o = {}) {
    if (e.dead) return;
    const crit = o.alwaysCrit || Math.random() < P.st.crit;
    let dmg = base * P.st.might * levelBonus() * rand(0.9, 1.1);
    if (crit) dmg *= P.st.critMult;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.flash = 0.09;
    if (w) w.dealt += dmg;
    if (o.knock) {
      const k = o.knock * (1 - (e.def.kres || 0));
      let dx = e.x - (o.fx ?? P.x), dy = e.y - (o.fy ?? P.y); const d = Math.hypot(dx, dy) || 1;
      e.kx += (dx / d) * k * 9; e.ky += (dy / d) * k * 9;
    }
    if (o.slow) { e.slowT = 0.8; e.slowAmt = Math.max(e.slowAmt || 0, o.slow); }
    if (o.lifesteal) P.hp = Math.min(P.st.maxHp, P.hp + 0.4);
    addNumber(e, dmg, crit);
    if (crit && dmg >= 600) hitstop = Math.max(hitstop, 0.035);
    impact(e, w, crit, o.fx ?? P.x, o.fy ?? P.y);
    if (crit) { G.audio.play('crit'); if (dmg > 300) addShake(1.2); } else G.audio.play('hit');
    if (e.hp <= 0) killEnemy(e, w);
  }
  // 타격 이펙트: 별 모양 섬광 + 베기선(치명타) + 색 파편, 적은 납작하게 찌그러졌다 복원
  const HIT_COL = { hammer: '#ff9fb2', net: '#8fd3ff', rod: '#bff0ff', shell: '#ffc89a', acorn: '#f0c27a', shovel: '#ffe3a3', honey: '#ffd84a', star: '#fff27a', tulip: '#ff9ecb', spoon: '#ffe08a' };
  function hitColor(w) { if (!w) return '#ffffff'; return HIT_COL[w.icon || G.WEAPONS[w.id].icon] || '#ffffff'; }
  function impact(e, w, crit, fx, fy) {
    e.squash = crit ? 1 : 0.75;
    const busy = particles.length > 380;
    if (busy && !crit && Math.random() < 0.6) return;
    const c = hitColor(w), hy = e.y - e.r * 0.5;
    const ang = Math.atan2(e.y - fy, e.x - fx);
    particles.push({ fx: 'star', x: e.x + rand(-2, 2), y: hy + rand(-2, 2), life: crit ? 0.24 : 0.16, max: crit ? 0.24 : 0.16, size: (crit ? 20 : 12) + e.r * 0.3, rot: rand(0, 1), c });
    if (crit) particles.push({ fx: 'slash', x: e.x, y: hy, ang: ang + Math.PI / 2 + rand(-0.5, 0.5), len: e.r * 2 + 22, life: 0.18, max: 0.18, c: '#fff6b0' });
    const n = busy ? 2 : crit ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const a = ang + rand(-0.9, 0.9), sp = rand(50, crit ? 150 : 100);
      particles.push({ x: e.x, y: hy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.3, max: 0.3, c: i % 2 ? c : '#ffffff', s: rand(1.5, crit ? 3.2 : 2.4), g: 260 });
    }
  }
  function levelBonus() { return 1 + 0.05 * (P.level - 1); } // 레벨이 오를수록 모든 공격이 강해짐 → 숫자가 쑥쑥 커짐
  G.levelBonus = () => (P ? levelBonus() : 1);
  // 타격마다 적 머리 위에서 숫자가 팡! 하고 튀어 오름 (위로 솟았다가 살짝 떨어짐)
  function addNumber(e, v, crit) {
    if (!G.save.settings.numbers) return;
    if (texts.length > 230) { const i = texts.findIndex((x) => !x.crit && !x.hurt && !x.heal); if (crit && i >= 0) texts.splice(i, 1); else if (!crit) return; else texts.shift(); }
    const t = { x: e.x + rand(-4, 4), y: e.y - e.r - 6, v, crit, t: 0, life: crit ? 0.95 : 0.7, vx: rand(-34, 34), vy: crit ? rand(-120, -95) : rand(-95, -70), hits: 1, rot: crit ? rand(-0.2, 0.2) : rand(-0.06, 0.06), kill: false };
    texts.push(t); e.num = t;
  }
  function killEnemy(e, w) {
    e.dead = true; P.kills++;
    if (e.num && e.num.t < 0.1) e.num.kill = true;
    combo++; comboT = 2.5; comboPop = 1;
    if (combo === 100 || combo === 300 || combo === 500 || combo % 1000 === 0) { comboFlash = { n: combo, t: 0 }; G.audio.play('levelup'); }
    if (w) w.kills++;
    G.audio.play('kill');
    const fr = G.SPR.enemy[e.def.sprite][Math.floor(e.anim) % 2];
    const many = particles.length > 380;
    particles.push({ fx: 'ghost', img: e.face > 0 ? fr.wr : fr.wl, w: fr.w, h: fr.h, x: e.x, y: e.y + fr.h * 0.2, life: 0.2, max: 0.2 });
    particles.push({ x: e.x, y: e.y - e.r * 0.4, ring: 1, life: 0.28, max: 0.28, r0: 3, r1: e.r + 12, c: '#ffffff' });
    if (!many || e.elite || e.boss) {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + rand(-0.3, 0.3), sp = rand(30, 60); particles.push({ fx: 'puff', x: e.x, y: e.y - e.r * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 10, life: 0.38, max: 0.38, size: e.r * 0.55 + 3 }); }
      for (let i = 0; i < 3; i++) particles.push({ fx: 'star', x: e.x + rand(-e.r, e.r), y: e.y - e.r * 0.4 + rand(-e.r, e.r * 0.5), life: 0.3, max: 0.3, size: 7, rot: rand(0, 1), c: pick(['#fff27a', '#ffd0e0', '#bff0ff']), delay: i * 0.05 });
    }
    dropGem(e.x, e.y, e.def.xp * (e.boss ? 1 : 1));
    const L = P.st.luck;
    const r = Math.random();
    if (e.elite) pickups.push({ x: e.x, y: e.y, kind: 'chest', big: false });
    else if (e.boss) {
      pickups.push({ x: e.x, y: e.y, kind: 'chest', big: true });
      for (let i = 0; i < 8; i++) pickups.push({ x: e.x + rand(-20, 20), y: e.y + rand(-20, 20), kind: 'bell', v: 10 });
      addShake(6); slowmoT = 0.6; G.audio.play('boom');
      if (boss === e) boss = null;
      if (e.def.final) { game.won = true; game.endT = 2.4; showBanner(G.t('win'), G.t('winSub'), 3); G.audio.play('win'); }
    } else if (r < 0.015 * L) pickups.push({ x: e.x, y: e.y, kind: 'bell', v: Math.random() < 0.2 ? 5 : 1 });
    else if (r < 0.015 * L + 0.006 * L) pickups.push({ x: e.x, y: e.y, kind: 'heal' });
    else if (r < 0.015 * L + 0.006 * L + 0.0022 * L) pickups.push({ x: e.x, y: e.y, kind: 'magnet' });
  }
  function dropGem(x, y, v) {
    if (gems.length > 320) { // 너무 많으면 멀리 있는 보석에 합쳐서 화면을 깔끔하게
      let far = gems[0], fd = 0;
      for (let i = 0; i < 20; i++) { const g = gems[(Math.random() * gems.length) | 0]; const d = (g.x - P.x) ** 2 + (g.y - P.y) ** 2; if (d > fd) { fd = d; far = g; } }
      far.v += v; return;
    }
    gems.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), v, mag: false, vx: 0, vy: 0 });
  }
  function spark(x, y, c, sp, life) {
    if (particles.length > 500) return;
    const a = rand(0, TAU), s = rand(sp * 0.4, sp);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, c, s: rand(1, 2.2) });
  }
  function addShake(v) { if (G.save.settings.shake) shake = Math.min(8, shake + v); }
  function showBanner(t, sub, dur = 2) { banner = { t, sub, life: dur, max: dur }; }
  G.showBanner = showBanner;

  function hurtPlayer(dmg) {
    if (P.iframe > 0 || game.won) return;
    const d = Math.max(1, Math.round(dmg - P.st.armor));
    P.hp -= d; P.iframe = 0.55; P.hurtT = 0.25;
    G.audio.play('hurt'); addShake(2.5);
    texts.push({ x: P.x, y: P.y - 30, v: d, hurt: true, t: 0, life: 0.7, dx: 0 });
    if (P.hp <= 0) {
      if (P.revivesLeft > 0) {
        P.revivesLeft--; P.hp = P.st.maxHp * 0.6; P.iframe = 2.5;
        showBanner(G.t('revive'), G.t('reviveSub'), 1.6); G.audio.play('levelup');
        for (const e of enemies) if (!e.boss && Math.hypot(e.x - P.x, e.y - P.y) < 110) hitEnemy(e, null, 9999, { knock: 20 });
      } else { P.hp = 0; G.audio.play('death'); endRun(false); }
    }
  }

  // ---------- 무기 발사 ----------
  // 가까운 적을 자동으로 조준 (가만히 있어도 계속 적 쪽으로 공격)
  function autoTarget() { return nearestEnemies(P.x, P.y, 1, 170)[0]; }
  function aimAngle() { const t = autoTarget(); return t ? Math.atan2(t.y - P.y, t.x - P.x) : Math.atan2(P.aimY, P.aimX); }
  function fire(w) {
    const s = w.s, def = G.WEAPONS[w.id];
    switch (def.kind) {
      case 'arc': {
        const full = s.arcW >= TAU - 0.01;
        for (let i = 0; i < s.amountF; i++) {
          let ang = full ? aimAngle() + i * 0.6 : aimAngle() + (i % 2 ? Math.PI : 0);
          const dirSign = full ? 1 : (Math.cos(ang) >= 0 ? 1 : -1);
          const a0 = full ? ang : ang - (s.arcW / 2) * dirSign;
          const a1 = full ? ang + TAU : ang + (s.arcW / 2) * dirSign;
          attacks.push({ kind: 'arc', w, a0, a1, t: -i * (s.swing + 0.05), dur: s.swing, reach: s.reach * s.areaF, hit: new Set(), icon: w.icon || def.icon, shock: s.shock, slow: s.slow, knock: s.knock, dmg: s.dmg, sfx: false });
        }
        break;
      }
      case 'spin': {
        const ang = aimAngle();
        attacks.push({ kind: 'spin', w, a0: ang, a1: ang + TAU * s.amountF * P.facing, t: 0, dur: s.swing * s.amountF, reach: s.reach * s.areaF, cdMap: new Map(), icon: def.icon, knock: s.knock, dmg: s.dmg, lifesteal: s.lifesteal });
        G.audio.play('swing');
        break;
      }
      case 'whip': {
        const tg = autoTarget();
        const dir = tg ? (tg.x >= P.x ? 1 : -1) : P.aimX !== 0 ? Math.sign(P.aimX) : P.facing;
        for (let i = 0; i < s.amountF; i++) {
          const d = i % 2 ? -dir : dir;
          attacks.push({ kind: 'whip', w, dir: d, yoff: (i >> 1) * -10, t: -i * 0.14, dur: 0.22, len: s.reach * s.areaF, wid: s.width * s.areaF, done: false, knock: s.knock, dmg: s.dmg, alwaysCrit: s.alwaysCrit });
        }
        break;
      }
      case 'boomerang': {
        const n = s.amountF;
        const targets = nearestEnemies(P.x, P.y, n, 200);
        for (let i = 0; i < n; i++) {
          let a;
          if (s.radial) a = (i / n) * TAU + game.time;
          else if (targets[i]) a = Math.atan2(targets[i].y - P.y, targets[i].x - P.x);
          else a = aimAngle() + (i - (n - 1) / 2) * 0.5;
          attacks.push({ kind: 'boom', w, x: P.x, y: P.y, dx: Math.cos(a), dy: Math.sin(a), sp: 190 * s.speedF, trav: 0, range: s.range * s.areaF, back: false, spin: 0, size: s.areaF, cdMap: new Map(), life: 4, knock: s.knock, dmg: s.dmg, delay: s.radial ? 0 : i * 0.08 });
        }
        G.audio.play('shoot');
        break;
      }
      case 'shot': {
        const targets = nearestEnemies(P.x, P.y, 3, 280);
        for (let i = 0; i < s.amountF; i++) {
          const t = targets[i % Math.max(1, targets.length)];
          let a = t ? Math.atan2(t.y - P.y, t.x - P.x) : aimAngle();
          a += (i ? rand(-0.12, 0.12) : 0);
          const sp = 240 * s.speedF;
          attacks.push({ kind: 'proj', w, x: P.x, y: P.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.4, pierce: s.pierce, hit: new Set(), size: s.areaF, icon: 'acorn', spin: 0, knock: s.knock, dmg: s.dmg, delay: i * 0.06 });
        }
        G.audio.play('shoot');
        break;
      }
      case 'ring': {
        for (let i = 0; i < s.amountF; i++)
          attacks.push({ kind: 'ring', w, x: P.x, y: P.y, t: -i * 0.28, dur: 0.38, R: s.reach * s.areaF, hit: new Set(), knock: s.knock, dmg: s.dmg, heal: s.heal, follow: true, started: false });
        break;
      }
      case 'zone': {
        const cand = nearestEnemies(P.x, P.y, 12, 150);
        for (let i = 0; i < s.amountF; i++) {
          let tx, ty;
          if (s.pull) { const a = rand(0, TAU), d = rand(20, 90); tx = P.x + Math.cos(a) * d; ty = P.y + Math.sin(a) * d; }
          else if (cand.length) { const e = pick(cand); tx = e.x + rand(-10, 10); ty = e.y + rand(-10, 10); }
          else { const a = rand(0, TAU), d = rand(30, 80); tx = P.x + Math.cos(a) * d; ty = P.y + Math.sin(a) * d; }
          attacks.push({ kind: 'pot', w, sx: P.x, sy: P.y - 6, tx, ty, t: -i * 0.1, dur: 0.45, s });
        }
        break;
      }
      case 'starfall': {
        const vis = enemies.filter((e) => !e.dead && onScreen(e, -10));
        for (let i = 0; i < s.amountF; i++) {
          let tx, ty;
          if (vis.length) { const e = vis.splice((Math.random() * vis.length) | 0, 1)[0]; tx = e.x; ty = e.y; }
          else { tx = P.x + rand(-viewW / 3, viewW / 3); ty = P.y + rand(-viewH / 3, viewH / 3); }
          attacks.push({ kind: 'fall', w, tx, ty, t: -i * 0.07, dur: 0.32, R: s.reach * s.areaF, knock: s.knock, dmg: s.dmg });
        }
        break;
      }
      case 'orbit': {
        attacks = attacks.filter((a) => a.w !== w);
        attacks.push({ kind: 'orbit', w, n: s.amountF, R: s.reach * s.areaF, rot: rand(0, TAU), rs: 3.4 * s.speedF, life: s.permanent ? Infinity : s.life * s.durF, size: s.areaF, cdMap: new Map(), knock: s.knock, dmg: s.dmg, t: 0 });
        break;
      }
    }
  }
  function weaponCooldown(w) {
    const d = G.WEAPONS[w.id];
    if (d.kind === 'orbit') return w.s.permanent ? 0.5 : w.s.life * w.s.durF + w.s.cdF * 0.35; // 쉬는 시간 최소화
    if (d.kind === 'spin') return Math.max(w.s.cdF, w.s.swing * w.s.amountF + 0.05);
    return w.s.cdF;
  }
  const angNorm = (a) => ((a % TAU) + TAU) % TAU;

  // ---------- 공격 업데이트 ----------
  function updateAttacks(dt) {
    for (const a of attacks) {
      if (a.dead) continue;
      if (a.delay > 0) { a.delay -= dt; if (a.delay <= 0 && a.kind !== 'pot') { a.x = P.x; a.y = P.y - 4; } continue; }
      switch (a.kind) {
        case 'arc': {
          a.t += dt;
          if (a.t < 0) break;
          if (!a.sfx) { a.sfx = true; G.audio.play('swing'); }
          const p = Math.min(1, a.t / a.dur), e2 = 1 - (1 - p) * (1 - p);
          a.cur = a.a0 + (a.a1 - a.a0) * e2;
          if (p < 1 && particles.length < 300 && Math.random() < 0.5) particles.push({ fx: 'star', x: P.x + Math.cos(a.cur) * a.reach * 0.9, y: P.y - 4 + Math.sin(a.cur) * a.reach * 0.9, life: 0.22, max: 0.22, size: 5, rot: rand(0, 1), c: SWOOSH[a.w.id] || SWOOSH[a.icon] || '#ffffff' });
          const sign = a.a1 > a.a0 ? 1 : -1, swept = Math.abs(a.cur - a.a0);
          gridQuery(P.x, P.y, a.reach + 14, (e) => {
            if (a.hit.has(e)) return;
            const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
            if (d > a.reach + e.r) return;
            const rel = sign > 0 ? angNorm(Math.atan2(dy, dx) - a.a0) : angNorm(a.a0 - Math.atan2(dy, dx));
            if (rel <= swept + 0.15 || d < 10) { a.hit.add(e); hitEnemy(e, a.w, a.dmg, { knock: a.knock, slow: a.slow }); }
          });
          if (a.t >= a.dur + 0.12) {
            a.dead = true;
            if (a.shock) {
              const mid = (a.a0 + a.a1) / 2;
              attacks.push({ kind: 'ring', w: a.w, x: P.x + Math.cos(mid) * a.reach * 0.8, y: P.y + Math.sin(mid) * a.reach * 0.8, t: 0, dur: 0.3, R: a.reach * 1.1, hit: new Set(), knock: 10, dmg: a.dmg * 0.6, peach: true });
            }
          }
          break;
        }
        case 'spin': {
          a.t += dt;
          const p = Math.min(1, a.t / a.dur);
          a.cur = a.a0 + (a.a1 - a.a0) * p;
          gridQuery(P.x, P.y, a.reach + 14, (e) => {
            const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
            if (d > a.reach + e.r) return;
            let diff = Math.abs(angNorm(Math.atan2(dy, dx) - a.cur)); diff = Math.min(diff, TAU - diff);
            const last = a.cdMap.get(e) || -9;
            if ((diff < 0.7 || d < 10) && a.t - last > 0.22) { a.cdMap.set(e, a.t); hitEnemy(e, a.w, a.dmg, { knock: a.knock, lifesteal: a.lifesteal }); }
          });
          if (Math.floor(a.t / 0.3) !== Math.floor((a.t - dt) / 0.3)) G.audio.play('swing');
          if (a.t >= a.dur) a.dead = true;
          break;
        }
        case 'whip': {
          a.t += dt;
          if (a.t < 0) break;
          if (!a.done) {
            a.done = true; G.audio.play('swing');
            const x0 = P.x, x1 = P.x + a.dir * a.len, yc = P.y - 4 + a.yoff;
            gridQuery((x0 + x1) / 2, yc, a.len / 2 + 10, (e) => {
              const inX = a.dir > 0 ? e.x + e.r >= x0 && e.x - e.r <= x1 : e.x - e.r <= x0 && e.x + e.r >= x1;
              if (inX && Math.abs(e.y - yc) <= a.wid / 2 + e.r) hitEnemy(e, a.w, a.dmg, { knock: a.knock, alwaysCrit: a.alwaysCrit });
            });
          }
          if (a.t >= a.dur) a.dead = true;
          break;
        }
        case 'boom': {
          a.life -= dt; a.spin += dt * 18;
          if (!a.back) {
            const sp = a.sp * (1 - (a.trav / a.range) * 0.75);
            a.x += a.dx * sp * dt; a.y += a.dy * sp * dt; a.trav += sp * dt;
            if (a.trav >= a.range) a.back = true;
          } else {
            const dx = P.x - a.x, dy = P.y - a.y, d = Math.hypot(dx, dy) || 1;
            a.retSp = (a.retSp || 40) + dt * 500;
            a.x += (dx / d) * a.retSp * dt; a.y += (dy / d) * a.retSp * dt;
            if (d < 10) a.dead = true;
          }
          const rr = 6 * a.size;
          gridQuery(a.x, a.y, rr + 12, (e) => {
            if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > (rr + e.r) ** 2) return;
            const last = a.cdMap.get(e) || -9;
            if (game.time - last > 0.35) { a.cdMap.set(e, game.time); hitEnemy(e, a.w, a.dmg, { knock: a.knock, fx: a.x, fy: a.y }); }
          });
          if (a.life <= 0) a.dead = true;
          break;
        }
        case 'proj': {
          a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt; a.spin += dt * 14;
          const rr = 3.5 * a.size;
          gridQuery(a.x, a.y, rr + 12, (e) => {
            if (a.dead || a.hit.has(e)) return;
            if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > (rr + e.r) ** 2) return;
            a.hit.add(e); hitEnemy(e, a.w, a.dmg, { knock: a.knock, fx: a.x - a.vx, fy: a.y - a.vy });
            a.pierce--; if (a.pierce < 0) a.dead = true;
          });
          if (a.life <= 0) a.dead = true;
          break;
        }
        case 'ring': {
          a.t += dt;
          if (a.t < 0) break;
          if (!a.started) {
            a.started = true;
            if (a.follow) { a.x = P.x; a.y = P.y; }
            G.audio.play('boom'); addShake(a.peach ? 1 : 1.6);
            for (let i = 0; i < 10; i++) particles.push({ x: a.x + rand(-6, 6), y: a.y + rand(-2, 4), vx: rand(-40, 40), vy: rand(-80, -30), life: 0.5, max: 0.5, c: a.peach ? '#ffb49c' : pick(['#b98a5a', '#8cc774', '#d9b27a']), s: rand(1.5, 3), g: 220 });
            if (a.heal) { P.hp = Math.min(P.st.maxHp, P.hp + 1); }
          }
          const p = Math.min(1, a.t / a.dur);
          a.cr = a.R * (0.15 + 0.85 * (1 - (1 - p) * (1 - p)));
          gridQuery(a.x, a.y, a.cr + 14, (e) => {
            if (a.hit.has(e)) return;
            if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 <= (a.cr + e.r) ** 2) { a.hit.add(e); hitEnemy(e, a.w, a.dmg, { knock: a.knock, fx: a.x, fy: a.y }); }
          });
          if (a.t >= a.dur + 0.15) {
            a.dead = true;
            if (a.heal) for (let i = 0; i < 6; i++) { const an = rand(0, TAU), d = rand(0, a.R); particles.push({ x: a.x + Math.cos(an) * d, y: a.y + Math.sin(an) * d, vx: 0, vy: -6, life: 1.2, max: 1.2, flower: pick(['flowerP', 'flowerW', 'flowerY']) }); }
          }
          break;
        }
        case 'pot': {
          a.t += dt;
          if (a.t >= a.dur) {
            a.dead = true;
            const s = a.s;
            attacks.push({ kind: 'zone', w: a.w, x: a.tx, y: a.ty, R: s.reach * s.areaF, life: s.life * s.durF, max: s.life * s.durF, tick: s.tick, tt: 0, slow: s.slow, pull: s.pull, dmg: s.dmg });
            for (let i = 0; i < 8; i++) spark(a.tx, a.ty, '#ffd76a', 70, 0.35);
          }
          break;
        }
        case 'zone': {
          a.life -= dt; a.tt -= dt;
          if (a.tt <= 0) {
            a.tt = a.tick;
            gridQuery(a.x, a.y, a.R + 12, (e) => {
              if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > (a.R + e.r) ** 2) return;
              hitEnemy(e, a.w, a.dmg, { slow: a.slow });
            });
          }
          if (a.pull) gridQuery(a.x, a.y, a.R * 1.8, (e) => { if (e.boss) return; const dx = a.x - e.x, dy = a.y - e.y, d = Math.hypot(dx, dy) || 1; if (d < a.R * 1.8) { e.x += (dx / d) * 22 * dt; e.y += (dy / d) * 22 * dt; } });
          if (a.life <= 0) a.dead = true;
          break;
        }
        case 'fall': {
          a.t += dt;
          if (a.t >= a.dur && !a.boomed) {
            a.boomed = true; G.audio.play('boom'); addShake(0.8);
            gridQuery(a.tx, a.ty, a.R + 14, (e) => { if ((e.x - a.tx) ** 2 + (e.y - a.ty) ** 2 <= (a.R + e.r) ** 2) hitEnemy(e, a.w, a.dmg, { knock: a.knock, fx: a.tx, fy: a.ty }); });
            for (let i = 0; i < 10; i++) spark(a.tx, a.ty, pick(['#ffe066', '#fff8d0', '#9cc6f2']), 110, 0.4);
          }
          if (a.t >= a.dur + 0.25) a.dead = true;
          break;
        }
        case 'orbit': {
          a.t += dt; a.life -= dt; a.rot += a.rs * dt;
          const pr = 7 * a.size;
          for (let i = 0; i < a.n; i++) {
            const an = a.rot + (i / a.n) * TAU, ox = P.x + Math.cos(an) * a.R, oy = P.y + Math.sin(an) * a.R * 0.85 - 3;
            gridQuery(ox, oy, pr + 12, (e) => {
              if ((e.x - ox) ** 2 + (e.y - oy) ** 2 > (pr + e.r) ** 2) return;
              const last = a.cdMap.get(e) || -9;
              if (a.t - last > 0.4) { a.cdMap.set(e, a.t); hitEnemy(e, a.w, a.dmg, { knock: a.knock, fx: P.x, fy: P.y }); }
            });
          }
          if (a.life <= 0) a.dead = true;
          break;
        }
      }
    }
    attacks = attacks.filter((a) => !a.dead);
  }

  // ---------- 적 스폰 ----------
  function hpMul() { const m = game.time / 60; return 1 + m * 0.25 + m * m * 0.04; }
  function spawnEnemy(id, x, y, opt = {}) {
    const def = G.ENEMIES[id];
    const mul = (def.boss ? 1 + (P.level - 1) * 0.015 : hpMul() * (def.elite ? 1 + game.time / 300 : 1)) * 1.35;
    const e = { id, def, x, y, hp: def.hp * mul, maxHp: def.hp * mul, spd: def.spd * rand(0.9, 1.1), dmg: def.dmg * (1 + game.time / 60 * 0.1), r: def.r, kx: 0, ky: 0, flash: 0, slowT: 0, slowAmt: 0, anim: Math.random() * 2, face: 1, elite: !!def.elite, boss: !!def.boss, ai: 0, aiT: 2, dead: false };
    Object.assign(e, opt);
    enemies.push(e);
    return e;
  }
  function spawnPos(extra = 30) {
    const a = rand(0, TAU), d = Math.hypot(viewW, viewH) / 2 + extra;
    return [P.x + Math.cos(a) * d, P.y + Math.sin(a) * d];
  }
  function pickWave() {
    const m = Math.min(G.WAVES.length - 1, Math.floor(game.time / 60));
    const w = G.WAVES[m]; let tot = 0; for (const k in w) tot += w[k];
    let r = Math.random() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'mouse';
  }
  function updateSpawns(dt) {
    const m = game.time / 60;
    const target = Math.min(340, 22 + m * 16 + m * m * 0.7) * (boss ? 0.7 : 1);
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = 0.18;
      const live = enemies.length;
      if (live < target) {
        const n = Math.min(12, Math.ceil((target - live) / 6));
        for (let i = 0; i < n; i++) { const [x, y] = spawnPos(); spawnEnemy(pickWave(), x, y); }
      }
    }
    // 엘리트
    if (game.time >= eliteT) {
      eliteT += 105;
      if (!boss) { const [x, y] = spawnPos(); spawnEnemy('bear', x, y); showBanner(G.t('eliteIn'), G.t('eliteSub'), 1.8); }
    }
    // 보스
    if (bossIdx < G.BOSSES.length && game.time >= G.BOSSES[bossIdx].t) {
      const b = G.BOSSES[bossIdx++];
      const [x, y] = spawnPos(10);
      boss = spawnEnemy(b.id, x, y);
      showBanner(G.t('bossIn', { name: G.ENEMIES[b.id].name }), b.id === 'wolfKing' ? G.t('finalSub') : G.t('bossSub'), 2.6);
      G.audio.play('warn');
    }
    // 이벤트
    while (eventIdx < G.EVENTS.length && game.time >= G.EVENTS[eventIdx].t) {
      const ev = G.EVENTS[eventIdx++];
      if (ev.type === 'swarm') {
        const a = rand(0, TAU), dx = Math.cos(a), dy = Math.sin(a), d = Math.hypot(viewW, viewH) / 2 + 20;
        for (let i = 0; i < ev.n; i++) {
          const off = (i - ev.n / 2) * 9;
          spawnEnemy(ev.id, P.x - dx * d - dy * off + rand(-6, 6), P.y - dy * d + dx * off + rand(-6, 6), { straight: { vx: dx, vy: dy }, life: 12, spd: G.ENEMIES[ev.id].spd * 1.4 });
        }
        showBanner(G.t('swarm'), '', 1.4);
      } else {
        for (let i = 0; i < ev.n; i++) { const a = (i / ev.n) * TAU; spawnEnemy(ev.id, P.x + Math.cos(a) * 170, P.y + Math.sin(a) * 120); }
        showBanner(G.t('ring'), G.t('ringSub'), 1.4);
      }
    }
  }

  // ---------- 적 업데이트 ----------
  function updateEnemies(dt) {
    const farX = viewW / 2 + 80, farY = viewH / 2 + 80;
    for (const e of enemies) {
      if (e.dead) continue;
      e.anim += dt * (e.def.fly ? 8 : 5);
      if (e.flash > 0) e.flash -= dt;
      if (e.squash > 0) e.squash = Math.max(0, e.squash - dt * 7);
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
      let dx = P.x - e.x, dy = P.y - e.y; const d = Math.hypot(dx, dy) || 1;
      let sp = e.spd * (1 - e.slowAmt);
      let mvx = dx / d, mvy = dy / d;
      if (e.straight) { mvx = e.straight.vx; mvy = e.straight.vy; e.life -= dt; if (e.life <= 0) { e.dead = true; continue; } }
      if (e.boss) { const r = bossAI(e, dt, mvx, mvy); if (r) { mvx = r[0]; mvy = r[1]; sp = r[2]; } }
      e.x += (mvx * sp + e.kx) * dt; e.y += (mvy * sp + e.ky) * dt;
      const kd = Math.exp(-dt * 12); e.kx *= kd; e.ky *= kd;
      if (Math.abs(mvx) > 0.1) e.face = mvx > 0 ? 1 : -1;
      // 화면 밖으로 너무 멀어지면 반대편으로 재배치
      if (!e.boss && !e.straight && (Math.abs(e.x - P.x) > farX + 60 || Math.abs(e.y - P.y) > farY + 60)) {
        const [x, y] = spawnPos(); e.x = x; e.y = y;
      }
      // 접촉 피해
      if (d < e.r + P.r - 1) hurtPlayer(e.dmg);
    }
    // 서로 밀어내기 (겹침 방지)
    for (const e of enemies) {
      if (e.dead || e.boss) continue;
      let n = 0;
      gridQuery(e.x, e.y, e.r * 2, (o) => {
        if (o === e || n > 5) return;
        const dx = e.x - o.x, dy = e.y - o.y, dd = dx * dx + dy * dy, rr = (e.r + o.r) * 0.8;
        if (dd < rr * rr && dd > 0.01) { const d = Math.sqrt(dd), push = (rr - d) * 0.25; e.x += (dx / d) * push; e.y += (dy / d) * push; n++; }
      });
    }
    enemies = enemies.filter((e) => !e.dead);
  }
  function bossAI(e, dt, mx, my) {
    e.aiT -= dt;
    const id = e.id;
    if (e.ai === 'tele') { if (e.aiT <= 0) { e.ai = 'dash'; e.aiT = 0.75; } return [0, 0, 0]; }
    if (e.ai === 'dash') { if (e.aiT <= 0) { e.ai = 0; e.aiT = id === 'boarKing' ? 3.2 : 4; } return [e.dashX, e.dashY, 270]; }
    if (e.aiT <= 0) {
      const roll = Math.random();
      if (id === 'queen') {
        if (roll < 0.6) radial(e, 12, 85); else for (let i = 0; i < 6; i++) spawnEnemy('wasp', e.x + rand(-20, 20), e.y + rand(-20, 20));
        e.aiT = 2.6;
      } else if (id === 'boarKing') {
        if (roll < 0.75) { e.ai = 'tele'; e.aiT = 0.75; e.dashX = mx; e.dashY = my; } else { radial(e, 10, 70); e.aiT = 2; }
      } else {
        if (roll < 0.4) { e.ai = 'tele'; e.aiT = 0.6; e.dashX = mx; e.dashY = my; }
        else if (roll < 0.75) { radial(e, 16, 95); radial(e, 16, 60, Math.PI / 16); e.aiT = 2.4; }
        else { for (let i = 0; i < 8; i++) spawnEnemy('wolf', e.x + rand(-30, 30), e.y + rand(-30, 30)); e.aiT = 2.4; }
      }
    }
    return null;
  }
  function radial(e, n, sp, off = 0) {
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + off; eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 5, dmg: e.dmg * 0.6, r: 3 }); }
  }

  // ---------- 아이템 ----------
  function updatePickups(dt) {
    const mag = 32 * P.st.magnet;
    gemComboT -= dt; if (gemComboT <= 0) gemCombo = 0;
    for (const g of gems) {
      const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (!g.mag && d < mag) { g.mag = true; g.vx = (-dx / d) * 50; g.vy = (-dy / d) * 50; }
      if (g.mag) {
        const acc = 900;
        g.vx += (dx / d) * acc * dt; g.vy += (dy / d) * acc * dt;
        const vmax = 400, vv = Math.hypot(g.vx, g.vy); if (vv > vmax) { g.vx *= vmax / vv; g.vy *= vmax / vv; }
        g.x += g.vx * dt; g.y += g.vy * dt;
        if (d < 8) { g.dead = true; gainXp(g.v); gemCombo++; gemComboT = 0.5; G.audio.play('gem', gemCombo); }
      }
    }
    gems = gems.filter((g) => !g.dead);
    for (const p of pickups) {
      const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (p.kind === 'bell' && d < mag) { p.x += (dx / d) * 220 * dt; p.y += (dy / d) * 220 * dt; }
      if (d < 12) {
        p.dead = true;
        if (p.kind === 'bell') { P.bells += Math.round(p.v * P.st.greed * 10) / 10; G.audio.play('bell'); }
        else if (p.kind === 'heal') { P.hp = Math.min(P.st.maxHp, P.hp + 30); G.audio.play('heal'); texts.push({ x: P.x, y: P.y - 30, v: '+30', heal: true, t: 0, life: 0.9, dx: 0 }); }
        else if (p.kind === 'magnet') { for (const g of gems) g.mag = true; G.audio.play('magnet'); }
        else if (p.kind === 'chest') { const res = openChest(p.big); G.audio.play(res.evolved ? 'evolve' : 'chest'); game.state = 'chest'; G.ui && G.ui.showChest(res); }
      }
    }
    pickups = pickups.filter((p) => !p.dead);
  }
  function gainXp(v) {
    P.xp += v * P.st.growth;
    let need = xpNeed(P.level);
    while (P.xp >= need) { P.xp -= need; P.level++; P.pendingLv++; need = xpNeed(P.level); }
  }

  // ---------- 메인 업데이트 ----------
  function update(dtReal) {
    if (game.state !== 'play') return;
    if (slowmoT > 0) { slowmoT -= dtReal; timeScale = 0.35; } else timeScale = 1;
    if (hitstop > 0) { hitstop -= dtReal; timeScale = Math.min(timeScale, 0.08); } // 큰 치명타 때 아주 짧게 멈칫
    if (comboT > 0) { comboT -= dtReal; if (comboT <= 0) combo = 0; }
    comboPop = Math.max(0, comboPop - dtReal * 6);
    if (comboFlash) { comboFlash.t += dtReal; if (comboFlash.t > 1.4) comboFlash = null; }
    const dt = Math.min(dtReal, 1 / 30) * timeScale;
    game.time += dt;
    // 이동
    let mx = 0, my = 0;
    if (keys.ArrowLeft || keys.KeyA) mx -= 1;
    if (keys.ArrowRight || keys.KeyD) mx += 1;
    if (keys.ArrowUp || keys.KeyW) my -= 1;
    if (keys.ArrowDown || keys.KeyS) my += 1;
    if (joy.active) {
      const R = 28 * U; let jx = (joy.x - joy.ox) / R, jy = (joy.y - joy.oy) / R; const l = Math.hypot(jx, jy);
      if (l > 0.15) { if (l > 1) { jx /= l; jy /= l; } mx = jx; my = jy; }
    }
    if (game.autopilot) { // 테스트용 자동 조종: 적에게서 멀어지고 보석 쪽으로
      let ax = 0, ay = 0;
      for (const e of enemies) { const dx = P.x - e.x, dy = P.y - e.y, d2 = dx * dx + dy * dy + 1; if (d2 < 22 * 22 || (e.boss && d2 < 80 * 80)) { ax += (dx / d2) * (e.boss ? 400 : 20); ay += (dy / d2) * (e.boss ? 400 : 20); } }
      for (const e of eshots) { const dx = P.x - e.x, dy = P.y - e.y, d2 = dx * dx + dy * dy + 1; if (d2 < 50 * 50) { ax += (dx / d2) * 120; ay += (dy / d2) * 120; } }
      let best = null, bd = 1e9; for (const g of gems) { const d = (g.x - P.x) ** 2 + (g.y - P.y) ** 2; if (d < bd) { bd = d; best = g; } }
      for (const p of pickups) { const d = (p.x - P.x) ** 2 + (p.y - P.y) ** 2 - 40000; if (d < bd) { bd = d; best = p; } }
      if (best) { const d = Math.sqrt(Math.max(1, (best.x - P.x) ** 2 + (best.y - P.y) ** 2)); ax += ((best.x - P.x) / d) * 0.3; ay += ((best.y - P.y) / d) * 0.3; }
      const ne = nearestEnemies(P.x, P.y, 1, 200)[0];
      if (ne && P.hp > P.st.maxHp * 0.35) { const dx = ne.x - P.x, dy = ne.y - P.y, d = Math.hypot(dx, dy) || 1; const k = d > 26 ? 0.6 : d < 16 ? -0.6 : 0; ax += (dx / d) * k; ay += (dy / d) * k; }
      ax += Math.cos(game.time * 0.3) * 0.2; ay += Math.sin(game.time * 0.3) * 0.2;
      const l = Math.hypot(ax, ay) || 1; mx = ax / l; my = ay / l;
    }
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    P.moving = ml > 0.05;
    if (P.moving) {
      const sp = 72 * P.st.speed;
      P.x += mx * sp * dt; P.y += my * sp * dt;
      const al = Math.hypot(mx, my); P.aimX = mx / al; P.aimY = my / al;
      if (Math.abs(mx) > 0.1) P.facing = mx > 0 ? 1 : -1;
      P.anim += dt * 8;
      if (Math.random() < dt * 6) particles.push({ x: P.x - P.facing * 4, y: P.y + 2, vx: -P.facing * 10, vy: -8, life: 0.35, max: 0.35, c: '#e8f5d8', s: 2 });
    } else P.anim = 0;
    if (P.iframe > 0) P.iframe -= dt;
    if (P.hurtT > 0) P.hurtT -= dt;
    if (P.st.regen > 0) P.hp = Math.min(P.st.maxHp, P.hp + P.st.regen * dt);

    gridBuild();
    for (const w of P.weapons) { w.t -= dt; if (w.t <= 0) { fire(w); w.t = weaponCooldown(w); } }
    if (P.base) { P.base.t -= dt; if (P.base.t <= 0) { fire(P.base); P.base.t = weaponCooldown(P.base); } } // 모든 캐릭터 공통 360도 회오리 공격
    updateAttacks(dt);
    updateSpawns(dt);
    gridBuild();
    updateEnemies(dt);
    // 적 투사체
    for (const s of eshots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if ((s.x - P.x) ** 2 + (s.y - P.y) ** 2 < (s.r + P.r - 2) ** 2) { s.life = 0; hurtPlayer(s.dmg); }
    }
    eshots = eshots.filter((s) => s.life > 0);
    updatePickups(dt);
    // 파티클 & 숫자
    for (const p of particles) { if (p.delay > 0) { p.delay -= dt; continue; } p.life -= dt; if (!p.ring) { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.g) p.vy += p.g * dt; } }
    particles = particles.filter((p) => p.life > 0);
    for (const t of texts) t.t += dtReal;
    texts = texts.filter((t) => t.t < t.life);
    if (banner) { banner.life -= dtReal; if (banner.life <= 0) banner = null; }
    shake = Math.max(0, shake - dtReal * 14);
    // 카메라
    cam.x += (P.x - cam.x) * Math.min(1, dtReal * 10); cam.y += (P.y - cam.y) * Math.min(1, dtReal * 10);
    G.audio.setIntensity(boss ? 1 : enemies.length > 120 ? 0.6 : 0);

    if (game.won) { game.endT -= dtReal; if (game.endT <= 0) endRun(true); return; }
    if (P.pendingLv > 0 && game.state === 'play') {
      P.pendingLv--; game.state = 'levelup'; G.audio.play('levelup');
      for (let i = 0; i < 24; i++) spark(P.x, P.y, pick(['#ffe066', '#ffb0d8', '#9fe8a0', '#9cc6f2']), 140, 0.7);
      G.ui && G.ui.showLevelUp();
    }
  }

  function endRun(won) {
    game.state = 'over';
    const minutes = game.time / 60;
    const bonus = Math.round((P.kills / 25 + minutes * 8 + (won ? 300 : 0)) * P.st.greed);
    const total = Math.round(P.bells + bonus);
    G.save.bells += total; G.save.runs++; G.save.totalKills += P.kills;
    const b = G.save.best[P.char] || { time: 0, kills: 0, level: 0, won: false };
    const newBest = game.time > b.time;
    G.save.best[P.char] = { time: Math.max(b.time, game.time), kills: Math.max(b.kills, P.kills), level: Math.max(b.level, P.level), won: b.won || won };
    G.saveNow();
    G.ui && G.ui.showResults({ won, time: game.time, kills: P.kills, level: P.level, bellsPicked: Math.round(P.bells), bonus, total, newBest, weapons: P.weapons.concat(P.base ? [P.base] : []).map((w) => ({ id: w.id, lvl: w.lvl, dealt: w.dealt, kills: w.kills, dps: w.dealt / Math.max(1, game.time - w.since) })), passives: Object.assign({}, P.passives) });
  }
  G.endRun = endRun;

  // ---------- 렌더링 ----------
  const sx = (x) => x * S + offX, sy = (y) => y * S + offY;
  function drawSpr(img, x, y, w, h, scale = 1) {
    ctx.drawImage(img, Math.round((x - (w * scale) / 2) * S + offX), Math.round((y - h * scale) * S + offY), Math.round(w * scale * S), Math.round(h * scale * S));
  }
  function decoAt(cx, cy) { // 청크마다 고정된 장식 (결정적 난수)
    let h = (cx * 73856093) ^ (cy * 19349663); h = (h ^ (h >>> 13)) * 1274126177; let s = (h >>> 0) % 2147483646 + 1;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const list = [];
    const nf = 3 + ((r() * 6) | 0);
    for (let i = 0; i < nf; i++) list.push({ k: pick3(r, ['flowerP', 'flowerW', 'flowerY']), x: cx * 160 + r() * 160, y: cy * 160 + r() * 160, flat: true });
    const q = r();
    if (q < 0.3) list.push({ k: r() < 0.6 ? 'tree' : 'pine', x: cx * 160 + 20 + r() * 120, y: cy * 160 + 20 + r() * 120 });
    else if (q < 0.55) list.push({ k: pick3(r, ['bush', 'rock', 'stump']), x: cx * 160 + r() * 160, y: cy * 160 + r() * 160, flat: true });
    return list;
  }
  const pick3 = (r, a) => a[(r() * a.length) | 0];
  const decoCache = new Map();
  function decosIn(x0, y0, x1, y1) {
    const out = [];
    for (let cx = Math.floor(x0 / 160); cx <= Math.floor(x1 / 160); cx++) for (let cy = Math.floor(y0 / 160); cy <= Math.floor(y1 / 160); cy++) {
      const k = cx + ',' + cy; let l = decoCache.get(k);
      if (!l) { l = decoAt(cx, cy); decoCache.set(k, l); if (decoCache.size > 400) decoCache.delete(decoCache.keys().next().value); }
      for (const d of l) out.push(d);
    }
    return out;
  }

  function render() {
    const SPR = G.SPR;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#a9dc8c'; ctx.fillRect(0, 0, W, H);
    if (!P) return;
    const shx = shake ? rand(-shake, shake) * S * 0.5 : 0, shy = shake ? rand(-shake, shake) * S * 0.5 : 0;
    offX = Math.round(W / 2 - cam.x * S + shx); offY = Math.round(H / 2 - cam.y * S + shy);
    // 바닥
    if (!render.pat) render.pat = ctx.createPattern(SPR.ground, 'repeat');
    ctx.save(); ctx.translate(offX, offY); ctx.scale(S, S);
    ctx.fillStyle = render.pat; ctx.fillRect(cam.x - viewW / 2 - 70, cam.y - viewH / 2 - 70, viewW + 140, viewH + 140);
    ctx.restore();
    const x0 = cam.x - viewW / 2 - 40, x1 = cam.x + viewW / 2 + 40, y0 = cam.y - viewH / 2 - 40, y1 = cam.y + viewH / 2 + 60;
    const decos = decosIn(x0, y0, x1, y1);
    for (const d of decos) if (d.flat) { const s = SPR.deco[d.k]; drawSpr(s.c, d.x, d.y, s.w, s.h); }
    // 꿀 웅덩이
    for (const a of attacks) if (a.kind === 'zone') {
      const al = Math.min(1, a.life / 0.4);
      ctx.globalAlpha = 0.32 * al; ctx.fillStyle = a.pull ? '#ffcf3a' : '#f5b83a';
      ctx.beginPath(); ctx.ellipse(sx(a.x), sy(a.y), a.R * S, a.R * 0.7 * S, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.6 * al; ctx.strokeStyle = '#fff2b8'; ctx.lineWidth = S; ctx.stroke();
      ctx.globalAlpha = 0.9 * al; ctx.fillStyle = '#fff8d8';
      for (let i = 0; i < 3; i++) { const t = game.time * 2 + i * 2.1; ctx.fillRect(sx(a.x + Math.cos(t) * a.R * 0.5), sy(a.y + Math.sin(t * 1.3) * a.R * 0.3), S, S); }
      ctx.globalAlpha = 1;
    }
    // 보석/아이템
    for (const g of gems) {
      if (Math.abs(g.x - cam.x) > viewW / 2 + 10 || Math.abs(g.y - cam.y) > viewH / 2 + 10) continue;
      const k = g.v < 2 ? 'gem1' : g.v < 5 ? 'gem2' : g.v < 20 ? 'gem3' : 'gem4';
      const s = SPR.icon[k]; drawSpr(s.c, g.x, g.y + s.h / 2 + Math.sin(game.time * 4 + g.x) * 0.8, s.w, s.h);
    }
    for (const p of pickups) {
      const k = p.kind === 'heal' ? 'apple' : p.kind === 'magnet' ? 'conch' : p.kind === 'bell' ? 'bell' : 'chest';
      const s = SPR.icon[k], bob = Math.sin(game.time * 5 + p.x) * 1.5;
      if (p.kind === 'chest') { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(game.time * 6); ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y - 6), 14 * S, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      drawSpr(s.c, p.x, p.y + s.h / 2 + bob, s.w, s.h);
    }
    // y 정렬: 적 + 나무 + 플레이어
    const list = [];
    for (const e of enemies) if (onScreen(e, 40)) list.push(e);
    for (const d of decos) if (!d.flat) list.push({ deco: d, y: d.y });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.deco) {
        const s = SPR.deco[o.deco.k];
        const near = Math.abs(P.x - o.deco.x) < s.w / 2 + 4 && P.y < o.deco.y && P.y > o.deco.y - s.h;
        if (near) ctx.globalAlpha = 0.5;
        drawSpr(s.c, o.deco.x, o.deco.y, s.w, s.h); ctx.globalAlpha = 1;
      } else drawEnemy(o);
    }
    drawAttacks();
    drawPlayer(); // 내 캐릭터는 공격 잔상 위에 또렷하게
    // 파티클
    for (const p of particles) {
      const al = p.life / p.max;
      if (p.fx) { drawFx(p, al); continue; }
      if (p.ring) { ctx.globalAlpha = al; ctx.strokeStyle = p.c; ctx.lineWidth = S; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), (p.r0 + (p.r1 - p.r0) * (1 - al)) * S, 0, TAU); ctx.stroke(); }
      else if (p.flower) { ctx.globalAlpha = Math.min(1, al * 2); const s = SPR.deco[p.flower]; drawSpr(s.c, p.x, p.y, s.w, s.h); }
      else { ctx.globalAlpha = Math.min(1, al * 1.5); ctx.fillStyle = p.c; const z = p.s * S; ctx.fillRect(Math.round(sx(p.x) - z / 2), Math.round(sy(p.y) - z / 2), Math.ceil(z), Math.ceil(z)); }
    }
    ctx.globalAlpha = 1;
    // 적 투사체 (가장 위, 선명하게)
    for (const s of eshots) { const i = SPR.icon.stinger; drawSpr(i.c, s.x, s.y + 4, i.w, i.h); }
    drawTexts();
    drawCombo();
    drawOffscreenMarkers();
    drawHUD();
  }

  function drawFx(p, al) {
    if (p.delay > 0) return;
    const k = 1 - al, X = sx(p.x), Y = sy(p.y);
    if (p.fx === 'star') { // 4갈래 반짝 섬광
      const r = p.size * S * (0.5 + k * 0.9), w = r * 0.2;
      ctx.save(); ctx.translate(X, Y); ctx.rotate(p.rot * 0.6);
      ctx.globalAlpha = al; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(w, -w); ctx.lineTo(r, 0); ctx.lineTo(w, w); ctx.lineTo(0, r); ctx.lineTo(-w, w); ctx.lineTo(-r, 0); ctx.lineTo(-w, -w); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.scale(0.55, 0.55); ctx.fill();
      ctx.restore();
    } else if (p.fx === 'slash') { // 치명타 베기선
      const L = p.len * S * (0.6 + k * 0.6), dx = Math.cos(p.ang) * L / 2, dy = Math.sin(p.ang) * L / 2;
      ctx.lineCap = 'round'; ctx.globalAlpha = al;
      ctx.strokeStyle = p.c; ctx.lineWidth = 5 * S * al; ctx.beginPath(); ctx.moveTo(X - dx, Y - dy); ctx.lineTo(X + dx, Y + dy); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * S * al; ctx.stroke();
    } else if (p.fx === 'puff') { // 처치 시 몽글 연기
      ctx.globalAlpha = al * 0.85; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(X, Y, p.size * S * (0.6 + k * 0.7), 0, TAU); ctx.fill();
    } else if (p.fx === 'ghost') { // 처치된 적이 하얗게 부풀며 사라짐
      const sc = 1 + k * 0.6; ctx.globalAlpha = al;
      ctx.drawImage(p.img, Math.round((p.x - (p.w * sc) / 2) * S + offX), Math.round((p.y - p.h * (1 + k * 0.3)) * S + offY), Math.round(p.w * sc * S), Math.round(p.h * (1 + k * 0.3) * S));
    }
  }
  function drawPlayer() {
    const SPR = G.SPR;
    const frames = SPR.char[P.char];
    const fr = P.moving ? Math.floor(P.anim) % 2 : Math.floor(game.time * 1.6) % 2;
    const f = frames[fr];
    // 발밑 표시 (혼잡해도 내 캐릭터가 보이도록)
    ctx.fillStyle = 'rgba(60,90,40,0.35)'; ctx.beginPath(); ctx.ellipse(sx(P.x), sy(P.y + 1), 11 * S, 3.6 * S, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, S * 0.6); ctx.beginPath(); ctx.ellipse(sx(P.x), sy(P.y + 1), 13 * S, 4.6 * S, 0, 0, TAU); ctx.stroke();
    if (P.iframe > 0 && Math.floor(game.time * 20) % 2 === 0) ctx.globalAlpha = 0.5;
    const img = P.hurtT > 0.12 ? (P.facing > 0 ? f.wr : f.wl) : P.facing > 0 ? f.r : f.l;
    if (f.art) { // 일러스트: 걸을 때 통통 튀고 살짝 기울고, 서 있으면 숨쉬듯 말랑
      const ph = P.moving ? P.anim * 0.9 : game.time * 3;
      const hop = P.moving ? Math.abs(Math.sin(ph)) * 2.2 : 0;
      const sq = P.moving ? Math.cos(ph * 2) * 0.05 : Math.sin(ph) * 0.025;
      const tilt = P.moving ? Math.sin(ph) * 0.07 + P.facing * 0.05 : 0;
      const w = f.w * (1 - sq * 0.6), h = f.h * (1 + sq);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.translate(sx(P.x), sy(P.y + 3 - hop)); ctx.rotate(tilt);
      ctx.drawImage(img, Math.round(-w / 2 * S), Math.round(-h * S), Math.round(w * S), Math.round(h * S));
      ctx.restore();
    } else drawSpr(img, P.x, P.y + 4, f.w, f.h);
    ctx.globalAlpha = 1;
    // 체력바
    const bw = 20, bx = P.x - bw / 2, by = P.y + 6;
    ctx.fillStyle = '#4a3328'; ctx.fillRect(sx(bx) - S * 0.5, sy(by) - S * 0.5, (bw + 1) * S, 3 * S);
    ctx.fillStyle = '#f6d6d6'; ctx.fillRect(sx(bx), sy(by), bw * S, 2 * S);
    ctx.fillStyle = P.hp / P.st.maxHp < 0.3 ? '#ff5a6e' : '#ff7a9a'; ctx.fillRect(sx(bx), sy(by), bw * S * clamp(P.hp / P.st.maxHp, 0, 1), 2 * S);
  }
  function drawEnemy(e) {
    const SPR = G.SPR;
    const fr = SPR.enemy[e.def.sprite][Math.floor(e.anim) % 2];
    const big = 1;
    ctx.fillStyle = 'rgba(40,60,30,0.28)'; ctx.beginPath(); ctx.ellipse(sx(e.x), sy(e.y + 1), e.r * 1.1 * S, e.r * 0.4 * S, 0, 0, TAU); ctx.fill();
    if (e.elite || e.boss) { ctx.globalAlpha = 0.4 + 0.2 * Math.sin(game.time * 8); ctx.fillStyle = e.boss ? '#ff6b9a' : '#ffd84a'; ctx.beginPath(); ctx.ellipse(sx(e.x), sy(e.y + 1), e.r * 1.5 * S, e.r * 0.55 * S, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (e.ai === 'tele') { // 돌진 예고선
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(game.time * 30); ctx.strokeStyle = '#ff4a6a'; ctx.lineWidth = e.r * S;
      ctx.beginPath(); ctx.moveTo(sx(e.x), sy(e.y)); ctx.lineTo(sx(e.x + e.dashX * 200), sy(e.y + e.dashY * 200)); ctx.stroke(); ctx.globalAlpha = 1;
    }
    const face = e.boss && e.ai === 'dash' ? Math.sign(e.dashX) || 1 : e.face;
    const img = e.flash > 0 ? (face > 0 ? fr.wr : fr.wl) : face > 0 ? fr.r : fr.l;
    const fly = e.def.fly ? Math.sin(e.anim * 1.5) * 1.5 - 3 : 0;
    if (e.slowAmt > 0) ctx.globalAlpha = 0.85;
    if (e.squash > 0) { // 맞으면 옆으로 납작 → 탱글하게 복원
      const q = e.squash, ws = 1 + 0.32 * q, hs = 1 - 0.24 * q, bx = e.x, by = e.y + fr.h * 0.2 + fly;
      ctx.drawImage(img, Math.round((bx - (fr.w * ws) / 2) * S + offX), Math.round((by - fr.h * hs) * S + offY), Math.round(fr.w * ws * S), Math.round(fr.h * hs * S));
    } else drawSpr(img, e.x, e.y + fr.h * 0.2 + fly, fr.w, fr.h, big);
    ctx.globalAlpha = 1;
    if (e.slowAmt > 0) { ctx.fillStyle = 'rgba(245,184,58,0.6)'; ctx.fillRect(sx(e.x - e.r), sy(e.y + 1), e.r * 2 * S, S); }
    if (e.elite) {
      const bw = 26, bx = e.x - bw / 2, by = e.y - fr.h * 0.85 - 3;
      ctx.fillStyle = '#4a3328'; ctx.fillRect(sx(bx) - S * 0.5, sy(by) - S * 0.5, (bw + 1) * S, 3 * S);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx(bx), sy(by), bw * S * clamp(e.hp / e.maxHp, 0, 1), 2 * S);
    }
  }
  function drawIconRot(key, x, y, ang, scale = 1, alpha = 1) {
    const s = G.SPR.icon[key];
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx(x), sy(y)); ctx.rotate(ang);
    ctx.drawImage(s.c, Math.round((-s.w / 2) * S * scale), Math.round((-s.h / 2) * S * scale), Math.round(s.w * S * scale), Math.round(s.h * S * scale));
    ctx.restore();
  }
  const SWOOSH = { hammer: '#ffd0c8', net: '#cfeeff', spoon: '#fff1b8', hammerX: '#ffb49c', netX: '#c9b8ff', spoonX: '#ffe08a', rod: '#d6f4ff', shell: '#ffe0c4', acorn: '#f5ddb0', shovel: '#fff0c4', honey: '#ffe88a', star: '#fff6a8', tulip: '#ffd0e6' };
  function drawAttacks() {
    for (const a of attacks) {
      if (a.delay > 0) continue;
      switch (a.kind) {
        case 'arc': case 'spin': {
          if (a.t < 0 || a.cur == null) break;
          const col = SWOOSH[a.w.id] || SWOOSH[a.icon] || '#ffffff';
          const fade = a.kind === 'arc' ? clamp(1 - (a.t - a.dur) / 0.12, 0, 1) : 1;
          const tail = a.kind === 'spin' ? 2.2 : Math.abs(a.cur - a.a0);
          const sign = a.a1 > a.a0 ? 1 : -1;
          const st = a.cur - sign * Math.min(tail, Math.abs(a.cur - a.a0));
          // 꼬리는 가늘고 옅게, 머리 쪽은 두껍고 밝게 (초승달 모양 잔상)
          const span = a.cur - st, N = 12, cx = sx(P.x), cy = sy(P.y - 4), big0 = a.reach > 50 ? 0.75 : 1;
          ctx.lineCap = 'butt';
          for (let i = 0; i < N; i++) {
            const f0 = i / N, f1 = (i + 1) / N, fm = (f0 + f1) / 2;
            const b0 = st + span * f0, b1 = st + span * f1 + sign * 0.02;
            ctx.globalAlpha = (0.12 + 0.5 * fm) * fade * big0; ctx.strokeStyle = col;
            ctx.lineWidth = Math.min(a.reach * 0.5, 28) * S * (0.25 + 0.75 * fm);
            ctx.beginPath(); ctx.arc(cx, cy, a.reach * 0.66 * S, Math.min(b0, b1), Math.max(b0, b1)); ctx.stroke();
            ctx.globalAlpha = (0.15 + 0.85 * fm) * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = (0.8 + 2.4 * fm) * S;
            ctx.beginPath(); ctx.arc(cx, cy, a.reach * 0.9 * S, Math.min(b0, b1), Math.max(b0, b1)); ctx.stroke();
          }
          // 칼끝 섬광
          if (fade > 0.5) {
            const hx = cx + Math.cos(a.cur) * a.reach * 0.9 * S, hy = cy + Math.sin(a.cur) * a.reach * 0.9 * S;
            ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, 2.6 * S, 0, TAU); ctx.fill();
            ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, 5.5 * S, 0, TAU); ctx.fill();
          }
          ctx.lineCap = 'round'; ctx.globalAlpha = 1;
          const icon = a.icon || G.WEAPONS[a.w.id].icon;
          const big = G.WEAPONS[a.w.id].evolved ? 1.6 : 1.15;
          drawIconRot(icon, P.x + Math.cos(a.cur) * a.reach * 0.6, P.y - 4 + Math.sin(a.cur) * a.reach * 0.6, a.cur + Math.PI / 4, Math.min(1.7, big * Math.max(1, a.reach / 50)), fade);
          break;
        }
        case 'whip': {
          if (a.t < 0) break;
          const p = clamp(a.t / a.dur, 0, 1), al = 1 - p;
          const x0 = P.x + a.dir * 4, y0 = P.y - 8 + a.yoff, x1 = P.x + a.dir * a.len, yc = P.y - 4 + a.yoff;
          ctx.globalAlpha = 0.5 * al; ctx.fillStyle = a.alwaysCrit ? '#ffe066' : '#ffffff';
          ctx.beginPath(); ctx.ellipse(sx((x0 + x1) / 2), sy(yc), Math.abs(x1 - x0) / 2 * S, a.wid / 2 * S * (1 - p * 0.6), 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = al; ctx.strokeStyle = a.alwaysCrit ? '#ffd84a' : '#ffffff'; ctx.lineWidth = Math.max(1, S * 0.8);
          ctx.beginPath(); ctx.moveTo(sx(x0), sy(y0)); ctx.quadraticCurveTo(sx((x0 + x1) / 2), sy(y0 - 14 * (1 - p)), sx(x1), sy(yc)); ctx.stroke();
          ctx.fillStyle = '#ff6b6b'; ctx.fillRect(sx(x1) - 1.5 * S, sy(yc) - 1.5 * S, 3 * S, 3 * S); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx(x1) - 1.5 * S, sy(yc), 3 * S, 1.5 * S);
          drawIconRot('rod', P.x + a.dir * 6, P.y - 8 + a.yoff, a.dir > 0 ? 0.2 : -Math.PI / 2 - 0.2, 0.9, al);
          ctx.globalAlpha = 1;
          break;
        }
        case 'boom': drawIconRot('shell', a.x, a.y, a.spin, a.size * (G.WEAPONS[a.w.id].evolved ? 1.2 : 1)); break;
        case 'proj': drawIconRot('acorn', a.x, a.y, a.spin, 0.8 * a.size); break;
        case 'ring': {
          if (a.t < 0 || a.cr == null) break;
          const al = clamp(1 - a.t / (a.dur + 0.15), 0, 1);
          ctx.globalAlpha = al * 0.35; ctx.fillStyle = a.peach ? '#ffb49c' : '#d9b27a';
          ctx.beginPath(); ctx.ellipse(sx(a.x), sy(a.y), a.cr * S, a.cr * 0.75 * S, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = al; ctx.strokeStyle = a.peach ? '#ffe2d6' : a.heal ? '#b8f0a8' : '#fff3d0'; ctx.lineWidth = 2 * S;
          ctx.beginPath(); ctx.ellipse(sx(a.x), sy(a.y), a.cr * S, a.cr * 0.75 * S, 0, 0, TAU); ctx.stroke();
          if (!a.peach && a.t < 0.18) drawIconRot('shovel', a.x + 4, a.y - 18 + a.t * 60, -0.6, 1.3, 1 - a.t / 0.18);
          ctx.globalAlpha = 1;
          break;
        }
        case 'pot': {
          if (a.t < 0) break;
          const p = clamp(a.t / a.dur, 0, 1);
          const x = a.sx + (a.tx - a.sx) * p, y = a.sy + (a.ty - a.sy) * p - Math.sin(p * Math.PI) * 30;
          drawIconRot('honey', x, y, p * 8, 0.9);
          break;
        }
        case 'fall': {
          if (a.t < 0) break;
          if (a.t < a.dur) {
            const p = a.t / a.dur, x = a.tx + (1 - p) * 40, y = a.ty - (1 - p) * 140;
            ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff8d0'; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.moveTo(sx(x + 12), sy(y - 40)); ctx.lineTo(sx(x), sy(y)); ctx.stroke(); ctx.globalAlpha = 1;
            drawIconRot('star', x, y, p * 6, G.WEAPONS[a.w.id].evolved ? 1.4 : 1);
            ctx.globalAlpha = 0.3; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = S; ctx.beginPath(); ctx.ellipse(sx(a.tx), sy(a.ty), a.R * S, a.R * 0.7 * S, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
          } else {
            const p = (a.t - a.dur) / 0.25;
            ctx.globalAlpha = (1 - p) * 0.8; ctx.fillStyle = '#fff3a0';
            ctx.beginPath(); ctx.ellipse(sx(a.tx), sy(a.ty), a.R * (0.6 + p * 0.5) * S, a.R * 0.75 * (0.6 + p * 0.5) * S, 0, 0, TAU); ctx.fill();
            ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * S; ctx.stroke(); ctx.globalAlpha = 1;
          }
          break;
        }
        case 'orbit': {
          const fadeIn = Math.min(1, a.t / 0.2), fadeOut = a.life === Infinity ? 1 : Math.min(1, a.life / 0.3);
          for (let i = 0; i < a.n; i++) {
            const an = a.rot + (i / a.n) * TAU, ox = P.x + Math.cos(an) * a.R, oy = P.y + Math.sin(an) * a.R * 0.85 - 3;
            ctx.globalAlpha = 0.18 * fadeIn * fadeOut; ctx.fillStyle = '#ffd0dc';
            for (let k = 1; k <= 3; k++) { const b = an - k * 0.18; ctx.beginPath(); ctx.arc(sx(P.x + Math.cos(b) * a.R), sy(P.y + Math.sin(b) * a.R * 0.85 - 3), (5 - k) * S * a.size * 0.7, 0, TAU); ctx.fill(); }
            drawIconRot('tulip', ox, oy, Math.sin(game.time * 6 + i) * 0.3, Math.min(1.25, a.size), fadeIn * fadeOut);
          }
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
  }
  function fmt(n) { return typeof n === 'string' ? n : n.toLocaleString('en-US'); }
  const NUMFONT = "'Jua', 'M PLUS Rounded 1c', 'Arial Rounded MT Bold', sans-serif"; // 숫자는 언어와 상관없이 같은 글꼴
  // 데미지 크기별 색: 흰색 → 연노랑 → 노랑 → 주황 → 분홍 → 무지개(초대형)
  const TIERS = [[30, '#ffffff', '#fff3d6'], [120, '#fff7a8', '#ffe066'], [400, '#ffe066', '#ffb43a'], [1500, '#ffb85a', '#ff7a3a'], [5000, '#ff9ac0', '#ff4f8f'], [Infinity, '#ffffff', '#b98cff']];
  function tierOf(v) { for (let i = 0; i < TIERS.length; i++) if (v < TIERS[i][0]) return i; return TIERS.length - 1; }
  function drawTexts() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const t of texts) {
      const p = t.t / t.life;
      let x, y;
      if (t.vy != null) { const tt = t.t; x = sx(t.x + t.vx * tt * (1 - p * 0.4)); y = sy(t.y + t.vy * tt + 0.5 * 210 * tt * tt); }
      else { const rise = 16 * U * (1 - (1 - p) * (1 - p)); x = sx(t.x + (t.dx || 0) * p); y = sy(t.y) - rise; }
      if (t.hurt || t.heal) {
        ctx.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1;
        ctx.font = `${Math.round(9 * U)}px ${NUMFONT}`; ctx.lineWidth = 2.4 * U; ctx.strokeStyle = '#4a3328';
        const str = t.hurt ? '-' + t.v : t.v;
        ctx.strokeText(str, x, y); ctx.fillStyle = t.hurt ? '#ff5a6e' : '#7ee08a'; ctx.fillText(str, x, y);
        continue;
      }
      const tier = tierOf(t.v);
      let size = (5.4 + 2.6 * Math.log10(t.v + 1)) * U * (t.crit ? 1.45 : 1) * (t.kill ? 1.12 : 1) * (1 + Math.min(0.5, (t.hits - 1) * 0.04));
      // 탄성 팝: 크게 튀어나왔다가 살짝 줄어들며 자리 잡기
      const k = Math.min(1, t.t / 0.16);
      const pop = 1 + (t.crit ? 1.0 : 0.55) * Math.exp(-6 * k) * Math.cos(k * 9);
      if (tier >= 4 || (t.crit && t.v >= 1000)) { x += rand(-1, 1) * U * (1 - k); y += rand(-1, 1) * U * (1 - k); }
      ctx.globalAlpha = (p > 0.72 ? (1 - p) / 0.28 : 1) * (!t.crit && Math.abs(t.x - P.x) < 12 && Math.abs(t.y - P.y + 8) < 14 ? 0.5 : 1); // 내 캐릭터 위 숫자는 살짝 투명하게
      const fs = Math.round(size * pop);
      ctx.save(); ctx.translate(x, y); if (t.rot) ctx.rotate(t.rot * (1 - k * 0.6));
      // 치명타: 뒤쪽에 터지는 별빛
      if (t.crit && t.t < 0.22) {
        const q = t.t / 0.22, rr = fs * (0.5 + q * 0.9);
        ctx.globalAlpha = (1 - q) * 0.9; ctx.strokeStyle = tier >= 3 ? '#ff7a9a' : '#ffe066'; ctx.lineWidth = Math.max(1.5, U * 1.4 * (1 - q));
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + t.rot; ctx.beginPath(); ctx.moveTo(Math.cos(a) * rr * 0.45, Math.sin(a) * rr * 0.45); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); ctx.stroke(); }
        ctx.globalAlpha = p > 0.72 ? (1 - p) / 0.28 : 1;
      }
      ctx.font = `${fs}px ${NUMFONT}`;
      const str = fmt(Math.round(t.v)) + (t.crit ? '!' : '');
      ctx.lineWidth = Math.max(2, fs * 0.24); ctx.strokeStyle = t.crit ? '#6a1530' : '#4a3328';
      ctx.strokeText(str, 0, 0);
      if (t.t < 0.05) ctx.fillStyle = '#ffffff'; // 첫 순간 하얗게 번쩍
      else if (tier >= 1 || t.crit) {
        const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
        const T = TIERS[t.crit ? Math.max(2, tier) : tier];
        if (tier === TIERS.length - 1) { const h = (game.time * 400) % 360; g.addColorStop(0, `hsl(${h},100%,80%)`); g.addColorStop(1, `hsl(${(h + 120) % 360},100%,65%)`); }
        else { g.addColorStop(0, T[1]); g.addColorStop(1, T[2]); }
        ctx.fillStyle = g;
      } else ctx.fillStyle = '#ffffff';
      ctx.fillText(str, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function drawCombo() {
    if (combo < 5) return;
    const x = W - 14 * U, y = 52 * U + (boss && !boss.dead ? 10 * U : 0);
    const big = 1 + comboPop * 0.35;
    const col = combo >= 1000 ? `hsl(${(game.time * 300) % 360},100%,70%)` : combo >= 500 ? '#ff7a9a' : combo >= 100 ? '#ffb43a' : '#fff3a0';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.globalAlpha = Math.min(1, comboT / 0.5);
    ctx.font = `${Math.round(17 * U * big)}px ${NUMFONT}`; ctx.lineWidth = 3.5 * U; ctx.strokeStyle = '#4a3328'; ctx.fillStyle = col;
    ctx.strokeText(combo.toLocaleString(), x, y); ctx.fillText(combo.toLocaleString(), x, y);
    ctx.font = `${Math.round(7 * U)}px ${G.font()}`; ctx.lineWidth = 2 * U; ctx.fillStyle = '#ffffff';
    ctx.strokeText(G.t('combo'), x, y + 12 * U); ctx.fillText(G.t('combo'), x, y + 12 * U);
    // 콤보 타이머 바
    ctx.fillStyle = 'rgba(74,51,40,0.6)'; ctx.fillRect(x - 40 * U, y + 18 * U, 40 * U, 2 * U);
    ctx.fillStyle = col; ctx.fillRect(x - 40 * U, y + 18 * U, 40 * U * Math.min(1, comboT / 2.5), 2 * U);
    ctx.globalAlpha = 1;
    if (comboFlash) {
      const q = comboFlash.t / 1.4, sc = q < 0.15 ? 0.5 + q / 0.15 * 0.7 : 1.2 - (q - 0.15) * 0.15;
      const word = comboFlash.n >= 1000 ? 'LEGENDARY!!' : comboFlash.n >= 500 ? 'AMAZING!' : comboFlash.n >= 300 ? 'GREAT!' : 'NICE!';
      ctx.globalAlpha = q > 0.75 ? (1 - q) / 0.25 : 1; ctx.textAlign = 'center';
      ctx.font = `${Math.round(20 * U * sc)}px ${NUMFONT}`; ctx.lineWidth = 4 * U; ctx.strokeStyle = '#4a3328'; ctx.fillStyle = col;
      ctx.strokeText(word, W / 2, H * 0.42); ctx.fillText(word, W / 2, H * 0.42);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
  }
  function drawOffscreenMarkers() {
    const targets = [];
    for (const p of pickups) if (p.kind === 'chest') targets.push([p.x, p.y, '#ffd84a', 'chest']);
    if (boss && !boss.dead) targets.push([boss.x, boss.y, '#ff6b9a', null]);
    for (const [x, y, c, ic] of targets) {
      const dx = x - cam.x, dy = y - cam.y;
      if (Math.abs(dx) < viewW / 2 - 10 && Math.abs(dy) < viewH / 2 - 10) continue;
      const k = Math.min((viewW / 2 - 14) / Math.abs(dx || 1), (viewH / 2 - 18) / Math.abs(dy || 1));
      const px = W / 2 + dx * k * S, py = H / 2 + dy * k * S, a = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      ctx.fillStyle = c; ctx.strokeStyle = '#4a3328'; ctx.lineWidth = U;
      ctx.beginPath(); ctx.moveTo(9 * U, 0); ctx.lineTo(-5 * U, -6 * U); ctx.lineTo(-5 * U, 6 * U); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  G.roundRect = roundRect;
  function drawHUD() {
    const SPR = G.SPR;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // 경험치 바
    const need = xpNeed(P.level), bh = 7 * U;
    ctx.fillStyle = 'rgba(74,51,40,0.75)'; ctx.fillRect(0, 0, W, bh + 2 * U);
    const grd = ctx.createLinearGradient(0, 0, W, 0); grd.addColorStop(0, '#8fd3ff'); grd.addColorStop(1, '#c9a6ff');
    ctx.fillStyle = grd; ctx.fillRect(U, U, (W - 2 * U) * clamp(P.xp / need, 0, 1), bh);
    ctx.font = `${Math.round(7 * U)}px ${G.font()}`; ctx.lineWidth = 2 * U; ctx.strokeStyle = '#4a3328'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'right'; ctx.strokeText('Lv ' + P.level, W - 30 * U, U + bh / 2 + 0.5 * U); ctx.fillText('Lv ' + P.level, W - 30 * U, U + bh / 2 + 0.5 * U);
    // 타이머
    ctx.textAlign = 'center';
    const t = Math.floor(game.time), ts = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    ctx.font = `${Math.round(15 * U)}px ${G.font()}`; ctx.lineWidth = 3 * U;
    ctx.strokeText(ts, W / 2, 21 * U); ctx.fillText(ts, W / 2, 21 * U);
    ctx.font = `${Math.round(7.5 * U)}px ${G.font()}`; ctx.lineWidth = 2 * U;
    const ks = '🐾 ' + P.kills.toLocaleString() + '    🔔 ' + Math.floor(P.bells);
    ctx.strokeText(ks, W / 2, 33 * U); ctx.fillText(ks, W / 2, 33 * U);
    // 체력
    const hx = 8 * U, hy = 13 * U, hw = 80 * U, hh = 8 * U;
    roundRect(hx, hy, hw, hh, 4 * U); ctx.fillStyle = 'rgba(74,51,40,0.8)'; ctx.fill();
    roundRect(hx + U, hy + U, Math.max(0, (hw - 2 * U) * clamp(P.hp / P.st.maxHp, 0, 1)), hh - 2 * U, 3 * U); ctx.fillStyle = '#ff7a9a'; ctx.fill();
    ctx.font = `${Math.round(6.2 * U)}px ${G.font()}`; ctx.lineWidth = 2 * U; ctx.fillStyle = '#fff';
    const hs = Math.ceil(P.hp) + ' / ' + Math.round(P.st.maxHp);
    ctx.strokeText(hs, hx + hw / 2, hy + hh / 2 + 0.5 * U); ctx.fillText(hs, hx + hw / 2, hy + hh / 2 + 0.5 * U);
    // 무기/패시브 아이콘
    const isz = 13 * U;
    let ix = hx, iy = hy + hh + 4 * U;
    for (const w of P.weapons) {
      roundRect(ix, iy, isz, isz, 3 * U); ctx.fillStyle = G.WEAPONS[w.id].evolved ? 'rgba(255,216,74,0.9)' : 'rgba(255,250,240,0.85)'; ctx.fill();
      const s = SPR.icon[G.WEAPONS[w.id].icon]; const k = (isz * 0.8) / Math.max(s.w, s.h);
      ctx.drawImage(s.c, ix + (isz - s.w * k) / 2, iy + (isz - s.h * k) / 2, s.w * k, s.h * k);
      const lv = G.WEAPONS[w.id].evolved ? '★' : w.lvl;
      ctx.font = `${Math.round(5.5 * U)}px ${G.font()}`; ctx.lineWidth = 1.6 * U; ctx.textAlign = 'right';
      ctx.strokeText(lv, ix + isz, iy + isz - 1.5 * U); ctx.fillStyle = '#fff'; ctx.fillText(lv, ix + isz, iy + isz - 1.5 * U);
      ix += isz + 2 * U;
    }
    ix = hx; iy += isz + 2 * U;
    const psz = 10 * U;
    for (const id in P.passives) {
      roundRect(ix, iy, psz, psz, 2.5 * U); ctx.fillStyle = 'rgba(255,250,240,0.7)'; ctx.fill();
      const s = SPR.icon[G.PASSIVES[id].icon]; const k = (psz * 0.8) / Math.max(s.w, s.h);
      ctx.drawImage(s.c, ix + (psz - s.w * k) / 2, iy + (psz - s.h * k) / 2, s.w * k, s.h * k);
      ctx.font = `${Math.round(4.8 * U)}px ${G.font()}`; ctx.textAlign = 'right'; ctx.lineWidth = 1.4 * U;
      ctx.strokeText(P.passives[id], ix + psz, iy + psz - U); ctx.fillStyle = '#fff'; ctx.fillText(P.passives[id], ix + psz, iy + psz - U);
      ix += psz + 1.5 * U;
    }
    ctx.textAlign = 'center';
    // 보스 체력바
    if (boss && !boss.dead) {
      const bw = 200 * U, bx = W / 2 - bw / 2, by = 42 * U;
      roundRect(bx, by, bw, 7 * U, 3 * U); ctx.fillStyle = 'rgba(74,51,40,0.85)'; ctx.fill();
      roundRect(bx + U, by + U, (bw - 2 * U) * clamp(boss.hp / boss.maxHp, 0, 1), 5 * U, 2 * U); ctx.fillStyle = '#ff6b9a'; ctx.fill();
      ctx.font = `${Math.round(6.5 * U)}px ${G.font()}`; ctx.lineWidth = 2 * U; ctx.fillStyle = '#fff';
      ctx.strokeText('👑 ' + boss.def.name, W / 2, by + 13 * U); ctx.fillText('👑 ' + boss.def.name, W / 2, by + 13 * U);
    }
    // 배너
    if (banner) {
      const p = 1 - banner.life / banner.max;
      const al = p < 0.1 ? p / 0.1 : banner.life < 0.4 ? banner.life / 0.4 : 1;
      const sc = p < 0.1 ? 0.6 + 0.4 * (p / 0.1) : 1;
      ctx.globalAlpha = al;
      ctx.font = `${Math.round(22 * U * sc)}px ${G.font()}`; ctx.lineWidth = 4 * U; ctx.strokeStyle = '#4a3328'; ctx.fillStyle = '#fff3a0';
      ctx.strokeText(banner.t, W / 2, H * 0.3); ctx.fillText(banner.t, W / 2, H * 0.3);
      if (banner.sub) { ctx.font = `${Math.round(9 * U)}px ${G.font()}`; ctx.lineWidth = 2.5 * U; ctx.fillStyle = '#fff'; ctx.strokeText(banner.sub, W / 2, H * 0.3 + 18 * U); ctx.fillText(banner.sub, W / 2, H * 0.3 + 18 * U); }
      ctx.globalAlpha = 1;
    }
    // 피격 비네트
    if (P.hurtT > 0 || P.hp / P.st.maxHp < 0.25) {
      const a = P.hurtT > 0 ? P.hurtT / 0.25 * 0.45 : 0.15 + 0.1 * Math.sin(game.time * 6);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
      g.addColorStop(0, 'rgba(255,80,110,0)'); g.addColorStop(1, `rgba(255,80,110,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // 조이스틱 (오른쪽 아래 고정, 터치 기기에서는 항상 표시)
    if (joy.active || (G.uiScale || 1) > 1) {
      const c = G.joyCenter ? G.joyCenter() : { x: W - 62 * U, y: H - 58 * U, R: 28 * U }, R = c.R;
      ctx.globalAlpha = joy.active ? 0.4 : 0.25; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = joy.active ? 0.85 : 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * U; ctx.stroke();
      let dx = joy.active ? joy.x - c.x : 0, dy = joy.active ? joy.y - c.y : 0; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
      ctx.globalAlpha = joy.active ? 0.95 : 0.6; ctx.fillStyle = '#fff8f0'; ctx.beginPath(); ctx.arc(c.x + dx, c.y + dy, 11 * U, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4a3328'; ctx.lineWidth = 1.5 * U; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // 일시정지 버튼
    const pr = 11 * U, px = W - 15 * U, py = 22 * U;
    ctx.fillStyle = 'rgba(255,250,240,0.85)'; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a3328'; ctx.lineWidth = 1.5 * U; ctx.stroke();
    ctx.fillStyle = '#4a3328'; ctx.fillRect(px - 4 * U, py - 5 * U, 3 * U, 10 * U); ctx.fillRect(px + 1 * U, py - 5 * U, 3 * U, 10 * U);
    G.pauseBtn = { x: px, y: py, r: pr * 1.4 };
  }

  // ---------- 루프 ----------
  let last = 0;
  function loop(t) {
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 0.016;
    last = t;
    try {
      const t0 = performance.now();
      for (let i = 0; i < (game.speed || 1); i++) update(dt);
      const t1 = performance.now();
      if (game.state !== 'title') render();
      const t2 = performance.now();
      game.perf = { upd: (game.perf ? game.perf.upd * 0.95 : 0) + (t1 - t0) * 0.05, ren: (game.perf ? game.perf.ren * 0.95 : 0) + (t2 - t1) * 0.05 };
    } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
  }
  G.initGame = function (cv) {
    canvas = cv; ctx = canvas.getContext('2d');
    requestAnimationFrame(loop);
  };
  G.renderOnce = render;

  // ---------- 테스트/디버그용 (주소 뒤에 ?debug) ----------
  G.debug = {
    state: () => ({ state: game.state, time: game.time, enemies: enemies.length, attacks: attacks.length, gems: gems.length, particles: particles.length, texts: texts.length, hp: P && P.hp, level: P && P.level, kills: P && P.kills, weapons: P && P.weapons.map((w) => w.id + ':' + w.lvl) }),
    skip: (sec) => { game.time += sec; eliteT = Math.max(eliteT, game.time); eventIdx = G.EVENTS.findIndex((e) => e.t > game.time); if (eventIdx < 0) eventIdx = G.EVENTS.length; },
    xp: (v) => gainXp(v),
    god: () => { P.st.armor = 9999; },
    maxAll: () => { for (const w of P.weapons) { w.lvl = G.weaponMax(w.id); w.s = wstats(w); } },
    give: (id) => { if (G.WEAPONS[id]) addWeapon(id); else { P.passives[id] = (P.passives[id] || 0) + 1; recalc(); } },
    chest: () => pickups.push({ x: P.x + 5, y: P.y, kind: 'chest', big: true }),
    spawn: (id, n = 1) => { for (let i = 0; i < n; i++) { const [x, y] = spawnPos(-60); spawnEnemy(id, x, y); } },
  };
})();
