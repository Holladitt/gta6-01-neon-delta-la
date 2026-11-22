// astar.js — grid A* over 80-unit cells, origin (-800,-800).
import { inBuilding, inOcean } from './geo.js';

const CELL = 80;
const ORIGIN = -800;
const N = 20;

export function cellOf(x, z) {
  return { col: Math.floor((x - ORIGIN) / CELL), row: Math.floor((z - ORIGIN) / CELL) };
}
export function cellCenter(col, row) {
  return { x: col * CELL + CELL / 2 + ORIGIN, z: row * CELL + CELL / 2 + ORIGIN };
}
export function walkable(col, row) {
  if (col < 0 || row < 0 || col >= N || row >= N) return false;
  const c = cellCenter(col, row);
  if (inBuilding(c.x, c.z)) return false;
  if (inOcean(c.x, c.z)) return false;
  return true;
}
function nearestWalkable(col, row) {
  if (walkable(col, row)) return { col, row };
  for (let r = 1; r <= N; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (let dz = -r; dz <= r; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (walkable(col + dx, row + dz)) return { col: col + dx, row: row + dz };
      }
    }
  }
  return null;
}
export function findPath(x0, z0, x1, z1) {
  const s0 = cellOf(x0, z0);
  const g0 = cellOf(x1, z1);
  const start = nearestWalkable(s0.col, s0.row);
  const goal = nearestWalkable(g0.col, g0.row);
  if (!start || !goal) return [];
  const key = (col, row) => col + ',' + row;
  const open = [{ col: start.col, row: start.row, g: 0, f: 0, parent: null }];
  const best = new Map();
  best.set(key(start.col, start.row), 0);
  const closed = new Set();
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let found = null;
  while (open.length > 0) {
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bi].f) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    const k = key(cur.col, cur.row);
    if (closed.has(k)) continue;
    closed.add(k);
    if (cur.col === goal.col && cur.row === goal.row) {
      found = cur;
      break;
    }
    for (const [dx, dz] of dirs) {
      const nx = cur.col + dx;
      const nz = cur.row + dz;
      if (!walkable(nx, nz)) continue;
      const ng = cur.g + (dx !== 0 && dz !== 0 ? 1.414 : 1);
      const nk = key(nx, nz);
      if (best.has(nk) && best.get(nk) <= ng) continue;
      best.set(nk, ng);
      const h = Math.hypot(goal.col - nx, goal.row - nz);
      open.push({ col: nx, row: nz, g: ng, f: ng + h, parent: cur });
    }
  }
  if (!found) return [];
  const cells = [];
  let node = found;
  while (node) {
    cells.unshift(cellCenter(node.col, node.row));
    node = node.parent;
  }
  return cells;
}
