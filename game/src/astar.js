// A* over an 8 m grid. Roads are cheap, off-road land costs more;
// ocean and buildings are unwalkable. Pure.
import { onRoad, inOcean, inBuilding } from './geo.js';
const GRID = 8;
const HALF = 780;
const N = Math.ceil((HALF * 2) / GRID);
export function cellOf(x, z) {
  return { col: Math.floor((x + HALF) / GRID), row: Math.floor((z + HALF) / GRID) };
}
export function cellCenter(col, row) {
  return { x: col * GRID + GRID / 2 - HALF, z: row * GRID + GRID / 2 - HALF };
}
export function walkable(col, row) {
  if (col < 0 || row < 0 || col >= N || row >= N) return false;
  const p = cellCenter(col, row);
  if (inOcean(p.x, p.z)) return false;
  if (inBuilding(p.x, p.z)) return false;
  return true;
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
export function findPath(x0, z0, x1, z1) {
  const start = cellOf(x0, z0);
  const goal = cellOf(x1, z1);
  const key = (c, r) => r * N + c;
  const gScore = new Map();
  const came = new Map();
  const closed = new Set();
  const heap = [];
  function heapPush(item) {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
      i = p;
    }
  }
  function heapPop() {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        const t = heap[m]; heap[m] = heap[i]; heap[i] = t;
        i = m;
      }
    }
    return top;
  }
  const h = (c, r) => Math.abs(c - goal.col) + Math.abs(r - goal.row);
  gScore.set(key(start.col, start.row), 0);
  heapPush([h(start.col, start.row), start.col, start.row]);
  let found = false;
  let guard = 0;
  while (heap.length && guard++ < 30000) {
    const item = heapPop();
    const c = item[1];
    const r = item[2];
    const k = key(c, r);
    if (closed.has(k)) continue;
    closed.add(k);
    if (c === goal.col && r === goal.row) { found = true; break; }
    const g = gScore.get(k);
    for (const d of DIRS) {
      const nc = c + d[0];
      const nr = r + d[1];
      if (!walkable(nc, nr)) continue;
      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      const p = cellCenter(nc, nr);
      const step = (onRoad(p.x, p.z) ? 1 : 3) * (d[0] !== 0 && d[1] !== 0 ? 1.4 : 1);
      const ng = g + step;
      if (ng < (gScore.get(nk) === undefined ? Infinity : gScore.get(nk))) {
        gScore.set(nk, ng);
        came.set(nk, k);
        heapPush([ng + h(nc, nr), nc, nr]);
      }
    }
  }
  if (!found) return [];
  const path = [];
  let k = key(goal.col, goal.row);
  while (k !== undefined) {
    const c = k % N;
    const r = Math.floor(k / N);
    path.push(cellCenter(c, r));
    k = came.get(k);
  }
  path.reverse();
  return path;
}
