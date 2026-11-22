// A* pathfinding over the road graph: nodes are {id: {x, z, links: [{id, cost}]}}.
// Pure — no THREE, no DOM — so police flanking routes are deterministic
// and testable outside the browser.
export function astar(nodes, startId, goalId) {
  if (!nodes[startId] || !nodes[goalId]) return null;
  if (startId === goalId) return [startId];

  const open = new Map([[startId, 0]]);
  const came = new Map();
  const gScore = new Map([[startId, 0]]);
  const heuristic = (id) => {
    const a = nodes[id];
    const b = nodes[goalId];
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  };
  const fScore = new Map([[startId, heuristic(startId)]]);

  while (open.size > 0) {
    let cur = null;
    let best = Infinity;
    for (const [id, fv] of fScore) {
      if (open.has(id) && fv < best) {
        best = fv;
        cur = id;
      }
    }
    if (cur === null) break;
    if (cur === goalId) {
      const path = [cur];
      while (came.has(path[0])) path.unshift(came.get(path[0]));
      return path;
    }
    open.delete(cur);
    for (const link of nodes[cur].links) {
      const tentative = (gScore.get(cur) ?? Infinity) + link.cost;
      if (tentative < (gScore.get(link.id) ?? Infinity)) {
        came.set(link.id, cur);
        gScore.set(link.id, tentative);
        fScore.set(link.id, tentative + heuristic(link.id));
        open.set(link.id, tentative + heuristic(link.id));
      }
    }
  }
  return null;
}

// Id of the graph node nearest to a point (squared distance, no sqrt).
export function nearestNode(nodes, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const [id, n] of Object.entries(nodes)) {
    const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}
