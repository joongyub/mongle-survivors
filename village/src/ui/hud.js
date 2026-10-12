// 마을 화면 위 정보(코인, 재료, 등급)와 아래 메뉴 버튼
import { state, on, emit, TUT_END } from '../state/GameState.js';
import { t, itemName } from '../i18n.js';
import { seasonOf, clockText } from '../core/clock.js';
import { count } from '../core/inventory.js';
import { seedId } from '../data/crops.js';
import { toast } from './toast.js';
import { openBag } from './bag.js';
import { openSettings } from './settings.js';
import { openBuildMenu } from './buildMenu.js';
import { buildersBusy, def } from '../core/build.js';
import { MAX_BUILDERS } from '../data/buildings.js';
import { sfx } from '../audio.js';

// 아래 메뉴: 아직 기능이 없는 버튼은 몇 단계에서 열리는지 알려줌
const MENU = [
  { id: 'build', ico: '🔨', open: scene => openBuildMenu(scene) },
  { id: 'bag', ico: '🎒', open: () => openBag() },
  { id: 'residents', ico: '🐾', step: 6 },
  { id: 'quests', ico: '📜', step: 6 },
  { id: 'book', ico: '📖', step: 9 },
  { id: 'settings', ico: '⚙️', open: () => openSettings() },
];

// 씬(마을 화면)과 연결: 들고 있는 씨앗 등
export function showHud(scene) {
  const camera = scene.camCtl;
  document.getElementById('hud').classList.remove('hidden');
  const bar = document.getElementById('menuBar');
  bar.innerHTML = '';
  for (const m of MENU) {
    const b = document.createElement('button');
    b.className = 'menu-btn';
    b.dataset.id = m.id;
    b.innerHTML = `<span class="ico">${m.ico}</span>${t('menu.' + m.id)}`;
    b.onclick = () => {
      sfx('tap');
      if (m.open) m.open(scene);
      else toast(t('menu.comingSoon', { name: t('menu.' + m.id), step: m.step }));
    };
    bar.appendChild(b);
  }

  const mute = document.getElementById('muteBtn');
  mute.textContent = state.settings.muted ? '🔇' : '🔊';
  on('change', () => { mute.textContent = state.settings.muted ? '🔇' : '🔊'; });
  mute.onclick = () => {
    state.settings.muted = !state.settings.muted;
    mute.textContent = state.settings.muted ? '🔇' : '🔊';
    toast(t(state.settings.muted ? 'hud.muteOn' : 'hud.muteOff'));
    emit('change');
  };

  document.getElementById('zoomIn').onclick = () => camera.zoomBy(1.25);
  document.getElementById('zoomOut').onclick = () => camera.zoomBy(0.8);
  document.getElementById('centerBtn').onclick = () => camera.focusPlayer();
  document.getElementById('holdCancel').onclick = () => scene.setHeldSeed(null);
  document.getElementById('builderRes').onclick = () => { sfx('tap'); openBuildMenu(scene); };

  // 건물 놓기 모드 아래 막대
  const hud = document.getElementById('hud');
  document.getElementById('placeRotate').onclick = () => scene.placer?.rotate();
  document.getElementById('placeCancel').onclick = () => scene.stopPlacing();
  document.getElementById('placeOk').onclick = () => scene.confirmPlace();
  on('placing', pl => {
    hud.classList.toggle('placing', !!pl);
    if (!pl) return;
    document.getElementById('placeName').textContent = t('bld.' + pl.type) + (pl.placedCount ? ' · ' + t('build.placedN', { n: pl.placedCount }) : '');
    const r = pl.result || { ok: true };
    const hint = document.getElementById('placeHint');
    hint.textContent = r.ok ? t('build.placeHint') : '⚠️ ' + t('build.reason.' + r.reason);
    hint.classList.toggle('bad', !r.ok);
    document.getElementById('placeRotate').classList.toggle('hidden', !def(pl.type).turn);
    document.getElementById('placeOkText').textContent = t(pl.moveUid ? 'build.confirmMove' : 'build.confirm');
    document.getElementById('placeOk').disabled = !r.ok;
  });

  const refresh = () => {
    document.getElementById('coinText').textContent = state.inventory.coins.toLocaleString();
    document.getElementById('woodText').textContent = count(state.inventory, 'wood');
    document.getElementById('stoneText').textContent = count(state.inventory, 'stone');
    document.getElementById('rankName').textContent = t('hud.rank', { rank: state.village.rank, name: t('rank.' + state.village.rank) });
    document.getElementById('rankGauge').style.width = Math.round(state.village.scoreProgress * 100) + '%';
    document.getElementById('villageTitle').textContent = t('hud.village', { name: state.village.name, season: t('season.' + seasonOf()) });
    document.getElementById('clockText').textContent = clockText(undefined, t('clock.am'), t('clock.pm'));
    const busy = buildersBusy(state.buildings);
    document.getElementById('builderText').textContent = `${busy}/${MAX_BUILDERS}`;
    document.getElementById('builderRes').classList.toggle('working', busy > 0);

    // 들고 있는 씨앗
    const chip = document.getElementById('holdChip');
    const held = scene.heldSeed;
    chip.classList.toggle('hidden', !held);
    if (held) document.getElementById('holdText').textContent = t('farm.holding', { name: itemName(seedId(held)), n: count(state.inventory, seedId(held)) });

    // 처음 안내
    const tut = document.getElementById('tutorial');
    const step = state.tutorial.step;
    tut.classList.toggle('hidden', step >= TUT_END);
    if (step < TUT_END) tut.textContent = t('tut.' + step);
  };
  on('change', refresh);
  on('harvest', () => bump(bar.querySelector('[data-id="bag"]')));
  on('sold', () => bump(document.getElementById('coinText').parentElement));
  refresh();
  setInterval(refresh, 5000);
}

function bump(node) {
  if (!node) return;
  node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump');
}
