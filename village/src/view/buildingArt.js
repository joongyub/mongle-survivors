// 건물 그림 (코드로 그림, 2배 크기로 그려서 선명하게)
// 레벨이 오를수록 꽃 화분 → 깃발 → 덤불 → 금빛 별이 붙어서 "커졌다!"가 눈에 보여.
// 나중에 그림 파일이 생기면 data/assets.js에 경로를 적고 여기 대신 불러오면 돼.
import { TILE } from '../data/map.js';
import { RES } from './textures.js';
import { FONT } from '../i18n.js';

const S = TILE * RES;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w); c.height = Math.round(h);
  return [c, c.getContext('2d')];
}
function add(scene, key, c) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function dot(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function flower(g, x, y, r, color) {
  for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; dot(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.85, color); }
  dot(g, x, y, r * 0.7, '#f7c948');
}

// 모든 건물 그림의 아래쪽 여백 (마을회관 그림과 같은 규칙)
export const BASE_PAD = S * 0.25;
const TOP_PAD = S * 0.75;     // 깃발·별이 들어갈 위쪽 여백

// ---------- 레벨 장식 ----------
// 원래 그림 위에 레벨 장식을 덧그린 새 그림을 만듦
function decorate(src, level) {
  const [c, g] = canvas(src.width, src.height + TOP_PAD);
  g.drawImage(src, 0, TOP_PAD);
  if (level < 2) return c;
  const w = c.width, base = c.height - BASE_PAD;
  // 지붕 꼭대기 찾기 (가운데 줄에서 처음 칠해진 곳)
  let peak = TOP_PAD;
  const col = src.getContext('2d').getImageData(Math.floor(src.width / 2) - 2, 0, 4, src.height).data;
  for (let y = 0; y < src.height; y++) { if (col[(y * 4) * 4 + 3] > 40) { peak = y + TOP_PAD; break; } }

  // Lv2: 양쪽 꽃 화분
  for (const x of [S * 0.22, w - S * 0.22]) {
    g.fillStyle = '#d98b5f'; rr(g, x - 16, base - 26, 32, 26, 7); g.fill();
    g.fillStyle = '#c47a50'; g.fillRect(x - 16, base - 26, 32, 6);
    dot(g, x, base - 34, 13, '#7cc56f');
    flower(g, x - 6, base - 38, 4, '#f7a8b8'); flower(g, x + 7, base - 33, 4, '#ffffff');
  }
  // Lv4: 둥근 덤불
  if (level >= 4) {
    for (const x of [S * 0.52, w - S * 0.52]) {
      dot(g, x, base - 14, 18, '#6fbf7a'); dot(g, x - 4, base - 18, 12, '#8fd19e');
      flower(g, x + 6, base - 20, 3.5, '#fcd667');
    }
  }
  // Lv3: 지붕 위 깃발 (Lv5는 금빛)
  if (level >= 3) {
    const px = w / 2, top = peak - S * 0.62;
    g.strokeStyle = '#8a5f3e'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px, peak + 6); g.lineTo(px, top); g.stroke();
    g.fillStyle = level >= 5 ? '#f7c948' : '#f39bb0';
    g.beginPath(); g.moveTo(px + 2, top); g.quadraticCurveTo(px + 30, top + 4, px + 46, top + 14);
    g.quadraticCurveTo(px + 26, top + 18, px + 2, top + 28); g.closePath(); g.fill();
    dot(g, px, top - 2, 6, '#f7c948');
  }
  // Lv5: 반짝이는 별
  if (level >= 5) {
    const sx = w / 2 - 34, sy = peak - S * 0.35;
    g.fillStyle = '#ffe58a'; g.strokeStyle = '#e6b53a'; g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 7 : 16, a = -Math.PI / 2 + i * Math.PI / 5;
      g[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.stroke();
  }
  return c;
}

// ---------- 창고 ----------
const ROOF = ['#c98a54', '#c98a54', '#7cc56f', '#7fb5e6', '#b99ae6', '#f39bb0'];
function drawStorage(level) {
  const w = S * 2, h = S * 2.75;
  const [c, g] = canvas(w, h);
  const base = h - BASE_PAD;
  const wallTop = base - S * 1.25;
  // 벽 (나무 판자)
  g.fillStyle = '#e8c79a'; rr(g, S * 0.18, wallTop, w - S * 0.36, S * 1.25, 14); g.fill();
  g.fillStyle = 'rgba(160,110,70,.18)';
  for (let x = S * 0.3; x < w - S * 0.3; x += 22) g.fillRect(x, wallTop + 8, 3, S * 1.15);
  // 지붕
  g.fillStyle = ROOF[level];
  g.beginPath();
  g.moveTo(S * 0.04, wallTop + 14); g.lineTo(w / 2, wallTop - S * 0.95); g.lineTo(w - S * 0.04, wallTop + 14);
  g.quadraticCurveTo(w / 2, wallTop + 30, S * 0.04, wallTop + 14); g.fill();
  g.fillStyle = 'rgba(255,255,255,.28)';
  g.beginPath(); g.moveTo(S * 0.3, wallTop + 4); g.lineTo(w / 2, wallTop - S * 0.78); g.lineTo(w / 2 + 14, wallTop - S * 0.7); g.lineTo(S * 0.5, wallTop + 6); g.fill();
  // 둥근 창
  g.fillStyle = '#fff3dc'; g.beginPath(); g.arc(w / 2, wallTop - S * 0.25, S * 0.17, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8a5f3e'; g.lineWidth = 4; g.stroke();
  // 큰 문 (X자 나무)
  const dw = S * 0.9, dh = S * 0.85, dx = w / 2 - dw / 2, dy = base - dh;
  g.fillStyle = '#b37645'; rr(g, dx, dy, dw, dh, 10); g.fill();
  g.strokeStyle = '#8a5f3e'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(dx + 10, dy + 10); g.lineTo(dx + dw - 10, dy + dh - 8); g.moveTo(dx + dw - 10, dy + 10); g.lineTo(dx + 10, dy + dh - 8); g.stroke();
  g.strokeStyle = '#e3a86f'; g.lineWidth = 4; rr(g, dx, dy, dw, dh, 10); g.stroke();
  // 옆에 쌓인 나무 상자
  g.fillStyle = '#d9a873'; rr(g, w - S * 0.5, base - 34, 30, 30, 5); g.fill();
  g.strokeStyle = '#b37645'; g.lineWidth = 3; g.strokeRect(w - S * 0.5 + 5, base - 29, 20, 20);
  return c;
}

// ---------- 울타리 (옆 울타리와 저절로 이어짐) ----------
// mask: 1=위 2=오른쪽 4=아래 8=왼쪽
function drawFence(mask) {
  const [c, g] = canvas(S, S * 1.2);
  const cx = S / 2, base = c.height - S * 0.35;
  g.lineCap = 'round';
  const rail = (x1, y1, x2, y2) => {
    g.strokeStyle = '#b37645'; g.lineWidth = 9; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = '#e3a86f'; g.lineWidth = 4; g.beginPath(); g.moveTo(x1, y1 - 2); g.lineTo(x2, y2 - 2); g.stroke();
  };
  for (const yy of [base - 40, base - 18]) {
    if (mask & 8) rail(0, yy, cx, yy);
    if (mask & 2) rail(cx, yy, S, yy);
  }
  // 위·아래로 이어질 때는 세로 막대
  if (mask & 1) rail(cx, base - 46 - S * 0.65, cx, base - 40);
  if (mask & 4) rail(cx, base - 18, cx, c.height);
  // 기둥
  g.fillStyle = '#b37645'; rr(g, cx - 9, base - 58, 18, 60, 6); g.fill();
  g.fillStyle = '#e3a86f'; rr(g, cx - 6, base - 56, 8, 54, 4); g.fill();
  dot(g, cx, base - 58, 9, '#c98a54');
  return c;
}

// ---------- 길 (흙길 → 돌길 → 꽃길) ----------
function drawStonePath(level) {
  const [c, g] = canvas(S, S);
  if (level === 1) {
    // 동글동글 징검돌
    for (const [x, y, rx, ry] of [[S * 0.3, S * 0.3, 20, 15], [S * 0.72, S * 0.36, 17, 13], [S * 0.35, S * 0.74, 18, 14], [S * 0.74, S * 0.76, 19, 14]]) {
      g.fillStyle = '#a7aeb5'; g.beginPath(); g.ellipse(x, y + 3, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d3d8dd'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#eef1f3'; g.beginPath(); g.ellipse(x - 5, y - 4, rx * 0.35, ry * 0.3, -0.4, 0, Math.PI * 2); g.fill();
    }
  } else {
    // 벽돌 바닥
    g.fillStyle = level === 3 ? '#f3e1c1' : '#e8b9a0'; rr(g, 2, 2, S - 4, S - 4, 12); g.fill();
    g.fillStyle = level === 3 ? '#fff3dc' : '#f4cdb6';
    g.save(); rr(g, 6, 6, S - 12, S - 12, 9); g.clip();
    const bw = (S - 16) / 2, bh = (S - 20) / 3;
    for (let r = 0; r < 3; r++) for (let k = -1; k < 3; k++) {
      const x = 6 + k * (bw + 4) - (r % 2 ? bw / 2 : 0), y = 6 + r * (bh + 4);
      rr(g, x, y, bw, bh, 6); g.fill();
    }
    g.restore();
    if (level === 3) {
      for (const [x, y, col] of [[S * 0.18, S * 0.2, '#f7a8b8'], [S * 0.82, S * 0.5, '#c9a7f0'], [S * 0.3, S * 0.84, '#fcd667'], [S * 0.6, S * 0.22, '#ffffff']]) flower(g, x, y, 5, col);
    }
  }
  return c;
}

// ---------- 꽃밭 (가로 2칸 / 세로 2칸) ----------
function drawFlowerbed(vertical) {
  const tw = vertical ? 1 : 2, th = vertical ? 2 : 1;
  const [c, g] = canvas(S * tw, S * th + S * 0.35);
  const base = c.height - S * 0.12;
  const x0 = 8, y0 = S * 0.5, w = c.width - 16, h = base - y0;
  g.fillStyle = '#c98a54'; rr(g, x0, y0, w, h, 16); g.fill();
  g.fillStyle = '#9a6b4a'; rr(g, x0 + 8, y0 + 8, w - 16, h - 18, 12); g.fill();
  g.fillStyle = '#e3a86f'; rr(g, x0, base - 16, w, 16, 8); g.fill();
  const cols = ['#f7a8b8', '#fcd667', '#ffffff', '#c9a7f0', '#f39a8e'];
  let i = 0;
  for (let y = y0 + 4; y < base - 24; y += 26) for (let x = x0 + 20; x < x0 + w - 12; x += 26) {
    g.fillStyle = '#6fae5e'; g.fillRect(x - 1.5, y, 3, 14);
    dot(g, x - 5, y + 8, 5, '#7cc56f');
    flower(g, x, y - 2, 5.5, cols[i++ % cols.length]);
  }
  return c;
}

// ---------- 공사 틀(비계), 망치, 나무 더미 ----------
function drawScaffold(tw, th) {
  const w = S * tw, h = S * th + S * 1.1;
  const [c, g] = canvas(w, h);
  const base = h - BASE_PAD, top = S * 0.25;
  g.lineCap = 'round';
  const pole = (x1, y1, x2, y2, wdt = 8) => {
    g.strokeStyle = '#a5764f'; g.lineWidth = wdt; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = 'rgba(255,230,190,.55)'; g.lineWidth = wdt * 0.35; g.beginPath(); g.moveTo(x1 - 1, y1); g.lineTo(x2 - 1, y2); g.stroke();
  };
  const xs = [14, w / 2, w - 14];
  for (const x of xs) pole(x, base, x, top);
  const floors = [base - (base - top) * 0.33, base - (base - top) * 0.66, top + 8];
  for (const y of floors) {
    g.fillStyle = '#d9a873'; rr(g, 4, y - 7, w - 8, 14, 5); g.fill();
    g.fillStyle = '#c38d58'; g.fillRect(8, y + 3, w - 16, 3);
  }
  // 엇갈린 버팀목
  pole(xs[0], base - 6, xs[1], floors[0] + 6, 5); pole(xs[1], floors[0] - 6, xs[2], floors[1] + 6, 5);
  // 공사 표지판
  g.fillStyle = '#fcd667'; rr(g, w / 2 - 34, base - 46, 68, 36, 8); g.fill();
  g.strokeStyle = '#8a5f3e'; g.lineWidth = 3; rr(g, w / 2 - 34, base - 46, 68, 36, 8); g.stroke();
  g.font = `26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#8a5f3e';
  g.fillText('🔨', w / 2, base - 27);
  return c;
}

function drawHammer() {
  const [c, g] = canvas(56, 56);
  g.save(); g.translate(28, 30); g.rotate(-0.6);
  g.fillStyle = '#c98a54'; rr(g, -4, -6, 8, 30, 3); g.fill();
  g.fillStyle = '#9aa3ad'; rr(g, -15, -16, 30, 13, 4); g.fill();
  g.fillStyle = '#c3cad2'; rr(g, -13, -15, 26, 5, 2); g.fill();
  g.restore();
  return c;
}

function drawPlanks() {
  const [c, g] = canvas(S * 0.8, S * 0.5);
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i % 2 ? '#e3a86f' : '#d9a873';
    rr(g, 6 + i * 4, c.height - 16 - i * 11, c.width - 18, 12, 5); g.fill();
    g.fillStyle = '#b37645'; dot(g, c.width - 14 + i * 2, c.height - 10 - i * 11, 3, '#b37645');
  }
  return c;
}

// ---------- 만들기 ----------
export function makeBuildingArt(scene) {
  const townBase = scene.textures.get('townhall').getSourceImage();
  for (let lv = 1; lv <= 5; lv++) {
    add(scene, `townhall_${lv}`, decorate(townBase, lv));
    add(scene, `storage_${lv}`, decorate(drawStorage(lv), lv));
  }
  add(scene, 'shipbox_1', decorate(scene.textures.get('shipbox').getSourceImage(), 1));
  for (let m = 0; m < 16; m++) add(scene, `fence_${m}`, drawFence(m));
  for (let lv = 1; lv <= 3; lv++) add(scene, `stonepath_${lv}`, drawStonePath(lv));
  add(scene, 'flowerbed_0', drawFlowerbed(false));
  add(scene, 'flowerbed_1', drawFlowerbed(true));
  add(scene, 'hammer', drawHammer());
  add(scene, 'planks', drawPlanks());
}

// 공사 틀은 크기마다 처음 쓸 때 만듦
export function scaffoldKey(scene, w, h) {
  const key = `scaffold_${w}x${h}`;
  if (!scene.textures.exists(key)) add(scene, key, drawScaffold(w, h));
  return key;
}
