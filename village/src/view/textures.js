// 코드로 그리는 임시 그림들 (타일, 나무, 건물…)
// 화질이 깨지지 않게 실제 크기의 2배(RES)로 그린 뒤 반으로 줄여서 써.
// 나중에 진짜 그림 파일이 생기면 data/assets.js에서 바꿔 끼우면 돼.
import { TILE } from '../data/map.js';

export const RES = 2;
const S = TILE * RES;   // 그림을 그리는 실제 픽셀 크기

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function add(scene, key, c) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}

// 같은 칸에는 항상 같은 랜덤 값 (지도가 매번 똑같이 보이게)
export function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------- 풀밭 ----------
// 끝과 끝이 자연스럽게 이어지는 큰 풀밭 무늬 한 장을 만들어 마을 전체에 반복해서 깔아.
// (작은 칸을 하나씩 깔면 칸 사이에 줄이 보일 수 있어서)
export const GRASS_SIZE = 512;
export function makeGrass(scene) {
  const N = GRASS_SIZE;
  const [c, g] = canvas(N, N);
  g.fillStyle = '#b4e09a';
  g.fillRect(0, 0, N, N);
  const r = rng(12345);
  // 가장자리를 넘어가는 무늬는 반대편에도 그려서 이음새가 안 보이게
  const wrap = (fn, x, y, pad) => {
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      if (x + ox < -pad || x + ox > N + pad || y + oy < -pad || y + oy > N + pad) continue;
      fn(x + ox, y + oy);
    }
  };
  for (let i = 0; i < 26; i++) {
    const x = r() * N, y = r() * N, rx = 18 + r() * 34, ry = 10 + r() * 18;
    g.fillStyle = r() < 0.5 ? 'rgba(150,205,125,.22)' : 'rgba(210,242,180,.3)';
    wrap((px, py) => { g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); g.fill(); }, x, y, 60);
  }
  g.strokeStyle = 'rgba(125,188,104,.55)';
  g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const x = r() * N, y = r() * N;
    wrap((px, py) => { g.beginPath(); g.moveTo(px, py); g.lineTo(px - 3, py - 8); g.moveTo(px, py); g.lineTo(px + 3, py - 7); g.stroke(); }, x, y, 12);
  }
  add(scene, 'grass', c);
}

// ---------- 이어지는 땅 (길, 물, 모래) ----------
// mask: 주변 8칸 중 같은 종류가 있는 방향 (비트)
//  1=위 2=오른쪽 4=아래 8=왼쪽 16=오른위 32=오른아래 64=왼아래 128=왼위
const STYLE = {
  path: { edge: '#d9b98a', fill: '#ecd3a6', dot: 'rgba(190,150,100,.35)', inset: 0.14 },
  sand: { edge: '#ecd9a4', fill: '#f7e9bf', dot: 'rgba(210,180,120,.35)', inset: 0.10 },
  water: { edge: '#86c6e0', fill: '#a9dcf0', dot: 'rgba(255,255,255,.6)', inset: 0.12 },
};

function blobShape(g, mask, k, grow = 0) {
  const a = k - grow, b = S - k + grow, m = S / 2;
  const up = mask & 1, rt = mask & 2, dn = mask & 4, lf = mask & 8;
  g.beginPath();
  roundRect(g, a, a, b - a, b - a, Math.max(4, (S * 0.3) - grow));
  g.fill();
  if (up) g.fillRect(a, 0, b - a, m);
  if (dn) g.fillRect(a, m, b - a, S - m);
  if (lf) g.fillRect(0, a, m, b - a);
  if (rt) g.fillRect(m, a, S - m, b - a);
  if (up && rt && (mask & 16)) g.fillRect(m, 0, S - m, m);
  if (rt && dn && (mask & 32)) g.fillRect(m, m, S - m, S - m);
  if (dn && lf && (mask & 64)) g.fillRect(0, m, m, S - m);
  if (lf && up && (mask & 128)) g.fillRect(0, 0, m, m);
}

export function blobKey(kind, mask) { return `${kind}_${mask}`; }

export function makeBlob(scene, kind, mask) {
  const key = blobKey(kind, mask);
  if (scene.textures.exists(key)) return key;
  const st = STYLE[kind];
  const [c, g] = canvas(S, S);
  const k = S * st.inset;
  g.fillStyle = st.edge;
  blobShape(g, mask, k, 0);
  g.fillStyle = st.fill;
  // 안쪽을 살짝 작게 칠해서 테두리가 생기게
  g.save();
  g.beginPath(); g.rect(0, 0, S, S); g.clip();
  const inner = kind === 'water' ? 5 : 4;
  blobShapeInner(g, mask, k + inner);
  g.restore();
  // 무늬
  const r = rng(mask * 31 + kind.length * 7);
  g.fillStyle = st.dot;
  if (kind === 'water') {
    g.strokeStyle = st.dot; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const x = 22 + r() * (S - 44), y = 22 + r() * (S - 44);
      g.beginPath(); g.arc(x, y, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
  } else {
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.arc(k + 6 + r() * (S - 2 * k - 12), k + 6 + r() * (S - 2 * k - 12), 2 + r() * 2, 0, Math.PI * 2); g.fill();
    }
  }
  add(scene, key, c);
  return key;
}

function blobShapeInner(g, mask, k) {
  const a = k, b = S - k, m = S / 2;
  const up = mask & 1, rt = mask & 2, dn = mask & 4, lf = mask & 8;
  roundRect(g, a, a, b - a, b - a, Math.max(4, S * 0.26));
  g.fill();
  if (up) g.fillRect(a, 0, b - a, m);
  if (dn) g.fillRect(a, m, b - a, S - m);
  if (lf) g.fillRect(0, a, m, b - a);
  if (rt) g.fillRect(m, a, S - m, b - a);
  if (up && rt && (mask & 16)) g.fillRect(m, 0, S - m, m);
  if (rt && dn && (mask & 32)) g.fillRect(m, m, S - m, S - m);
  if (dn && lf && (mask & 64)) g.fillRect(0, m, m, S - m);
  if (lf && up && (mask & 128)) g.fillRect(0, 0, m, m);
}

// ---------- 물건 ----------
export function makeObjects(scene) {
  // 그림자
  {
    const [c, g] = canvas(S, S / 2);
    const grd = g.createRadialGradient(S / 2, S / 4, 2, S / 2, S / 4, S / 2);
    grd.addColorStop(0, 'rgba(60,90,40,.35)'); grd.addColorStop(1, 'rgba(60,90,40,0)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(S / 2, S / 4, S / 2, S / 4, 0, 0, Math.PI * 2); g.fill();
    add(scene, 'shadow', c);
  }
  // 나무 (2종)
  for (let v = 0; v < 2; v++) {
    const w = S * 1.25, h = S * 1.7;
    const [c, g] = canvas(w, h);
    const cx = w / 2;
    g.fillStyle = '#a5764f';
    roundRect(g, cx - 10, h - 46, 20, 40, 8); g.fill();
    const leaf = v ? ['#7cc56f', '#96d685', '#b8e7a4'] : ['#6fbf7a', '#8fd19e', '#b4e6bd'];
    const blobs = [[0, -70, 44], [-30, -48, 34], [30, -48, 34], [0, -38, 38]];
    g.fillStyle = leaf[0];
    for (const [dx, dy, r] of blobs) { g.beginPath(); g.arc(cx + dx, h + dy - 10, r + 4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = leaf[1];
    for (const [dx, dy, r] of blobs) { g.beginPath(); g.arc(cx + dx, h + dy - 14, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = leaf[2];
    g.beginPath(); g.arc(cx - 14, h - 98, 14, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 18, h - 74, 8, 0, Math.PI * 2); g.fill();
    if (v) { // 열매 나무
      g.fillStyle = '#f48a8a';
      for (const [dx, dy] of [[-22, -70], [16, -96], [26, -54], [-6, -50]]) { g.beginPath(); g.arc(cx + dx, h + dy, 6, 0, Math.PI * 2); g.fill(); }
    }
    add(scene, 'tree' + v, c);
  }
  // 바위
  {
    const [c, g] = canvas(S, S * 0.8);
    g.fillStyle = '#9aa3ad';
    g.beginPath(); g.ellipse(S / 2, S * 0.48, S * 0.38, S * 0.28, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c3cad2';
    g.beginPath(); g.ellipse(S / 2 - 4, S * 0.42, S * 0.32, S * 0.22, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e1e6ea';
    g.beginPath(); g.ellipse(S / 2 - 14, S * 0.34, 10, 6, -0.4, 0, Math.PI * 2); g.fill();
    add(scene, 'rock', c);
  }
  // 꽃덤불
  {
    const [c, g] = canvas(S, S);
    g.fillStyle = '#7cc56f';
    for (const [x, y, r] of [[S / 2, S * 0.62, 30], [S * 0.3, S * 0.7, 22], [S * 0.7, S * 0.7, 22]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    const cols = ['#f7a8b8', '#fcd667', '#ffffff', '#c9a7f0'];
    const r = rng(42);
    for (let i = 0; i < 7; i++) {
      const x = S * 0.22 + r() * S * 0.56, y = S * 0.45 + r() * S * 0.35;
      g.fillStyle = cols[i % cols.length];
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f7c948'; g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill();
    }
    add(scene, 'bush', c);
  }
  // 작은 꽃 (밟을 수 있음)
  {
    const [c, g] = canvas(S, S);
    const r = rng(9);
    for (let i = 0; i < 4; i++) {
      const x = 16 + r() * (S - 32), y = 20 + r() * (S - 36);
      g.strokeStyle = '#6fae5e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 9); g.stroke();
      g.fillStyle = ['#ffffff', '#f7a8b8', '#fcd667'][i % 3];
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#f2a05a'; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
    }
    add(scene, 'sprout', c);
  }
  // 표지판
  {
    const [c, g] = canvas(S, S * 1.2);
    g.fillStyle = '#a5764f'; roundRect(g, S / 2 - 5, S * 0.55, 10, S * 0.6, 4); g.fill();
    g.fillStyle = '#d9a873'; roundRect(g, S * 0.14, S * 0.22, S * 0.72, S * 0.42, 10); g.fill();
    g.fillStyle = '#ecc595'; roundRect(g, S * 0.18, S * 0.26, S * 0.64, S * 0.34, 8); g.fill();
    g.fillStyle = '#8a5f3e'; g.font = `${S * 0.2}px Jua, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('→ 🌉', S / 2, S * 0.43);
    add(scene, 'sign', c);
  }
  // 마을회관 (3×3칸)
  {
    const w = S * 3, h = S * 3.6;
    const [c, g] = canvas(w, h);
    const base = h - S * 0.25;
    // 벽
    g.fillStyle = '#fff3dc'; roundRect(g, S * 0.3, base - S * 1.8, w - S * 0.6, S * 1.8, 18); g.fill();
    g.fillStyle = '#f3e1c1'; g.fillRect(S * 0.3, base - S * 0.35, w - S * 0.6, S * 0.35);
    // 지붕
    g.fillStyle = '#f39bb0';
    g.beginPath();
    g.moveTo(S * 0.05, base - S * 1.65); g.lineTo(w / 2, base - S * 3.2); g.lineTo(w - S * 0.05, base - S * 1.65);
    g.quadraticCurveTo(w / 2, base - S * 1.45, S * 0.05, base - S * 1.65); g.fill();
    g.fillStyle = '#f7b8c6';
    g.beginPath(); g.moveTo(S * 0.4, base - S * 1.8); g.lineTo(w / 2, base - S * 2.95); g.lineTo(w / 2 + 20, base - S * 2.8); g.lineTo(S * 0.75, base - S * 1.78); g.fill();
    // 둥근 창 + 시계
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, base - S * 2.2, S * 0.28, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a5f3e'; g.lineWidth = 5; g.stroke();
    g.beginPath(); g.moveTo(w / 2, base - S * 2.2); g.lineTo(w / 2, base - S * 2.38); g.moveTo(w / 2, base - S * 2.2); g.lineTo(w / 2 + 12, base - S * 2.2); g.stroke();
    // 문
    g.fillStyle = '#c98a54'; roundRect(g, w / 2 - S * 0.32, base - S * 0.95, S * 0.64, S * 0.95, 22); g.fill();
    g.fillStyle = '#f7c948'; g.beginPath(); g.arc(w / 2 + S * 0.18, base - S * 0.48, 5, 0, Math.PI * 2); g.fill();
    // 창문
    for (const x of [S * 0.75, w - S * 0.75]) {
      g.fillStyle = '#a9dcf0'; roundRect(g, x - S * 0.28, base - S * 1.35, S * 0.56, S * 0.5, 10); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, base - S * 1.35); g.lineTo(x, base - S * 0.85); g.stroke();
      g.fillStyle = '#f7a8b8'; roundRect(g, x - S * 0.32, base - S * 0.86, S * 0.64, 12, 6); g.fill();
    }
    // 간판
    g.fillStyle = '#8fd19e'; roundRect(g, w / 2 - S * 0.62, base - S * 1.62, S * 1.24, S * 0.34, 12); g.fill();
    g.fillStyle = '#fff'; g.font = `${S * 0.22}px Jua, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('마을회관', w / 2, base - S * 1.44);
    add(scene, 'townhall', c);
  }
  // 출하함 (나무 상자)
  {
    const [c, g] = canvas(S, S * 1.1);
    const top = S * 0.3;
    g.fillStyle = '#c98a54'; roundRect(g, S * 0.12, top + 10, S * 0.76, S * 0.62, 10); g.fill();
    g.fillStyle = '#b37645'; for (const y of [top + 30, top + 52]) g.fillRect(S * 0.12, y, S * 0.76, 4);
    g.fillStyle = '#e3a86f'; roundRect(g, S * 0.06, top, S * 0.88, 18, 8); g.fill();
    g.fillStyle = '#fff3dc'; roundRect(g, S * 0.3, top + 24, S * 0.4, 22, 6); g.fill();
    g.fillStyle = '#f7c948'; g.beginPath(); g.arc(S / 2, top + 35, 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d9a52e'; g.lineWidth = 2; g.stroke();
    add(scene, 'shipbox', c);
  }
  // 반짝이(파티클)와 하트
  {
    const [c, g] = canvas(24, 24);
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(12, 0); g.quadraticCurveTo(13, 11, 24, 12); g.quadraticCurveTo(13, 13, 12, 24); g.quadraticCurveTo(11, 13, 0, 12); g.quadraticCurveTo(11, 11, 12, 0); g.fill();
    add(scene, 'sparkle', c);
    const [c2, g2] = canvas(32, 30);
    g2.fillStyle = '#f48aa4';
    g2.beginPath(); g2.moveTo(16, 28); g2.bezierCurveTo(-6, 12, 6, -6, 16, 8); g2.bezierCurveTo(26, -6, 38, 12, 16, 28); g2.fill();
    add(scene, 'heart', c2);
  }
  // 이동 목표 표시
  {
    const [c, g] = canvas(S, S / 2);
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 5;
    g.beginPath(); g.ellipse(S / 2, S / 4, S * 0.3, S * 0.14, 0, 0, Math.PI * 2); g.stroke();
    add(scene, 'target', c);
  }
}

// 캐릭터 그림을 깨끗하게 작은 크기로 미리 줄여두기 (멀리서 볼 때 지글거림 방지)
export function makeSmallCopy(scene, key, height) {
  const src = scene.textures.get(key).getSourceImage();
  const ratio = height / src.height;
  const [c, g] = canvas(Math.round(src.width * ratio), height);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  add(scene, key + '_s', c);
}
