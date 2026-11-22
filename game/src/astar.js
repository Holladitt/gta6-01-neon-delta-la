// A-star pathfinding for Neon Delta LA police flanking.
// A 40-unit grid over the whole map; a cell is walkable when its centre
// is on land and clear of buildings. Start and goal snap to the nearest
// walkable cell, so a path exists from anywhere on land.
import { inBuilding, inOcean } from './geo.js';

export const CELL = 40;
export const GRID_MIN = -800;
export const GRID_CELLS = 40;

export function cellOf(x, z) {
  const col = Math.max(0, Math.min(GRID_CELLS - 1, Math.floor((x - GRID_MIN) / CELL)));
  const row = Math.max(0, Math.min(GRID_CELLS - 1, Math.floor((z - GRID_MIN) / CELL)));
  return { col, row };
}

export function cellCenter(col, row) {
  return { x: GRID_MIN + col * CELL + CELL / 2, z: GRID_MIN + row * CELL + CELL / 2 };
}

export function walkable(col, row) {
  if (col < 0 || row < 0 || col >= GRID_CELLS || row >= GRID_CELLS) return false;
  const c = cellCenter(col, row);
  if (inOcean(c.x, c.z)) return false;
  if (inBuilding(c.x, c.z)) return false;
  return true;
}

function nearestWalkable(col, row) {
  if (walkable(col, row)) return { col, row };
  for (let r = 1; r <= GRID_CELLS; r += 1) {
    for (let dc = -r; dc <= r; dc += 1) {
      for (let dr = -r; dr <= r; dr += 1) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== r) continue;
        if (walkable(col + dc, row + dr)) return { col: col + dc, row: row + dr };
      }
    }
  }
  return { col, row };
}

export function findPath(x0, z0, x1, z1) {
  const s = nearestWalkable(cellOf(x0, z0).col, cellOf(x0, z0).row);
  const g = nearestWalkable(cellOf(x1, z1).col, cellOf(x1, z1).row);
  const key = (c, r) => c + ',' + r;
  const open = [{ col: s.col, row: s.row, g: 0, f: 0, parent: null }];
  const best = new Map();
  best.set(key(s.col, s.row), 0);
  const closed = new Set();
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4], [1, -1, 1.4], [-1, 1, 1.4], [-1, -1, 1.4]];
  let goal = null;
  while (open.length > 0) {
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.col, cur.row);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.col === g.col && cur.row === g.row) { goal = cur; break; }
    for (const [dc, dr, cost] of dirs) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (!walkable(nc, nr)) continue;
      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      const ng = cur.g + cost;
      if (best.has(nk) && best.get(nk) <= ng) continue;
      best.set(nk, ng);
      const h = Math.hypot(nc - g.col, nr - g.row);
      open.push({ col: nc, row: nr, g: ng, f: ng + h, parent: cur });
    }
    if (closed.size > 4000) break;
  }
  if (!goal) return [cellCenter(s.col, s.row), cellCenter(g.col, g.row)];
  const path = [];
  let n = goal;
  while (n) {
    path.unshift(cellCenter(n.col, n.row));
    n = n.parent;
  }
  return path;
}
