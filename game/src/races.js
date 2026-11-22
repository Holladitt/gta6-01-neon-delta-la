// Street races, taxi/courier jobs, Aurora tapes. Pure.
import { RACE, JOBS, TAPES_TOTAL, TAPE_BONUS, DISTRICTS, districtById, districtAt } from './config.js';
import { makeRng } from './rng.js';
import { AVENUES, STREETS, onRoad, inBuilding, inOcean, randomRoadPoint, nearestRoadPoint } from './geo.js';

// Every road point inside a district, sampled on a coarse grid.
function districtRoadPoints(districtId) {
  const d = districtById(districtId);
  const pts = [];
  for (const ax of AVENUES) {
    if (ax < d.x0 || ax > d.x1) continue;
    for (let z = d.z0 + 10; z <= d.z1 - 10; z += 30) {
      if (!inBuilding(ax, z) && !inOcean(ax, z)) pts.push({ x: ax, z });
    }
  }
  for (const sz of STREETS) {
    if (sz < d.z0 || sz > d.z1) continue;
    for (let x = d.x0 + 10; x <= d.x1 - 10; x += 30) {
      if (!inBuilding(x, sz) && !inOcean(x, sz)) pts.push({ x, z: sz });
    }
  }
  return pts;
}
function shuffled(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// --- Races ---
export function createRaceState() {
  return { active: false, checkpoints: [], index: 0, district: null };
}
export function startRace(rs, districtId, seed) {
  const rng = makeRng(seed || 1);
  const pts = shuffled(rng, districtRoadPoints(districtId));
  const cps = [];
  for (const p of pts) {
    if (cps.length >= RACE.checkpoints) break;
    if (cps.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 60)) continue;
    cps.push({ x: p.x, z: p.z, index: cps.length });
  }
  if (cps.length < RACE.checkpoints) {
    for (const p of pts) {
      if (cps.length >= RACE.checkpoints) break;
      if (cps.some((c) => c.x === p.x && c.z === p.z)) continue;
      cps.push({ x: p.x, z: p.z, index: cps.length });
    }
  }
  rs.active = true;
  rs.checkpoints = cps;
  rs.index = 0;
  rs.district = districtId;
  return cps;
}
export function raceCheckpoint(rs, x, z) {
  if (!rs.active) return { event: 'none' };
  const cp = rs.checkpoints[rs.index];
  if (!cp) return { event: 'none' };
  if (Math.hypot(x - cp.x, z - cp.z) > 15) return { event: 'none' };
  rs.index += 1;
  if (rs.index >= rs.checkpoints.length) {
    rs.active = false;
    return { event: 'finish', reward: RACE.reward, standing: 5 };
  }
  return { event: 'checkpoint', index: rs.index };
}

// --- Jobs ---
export function createJobState() {
  return { active: false, kind: null, to: null, from: null };
}
export function startJob(js, kind, x, z) {
  const rng = makeRng(Math.floor(Math.abs(x * 7 + z * 13) + kind.length * 31 + 5));
  let to = null;
  for (let i = 0; i < 200; i += 1) {
    const p = randomRoadPoint(rng);
    if (Math.hypot(p.x - x, p.z - z) < 100) continue;
    if (inBuilding(p.x, p.z) || inOcean(p.x, p.z)) continue;
    to = p;
    break;
  }
  if (!to) to = nearestRoadPoint(x + 200, z + 200);
  js.active = true;
  js.kind = kind;
  js.from = { x, z };
  js.to = to;
  return { ok: true, to };
}
export function completeJob(js, x, z) {
  if (!js.active || !js.to) return { event: 'none' };
  if (Math.hypot(x - js.to.x, z - js.to.z) > 15) return { event: 'none' };
  js.active = false;
  const reward = JOBS[js.kind] ? JOBS[js.kind].reward : 100;
  return { event: 'complete', reward, standing: 3 };
}

// --- Aurora tapes ---
const TAPE_PER_DISTRICT = { downtown: 4, hills: 3, venice: 3, marina: 3, pier: 4, port: 3 };
export function tapeSpots() {
  const rng = makeRng(4242);
  const spots = [];
  for (const d of DISTRICTS) {
    const pts = shuffled(rng, districtRoadPoints(d.id));
    const n = TAPE_PER_DISTRICT[d.id] || 3;
    for (let i = 0; i < n && i < pts.length; i += 1) {
      spots.push({ x: pts[i].x, z: pts[i].z, district: d.id });
    }
  }
  return spots.slice(0, TAPES_TOTAL);
}
export function createTapeState() {
  return { found: [] };
}
export function collectTape(ts, x, z) {
  const spots = tapeSpots();
  for (let i = 0; i < spots.length; i += 1) {
    if (ts.found.indexOf(i) >= 0) continue;
    if (Math.hypot(x - spots[i].x, z - spots[i].z) <= 12) {
      ts.found.push(i);
      return { event: 'tape', bonus: TAPE_BONUS, index: i };
    }
  }
  return { event: 'none' };
}
export function tapesFound(ts) {
  return ts.found.length;
}
