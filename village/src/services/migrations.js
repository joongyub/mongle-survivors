// 옛 저장 파일 → 새 구조로 바꾸기.
// 저장 구조를 바꿀 때마다 SAVE_VERSION을 1 올리고 아래에 변환 함수를 하나 추가해.
// 예) 2: data => { data.pets = []; return data; }
import { SAVE_VERSION } from '../state/GameState.js';
import { START_BUILDINGS } from '../data/buildings.js';

const STEPS = {
  // 5단계: 건물 목록과 재료 채집 기록이 생김. 마을회관·출하함은 원래 자리 그대로
  2: data => {
    data.buildings = data.buildings || START_BUILDINGS.map(b => ({ ...b }));
    data.gather = data.gather || { day: null, used: {} };
    return data;
  },
  // 6단계: 주민 대화·선물 기록, 일일 의뢰가 생김
  3: data => {
    for (const r of Object.values(data.residents || {})) {
      r.friendship ??= 0; r.talkedDay ??= null; r.giftDay ??= null; r.lastTalkAt ??= null;
    }
    data.quests = data.quests || { day: null, rerolls: 0, list: [] };
    data.stats = { soldCoins: 0, talks: 0, gifts: 0, questsDone: 0, ...(data.stats || {}) };
    return data;
  },
};

export function migrate(data) {
  let v = Number(data.version) || 1;
  if (v > SAVE_VERSION) throw new Error('newer');   // 더 새 버전 게임에서 만든 파일
  while (v < SAVE_VERSION) {
    v += 1;
    if (STEPS[v]) data = STEPS[v](data);
    data.version = v;
  }
  return data;
}
