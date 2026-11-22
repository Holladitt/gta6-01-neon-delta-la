// Coarse grid A* over the city (50-unit cells). Walkable = not a building, not ocean.
import { inBuilding, inOcean } from './geo.js';

const CELL = 50, OFF = 800, N = 32;
export function cellOf(x, z) { return { col: Math.floor((x + OFF) / CELL), row: Math.floor((z + OFF) / CELL) }; }
export function cellCenter(col, row) { return { x: col * CELL - OFF + CELL / 2, z: row * CELL - OFF + CELL / 2 }; }
export function walkable(col, row) {
  if (col < 0 || col >= N || row < 0 || row >= N) return false;
  const c = cellCenter(col, row);
  return !inBuilding(c.x, c.z) && !inOcean(c.x, c.z);
}
export function findPath(sx, sz, tx, tz) {
  const s = cellOf(sx, sz), t = cellOf(tx, tz);
  const key = (c, r) => c + ',' + r;
  const prev = new Map([[key(s.col, s.row), null]]);
  const q = [[s.col, s.row]];
  while (q.length) {
    const [c, r] = q.shift();
    if (c === t.col && r === t.row) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (!walkable(nc, nr) || prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), [c, r]);
      q.push([nc, nr]);
    }
  }
  if (!prev.has(key(t.col, t.row))) return [cellCenter(s.col, s.row), cellCenter(t.col, t.row)];
  const path = [];
  let cur = [t.col, t.row];
  while (cur) { path.unshift(cellCenter(cur[0], cur[1])); cur = prev.get(key(cur[0], cur[1])); }
  return path;
}
