// 게임 시작점
import { BootScene } from './scenes/BootScene.js';
import { VillageScene } from './scenes/VillageScene.js';
import { applyI18n, t } from './i18n.js';
import { showTitle } from './ui/title.js';
import { showHud } from './ui/hud.js';
import { showAway } from './ui/away.js';
import { toast } from './ui/toast.js';
import { newGame, state, on, farmMods, applyEffects } from './state/GameState.js';
import { startingResidents } from './data/residents.js';
import { SaveService, startAutoSave } from './services/SaveService.js';
import { now, dayKey } from './core/clock.js';
import * as Farm from './core/farm.js';
import { finishDue } from './core/build.js';

// 고해상도 화면(레티나)에서도 선명하게: 실제 픽셀 수만큼 그리고 CSS로 줄여 보여줌
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const viewW = () => Math.round(window.innerWidth * DPR);
const viewH = () => Math.round(window.innerHeight * DPR);

applyI18n();

// 글꼴을 먼저 불러와야 코드로 그리는 간판 글씨가 예쁘게 나옴 (그래서 글꼴 → 게임 순서로 시작)
const fontReady = Promise.race([
  document.fonts?.load('20px Jua') ?? Promise.resolve(),
  new Promise(r => setTimeout(r, 1500)),
]);

await fontReady;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#b4e09a',
  scale: { mode: Phaser.Scale.NONE, width: viewW(), height: viewH(), zoom: 1 / DPR },
  render: { antialias: true, pixelArt: false, roundPixels: false },
  input: { activePointers: 3 },
  scene: [BootScene],
});

window.addEventListener('resize', () => {
  game.scale.resize(viewW(), viewH());
  game.scale.setZoom(1 / DPR);
});

let awayInfo = null;

function startVillage() {
  // 날짜가 바뀌었으면 플레이한 날 +1
  const today = dayKey();
  if (state.stats.lastDay && state.stats.lastDay !== today) state.stats.daysPlayed += 1;
  state.stats.lastDay = today;

  const saveSoon = startAutoSave();
  on('change', saveSoon);
  SaveService.askPersist();
  SaveService.save();
  game.scene.add('Village', VillageScene, true, { dpr: DPR });
}

game.events.once('boot-done', async () => {
  let saved = null;
  try { saved = await SaveService.peek(); } catch { saved = null; }
  showTitle({
    saved,
    onContinue: async () => {
      const ok = await SaveService.load().catch(() => false);
      if (!ok) { toast(t('settings.import.broken')); return; }
      awayInfo = summarizeAway();
      startVillage();
    },
    onNew: ({ mayorId, villageName }) => {
      newGame({ mayorId, villageName, residents: startingResidents(mayorId) });
      startVillage();
    },
  });
});

// 꺼둔 사이 시간이 흐른 만큼 작물을 자라게 하고 공사를 끝내고, 무슨 일이 있었는지 정리
function summarizeAway() {
  const t0 = now(), mods = farmMods();
  const awayMs = state.lastClockAt ? Math.max(0, t0 - state.lastClockAt) : 0;
  const counts = { ripe: 0, thirsty: 0, growing: 0 };
  for (const p of state.farm.plots) {
    Farm.advance(p, t0, mods);
    const st = Farm.status(p, t0, mods).state;
    if (counts[st] !== undefined) counts[st]++;
  }
  // 꺼둔 사이 끝난 공사
  const built = finishDue(state.buildings, t0).length;
  state.stats.built += built;
  applyEffects();
  return { awayMs, built, ...counts };
}

game.events.on('village-ready', scene => {
  showHud(scene);
  if (awayInfo && awayInfo.awayMs > 60 * 1000) showAway(awayInfo);
  else toast(t('village.welcome', { name: state.village.name }));
  if (window.innerHeight > window.innerWidth) setTimeout(() => toast(t('village.portraitTip'), 3000), 2600);
});

// 개발·테스트용 (브라우저 콘솔에서 G.game 등으로 확인 가능)
window.G = { game, state, SaveService };
