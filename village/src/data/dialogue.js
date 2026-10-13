// 주민 교류 숫자. 글자(대사)는 data/i18n/ko.js, ja.js의 'talk.*' 키에 있어.
// 호감도 단계가 시작되는 값: 처음 봄 0, 아는 사이 20, 친구 40, 단짝 70, 베프 100
export const FRIEND_TIERS = [0, 20, 40, 70, 100];

// 호감도 오르는 양
export const FRIEND_GAIN = {
  talk: 2,                                     // 하루 첫 대화
  gift: { love: 8, normal: 3, dislike: 0 },    // 선물 (싫어하는 것도 깎이지 않음), 생일엔 2배
  quest: 5,                                    // 그 주민의 의뢰 완료
};

// 주민마다 있는 자기만의 대사 수 (talk.own.<아이디>.0 ~ 2)
export const OWN_LINES = 3;

// 단계가 오르면 주민이 주는 선물 (8단계에서 전용 가구·옷으로 바뀔 예정)
export const TIER_REWARDS = [null, { coins: 30 }, { coins: 100 }, { coins: 300 }, { coins: 800 }];
