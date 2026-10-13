// 지금 게임 상태를 들고 있는 곳. 이 모양 그대로 저장돼 (services/SaveService.js).
// 값이 바뀌면 on('change', ...)으로 등록한 화면들에게 알려줘.
import { now } from '../core/clock.js';
import { newPlot } from '../core/farm.js';
import { START_SEEDS, START_PLOTS } from '../data/crops.js';
import { BAG_START_CAPACITY, ITEMS } from '../data/items.js';
import { RESIDENT_BY_ID } from '../data/residents.js';
import { START_BUILDINGS } from '../data/buildings.js';
import { bagBonus, saleBonus } from '../core/build.js';

export const SAVE_VERSION = 3;
// 처음 안내 단계: 0 심기 → 1 물주기 → 2 기다리기 → 3 수확 → 4 팔기
//               → 5 재료 모으기 → 6 창고 짓기 → 7 공사 기다리기
//               → 8 주민과 이야기 → 9 의뢰 보기 → 10 끝
export const TUT_END = 10;
const listeners = {};

// 새 게임의 기본 모양. 저장 파일에 없는 칸은 여기 값으로 채워져.
export function defaultState() {
  return {
    version: SAVE_VERSION,
    playerId: null,
    createdAt: null,
    lastSavedAt: null,           // 마지막 저장 시각 (글자, 예: "2026-10-12T09:40:00.000Z")
    lastClockAt: null,           // 마지막 저장 시각 (숫자, 밀리초)
    mayor: null,                 // { residentId }
    player: null,                // { x, y } 촌장이 서 있던 곳
    village: { name: '', rank: 1, scoreProgress: 0 },
    farm: { plots: [] },
    buildings: [],               // 건물 목록 (core/build.js 참고)
    gather: { day: null, used: {} },   // 오늘 이미 재료를 얻은 나무·바위 ('x,y': true)
    inventory: { coins: 100, capacity: BAG_START_CAPACITY, items: {} },
    residents: {},               // 주민별 { friendship 호감도, talkedDay, giftDay, lastTalkAt } (core/residents.js)
    quests: { day: null, rerolls: 0, list: [] },   // 오늘의 의뢰 (core/quests.js)
    tutorial: { step: 0 },       // 위의 TUT_END 설명 참고
    stats: { harvested: 0, planted: 0, built: 0, gathered: 0, soldCoins: 0, talks: 0, gifts: 0, questsDone: 0, daysPlayed: 1, lastDay: null },
    settings: { muted: false, lang: 'ko' },
  };
}

export const state = defaultState();

export function newGame({ mayorId, villageName, residents }) {
  Object.assign(state, defaultState());
  state.playerId = 'local-' + (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  state.createdAt = now();
  state.mayor = { residentId: mayorId };
  state.village.name = villageName;
  for (const id of residents) state.residents[id] = { movedIn: true, movedInAt: now(), friendship: 0, talkedDay: null, giftDay: null, lastTalkAt: null };
  state.farm.plots = START_PLOTS.map((p, i) => newPlot('p_' + String(i + 1).padStart(3, '0'), p.x, p.y));
  state.inventory.items = { ...START_SEEDS };
  state.buildings = START_BUILDINGS.map(b => ({ ...b }));
  applyEffects();
  emit('change');
}

// 불러온 저장 데이터를 지금 상태로 (빠진 칸은 기본값으로 채움)
export function loadState(data) {
  const base = defaultState();
  for (const key of Object.keys(base)) {
    const v = data[key];
    if (v === undefined || v === null) state[key] = base[key];
    else if (typeof base[key] === 'object' && base[key] && !Array.isArray(base[key])) state[key] = { ...base[key], ...v };
    else state[key] = v;
  }
  applyEffects();
  emit('change');
}

// 건물 효과를 상태에 반영 (창고 → 가방 칸 수)
export function applyEffects() {
  state.inventory.capacity = BAG_START_CAPACITY + bagBonus(state.buildings);
}

// 건설 보너스 (도도가 촌장이면 10% 빨리)
export function buildMods() {
  return { faster: state.mayor?.residentId === 'dodo' ? 0.1 : 0 };
}

// 작물 파는 값 (마을회관 레벨 보너스 포함)
export function salePrice(itemId) {
  const base = ITEMS[itemId]?.sellPrice ?? 0;
  const bonus = ITEMS[itemId]?.type === 'crop' ? saleBonus(state.buildings) : 0;
  return Math.round(base * (1 + bonus));
}

// 촌장 보너스 (예: 모모 → 채소가 10% 빨리 자람)
export function farmMods() {
  const r = state.mayor && RESIDENT_BY_ID[state.mayor.residentId];
  return { fasterKind: r?.farmBonus ?? null };
}

export function on(evt, fn) { (listeners[evt] ||= []).push(fn); }
export function emit(evt, data) { (listeners[evt] || []).forEach(fn => fn(data)); }
