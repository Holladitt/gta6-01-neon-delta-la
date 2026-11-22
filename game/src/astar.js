// A-star pathfinding over the road grid. Police cars flank the
// player by following waypoints on the grid instead of driving
// straight through buildings. The grid is 60 units a cell; a cell
// is walkable when it sits on a road or open ground.
import { MAP } from './config.js';

export const CELL = 60;

export function gridSize() {
  return {
    cols: Math.ceil((MAP.x1 - MAP.x0) / CELL),
    rows: Math.ceil((MAP.z1 - MAP.z0) / CELL),
  };
}

export function cellOf(x, z) {
  return {
    col: Math.floor((x - MAP.x0) / CELL),
    row: Math.floor((z - MAP.z0) / CELL),
  };
}

export function cellCenter(col, row) {
  return { x: MAP.x0 + col * CELL + CELL / 2, z: MAP.z0 + row * CELL + CELL / 2 };
}

// Roads run every 120 units; cells near a road line are walkable,
// plus the pier deck, the port yard and the marina apron.
export function walkable(col, row) {
  const { cols, rows } = gridSize();
  if (col < 0 || row < 0 || col >= cols || row >= rows) return false;
  const c = cellCenter(col, row);
  const rx = ((c.x + 700) % 120 + 120) % 120;
  const rz = ((c.z + 700) % 120 + 120) % 120;
  const roadX = rx >= 9 && rx <= 31;
  const roadZ = rz >= 9 && rz <= 31;
  if (roadX || roadZ) return true;
  if (c.x > -80 && c.x < 700 && c.z > 280 && c.z < 620) return true; // port yard
  if (c.x > -780 && c.x < -620 && c.z > 360 && c.z < 500) return true; // pier deck
  if (c.x > -80 && c.x < 320 && c.z > -120 && c.z < 280) return true; // marina apron
  return false;
}

function key(col, row) {
  return col + ',' + row;
}

export function findPath(sx, sz, gx, gz) {
  const start = cellOf(sx, sz);
  const goal = cellOf(gx, gz);
  const open = [{ col: start.col, row: start.row, g: 0, f: 0, parent: null }];
  const seen = new Map();
  seen.set(key(start.col, start.row), 0);
  let best = null;
  let guard = 0;
  while (open.length > 0 && guard < 4000) {
    guard += 1;
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.col === goal.col && cur.row === goal.row) { best = cur; break; }
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dc, dr] of dirs) {
      const nc = cur.col + dc; const nr = cur.row + dr;
      if (!walkable(nc, nr)) continue;
      const g = cur.g + 1;
      const k = key(nc, nr);
      if (seen.has(k) && seen.get(k) <= g) continue;
      seen.set(k, g);
      const h = Math.abs(nc - goal.col) + Math.abs(nr - goal.row);
      open.push({ col: nc, row: nr, g, f: g + h, parent: cur });
    }
  }
  if (!best) return [cellCenter(goal.col, goal.row)];
  const path = [];
  let node = best;
  while (node) {
    path.unshift(cellCenter(node.col, node.row));
    node = node.parent;
  }
  return path;
}
