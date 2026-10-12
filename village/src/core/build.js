// ★ 건설 규칙 (화면 코드 없음, 순수 함수)
// 건물 하나 = { uid, type, x, y, rot, level, job }
//   job = 공사 중일 때 { toLevel, startAt, endAt, paid }, 아니면 null
//   level 0 = 아직 처음 짓는 중
import { BUILDINGS, MAX_BUILDERS, STORAGE_SLOTS, TOWNHALL_SALE, BUILD_AREA } from '../data/buildings.js';

export const def = type => BUILDINGS[type];

// 돌린 상태에 맞춘 크기
export function sizeOf(type, rot = 0) {
  const d = def(type);
  return d.turn === 'swap' && rot % 2 ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}

export function cells(b) {
  const { w, h } = sizeOf(b.type, b.rot);
  const out = [];
  for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) out.push({ x, y });
  return out;
}

export const isWalkableBuilding = type => !!def(type).walkable;
export const maxLevel = type => def(type).levels.length - 1;
export const nextLevelInfo = b => def(b.type).levels[b.level + 1] || null;

// ---------- 비용 ----------
export const COST_KEYS = ['wood', 'stone', 'coins'];

export function have(inv, key) { return key === 'coins' ? inv.coins : (inv.items[key] ?? 0); }

export function missing(inv, cost = {}) {
  const out = {};
  for (const k of COST_KEYS) if ((cost[k] || 0) > have(inv, k)) out[k] = cost[k] - have(inv, k);
  return out;
}

export const canAfford = (inv, cost) => Object.keys(missing(inv, cost)).length === 0;

export function pay(inv, cost = {}) {
  if (!canAfford(inv, cost)) return false;
  for (const k of COST_KEYS) {
    const n = cost[k] || 0;
    if (!n) continue;
    if (k === 'coins') inv.coins -= n;
    else { inv.items[k] -= n; if (inv.items[k] <= 0) delete inv.items[k]; }
  }
  return true;
}

// 돌려받기 (가방이 꽉 차도 재료는 넣어줌: 손해 보지 않게)
export function refund(inv, cost = {}) {
  for (const k of COST_KEYS) {
    const n = cost[k] || 0;
    if (!n) continue;
    if (k === 'coins') inv.coins += n;
    else inv.items[k] = (inv.items[k] ?? 0) + n;
  }
}

// ---------- 일꾼, 시간 ----------
export function buildersBusy(buildings) { return buildings.filter(b => b.job).length; }
export function buildersFree(buildings) { return MAX_BUILDERS - buildersBusy(buildings); }

// mods.faster = 0.1 이면 10% 빨리 (도도 촌장)
export function buildMs(type, toLevel, mods = {}) {
  const sec = def(type).levels[toLevel]?.sec ?? 0;
  return Math.round(sec * 1000 * (1 - (mods.faster || 0)));
}

export function leftMs(b, now) { return b.job ? Math.max(0, b.job.endAt - now) : 0; }
export function progress(b, now) {
  if (!b.job) return 1;
  const total = b.job.endAt - b.job.startAt;
  return total <= 0 ? 1 : Math.min(1, (now - b.job.startAt) / total);
}

// ---------- 놓을 수 있는지 ----------
// world = { ground, objects: Map('x,y' → type), objectRules, plots, buildings, player: {x,y} }
// ignoreUid: 옮기는 중인 건물 자신은 빼고 검사
export function canPlace(world, type, x, y, rot = 0, ignoreUid = null) {
  const { w, h } = sizeOf(type, rot);
  const A = BUILD_AREA;
  if (x < A.x0 || y < A.y0 || x + w - 1 > A.x1 || y + h - 1 > A.y1) return { ok: false, reason: 'area' };
  const walk = isWalkableBuilding(type);
  for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) {
    const g = world.ground[cy]?.[cx];
    if (!g || g === 'water') return { ok: false, reason: 'ground' };
    const o = world.objects.get(`${cx},${cy}`);
    if (o && world.objectRules[o]?.blocked) return { ok: false, reason: 'object' };
    if (world.plots.some(p => p.x === cx && p.y === cy)) return { ok: false, reason: 'plot' };
    for (const b of world.buildings) {
      if (b.uid === ignoreUid) continue;
      // 길 위에는 다른 건물을 못 놓고, 길도 건물 위엔 못 놓음
      if (cells(b).some(c => c.x === cx && c.y === cy)) return { ok: false, reason: 'building' };
    }
    if (!walk && world.player && world.player.x === cx && world.player.y === cy) return { ok: false, reason: 'player' };
  }
  return { ok: true };
}

// ---------- 효과 ----------
export function levelOf(buildings, type) {
  return buildings.filter(b => b.type === type).reduce((m, b) => Math.max(m, b.level), 0);
}
export function bagBonus(buildings) { return levelOf(buildings, 'storage') * STORAGE_SLOTS; }
export function saleBonus(buildings) { return Math.max(0, levelOf(buildings, 'townhall') - 1) * TOWNHALL_SALE; }
export function countOf(buildings, type) { return buildings.filter(b => b.type === type).length; }

// ---------- 공사 시작 / 완성 ----------
// 새 건물 놓기. 바로 완성되는 건물(sec 0)은 level 1로, 아니면 공사 시작
export function placeNew(buildings, inv, { uid, type, x, y, rot }, now, mods) {
  const d = def(type);
  if (d.locked) return { ok: false, reason: 'locked' };
  if (d.max && countOf(buildings, type) >= d.max) return { ok: false, reason: 'max' };
  const info = d.levels[1];
  const ms = buildMs(type, 1, mods);
  if (ms > 0 && buildersFree(buildings) <= 0) return { ok: false, reason: 'busy' };
  if (!pay(inv, info.cost)) return { ok: false, reason: 'cost' };
  const b = { uid, type, x, y, rot: rot || 0, level: ms > 0 ? 0 : 1, job: null };
  if (ms > 0) b.job = { toLevel: 1, startAt: now, endAt: now + ms, paid: { ...info.cost } };
  buildings.push(b);
  return { ok: true, building: b, instant: ms === 0 };
}

export function startUpgrade(buildings, inv, b, now, mods) {
  if (b.job) return { ok: false, reason: 'already' };
  const info = nextLevelInfo(b);
  if (!info) return { ok: false, reason: 'maxLevel' };
  const ms = buildMs(b.type, b.level + 1, mods);
  if (ms > 0 && buildersFree(buildings) <= 0) return { ok: false, reason: 'busy' };
  if (!pay(inv, info.cost)) return { ok: false, reason: 'cost' };
  if (ms === 0) { b.level += 1; return { ok: true, instant: true }; }
  b.job = { toLevel: b.level + 1, startAt: now, endAt: now + ms, paid: { ...info.cost } };
  return { ok: true, instant: false };
}

// 공사 취소: 낸 재료를 모두 돌려받음. 처음 짓던 건물이면 없어짐
export function cancelJob(buildings, inv, b) {
  if (!b.job) return { ok: false };
  refund(inv, b.job.paid);
  b.job = null;
  if (b.level === 0) buildings.splice(buildings.indexOf(b), 1);
  return { ok: true, removed: b.level === 0 };
}

// 시간이 다 된 공사를 끝냄. 이번에 끝난 건물 목록을 돌려줌
export function finishDue(buildings, now) {
  const done = [];
  for (const b of buildings) {
    if (b.job && now >= b.job.endAt) {
      b.level = b.job.toLevel;
      b.job = null;
      done.push(b);
    }
  }
  return done;
}

// 치우기 (꾸미기만): 처음 지을 때 낸 비용을 돌려받음
export function removeBuilding(buildings, inv, b) {
  if (!def(b.type).removable || b.job) return { ok: false };
  for (let lv = 1; lv <= b.level; lv++) refund(inv, def(b.type).levels[lv].cost);
  buildings.splice(buildings.indexOf(b), 1);
  return { ok: true };
}
