// ★ 일일 의뢰 규칙 (화면 코드 없음, 순수 함수)
// 같은 날·같은 마을이면 항상 같은 의뢰가 나오게 날짜로 랜덤을 정해 (새로고침해도 안 바뀜).
// 의뢰 하나 = { uid, type, who, item, n, base, coins, claimed }
//   base: 의뢰를 받은 순간의 기록 (수확 수 등). 지금 기록 - base = 진행도
import { QUEST_TYPES, QUESTS_PER_DAY, QUEST_REROLLS, QUEST_DAY_START } from '../data/quests.js';
import { CROPS, CROP_BY_ID } from '../data/crops.js';
import { ITEMS } from '../data/items.js';
import { count, remove } from './inventory.js';
import { dayKey } from './clock.js';

// 의뢰 날짜: 아침 6시에 바뀜
export function questDay(t) { return dayKey(t - QUEST_DAY_START * 3600e3); }

// 다음 의뢰가 오는 시각 (다음 아침 6시)
export function nextQuestAt(t) {
  const d = new Date(t);
  d.setHours(QUEST_DAY_START, 0, 0, 0);
  if (d.getTime() <= t) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// 글자 → 랜덤 함수 (같은 글자면 같은 순서)
export function seededRandom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6D2B79F5;
    let x = Math.imul(h ^ (h >>> 15), 1 | h);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
const between = (a, b, rand) => a + Math.floor(rand() * (b - a + 1));

// 지금 기록 (진행도 계산용)
function statOf(type, stats) {
  if (type === 'harvest') return stats.harvested || 0;
  if (type === 'gather') return stats.gathered || 0;
  if (type === 'sell') return stats.soldCoins || 0;
  return 0;
}

// 의뢰 하나 만들기
// ctx = { residents: [아이디...], season, stats, avoid: [이미 쓴 종류] }
export function makeQuest(rand, ctx, uid) {
  const types = Object.entries(QUEST_TYPES).filter(([k]) => !(ctx.avoid || []).includes(k));
  const total = types.reduce((s, [, q]) => s + q.weight, 0);
  let r = rand() * total, type = types[0][0];
  for (const [k, q] of types) { if ((r -= q.weight) < 0) { type = k; break; } }
  const T = QUEST_TYPES[type];
  const q = { uid, type, who: pick(ctx.residents, rand), item: T.item || null, n: between(T.min, T.max, rand), base: 0, coins: 0, claimed: false };
  if (type === 'deliverCrop') {
    const easy = CROPS.filter(c => c.seasons.includes(ctx.season) && c.growMin <= 60);
    const crop = pick(easy.length ? easy : CROPS.filter(c => c.growMin <= 60), rand);
    q.item = crop.id;
    q.coins = T.coins(q.n, crop.sellPrice);
  } else if (type === 'sell') {
    q.n *= T.step;
    q.coins = T.coins(q.n);
  } else {
    q.coins = T.coins(q.n, ITEMS[q.item]?.sellPrice);
  }
  q.base = statOf(type, ctx.stats);
  return q;
}

// 오늘의 의뢰 3개 (주민이 여럿이면 되도록 다른 주민이 부탁)
export function makeDailyQuests(seed, ctx) {
  const rand = seededRandom(seed);
  const list = [], used = [];
  for (let i = 0; i < QUESTS_PER_DAY; i++) {
    const others = ctx.residents.filter(id => !list.some(q => q.who === id));
    const q = makeQuest(rand, { ...ctx, avoid: used, residents: others.length ? others : ctx.residents }, `q${i + 1}`);
    used.push(q.type);
    list.push(q);
  }
  return list;
}

// 날이 바뀌었으면 새 의뢰로. 바뀌었으면 true
export function refreshQuests(quests, { playerId, t, residents, season, stats }) {
  const day = questDay(t);
  if (quests.day === day) return false;
  quests.day = day;
  quests.rerolls = 0;
  quests.list = makeDailyQuests(`${playerId}|${day}`, { residents, season, stats });
  return true;
}

export function progress(q, inv, stats) {
  if (q.type.startsWith('deliver')) return Math.min(q.n, count(inv, q.item));
  return Math.min(q.n, Math.max(0, statOf(q.type, stats) - q.base));
}
export const isReady = (q, inv, stats) => !q.claimed && progress(q, inv, stats) >= q.n;

// 완료: 가져다주는 의뢰는 아이템을 건넴. 코인을 받음
export function claim(q, inv, stats) {
  if (!isReady(q, inv, stats)) return { ok: false };
  if (q.type.startsWith('deliver') && !remove(inv, q.item, q.n)) return { ok: false };
  q.claimed = true;
  inv.coins += q.coins;
  return { ok: true, coins: q.coins };
}

// 다른 의뢰로 바꾸기 (하루 1번, 아직 안 끝낸 의뢰만)
export function reroll(quests, q, { residents, season, stats }) {
  if (q.claimed || quests.rerolls >= QUEST_REROLLS) return { ok: false };
  const rand = seededRandom(`${quests.day}|${q.uid}|${quests.rerolls}|reroll`);
  const avoid = quests.list.filter(x => x !== q && !x.claimed).map(x => x.type).concat(q.type);
  const nq = makeQuest(rand, { residents, season, stats, avoid }, q.uid + 'r');
  quests.list[quests.list.indexOf(q)] = nq;
  quests.rerolls += 1;
  return { ok: true, quest: nq };
}

export const cropOf = q => CROP_BY_ID[q.item];
