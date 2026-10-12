// 건물 놓기·옮기기 모드: 반투명 건물(미리보기)을 칸 위에 띄우고
// 놓을 수 있으면 초록, 못 놓으면 빨강 칸으로 보여줘.
import { TILE } from '../data/map.js';
import { def, sizeOf } from '../core/build.js';
import { RES } from './textures.js';

const sc = 1 / RES;

export class Placer {
  // opts: { type, moveUid, x, y, rot, texture(b) → 그림 키, check(type,x,y,rot,ignore) → {ok,reason}, onChange }
  constructor(scene, opts) {
    this.scene = scene;
    Object.assign(this, { type: opts.type, moveUid: opts.moveUid || null, rot: opts.rot || 0, level: opts.level || 1 });
    this.texture = opts.texture;
    this.check = opts.check;
    this.onChange = opts.onChange;
    this.placedCount = 0;
    this.cellsG = scene.add.graphics().setDepth(149000);
    this.img = scene.add.image(0, 0, '__DEFAULT').setScale(sc).setAlpha(0.82).setDepth(149500);
    scene.tweens.add({ targets: this.img, alpha: { from: 0.65, to: 0.9 }, duration: 600, yoyo: true, repeat: -1 });
    this.setPos(opts.x, opts.y, true);
  }

  get size() { return sizeOf(this.type, this.rot); }
  get canTurn() { return !!def(this.type).turn; }

  setPos(x, y, force = false) {
    const { w, h } = this.size;
    const W = this.scene.map.width, H = this.scene.map.height;
    x = Math.max(0, Math.min(W - w, x)); y = Math.max(0, Math.min(H - h, y));
    if (!force && x === this.x && y === this.y) return;
    this.x = x; this.y = y;
    this.redraw();
  }

  // 화면을 누른 칸이 건물 가운데가 되게
  centerOn(tx, ty) {
    const { w, h } = this.size;
    this.setPos(tx - Math.floor((w - 1) / 2), ty - (h - 1));
  }

  rotate() {
    if (!this.canTurn) return;
    this.rot = (this.rot + 1) % 2;
    this.setPos(this.x, this.y, true);
  }

  redraw() {
    const { w, h } = this.size;
    const d = def(this.type);
    this.result = this.check(this.type, this.x, this.y, this.rot, this.moveUid);
    const ok = this.result.ok;
    // 칸 표시
    const g = this.cellsG.clear();
    for (let cy = this.y; cy < this.y + h; cy++) for (let cx = this.x; cx < this.x + w; cx++) {
      g.fillStyle(ok ? 0x8fd19e : 0xf39b8e, 0.5).fillRoundedRect(cx * TILE + 2, cy * TILE + 2, TILE - 4, TILE - 4, 8);
      g.lineStyle(2, 0xffffff, 0.9).strokeRoundedRect(cx * TILE + 2, cy * TILE + 2, TILE - 4, TILE - 4, 8);
    }
    // 미리보기 그림
    const fake = { type: this.type, x: this.x, y: this.y, rot: this.rot, level: this.level };
    this.img.setTexture(this.texture(fake)).setFlipX(d.turn === 'flip' && this.rot % 2 === 1);
    if (d.walkable) this.img.setOrigin(0).setPosition(this.x * TILE, this.y * TILE);
    else this.img.setOrigin(0.5, 1).setPosition((this.x + w / 2) * TILE, (this.y + h) * TILE + 6);
    this.img.setTint(ok ? 0xffffff : 0xffb4b4);
    this.onChange?.(this);
  }

  // 손가락이 미리보기 위를 눌렀는지 (끌어서 옮기기용)
  hit(tx, ty) {
    const { w, h } = this.size;
    return tx >= this.x && tx < this.x + w && ty >= this.y - (h > 1 ? 1 : 0) && ty < this.y + h;
  }

  get centerX() { return (this.x + this.size.w / 2) * TILE; }
  get centerY() { return (this.y + this.size.h / 2) * TILE; }

  destroy() { this.cellsG.destroy(); this.img.destroy(); }
}
