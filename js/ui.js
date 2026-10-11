// ui.js — 메뉴 화면, 레벨업 카드, 입력(키보드/터치 조이스틱), 화면 크기
(function () {
  const G = window.G;
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), cv = $('cv');
  const game = G.game;
  const ui = (G.ui = {});
  const urlCache = {};
  const iconURL = (k, s = 6) => urlCache['i' + k + s] || (urlCache['i' + k + s] = G.spriteURL(G.SPR.icon[k].c, s));
  const charURL = (id, f = 0, s = 6) => urlCache['c' + id + f + s] || (urlCache['c' + id + f + s] = G.spriteURL(G.SPR.char[id][f].r, s));

  // 터치 기기는 화면이 작으니 글자/버튼을 조금 크게
  G.uiScale = matchMedia('(pointer: coarse)').matches ? 1.3 : 1;
  if (!G.save.settings.lang) G.save.settings.lang = (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'ko';
  G.setLang(G.save.settings.lang);
  G.buildSprites();
  G.initGame(cv);

  // ---------- 16:9 스테이지 맞추기 ----------
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    let w = vw, h = (vw * 9) / 16;
    if (h > vh) { h = vh; w = (vh * 16) / 9; }
    w = Math.floor(w); h = Math.floor(h);
    Object.assign(stage.style, { width: w + 'px', height: h + 'px', left: Math.floor((vw - w) / 2) + 'px', top: Math.floor((vh - h) / 2) + 'px' });
    document.documentElement.style.setProperty('--u', (h / 360) * G.uiScale + 'px');
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    G.resize(w * dpr, h * dpr);
    ui.dpr = dpr;
    if (game.state !== 'title' && G.player) G.renderOnce();
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 200));
  fit();

  function show(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
  }
  function hideAll() { for (const s of document.querySelectorAll('.screen')) s.classList.remove('on'); }
  const click = () => G.audio.play('click');

  // ---------- 타이틀 ----------
  function showTitle() {
    game.state = 'title';
    show('title');
    $('tBells').textContent = Math.floor(G.save.bells).toLocaleString();
    const pa = $('parade'); pa.innerHTML = '';
    // 아이폰 사파리(주소창 있는 상태)에서만 '홈 화면에 추가' 안내
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    let framed = true; try { framed = window.self !== window.top; } catch (e) {}
    $('iosTip').classList.toggle('on', ios && !standalone && !framed);
    G.CHARS.forEach((c, i) => { const im = document.createElement('img'); im.className = 'px'; im.src = charURL(c.id); im.style.animationDelay = i * 0.08 + 's'; pa.appendChild(im); });
  }
  function firstGesture() {
    G.audio.init();
    G.audio.sfxOn = G.save.settings.sfx; G.audio.bgmOn = G.save.settings.bgm;
    G.audio.startBgm();
    // 모바일: 전체화면 + 가로 고정 시도 (지원되지 않으면 조용히 무시)
    if (matchMedia('(pointer: coarse)').matches) {
      try {
        const el = document.documentElement;
        const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
        if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      } catch (e) {}
    }
  }
  $('bLang').onclick = () => { G.setLang(G.lang === 'ko' ? 'ja' : 'ko'); G.save.settings.lang = G.lang; G.saveNow(); click(); showTitle(); };
  $('bStart').onclick = () => { firstGesture(); click(); showSelect(); };
  $('bShop').onclick = () => { firstGesture(); click(); showShop(); };

  // ---------- 캐릭터 선택 ----------
  let selId = G.save.lastChar || 'momo';
  function showSelect() {
    game.state = 'title';
    show('select');
    const grid = $('chargrid'); grid.innerHTML = '';
    for (const c of G.CHARS) {
      const d = document.createElement('div'); d.className = 'cc' + (c.id === selId ? ' sel' : '');
      const best = G.save.best[c.id];
      d.innerHTML = `<img class="px ch" src="${charURL(c.id)}"><div class="nm">${c.name}</div><img class="px wp" src="${iconURL(G.WEAPONS[c.weapon].icon, 4)}">${best && best.won ? '<span class="star">👑</span>' : ''}`;
      d.style.background = `linear-gradient(${G.mix(c.color, '#ffffff', 0.75)}, #fffaf0)`;
      d.onclick = () => { click(); if (selId === c.id && d.classList.contains('sel')) { startRun(); return; } selId = c.id; showSelect(); };
      grid.appendChild(d);
    }
    renderDetail();
  }
  function renderDetail() {
    const c = G.CHARS.find((x) => x.id === selId);
    const w = G.WEAPONS[c.weapon];
    const best = G.save.best[c.id];
    const t = best ? G.t('min', { m: Math.floor(best.time / 60), s: Math.floor(best.time % 60) }) : '-';
    $('chardetail').innerHTML = `
      <div class="top"><img class="px" id="detImg" src="${charURL(c.id, 0, 8)}">
        <div><div class="name">${c.name}</div><div class="en">${c.en} · ${c.animal}</div></div></div>
      <div class="story">${c.story}</div>
      <div><span class="tag"><img class="px" src="${iconURL(w.icon, 4)}">${w.name}</span></div>
      <div style="font-size:calc(var(--u)*7);opacity:.8">${w.desc}</div>
      <div><span class="tag">✨ ${c.bonusText}</span></div>
      <div class="best">${G.t('best')}: ${t}${best ? ` · ${G.t('killsN', { n: best.kills.toLocaleString() })} · Lv ${best.level}${best.won ? ' · ' + G.t('cleared') : ''}` : ''}</div>
      <button class="btn green go" id="bGo">${G.t('go')}</button>`;
    $('bGo').onclick = () => { click(); startRun(); };
  }
  setInterval(() => { const im = $('detImg'); if (im && $('select').classList.contains('on')) { const f = Math.floor(Date.now() / 450) % 2; im.src = charURL(selId, f, 8); } }, 150);
  $('bSelBack').onclick = () => { click(); showTitle(); };
  function startRun() { hideAll(); G.audio.duck(false); G.startRun(selId); }

  // ---------- 상점 ----------
  function showShop() {
    show('shop');
    $('sBells').textContent = Math.floor(G.save.bells).toLocaleString();
    const grid = $('shopgrid'); grid.innerHTML = '';
    for (const it of G.SHOP) {
      const l = G.save.shop[it.id] || 0, cost = it.cost * (l + 1), maxed = l >= it.max;
      const d = document.createElement('div');
      d.className = 'si' + (maxed ? ' maxed' : G.save.bells < cost ? ' cant' : '');
      d.innerHTML = `<img class="px" src="${iconURL(it.icon, 4)}"><div class="nm">${it.name} ${l}/${it.max}</div><div class="ds">${it.desc}</div><div class="cost">${maxed ? G.t('max') : '🔔 ' + cost.toLocaleString()}</div>`;
      d.onclick = () => {
        if (maxed || G.save.bells < cost) { G.audio.play('hurt'); return; }
        G.save.bells -= cost; G.save.shop[it.id] = l + 1; G.saveNow(); G.audio.play('bell'); showShop();
      };
      grid.appendChild(d);
    }
  }
  $('bShopBack').onclick = () => { click(); showTitle(); };

  // ---------- 레벨업 ----------
  let choices = [], focusIdx = 0;
  ui.showLevelUp = function () {
    choices = G.buildChoices(); focusIdx = 0;
    $('lvBonus').textContent = G.t('lvBonus', { lv: G.player.level, p: Math.round((G.levelBonus() - 1) * 100) });
    G.audio.duck(true);
    renderCards();
    show('levelup');
  };
  function renderCards() {
    const box = $('cards'); box.innerHTML = '';
    choices.forEach((o, i) => {
      const d = G.describeChoice(o);
      const el = document.createElement('div'); el.className = 'card' + (i === focusIdx ? ' focus' : '');
      el.style.animationDelay = i * 0.06 + 's';
      const kcls = d.kind === 'weapon' ? '' : d.kind === 'item' ? 'item' : 'other';
      const kname = G.t({ weapon: 'kWeapon', item: 'kItem', heal: 'kHeal', bonus: 'kBonus' }[d.kind]);
      let pips = '';
      if (d.max > 1) { pips = '<div class="pips">'; for (let k = 1; k <= d.max; k++) pips += `<i class="${k <= d.lvl ? 'f' : ''}"></i>`; pips += '</div>'; }
      el.innerHTML = `<span class="key">${i + 1}</span>${d.isNew ? '<span class="new">' + G.t('isNew') + '</span>' : ''}<span class="kd ${kcls}" data-kind="${d.kind}">${kname}</span><img class="px ic" src="${iconURL(d.icon, 6)}"><div class="nm">${d.name}</div>${d.lvl ? `<div class="lv">${d.isNew ? G.t('newGet') : 'Lv ' + (d.lvl - 1) + ' → ' + d.lvl}</div>` : ''}${pips}<div class="tx">${d.text}</div>${d.evoHint ? '<span class="evo">' + G.t('evoCombo') + '</span>' : ''}`;
      el.onclick = () => choose(i);
      box.appendChild(el);
    });
    const rr = G.player.rerollsLeft;
    $('bReroll').textContent = G.t('reroll', { n: rr }); $('bReroll').disabled = rr <= 0;
  }
  function choose(i) {
    const o = choices[i]; if (!o) return;
    G.applyChoice(o); G.audio.play('pick');
    closeOverlay();
  }
  function closeOverlay() {
    hideAll(); G.audio.duck(false);
    if (game.state !== 'over') game.state = 'play';
  }
  $('bReroll').onclick = () => { if (G.player.rerollsLeft > 0) { G.player.rerollsLeft--; click(); choices = G.buildChoices(); renderCards(); } };
  $('bSkip').onclick = () => { G.player.bells += 10; click(); closeOverlay(); };

  // ---------- 보물상자 ----------
  ui.showChest = function (res) {
    G.audio.duck(true);
    let h = `<h2>${G.t('chest')}</h2>`;
    if (res.evolved) {
      const a = G.WEAPONS[res.evolved.from], b = G.WEAPONS[res.evolved.into];
      h += `<img class="px big" src="${iconURL(b.icon, 8)}"><div class="evot">${G.t('evolve')}</div>
        <div class="line">${a.name} → <b style="color:#e8475a;font-weight:normal">${b.name}</b></div>
        <div style="font-size:calc(var(--u)*8)">${b.desc}</div>`;
    } else {
      h += `<img class="px big" src="${iconURL('chest', 6)}">`;
      for (const u of res.ups) h += `<div class="line"><img class="px" src="${iconURL(u.icon, 4)}">${u.name} <span style="color:#8a6a50">Lv ${u.lvl}</span></div>`;
      if (!res.ups.length) h += `<div class="line">${G.t('allMax')}</div>`;
    }
    h += `<div class="line">🔔 +${res.bells} ${G.t('bellUnit')}</div><button class="btn green" id="bChestOk">${G.t('ok')}</button>`;
    $('chestPanel').innerHTML = h;
    $('bChestOk').onclick = () => { click(); closeOverlay(); };
    show('chest');
  };

  // ---------- 일시정지 ----------
  function pause() {
    if (game.state !== 'play') return;
    game.state = 'pause'; G.audio.duck(true);
    const b = $('pauseBuild'); b.innerHTML = '';
    for (const w of G.player.weapons) b.innerHTML += `<span class="tag"><img class="px" src="${iconURL(G.WEAPONS[w.id].icon, 4)}">${G.WEAPONS[w.id].name} ${G.WEAPONS[w.id].evolved ? '★' : 'Lv' + w.lvl}</span>`;
    for (const id in G.player.passives) b.innerHTML += `<span class="tag"><img class="px" src="${iconURL(G.PASSIVES[id].icon, 4)}">${G.PASSIVES[id].name} ${G.player.passives[id]}</span>`;
    renderToggles();
    show('pause');
  }
  function renderToggles() {
    const s = G.save.settings, t = $('toggles');
    const items = [['sfx', G.t('sfx')], ['bgm', G.t('bgm')], ['numbers', G.t('numbers')], ['shake', G.t('shake')]];
    t.innerHTML = '';
    for (const [k, n] of items) {
      const b = document.createElement('div'); b.className = 'tg' + (s[k] ? ' on' : ''); b.textContent = n + ' ' + (s[k] ? G.t('on') : G.t('off'));
      b.onclick = () => { s[k] = !s[k]; G.saveNow(); G.audio.sfxOn = s.sfx; G.audio.bgmOn = s.bgm; click(); renderToggles(); };
      t.appendChild(b);
    }
  }
  function resume() { if (game.state === 'pause') { click(); closeOverlay(); } }
  $('bResume').onclick = resume;
  $('bQuit').onclick = () => { click(); hideAll(); G.endRun(false); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  const portrait = matchMedia('(orientation: portrait) and (pointer: coarse)');
  const onPortrait = () => { if (portrait.matches) pause(); };
  if (portrait.addEventListener) portrait.addEventListener('change', onPortrait); else if (portrait.addListener) portrait.addListener(onPortrait);

  // ---------- 결과 ----------
  ui.showResults = function (r) {
    G.audio.duck(true);
    const t = `${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}`;
    let rows = '';
    for (const w of r.weapons.sort((a, b) => b.dealt - a.dealt)) {
      const d = G.WEAPONS[w.id];
      rows += `<tr><td><img class="px" src="${iconURL(d.icon, 3)}">${d.name} ${d.evolved ? '★' : 'Lv' + w.lvl}</td><td>${Math.round(w.dealt).toLocaleString()}</td><td>${Math.round(w.dps).toLocaleString()}</td><td>${w.kills.toLocaleString()}</td></tr>`;
    }
    const ch = G.CHARS.find((c) => c.id === G.player.char);
    $('resPanel').innerHTML = `
      <h2>${r.won ? G.t('winTitle') : G.t('loseTitle')}</h2>
      <div class="row"><img class="px" style="width:calc(var(--u)*40);height:calc(var(--u)*40)" src="${charURL(ch.id)}">
      <div class="stats"><div><b>${t}</b>${G.t('survived')}${r.newBest ? ' 🎉' : ''}</div><div><b>${r.kills.toLocaleString()}</b>${G.t('kills')}</div><div><b>${r.level}</b>${G.t('level')}</div></div></div>
      <table class="dps"><tr><th>${G.t('thWeapon')}</th><th>${G.t('thTotal')}</th><th>${G.t('thDps')}</th><th>${G.t('thKills')}</th></tr>${rows}</table>
      <div class="bellsum">${G.t('bellSum', { a: r.bellsPicked, b: r.bonus, c: r.total.toLocaleString() })}</div>
      <div class="row"><button class="btn green" id="bAgain">${G.t('again')}</button><button class="btn small" id="bChar">${G.t('charSel')}</button><button class="btn small yellow" id="bToShop">${G.t('shop')}</button></div>`;
    $('bAgain').onclick = () => { click(); startRun(); };
    $('bChar').onclick = () => { click(); showSelect(); };
    $('bToShop').onclick = () => { click(); showShop(); };
    show('results');
  };

  // ---------- 키보드 ----------
  window.addEventListener('keydown', (e) => {
    G.input.keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') { if (game.state === 'play') pause(); else if (game.state === 'pause') resume(); }
    if (game.state === 'levelup') {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= choices.length) choose(n - 1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { focusIdx = (focusIdx + choices.length - 1) % choices.length; renderCards(); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { focusIdx = (focusIdx + 1) % choices.length; renderCards(); }
      if (e.code === 'Enter' || e.code === 'Space') choose(focusIdx);
      if (e.code === 'KeyR') $('bReroll').click();
    } else if (game.state === 'chest' && (e.code === 'Enter' || e.code === 'Space')) { const b = $('bChestOk'); b && b.click(); }
  });
  window.addEventListener('keyup', (e) => { G.input.keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in G.input.keys) G.input.keys[k] = false; });

  // ---------- 터치/마우스 조이스틱 ----------
  const joy = G.input.joy;
  function toCanvas(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * ui.dpr, (e.clientY - r.top) * ui.dpr]; }
  // 조이스틱은 오른쪽 아래에 고정. 그 근처를 누르면 조이스틱이 잡혀요.
  G.joyCenter = () => { const u = (cv.height / 360) * G.uiScale; return { x: cv.width - 62 * u, y: cv.height - 58 * u, R: 28 * u }; };
  cv.addEventListener('pointerdown', (e) => {
    if (game.state !== 'play') return;
    const [x, y] = toCanvas(e);
    const pb = G.pauseBtn;
    if (pb && Math.hypot(x - pb.x, y - pb.y) < pb.r) { pause(); return; }
    if (joy.active) return;
    const c = G.joyCenter();
    if (Math.hypot(x - c.x, y - c.y) > c.R * 2.6) return;
    joy.active = true; joy.id = e.pointerId; joy.ox = c.x; joy.oy = c.y; joy.x = x; joy.y = y;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  cv.addEventListener('pointermove', (e) => {
    if (!joy.active || e.pointerId !== joy.id) return;
    const [x, y] = toCanvas(e); joy.x = x; joy.y = y;
  });
  const endJoy = (e) => { if (e.pointerId === joy.id) { joy.active = false; joy.id = null; } };
  cv.addEventListener('pointerup', endJoy);
  cv.addEventListener('pointercancel', endJoy);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 폰트 로드 후 타이틀
  (document.fonts && document.fonts.load ? document.fonts.load('20px Jua').catch(() => {}) : Promise.resolve()).finally(showTitle);
})();
