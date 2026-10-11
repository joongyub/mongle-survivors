// data.js — 밸런스/콘텐츠 데이터. 숫자만 바꿔도 게임이 바뀌도록 모아 두었습니다.
(function () {
  const G = (window.G = window.G || {});

  // ---------- 주인공 10명 ----------
  // bonus 키: might, area, cd(음수=감소), speed, maxHp, armor, regen, crit, luck, magnet, growth, amount, pspeed, dur
  G.CHARS = [
    { id: 'momo', name: '모모 퍼프', en: 'Momo Puff', animal: '토끼', weapon: 'hammer', color: '#f7a8b8',
      bonus: { speed: 0.1 }, bonusText: '이동 속도 +10%', story: '복숭아를 사랑하는 폭신폭신 토끼. 뿅망치 한 방이면 다들 날아가요!' },
    { id: 'nari', name: '나리 팝', en: 'Nari Pop', animal: '병아리', weapon: 'tulip', color: '#f7c948',
      bonus: { growth: 0.15 }, bonusText: '경험치 획득 +15%', story: '튤립을 머리에 얹은 병아리. 무럭무럭 빨리 자라요.' },
    { id: 'bori', name: '보리 빈', en: 'Bori Bean', animal: '다람쥐', weapon: 'acorn', color: '#c98a54',
      bonus: { might: 0.08, pspeed: 0.2 }, bonusText: '공격력 +8%, 투사체 속도 +20%', story: '도토리 모자의 명사수 다람쥐. 도토리는 절대 빗나가지 않아요.' },
    { id: 'mintu', name: '민투', en: 'Mintu', animal: '고양이', weapon: 'net', color: '#8fd19e',
      bonus: { luck: 0.2, crit: 0.03 }, bonusText: '행운 +20%, 치명타 +3%', story: '잎사귀 리본의 크림 고양이. 잠자리채로 몽땅 쓸어 담아요.' },
    { id: 'toki', name: '토키 드롭', en: 'Toki Drop', animal: '여우', weapon: 'rod', color: '#f2a05a',
      bonus: { crit: 0.08 }, bonusText: '치명타 확률 +8%', story: '별꽃을 단 장난꾸러기 여우. 낚싯대 채찍이 번개처럼 빨라요.' },
    { id: 'pudding', name: '푸딩 부', en: 'Pudding Boo', animal: '곰', weapon: 'spoon', color: '#e9b86a',
      bonus: { maxHp: 30, armor: 1 }, bonusText: '최대 체력 +30, 방어 +1', story: '푸딩 모자를 쓴 든든한 곰. 대왕 숟가락으로 빙글빙글!' },
    { id: 'lala', name: '라라 페블', en: 'Lala Pebble', animal: '수달', weapon: 'shell', color: '#a7c7e7',
      bonus: { magnet: 0.4, dur: 0.1 }, bonusText: '자석 범위 +40%, 지속시간 +10%', story: '조개 목걸이의 수달. 조개 부메랑을 슝- 던졌다 받아요.' },
    { id: 'hani', name: '하니 비비', en: 'Hani Bibi', animal: '꿀벌', weapon: 'honey', color: '#fcd667',
      bonus: { cd: -0.08 }, bonusText: '쿨타임 -8%', story: '하얀 꽃을 단 꿀벌. 끈적한 꿀단지로 적을 꼼짝 못 하게 해요.' },
    { id: 'dodo', name: '도도 새싹', en: 'Dodo Sprout', animal: '공룡', weapon: 'shovel', color: '#a6d08a',
      bonus: { maxHp: 20, regen: 0.4 }, bonusText: '최대 체력 +20, 초당 회복 +0.4', story: '머리에 새싹이 난 아기 공룡. 꽃삽으로 땅을 쿵! 내리쳐요.' },
    { id: 'coco', name: '코코 누비', en: 'Coco Nubi', animal: '양', weapon: 'star', color: '#9cc6f2',
      bonus: { area: 0.12 }, bonusText: '공격 범위 +12%', story: '별 리본의 구름 양. 별 지팡이로 하늘에서 별을 떨어뜨려요.' },
  ];

  // ---------- 무기 ----------
  // ups[i] = [설명, 변화량]  (dmg/amount/pierce/knock: 더하기, area/speed/dur: 더하기(배수), cdm: 쿨타임 배수 증감)
  G.WEAPONS = {
    hammer: { name: '복숭아 뿅망치', icon: 'hammer', kind: 'arc', desc: '가까운 적 쪽으로 크게 휘둘러 날려버려요.',
      base: { dmg: 24, cd: 1.05, area: 1, amount: 1, knock: 16, reach: 40, arcW: 3.0, swing: 0.2 },
      ups: [['공격력 +10', { dmg: 10 }], ['범위 +20%', { area: 0.2 }], ['뒤쪽도 한 번 더 휘둘러요', { amount: 1 }], ['공격력 +12, 쿨타임 -10%', { dmg: 12, cdm: -0.1 }], ['범위 +25%', { area: 0.25 }], ['공격력 +25', { dmg: 25 }]],
      evo: { need: 'apple', into: 'hammerX' } },
    net: { name: '잠자리채', icon: 'net', kind: 'arc', desc: '주변을 한 바퀴 휙 쓸어버려요.',
      base: { dmg: 13, cd: 1.6, area: 1, amount: 1, knock: 8, reach: 40, arcW: Math.PI * 2, swing: 0.38 },
      ups: [['공격력 +6', { dmg: 6 }], ['범위 +15%', { area: 0.15 }], ['한 바퀴 더 휘둘러요', { amount: 1 }], ['공격력 +8', { dmg: 8 }], ['쿨타임 -15%', { cdm: -0.15 }], ['공격력 +12, 범위 +15%', { dmg: 12, area: 0.15 }]],
      evo: { need: 'pot', into: 'netX' } },
    rod: { name: '낚싯대 채찍', icon: 'rod', kind: 'whip', desc: '양옆으로 낚싯줄을 길게 휘둘러요.',
      base: { dmg: 16, cd: 1.2, area: 1, amount: 2, knock: 6, reach: 78, width: 18 },
      ups: [['공격력 +6', { dmg: 6 }], ['공격력 +8', { dmg: 8 }], ['범위 +15%', { area: 0.15 }], ['공격력 +10', { dmg: 10 }], ['쿨타임 -12%', { cdm: -0.12 }], ['한 번 더 휘둘러요, 공격력 +10', { dmg: 10, amount: 1 }]],
      evo: { need: 'clover', into: 'rodX' } },
    shell: { name: '조개 부메랑', icon: 'shell', kind: 'boomerang', desc: '가까운 적에게 던지면 슝 돌아와요. 모두 관통!',
      base: { dmg: 12, cd: 1.5, area: 1, amount: 1, knock: 4, speed: 1, range: 95, dur: 1 },
      ups: [['개수 +1', { amount: 1 }], ['공격력 +6', { dmg: 6 }], ['범위·속도 +15%', { area: 0.15, speed: 0.15 }], ['개수 +1', { amount: 1 }], ['공격력 +8', { dmg: 8 }], ['쿨타임 -15%', { cdm: -0.15 }]],
      evo: { need: 'cherry', into: 'shellX' } },
    acorn: { name: '도토리 새총', icon: 'acorn', kind: 'shot', desc: '가장 가까운 적에게 도토리를 연사해요.',
      base: { dmg: 9, cd: 0.75, area: 1, amount: 1, knock: 3, speed: 1, pierce: 1 },
      ups: [['개수 +1', { amount: 1 }], ['공격력 +4', { dmg: 4 }], ['관통 +1', { pierce: 1 }], ['개수 +1', { amount: 1 }], ['쿨타임 -15%', { cdm: -0.15 }], ['공격력 +6, 관통 +1', { dmg: 6, pierce: 1 }]],
      evo: { need: 'clock', into: 'acornX' } },
    shovel: { name: '새싹 꽃삽', icon: 'shovel', kind: 'ring', desc: '땅을 쿵! 내리쳐 퍼지는 충격파를 만들어요.',
      base: { dmg: 20, cd: 2.2, area: 1, amount: 1, knock: 18, reach: 62 },
      ups: [['공격력 +10', { dmg: 10 }], ['범위 +20%', { area: 0.2 }], ['충격파 +1회', { amount: 1 }], ['공격력 +12', { dmg: 12 }], ['쿨타임 -15%', { cdm: -0.15 }], ['공격력 +20, 범위 +15%', { dmg: 20, area: 0.15 }]],
      evo: { need: 'clam', into: 'shovelX' } },
    honey: { name: '꿀단지', icon: 'honey', kind: 'zone', desc: '꿀단지를 던져 끈적한 웅덩이를 만들어요. (둔화)',
      base: { dmg: 6, cd: 2.8, area: 1, amount: 1, knock: 0, reach: 22, dur: 1, life: 3, tick: 0.35, slow: 0.45 },
      ups: [['개수 +1', { amount: 1 }], ['공격력 +3', { dmg: 3 }], ['범위 +20%', { area: 0.2 }], ['지속시간 +30%', { dur: 0.3 }], ['개수 +1', { amount: 1 }], ['공격력 +5', { dmg: 5 }]],
      evo: { need: 'conch', into: 'honeyX' } },
    star: { name: '별님 지팡이', icon: 'star', kind: 'starfall', desc: '화면 속 적에게 별을 떨어뜨려 펑! 터뜨려요.',
      base: { dmg: 26, cd: 1.9, area: 1, amount: 1, knock: 6, reach: 20 },
      ups: [['개수 +1', { amount: 1 }], ['공격력 +10', { dmg: 10 }], ['범위 +20%', { area: 0.2 }], ['개수 +1', { amount: 1 }], ['쿨타임 -15%', { cdm: -0.15 }], ['공격력 +16, 개수 +1', { dmg: 16, amount: 1 }]],
      evo: { need: 'candy', into: 'starX' } },
    tulip: { name: '튤립 빙글빙글', icon: 'tulip', kind: 'orbit', desc: '튤립이 주위를 빙글빙글 돌며 지켜줘요.',
      base: { dmg: 10, cd: 3.4, area: 1, amount: 2, knock: 6, speed: 1, reach: 36, dur: 1, life: 3 },
      ups: [['개수 +1', { amount: 1 }], ['공격력 +5', { dmg: 5 }], ['범위·속도 +20%', { area: 0.2, speed: 0.2 }], ['개수 +1', { amount: 1 }], ['지속시간 +40%', { dur: 0.4 }], ['공격력 +8, 개수 +1', { dmg: 8, amount: 1 }]],
      evo: { need: 'feather', into: 'tulipX' } },
    spoon: { name: '대왕 숟가락', icon: 'spoon', kind: 'spin', desc: '숟가락을 들고 빙글빙글 회전 공격! 여러 번 때려요.',
      base: { dmg: 11, cd: 2.4, area: 1, amount: 2, knock: 10, reach: 32, swing: 0.36 },
      ups: [['공격력 +5', { dmg: 5 }], ['범위 +20%', { area: 0.2 }], ['회전 +1바퀴', { amount: 1 }], ['공격력 +7', { dmg: 7 }], ['쿨타임 -15%', { cdm: -0.15 }], ['공격력 +10, 회전 +1바퀴', { dmg: 10, amount: 1 }]],
      evo: { need: 'cookie', into: 'spoonX' } },

    // ----- 진화 무기 (최대 레벨 무기 + 짝 패시브 → 보물상자에서 진화) -----
    hammerX: { name: '대왕 복숭아 망치', icon: 'hammer', kind: 'arc', evolved: true, desc: '휘두를 때마다 복숭아 충격파가 터져요!',
      base: { dmg: 165, cd: 0.85, area: 1.75, amount: 2, knock: 26, reach: 34, arcW: 2.8, swing: 0.2, shock: 1 }, ups: [] },
    netX: { name: '은하수 그물', icon: 'net', kind: 'arc', evolved: true, desc: '은하수처럼 넓게 두 바퀴! 맞은 적은 느려져요.',
      base: { dmg: 72, cd: 1.0, area: 1.7, amount: 2, knock: 10, reach: 40, arcW: Math.PI * 2, swing: 0.34, slow: 0.5 }, ups: [] },
    rodX: { name: '황금 전설 낚싯대', icon: 'rod', kind: 'whip', evolved: true, desc: '양쪽으로 휘두르며 언제나 치명타!',
      base: { dmg: 93, cd: 0.8, area: 1.45, amount: 2, knock: 8, reach: 78, width: 20, alwaysCrit: 1 }, ups: [] },
    shellX: { name: '진주 소용돌이', icon: 'shell', kind: 'boomerang', evolved: true, desc: '진주 조개가 사방으로 날아갔다 돌아와요.',
      base: { dmg: 60, cd: 1.0, area: 1.4, amount: 6, knock: 6, speed: 1.3, range: 120, dur: 1, radial: 1 }, ups: [] },
    acornX: { name: '도토리 개틀링', icon: 'acorn', kind: 'shot', evolved: true, desc: '도토리를 엄청난 속도로 퍼부어요!',
      base: { dmg: 33, cd: 0.16, area: 1.3, amount: 2, knock: 3, speed: 1.4, pierce: 3 }, ups: [] },
    shovelX: { name: '대지의 꽃삽', icon: 'shovel', kind: 'ring', evolved: true, desc: '연속 지진! 충격파 자리에 꽃이 피고 체력을 회복해요.',
      base: { dmg: 105, cd: 1.6, area: 1.6, amount: 3, knock: 22, reach: 62, heal: 1 }, ups: [] },
    honeyX: { name: '황금 꿀비', icon: 'honey', kind: 'zone', evolved: true, desc: '주변에 황금 꿀비가 쏟아지고 적을 끌어당겨요.',
      base: { dmg: 27, cd: 1.6, area: 1.35, amount: 3, knock: 0, reach: 22, dur: 1.2, life: 3, tick: 0.25, slow: 0.65, pull: 1 }, ups: [] },
    starX: { name: '유성우', icon: 'star', kind: 'starfall', evolved: true, desc: '하늘에서 유성이 쏟아져요!',
      base: { dmg: 105, cd: 0.9, area: 1.7, amount: 6, knock: 8, reach: 20 }, ups: [] },
    tulipX: { name: '꽃바람 폭풍', icon: 'tulip', kind: 'orbit', evolved: true, desc: '쉬지 않고 도는 꽃바람 폭풍!',
      base: { dmg: 51, cd: 0.01, area: 1.6, amount: 6, knock: 8, speed: 1.6, reach: 36, dur: 1, life: 999, permanent: 1 }, ups: [] },
    spoonX: { name: '푸딩 토네이도', icon: 'spoon', kind: 'spin', evolved: true, desc: '달콤한 토네이도! 때릴 때마다 체력을 조금 회복해요.',
      base: { dmg: 54, cd: 1.3, area: 1.6, amount: 5, knock: 12, reach: 32, swing: 0.3, lifesteal: 1 }, ups: [] },
  };

  // ---------- 패시브 아이템 ----------
  G.PASSIVES = {
    apple: { name: '힘의 사과', icon: 'apple', max: 5, desc: '공격력 +10%', apply: (P, l) => { P.might += 0.1 * l; } },
    clam: { name: '단단한 조개', icon: 'clam', max: 5, desc: '받는 피해 -1, 최대 체력 +5', apply: (P, l) => { P.armor += l; P.maxHp += 5 * l; } },
    feather: { name: '바람 깃털', icon: 'feather', max: 5, desc: '이동 속도 +8%, 투사체 속도 +6%', apply: (P, l) => { P.speed += 0.08 * l; P.pspeed += 0.06 * l; } },
    clock: { name: '종소리 시계', icon: 'clock', max: 5, desc: '쿨타임 -7%', apply: (P, l) => { P.cd -= 0.07 * l; } },
    pot: { name: '꽃 화분', icon: 'pot', max: 5, desc: '공격 범위 +10%', apply: (P, l) => { P.area += 0.1 * l; } },
    clover: { name: '네잎클로버', icon: 'clover', max: 5, desc: '치명타 +4%, 행운 +10%', apply: (P, l) => { P.crit += 0.04 * l; P.luck += 0.1 * l; } },
    conch: { name: '자석 소라', icon: 'conch', max: 5, desc: '아이템 끌어당기는 범위 +30%', apply: (P, l) => { P.magnet += 0.3 * l; } },
    cherry: { name: '쌍둥이 체리', icon: 'cherry', max: 2, desc: '투사체/공격 횟수 +1', apply: (P, l) => { P.amount += l; } },
    cookie: { name: '하트 쿠키', icon: 'cookie', max: 5, desc: '최대 체력 +20, 초당 회복 +0.2', apply: (P, l) => { P.maxHp += 20 * l; P.regen += 0.2 * l; } },
    candy: { name: '별사탕', icon: 'candy', max: 5, desc: '경험치 +10%, 지속시간 +8%', apply: (P, l) => { P.growth += 0.1 * l; P.dur += 0.08 * l; } },
  };

  // ---------- 적 ----------
  G.ENEMIES = {
    mouse: { name: '들쥐', hp: 7, spd: 40, dmg: 4, r: 6, xp: 1, sprite: 'mouse' },
    weed: { name: '잡초 괴물', hp: 14, spd: 30, dmg: 6, r: 6, xp: 1, sprite: 'weed' },
    wasp: { name: '말벌', hp: 10, spd: 64, dmg: 6, r: 6, xp: 1, sprite: 'wasp', fly: 1 },
    bat: { name: '박쥐', hp: 9, spd: 56, dmg: 5, r: 6, xp: 1, sprite: 'bat', fly: 1 },
    spider: { name: '타란튤라', hp: 34, spd: 36, dmg: 9, r: 8, xp: 2, sprite: 'spider' },
    boar: { name: '멧돼지', hp: 70, spd: 46, dmg: 12, r: 10, xp: 3, sprite: 'boar', kres: 0.5 },
    wolf: { name: '늑대', hp: 55, spd: 70, dmg: 11, r: 9, xp: 3, sprite: 'wolf' },
    bear: { name: '심술곰', hp: 700, spd: 42, dmg: 18, r: 13, xp: 25, sprite: 'bear', kres: 0.9, elite: 1 },
    queen: { name: '여왕말벌', hp: 5200, spd: 46, dmg: 20, r: 18, xp: 60, sprite: 'queen', kres: 1, boss: 1, fly: 1 },
    boarKing: { name: '대왕 멧돼지', hp: 16000, spd: 44, dmg: 26, r: 22, xp: 120, sprite: 'boarKing', kres: 1, boss: 1 },
    wolfKing: { name: '밤의 늑대왕', hp: 42000, spd: 52, dmg: 32, r: 24, xp: 250, sprite: 'wolfKing', kres: 1, boss: 1, final: 1 },
  };

  // 분 단위 출현 테이블 (가중치)
  G.WAVES = [
    { mouse: 1 },
    { mouse: 3, weed: 2 },
    { weed: 3, wasp: 2, mouse: 1 },
    { wasp: 3, mouse: 2, spider: 1 },
    { spider: 2, bat: 3, weed: 1 },
    { wasp: 3, bat: 2, spider: 1 },
    { boar: 2, bat: 3, mouse: 1 },
    { boar: 2, spider: 2, wolf: 1 },
    { wolf: 2, weed: 2, bat: 2 },
    { wolf: 3, boar: 2, bat: 2 },
    { boar: 3, spider: 2, wasp: 2 },
    { wolf: 3, spider: 2, boar: 1 },
    { wolf: 2, boar: 2, bat: 2, spider: 1, wasp: 1 },
    { boar: 3, wolf: 3, bat: 1 },
    { wolf: 3, boar: 3, spider: 2, bat: 2 },
    { wolf: 3, boar: 3, bat: 3 },
  ];
  G.BOSSES = [{ t: 300, id: 'queen' }, { t: 600, id: 'boarKing' }, { t: 900, id: 'wolfKing' }];
  G.EVENTS = [
    { t: 95, type: 'swarm', id: 'bat', n: 22 },
    { t: 240, type: 'ring', id: 'weed', n: 36 },
    { t: 450, type: 'swarm', id: 'bat', n: 30 },
    { t: 540, type: 'ring', id: 'mouse', n: 48 },
    { t: 720, type: 'swarm', id: 'wolf', n: 18 },
    { t: 810, type: 'ring', id: 'spider', n: 44 },
  ];
  G.RUN_LENGTH = 900; // 15분

  // ---------- 영구 강화 상점 (벨 사용) ----------
  G.SHOP = [
    { id: 'might', name: '힘', icon: 'apple', max: 5, cost: 120, desc: '공격력 +5%', apply: (P, l) => { P.might += 0.05 * l; } },
    { id: 'hp', name: '체력', icon: 'cookie', max: 5, cost: 100, desc: '최대 체력 +10', apply: (P, l) => { P.maxHp += 10 * l; } },
    { id: 'armor', name: '방어', icon: 'clam', max: 3, cost: 220, desc: '받는 피해 -1', apply: (P, l) => { P.armor += l; } },
    { id: 'speed', name: '신발', icon: 'feather', max: 3, cost: 150, desc: '이동 속도 +4%', apply: (P, l) => { P.speed += 0.04 * l; } },
    { id: 'cd', name: '시계', icon: 'clock', max: 3, cost: 260, desc: '쿨타임 -3%', apply: (P, l) => { P.cd -= 0.03 * l; } },
    { id: 'magnet', name: '자석', icon: 'conch', max: 3, cost: 100, desc: '자석 범위 +15%', apply: (P, l) => { P.magnet += 0.15 * l; } },
    { id: 'growth', name: '성장', icon: 'candy', max: 5, cost: 150, desc: '경험치 +4%', apply: (P, l) => { P.growth += 0.04 * l; } },
    { id: 'greed', name: '욕심', icon: 'bell', max: 5, cost: 120, desc: '벨 획득 +10%', apply: (P, l) => { P.greed += 0.1 * l; } },
    { id: 'reroll', name: '다시 뽑기', icon: 'clover', max: 3, cost: 200, desc: '레벨업 다시 뽑기 +1회', apply: (P, l) => { P.rerolls += l; } },
    { id: 'revive', name: '부활', icon: 'heal', max: 1, cost: 800, desc: '쓰러지면 한 번 부활', apply: (P, l) => { P.revives += l; } },
  ];
})();
