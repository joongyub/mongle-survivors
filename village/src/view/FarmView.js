// 밭 그리기: 흙, 작물 단계별 그림, 물 필요 아이콘, 다 자람 반짝이
import { TILE } from '../data/map.js';
import { status, advance } from '../core/farm.js';
import { now } from '../core/clock.js';
import { RES } from './textures.js';

const sc = 1 / RES;

export class FarmView {
  constructor(scene, plots, getMods) {
    this.scene = scene;
    this.getMods = getMods;
    this.views = new Map();
    for (const p of plots) this.addPlot(p);
  }

  addPlot(plot) {
    const s = this.scene;
    const x = plot.x * TILE, y = plot.y * TILE;
    const cx = x + TILE / 2, bottom = y + TILE;
    const v = {
      plot,
      soil: s.add.image(x, y, 'soil').setOrigin(0).setScale(sc).setDepth(-6),
      crop: s.add.image(cx, bottom + 2, 'crop_seed').setOrigin(0.5, 1).setScale(sc).setDepth(bottom - 2).setVisible(false),
      icon: s.add.image(cx, y - 2, 'icon_water').setOrigin(0.5, 1).setScale(0.5).setDepth(bottom + 500).setVisible(false),
      key: '',
    };
    s.tweens.add({ targets: v.icon, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.views.set(plot.uid, v);
    this.refresh(plot);
  }

  // 밭 상태가 바뀌었을 수 있으니 그림을 다시 맞춤
  refresh(plot) {
    const v = this.views.get(plot.uid);
    const st = status(plot, now(), this.getMods());
    const key = `${plot.crop}|${plot.stage}|${plot.watered}|${st.state}`;
    if (key === v.key) return;
    const firstTime = v.key === '';
    v.key = key;
    v.soil.setTexture(plot.watered ? 'soil_wet' : 'soil');
    v.crop.setVisible(!!plot.crop);
    if (plot.crop) {
      const tex = st.state === 'ripe' ? 'crop_' + plot.crop : plot.stage === 0 ? 'crop_seed' : 'crop_sprout';
      if (v.crop.texture.key !== tex) {
        v.crop.setTexture(tex);
        if (!firstTime) this.popIn(v.crop);
      }
    }
    v.icon.setVisible(st.state === 'thirsty');
    // 다 자라면 반짝반짝
    if (st.state === 'ripe' && !v.sparkle) {
      v.sparkle = this.scene.time.addEvent({ delay: 900, loop: true, callback: () => this.sparkle(plot) });
    } else if (st.state !== 'ripe' && v.sparkle) {
      v.sparkle.remove(); v.sparkle = null;
    }
    if (st.state === 'ripe' && !firstTime) this.scene.events.emit('crop-ripe', plot);
  }

  popIn(img) {
    img.setScale(sc * 0.6, sc * 1.3);
    this.scene.tweens.add({ targets: img, scaleX: sc, scaleY: sc, duration: 380, ease: 'Back.easeOut' });
  }

  sparkle(plot) {
    const s = this.scene;
    const x = plot.x * TILE + 8 + Math.random() * (TILE - 16), y = plot.y * TILE - 6 + Math.random() * 30;
    const sp = s.add.image(x, y, 'sparkle').setScale(0).setDepth(plot.y * TILE + TILE + 600).setTint(0xfff2a8);
    s.tweens.add({ targets: sp, scale: 0.55, angle: 90, duration: 380, yoyo: true, onComplete: () => sp.destroy() });
  }

  // 1초마다: 시간이 흐른 만큼 자라게 하고 그림 갱신
  tick() {
    const t = now(), mods = this.getMods();
    for (const v of this.views.values()) {
      advance(v.plot, t, mods);
      this.refresh(v.plot);
    }
  }

  // 물주기 연출: 물뿌리개 + 물방울
  waterFx(plot) {
    const s = this.scene;
    const cx = plot.x * TILE + TILE / 2, y = plot.y * TILE;
    const can = s.add.image(cx - 18, y - 4, 'can').setScale(0.5).setDepth(y + 2000).setAngle(-10);
    s.tweens.add({ targets: can, angle: 25, duration: 260, yoyo: true, repeat: 1, onComplete: () => can.destroy() });
    for (let i = 0; i < 8; i++) {
      const d = s.add.image(cx + 4 + Math.random() * 10, y + 2, 'drop').setScale(0.6).setDepth(y + 1999);
      s.tweens.add({ targets: d, x: cx - 14 + Math.random() * 30, y: y + 22 + Math.random() * 14, alpha: 0, duration: 420, delay: 120 + i * 45, onComplete: () => d.destroy() });
    }
  }

  // 수확 연출: 작물이 톡 튀어나와 위로 날아감
  harvestFx(plot, cropId) {
    const s = this.scene;
    const cx = plot.x * TILE + TILE / 2, bottom = plot.y * TILE + TILE;
    const pop = s.add.image(cx, bottom, 'crop_' + cropId).setOrigin(0.5, 1).setScale(sc).setDepth(bottom + 2000);
    s.tweens.add({ targets: pop, y: bottom - 46, scale: sc * 1.15, duration: 300, ease: 'Quad.easeOut' });
    s.tweens.add({ targets: pop, alpha: 0, y: bottom - 70, delay: 420, duration: 300, onComplete: () => pop.destroy() });
    for (let i = 0; i < 6; i++) {
      const sp = s.add.image(cx, bottom - 20, 'sparkle').setScale(0.4).setDepth(bottom + 2001).setTint(0xfff2a8);
      const a = Math.random() * Math.PI * 2;
      s.tweens.add({ targets: sp, x: cx + Math.cos(a) * 30, y: bottom - 20 + Math.sin(a) * 24, scale: 0, duration: 500, onComplete: () => sp.destroy() });
    }
  }
}
