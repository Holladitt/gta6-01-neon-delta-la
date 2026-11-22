// astar.js — A* pathfinding over the road grid (pure).
// Nodes are [x, z] road intersections; edges join orthogonal neighbours.
import { roadNodes } from './geo.js';
import { ROAD_SPACING, WORLD_HALF } from './config.js';

function key(x, z) {
  return x + ',' + z;
}

export function buildGraph() {
  const nodes = new Map();
  for (const [x, z] of roadNodes()) nodes.set(key(x, z), [x, z]);
  return nodes;
}

function neighbours(nodes, x, z) {
  const out = [];
  for (const [dx, dz] of [[ROAD_SPACING, 0], [-ROAD_SPACING, 0], [0, ROAD_SPACING], [0, -ROAD_SPACING]]) {
    const nx = x + dx, nz = z + dz;
    if (nx < -WORLD_HALF || nx > WORLD_HALF || nz < -WORLD_HALF || nz > 750) continue;
    if (nodes.has(key(nx, nz))) out.push([nx, nz]);
  }
  return out;
}

function heuristic(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

// Returns an array of [x, z] waypoints from start to goal (inclusive),
// or null when no route exists.
export function findPath(nodes, start, goal) {
  const s = nearestInGraph(nodes, start);
  const g = nearestInGraph(nodes, goal);
  if (!s || !g) return null;
  const open = [{ node: s, f: heuristic(s, g), g: 0 }];
  const came = new Map();
  const cost = new Map([[key(s[0], s[1]), 0]]);
  const closed = new Set();
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0].node;
    const ck = key(cur[0], cur[1]);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur[0] === g[0] && cur[1] === g[1]) {
      const path = [cur];
      let k = ck;
      while (came.has(k)) {
        const prev = came.get(k);
        path.unshift(prev);
        k = key(prev[0], prev[1]);
      }
      return path;
    }
    for (const nb of neighbours(nodes, cur[0], cur[1])) {
      const nk = key(nb[0], nb[1]);
      if (closed.has(nk)) continue;
      const nc = cost.get(ck) + ROAD_SPACING;
      if (nc < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, nc);
        came.set(nk, cur);
        open.push({ node: nb, f: nc + heuristic(nb, g), g: nc });
      }
    }
  }
  return null;
}

function nearestInGraph(nodes, p) {
  const nx = Math.round(p[0] / ROAD_SPACING) * ROAD_SPACING;
  const nz = Math.round(p[1] / ROAD_SPACING) * ROAD_SPACING;
  const clamped = [
    Math.max(-WORLD_HALF, Math.min(WORLD_HALF, nx)),
    Math.max(-WORLD_HALF, Math.min(750, nz)),
  ];
  return nodes.has(key(clamped[0], clamped[1])) ? clamped : null;
}
