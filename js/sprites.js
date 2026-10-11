// sprites.js — 모든 도트 그래픽은 여기서 코드로 생성됩니다.
// 새 에셋을 추가하려면 PixelGrid에 그리는 함수를 만들고 SPR에 등록하세요.
(function () {
  const G = (window.G = window.G || {});

  // ---------- 색 유틸 ----------
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  G.mix = mix;
  const OUT = '#4a3328'; // 따뜻한 갈색 외곽선 (동물의숲 느낌)

  // ---------- 픽셀 그리드 ----------
  class PixelGrid {
    constructor(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
    set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; }
    get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.p[y * this.w + x]; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.set(x, y, c);
        }
    }
    tri(x0, y0, x1, y1, x2, y2, c) {
      const minx = Math.floor(Math.min(x0, x1, x2)), maxx = Math.ceil(Math.max(x0, x1, x2));
      const miny = Math.floor(Math.min(y0, y1, y2)), maxy = Math.ceil(Math.max(y0, y1, y2));
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      for (let y = miny; y <= maxy; y++)
        for (let x = minx; x <= maxx; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area;
          const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 >= -0.01 && w1 >= -0.01 && w2 >= -0.01) this.set(x, y, c);
        }
    }
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.set(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    // 빈 칸 중 채워진 칸과 맞닿은 곳에 이웃 색을 어둡게 한 외곽선을 칠한다
    outline(dark = OUT, amt = 0.62) {
      const src = this.p.slice();
      const get = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? null : src[y * this.w + x]);
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (src[y * this.w + x]) continue;
          const n = get(x, y - 1) || get(x, y + 1) || get(x - 1, y) || get(x + 1, y);
          if (n) this.p[y * this.w + x] = mix(n, dark, amt);
        }
      return this;
    }
    // 내부 경계선(색이 다른 부분)에 살짝 음영
    toCanvas() {
      const c = document.createElement('canvas');
      c.width = this.w; c.height = this.h;
      const x = c.getContext('2d');
      for (let j = 0; j < this.h; j++)
        for (let i = 0; i < this.w; i++) {
          const col = this.p[j * this.w + i];
          if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
        }
      return c;
    }
    flipX() {
      const g = new PixelGrid(this.w, this.h);
      for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) g.p[j * this.w + i] = this.p[j * this.w + (this.w - 1 - i)];
      return g;
    }
    silhouette(c) {
      const g = new PixelGrid(this.w, this.h);
      for (let i = 0; i < this.p.length; i++) g.p[i] = this.p[i] ? c : null;
      return g;
    }
  }
  G.PixelGrid = PixelGrid;

  // ---------- 공통 얼굴 ----------
  function cuteEyes(g, x1, x2, y) {
    const E = '#3a2620';
    for (const x of [x1, x2]) {
      g.rect(x, y, 2, 2, E);
      g.set(x, y, '#ffffff');
    }
  }
  function blush(g, x1, x2, y) { g.rect(x1, y, 2, 1, '#f59aa6'); g.rect(x2, y, 2, 1, '#f59aa6'); }
  function mouth(g, x, y) { g.set(x, y, '#b0524f'); g.set(x + 1, y, '#b0524f'); }

  // ---------- 주인공 캐릭터 (28x28, 오른쪽을 바라봄) ----------
  // 각 캐릭터는 base 색 + 꼬리/귀/장신구 함수로 구성 → 같은 비율·같은 외곽선으로 통일감 유지
  const HEAD = { cx: 14.5, cy: 11, rx: 8, ry: 7 };
  function chibi(def, frame) {
    const g = new PixelGrid(28, 28);
    const bob = frame === 1 ? 1 : 0;
    const C = def.colors;
    const hx = HEAD.cx, hy = HEAD.cy + bob;
    if (def.tail) def.tail(g, bob, C);
    if (def.back) def.back(g, bob, C);
    // 발
    const lf = frame === 1 ? 0 : -1, rf = frame === 1 ? -1 : 0;
    g.ellipse(11.5, 25 + lf, 2.2, 1.5, C.feet || C.body);
    g.ellipse(17.5, 25 + rf, 2.2, 1.5, C.feet || C.body);
    // 몸
    if (!def.noBody) {
      g.ellipse(14.5, 20.5 + bob, 5.6, 4.6, C.body);
      g.ellipse(15, 21.2 + bob, 3.4, 3.2, C.belly || C.body);
    }
    if (def.bodyDeco) def.bodyDeco(g, bob, C);
    if (def.earsBack) def.earsBack(g, bob, C);
    // 머리
    if (def.head) def.head(g, bob, C);
    else g.ellipse(hx, hy, HEAD.rx, HEAD.ry, C.head || C.body);
    if (def.face) def.face(g, bob, C);
    if (def.earsFront) def.earsFront(g, bob, C);
    // 손 (앞으로 모은 손)
    if (!def.noHands) {
      g.ellipse(13, 20 + bob, 1.6, 1.4, C.hands || C.body);
      g.ellipse(17.6, 20 + bob, 1.6, 1.4, C.hands || C.body);
    }
    // 눈/볼/입 (오른쪽을 살짝 바라봄)
    const ey = def.eyeY != null ? def.eyeY + bob : 11 + bob;
    cuteEyes(g, 11, 17, ey);
    blush(g, 9, 19, ey + 2);
    if (def.mouth) def.mouth(g, bob, ey);
    else mouth(g, 14, ey + 2);
    if (def.acc) def.acc(g, bob, C);
    g.outline();
    if (def.after) def.after(g, bob, C);
    return g;
  }

  const CHAR_ART = {
    momo: { // 토끼 + 복숭아
      colors: { body: '#fcf4ea', belly: '#ffffff', inner: '#f7c1c8', peach: '#ffb49c', peach2: '#ff8f86', leaf: '#86c46d' },
      tail(g, b, C) { g.ellipse(7.5, 21 + b, 3.4, 3.2, C.peach); g.ellipse(6.6, 20 + b, 1.2, 1, '#ffd9c9'); g.set(8, 22 + b, C.peach2); g.ellipse(9, 17.6 + b, 1.6, 0.9, C.leaf); },
      earsBack(g, b, C) {
        g.ellipse(10.5, 3.5 + b, 2.2, 5, C.body); g.ellipse(10.5, 3.8 + b, 1, 3.6, C.inner);
        g.ellipse(17.5, 3 + b, 2.2, 5, C.body); g.ellipse(17.5, 3.3 + b, 1, 3.6, C.inner);
      },
      acc(g, b, C) { g.ellipse(19.5, 6 + b, 1.8, 1.7, C.peach); g.set(19, 5 + b, '#ffe2d6'); g.set(21, 4 + b, C.leaf); g.set(22, 4 + b, C.leaf); },
    },
    nari: { // 병아리 + 튤립
      colors: { body: '#ffe27a', belly: '#fff3b8', beak: '#f7a440', tulip: '#f59ab0', tulip2: '#e9708f', leaf: '#7cc46a', feet: '#f7a440' },
      noBody: true, noHands: true, eyeY: 12,
      head(g, b, C) { g.ellipse(14.5, 15 + b, 8.6, 9, C.body); g.ellipse(15, 19 + b, 5, 4, C.belly); g.ellipse(7, 17 + b, 2, 3, '#ffd65a'); g.ellipse(22, 17 + b, 2, 3, '#ffd65a'); },
      mouth(g, b, ey) { g.rect(14, ey + 2, 3, 1, '#f7a440'); g.set(15, ey + 3, '#e08a2a'); },
      acc(g, b, C) {
        g.ellipse(13, 3 + b, 1, 2, C.leaf); g.ellipse(17, 3.5 + b, 1.2, 1.8, C.leaf);
        g.ellipse(15, 3 + b, 2.6, 3, C.tulip); g.rect(14, 0 + b, 1, 2, C.tulip2); g.set(15, 1 + b, '#ffd0dc'); g.set(16, 0 + b, C.tulip);
        g.ellipse(15.5, 21 + b, 2, 1.5, C.tulip); g.set(15, 21 + b, '#ffd0dc');
      },
    },
    bori: { // 다람쥐 + 도토리 모자
      colors: { body: '#cf8f58', belly: '#f6dfc2', tail: '#b97b46', tail2: '#e2b07a', cap: '#7a4f30', acorn: '#b57b4a', muzzle: '#f6dfc2' },
      tail(g, b, C) { g.ellipse(6.5, 15 + b, 5, 8, C.tail); g.ellipse(6.5, 13 + b, 3, 5, C.tail2); g.ellipse(9, 7 + b, 3, 3, C.tail); },
      earsBack(g, b, C) { g.tri(7, 8 + b, 9, 1 + b, 12, 5 + b, C.body); g.tri(17, 5 + b, 20, 1 + b, 22, 8 + b, C.body); },
      face(g, b, C) { g.ellipse(15, 13.5 + b, 4.5, 3, C.muzzle); },
      acc(g, b, C) { g.ellipse(14.5, 4 + b, 5, 2.4, C.acorn); g.ellipse(14.5, 3 + b, 5.6, 1.6, C.cap); g.rect(14, 0 + b, 1, 2, '#5c3a20'); g.set(13, 3 + b, '#9a6a42'); g.set(16, 3 + b, '#9a6a42'); },
    },
    mintu: { // 크림 고양이 + 잎사귀 리본
      colors: { body: '#f8f3e3', belly: '#ffffff', stripe: '#b8e2c0', inner: '#f5c6c6', leaf: '#78c477', tail: '#cfe9cf' },
      tail(g, b, C) { g.line(9, 22 + b, 5, 19 + b, C.tail); g.line(5, 19 + b, 4, 14 + b, C.tail); g.line(9, 23 + b, 5, 20 + b, C.tail); g.line(4, 19 + b, 3, 14 + b, C.tail); g.ellipse(4, 13 + b, 1.6, 1.6, '#ffffff'); },
      earsBack(g, b, C) { g.tri(7, 9 + b, 8, 1 + b, 13, 5 + b, C.body); g.tri(16, 5 + b, 21, 1 + b, 22, 9 + b, C.body); g.tri(9, 7 + b, 9, 3 + b, 11, 5 + b, C.inner); g.tri(18, 5 + b, 20, 3 + b, 20, 7 + b, C.inner); },
      face(g, b, C) { g.rect(12, 5 + b, 1, 2, C.stripe); g.rect(14, 4 + b, 1, 3, C.stripe); g.rect(16, 5 + b, 1, 2, C.stripe); },
      acc(g, b, C) { g.ellipse(20, 5 + b, 1.6, 1.2, C.leaf); g.ellipse(22.5, 4 + b, 1.6, 1.2, C.leaf); g.set(21, 5 + b, '#5aa25a'); },
      after(g, b) { g.set(6, 13 + b, '#c9b8a8'); g.set(23, 13 + b, '#c9b8a8'); },
    },
    toki: { // 여우 + 노란 별꽃
      colors: { body: '#f2a05a', belly: '#fff1e0', tip: '#8f5638', muzzle: '#fff1e0', star: '#ffd84a', tail: '#f09a50' },
      tail(g, b, C) { g.ellipse(6, 17 + b, 4.2, 6.5, C.tail); g.ellipse(4.5, 12 + b, 2.6, 2.6, '#fff1e0'); },
      earsBack(g, b, C) { g.tri(6, 9 + b, 7, 0 + b, 13, 5 + b, C.body); g.tri(16, 5 + b, 22, 0 + b, 23, 9 + b, C.body); g.tri(7, 3 + b, 7, 0 + b, 9, 2 + b, C.tip); g.tri(20, 2 + b, 22, 0 + b, 22, 3 + b, C.tip); },
      face(g, b, C) { g.ellipse(15.5, 14 + b, 5.5, 2.8, C.muzzle); },
      acc(g, b, C) { const s = C.star; g.set(9, 4 + b, s); g.rect(8, 5 + b, 3, 1, s); g.set(9, 6 + b, s); g.set(8, 7 + b, s); g.set(10, 7 + b, s); g.set(9, 5 + b, '#fff4b0'); },
    },
    pudding: { // 곰 + 푸딩 모자
      colors: { body: '#f3c98b', belly: '#fde8c8', inner: '#e6a96a', pud: '#ffe08a', caramel: '#a8642e', cherry: '#e8475a', bow: '#e07a5f' },
      earsBack(g, b, C) { g.ellipse(8, 5 + b, 2.6, 2.6, C.body); g.ellipse(21, 5 + b, 2.6, 2.6, C.body); g.ellipse(8, 5 + b, 1.2, 1.2, C.inner); g.ellipse(21, 5 + b, 1.2, 1.2, C.inner); },
      face(g, b, C) { g.ellipse(15, 13.6 + b, 3.2, 2.2, '#fde8c8'); },
      acc(g, b, C) {
        g.rect(11, 2 + b, 7, 3, C.pud); g.rect(10, 4 + b, 9, 1, C.pud); g.rect(11, 1 + b, 7, 1, C.caramel); g.set(11, 3 + b, C.caramel); g.set(17, 2 + b, C.caramel);
        g.ellipse(14.5, -0.2 + b, 1.5, 1.5, C.cherry); g.set(14, 0 + b, '#ff9aa6');
        g.rect(13, 17 + b, 4, 2, C.bow); g.set(12, 17 + b, C.bow); g.set(17, 18 + b, C.bow); g.set(15, 17 + b, '#b9503c');
      },
    },
    lala: { // 수달 + 조개 목걸이
      colors: { body: '#9e8b7c', belly: '#efe4d6', muzzle: '#efe4d6', shell: '#f8c6b6', tail: '#8a786a' },
      tail(g, b, C) { g.ellipse(6, 22 + b, 4.5, 2, C.tail); },
      earsBack(g, b, C) { g.ellipse(8, 7 + b, 1.8, 1.8, C.body); g.ellipse(21, 7 + b, 1.8, 1.8, C.body); },
      face(g, b, C) { g.ellipse(15.5, 13.8 + b, 4.6, 2.6, C.muzzle); g.set(15, 13 + b, '#5a3e36'); g.set(16, 13 + b, '#5a3e36'); },
      acc(g, b, C) { g.line(11, 16 + b, 18, 16 + b, '#ffffff'); g.ellipse(14.5, 18 + b, 1.8, 1.6, C.shell); g.set(14, 18 + b, '#e8a090'); g.set(15, 17 + b, '#ffe4da'); },
      mouth(g, b, ey) { g.set(15, ey + 3, '#b0524f'); },
      after(g, b) { g.set(9, 14 + b, '#6d5a4e'); g.set(21, 14 + b, '#6d5a4e'); },
    },
    hani: { // 꿀벌 + 하얀 꽃
      colors: { body: '#fcd667', belly: '#fcd667', stripe: '#6e4b33', wing: '#e3f3ff', flower: '#ffffff', center: '#ffcf3a' },
      back(g, b, C) { g.ellipse(6, 15 + b, 3.6, 2.6, C.wing); g.ellipse(23, 15 + b, 3.6, 2.6, C.wing); g.set(5, 14 + b, '#ffffff'); },
      bodyDeco(g, b, C) { g.rect(9, 19 + b, 11, 1, C.stripe); g.rect(9, 22 + b, 11, 1, C.stripe); g.ellipse(14.5, 25 + b, 1, 1, C.stripe); },
      earsBack(g, b, C) { g.line(11, 4 + b, 9, 0 + b, '#6e4b33'); g.line(18, 4 + b, 20, 0 + b, '#6e4b33'); g.ellipse(9, 0.5 + b, 1.3, 1.3, C.body); g.ellipse(20, 0.5 + b, 1.3, 1.3, C.body); },
      acc(g, b, C) { g.ellipse(9.5, 6 + b, 1.2, 1.2, C.flower); g.ellipse(11.5, 5 + b, 1.2, 1.2, C.flower); g.ellipse(8.5, 4 + b, 1.2, 1.2, C.flower); g.ellipse(10.5, 3 + b, 1.2, 1.2, C.flower); g.set(10, 4 + b, C.center); g.set(13, 7 + b, '#86c46d'); },
    },
    dodo: { // 초록 공룡 + 새싹
      colors: { body: '#a6d08a', belly: '#e6f2c9', spike: '#f3a88e', sprout: '#6cbf5a', tail: '#9ac77e' },
      tail(g, b, C) { g.tri(2, 24 + b, 10, 18 + b, 11, 24 + b, C.tail); g.ellipse(3.5, 23 + b, 2, 1.6, C.tail); g.tri(6, 20 + b, 5, 18 + b, 8, 19 + b, C.spike); },
      back(g, b, C) { g.tri(6, 8 + b, 5, 5 + b, 8, 6 + b, C.spike); g.tri(6, 12 + b, 4, 10 + b, 7, 10 + b, C.spike); g.tri(7, 16 + b, 5, 15 + b, 8, 14 + b, C.spike); },
      face(g, b, C) { g.ellipse(16, 14 + b, 4.6, 2.6, '#c3e3a6'); },
      acc(g, b, C) { g.rect(14, 1 + b, 1, 3, '#5aa64a'); g.ellipse(12, 1.6 + b, 2, 1.2, C.sprout); g.ellipse(17, 1 + b, 2, 1.2, C.sprout); g.set(17, 0 + b, '#9ee08a'); },
    },
    coco: { // 양 + 별 달린 파란 리본
      colors: { body: '#fffaf3', belly: '#fffaf3', wool: '#fffaf3', face: '#fbe7d4', horn: '#dfb684', bow: '#7fb6ef', star: '#ffe066' },
      bodyDeco(g, b, C) { for (const [x, y] of [[9, 18], [20, 18], [9, 22], [20, 22], [14, 24]]) g.ellipse(x, y + b, 2.4, 2.4, C.wool); },
      head(g, b, C) {
        for (const [x, y] of [[8, 8], [12, 4.5], [17, 4.5], [21, 8], [7.5, 13], [21.5, 13], [14.5, 3.5]]) g.ellipse(x, y + b, 3.2, 3.2, C.wool);
        g.ellipse(14.5, 11 + b, 8, 7, C.wool);
        g.ellipse(15, 12.5 + b, 5.6, 4.6, C.face);
      },
      earsFront(g, b, C) { g.ellipse(5, 11 + b, 2, 1.6, C.horn); g.ellipse(4.4, 12.5 + b, 1.2, 1.2, '#c99a66'); g.ellipse(24, 11 + b, 2, 1.6, C.horn); g.ellipse(24.6, 12.5 + b, 1.2, 1.2, '#c99a66'); },
      acc(g, b, C) {
        g.tri(16, 5 + b, 19, 3 + b, 19, 7 + b, C.bow); g.tri(22, 5 + b, 19, 3 + b, 19, 7 + b, C.bow); g.set(21, 7 + b, '#5f97d6');
        g.set(19, 4 + b, C.star); g.rect(18, 5 + b, 3, 1, C.star); g.set(19, 6 + b, C.star);
      },
    },
  };

  // ---------- 적 (몰려오는 짐승들) ----------
  function angryEyes(g, x1, x2, y, eye = '#2a1a18', glow = null) {
    g.rect(x1, y, 2, 2, eye); g.rect(x2, y, 2, 2, eye);
    if (glow) { g.set(x1 + 1, y, glow); g.set(x2 + 1, y, glow); }
    g.set(x1 - 1, y - 1, eye); g.set(x1, y - 1, eye); g.set(x2 + 1, y - 1, eye); g.set(x2 + 2, y - 1, eye);
  }
  const ENEMY_ART = {
    mouse(f) {
      const g = new PixelGrid(18, 16), b = f;
      g.line(1, 11 + b, 4, 12, '#e9a0a8'); g.line(1, 11 + b, 1, 8, '#e9a0a8');
      g.ellipse(9, 11, 6, 4, '#9aa0ab'); g.ellipse(13, 8 + b, 4, 3.5, '#9aa0ab');
      g.ellipse(11, 4.5 + b, 2.3, 2.3, '#9aa0ab'); g.ellipse(11, 4.5 + b, 1.2, 1.2, '#e9a0a8');
      g.set(17, 9 + b, '#e9a0a8'); g.set(16, 9 + b, '#e9a0a8');
      g.rect(5 + f, 14, 2, 1, '#7d828d'); g.rect(11 - f, 14, 2, 1, '#7d828d');
      angryEyes(g, 12, 15, 7 + b, '#2a1a18', '#ff6b6b');
      g.rect(14, 7 + b, 1, 2, '#9aa0ab');
      return g.outline('#2b2430', 0.6);
    },
    weed(f) {
      const g = new PixelGrid(16, 16);
      const L = '#5f9c4a', L2 = '#7fb85f';
      g.ellipse(8, 10, 5.5, 4.5, L);
      g.tri(2, 10, 4 - f, 1, 7, 8, L2); g.tri(14, 10, 12 + f, 1, 9, 8, L2); g.tri(6, 7, 8, 0 + f, 10, 7, L);
      g.ellipse(8, 11, 3.5, 2.5, '#4d8a3c');
      angryEyes(g, 5, 9, 9, '#1f2a14', '#ffe066');
      g.rect(6, 13, 4, 1, '#2d3d22');
      g.rect(4, 14 + (f ? 0 : 1), 2, 1, '#6b4a30'); g.rect(10, 14 + f, 2, 1, '#6b4a30');
      return g.outline('#22301c', 0.55);
    },
    wasp(f) {
      const g = new PixelGrid(18, 16);
      g.ellipse(6 + (f ? 0 : 1), 3, 3, 2, '#e6f0f7'); g.ellipse(10, 2.5 + f, 3, 2, '#e6f0f7');
      g.ellipse(6, 10, 5, 4, '#f2c230'); g.rect(4, 7, 1, 7, '#3b2a20'); g.rect(7, 7, 1, 7, '#3b2a20');
      g.tri(0, 11, 2, 9, 2, 12, '#3b2a20');
      g.ellipse(13, 8, 3.8, 3.5, '#f2c230');
      angryEyes(g, 12, 15, 7, '#2a1a18', '#ff5a5a');
      g.line(13, 4, 14, 1, '#3b2a20'); g.line(15, 4, 17, 2, '#3b2a20');
      return g.outline('#2d2014', 0.6);
    },
    bat(f) {
      const g = new PixelGrid(22, 14);
      const B = '#7b6597', W = '#5e4a78';
      if (f === 0) { g.tri(1, 3, 8, 6, 6, 11, W); g.tri(21, 3, 14, 6, 16, 11, W); }
      else { g.tri(1, 11, 8, 5, 7, 11, W); g.tri(21, 11, 14, 5, 15, 11, W); }
      g.ellipse(11, 7.5, 4.2, 4, B);
      g.tri(7, 4, 8, 0, 10, 4, B); g.tri(12, 4, 14, 0, 15, 4, B);
      angryEyes(g, 8, 12, 6, '#1a1020', '#ff6b9a');
      g.set(10, 10, '#ffffff'); g.set(12, 10, '#ffffff');
      return g.outline('#22182c', 0.55);
    },
    spider(f) {
      const g = new PixelGrid(22, 16);
      const L = '#4a3448';
      for (let i = 0; i < 4; i++) {
        const o = (i + f) % 2;
        g.line(8, 9, 1 + i, 4 + i * 3 + o, L); g.line(14, 9, 20 - i, 4 + i * 3 + (1 - o), L);
      }
      g.ellipse(11, 9, 6, 5, '#6b4a62'); g.ellipse(11, 7, 3.6, 2.2, '#8a6480');
      g.rect(8, 9, 2, 2, '#ff5a6e'); g.rect(12, 9, 2, 2, '#ff5a6e'); g.set(10, 11, '#ffb0b8'); g.set(11, 11, '#ffb0b8');
      g.set(9, 8, '#2a1a24'); g.set(13, 8, '#2a1a24');
      return g.outline('#20141e', 0.55);
    },
    boar(f) {
      const g = new PixelGrid(26, 20);
      g.ellipse(11, 11, 9, 6.5, '#9a6a4c'); g.ellipse(11, 8, 7, 3, '#7c5038');
      for (let i = 0; i < 5; i++) g.set(6 + i * 2, 4, '#5e3a28');
      g.ellipse(19, 11, 5, 4.5, '#9a6a4c');
      g.ellipse(23, 12, 2.2, 2, '#e3a69a'); g.set(23, 12, '#7a4040'); g.set(24, 12, '#7a4040');
      g.tri(20, 15, 21, 12, 22, 15, '#fff8e8');
      g.tri(15, 7, 16, 4, 18, 7, '#7c5038');
      angryEyes(g, 18, 20, 9, '#22140e', '#ff6b4a');
      g.rect(5, 16 + f, 3, 2, '#5e3a28'); g.rect(14, 16 + (1 - f), 3, 2, '#5e3a28');
      g.line(2, 9, 1, 7, '#7c5038');
      return g.outline('#2a1a10', 0.6);
    },
    wolf(f) {
      const g = new PixelGrid(26, 22);
      g.ellipse(5, 10 + f, 4, 2.4, '#7d8aa6'); g.ellipse(2.5, 9 + f, 2, 1.4, '#cfd6e6');
      g.ellipse(11, 13, 7.5, 5, '#7d8aa6'); g.ellipse(12, 15, 4, 2.6, '#cfd6e6');
      g.ellipse(18, 9, 5.5, 5, '#7d8aa6');
      g.tri(14, 6, 15, 0, 18, 4, '#7d8aa6'); g.tri(19, 4, 22, 0, 22, 6, '#7d8aa6'); g.set(15, 3, '#5a6580'); g.set(21, 3, '#5a6580');
      g.ellipse(22, 11, 3.4, 2.3, '#cfd6e6'); g.set(25, 10, '#2a2230');
      angryEyes(g, 16, 20, 8, '#1a1626', '#ffd23a');
      g.line(20, 13, 23, 13, '#ffffff');
      g.rect(6, 17 + f, 2, 3, '#5a6580'); g.rect(10, 17 + (1 - f), 2, 3, '#5a6580'); g.rect(14, 17 + f, 2, 3, '#5a6580');
      return g.outline('#1c1a2a', 0.6);
    },
    bear(f) { // 엘리트: 심술곰 (보물상자 드랍)
      const g = new PixelGrid(30, 30);
      g.ellipse(7, 6, 3.4, 3.4, '#7a5440'); g.ellipse(23, 6, 3.4, 3.4, '#7a5440'); g.ellipse(7, 6, 1.6, 1.6, '#4f3426'); g.ellipse(23, 6, 1.6, 1.6, '#4f3426');
      g.ellipse(15, 21, 10, 7.5, '#7a5440'); g.ellipse(15, 22, 6, 5, '#a8826a');
      g.ellipse(15, 12, 10, 8, '#7a5440'); g.ellipse(15, 15, 4.6, 3.2, '#c8a68c'); g.rect(14, 13, 3, 2, '#2a1a14');
      angryEyes(g, 9, 19, 10, '#1a0f0a', '#ff5a3a');
      g.rect(13, 17, 5, 1, '#3a2018');
      g.rect(7, 27 + f, 5, 2, '#5a3a2a'); g.rect(18, 27 + (1 - f), 5, 2, '#5a3a2a');
      g.ellipse(4, 19, 2.4, 3, '#7a5440'); g.ellipse(26, 19, 2.4, 3, '#7a5440');
      return g.outline('#22140c', 0.6);
    },
    queen(f) { // 보스: 여왕말벌
      const g = new PixelGrid(40, 34);
      g.ellipse(12 + f, 7, 7, 4.5, '#e6f0f7'); g.ellipse(21, 5 + f, 7, 4.5, '#e6f0f7'); g.ellipse(13, 7, 3, 1.5, '#ffffff');
      g.ellipse(13, 22, 11, 8.5, '#f2b52a'); for (const x of [7, 12, 17]) g.rect(x, 15, 2, 15, '#3b2a20');
      g.tri(0, 24, 3, 20, 4, 26, '#3b2a20');
      g.ellipse(28, 17, 8, 7.5, '#f2b52a');
      angryEyes(g, 24, 31, 15, '#2a1a18', '#ff3a5a');
      g.rect(26, 21, 5, 1, '#3b2a20');
      g.line(26, 10, 24, 4, '#3b2a20'); g.line(31, 10, 34, 4, '#3b2a20');
      // 왕관
      g.rect(24, 6, 9, 3, '#ffd84a'); g.tri(24, 6, 25, 2, 27, 6, '#ffd84a'); g.tri(27, 6, 28.5, 1, 30, 6, '#ffd84a'); g.tri(30, 6, 32, 2, 33, 6, '#ffd84a'); g.set(28, 7, '#e8475a');
      return g.outline('#2d2014', 0.6);
    },
    boarKing(f) { // 보스: 대왕 멧돼지
      const g = ENEMY_ART.boar(f);
      const big = new PixelGrid(52, 42);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c) big.rect(x * 2, y * 2 + 2, 2, 2, c); }
      big.rect(34, 2, 12, 4, '#ffd84a'); big.tri(34, 2, 36, -3, 38, 2, '#ffd84a'); big.tri(38, 2, 40, -4, 42, 2, '#ffd84a'); big.tri(42, 2, 44, -3, 46, 2, '#ffd84a'); big.rect(39, 3, 2, 2, '#4ab0e8');
      return big.outline('#2a1a10', 0.6);
    },
    wolfKing(f) { // 최종 보스: 밤의 늑대왕
      const g = ENEMY_ART.wolf(f);
      const big = new PixelGrid(56, 48);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        let c = g.get(x, y); if (!c) continue;
        if (c === '#7d8aa6') c = '#5b5f8f'; else if (c === '#cfd6e6') c = '#b9b6e6';
        big.rect(x * 2 + 2, y * 2 + 4, 2, 2, c);
      }
      big.rect(30, 2, 14, 4, '#ffd84a'); big.tri(30, 2, 32, -3, 34, 2, '#ffd84a'); big.tri(35, 2, 37, -4, 39, 2, '#ffd84a'); big.tri(40, 2, 42, -3, 44, 2, '#ffd84a'); big.rect(36, 3, 2, 2, '#c45af0');
      return big.outline('#14122a', 0.6);
    },
  };

  // ---------- 무기/아이템 아이콘 (작은 도트) ----------
  const ICON_ART = {
    hammer() { const g = new PixelGrid(16, 16); g.line(4, 13, 10, 7, '#a8714a'); g.line(5, 13, 11, 7, '#c48c5c'); g.ellipse(10.5, 5, 4.5, 3.5, '#ffb49c'); g.ellipse(10.5, 5, 4.5, 1.2, '#ff8f86'); g.ellipse(9, 3.5, 1.5, 0.8, '#ffe2d6'); g.rect(13, 1, 2, 1, '#86c46d'); return g.outline(); },
    net() { const g = new PixelGrid(16, 16); g.line(2, 14, 8, 8, '#c48c5c'); g.ellipse(11, 5, 4.2, 4.2, '#9fd4f5'); g.ellipse(11, 5, 3, 3, '#e7f6ff'); for (let i = 8; i <= 14; i += 2) g.line(i, 2, i, 8, '#b8def5'); g.line(8, 5, 14, 5, '#b8def5'); return g.outline(); },
    rod() { const g = new PixelGrid(16, 16); g.line(2, 14, 12, 2, '#c48c5c'); g.line(3, 14, 13, 2, '#a8714a'); g.line(13, 2, 14, 9, '#ffffff'); g.ellipse(14, 10.5, 1.6, 1.6, '#ff6b6b'); g.rect(13, 11, 3, 1, '#ffffff'); return g.outline(); },
    shell() { const g = new PixelGrid(14, 13); g.ellipse(7, 6, 5.5, 5, '#f8c6b6'); g.tri(5, 11, 7, 8, 9, 11, '#f8c6b6'); for (const x of [4, 7, 10]) g.line(7, 10, x, 2, '#e89a88'); g.ellipse(6, 3.5, 1.5, 0.8, '#fff0ea'); return g.outline(); },
    acorn() { const g = new PixelGrid(12, 13); g.ellipse(6, 8, 3.8, 4, '#c98a54'); g.ellipse(6, 4.5, 4.5, 2.2, '#7a4f30'); g.rect(6, 1, 1, 2, '#5c3a20'); g.set(4, 7, '#f0c08a'); return g.outline(); },
    shovel() { const g = new PixelGrid(16, 16); g.line(10, 2, 5, 9, '#7cc46a'); g.line(11, 2, 6, 9, '#5aa64a'); g.rect(9, 1, 4, 1, '#5aa64a'); g.ellipse(4, 11.5, 3.2, 3.6, '#c9d3dc'); g.ellipse(3.5, 10.5, 1, 1.4, '#ffffff'); return g.outline(); },
    honey() { const g = new PixelGrid(14, 14); g.ellipse(7, 8, 5, 4.6, '#f5b83a'); g.rect(3, 3, 8, 2, '#c9864a'); g.rect(4, 2, 6, 1, '#e7a35a'); g.ellipse(7, 8, 3, 2.4, '#ffd76a'); g.rect(9, 10, 1, 3, '#f5b83a'); g.set(5, 7, '#fff2b8'); return g.outline(); },
    star() { const g = new PixelGrid(14, 14); const s = '#ffe066'; g.tri(7, 0, 4.5, 6, 9.5, 6, s); g.tri(0, 5, 14, 5, 7, 9.5, s); g.tri(7, 8, 2, 13, 5, 6, s); g.tri(7, 8, 12, 13, 9, 6, s); g.set(6, 5, '#fff8d0'); g.set(7, 4, '#fff8d0'); return g.outline('#7a5a20', 0.55); },
    tulip() { const g = new PixelGrid(12, 15); g.line(6, 7, 6, 14, '#5aa64a'); g.ellipse(4, 11, 2, 1, '#7cc46a'); g.ellipse(6, 5, 3.8, 4, '#f59ab0'); g.tri(2, 3, 3, 0, 5, 3, '#f59ab0'); g.tri(5, 3, 6, -1, 8, 3, '#e9708f'); g.tri(8, 3, 9, 0, 10, 3, '#f59ab0'); g.set(5, 4, '#ffd0dc'); return g.outline(); },
    spoon() { const g = new PixelGrid(16, 16); g.line(3, 14, 8, 8, '#d9dfe6'); g.line(4, 14, 9, 8, '#b8c2cc'); g.ellipse(11, 5, 4, 4.5, '#e4e9ee'); g.ellipse(11, 5.5, 2.8, 3, '#ffe08a'); g.ellipse(11, 4.5, 2.8, 1, '#a8642e'); g.set(11, 2, '#e8475a'); return g.outline(); },
    // 패시브
    apple() { const g = new PixelGrid(12, 12); g.ellipse(6, 7, 4.5, 4, '#ef5a5a'); g.rect(6, 1, 1, 3, '#7a4f30'); g.ellipse(8.5, 2.5, 1.6, 0.9, '#7cc46a'); g.set(4, 5, '#ffb0b0'); return g.outline(); },
    clam() { const g = new PixelGrid(12, 12); g.ellipse(6, 6, 5, 4.5, '#a7c7e7'); for (const x of [3, 6, 9]) g.line(6, 10, x, 2, '#7ea6cf'); g.rect(4, 10, 4, 1, '#7ea6cf'); return g.outline(); },
    feather() { const g = new PixelGrid(12, 12); g.ellipse(7, 5, 3, 4.5, '#bfe8f2'); g.line(3, 11, 9, 2, '#ffffff'); g.set(8, 4, '#ffffff'); return g.outline(); },
    clock() { const g = new PixelGrid(12, 12); g.ellipse(6, 6.5, 4.8, 4.8, '#ffd84a'); g.ellipse(6, 6.5, 3.4, 3.4, '#fffaf0'); g.line(6, 6, 6, 4, '#4a3328'); g.line(6, 6, 8, 7, '#4a3328'); g.rect(5, 0, 2, 2, '#ffd84a'); return g.outline(); },
    pot() { const g = new PixelGrid(12, 12); g.rect(2, 6, 8, 5, '#d9875a'); g.rect(1, 5, 10, 2, '#e8a070'); g.ellipse(4, 3, 2, 2, '#f59ab0'); g.ellipse(8, 3, 2, 2, '#ffe066'); g.set(6, 4, '#7cc46a'); return g.outline(); },
    clover() { const g = new PixelGrid(12, 12); const c = '#5fbf5a'; g.ellipse(3.5, 3.5, 2.1, 2.1, c); g.ellipse(8.5, 3.5, 2.1, 2.1, '#6fcf6a'); g.ellipse(3.5, 8, 2.1, 2.1, '#6fcf6a'); g.ellipse(8.5, 8, 2.1, 2.1, c); g.set(6, 5, '#3f8f3a'); g.set(6, 6, '#3f8f3a'); g.line(6, 6, 9, 11, '#3f8f3a'); g.set(4, 3, '#a8e8a0'); return g.outline(); },
    conch() { const g = new PixelGrid(12, 12); g.ellipse(6, 6, 4.5, 3.5, '#f5d0e6'); g.tri(1, 6, 4, 3, 4, 9, '#f5d0e6'); g.line(5, 4, 9, 8, '#e0a0c8'); g.line(7, 3, 10, 6, '#e0a0c8'); g.ellipse(10, 9, 1.5, 1.2, '#ffb0d0'); return g.outline(); },
    cherry() { const g = new PixelGrid(12, 12); g.line(4, 6, 7, 1, '#5aa64a'); g.line(8, 7, 7, 1, '#5aa64a'); g.ellipse(4, 8, 2.6, 2.6, '#e8475a'); g.ellipse(8.5, 9, 2.6, 2.6, '#e8475a'); g.set(3, 7, '#ffb0b8'); g.set(8, 8, '#ffb0b8'); return g.outline(); },
    cookie() { const g = new PixelGrid(12, 12); g.ellipse(4, 5, 3, 3, '#f0a070'); g.ellipse(8, 5, 3, 3, '#f0a070'); g.tri(1, 6, 11, 6, 6, 11, '#f0a070'); g.ellipse(4, 5, 1.6, 1.6, '#ff8fa6'); g.ellipse(8, 5, 1.6, 1.6, '#ff8fa6'); g.tri(3, 6, 9, 6, 6, 9, '#ff8fa6'); return g.outline(); },
    candy() { const g = new PixelGrid(12, 12); const s = '#c9a6ff'; g.tri(6, 0, 4, 5, 8, 5, s); g.tri(0, 4, 12, 4, 6, 8, s); g.tri(6, 7, 2, 11, 4, 5, s); g.tri(6, 7, 10, 11, 8, 5, s); g.set(5, 4, '#f4ecff'); return g.outline('#4a3068', 0.55); },
    // 필드 아이템
    gem1() { const g = new PixelGrid(7, 7); g.tri(3.5, 0, 0, 3.5, 7, 3.5, '#8fd3ff'); g.tri(0, 3.5, 7, 3.5, 3.5, 7, '#5eb3ef'); g.set(3, 2, '#ffffff'); return g.outline('#1e3a5a', 0.5); },
    gem2() { const g = new PixelGrid(8, 8); g.tri(4, 0, 0, 4, 8, 4, '#9ff09a'); g.tri(0, 4, 8, 4, 4, 8, '#5fcf5a'); g.set(3, 2, '#ffffff'); return g.outline('#1e4a24', 0.5); },
    gem3() { const g = new PixelGrid(10, 10); g.tri(5, 0, 0, 5, 10, 5, '#ffb0d8'); g.tri(0, 5, 10, 5, 5, 10, '#f57ab8'); g.set(4, 2, '#ffffff'); g.set(5, 3, '#ffffff'); return g.outline('#5a1e3a', 0.5); },
    gem4() { const g = new PixelGrid(12, 12); g.tri(6, 0, 0, 6, 12, 6, '#ffe27a'); g.tri(0, 6, 12, 6, 6, 12, '#f5b83a'); g.set(5, 2, '#ffffff'); g.set(6, 3, '#ffffff'); return g.outline('#5a3a10', 0.5); },
    bell() { const g = new PixelGrid(10, 11); g.ellipse(5, 6.5, 4, 3.8, '#f2d27a'); g.rect(4, 1, 3, 2, '#c9a24a'); g.rect(3, 3, 5, 1, '#c9a24a'); g.set(4, 6, '#a07a2a'); g.set(5, 7, '#a07a2a'); g.set(6, 6, '#a07a2a'); g.set(3, 5, '#fff2b8'); return g.outline(); },
    magnet() { return ICON_ART.conch(); },
    chest() { const g = new PixelGrid(16, 14); g.rect(1, 5, 14, 8, '#c4844a'); g.rect(1, 2, 14, 4, '#d99a5a'); g.rect(1, 6, 14, 1, '#8a5a30'); g.rect(3, 2, 2, 11, '#ffd84a'); g.rect(11, 2, 2, 11, '#ffd84a'); g.rect(7, 6, 2, 3, '#ffd84a'); g.set(7, 7, '#8a5a30'); return g.outline(); },
    heal() { return ICON_ART.apple(); },
    stinger() { const g = new PixelGrid(8, 8); g.ellipse(4, 4, 3, 3, '#ff5a7a'); g.ellipse(4, 4, 1.5, 1.5, '#ffd0dc'); return g.outline('#3a0a1a', 0.5); },
  };

  // ---------- 배경 장식 ----------
  const DECO_ART = {
    tree() {
      const g = new PixelGrid(30, 38);
      g.rect(13, 26, 5, 10, '#a8714a'); g.rect(13, 26, 2, 10, '#c48c5c');
      g.ellipse(15, 15, 13, 12, '#6fbf6a'); g.ellipse(11, 11, 7, 6, '#86d17a'); g.ellipse(20, 19, 7, 5, '#5fae5a');
      for (const [x, y] of [[8, 16], [19, 9], [22, 17], [12, 21]]) { g.ellipse(x, y, 1.5, 1.5, '#ff8f86'); g.set(x - 1, y - 1, '#ffd0c8'); }
      return g.outline('#2f4a2a', 0.55);
    },
    pine() {
      const g = new PixelGrid(24, 36);
      g.rect(10, 29, 4, 6, '#8a5a3a');
      g.tri(12, 0, 2, 14, 22, 14, '#4fa26a'); g.tri(12, 7, 1, 22, 23, 22, '#5aae72'); g.tri(12, 14, 0, 30, 24, 30, '#4fa26a');
      g.tri(12, 2, 8, 10, 12, 10, '#7ccf8f');
      return g.outline('#22402a', 0.55);
    },
    bush() {
      const g = new PixelGrid(20, 14);
      g.ellipse(10, 8, 9, 5.5, '#78c46a'); g.ellipse(6, 6, 4, 3.5, '#8ed07e');
      for (const [x, y] of [[5, 8], [11, 5], [15, 9]]) g.set(x, y, '#ffffff'), g.set(x + 1, y, '#ffe066');
      return g.outline('#2f4a2a', 0.55);
    },
    rock() { const g = new PixelGrid(14, 10); g.ellipse(7, 6, 6, 3.8, '#b9b4ad'); g.ellipse(5.5, 4.5, 2.5, 1.5, '#d6d1ca'); return g.outline('#4a4440', 0.55); },
    flowerP() { const g = new PixelGrid(7, 7); g.ellipse(3.5, 2, 1.2, 1.2, '#f7a6c0'); g.ellipse(2, 3.5, 1.2, 1.2, '#f7a6c0'); g.ellipse(5, 3.5, 1.2, 1.2, '#f7a6c0'); g.ellipse(3.5, 5, 1.2, 1.2, '#f7a6c0'); g.set(3, 3, '#ffe066'); return g; },
    flowerW() { const g = new PixelGrid(7, 7); g.ellipse(3.5, 2, 1.2, 1.2, '#ffffff'); g.ellipse(2, 3.5, 1.2, 1.2, '#ffffff'); g.ellipse(5, 3.5, 1.2, 1.2, '#ffffff'); g.ellipse(3.5, 5, 1.2, 1.2, '#ffffff'); g.set(3, 3, '#ffcf3a'); return g; },
    flowerY() { const g = new PixelGrid(7, 7); g.ellipse(3.5, 2, 1.2, 1.2, '#ffe066'); g.ellipse(2, 3.5, 1.2, 1.2, '#ffe066'); g.ellipse(5, 3.5, 1.2, 1.2, '#ffe066'); g.ellipse(3.5, 5, 1.2, 1.2, '#ffe066'); g.set(3, 3, '#f59a5a'); return g; },
    stump() { const g = new PixelGrid(14, 10); g.rect(2, 3, 10, 6, '#a8714a'); g.ellipse(7, 3, 5, 2, '#e3c08a'); g.ellipse(7, 3, 2.5, 1, '#c99a66'); return g.outline('#3a2a1a', 0.55); },
  };

  // ---------- 빌드 ----------
  const SPR = (G.SPR = { char: {}, enemy: {}, icon: {}, deco: {} });
  function pack(grid) {
    return { r: grid.toCanvas(), l: grid.flipX().toCanvas(), wr: grid.silhouette('#ffffff').toCanvas(), wl: grid.silhouette('#ffffff').flipX().toCanvas(), w: grid.w, h: grid.h };
  }
  G.buildSprites = function () {
    for (const id in CHAR_ART) if (!(SPR.char[id] && SPR.char[id].url)) SPR.char[id] = [pack(chibi(CHAR_ART[id], 0)), pack(chibi(CHAR_ART[id], 1))]; // 일러스트가 먼저 불러와졌으면 그대로 둠
    for (const id in ENEMY_ART) SPR.enemy[id] = [pack(ENEMY_ART[id](0)), pack(ENEMY_ART[id](1))];
    for (const id in ICON_ART) { const g = ICON_ART[id](); SPR.icon[id] = { c: g.toCanvas(), w: g.w, h: g.h, wc: g.silhouette('#ffffff').toCanvas() }; }
    for (const id in DECO_ART) { const g = DECO_ART[id](); SPR.deco[id] = { c: g.toCanvas(), w: g.w, h: g.h }; }
    SPR.ground = makeGroundTile();
  };

  // 원본 일러스트 캐릭터: 불러오면 도트 캐릭터를 대신함 (부드럽게 확대/축소해서 그림)
  const ART_H = 40; // 게임 속 키 (월드 단위)
  function artFrame(img) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const flip = (src) => { const f = document.createElement('canvas'); f.width = src.width; f.height = src.height; const x = f.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return f; };
    const white = (src) => { const f = document.createElement('canvas'); f.width = src.width; f.height = src.height; const x = f.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(0, 0, f.width, f.height); return f; };
    const wr = white(c);
    return { r: c, l: flip(c), wr, wl: flip(wr), w: ART_H * c.width / c.height, h: ART_H, art: true };
  }
  G.artReady = Promise.all(Object.keys(G.CHAR_ART_IMG || {}).map((id) => new Promise((res) => {
    const img = new Image();
    img.onload = () => { try { const f = artFrame(img); SPR.char[id] = [f, f]; SPR.char[id].url = G.CHAR_ART_IMG[id]; } catch (e) {} res(); };
    img.onerror = () => res();
    img.src = G.CHAR_ART_IMG[id];
  })));

  // 잔디 바닥 타일 (64x64, 반복)
  function makeGroundTile() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#a9dc8c'; x.fillRect(0, 0, 64, 64);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 140; i++) { x.fillStyle = rnd() < 0.5 ? '#9dd382' : '#b5e398'; x.fillRect((rnd() * 64) | 0, (rnd() * 64) | 0, 2, 1); }
    for (let i = 0; i < 26; i++) { const px = (rnd() * 64) | 0, py = (rnd() * 64) | 0; x.fillStyle = '#8cc774'; x.fillRect(px, py, 1, 2); x.fillRect(px + 2, py + 1, 1, 1); }
    return c;
  }

  // 캔버스를 data URL로 (UI에서 사용)
  G.spriteURL = function (canvas, scale) {
    const c = document.createElement('canvas'); c.width = canvas.width * scale; c.height = canvas.height * scale;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL();
  };
})();
