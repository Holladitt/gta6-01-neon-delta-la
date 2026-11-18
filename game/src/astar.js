// Pure A* over a graph of {id: {x, z, links: [{id, cost}]}}.
// No dependencies — node-testable.
export function astar(nodes, startId, goalId) {
  if (!nodes[startId] || !nodes[goalId]) return null;
  if (startId === goalId) return [startId];
  const open = new Map([[startId, 0]]);
  const came = new Map();
  const g = new Map([[startId, 0]]);
  const h = (id) => {
    const a = nodes[id], b = nodes[goalId];
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  };
  const f = new Map([[startId, h(startId)]]);
  while (open.size > 0) {
    let cur = null, best = Infinity;
    for (const [id, fv] of f) { if (open.has(id) && fv < best) { best = fv; cur = id; } }
    if (cur === null) break;
    if (cur === goalId) {
      const path = [cur];
      while (came.has(path[0])) path.unshift(came.get(path[0]));
      return path;
    }
    open.delete(cur);
    for (const link of nodes[cur].links) {
      const ng = (g.get(cur) ?? Infinity) + link.cost;
      if (ng < (g.get(link.id) ?? Infinity)) {
        came.set(link.id, cur);
        g.set(link.id, ng);
        f.set(link.id, ng + h(link.id));
        open.set(link.id, ng + h(link.id));
      }
    }
  }
  return null;
}

// Nearest graph node id to a point.
export function nearestNode(nodes, x, z) {
  let best = null, bd = Infinity;
  for (const [id, n] of Object.entries(nodes)) {
    const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}
