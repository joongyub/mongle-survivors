// 건물 그리기: 건물 그림, 공사 틀(비계) + 남은 시간 막대, 완성 연출
import { TILE } from '../data/map.js';
import { def, sizeOf, progress, leftMs } from '../core/build.js';
import { formatLeft } from '../core/farm.js';
import { now } from '../core/clock.js';
import { RES } from './textures.js';
import { scaffoldKey } from './buildingArt.js';

const sc = 1 / RES;

export class BuildingView {
  constructor(scene, buildings) {
    this.scene = scene;
    this.buildings = buildings;     // state.buildings (같은 배열을 계속 봄)
    this.views = new Map();
    this.hidden = new Set();        // 옮기는 중이라 잠깐 숨긴 건물
    this.sync();
  }

  // 그림 키 (레벨, 방향, 이웃 울타리에 따라 다름)
  textureFor(b) {
    const lv = Math.max(1, b.level);
    if (b.type === 'fence') return 'fence_' + this.fenceMask(b);
    if (b.type === 'flowerbed') return 'flowerbed_' + (b.rot % 2);
    if (b.type === 'shipbox') return 'shipbox_1';
    return `${b.type}_${lv}`;
  }

  fenceMask(b) {
    const at = (x, y) => this.buildings.some(o => o.type === 'fence' && o.x === x && o.y === y);
    return (at(b.x, b.y - 1) ? 1 : 0) | (at(b.x + 1, b.y) ? 2 : 0) | (at(b.x, b.y + 1) ? 4 : 0) | (at(b.x - 1, b.y) ? 8 : 0);
  }

  // state.buildings와 화면을 맞춤 (생긴 것 만들고, 없어진 것 지우고, 바뀐 것 고침)
  sync() {
    const alive = new Set();
    for (const b of this.buildings) {
      alive.add(b.uid);
      if (!this.views.has(b.uid)) this.create(b);
      this.update(b);
    }
    for (const [uid, v] of this.views) if (!alive.has(uid)) { this.destroyView(v); this.views.delete(uid); }
  }

  create(b) {
    const s = this.scene;
    const v = { b, key: '' };
    v.img = s.add.image(0, 0, '__DEFAULT').setScale(sc);
    v.shadow = s.add.image(0, 0, 'shadow').setVisible(false);
    v.scaffold = s.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setScale(sc).setVisible(false);
    v.planks = s.add.image(0, 0, 'planks').setOrigin(0.5, 1).setScale(sc).setVisible(false);
    v.hammer = s.add.image(0, 0, 'hammer').setScale(0.55).setVisible(false);
    s.tweens.add({ targets: v.hammer, angle: { from: -25, to: 20 }, duration: 260, yoyo: true, repeat: -1, ease: 'Quad.easeIn' });
    v.bar = s.add.graphics().setVisible(false);
    v.label = s.add.text(0, 0, '', {
      fontFamily: 'Jua, sans-serif', fontSize: '13px', color: '#5b4636', stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5, 1).setResolution(Math.max(2, s.dpr * 2)).setVisible(false);
    this.views.set(b.uid, v);
    return v;
  }

  geometry(b) {
    const { w, h } = sizeOf(b.type, b.rot);
    return { w, h, cx: (b.x + w / 2) * TILE, bottom: (b.y + h) * TILE, left: b.x * TILE, top: b.y * TILE };
  }

  update(b) {
    const v = this.views.get(b.uid);
    if (!v) return;
    const g = this.geometry(b);
    const tex = this.textureFor(b);
    const hidden = this.hidden.has(b.uid);
    const key = [tex, b.x, b.y, b.rot, b.level, !!b.job, hidden].join('|');
    if (key !== v.key) {
      v.key = key;
      const d = def(b.type);
      v.img.setTexture(tex).setVisible(b.level > 0 && !hidden).setAlpha(1);
      v.img.setFlipX(d.turn === 'flip' && b.rot % 2 === 1);
      if (d.walkable) {
        v.img.setOrigin(0).setPosition(g.left, g.top).setDepth(-6.5);
      } else {
        const lift = b.type === 'fence' || b.type === 'flowerbed' ? 4 : 6;
        v.img.setOrigin(0.5, 1).setPosition(g.cx, g.bottom + lift).setDepth(g.bottom);
      }
      const tall = !d.walkable && b.type !== 'fence' && b.type !== 'flowerbed';
      v.shadow.setVisible(tall && b.level > 0 && !hidden).setPosition(g.cx, g.bottom - 6).setScale(0.6 * g.w, 0.9).setDepth(g.bottom - 1);
      // 공사 중
      const working = !!b.job && !hidden;
      if (working) v.scaffold.setTexture(scaffoldKey(this.scene, g.w, g.h));
      v.scaffold.setVisible(working).setPosition(g.cx, g.bottom + 6).setDepth(g.bottom + 1).setAlpha(b.level > 0 ? 0.92 : 1);
      v.planks.setVisible(working && b.level === 0).setPosition(g.cx + g.w * TILE * 0.32, g.bottom + 2).setDepth(g.bottom + 2);
      v.hammer.setVisible(working);
      v.bar.setVisible(working);
      v.label.setVisible(working);
      v.topY = g.bottom + 6 - TILE * (g.h + 1.1);
    }
    if (b.job && !hidden) this.drawProgress(b, v, g);
  }

  drawProgress(b, v, g) {
    const t = now();
    const W = Math.max(56, g.w * TILE * 0.8), H = 9;
    const x = g.cx - W / 2, y = v.topY - 6;
    v.bar.clear().setDepth(150000);
    v.bar.fillStyle(0xffffff, 0.95).fillRoundedRect(x - 3, y - 3, W + 6, H + 6, 7);
    v.bar.fillStyle(0xefe2cc, 1).fillRoundedRect(x, y, W, H, 4);
    const p = progress(b, t);
    if (p > 0.02) v.bar.fillStyle(0x8fd19e, 1).fillRoundedRect(x, y, W * p, H, 4);
    v.label.setText(formatLeft(Math.max(1000, leftMs(b, t)))).setPosition(g.cx, y - 4).setDepth(150001);
    v.hammer.setPosition(g.cx + W / 2 + 14, y + 2).setDepth(150001);
  }

  // 1초마다: 막대와 남은 시간 고치기
  tick() {
    for (const b of this.buildings) if (b.job) this.update(b);
  }

  setHidden(uid, on) {
    if (on) this.hidden.add(uid); else this.hidden.delete(uid);
    const b = this.buildings.find(x => x.uid === uid);
    if (b) this.update(b);
  }

  // 화면 좌표(칸)에 있는 건물 찾기. 키 큰 건물은 지붕(한 칸 위)도 포함
  hit(tx, ty, { walkable = true } = {}) {
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      const d = def(b.type);
      if (d.walkable && !walkable) continue;
      const { w, h } = sizeOf(b.type, b.rot);
      const roof = h > 1 && !d.walkable ? 1 : 0;
      if (tx >= b.x && tx < b.x + w && ty >= b.y - roof && ty < b.y + h) return b;
    }
    return null;
  }

  // 완성 연출: 공사 틀이 '퐁' 사라지고 반짝이가 터짐
  celebrate(b) {
    const s = this.scene, v = this.views.get(b.uid);
    if (!v) return;
    const g = this.geometry(b);
    const cy = g.bottom - g.h * TILE * 0.6;
    // 사라지는 공사 틀 (복사본)
    const ghost = s.add.image(g.cx, g.bottom + 6, scaffoldKey(s, g.w, g.h)).setOrigin(0.5, 1).setScale(sc).setDepth(g.bottom + 3);
    s.tweens.add({ targets: ghost, scaleX: sc * 1.25, scaleY: sc * 1.25, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => ghost.destroy() });
    // 건물이 통통
    const base = v.img.scaleX;
    v.img.setScale(base * 0.82, base * 1.2);
    s.tweens.add({ targets: v.img, scaleX: base, scaleY: base, duration: 520, ease: 'Back.easeOut' });
    // 반짝이 + 하트
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 30 * g.w;
      const key = i % 6 === 0 ? 'heart' : 'sparkle';
      const sp = s.add.image(g.cx, cy, key).setScale(key === 'heart' ? 0.4 : 0.6).setDepth(150002)
        .setTint(key === 'heart' ? 0xffffff : [0xfff2a8, 0xffffff, 0xffc6d4][i % 3]);
      s.tweens.add({ targets: sp, x: g.cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7 - 20, scale: 0, angle: 180, duration: 700 + Math.random() * 300, ease: 'Quad.easeOut', onComplete: () => sp.destroy() });
    }
  }

  // 바로 지어지는 꾸미기를 놓았을 때 작은 '퐁'
  poof(b) {
    const s = this.scene, v = this.views.get(b.uid);
    if (!v) return;
    const g = this.geometry(b);
    const base = v.img.scaleX;
    v.img.setScale(base * 0.7, base * 1.25);
    s.tweens.add({ targets: v.img, scaleX: base, scaleY: base, duration: 300, ease: 'Back.easeOut' });
    for (let i = 0; i < 6; i++) {
      const sp = s.add.image(g.cx, g.bottom - 12, 'sparkle').setScale(0.4).setDepth(150002).setTint(0xfff2a8);
      const a = Math.random() * Math.PI * 2;
      s.tweens.add({ targets: sp, x: g.cx + Math.cos(a) * 26, y: g.bottom - 12 + Math.sin(a) * 18, scale: 0, duration: 420, onComplete: () => sp.destroy() });
    }
  }

  destroyView(v) {
    for (const k of ['img', 'shadow', 'scaffold', 'planks', 'hammer', 'bar', 'label']) v[k].destroy();
  }
}

