// 캐릭터 한 명 (촌장 또는 주민)
// 그림 한 장으로 자연스럽게 움직이게: 통통 튀며 걷기, 숨쉬기, 좌우 보기, 기쁨 점프
import { POSE_IMAGES, poseKey } from '../data/assets.js';
import { TILE } from '../data/map.js';
import { FONT } from '../i18n.js';

const HEIGHT = 66;          // 화면에서 보이는 키 (월드 픽셀)
const SMALL_TEX = 128;      // 작게 보일 때 쓰는 미리 줄인 그림 높이

export class Character {
  constructor(scene, id, x, y, opts = {}) {
    this.scene = scene;
    this.id = id;
    this.x = x; this.y = y;
    this.speed = opts.speed ?? 150;
    this.path = [];
    this.moving = false;
    this.walkPhase = 0;
    this.t = Math.random() * 10;
    this.facing = 1;          // 1 = 오른쪽, -1 = 왼쪽
    this.pose = null;         // 지금 보여주는 포즈 그림
    this.poseUntil = 0;
    this.jumpT = 0;           // 기쁨 점프 진행 (0이면 안 함)
    this.useSmall = null;

    this.shadow = scene.add.image(x, y, 'shadow').setScale(0.36, 0.36).setAlpha(0.9);
    this.sprite = scene.add.image(x, y, id).setOrigin(0.5, 1);
    this.setTexture(id);
  }

  setTexture(key) {
    this.texKey = key;
    this.useSmall = null;     // 다음 update에서 크기에 맞는 그림을 다시 고름
    this.applyLod(true);
  }

  // 화면에서 작게 보이면 미리 줄인 그림, 크게 보이면 원본 그림 사용
  applyLod(force = false) {
    const zoom = this.scene.cameras.main.zoom;
    const small = HEIGHT * zoom < 100 && this.scene.textures.exists(this.texKey + '_s');
    if (!force && small === this.useSmall) return;
    this.useSmall = small;
    this.sprite.setTexture(small ? this.texKey + '_s' : this.texKey);
    const isPose = this.texKey !== this.id;
    // 포즈 그림은 원본 기준으로 크기를 맞춤 (누운 그림이 커지지 않게)
    const baseH = this.scene.textures.get(this.id).getSourceImage().height;
    const texH = this.scene.textures.get(this.texKey).getSourceImage().height;
    const srcH = small ? this.sprite.texture.getSourceImage().height : texH;
    const ratio = isPose ? texH / baseH : 1;
    this.baseScale = (HEIGHT * ratio) / srcH;
  }

  get tileX() { return Math.floor(this.x / TILE); }
  get tileY() { return Math.floor(this.y / TILE); }

  // 칸 목록을 따라 걷기
  // onArrive: 도착하면 실행할 일 (예: 밭에 도착하면 심기)
  walkPath(tiles, onArrive = null) {
    this.path = tiles.map(p => ({ x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 + 6 }));
    this.moving = this.path.length > 0;
    this.onArrive = onArrive;
    if (!this.moving && onArrive) { this.onArrive = null; onArrive(); }
  }

  stop() { this.path = []; this.moving = false; this.onArrive = null; }

  // 포즈 그림을 바로 끝내고 기본 그림으로
  clearPose() { if (this.pose) { this.pose = null; this.setTexture(this.id); } }

  // 머리 위 작은 표시 (📜 의뢰 있음, ✨ 완료 가능 등). null이면 지움
  setBadge(text) {
    if ((this.badgeText || null) === (text || null)) return;
    this.badgeText = text || null;
    if (!text) { this.badge?.destroy(); this.badge = null; return; }
    if (!this.badge) {
      this.badge = this.scene.add.text(this.x, this.y, '', { fontFamily: FONT, fontSize: '20px' })
        .setOrigin(0.5, 1).setResolution(Math.max(2, (this.scene.dpr || 1) * 2));
      this.scene.tweens.add({ targets: this.badge, scale: { from: 0.9, to: 1.1 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.badge.setText(text);
  }

  faceTowards(x) { if (Math.abs(x - this.x) > 2) this.facing = x < this.x ? -1 : 1; }

  // 기쁨 반응: 포즈 그림이 있으면 그 그림, 없으면 콩 점프 + 하트
  cheer() {
    this.jumpT = 0.0001;
    this.showPose('happy', 1400);
    const heart = this.scene.add.image(this.x, this.y - HEIGHT - 6, 'heart').setScale(0.5).setDepth(this.y + 1000);
    this.scene.tweens.add({ targets: heart, y: heart.y - 34, alpha: 0, scale: 0.8, duration: 1100, ease: 'Sine.easeOut', onComplete: () => heart.destroy() });
  }

  showPose(pose, ms) {
    if (!POSE_IMAGES[this.id]?.[pose]) return false;
    this.pose = pose;
    this.poseUntil = this.scene.time.now + ms;
    this.setTexture(poseKey(this.id, pose));
    return true;
  }

  // 매 프레임 호출. dt = 지난 프레임 이후 초
  update(dt, speedMul = 1) {
    this.t += dt;
    this._dt = dt;
    if (this.pose && this.scene.time.now > this.poseUntil) { this.pose = null; this.setTexture(this.id); }

    // 길 따라 걷기
    if (this.path.length) {
      const target = this.path[0];
      const dx = target.x - this.x, dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = this.speed * speedMul * dt;
      if (dist <= step) {
        this.x = target.x; this.y = target.y; this.path.shift();
      } else {
        this.x += dx / dist * step; this.y += dy / dist * step;
      }
      this.faceTowards(target.x);
      this.walkPhase += step / 22;
      this.moving = this.path.length > 0;
      if (!this.moving && this.onArrive) { const cb = this.onArrive; this.onArrive = null; cb(); }
    }
    this.render();
  }

  // 키보드로 직접 움직일 때 (scene이 충돌 검사 후 호출)
  nudge(nx, ny, stepLen) {
    if (nx !== this.x) this.faceTowards(nx);
    this.x = nx; this.y = ny;
    this.walkPhase += stepLen / 22;
  }

  render() {
    this.applyLod();
    let hop = 0, sx = 1, sy = 1;
    const walking = this.moving || this.keyMoving;
    if (walking) {
      // 통통 튀기: 공중에선 살짝 늘어나고, 땅에 닿을 땐 살짝 찌그러짐
      const s = Math.sin(this.walkPhase * Math.PI);
      hop = Math.abs(s) * 7;
      const land = 1 - Math.abs(s);
      sx = 1 + land * 0.07 - Math.abs(s) * 0.03;
      sy = 1 - land * 0.07 + Math.abs(s) * 0.04;
    } else {
      // 숨쉬기
      // 잘 때는 느리고 크게 숨쉬기
      const b = this.sleepy ? Math.sin(this.t * 1.1) * 0.035 : Math.sin(this.t * 2.2) * 0.018;
      sx = 1 - b * 0.5; sy = 1 + b;
      this.walkPhase = 0;
    }
    if (this.jumpT > 0) {
      this.jumpT += this._dt || 1 / 60;
      const p = Math.min(this.jumpT / 0.5, 1);
      hop += Math.sin(p * Math.PI) * 22;
      if (p < 0.15) { sx *= 1.1; sy *= 0.9; }
      if (p >= 1) this.jumpT = 0;
    }
    this.sprite.setPosition(this.x, this.y - hop);
    this.sprite.setScale(this.baseScale * sx * this.facing, this.baseScale * sy);
    this.sprite.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 2);
    const sh = 0.36 * (1 - hop / 60);
    this.shadow.setScale(sh, sh).setDepth(this.y - 0.5);
    if (this.badge) this.badge.setPosition(this.x, this.y - HEIGHT - 8 - hop).setDepth(this.y + 2000).setVisible(!this.bubble);
  }

  containsPoint(px, py) {
    return Math.abs(px - this.x) < 26 && py < this.y + 6 && py > this.y - HEIGHT - 4;
  }

  get headY() { return this.y - HEIGHT; }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.badge?.destroy(); }
}

export { HEIGHT as CHARACTER_HEIGHT, SMALL_TEX };
