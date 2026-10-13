// 카메라: 손가락/마우스로 끌어서 이동, 두 손가락·마우스 휠로 확대/축소
export class CameraController {
  constructor(scene, worldW, worldH, baseZoom) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.worldW = worldW; this.worldH = worldH;
    this.base = baseZoom;             // 고해상도 화면 보정 배율
    this.userZoom = 1.0;              // 사용자가 정한 확대 배율
    this.minUser = 0.55; this.maxUser = 2.2;
    this.cam.setBounds(0, 0, worldW, worldH);
    this.cam.setRoundPixels(false);
    this.apply();
  }

  // 지도보다 더 멀리 축소하지 않게 최소 배율 계산
  minZoom() {
    const fit = Math.max(this.cam.width / this.worldW, this.cam.height / this.worldH);
    return Math.max(this.base * this.minUser, fit);
  }

  apply(z = this.base * this.userZoom) {
    const zoom = Phaser.Math.Clamp(z, this.minZoom(), this.base * this.maxUser);
    this.cam.setZoom(zoom);
    this.userZoom = zoom / this.base;
  }

  // 화면의 (sx, sy) 지점을 고정한 채로 확대/축소
  zoomAt(factor, sx = this.cam.width / 2, sy = this.cam.height / 2) {
    const cam = this.cam;
    const before = this.screenToWorld(sx, sy);
    this.apply(cam.zoom * factor);
    const after = this.screenToWorld(sx, sy);
    cam.scrollX += before.x - after.x;
    cam.scrollY += before.y - after.y;
  }

  zoomBy(factor) { this.zoomAt(factor); }

  screenToWorld(sx, sy) {
    const cam = this.cam;
    return {
      x: cam.scrollX + cam.width / 2 + (sx - cam.width / 2) / cam.zoom,
      y: cam.scrollY + cam.height / 2 + (sy - cam.height / 2) / cam.zoom,
    };
  }

  panBy(dx, dy) {
    this.unfollow();
    this.cam.scrollX -= dx / this.cam.zoom;
    this.cam.scrollY -= dy / this.cam.zoom;
  }

  follow(target) {
    this.target = target;
    this.cam.startFollow(target, false, 0.12, 0.12);
  }

  unfollow() { this.cam.stopFollow(); }

  focusPlayer() { if (this.target) this.cam.startFollow(this.target, false, 0.12, 0.12); }

  // 대화 중: 월드의 (x, y) 지점이 아래 대화 상자에 안 가려진 위쪽 가운데에 오게 카메라를 옮김
  // coverCss = 화면 아래에서 대화 상자가 차지하는 높이 (CSS 픽셀)
  showAbove(x, y, coverCss) {
    this.unfollow();
    this.cam.pan(x, y + (coverCss / 2) * this.base / this.cam.zoom, 320, 'Sine.easeInOut', true);
  }

  resize() { this.apply(); }
}
