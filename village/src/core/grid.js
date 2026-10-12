// ★ 타일 지도 규칙 (화면 코드 없음, 순수 함수)
// 지도는 글자 줄 목록으로 되어 있어. 글자 뜻은 data/map.js 참고.

export function parseMap(rows, legend) {
  const height = rows.length, width = rows[0].length;
  const ground = [], objects = [];
  for (let y = 0; y < height; y++) {
    const line = [];
    for (let x = 0; x < width; x++) {
      const info = legend[rows[y][x]] ?? legend['.'];
      line.push(info.ground);
      if (info.object) objects.push({ type: info.object, x, y });
    }
    ground.push(line);
  }
  return { width, height, ground, objects };
}

// 막힌 칸 표 만들기: blocked[y][x] = true 면 못 지나감
export function buildBlocked(map, groundRules, objectRules, footprints = []) {
  const blocked = map.ground.map(line => line.map(g => !!groundRules[g]?.blocked));
  for (const o of map.objects) if (objectRules[o.type]?.blocked) blocked[o.y][o.x] = true;
  for (const f of footprints) {
    for (let y = f.y; y < f.y + f.h; y++)
      for (let x = f.x; x < f.x + f.w; x++)
        if (blocked[y]) blocked[y][x] = true;
  }
  return blocked;
}

export function inBounds(blocked, x, y) {
  return y >= 0 && y < blocked.length && x >= 0 && x < blocked[0].length;
}

export function isWalkable(blocked, x, y) {
  return inBounds(blocked, x, y) && !blocked[y][x];
}

// 가장 가까운 걸을 수 있는 칸 찾기 (나무를 눌렀을 때 그 옆으로 가게)
export function nearestWalkable(blocked, x, y, maxR = 3) {
  if (isWalkable(blocked, x, y)) return { x, y };
  for (let r = 1; r <= maxR; r++) {
    let best = null, bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (isWalkable(blocked, x + dx, y + dy)) {
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = { x: x + dx, y: y + dy }; }
      }
    }
    if (best) return best;
  }
  return null;
}

// 출발 칸에서 걸어서 갈 수 있는 모든 칸 ('x,y' 모음). 건물이 길을 막는지 검사할 때 씀
export function reachable(blocked, sx, sy) {
  const seen = new Set();
  if (!isWalkable(blocked, sx, sy)) return seen;
  const stack = [[sx, sy]];
  seen.add(`${sx},${sy}`);
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && isWalkable(blocked, nx, ny)) { seen.add(k); stack.push([nx, ny]); }
    }
  }
  return seen;
}

// 길찾기(A*): 출발 칸 → 도착 칸까지 지나갈 칸 목록. 대각선 이동 가능, 모서리 끼기 금지.
export function findPath(blocked, sx, sy, tx, ty, maxNodes = 4000) {
  if (!isWalkable(blocked, tx, ty)) return null;
  if (sx === tx && sy === ty) return [];
  const W = blocked[0].length;
  const key = (x, y) => y * W + x;
  const h = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const open = [{ x: sx, y: sy, g: 0, f: h(sx, sy) }];
  const came = new Map(), gScore = new Map([[key(sx, sy), 0]]);
  const closed = new Set();
  let steps = 0;
  while (open.length && steps++ < maxNodes) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.x, cur.y);
    if (closed.has(ck)) continue;
    if (cur.x === tx && cur.y === ty) {
      const path = [];
      let k = ck;
      while (k !== key(sx, sy)) { path.push({ x: k % W, y: Math.floor(k / W) }); k = came.get(k); }
      return path.reverse();
    }
    closed.add(ck);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!isWalkable(blocked, nx, ny)) continue;
      if (dx && dy && (!isWalkable(blocked, cur.x + dx, cur.y) || !isWalkable(blocked, cur.x, cur.y + dy))) continue;
      const nk = key(nx, ny);
      const g = cur.g + (dx && dy ? 1.414 : 1);
      if (g < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, g); came.set(nk, ck);
        open.push({ x: nx, y: ny, g, f: g + h(nx, ny) });
      }
    }
  }
  return null;
}

// 길 다듬기: 일직선으로 갈 수 있는 중간 칸은 건너뛰어 자연스럽게 걷게 함
export function smoothPath(blocked, sx, sy, path) {
  if (path.length < 3) return path;
  const out = [];
  let ax = sx, ay = sy, i = 0;
  while (i < path.length) {
    let j = path.length - 1;
    while (j > i && !lineClear(blocked, ax, ay, path[j].x, path[j].y)) j--;
    out.push(path[j]);
    ax = path[j].x; ay = path[j].y; i = j + 1;
  }
  return out;
}

function lineClear(blocked, x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    // 캐릭터 몸 너비를 생각해서 주변 네 점을 검사
    for (const [ox, oy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]])
      if (!isWalkable(blocked, Math.round(x + ox), Math.round(y + oy))) return false;
  }
  return true;
}
