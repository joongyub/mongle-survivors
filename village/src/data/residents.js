// 주민 10명 정보. 이름·말버릇·선물 취향은 여기서 고치면 돼.
//  likes / dislikes: 아이템 아이디 또는 묶음 이름('flower' = 꽃 작물 전부, 'veg' = 채소)
//  birthday: 'MM-DD' (그날 선물하면 호감도 2배)
//  spot: 아침에 있는 자기 자리이자 밤에 자는 곳 (집이 생기면 7단계에서 집으로)
//  일본어 이름·말버릇은 data/i18n/ja.js의 'res.<아이디>.*'에 있어
export const RESIDENTS = [
  { id: 'momo', name: '모모 퍼프', short: '모모', animal: '토끼', color: '#f7a8b8', trait: '밝고 부지런함', job: '채소 농사', bonus: '채소가 10% 빨리 자라요', farmBonus: 'veg', likes: ['carrot', 'strawberry'], dislikes: ['fish'], birthday: '04-03', catchphrase: '~퐁!', spot: { x: 6, y: 12 } },
  { id: 'nari', name: '나리 팝', short: '나리', animal: '병아리', color: '#f7c948', trait: '수다쟁이', job: '꽃 가꾸기', bonus: '꽃이 10% 빨리 자라요', farmBonus: 'flower', likes: ['tulip', 'seed_sunflower'], dislikes: ['stone'], birthday: '03-21', catchphrase: '삐약, 있잖아~', spot: { x: 10, y: 19 } },
  { id: 'bori', name: '보리 빈', short: '보리', animal: '다람쥐', color: '#c98a54', trait: '알뜰함', job: '과일나무·잡화점', bonus: '상점 판매가 10% 올라요', likes: ['acorn', 'apple', 'strawberry'], dislikes: ['honey'], birthday: '10-15', catchphrase: '아껴야 잘 살지!', spot: { x: 24, y: 17 } },
  { id: 'mintu', name: '민투', short: '민투', animal: '고양이', color: '#8fd19e', trait: '호기심 많음', job: '곤충 채집·탐험', bonus: '희귀 곤충이 더 자주 나와요', likes: ['butterfly', 'mint'], dislikes: ['wool'], birthday: '06-09', catchphrase: '냐? 저건 뭐지?', spot: { x: 4, y: 4 } },
  { id: 'toki', name: '토키 드롭', short: '토키', animal: '여우', color: '#f2a05a', trait: '느긋함', job: '낚시', bonus: '물고기가 더 잘 물어요', likes: ['sweetfish', 'tea'], dislikes: ['toy_drum'], birthday: '08-27', catchphrase: '천천히 가자~', spot: { x: 11, y: 22 } },
  { id: 'pudding', name: '푸딩 부', short: '푸딩', animal: '곰', color: '#e9b86a', trait: '먹보', job: '요리·빵집', bonus: '요리 재료가 덜 들어요', likes: ['honey_bread', 'pumpkin'], dislikes: ['weed'], birthday: '12-05', catchphrase: '배고프다곰…', spot: { x: 17, y: 15 } },
  { id: 'lala', name: '라라 페블', short: '라라', animal: '수달', color: '#a7c7e7', trait: '꼼꼼함', job: '조개·광물·박물관', bonus: '광물을 더 많이 캐요', likes: ['pearl', 'amethyst'], dislikes: ['weed'], birthday: '02-14', catchphrase: '정리정돈 완료!', spot: { x: 5, y: 19 } },
  { id: 'hani', name: '하니 비비', short: '하니', animal: '꿀벌', color: '#fcd667', trait: '성실함', job: '양봉·꽃 교배', bonus: '꿀이 10% 더 모여요', likes: ['flower', 'honey'], dislikes: ['smoke'], birthday: '05-20', catchphrase: '윙윙, 열심히!', spot: { x: 24, y: 11 } },
  { id: 'dodo', name: '도도 새싹', short: '도도', animal: '공룡', color: '#a6d08a', trait: '힘이 셈', job: '건축·개간', bonus: '건설이 10% 빨라요', likes: ['stone', 'wood'], dislikes: ['flower'], birthday: '07-07', catchphrase: '도도가 들어줄게!', spot: { x: 11, y: 4 } },
  { id: 'coco', name: '코코 누비', short: '코코', animal: '양', color: '#9cc6f2', trait: '몽상가', job: '양털 공방·제작', bonus: '제작 시간이 10% 줄어요', likes: ['wool', 'cloud_cotton'], dislikes: ['raincoat'], birthday: '11-22', catchphrase: '음… 꿈에서 봤어', spot: { x: 12, y: 6 } },
];

export const RESIDENT_BY_ID = Object.fromEntries(RESIDENTS.map(r => [r.id, r]));

// 처음 함께 시작하는 주민. 촌장이 이 중 한 명이면 보리가 대신 와.
export const START_RESIDENTS = ['momo', 'dodo'];
export const START_SUBSTITUTE = 'bori';
// 마을 등급이 오를 때 이사 오는 순서 (7단계)
export const MOVE_IN_ORDER = ['nari', 'bori', 'pudding', 'coco', 'hani', 'toki', 'mintu', 'lala'];

export function startingResidents(mayorId) {
  const list = START_RESIDENTS.filter(id => id !== mayorId);
  while (list.length < 2) list.push(START_SUBSTITUTE);
  return list;
}
