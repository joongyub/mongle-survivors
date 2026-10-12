// 건물 정보. 숫자(비용, 시간, 효과)를 바꾸면 바로 게임에 반영돼.
//  w, h        차지하는 칸 수 (가로, 세로)
//  rank        몇 등급에서 지을 수 있는지 (0 = 처음부터 있음, 7단계에서 등급이 오르면 열림)
//  max         한 마을에 지을 수 있는 개수 (없으면 제한 없음)
//  levels[n]   n레벨로 만들 때 드는 비용과 시간 (levels[1] = 처음 짓기)
//              cost: { wood, stone, coins }, sec: 걸리는 초 (0이면 바로 완성, 일꾼도 안 씀)
//  walkable    위로 걸어 다닐 수 있음 (길)
//  turn        'flip' = 좌우 뒤집기, 'swap' = 가로·세로 돌리기, 없으면 돌릴 수 없음
//  action      누르면 바로 여는 창 (shop 씨앗 가게, ship 출하함)
//  removable   치울 수 있음 (재료를 돌려받음)
export const BUILDINGS = {
  townhall: {
    emoji: '🏛️', w: 3, h: 3, rank: 0, max: 1, action: 'shop',
    levels: [null,
      { cost: {}, sec: 0 },
      { cost: { wood: 20, stone: 10, coins: 200 }, sec: 5 * 60 },
      { cost: { wood: 40, stone: 20, coins: 500 }, sec: 30 * 60 },
      { cost: { wood: 70, stone: 35, coins: 1000 }, sec: 2 * 3600 },
      { cost: { wood: 120, stone: 60, coins: 2000 }, sec: 6 * 3600 },
    ],
  },
  shipbox: {
    emoji: '📦', w: 1, h: 1, rank: 0, max: 1, action: 'ship',
    levels: [null, { cost: {}, sec: 0 }],
  },
  storage: {
    emoji: '🏠', w: 2, h: 2, rank: 1, max: 1, turn: 'flip',
    levels: [null,
      { cost: { wood: 5, stone: 2 }, sec: 30 },
      { cost: { wood: 12, stone: 5, coins: 100 }, sec: 3 * 60 },
      { cost: { wood: 25, stone: 10, coins: 300 }, sec: 20 * 60 },
      { cost: { wood: 45, stone: 20, coins: 700 }, sec: 3600 },
      { cost: { wood: 80, stone: 35, coins: 1500 }, sec: 3 * 3600 },
    ],
  },
  fence: {
    emoji: '🪵', w: 1, h: 1, rank: 1, max: 80, removable: true,
    levels: [null, { cost: { wood: 1 }, sec: 0 }],
  },
  stonepath: {
    emoji: '🪨', w: 1, h: 1, rank: 1, max: 120, walkable: true, removable: true,
    levels: [null,
      { cost: { stone: 1 }, sec: 0 },
      { cost: { stone: 1, coins: 5 }, sec: 0 },
      { cost: { coins: 15 }, sec: 0 },
    ],
  },
  flowerbed: {
    emoji: '🌼', w: 2, h: 1, rank: 1, max: 20, turn: 'swap', removable: true,
    levels: [null, { cost: { wood: 2, coins: 20 }, sec: 0 }],
  },
  // ---- 아직 잠겨 있는 건물 (등급이 오르면 열림, 미리보기만) ----
  plaza: { emoji: '⛲', w: 3, h: 3, rank: 2, locked: true, levels: [null] },
  shop: { emoji: '🏪', w: 2, h: 2, rank: 3, locked: true, levels: [null] },
  bakery: { emoji: '🥐', w: 2, h: 2, rank: 4, locked: true, levels: [null] },
  fountain: { emoji: '💧', w: 2, h: 2, rank: 4, locked: true, levels: [null] },
  workshop: { emoji: '🧶', w: 2, h: 2, rank: 5, locked: true, levels: [null] },
};

// 건설 메뉴에 나오는 순서
export const BUILD_MENU = ['storage', 'fence', 'stonepath', 'flowerbed', 'plaza', 'shop', 'bakery', 'fountain', 'workshop'];

export const MAX_BUILDERS = 2;          // 동시에 공사할 수 있는 수 (일꾼)
export const STORAGE_SLOTS = 10;        // 창고 1레벨마다 늘어나는 가방 칸
export const TOWNHALL_SALE = 0.05;      // 마을회관 2레벨부터 레벨마다 작물 판매가 +5%

// 건물을 지을 수 있는 땅 범위 (강 건너는 다리가 생기면 열림)
export const BUILD_AREA = { x0: 1, y0: 2, x1: 27, y1: 25 };

// 처음부터 있는 건물. x, y = 왼쪽 위 칸
export const START_BUILDINGS = [
  { uid: 'b_townhall', type: 'townhall', x: 18, y: 9, rot: 0, level: 1, job: null },
  { uid: 'b_shipbox', type: 'shipbox', x: 21, y: 11, rot: 0, level: 1, job: null },
];

// 나무·바위에서 얻는 재료 (하루에 한 번씩, 다음 날 다시 생김)
export const GATHER = {
  tree: { item: 'wood', min: 1, max: 2, chanceMore: 0.3 },
  rock: { item: 'stone', min: 1, max: 2, chanceMore: 0.45 },
};
