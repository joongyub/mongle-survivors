// ★ 농사 규칙 (화면 코드 없음)
// 같은 입력이면 항상 같은 결과가 나와서, 나중에 서버에서도 똑같이 검사할 수 있어.
//
// 밭 하나의 모양:
//   { uid, x, y, crop: null | 'carrot', stage: 0~2, watered: true/false, stageStartedAt: 시각, harvests: 수확 횟수 }
//   stage 0 = 씨앗, 1 = 새싹, 2 = 다 자람
//   씨앗·새싹 단계는 물을 줘야 그때부터 시간이 흘러. 물을 안 주면 멈춰서 기다릴 뿐 죽지 않아.
import { CROP_BY_ID, seedId } from '../data/crops.js';
import { seasonOf } from './clock.js';
import * as Inv from './inventory.js';

const MIN = 60 * 1000;
export const STAGE_SEED = 0, STAGE_SPROUT = 1, STAGE_RIPE = 2;

export function newPlot(uid, x, y) {
  return { uid, x, y, crop: null, stage: 0, watered: false, stageStartedAt: 0, harvests: 0 };
}

// 한 단계에 걸리는 시간 (밀리초)
// 제철이 아니면 2배 느림, 촌장 보너스면 10% 빠름
export function stageDuration(plot, now, mods = {}) {
  const c = CROP_BY_ID[plot.crop];
  const total = (plot.harvests > 0 && c.regrowMin) ? c.regrowMin : c.growMin;
  let ms = total * MIN / 2;
  if (!c.seasons.includes(seasonOf(now))) ms *= 2;
  if (mods.fasterKind === c.kind) ms *= 0.9;
  return ms;
}

export function isInSeason(cropId, now) {
  return CROP_BY_ID[cropId].seasons.includes(seasonOf(now));
}

// 지금 시각까지 자란 만큼 단계를 올려줌. (껐다 켜도 이 함수로 정확히 계산)
export function advance(plot, now, mods = {}) {
  while (plot.crop && plot.stage < STAGE_RIPE && plot.watered) {
    const end = plot.stageStartedAt + stageDuration(plot, now, mods);
    if (now < end) break;
    plot.stage += 1;
    plot.stageStartedAt = end;
    plot.watered = false;          // 다음 단계는 다시 물이 필요
  }
  return plot;
}

// 화면에 보여줄 상태 계산
export function status(plot, now, mods = {}) {
  if (!plot.crop) return { state: 'empty' };
  if (plot.stage >= STAGE_RIPE) return { state: 'ripe' };
  if (!plot.watered) return { state: 'thirsty', stage: plot.stage };
  const dur = stageDuration(plot, now, mods);
  const left = Math.max(0, plot.stageStartedAt + dur - now);
  // 남은 시간 = 이번 단계 남은 시간 + (씨앗 단계면) 새싹 단계 시간
  const extra = plot.stage === STAGE_SEED ? dur : 0;
  return { state: 'growing', stage: plot.stage, leftMs: left + extra, progress: 1 - left / dur };
}

export function plant(plot, inv, cropId, now) {
  if (plot.crop) return { ok: false, reason: 'occupied' };
  if (!Inv.remove(inv, seedId(cropId))) return { ok: false, reason: 'noSeed' };
  Object.assign(plot, { crop: cropId, stage: STAGE_SEED, watered: false, stageStartedAt: now, harvests: 0 });
  return { ok: true };
}

export function water(plot, now, mods = {}) {
  advance(plot, now, mods);
  if (!plot.crop || plot.stage >= STAGE_RIPE || plot.watered) return { ok: false };
  plot.watered = true;
  plot.stageStartedAt = now;
  return { ok: true };
}

export function harvest(plot, inv, now, mods = {}) {
  advance(plot, now, mods);
  if (!plot.crop || plot.stage < STAGE_RIPE) return { ok: false, reason: 'notRipe' };
  const c = CROP_BY_ID[plot.crop];
  if (!Inv.add(inv, c.id, 1)) return { ok: false, reason: 'bagFull' };
  if (c.regrowMin) {
    // 다시 열리는 작물: 새싹 단계로 돌아가서 물을 주면 또 자람
    Object.assign(plot, { stage: STAGE_SPROUT, watered: false, stageStartedAt: now, harvests: plot.harvests + 1 });
  } else {
    Object.assign(plot, { crop: null, stage: 0, watered: false, stageStartedAt: 0, harvests: 0 });
  }
  return { ok: true, item: c.id };
}

// 씨앗 사기 / 작물 팔기
export function buySeed(inv, cropId, n = 1) {
  const cost = CROP_BY_ID[cropId].seedPrice * n;
  if (inv.coins < cost) return { ok: false, reason: 'noCoins' };
  if (!Inv.canAdd(inv, seedId(cropId), n)) return { ok: false, reason: 'bagFull' };
  inv.coins -= cost;
  Inv.add(inv, seedId(cropId), n);
  return { ok: true, cost };
}

export function sell(inv, itemId, n, price) {
  if (!Inv.remove(inv, itemId, n)) return { ok: false };
  inv.coins += price * n;
  return { ok: true, gain: price * n };
}

// "1시간 5분" 같은 글자로
export function formatLeft(ms) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}시간 ${mm}분` : `${h}시간`;
}
