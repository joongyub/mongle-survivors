// 주민 움직임 (현실 시각에 맞춘 하루 일과)
//  아침 7~11시: 자기 자리 근처를 산책
//  낮 11~17시: 마을회관 앞에서 어슬렁 (광장이 생기면 광장으로)
//  저녁 17~23시: 친구 한 명과 마주 보고 수다 (💬)
//  밤 23~7시: 자기 자리에서 쿨쿨 (Zzz). 눌러서 깨우면 잠깐 이야기해 줌
import { TILE } from '../data/map.js';
import { RESIDENT_BY_ID } from '../data/residents.js';
import { isWalkable, nearestWalkable, findPath, smoothPath } from '../core/grid.js';
import { activityAt } from '../core/residents.js';
import { hourOf } from '../core/clock.js';
import { sizeOf } from '../core/build.js';
import { state } from '../state/GameState.js';
import { FONT } from '../i18n.js';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const WAKE_MS = 40000;            // 밤에 깨우면 이만큼 깨어 있다가 다시 잠
const CHAT_ICONS = ['💬', '♪', '😊', '💬', '❗'];

export class ResidentAI {
  constructor(scene, characters) {
    this.scene = scene;
    this.brains = characters.map(ch => ({ ch, wait: rand(0.5, 3), busy: false, asleep: false, wokeUntil: 0, chatT: rand(1, 3) }));
    this.act = activityAt(hourOf());
    this.zzzT = 0;
  }

  brainOf(ch) { return this.brains.find(b => b.ch === ch); }
  isAsleep(ch) { return !!this.brainOf(ch)?.asleep; }

  // ---------- 장소 ----------
  // 자기 자리 (밤에 자는 곳). 7단계에서 집이 생기면 집 앞으로 바뀜
  home(b) {
    const s = RESIDENT_BY_ID[b.ch.id]?.spot || { x: 12, y: 12 };
    return nearestWalkable(this.scene.blocked, s.x, s.y, 5) || s;
  }

  // 마을회관 앞 (낮에 모이는 곳)
  townFront() {
    const th = state.buildings.find(b => b.type === 'townhall');
    if (!th) return { x: 15, y: 13 };
    const { w, h } = sizeOf(th.type, th.rot);
    const f = { x: th.x + Math.floor(w / 2), y: th.y + h + 1 };
    return nearestWalkable(this.scene.blocked, f.x, f.y, 4) || f;
  }

  // 다른 주민이 서 있거나 가려는 칸
  taken(except) {
    const set = new Set();
    const p = this.scene.player;
    if (p) set.add(`${p.tileX},${p.tileY}`);
    for (const b of this.brains) {
      if (b === except) continue;
      set.add(`${b.ch.tileX},${b.ch.tileY}`);
      const last = b.ch.path[b.ch.path.length - 1];
      if (last) set.add(`${Math.floor(last.x / TILE)},${Math.floor(last.y / TILE)}`);
    }
    return set;
  }

  // 중심에서 r칸 안의 걸을 수 있는 빈칸 하나
  randomAround(b, c, r) {
    const busy = this.taken(b);
    for (let i = 0; i < 12; i++) {
      const x = c.x + randInt(-r, r), y = c.y + randInt(-r, r);
      if (isWalkable(this.scene.blocked, x, y) && !busy.has(`${x},${y}`)) return { x, y };
    }
    return null;
  }

  // 저녁 수다 짝: 1번째↔2번째, 3번째↔4번째 … (혼자 남으면 마을회관 앞 산책)
  planMeetings() {
    const bl = this.scene.blocked;
    for (const b of this.brains) { b.meet = null; b.mate = null; b.atMeet = false; }
    for (let i = 0; i + 1 < this.brains.length; i += 2) {
      const a = this.brains[i], c = this.brains[i + 1];
      const h = this.home(a);
      const m1 = nearestWalkable(bl, h.x, h.y + 1, 3) || h;
      const side = [[2, 0], [-2, 0], [1, 0], [-1, 0], [1, 1], [-1, 1], [0, 1]]
        .map(([dx, dy]) => ({ x: m1.x + dx, y: m1.y + dy }))
        .find(p => isWalkable(bl, p.x, p.y));
      if (!side) continue;
      a.meet = m1; c.meet = side; a.mate = c; c.mate = a;
    }
  }

  // ---------- 처음 놓을 자리 ----------
  placeAll() {
    if (this.act === 'evening') this.planMeetings();
    for (const b of this.brains) {
      let g;
      if (this.act === 'night') g = this.home(b);
      else if (this.act === 'evening' && b.meet) { g = b.meet; b.atMeet = true; }
      else g = this.randomAround(b, this.act === 'day' ? this.townFront() : this.home(b), 2) || this.home(b);
      b.ch.x = g.x * TILE + TILE / 2;
      b.ch.y = g.y * TILE + TILE / 2 + 6;
      if (this.act === 'night') this.sleep(b);
      if (b.atMeet && b.mate) b.ch.faceTowards(b.mate.meet.x * TILE + TILE / 2);
    }
  }

  // 건물이 생기거나 옮겨지면 걷던 길을 다시 찾게
  onMapChanged() {
    for (const b of this.brains) if (b.ch.moving && !b.busy) { b.ch.stop(); b.wait = 0.3; }
    if (this.act === 'evening') this.planMeetings();
  }

  // ---------- 매 프레임 ----------
  update(dt) {
    const act = activityAt(hourOf());
    if (act !== this.act) {
      this.act = act;
      for (const b of this.brains) { b.wait = rand(0.3, 2.5); if (act !== 'night') this.wake(b); }
      if (act === 'evening') this.planMeetings();
      else for (const b of this.brains) { b.meet = null; b.mate = null; b.atMeet = false; }
    }
    for (const b of this.brains) this.step(b, dt);
    this.zzz(dt);
  }

  step(b, dt) {
    const ch = b.ch;
    if (b.busy || b.asleep || ch.moving) return;
    // 수다 중이면 짝을 보고 가끔 💬
    if (b.atMeet && b.mate) {
      if (!b.mate.ch.moving) ch.faceTowards(b.mate.ch.x);
      b.chatT -= dt;
      if (b.chatT <= 0 && b.mate.atMeet) { this.puff(ch, CHAT_ICONS[randInt(0, CHAT_ICONS.length - 1)]); b.chatT = rand(2.5, 5.5); }
    } else if (Math.random() < dt * 0.15) {
      ch.facing *= -1;            // 가끔 두리번
    }
    b.wait -= dt;
    if (b.wait > 0) return;

    if (this.act === 'night') {
      if (b.wokeUntil > this.scene.time.now) { b.wait = 2; return; }
      const h = this.home(b);
      if (ch.tileX === h.x && ch.tileY === h.y) { this.sleep(b); return; }
      this.go(b, h, () => this.sleep(b));
      return;
    }
    if (this.act === 'evening' && b.meet) {
      if (ch.tileX === b.meet.x && ch.tileY === b.meet.y) { b.atMeet = true; b.wait = rand(4, 8); return; }
      this.go(b, b.meet, () => { b.atMeet = true; });
      return;
    }
    const day = this.act === 'day' || this.act === 'evening';
    const g = this.randomAround(b, day ? this.townFront() : this.home(b), day ? 3 : 2);
    if (g) this.go(b, g);
    else b.wait = 2;
  }

  go(b, g, onArrive = null) {
    const bl = this.scene.blocked, ch = b.ch;
    b.atMeet = false;
    const raw = findPath(bl, ch.tileX, ch.tileY, g.x, g.y);
    if (!raw) { b.wait = rand(2, 4); return false; }
    ch.walkPath(smoothPath(bl, ch.tileX, ch.tileY, raw), onArrive);
    b.wait = rand(3, 8);          // 도착하면 이만큼 쉬었다가 다음 산책
    return true;
  }

  // ---------- 잠 ----------
  sleep(b) {
    if (this.act !== 'night' || b.busy || b.asleep) return;
    b.asleep = true;
    b.ch.sleepy = true;
    b.ch.showPose('sleep', 1e9);  // 누운 그림이 있는 친구(나리, 보리)는 누워서 잠
  }

  wake(b, byPlayer = false) {
    if (!b.asleep) return false;
    b.asleep = false;
    b.ch.sleepy = false;
    b.ch.clearPose();
    if (byPlayer) b.wokeUntil = this.scene.time.now + WAKE_MS;
    return true;
  }

  zzz(dt) {
    this.zzzT -= dt;
    if (this.zzzT > 0) return;
    this.zzzT = 1.3;
    const view = this.scene.cameras.main.worldView;
    for (const b of this.brains) if (b.asleep && view.contains(b.ch.x, b.ch.y - 30)) this.puff(b.ch, (b.zn = (b.zn || 0) + 1) % 2 ? 'Z' : 'z', true);
  }

  // 머리 위로 떠오르는 작은 글자 (Zzz, 💬)
  puff(ch, text, sleepy = false) {
    const s = this.scene;
    const x = ch.x + (sleepy ? 14 : 18 * ch.facing), y = ch.headY + (sleepy ? 26 : 4);
    const label = s.add.text(x, y, text, {
      fontFamily: FONT, fontSize: sleepy ? '24px' : '18px', color: '#6a7bc0', stroke: '#ffffff', strokeThickness: sleepy ? 4 : 0,
    }).setOrigin(0.5, 1).setDepth(ch.y + 3000).setResolution(Math.max(2, (s.dpr || 1) * 2)).setAlpha(0);
    s.tweens.add({
      targets: label, x: x + (sleepy ? 16 : 6), y: y - 34, alpha: { from: 1, to: 0 }, scale: { from: 0.7, to: 1.15 },
      duration: sleepy ? 1800 : 1300, ease: 'Sine.easeOut', onComplete: () => label.destroy(),
    });
  }

  // ---------- 촌장과 이야기 ----------
  // 이야기하는 동안은 멈춤. 자고 있었으면 깨움 → { woke: true }
  hold(ch) {
    const b = this.brainOf(ch);
    if (!b) return { woke: false };
    b.busy = true;
    b.atMeet = false;
    ch.stop();
    return { woke: this.wake(b, true) };
  }

  release(ch) {
    const b = this.brainOf(ch);
    if (!b) return;
    b.busy = false;
    b.wait = rand(2, 4);
  }
}
