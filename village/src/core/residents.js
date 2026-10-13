// ★ 주민 규칙 (화면 코드 없음, 순수 함수): 호감도, 선물 반응, 하루 일과, 대사 고르기
// 호감도는 절대 깎이지 않아. 며칠 안 와도 "보고 싶었어!"만 해.
import { RESIDENT_BY_ID } from '../data/residents.js';
import { CROP_BY_ID } from '../data/crops.js';
import { FRIEND_TIERS, FRIEND_GAIN, OWN_LINES } from '../data/dialogue.js';

export const FRIEND_MAX = 100;

// 저장된 주민 정보에 빠진 칸 채우기
export function rel(residents, id) {
  const r = residents[id] || (residents[id] = { movedIn: true, movedInAt: null });
  r.friendship ??= 0;
  r.talkedDay ??= null;
  r.giftDay ??= null;
  r.lastTalkAt ??= null;
  return r;
}

// 호감도 단계: 0 처음 봄, 1 아는 사이, 2 친구, 3 단짝, 4 베프
export function tierOf(friendship) {
  let tier = 0;
  FRIEND_TIERS.forEach((need, i) => { if (friendship >= need) tier = i; });
  return tier;
}
export function nextTierNeed(friendship) {
  return FRIEND_TIERS.find(need => need > friendship) ?? null;
}

// 호감도 올리기. 단계가 오르면 새 단계를 돌려줌
export function addFriendship(r, n) {
  const before = tierOf(r.friendship);
  r.friendship = Math.min(FRIEND_MAX, r.friendship + Math.max(0, n));
  const after = tierOf(r.friendship);
  return after > before ? after : null;
}

export function isBirthday(id, t) {
  const d = new Date(t);
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return RESIDENT_BY_ID[id]?.birthday === md;
}

// 'flower' 같은 묶음 이름도 됨 (꽃 작물 전부)
function matches(token, itemId) {
  if (token === itemId) return true;
  const crop = CROP_BY_ID[itemId];
  return !!crop && token === crop.kind;
}

// 선물 반응: love(좋아하는 것) / dislike(싫어하는 것) / normal
export function giftReaction(id, itemId) {
  const p = RESIDENT_BY_ID[id];
  if (!p) return 'normal';
  if (p.likes.some(tk => matches(tk, itemId))) return 'love';
  if (p.dislikes.some(tk => matches(tk, itemId))) return 'dislike';
  return 'normal';
}

// 선물 주기. 하루에 한 번. 생일이면 2배
export function giveGift(residents, id, itemId, day, t) {
  const r = rel(residents, id);
  if (r.giftDay === day) return { ok: false, reason: 'already' };
  const reaction = giftReaction(id, itemId);
  const birthday = isBirthday(id, t);
  const gain = FRIEND_GAIN.gift[reaction] * (birthday ? 2 : 1);
  r.giftDay = day;
  const tierUp = addFriendship(r, gain);
  return { ok: true, reaction, birthday, gain, tierUp };
}

// 대화. 하루 첫 대화면 호감도 +2
export function talk(residents, id, day, t) {
  const r = rel(residents, id);
  const first = r.talkedDay !== day;
  const awayDays = r.lastTalkAt ? (t - r.lastTalkAt) / 864e5 : 0;
  let tierUp = null;
  if (first) { r.talkedDay = day; tierUp = addFriendship(r, FRIEND_GAIN.talk); }
  r.lastTalkAt = t;
  return { first, awayDays, tierUp, gain: first ? FRIEND_GAIN.talk : 0 };
}

// 하루 일과 (현실 시각): 아침엔 자기 자리, 낮엔 마을회관 앞, 저녁엔 친구와 수다, 밤엔 잠
export function activityAt(hour) {
  if (hour >= 23 || hour < 7) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 17) return 'day';
  return 'evening';
}

// 대사 고르기 → i18n 키 (rand: 0~1 랜덤 함수)
export function pickLine({ id, first, awayDays, hour, season, tier, birthday, woke }, rand = Math.random) {
  if (woke) return 'talk.wake';
  if (birthday && first) return 'talk.birthday';
  if (first && awayDays >= 2) return 'talk.missed';
  const pool = [];
  if (first) {
    pool.push('talk.time.' + activityAt(hour), 'talk.season.' + season, 'talk.tier.' + tier);
  } else {
    pool.push('talk.again.0', 'talk.again.1', 'talk.again.2');
  }
  for (let i = 0; i < OWN_LINES; i++) pool.push(`talk.own.${id}.${i}`);
  return pool[Math.floor(rand() * pool.length)];
}
