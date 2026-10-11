// i18n.js — 언어 설정 (한국어 / 日本語)
// UI 문구는 G.t('키'), 데이터(캐릭터·무기 등) 이름은 setLang 때 해당 언어로 바꿔 끼웁니다.
// 새 문구를 추가할 때는 ko와 ja 양쪽에 같은 키로 넣어 주세요.
(function () {
  const G = (window.G = window.G || {});

  const STR = {
    ko: {
      gameName: '몽글숲 <b>서바이버즈</b>', gameTitle: '몽글숲 서바이버즈',
      sub: '귀여운 무기로 몰려오는 짐승들을 막아내요!', start: '시작하기', shop: '벨 상점', bellUnit: '벨',
      hint: 'PC: WASD/방향키 이동 · ESC 일시정지  |  모바일: 오른쪽 아래 조이스틱으로 이동',
      langBtn: '🌐 언어: 한국어', selTitle: '함께 모험할 친구를 골라요', back: '← 뒤로',
      shopTitle: '벨 상점 · 영구 강화', levelUp: '레벨 업!', reroll: '🍀 다시 뽑기 ({n})', skip: '건너뛰기 (+10벨)',
      pauseTitle: '잠깐 쉬어요', resume: '계속하기', quit: '그만두기',
      rotate: '휴대폰을 <b>가로</b>로 돌려주세요!<br><small>몽글숲 서바이버즈는 16:9 가로 화면으로 즐겨요</small>',
      best: '최고 기록', min: '{m}분 {s}초', killsN: '처치 {n}', cleared: '👑 클리어', go: '출발! ▶',
      kWeapon: '무기', kItem: '아이템', kHeal: '회복', kBonus: '보너스', isNew: 'NEW!', newGet: '새로 획득', evoCombo: '✨ 진화 조합!',
      lvBonus: 'Lv {lv} 성장 보너스 · 모든 공격력 +{p}%',
      chest: '보물상자!', evolve: '✨ 무기 진화! ✨', allMax: '모든 무기가 최고 레벨이에요!', ok: '좋아요!',
      sfx: '효과음', bgm: '배경음악', numbers: '데미지 숫자', shake: '화면 흔들림', on: '켜짐', off: '꺼짐',
      winTitle: '👑 몽글숲을 지켜냈어요!', loseTitle: '으앙, 쓰러졌어요…', survived: '버틴 시간', kills: '처치', level: '레벨',
      thWeapon: '무기', thTotal: '총 피해', thDps: '초당', thKills: '처치',
      bellSum: '🔔 주운 벨 {a} + 보너스 {b} = <b>{c} 벨</b> 획득!', again: '한 판 더!', charSel: '캐릭터 선택', max: '최대!',
      deploy: '{name} 출동!', deploySub: '몰려오는 짐승들을 물리쳐요', eliteIn: '심술곰 등장!', eliteSub: '쓰러뜨리면 보물상자를 줘요',
      bossIn: '{name} 등장!', bossSub: '보스를 물리치고 보물상자를 얻어요', finalSub: '마지막 결전이에요!',
      swarm: '떼 지어 몰려와요!', ring: '포위됐어요!', ringSub: '틈을 찾아 빠져나가요', revive: '부활!', reviveSub: '한 번 더 힘내요!',
      win: '승리!', winSub: '밤의 늑대왕을 물리쳤어요!', apple: '맛있는 사과', appleTx: '체력을 30 회복해요', bellBag: '벨 주머니', bellBagTx: '25벨을 얻어요',
      combo: '콤보',
    },
    ja: {
      gameName: 'もこもこの森 <b>サバイバーズ</b>', gameTitle: 'もこもこの森サバイバーズ',
      sub: 'かわいい武器で、おしよせる動物たちをやっつけよう！', start: 'スタート', shop: 'ベルショップ', bellUnit: 'ベル',
      hint: 'PC: WASD/矢印キーで移動・ESCでポーズ  |  スマホ: 右下のスティックで移動',
      langBtn: '🌐 言語: 日本語', selTitle: 'いっしょに冒険する仲間をえらぼう', back: '← もどる',
      shopTitle: 'ベルショップ・永久強化', levelUp: 'レベルアップ！', reroll: '🍀 引き直し ({n})', skip: 'スキップ (+10ベル)',
      pauseTitle: 'ひと休み', resume: 'つづける', quit: 'やめる',
      rotate: 'スマホを<b>横向き</b>にしてね！<br><small>16:9の横画面であそぶゲームです</small>',
      best: 'ベスト記録', min: '{m}分{s}秒', killsN: '撃破 {n}', cleared: '👑 クリア', go: 'しゅっぱつ！ ▶',
      kWeapon: 'ぶき', kItem: 'アイテム', kHeal: 'かいふく', kBonus: 'ボーナス', isNew: 'NEW!', newGet: '新しく入手', evoCombo: '✨ 進化コンボ！',
      lvBonus: 'Lv {lv} 成長ボーナス・すべての攻撃力 +{p}%',
      chest: '宝箱！', evolve: '✨ 武器進化！ ✨', allMax: 'すべての武器が最大レベル！', ok: 'やったー！',
      sfx: '効果音', bgm: 'BGM', numbers: 'ダメージ数字', shake: '画面のゆれ', on: 'ON', off: 'OFF',
      winTitle: '👑 もこもこの森を守りぬいた！', loseTitle: 'うわーん、たおれちゃった…', survived: '生存時間', kills: '撃破', level: 'レベル',
      thWeapon: 'ぶき', thTotal: '総ダメージ', thDps: '毎秒', thKills: '撃破',
      bellSum: '🔔 拾ったベル {a} + ボーナス {b} = <b>{c} ベル</b> ゲット！', again: 'もう1回！', charSel: 'キャラ選択', max: 'MAX!',
      deploy: '{name} しゅつどう！', deploySub: 'おしよせる動物たちをやっつけよう', eliteIn: 'いじわるグマ登場！', eliteSub: 'たおすと宝箱をくれるよ',
      bossIn: '{name} 登場！', bossSub: 'ボスをたおして宝箱をゲット', finalSub: '最後の決戦だよ！',
      swarm: '群れがおしよせる！', ring: '囲まれた！', ringSub: 'すきまを見つけて抜け出そう', revive: '復活！', reviveSub: 'もうひとがんばり！',
      win: '勝利！', winSub: '夜のオオカミ王をたおした！', apple: 'おいしいリンゴ', appleTx: '体力を30回復', bellBag: 'ベル袋', bellBagTx: '25ベルをもらう',
      combo: 'コンボ',
    },
  };

  const DATA_JA = {
    chars: {
      momo: { name: 'モモ・パフ', animal: 'ウサギ', bonusText: '移動速度 +10%', story: 'モモが大好きなふわふわウサギ。ピコハン一発でみんな吹っとぶ！' },
      nari: { name: 'ナリ・ポップ', animal: 'ヒヨコ', bonusText: '経験値 +15%', story: 'チューリップを頭にのせたヒヨコ。ぐんぐん早く育つよ。' },
      bori: { name: 'ボリ・ビーン', animal: 'リス', bonusText: '攻撃力 +8%、弾速 +20%', story: 'どんぐり帽子の名射手リス。どんぐりは絶対はずさない！' },
      mintu: { name: 'ミントゥ', animal: 'ネコ', bonusText: '運 +20%、クリティカル +3%', story: '葉っぱリボンのクリーム色ネコ。虫あみでまとめてすくっちゃう。' },
      toki: { name: 'トキ・ドロップ', animal: 'キツネ', bonusText: 'クリティカル率 +8%', story: '星の花をつけたいたずらキツネ。つりざおムチは稲妻のように速い！' },
      pudding: { name: 'プリン・ブー', animal: 'クマ', bonusText: '最大HP +30、防御 +1', story: 'プリン帽子のたのもしいクマ。大きなスプーンでぐるぐる回転！' },
      lala: { name: 'ララ・ペブル', animal: 'カワウソ', bonusText: 'マグネット範囲 +40%、持続 +10%', story: '貝がらネックレスのカワウソ。貝ブーメランをシュッと投げてキャッチ。' },
      hani: { name: 'ハニ・ビビ', animal: 'ミツバチ', bonusText: 'クールタイム -8%', story: '白いお花のミツバチ。ベタベタはちみつつぼで敵を動けなくする。' },
      dodo: { name: 'ドド・スプラウト', animal: '恐竜', bonusText: '最大HP +20、毎秒回復 +0.4', story: '頭に新芽がはえた赤ちゃん恐竜。スコップで地面をドン！' },
      coco: { name: 'ココ・ヌビ', animal: 'ヒツジ', bonusText: '攻撃範囲 +12%', story: '星リボンの雲ヒツジ。星のステッキで空から星を降らせるよ。' },
    },
    weapons: {
      hammer: { name: 'モモのピコハン', desc: '近くの敵の方へ大きくふり回して吹っとばす。', ups: ['攻撃力 +10', '範囲 +20%', '後ろにもう一回ふる', '攻撃力 +12、クールタイム -10%', '範囲 +25%', '攻撃力 +25'] },
      net: { name: '虫あみ', desc: 'まわりをぐるっと一周なぎはらう。', ups: ['攻撃力 +6', '範囲 +15%', 'もう一周ふる', '攻撃力 +8', 'クールタイム -15%', '攻撃力 +12、範囲 +15%'] },
      rod: { name: 'つりざおムチ', desc: '左右に釣り糸を長くふるう。', ups: ['攻撃力 +6', '攻撃力 +8', '範囲 +15%', '攻撃力 +10', 'クールタイム -12%', 'もう一回ふる、攻撃力 +10'] },
      shell: { name: '貝ブーメラン', desc: '近くの敵に投げるとシュッと戻ってくる。全部貫通！', ups: ['数 +1', '攻撃力 +6', '範囲・速度 +15%', '数 +1', '攻撃力 +8', 'クールタイム -15%'] },
      acorn: { name: 'どんぐりパチンコ', desc: 'いちばん近い敵にどんぐりを連射。', ups: ['数 +1', '攻撃力 +4', '貫通 +1', '数 +1', 'クールタイム -15%', '攻撃力 +6、貫通 +1'] },
      shovel: { name: '新芽スコップ', desc: '地面をドン！とたたいて衝撃波を広げる。', ups: ['攻撃力 +10', '範囲 +20%', '衝撃波 +1回', '攻撃力 +12', 'クールタイム -15%', '攻撃力 +20、範囲 +15%'] },
      honey: { name: 'はちみつつぼ', desc: 'つぼを投げてベタベタの水たまりを作る（スロウ）。', ups: ['数 +1', '攻撃力 +3', '範囲 +20%', '持続 +30%', '数 +1', '攻撃力 +5'] },
      star: { name: 'お星さまステッキ', desc: '画面の敵に星を落としてポン！と爆発。', ups: ['数 +1', '攻撃力 +10', '範囲 +20%', '数 +1', 'クールタイム -15%', '攻撃力 +16、数 +1'] },
      tulip: { name: 'くるくるチューリップ', desc: 'チューリップがまわりをくるくる回って守ってくれる。', ups: ['数 +1', '攻撃力 +5', '範囲・速度 +20%', '数 +1', '持続 +40%', '攻撃力 +8、数 +1'] },
      spoon: { name: '大きなスプーン', desc: 'スプーンを持ってぐるぐる回転攻撃！何度もヒット。', ups: ['攻撃力 +5', '範囲 +20%', '回転 +1周', '攻撃力 +7', 'クールタイム -15%', '攻撃力 +10、回転 +1周'] },
      base: { name: '360°ぐるぐる', desc: 'まわり360度をずっとふり回す。' },
      hammerX: { name: '大王モモハンマー', desc: 'ふるたびにモモの衝撃波がはじける！' },
      netX: { name: '天の川あみ', desc: '天の川のように広く二周！当たった敵はおそくなる。' },
      rodX: { name: '黄金の伝説つりざお', desc: '左右にふるい、いつでもクリティカル！' },
      shellX: { name: '真珠のうずまき', desc: '真珠貝が四方八方に飛んで戻ってくる。' },
      acornX: { name: 'どんぐりガトリング', desc: 'どんぐりをものすごい速さで連射！' },
      shovelX: { name: '大地のスコップ', desc: '連続地震！衝撃波のあとに花が咲いてHP回復。' },
      honeyX: { name: '黄金のはちみつ雨', desc: 'まわりに黄金のはちみつが降りそそぎ、敵を引きよせる。' },
      starX: { name: '流星群', desc: '空から流れ星が降りそそぐ！' },
      tulipX: { name: '花かぜストーム', desc: '止まらずに回り続ける花かぜの嵐！' },
      spoonX: { name: 'プリントルネード', desc: 'あまいトルネード！ヒットするたびHPを少し回復。' },
    },
    passives: {
      apple: { name: 'ちからのリンゴ', desc: '攻撃力 +10%' },
      clam: { name: 'かたい貝がら', desc: '受けるダメージ -1、最大HP +5' },
      feather: { name: 'かぜの羽', desc: '移動速度 +8%、弾速 +6%' },
      clock: { name: 'すずの時計', desc: 'クールタイム -7%' },
      pot: { name: '植木鉢', desc: '攻撃範囲 +10%' },
      clover: { name: '四つ葉のクローバー', desc: 'クリティカル +4%、運 +10%' },
      conch: { name: 'マグネット巻き貝', desc: 'アイテムを引きよせる範囲 +30%' },
      cherry: { name: 'ふたごチェリー', desc: '弾・攻撃回数 +1' },
      cookie: { name: 'ハートクッキー', desc: '最大HP +20、毎秒回復 +0.2' },
      candy: { name: '金平糖', desc: '経験値 +10%、持続 +8%' },
    },
    enemies: { mouse: 'ノネズミ', weed: '雑草おばけ', wasp: 'スズメバチ', bat: 'コウモリ', spider: 'タランチュラ', boar: 'イノシシ', wolf: 'オオカミ', bear: 'いじわるグマ', queen: '女王バチ', boarKing: '大王イノシシ', wolfKing: '夜のオオカミ王' },
    shop: {
      might: { name: 'ちから', desc: '攻撃力 +5%' }, hp: { name: '体力', desc: '最大HP +10' }, armor: { name: '防御', desc: '受けるダメージ -1' },
      speed: { name: 'くつ', desc: '移動速度 +4%' }, cd: { name: '時計', desc: 'クールタイム -3%' }, magnet: { name: 'マグネット', desc: 'マグネット範囲 +15%' },
      growth: { name: '成長', desc: '経験値 +4%' }, greed: { name: 'よくばり', desc: 'ベル獲得 +10%' }, reroll: { name: '引き直し', desc: 'レベルアップ引き直し +1回' },
      revive: { name: '復活', desc: 'たおれても一度だけ復活' },
    },
  };

  let ko = null; // 최초 한국어 데이터 백업
  function snapshot() {
    ko = {
      chars: G.CHARS.map((c) => ({ name: c.name, animal: c.animal, bonusText: c.bonusText, story: c.story })),
      weapons: Object.fromEntries(Object.entries(G.WEAPONS).map(([k, w]) => [k, { name: w.name, desc: w.desc, ups: w.ups.map((u) => u[0]) }])),
      passives: Object.fromEntries(Object.entries(G.PASSIVES).map(([k, p]) => [k, { name: p.name, desc: p.desc }])),
      enemies: Object.fromEntries(Object.entries(G.ENEMIES).map(([k, e]) => [k, e.name])),
      shop: Object.fromEntries(G.SHOP.map((s) => [s.id, { name: s.name, desc: s.desc }])),
    };
  }
  function applyData(src) {
    G.CHARS.forEach((c, i) => Object.assign(c, src === ko ? ko.chars[i] : src.chars[c.id]));
    for (const k in G.WEAPONS) {
      const t = src.weapons[k]; if (!t) continue;
      G.WEAPONS[k].name = t.name; G.WEAPONS[k].desc = t.desc;
      if (t.ups) t.ups.forEach((u, i) => { if (G.WEAPONS[k].ups[i]) G.WEAPONS[k].ups[i][0] = u; });
    }
    for (const k in G.PASSIVES) if (src.passives[k]) Object.assign(G.PASSIVES[k], src.passives[k]);
    for (const k in G.ENEMIES) if (src.enemies[k]) G.ENEMIES[k].name = src.enemies[k];
    for (const s of G.SHOP) if (src.shop[s.id]) Object.assign(s, src.shop[s.id]);
  }

  G.lang = 'ko';
  G.t = function (key, vars) {
    let s = (STR[G.lang] && STR[G.lang][key]) ?? STR.ko[key] ?? key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  };
  G.font = () => (G.lang === 'ja' ? "'M PLUS Rounded 1c', 'Jua', 'Hiragino Maru Gothic ProN', sans-serif" : "'Jua', 'M PLUS Rounded 1c', 'Arial Rounded MT Bold', 'Apple SD Gothic Neo', sans-serif");
  G.setLang = function (lang) {
    if (!ko) snapshot();
    G.lang = lang === 'ja' ? 'ja' : 'ko';
    applyData(G.lang === 'ja' ? DATA_JA : ko);
    document.documentElement.lang = G.lang;
    document.body.classList.toggle('ja', G.lang === 'ja');
    document.title = G.t('gameTitle');
    for (const el of document.querySelectorAll('[data-i18n]')) el.innerHTML = G.t(el.dataset.i18n);
  };
})();
