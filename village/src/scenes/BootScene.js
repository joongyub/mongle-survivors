// 그림 불러오기 + 코드로 그리는 그림 만들기
import { CHARACTER_IMAGES, POSE_IMAGES, poseKey } from '../data/assets.js';
import { makeGrass, makeObjects, makeSmallCopy } from '../view/textures.js';
import { makeCropArt } from '../view/cropArt.js';
import { makeBuildingArt } from '../view/buildingArt.js';
import { SMALL_TEX } from '../view/Character.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    for (const [id, path] of Object.entries(CHARACTER_IMAGES)) this.load.image(id, path);
    for (const [id, poses] of Object.entries(POSE_IMAGES))
      for (const [pose, path] of Object.entries(poses)) this.load.image(poseKey(id, pose), path);
  }

  create() {
    makeGrass(this);
    makeObjects(this);
    makeCropArt(this);
    makeBuildingArt(this);
    // 캐릭터마다 작은 크기 그림을 미리 만들어 둠 (멀리서 볼 때 깨끗하게)
    for (const id of Object.keys(CHARACTER_IMAGES)) {
      makeSmallCopy(this, id, SMALL_TEX);
      const baseH = this.textures.get(id).getSourceImage().height;
      for (const pose of Object.keys(POSE_IMAGES[id] || {})) {
        const k = poseKey(id, pose);
        const h = this.textures.get(k).getSourceImage().height;
        makeSmallCopy(this, k, Math.round(SMALL_TEX * h / baseH));
      }
    }
    this.game.events.emit('boot-done');
  }
}
