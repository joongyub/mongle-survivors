// 마을 지도. 한 글자 = 한 칸(타일). 글자를 바꾸면 지도가 바뀌어.
//  .  풀밭        ,  풀밭(작은 꽃)   =  흙길     ~  물     s  모래
//  T  나무        R  바위             F  꽃덤불   S  표지판
// 오른쪽 강 건너(33번째 칸부터)는 나중에 다리를 놓으면 갈 수 있는 지역이야.

export const TILE = 48;   // 한 칸 크기(픽셀)

export const MAP_ROWS = [
  'TTTTTTTTTTTTT.TTT.TT.T.TTTT.s~~~sTTTTTTT', // 0
  'TTTTTTT.TTTT.TT.TT.TTTT.T.TTs~~~sTTT.TTT', // 1
  'TT.T.......................Rs~~~s..,T,.T', // 2
  'TT.....T..T.................s~~~s.TT.TT.', // 3
  '.T.......R.....R............s~~~s....R.T', // 4
  'TT.......T..................s~~~s...TTTT', // 5
  'TT.T...........=............s~~~s.TT....', // 6
  'TT.............=======......s~~~s...T...', // 7
  '.T.............=........T....s~~~s.T,TTT', // 8
  'TT.............=.............s~~~sTTTT,T', // 9
  '.T.............=.........F...s~~~sTTT.T.', // 10
  '.T.............=.............s~~~s.TTTT.', // 11
  'TT.............=...=.........s~~~s..T.T.', // 12
  '....========================Ss~~~s.T.T..', // 13
  '.T....R...T....=.............s~~~sT.....', // 14
  'TT.............=.............s~~~s..TTTT', // 15
  'T....T...T.....=............s~~~s.F....T', // 16
  'TT.............=............s~~~s.T.....', // 17
  '.T.,....F..,..R=............s~~~s..FF..T', // 18
  '.T..........F..=............s~~~s.......', // 19
  'TT.ssssss......=............s~~~s.T..T..', // 20
  'TTss~~~~ssT....=............s~~~s..TT...', // 21
  '.Ts~~~~~~s.....=.......F....s~~~s...TTTT', // 22
  'TTss~~~~ss.....=..R.........s~~~s..T....', // 23
  '.T.ssssss........R.........Ts~~~s.....T.', // 24
  'TT......................,...s~~~s..T...T', // 25
  'TT.TTTT.TT..TTTTTTTT.T..TT..s~~~sTTTTTTT', // 26
  '..TTTT..T.TT..TTTTTTTTTTTTTTs~~~sT.TTTTT', // 27
];

export const LEGEND = {
  '.': { ground: 'grass' },
  ',': { ground: 'grass', object: 'sprout' },
  '=': { ground: 'path' },
  '~': { ground: 'water' },
  's': { ground: 'sand' },
  'T': { ground: 'grass', object: 'tree' },
  'R': { ground: 'grass', object: 'rock' },
  'F': { ground: 'grass', object: 'bush' },
  'S': { ground: 'grass', object: 'sign' },
};

// 땅 종류별 규칙
export const GROUND_RULES = {
  grass: { blocked: false },
  path: { blocked: false, speed: 1.15 },
  sand: { blocked: false },
  water: { blocked: true },
};

// 물건 종류별 규칙
export const OBJECT_RULES = {
  tree: { blocked: true },
  rock: { blocked: true },
  bush: { blocked: true },
  sign: { blocked: true, message: 'village.riverSign' },
  sprout: { blocked: false },
};

// 시작 위치 (마을회관 앞)
export const START_POS = { x: 19, y: 13 };
// 처음 주민이 서 있는 곳
export const RESIDENT_SPOTS = [{ x: 9, y: 10 }, { x: 22, y: 15 }];
