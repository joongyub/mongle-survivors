// 마을 화면: 타일 지도 그리기, 캐릭터 움직이기, 카메라
import { TILE, MAP_ROWS, LEGEND, GROUND_RULES, OBJECT_RULES, START_POS } from '../data/map.js';
import { BUILDINGS, GATHER } from '../data/buildings.js';
import { parseMap, buildBlocked, isWalkable, findPath, smoothPath, nearestWalkable, reachable } from '../core/grid.js';
import { skyTint, now, dayKey } from '../core/clock.js';
import { state, emit, on, farmMods, buildMods, applyEffects, TUT_END } from '../state/GameState.js';
import * as Farm from '../core/farm.js';
import * as Build from '../core/build.js';
import { count, add as addItem } from '../core/inventory.js';
import { CROP_BY_ID, seedId } from '../data/crops.js';
import { FarmView } from '../view/FarmView.js';
import { BuildingView } from '../view/BuildingView.js';
import { Placer } from '../view/Placer.js';
import { openBag } from '../ui/bag.js';
import { openSeedShop, openShipBox } from '../ui/shop.js';
import { openBuildingPanel, shownBuilding, buildingName, effectText } from '../ui/buildingPanel.js';
import { isPanelOpen, closePanel } from '../ui/panel.js';
import { sfx } from '../audio.js';
import { RES, hash, makeBlob } from '../view/textures.js';
import { Character, CHARACTER_HEIGHT } from '../view/Character.js';
import { ResidentAI } from '../view/ResidentAI.js';
import { openTalk } from '../ui/talk.js';
import { refreshQuestsNow, questOf, questReady } from '../ui/questPanel.js';
import { isBirthday } from '../core/residents.js';
import { CameraController } from '../view/CameraController.js';
import { toast } from '../ui/toast.js';
import { t, itemName, resText, FONT } from '../i18n.js';

const DRAG_START = 10;     // 이만큼(화면 픽셀) 움직이면 "끌기"로 판단
const LONG_PRESS = 480;    // 이만큼(밀리초) 꾹 누르면 "길게 누르기"
const NEXT_UID = () => 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export class VillageScene extends Phaser.Scene {
  constructor() { super('Village'); }

  init(data) { this.dpr = data.dpr || 1; }

  create() {
    this.map = parseMap(MAP_ROWS, LEGEND);
    this.worldW = this.map.width * TILE;
    this.worldH = this.map.height * TILE;
    this.objectTypes = new Map(this.map.objects.map(o => [`${o.x},${o.y}`, o.type]));
    this.rebuildBlocked();
    this.heldSeed = null;           // 들고 있는 씨앗 (작물 아이디)
    this.placer = null;             // 건물 놓기 모드일 때만 있음

    this.drawGround();
    this.drawObjects();
    this.buildingView = new BuildingView(this, state.buildings);
    this.farmView = new FarmView(this, state.farm.plots, farmMods);
    this.createCharacters();
    this.createSky();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.farmView.tick(); this.buildTick(); this.questTick(); this.updateBadges(); } });
    this.events.on('crop-ripe', () => { if (state.tutorial.step === 2) this.setTutorial(3); });
    on('hold-seed', cropId => this.setHeldSeed(cropId));
    on('sold', () => { if (state.tutorial.step === 4) { this.setTutorial(5); this.guideSay('tut.say.4', 'dodo'); } });

    this.camCtl = new CameraController(this, this.worldW, this.worldH, this.dpr);
    this.camCtl.follow(this.player);
    this.cameras.main.centerOn(this.player.x, this.player.y);

    this.setupPointer();
    this.setupKeyboard();
    this.time.addEvent({ delay: 650, loop: true, callback: () => this.waterSparkle() });
    this.time.addEvent({ delay: 30000, loop: true, callback: () => this.updateSky() });

    this.scale.on('resize', () => this.camCtl.resize());
    this.game.events.emit('village-ready', this);
    if (state.tutorial.step === 0) this.time.delayedCall(1200, () => this.guideSay('tut.say.0'));
    this.checkTutorial();
    refreshQuestsNow();
    this.updateBadges();
    on('change', () => this.updateBadges());
  }

  // 막힌 칸 표를 다시 만듦 (건물을 짓거나 옮기면)
  rebuildBlocked() {
    const plotCells = state.farm.plots.map(p => ({ x: p.x, y: p.y, w: 1, h: 1 }));
    const bCells = state.buildings.filter(b => !Build.isWalkableBuilding(b.type))
      .map(b => ({ x: b.x, y: b.y, ...Build.sizeOf(b.type, b.rot) }));
    this.blocked = buildBlocked(this.map, GROUND_RULES, OBJECT_RULES, [...plotCells, ...bCells]);
    this.pathTiles = new Set(state.buildings.filter(b => b.type === 'stonepath').map(b => `${b.x},${b.y}`));
  }

  // ---------- 땅 ----------
  drawGround() {
    const { width: W, height: H, ground } = this.map;
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : ground[y][x];
    const sc = 1 / RES;
    this.add.tileSprite(0, 0, this.worldW, this.worldH, 'grass').setOrigin(0).setTileScale(sc).setDepth(-10);
    // 모래는 물 아래까지 이어서 깔고, 그 위에 물, 길을 그림
    const layers = [
      { kind: 'sand', match: g => g === 'sand' || g === 'water', depth: -9 },
      { kind: 'water', match: g => g === 'water', depth: -8 },
      { kind: 'path', match: g => g === 'path', depth: -7 },
    ];
    for (const L of layers) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!L.match(at(x, y))) continue;
        const m = (dx, dy) => { const g = at(x + dx, y + dy); return g === null ? true : L.match(g); };
        const mask = (m(0, -1) ? 1 : 0) | (m(1, 0) ? 2 : 0) | (m(0, 1) ? 4 : 0) | (m(-1, 0) ? 8 : 0)
          | (m(1, -1) ? 16 : 0) | (m(1, 1) ? 32 : 0) | (m(-1, 1) ? 64 : 0) | (m(-1, -1) ? 128 : 0);
        this.add.image(x * TILE, y * TILE, makeBlob(this, L.kind, mask)).setOrigin(0).setDisplaySize(TILE + 0.5, TILE + 0.5).setDepth(L.depth);
      }
    }
  }

  // ---------- 나무, 바위, 꽃 ----------
  drawObjects() {
    const sc = 1 / RES;
    this.objectAt = {};
    for (const o of this.map.objects) {
      const cx = o.x * TILE + TILE / 2, bottom = o.y * TILE + TILE;
      let img;
      if (o.type === 'tree') {
        const v = hash(o.x, o.y, 3) < 0.25 ? 1 : 0;
        this.add.image(cx, bottom - 4, 'shadow').setScale(0.55, 0.5).setDepth(bottom - 1);
        img = this.add.image(cx + (hash(o.x, o.y, 5) - 0.5) * 10, bottom + 2, 'tree' + v).setOrigin(0.5, 1).setScale(sc);
        // 바람에 살랑살랑
        this.tweens.add({ targets: img, angle: { from: -1.2, to: 1.2 }, duration: 1800 + hash(o.x, o.y, 7) * 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: hash(o.x, o.y, 8) * 1500 });
      } else if (o.type === 'sprout') {
        img = this.add.image(o.x * TILE, o.y * TILE, 'sprout').setOrigin(0).setScale(sc);
        img.setDepth(-6);
        continue;
      } else {
        img = this.add.image(cx, bottom + 2, o.type).setOrigin(0.5, 1).setScale(sc);
      }
      img.setDepth(bottom);
      o.img = img;
      this.objectAt[`${o.x},${o.y}`] = o;
    }
  }

  // ---------- 캐릭터 ----------
  createCharacters() {
    // 저장된 자리가 있으면 거기서 시작
    const sp = state.player && isWalkable(this.blocked, state.player.x, state.player.y) ? state.player : START_POS;
    const px = sp.x * TILE + TILE / 2, py = sp.y * TILE + TILE / 2 + 6;
    this.player = new Character(this, state.mayor.residentId, px, py, { speed: 160 });
    // 주민: 지금 시각에 맞는 자리에서 시작 (밤이면 이미 자고 있음)
    this.residents = Object.keys(state.residents).map(id => new Character(this, id, px, py, { speed: 80 }));
    this.residentAI = new ResidentAI(this, this.residents);
    this.residentAI.placeAll();
    this.pendingTalk = null;
    // 이동 목표 표시
    this.targetMark = this.add.image(0, 0, 'target').setScale(0.5).setVisible(false).setDepth(-5);
    this.tweens.add({ targets: this.targetMark, scale: { from: 0.42, to: 0.55 }, alpha: { from: 1, to: 0.5 }, duration: 500, yoyo: true, repeat: -1 });
  }

  // ---------- 낮/밤 ----------
  createSky() {
    this.sky = this.add.rectangle(-200, -200, this.worldW + 400, this.worldH + 400, 0xffffff, 0).setOrigin(0).setDepth(100000);
    this.updateSky();
  }

  updateSky() {
    const { color, alpha } = skyTint();
    this.sky.setFillStyle(color, alpha);
  }

  waterSparkle() {
    const cam = this.cameras.main.worldView;
    for (let tries = 0; tries < 6; tries++) {
      const x = Math.floor((cam.x + Math.random() * cam.width) / TILE);
      const y = Math.floor((cam.y + Math.random() * cam.height) / TILE);
      if (this.map.ground[y]?.[x] !== 'water') continue;
      const s = this.add.image(x * TILE + Math.random() * TILE, y * TILE + Math.random() * TILE, 'sparkle').setScale(0).setDepth(-6).setAlpha(0.9);
      this.tweens.add({ targets: s, scale: 0.6, duration: 450, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => s.destroy() });
      return;
    }
  }

  // ---------- 말풍선 ----------
  speech(ch, text) {
    // 말풍선은 한 번에 하나만
    for (const c of [this.player, ...this.residents]) if (c.bubble) { c.bubble.destroy(); c.bubble = null; }
    const res = Math.max(2, this.dpr * 2);
    const label = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: '15px', color: '#5b4636', align: 'center', wordWrap: { width: 170 } }).setOrigin(0.5).setResolution(res);
    const w = label.width + 22, h = label.height + 14;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.fillTriangle(-7, h / 2 - 1, 7, h / 2 - 1, 0, h / 2 + 9);
    g.lineStyle(2, 0xf0dfc4).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    const box = this.add.container(ch.x, ch.headY - h / 2 - 14, [g, label]).setDepth(200000).setScale(0.6).setAlpha(0);
    box.follow = ch; box.h = h;
    this.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.time.delayedCall(2600, () => this.tweens.add({ targets: box, alpha: 0, duration: 250, onComplete: () => { box.destroy(); if (ch.bubble === box) ch.bubble = null; } }));
    ch.bubble = box;
  }

  // ---------- 입력: 터치/마우스 ----------
  setupPointer() {
    this.input.addPointer(2);
    this.touches = new Map();
    this.gesture = null;

    this.input.on('pointerdown', p => {
      this.touches.set(p.id, { x: p.x, y: p.y });
      if (this.touches.size === 2) {
        const [a, b] = [...this.touches.values()];
        this.gesture = { type: 'pinch', dist: Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        this.camCtl.unfollow();
      } else if (this.touches.size === 1) {
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
        // 건물 놓기 모드: 미리보기를 잡으면 끌어서 옮김
        if (this.placer && this.placer.hit(tx, ty)) {
          this.gesture = { type: 'ghost', offX: tx - this.placer.x, offY: ty - this.placer.y };
          return;
        }
        const g = this.gesture = { type: 'maybeTap', sx: p.x, sy: p.y, lx: p.x, ly: p.y };
        if (!this.placer) this.time.delayedCall(LONG_PRESS, () => { if (this.gesture === g && g.type === 'maybeTap' && this.onLongPress(w.x, w.y)) g.type = 'long'; });
      }
    });

    this.input.on('pointermove', p => {
      if (!this.touches.has(p.id) || !p.isDown) return;
      this.touches.set(p.id, { x: p.x, y: p.y });
      const g = this.gesture;
      if (!g) return;
      if (g.type === 'pinch' && this.touches.size >= 2) {
        const [a, b] = [...this.touches.values()];
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (g.dist > 0) this.camCtl.zoomAt(dist / g.dist, mid.x, mid.y);
        this.camCtl.panBy(mid.x - g.mid.x, mid.y - g.mid.y);
        g.dist = dist; g.mid = mid;
      } else if (g.type === 'ghost') {
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        this.placer.setPos(Math.floor(w.x / TILE) - g.offX, Math.floor(w.y / TILE) - g.offY);
        return;
      } else if (g.type === 'maybeTap') {
        if (Math.hypot(p.x - g.sx, p.y - g.sy) > DRAG_START * this.dpr) { g.type = 'drag'; }
      }
      if (g.type === 'drag') {
        this.camCtl.panBy(p.x - g.lx, p.y - g.ly);
        g.lx = p.x; g.ly = p.y;
      }
    });

    const end = p => {
      if (!this.touches.has(p.id)) return;
      this.touches.delete(p.id);
      const g = this.gesture;
      if (g?.type === 'maybeTap' && this.touches.size === 0) {
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        if (this.placer) this.placer.centerOn(Math.floor(w.x / TILE), Math.floor(w.y / TILE));
        else this.onTap(w.x, w.y);
      }
      if (this.touches.size === 0) this.gesture = null;
      else if (g?.type === 'pinch') this.gesture = { type: 'drag', lx: [...this.touches.values()][0].x, ly: [...this.touches.values()][0].y };
    };
    this.input.on('pointerup', end);
    this.input.on('pointerupoutside', end);

    this.input.on('wheel', (p, objs, dx, dy) => {
      this.camCtl.unfollow();
      this.camCtl.zoomAt(dy > 0 ? 0.9 : 1.1, p.x, p.y);
    });
  }

  onTap(wx, wy) {
    // 1) 주민을 눌렀나?
    const r = this.residents.find(c => c.containsPoint(wx, wy));
    if (r) { this.talkTo(r); return; }
    if (this.player.containsPoint(wx, wy)) {
      this.player.cheer();
      this.speech(this.player, resText(this.player.id, 'catchphrase'));
      return;
    }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    // 2) 건물을 눌렀나? (길은 그냥 걸어감)
    const b = this.buildingView.hit(tx, ty, { walkable: false });
    if (b) {
      if (BUILDINGS[b.type].action && b.level > 0) {
        const { w, h } = Build.sizeOf(b.type, b.rot);
        this.walkTo(b.x + Math.floor(w / 2), b.y + h, true, () => this.useBuilding(b));
      } else openBuildingPanel(b, this);
      return;
    }
    // 밭을 눌렀나?
    const plot = state.farm.plots.find(p => p.x === tx && p.y === ty);
    if (plot) { this.goToPlot(plot); return; }
    // 3) 나무·바위는 재료 모으기, 표지판은 글
    const o = this.objectAt[`${tx},${ty}`];
    if (o && GATHER[o.type]) { this.goGather(o); return; }
    if (o && OBJECT_RULES[o.type]?.message) toast(t(OBJECT_RULES[o.type].message));
    this.walkTo(tx, ty, !!o);
  }

  // 길게 누르기: 건물이면 건물 창 (옮기기·업그레이드)
  onLongPress(wx, wy) {
    const b = this.buildingView.hit(Math.floor(wx / TILE), Math.floor(wy / TILE));
    if (!b) return false;
    try { navigator.vibrate?.(15); } catch { /* 진동 없는 기기 */ }
    sfx('tap');
    openBuildingPanel(b, this);
    return true;
  }

  walkTo(tx, ty, near = false, onArrive = null) {
    this.cancelPendingTalk();
    let goal = { x: tx, y: ty };
    if (!isWalkable(this.blocked, tx, ty)) {
      goal = nearestWalkable(this.blocked, tx, ty, near ? 3 : 1);
      if (!goal) { toast(t('village.cantGo')); return; }
    }
    const p = this.player;
    const raw = findPath(this.blocked, p.tileX, p.tileY, goal.x, goal.y);
    if (!raw) { toast(t('village.cantGo')); return; }
    p.walkPath(smoothPath(this.blocked, p.tileX, p.tileY, raw), onArrive);
    this.targetMark.setPosition(goal.x * TILE + TILE / 2, goal.y * TILE + TILE / 2 + 6).setVisible(true);
    this.camCtl.focusPlayer();
  }

  // ---------- 주민과 이야기 ----------
  // 주민 옆으로 걸어가서 대화 창을 엶. 길이 막혀 있어도 대화는 됨 (못 만나는 일 없게)
  talkTo(r) {
    if (this.talkingWith) return;
    this.cancelPendingTalk();
    const { woke } = this.residentAI.hold(r);
    const p = this.player;
    const open = () => {
      this.pendingTalk = null;
      this.targetMark.setVisible(false);
      r.faceTowards(p.x); p.faceTowards(r.x);
      this.talkingWith = r;
      openTalk(this, r, { woke });
    };
    if (Math.abs(p.x - r.x) < TILE * 1.7 && Math.abs(p.y - r.y) < TILE * 1.3) { p.stop(); open(); return; }
    const side = p.x < r.x ? -1 : 1;
    const goal = [[side, 0], [-side, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: r.tileX + dx, y: r.tileY + dy }))
      .find(g => isWalkable(this.blocked, g.x, g.y)) || nearestWalkable(this.blocked, r.tileX, r.tileY, 3);
    const raw = goal && findPath(this.blocked, p.tileX, p.tileY, goal.x, goal.y);
    if (!raw) { p.stop(); open(); return; }
    this.pendingTalk = { r, cb: open };
    p.walkPath(smoothPath(this.blocked, p.tileX, p.tileY, raw), open);
    this.targetMark.setPosition(goal.x * TILE + TILE / 2, goal.y * TILE + TILE / 2 + 6).setVisible(true);
    this.camCtl.focusPlayer();
  }

  // 걸어가는 도중에 다른 곳을 누르면 대화 약속 취소
  cancelPendingTalk() {
    if (!this.pendingTalk) return;
    this.residentAI.release(this.pendingTalk.r);
    this.pendingTalk = null;
  }

  // 대화 상자 높이만큼 카메라를 올려서 두 캐릭터가 보이게
  liftFor(panelEl) {
    const p = this.player, r = this.talkingWith;
    if (!panelEl || !r) return;
    const top = Math.min(p.y, r.y) - CHARACTER_HEIGHT, bottom = Math.max(p.y, r.y);
    this.camCtl.showAbove((p.x + r.x) / 2, (top + bottom) / 2, window.innerHeight - panelEl.offsetTop);
  }

  endTalk(r) {
    this.talkingWith = null;
    this.camCtl.focusPlayer();
    this.residentAI.release(r);
    this.updateBadges();
  }

  // 주민 머리 위로 글자 (+2 ♥ 등) + 기쁨 점프
  residentCheer(id, text) {
    const r = this.residents.find(c => c.id === id);
    if (!r) return;
    if (this.residentAI.isAsleep(r)) return;
    r.cheer();
    if (text) this.floatOver(r, text, '#e0708a');
    sfx('heart');
  }

  // 선물 반응: 좋아함 = 하트 펑펑, 보통 = 기쁨, 싫어함 = 시무룩 (그래도 호감도는 안 깎임)
  giftReaction(r, reaction, gain, birthday) {
    if (reaction === 'dislike') {
      if (!r.showPose('sad', 1800)) this.tweens.add({ targets: r, x: r.x + 3, duration: 70, yoyo: true, repeat: 3 });
      this.floatOver(r, '💦', '#6a9ad0');
      sfx('tap');
      return;
    }
    r.cheer();
    sfx('gift');
    if (gain) this.floatOver(r, '+' + gain + ' ♥', '#e0708a');
    if (reaction === 'love' || birthday) this.heartBurst(r, birthday ? 16 : 9);
  }

  heartBurst(ch, n = 9) {
    const cx = ch.x, cy = ch.headY + 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 34;
      const h = this.add.image(cx, cy, i % 3 ? 'heart' : 'sparkle').setScale(0.42).setDepth(200001)
        .setTint(i % 3 ? 0xffffff : 0xfff2a8);
      this.tweens.add({ targets: h, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7 - 24, scale: 0.15, alpha: 0, duration: 900 + Math.random() * 300, ease: 'Quad.easeOut', onComplete: () => h.destroy() });
    }
  }

  // 머리 위 표시: ✨ 의뢰 완료 가능 > 🎂 생일 (오늘 선물 전) > 📜 의뢰 있음
  updateBadges() {
    if (!this.residents) return;
    const today = dayKey(), t0 = now();
    for (const r of this.residents) {
      const q = questOf(r.id);
      const rel = state.residents[r.id] || {};
      let badge = null;
      if (q && questReady(q)) badge = '✨';
      else if (isBirthday(r.id, t0) && rel.giftDay !== today) badge = '🎂';
      else if (q) badge = '📜';
      r.setBadge(state.tutorial.step >= 8 ? badge : null);
    }
  }

  // 아침 6시가 지나면 새 의뢰
  questTick() {
    if (!refreshQuestsNow()) return;
    if (state.tutorial.step >= 8) { sfx('open'); toast(t('quest.new', { n: state.quests.list.length })); }
    emit('change');
  }

  // ---------- 농사 ----------
  goToPlot(plot) {
    const p = this.player;
    const px = plot.x * TILE + TILE / 2, py = plot.y * TILE + TILE / 2;
    const act = () => { p.faceTowards(px); this.plotAction(plot); };
    // 이미 밭 바로 옆이면 걷지 않고 바로
    if (Math.abs(p.x - px) < TILE * 1.6 && Math.abs(p.y - py) < TILE * 1.6) { p.stop(); act(); return; }
    this.walkTo(plot.x, plot.y, true, act);
  }

  plotAction(plot) {
    const mods = farmMods(), t0 = now();
    Farm.advance(plot, t0, mods);
    const st = Farm.status(plot, t0, mods);
    if (st.state === 'empty') {
      const held = this.heldSeed && count(state.inventory, seedId(this.heldSeed)) > 0 ? this.heldSeed : null;
      if (held) this.plantOn(plot, held);
      else openBag({ seedsOnly: true, onPickSeed: cropId => { this.setHeldSeed(cropId); this.plantOn(plot, cropId); } });
    } else if (st.state === 'thirsty') {
      Farm.water(plot, t0, mods);
      sfx('water');
      this.farmView.waterFx(plot);
      this.floatText(plot, t('farm.watered'), '#4a9ad0');
      if (state.tutorial.step === 1) this.setTutorial(2);
    } else if (st.state === 'growing') {
      this.floatText(plot, t('farm.growing', { name: t('item.' + plot.crop), left: Farm.formatLeft(st.leftMs) }));
    } else if (st.state === 'ripe') {
      const r = Farm.harvest(plot, state.inventory, t0, mods);
      if (!r.ok) { sfx('nope'); toast(t('farm.bagFull')); return; }
      sfx('harvest');
      this.farmView.harvestFx(plot, r.item);
      this.floatText(plot, t('farm.harvested', { name: t('item.' + r.item) }), '#e0708a');
      state.stats.harvested++;
      this.player.cheer();
      emit('harvest', r.item);
      if (state.tutorial.step === 3) { this.setTutorial(4); this.guideSay('tut.say.5'); }
    }
    this.farmView.refresh(plot);
    emit('change');
  }

  plantOn(plot, cropId) {
    const r = Farm.plant(plot, state.inventory, cropId, now());
    if (!r.ok) { sfx('nope'); toast(t('farm.noSeed')); return; }
    sfx('plant');
    state.stats.planted++;
    this.floatText(plot, t('farm.planted', { name: t('item.' + cropId) }));
    if (!Farm.isInSeason(cropId, now())) toast(t('farm.offSeason'));
    if (count(state.inventory, seedId(cropId)) === 0) this.heldSeed = null;
    if (state.tutorial.step === 0) this.setTutorial(1);
    this.farmView.refresh(plot);
    emit('change');
  }

  setHeldSeed(cropId) {
    this.heldSeed = cropId;
    emit('change');
  }

  useBuilding(b) {
    const onManage = () => openBuildingPanel(b, this);
    const action = BUILDINGS[b.type].action;
    if (action === 'shop') openSeedShop({ onManage });
    else if (action === 'ship') openShipBox({ onManage });
  }

  // ---------- 재료 모으기 (나무, 바위) ----------
  goGather(o) {
    const p = this.player;
    const ox = o.x * TILE + TILE / 2, oy = o.y * TILE + TILE / 2;
    const act = () => { p.faceTowards(ox); this.gather(o); };
    if (Math.abs(p.x - ox) < TILE * 1.6 && Math.abs(p.y - oy) < TILE * 1.6) { p.stop(); act(); return; }
    this.walkTo(o.x, o.y, true, act);
  }

  gather(o) {
    const g = state.gather, today = dayKey();
    if (g.day !== today) { g.day = today; g.used = {}; }
    const key = `${o.x},${o.y}`;
    // 흔들흔들
    if (o.img) this.tweens.add({ targets: o.img, x: o.img.x + 3, duration: 60, yoyo: true, repeat: 3 });
    if (g.used[key]) { sfx('nope'); this.floatText(o, t('gather.done')); return; }
    const rule = GATHER[o.type];
    const n = rule.min + (Math.random() < rule.chanceMore ? rule.max - rule.min : 0);
    if (!addItem(state.inventory, rule.item, n)) { sfx('nope'); toast(t('farm.bagFull')); return; }
    g.used[key] = true;
    state.stats.gathered += n;
    sfx(o.type === 'tree' ? 'chop' : 'pick');
    this.floatText(o, t('gather.got', { n, name: t('item.' + rule.item) }), '#9a6b4a');
    // 나뭇잎·돌가루
    const cx = o.x * TILE + TILE / 2, top = o.y * TILE + (o.type === 'tree' ? -30 : 10);
    for (let i = 0; i < 7; i++) {
      const sp = this.add.image(cx + (Math.random() - 0.5) * 40, top + Math.random() * 20, 'sparkle')
        .setScale(0.35).setTint(o.type === 'tree' ? 0x8fd19e : 0xc3cad2).setDepth(o.y * TILE + 3000);
      this.tweens.add({ targets: sp, y: sp.y + 30 + Math.random() * 20, x: sp.x + (Math.random() - 0.5) * 30, alpha: 0, angle: 120, duration: 650, onComplete: () => sp.destroy() });
    }
    emit('harvest', rule.item);
    this.checkTutorial();
    emit('change');
  }

  // ---------- 건설 ----------
  // 놓을 수 있는지 + 놓은 뒤에도 모든 건물·밭에 걸어갈 수 있는지
  checkPlace(type, x, y, rot, ignoreUid) {
    const world = {
      ground: this.map.ground, objects: this.objectTypes, objectRules: OBJECT_RULES,
      plots: state.farm.plots, buildings: state.buildings, player: { x: this.player.tileX, y: this.player.tileY },
    };
    const r = Build.canPlace(world, type, x, y, rot, ignoreUid);
    if (!r.ok || Build.isWalkableBuilding(type)) return r;
    // 미리 막아보고 길이 끊기는지 검사
    const others = state.buildings.filter(b => b.uid !== ignoreUid);
    const plotCells = state.farm.plots.map(p => ({ x: p.x, y: p.y, w: 1, h: 1 }));
    const fp = (b) => ({ x: b.x, y: b.y, ...Build.sizeOf(b.type, b.rot) });
    const blocked = buildBlocked(this.map, GROUND_RULES, OBJECT_RULES,
      [...plotCells, ...others.filter(b => !Build.isWalkableBuilding(b.type)).map(fp), fp({ type, x, y, rot })]);
    const seen = reachable(blocked, this.player.tileX, this.player.tileY);
    const touches = f => {
      for (let yy = f.y - 1; yy <= f.y + f.h; yy++) for (let xx = f.x - 1; xx <= f.x + f.w; xx++) if (seen.has(`${xx},${yy}`)) return true;
      return false;
    };
    const targets = [...plotCells, ...others.filter(b => !Build.isWalkableBuilding(b.type)).map(fp), fp({ type, x, y, rot })];
    if (!targets.every(touches)) return { ok: false, reason: 'block' };
    return r;
  }

  // 건설 메뉴에서 고르거나(type) 건물 창에서 옮기기(moveUid)
  startPlacing({ type, moveUid }) {
    closePanel();
    this.stopPlacing();
    this.setHeldSeed(null);
    let opts;
    if (moveUid) {
      const b = state.buildings.find(x => x.uid === moveUid);
      if (!b) return;
      opts = { type: b.type, moveUid, x: b.x, y: b.y, rot: b.rot, level: Math.max(1, b.level) };
      this.buildingView.setHidden(moveUid, true);
    } else {
      const spot = this.findSpot(type);
      opts = { type, x: spot.x, y: spot.y, rot: 0 };
    }
    this.player.stop();
    this.placer = new Placer(this, {
      ...opts,
      texture: b => this.buildingView.textureFor(b),
      check: (...a) => this.checkPlace(...a),
      onChange: pl => emit('placing', pl),
    });
    this.camCtl.unfollow();
    this.cameras.main.pan(this.placer.centerX, this.placer.centerY, 350, 'Sine.easeInOut');
    emit('placing', this.placer);
  }

  // 캐릭터 근처에서 놓을 수 있는 자리 찾기
  findSpot(type) {
    const { w, h } = Build.sizeOf(type, 0);
    const px = this.player.tileX, py = this.player.tileY;
    for (let r = 1; r < 14; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = px + dx - Math.floor(w / 2), y = py + dy - h + 1;
        if (this.checkPlace(type, x, y, 0, null).ok) return { x, y };
      }
    }
    return { x: px + 1, y: py - h };
  }

  stopPlacing() {
    if (!this.placer) return;
    if (this.placer.moveUid) this.buildingView.setHidden(this.placer.moveUid, false);
    this.placer.destroy();
    this.placer = null;
    this.camCtl.focusPlayer();
    emit('placing', null);
  }

  confirmPlace() {
    const pl = this.placer;
    if (!pl) return;
    const r = pl.result || this.checkPlace(pl.type, pl.x, pl.y, pl.rot, pl.moveUid);
    if (!r.ok) { sfx('nope'); toast(t('build.reason.' + r.reason)); return; }
    if (pl.moveUid) {
      const b = state.buildings.find(x => x.uid === pl.moveUid);
      Object.assign(b, { x: pl.x, y: pl.y, rot: pl.rot });
      this.afterBuildingsChanged();
      this.stopPlacing();
      this.buildingView.poof(b);
      sfx('place');
      toast(t('build.moved', { name: buildingName(b) }));
      emit('change');
      return;
    }
    const res = Build.placeNew(state.buildings, state.inventory, { uid: NEXT_UID(), type: pl.type, x: pl.x, y: pl.y, rot: pl.rot }, now(), buildMods());
    if (!res.ok) { sfx('nope'); toast(t('build.reason.' + res.reason)); this.stopPlacing(); return; }
    const b = res.building;
    this.afterBuildingsChanged();
    if (res.instant) {
      // 꾸미기는 이어서 여러 개 놓을 수 있게 놓기 모드를 유지
      sfx('place');
      this.buildingView.poof(b);
      state.stats.built++;
      pl.placedCount++;
      const d = BUILDINGS[pl.type];
      const more = (!d.max || Build.countOf(state.buildings, pl.type) < d.max) && Build.canAfford(state.inventory, d.levels[1].cost);
      if (more) pl.setPos(pl.x + pl.size.w, pl.y, true);
      else { this.stopPlacing(); toast(t('build.placed', { name: t('bld.' + b.type) })); }
    } else {
      sfx('build');
      this.stopPlacing();
      toast(t('build.started', { name: t('bld.' + b.type), time: Farm.formatLeft(Build.leftMs(b, now())) }));
      // 촌장이 공사장 앞으로 가서 응원
      const { w, h } = Build.sizeOf(b.type, b.rot);
      this.walkTo(b.x + Math.floor(w / 2), b.y + h, true, () => this.player.cheer());
    }
    this.checkTutorial();
    emit('change');
  }

  // 건물이 생기거나 옮겨지면: 막힌 칸, 그림, 주민 자리 정리
  afterBuildingsChanged() {
    this.rebuildBlocked();
    this.buildingView.sync();
    applyEffects();
    this.residentAI.onMapChanged();
    for (const r of this.residents) {
      if (isWalkable(this.blocked, r.tileX, r.tileY)) continue;
      const s = nearestWalkable(this.blocked, r.tileX, r.tileY, 6);
      if (s) { r.x = s.x * TILE + TILE / 2; r.y = s.y * TILE + TILE / 2 + 6; }
    }
  }

  upgrade(b) {
    const r = Build.startUpgrade(state.buildings, state.inventory, b, now(), buildMods());
    if (!r.ok) { sfx('nope'); toast(t('build.reason.' + (r.reason === 'busy' ? 'busy' : 'cost'))); return; }
    if (r.instant) { sfx('built'); this.afterBuildingsChanged(); this.buildingView.poof(b); toast(t('build.done', { name: buildingName(b), lv: b.level })); }
    else { sfx('build'); this.buildingView.update(b); toast(t('build.upStarted', { name: buildingName(b), lv: b.job.toLevel, time: Farm.formatLeft(Build.leftMs(b, now())) })); }
    emit('change');
    openBuildingPanel(b, this);
  }

  cancelJob(b) {
    const r = Build.cancelJob(state.buildings, state.inventory, b);
    if (!r.ok) return;
    sfx('tap');
    this.afterBuildingsChanged();
    toast(t('build.canceled'));
    emit('change');
    if (r.removed) closePanel(); else openBuildingPanel(b, this);
  }

  removeBuilding(b) {
    const r = Build.removeBuilding(state.buildings, state.inventory, b);
    if (!r.ok) return;
    sfx('tap');
    this.afterBuildingsChanged();
    closePanel();
    toast(t('build.removed'));
    emit('change');
  }

  // 1초마다: 다 된 공사 끝내기 + 막대 갱신
  buildTick() {
    const done = Build.finishDue(state.buildings, now());
    for (const b of done) this.onBuilt(b);
    this.buildingView.tick();
  }

  onBuilt(b) {
    state.stats.built++;
    this.afterBuildingsChanged();
    this.buildingView.celebrate(b);
    sfx('built');
    const g = this.buildingView.geometry(b);
    // 가장 가까운 주민이 축하
    const fan = this.residents.filter(r => !this.residentAI.isAsleep(r)).sort((a, c) => Math.hypot(a.x - g.cx, a.y - g.bottom) - Math.hypot(c.x - g.cx, c.y - g.bottom))[0];
    if (fan) { fan.faceTowards(g.cx); fan.cheer(); this.speech(fan, t('build.cheer.' + Math.floor(Math.random() * 3))); }
    this.player.cheer();
    toast(t('build.done', { name: buildingName(b), lv: b.level }) + ' ' + effectText(b.type, b.level), 3200);
    if (isPanelOpen() && shownBuilding() === b.uid) openBuildingPanel(b, this);
    this.checkTutorial();
    emit('change');
  }

  // ---------- 처음 안내 ----------
  setTutorial(step) {
    state.tutorial.step = step;
    if (step === 3) this.guideSay('tut.say.3');
    emit('change');
  }

  // 재료 모으기 → 창고 짓기 → 완성 안내는 상태를 보고 알아서 넘어감
  checkTutorial() {
    const tut = state.tutorial;
    const storage = state.buildings.find(b => b.type === 'storage');
    if (tut.step === 5 && (storage || Build.canAfford(state.inventory, BUILDINGS.storage.levels[1].cost))) {
      this.setTutorial(6);
      if (!storage) this.guideSay('tut.say.6', 'dodo');
    }
    if (tut.step === 6 && storage) this.setTutorial(7);
    if (tut.step === 7 && storage?.level > 0) { this.setTutorial(8); this.guideSay('tut.say.8', 'dodo'); }
  }

  // 안내 담당 주민이 말하기 (없으면 처음 주민)
  guideSay(key, who = 'momo', force = false) {
    if (state.tutorial.step >= TUT_END && !force) return;
    const guide = this.residents.find(r => r.id === who) || this.residents.find(r => r.id === 'momo') || this.residents[0];
    if (guide) { this.speech(guide, t(key)); if (!this.residentAI?.isAsleep(guide)) guide.cheer(); }
  }

  // 의뢰 창을 처음 열면 안내 끝
  finishTutorial() {
    this.setTutorial(TUT_END);
    this.guideSay('tut.say.10', 'momo', true);
  }

  // 캐릭터 머리 위로 잠깐 떠오르는 글자
  floatOver(ch, text, color = '#5b4636') {
    const label = this.add.text(ch.x, ch.headY - 6, text, {
      fontFamily: FONT, fontSize: '17px', color, stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0.5, 1).setDepth(300000).setResolution(Math.max(2, this.dpr * 2));
    this.tweens.add({ targets: label, y: label.y - 30, alpha: { from: 1, to: 0 }, duration: 1500, ease: 'Sine.easeOut', onComplete: () => label.destroy() });
  }

  // 밭(또는 나무·바위) 위에 잠깐 떠오르는 글자
  floatText(plot, text, color = '#5b4636') {
    const x = plot.x * TILE + TILE / 2, y = plot.y * TILE - 10;
    const label = this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '15px', color, stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0.5, 1).setDepth(300000).setResolution(Math.max(2, this.dpr * 2));
    this.tweens.add({ targets: label, y: y - 26, alpha: { from: 1, to: 0 }, duration: 1400, ease: 'Sine.easeOut', onComplete: () => label.destroy() });
  }

  // ---------- 입력: 키보드 ----------
  setupKeyboard() {
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,R,ENTER,ESC');
  }

  // 놓기 모드에서는 방향키로 한 칸씩, R 돌리기, Enter 짓기, Esc 그만
  keyboardPlace() {
    const k = this.keys, pl = this.placer;
    if (!k || !pl) return;
    const J = Phaser.Input.Keyboard.JustDown;
    const dx = (J(k.D) || J(k.RIGHT) ? 1 : 0) - (J(k.A) || J(k.LEFT) ? 1 : 0);
    const dy = (J(k.S) || J(k.DOWN) ? 1 : 0) - (J(k.W) || J(k.UP) ? 1 : 0);
    if (dx || dy) pl.setPos(pl.x + dx, pl.y + dy);
    if (J(k.R)) pl.rotate();
    if (J(k.ENTER)) this.confirmPlace();
    else if (J(k.ESC)) this.stopPlacing();
  }

  keyboardMove(dt) {
    const k = this.keys;
    if (!k) return false;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (!vx && !vy) return false;
    const p = this.player;
    if (p.path.length) { p.stop(); this.targetMark.setVisible(false); }
    this.cancelPendingTalk();
    const len = Math.hypot(vx, vy);
    const step = p.speed * this.groundSpeed(p) * dt;
    vx = vx / len * step; vy = vy / len * step;
    // 가로, 세로를 따로 검사해서 벽에 닿으면 미끄러지듯 움직임
    let nx = p.x, ny = p.y;
    if (this.canStand(nx + vx, ny)) nx += vx;
    if (this.canStand(nx, ny + vy)) ny += vy;
    if (nx !== p.x || ny !== p.y) p.nudge(nx, ny, step);
    this.camCtl.focusPlayer();
    return true;
  }

  // 발 주변 네 점이 모두 걸을 수 있는 칸인지
  canStand(x, y) {
    const r = 11;
    for (const [ox, oy] of [[-r, -6], [r, -6], [-r, 6], [r, 6]]) {
      if (!isWalkable(this.blocked, Math.floor((x + ox) / TILE), Math.floor((y + oy) / TILE))) return false;
    }
    return true;
  }

  groundSpeed(ch) {
    if (this.pathTiles?.has(`${ch.tileX},${ch.tileY}`)) return 1.2;
    const g = this.map.ground[ch.tileY]?.[ch.tileX];
    return GROUND_RULES[g]?.speed ?? 1;
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const p = this.player;
    if (this.placer) { this.keyboardPlace(); p.keyMoving = false; }
    else p.keyMoving = this.keyboardMove(dt);
    p.update(dt, this.groundSpeed(p));
    if (!state.player || state.player.x !== p.tileX || state.player.y !== p.tileY) state.player = { x: p.tileX, y: p.tileY };
    if (!p.moving && this.targetMark.visible) this.targetMark.setVisible(false);

    // 대화하러 가던 길이 다른 행동으로 바뀌면 약속 취소
    if (this.pendingTalk && p.onArrive !== this.pendingTalk.cb) this.cancelPendingTalk();

    this.residentAI.update(dt);
    for (const r of this.residents) r.update(dt);
    for (const ch of [p, ...this.residents]) {
      if (ch.bubble) ch.bubble.setPosition(ch.x, ch.headY - ch.bubble.h / 2 - 14);
    }
  }
}

export { CHARACTER_HEIGHT };
