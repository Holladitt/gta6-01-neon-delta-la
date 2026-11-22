// A* pathfinding over a coarse grid, so police cars route around buildings
// instead of driving through them. The grid is a plain 2D array of 0/1,
// 1 meaning blocked, with a fixed cell size in metres.

export function astar(grid, sx, sz, gx, gz) {
  const rows = grid.length;
  const cols = grid[0].length;
  const key = (x, z) => z * cols + x;
  const open = [{ x: sx, z: sz, g: 0, f: 0, parent: null }];
  const best = new Map([[key(sx, sz), 0]]);
  const closed = new Set();
  const heuristic = (x, z) => Math.abs(x - gx) + Math.abs(z - gz);
  while (open.length > 0) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bi].f) bi = i;
    }
    const node = open.splice(bi, 1)[0];
    if (node.x === gx && node.z === gz) {
      const path = [];
      let cur = node;
      while (cur) {
        path.unshift([cur.x, cur.z]);
        cur = cur.parent;
      }
      return path;
    }
    closed.add(key(node.x, node.z));
    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dx, dz] of neighbours) {
      const nx = node.x + dx;
      const nz = node.z + dz;
      if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue;
      if (grid[nz][nx] === 1) continue;
      const k = key(nx, nz);
      if (closed.has(k)) continue;
      const stepCost = dx !== 0 && dz !== 0 ? 1.414 : 1;
      const g = node.g + stepCost;
      if (best.has(k) && best.get(k) <= g) continue;
      best.set(k, g);
      open.push({ x: nx, z: nz, g, f: g + heuristic(nx, nz), parent: node });
    }
  }
  return null;
}

// Convenience wrapper: path in world metres between two points, using a
// blocked(x, z) predicate and a cell size. Returns waypoints in metres.
export function findPath(startX, startZ, goalX, goalZ, blocked, cell = 10, span = 90) {
  const half = span * cell;
  const cols = span * 2 + 1;
  const rows = span * 2 + 1;
  const grid = [];
  for (let rz = 0; rz < rows; rz++) {
    const row = [];
    for (let cx = 0; cx < cols; cx++) {
      const wx = startX - half + cx * cell;
      const wz = startZ - half + rz * cell;
      row.push(blocked(wx, wz) ? 1 : 0);
    }
    grid.push(row);
  }
  const sx = Math.round((startX - (startX - half)) / cell);
  const sz = Math.round((startZ - (startZ - half)) / cell);
  const gx = Math.max(0, Math.min(cols - 1, Math.round((goalX - (startX - half)) / cell)));
  const gz = Math.max(0, Math.min(rows - 1, Math.round((goalZ - (startZ - half)) / cell)));
  const path = astar(grid, sx, sz, gx, gz);
  if (!path) return null;
  return path.map(([cx, rz]) => [startX - half + cx * cell, startZ - half + rz * cell]);
}
