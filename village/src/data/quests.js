// 일일 의뢰 종류. 숫자를 바꾸면 의뢰 난이도·보상이 바뀌어.
//  weight: 나올 확률 (클수록 자주)
//  min/max: 개수 범위
//  coins(n, item): 보상 코인
export const QUESTS_PER_DAY = 3;
export const QUEST_REROLLS = 1;          // 하루에 "다른 의뢰로 바꾸기" 가능한 횟수
export const QUEST_DAY_START = 6;        // 아침 6시에 새 의뢰가 옴

export const QUEST_TYPES = {
  // 작물 가져다주기 (제철이고 1시간 안에 자라는 작물 중에서)
  deliverCrop: { weight: 4, min: 2, max: 4, coins: (n, sell) => n * sell * 2 + 20 },
  // 나무·돌 가져다주기
  deliverWood: { weight: 2, item: 'wood', min: 4, max: 8, coins: n => n * 12 },
  deliverStone: { weight: 1, item: 'stone', min: 2, max: 4, coins: n => n * 20 },
  // 작물 수확하기 (가져다줄 필요 없음)
  harvest: { weight: 2, min: 3, max: 6, coins: n => n * 15 },
  // 나무·바위에서 재료 모으기
  gather: { weight: 2, min: 4, max: 8, coins: n => n * 10 },
  // 출하함에서 코인 벌기
  sell: { weight: 1, min: 5, max: 12, step: 10, coins: n => Math.round(n * 0.6) },
};
