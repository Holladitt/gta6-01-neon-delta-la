// A-star over a coarse road grid. Police cars route on roads only; bridges are
// explicit road cells, water is never walkable for cars. Boats use a separate
// water graph (see world.js) and never touch this grid.
// Grid cells are 100 units; a cell is drivable when its centre is on a road.
import { AVENUES, STREETS, CANAL, WORLD } from './config.js';

export const CELL = 100;
export const COLS = Math.ceil(WORLD.w / CELL);
export const ROWS = Math.ceil(WORLD.h / CELL);

function onRoad(cx, cy) {
  const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2;
  const nearAve = AVENUES.some((a) => Math.abs(x - a) < 56);
  const nearSt = STREETS.some((s) => Math.abs(y - s) < 56);
  if (!nearAve && !nearSt) return false;
  // Canal blocks everything except bridge crossings at each street.
  if (x > CANAL.x0 - 20 && x < CANAL.x1 + 20 && y > CANAL.y0 && y < CANAL.y1) {
    return STREETS.some((s) => Math.abs(y - s) < 56);
  }
  return true;
}

const walkable = new Uint8Array(COLS * ROWS);
for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) walkable[y * COLS + x] = onRoad(x, y) ? 1 : 0;

export function cellOf(x, y) {
  return { cx: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))), cy: Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL))) };
}
export function cellCenter(cx, cy) { return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 }; }
export function isRoadCell(cx, cy) {
  return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && walkable[cy * COLS + cx] === 1;
}
// Nearest drivable cell to a point (spiral out a few cells; falls back to centre).
export function nearestRoadCell(x, y) {
  const c = cellOf(x, y);
  if (isRoadCell(c.cx, c.cy)) return c;
  for (let r = 1; r <= 6; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (isRoadCell(c.cx + dx, c.cy + dy)) return { cx: c.cx + dx, cy: c.cy + dy };
    }
  }
  return { cx: 11, cy: 10 };
}

// A-star with a binary heap of open nodes. Returns an array of {x,y} waypoints
// (cell centres) from start to goal, or [] when no route exists. No allocation
// of waypoint objects happens per frame: callers repath at most every ~1.5 s,
// staggered per police car.
export function findPath(sx, sy, gx, gy) {
  const start = sy * COLS + sx, goal = gy * COLS + gx;
  if (start === goal) return [cellCenter(gx, gy)];
  if (!walkable[start] || !walkable[goal]) return [];
  const g = new Float32Array(COLS * ROWS).fill(Infinity);
  const from = new Int32Array(COLS * ROWS).fill(-1);
  const closed = new Uint8Array(COLS * ROWS);
  const heap = [start];
  const heapF = [0];
  g[start] = 0;
  const hx = (i) => i % COLS, hy = (i) => Math.floor(i / COLS);
  const heur = (i) => (Math.abs(hx(i) - gx) + Math.abs(hy(i) - gy)) * CELL;
  function push(i, f) {
    heap.push(i); heapF.push(f);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heapF[p] <= heapF[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]]; [heapF[p], heapF[c]] = [heapF[c], heapF[p]];
      c = p;
    }
  }
  function pop() {
    const top = heap[0], last = heap.pop(), lastF = heapF.pop();
    if (heap.length) {
      heap[0] = last; heapF[0] = lastF;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1; let m = c;
        if (l < heap.length && heapF[l] < heapF[m]) m = l;
        if (r < heap.length && heapF[r] < heapF[m]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]]; [heapF[m], heapF[c]] = [heapF[c], heapF[m]];
        c = m;
      }
    }
    return top;
  }
  let guard = 0;
  while (heap.length && guard < 4000) {
    guard += 1;
    const cur = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) break;
    const cx = hx(cur), cy = hy(cur);
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let k = 0; k < 4; k += 1) {
      const nx = cx + nb[k][0], ny = cy + nb[k][1];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      if (!walkable[ni] || closed[ni]) continue;
      const ng = g[cur] + CELL;
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; push(ni, ng + heur(ni)); }
    }
  }
  if (!closed[goal] && from[goal] === -1) return [];
  const cells = [];
  let cur = goal;
  while (cur !== -1) { cells.push(cur); cur = from[cur]; }
  cells.reverse();
  return cells.map((i) => cellCenter(hx(i), hy(i)));
}
