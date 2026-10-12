// 작물 10종. 숫자를 바꾸면 바로 게임에 반영돼.
//  growMin: 씨앗 → 다 자람까지 걸리는 분 (단계 2개로 반씩 나뉨)
//  regrowMin: 수확 후 다시 열매 맺는 분 (없으면 한 번 수확하고 끝)
//  kind: veg(채소) / flower(꽃) / fruit(열매)  → 촌장 보너스에 사용
//  look: 다 자란 모습 그리는 방법 (view/cropArt.js)
export const CROPS = [
  { id: 'carrot', emoji: '🥕', seasons: ['spring', 'autumn'], growMin: 1, seedPrice: 4, sellPrice: 8, kind: 'veg', look: 'root', color: '#f2a05a' },
  { id: 'turnip', emoji: '🥬', seasons: ['spring'], growMin: 10, seedPrice: 8, sellPrice: 15, kind: 'veg', look: 'bulb', color: '#f3eefa' },
  { id: 'strawberry', emoji: '🍓', seasons: ['spring'], growMin: 60, regrowMin: 30, seedPrice: 20, sellPrice: 40, kind: 'fruit', look: 'berry', color: '#f05a6e' },
  { id: 'tulip', emoji: '🌷', seasons: ['spring'], growMin: 20, seedPrice: 10, sellPrice: 20, kind: 'flower', look: 'tulip', color: '#f7a8b8' },
  { id: 'tomato', emoji: '🍅', seasons: ['summer'], growMin: 30, regrowMin: 20, seedPrice: 12, sellPrice: 25, kind: 'fruit', look: 'vine', color: '#ef5b4c' },
  { id: 'corn', emoji: '🌽', seasons: ['summer'], growMin: 120, seedPrice: 30, sellPrice: 60, kind: 'veg', look: 'corn', color: '#f7d24a' },
  { id: 'sunflower', emoji: '🌻', seasons: ['summer'], growMin: 60, seedPrice: 18, sellPrice: 35, kind: 'flower', look: 'sunflower', color: '#f7c948' },
  { id: 'pumpkin', emoji: '🎃', seasons: ['autumn'], growMin: 480, seedPrice: 80, sellPrice: 180, kind: 'veg', look: 'pumpkin', color: '#f39a3d' },
  { id: 'potato', emoji: '🥔', seasons: ['autumn', 'winter'], growMin: 40, seedPrice: 15, sellPrice: 30, kind: 'veg', look: 'bulb', color: '#d2a46a' },
  { id: 'snowpea', emoji: '🫛', seasons: ['winter'], growMin: 180, seedPrice: 45, sellPrice: 90, kind: 'veg', look: 'pea', color: '#9fd88a' },
];

export const CROP_BY_ID = Object.fromEntries(CROPS.map(c => [c.id, c]));
export const seedId = cropId => 'seed_' + cropId;
export const cropOfSeed = itemId => itemId.startsWith('seed_') ? itemId.slice(5) : null;

// 처음 받는 씨앗과 밭
export const START_SEEDS = { seed_carrot: 5, seed_turnip: 2, seed_tulip: 2 };
export const START_PLOTS = [
  { x: 5, y: 9 }, { x: 6, y: 9 }, { x: 7, y: 9 },
  { x: 5, y: 10 }, { x: 6, y: 10 }, { x: 7, y: 10 },
];
