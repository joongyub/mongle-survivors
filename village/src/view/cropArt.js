// 밭과 작물 그림 (코드로 그림, 2배 크기로 그려서 선명하게)
// 나중에 그림 파일로 바꾸려면 data/assets.js에 경로를 적고 여기 대신 불러오면 돼.
import { TILE } from '../data/map.js';
import { CROPS } from '../data/crops.js';
import { RES } from './textures.js';

const S = TILE * RES;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
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
function circle(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function leaf(g, x, y, len, ang, color) {
  g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = color;
  g.beginPath(); g.ellipse(0, -len / 2, len * 0.28, len / 2, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function makeCropArt(scene) {
  // 밭 흙 (마른 흙, 젖은 흙)
  for (const wet of [false, true]) {
    const [c, g] = canvas(S, S);
    g.fillStyle = wet ? '#9a6b4a' : '#c99a6e'; rr(g, 4, 6, S - 8, S - 10, 18); g.fill();
    g.fillStyle = wet ? '#7f5639' : '#b4855b';
    for (const y of [S * 0.32, S * 0.55, S * 0.78]) { rr(g, 14, y - 4, S - 28, 8, 4); g.fill(); }
    if (wet) { g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(S * 0.3, S * 0.25, 10, 4, -0.3, 0, Math.PI * 2); g.fill(); }
    add(scene, wet ? 'soil_wet' : 'soil', c);
  }
  // 씨앗 단계: 작은 흙더미
  {
    const [c, g] = canvas(S, S);
    g.fillStyle = '#a77650'; g.beginPath(); g.ellipse(S / 2, S * 0.62, 20, 10, 0, 0, Math.PI * 2); g.fill();
    circle(g, S / 2 - 6, S * 0.58, 3.5, '#f3e2b0'); circle(g, S / 2 + 5, S * 0.6, 3.5, '#f3e2b0'); circle(g, S / 2, S * 0.55, 3, '#f3e2b0');
    add(scene, 'crop_seed', c);
  }
  // 새싹 단계
  {
    const [c, g] = canvas(S, S);
    g.strokeStyle = '#5fa85a'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(S / 2, S * 0.7); g.lineTo(S / 2, S * 0.44); g.stroke();
    leaf(g, S / 2, S * 0.48, 26, -0.9, '#7cc56f'); leaf(g, S / 2, S * 0.46, 26, 0.9, '#8fd19e');
    add(scene, 'crop_sprout', c);
  }
  // 다 자란 모습 (작물별)
  for (const crop of CROPS) {
    const w = S, h = S * 1.35;
    const [c, g] = canvas(w, h);
    const base = h - S * 0.28, cx = w / 2;
    DRAW[crop.look](g, cx, base, crop.color);
    add(scene, 'crop_' + crop.id, c);
  }
  // 물 필요 아이콘 (물방울 말풍선)
  {
    const [c, g] = canvas(48, 56);
    g.fillStyle = '#fff'; rr(g, 2, 2, 44, 40, 14); g.fill();
    g.beginPath(); g.moveTo(18, 40); g.lineTo(24, 52); g.lineTo(30, 40); g.fill();
    g.fillStyle = '#62b6e6'; g.beginPath(); g.moveTo(24, 9); g.bezierCurveTo(36, 24, 34, 34, 24, 34); g.bezierCurveTo(14, 34, 12, 24, 24, 9); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(20, 26, 3, 5, -0.4, 0, Math.PI * 2); g.fill();
    add(scene, 'icon_water', c);
  }
  // 물뿌리개
  {
    const [c, g] = canvas(64, 48);
    g.fillStyle = '#8fc4e8'; rr(g, 14, 14, 30, 26, 8); g.fill();
    g.strokeStyle = '#8fc4e8'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(42, 30); g.lineTo(58, 16); g.stroke();
    g.beginPath(); g.arc(28, 14, 10, Math.PI, 0); g.stroke();
    add(scene, 'can', c);
  }
  // 물방울 파티클
  { const [c, g] = canvas(10, 14); g.fillStyle = '#7cc8f0'; g.beginPath(); g.moveTo(5, 0); g.bezierCurveTo(10, 7, 10, 14, 5, 14); g.bezierCurveTo(0, 14, 0, 7, 5, 0); g.fill(); add(scene, 'drop', c); }
}

// 작물별 그리는 방법
const DRAW = {
  // 당근: 잎 + 땅 위로 살짝 나온 주황 뿌리
  root(g, cx, base, col) {
    for (const [a, l] of [[-0.6, 34], [0, 42], [0.6, 34], [-0.25, 38], [0.3, 36]]) leaf(g, cx, base - 18, l, a, a % 0.5 ? '#6fbf7a' : '#8fd19e');
    g.fillStyle = col; g.beginPath(); g.moveTo(cx - 13, base - 20); g.lineTo(cx + 13, base - 20); g.lineTo(cx, base + 6); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,80,30,.4)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 7, base - 12); g.lineTo(cx - 1, base - 12); g.moveTo(cx + 2, base - 5); g.lineTo(cx + 7, base - 5); g.stroke();
  },
  // 순무·감자: 둥근 알뿌리
  bulb(g, cx, base, col) {
    for (const [a, l] of [[-0.5, 30], [0, 36], [0.5, 30]]) leaf(g, cx, base - 22, l, a, '#7cc56f');
    circle(g, cx, base - 10, 17, col);
    g.fillStyle = col === '#f3eefa' ? '#c9a7f0' : '#b98a52';
    g.beginPath(); g.arc(cx, base - 10, 17, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    circle(g, cx - 6, base - 16, 4, 'rgba(255,255,255,.5)');
  },
  // 딸기: 덤불 + 빨간 열매
  berry(g, cx, base, col) {
    for (const [x, y, r] of [[0, -22, 22], [-16, -12, 16], [16, -12, 16]]) circle(g, cx + x, base + y, r, '#6fbf7a');
    for (const [x, y] of [[-14, -6], [10, -4], [0, -18], [18, -18]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(cx + x - 7, base + y - 4); g.quadraticCurveTo(cx + x, base + y - 10, cx + x + 7, base + y - 4); g.lineTo(cx + x, base + y + 8); g.closePath(); g.fill();
      circle(g, cx + x - 2, base + y - 2, 1.4, '#fff3b0'); circle(g, cx + x + 2, base + y + 1, 1.4, '#fff3b0');
    }
  },
  // 튤립
  tulip(g, cx, base, col) {
    g.strokeStyle = '#5fa85a'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, base); g.lineTo(cx, base - 40); g.stroke();
    leaf(g, cx, base - 4, 30, -0.5, '#7cc56f'); leaf(g, cx, base - 4, 26, 0.6, '#8fd19e');
    g.fillStyle = col; g.beginPath(); g.moveTo(cx - 15, base - 58); g.lineTo(cx - 8, base - 50); g.lineTo(cx, base - 60); g.lineTo(cx + 8, base - 50); g.lineTo(cx + 15, base - 58);
    g.quadraticCurveTo(cx + 16, base - 36, cx, base - 36); g.quadraticCurveTo(cx - 16, base - 36, cx - 15, base - 58); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - 6, base - 48, 3, 7, 0, 0, Math.PI * 2); g.fill();
  },
  // 토마토: 지지대 + 덩굴 + 빨간 열매
  vine(g, cx, base, col) {
    g.strokeStyle = '#c49a6c'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, base + 4); g.lineTo(cx, base - 70); g.stroke();
    for (const [x, y, r] of [[-10, -50, 14], [10, -36, 15], [-8, -20, 15], [10, -62, 11]]) circle(g, cx + x, base + y, r, '#6fbf7a');
    for (const [x, y] of [[-14, -40], [12, -24], [6, -52], [-6, -12]]) { circle(g, cx + x, base + y, 8, col); circle(g, cx + x - 3, base + y - 3, 2, 'rgba(255,255,255,.6)'); }
  },
  // 옥수수: 키 큰 줄기 + 노란 옥수수
  corn(g, cx, base, col) {
    g.strokeStyle = '#6fae5e'; g.lineWidth = 7; g.beginPath(); g.moveTo(cx, base + 2); g.lineTo(cx, base - 92); g.stroke();
    leaf(g, cx, base - 20, 44, -0.9, '#7cc56f'); leaf(g, cx, base - 36, 44, 0.9, '#8fd19e'); leaf(g, cx, base - 70, 34, -0.5, '#7cc56f');
    g.fillStyle = col; g.beginPath(); g.ellipse(cx + 11, base - 52, 8, 18, 0.25, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a6d08a'; g.beginPath(); g.ellipse(cx + 7, base - 44, 6, 16, 0.5, 0, Math.PI * 2); g.fill();
  },
  // 해바라기
  sunflower(g, cx, base, col) {
    g.strokeStyle = '#5fa85a'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, base); g.lineTo(cx, base - 62); g.stroke();
    leaf(g, cx, base - 14, 30, -0.9, '#7cc56f'); leaf(g, cx, base - 26, 30, 0.9, '#8fd19e');
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = col; g.beginPath(); g.ellipse(cx + Math.cos(a) * 15, base - 74 + Math.sin(a) * 15, 6, 10, a + Math.PI / 2, 0, Math.PI * 2); g.fill(); }
    circle(g, cx, base - 74, 12, '#8a5a34'); circle(g, cx - 3, base - 77, 3, 'rgba(255,255,255,.25)');
  },
  // 호박
  pumpkin(g, cx, base, col) {
    leaf(g, cx - 18, base - 10, 26, -1.2, '#7cc56f'); leaf(g, cx + 18, base - 10, 26, 1.2, '#8fd19e');
    for (const [x, rx] of [[-12, 14], [12, 14], [0, 16]]) { g.fillStyle = col; g.beginPath(); g.ellipse(cx + x, base - 16, rx, 18, 0, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(170,80,20,.35)'; g.lineWidth = 2;
    for (const x of [-8, 8]) { g.beginPath(); g.ellipse(cx + x, base - 16, 6, 17, 0, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#7a9a4a'; g.fillRect(cx - 3, base - 40, 6, 9);
    circle(g, cx - 10, base - 24, 4, 'rgba(255,255,255,.35)');
  },
  // 눈콩: 덩굴 + 연두색 꼬투리 + 눈송이
  pea(g, cx, base, col) {
    for (const [x, y, r] of [[0, -30, 20], [-14, -16, 15], [14, -16, 15]]) circle(g, cx + x, base + y, r, '#7cc56f');
    for (const [x, y, a] of [[-12, -22, -0.4], [10, -12, 0.5], [2, -38, 0.1]]) { g.save(); g.translate(cx + x, base + y); g.rotate(a); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 6, 13, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    for (const [x, y] of [[-20, -44], [18, -40], [0, -54]]) circle(g, cx + x, base + y, 3, '#ffffff');
  },
};
