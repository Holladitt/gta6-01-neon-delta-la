// races.js — street races (5 checkpoints), side jobs, Aurora tapes.
import { RACE, JOBS, TAPES_TOTAL, TAPE_BONUS, DISTRICTS, districtAt, STANDING_GAIN } from './config.js';
import { makeRng, dist2 } from './rng.js';
import { randomRoadPoint } from './geo.js';

const CP_REACH = 20;
const TAPE_REACH = 12;

function asRng(rng) {
  return typeof rng === 'function' ? rng : makeRng(rng === undefined ? 1 : rng);
}
export function createRaceState() {
  return { active: false, checkpoint: 0, points: [], reward: RACE.reward, district: null };
}
export function startRace(rs, district, seed) {
  const r = asRng(seed);
  const pts = [];
  let guard = 0;
  while (pts.length < RACE.checkpoints && guard < 800) {
    guard += 1;
    const p = randomRoadPoint(r);
    if (district && districtAt(p.x, p.z).id !== district) continue;
    if (pts.some((q) => dist2(q.x, q.z, p.x, p.z) < 80)) continue;
    pts.push(p);
  }
  rs.active = true;
  rs.checkpoint = 0;
  rs.points = pts;
  rs.district = district || null;
  return rs.points;
}
export function raceCheckpoint(rs, x, z) {
  if (!rs.active) return { event: 'none' };
  const p = rs.points[rs.checkpoint];
  if (!p) return { event: 'none' };
  if (dist2(x, z, p.x, p.z) > CP_REACH) return { event: 'none' };
  rs.checkpoint += 1;
  if (rs.checkpoint >= rs.points.length) {
    rs.active = false;
    return { event: 'finish', reward: RACE.reward, standing: STANDING_GAIN.race };
  }
  return { event: 'checkpoint', checkpoint: rs.checkpoint };
}

export function createJobState() {
  return { active: false, kind: null, to: null, reward: 0, standing: 0 };
}
export function startJob(js, kind, a, b) {
  const job = JOBS[kind];
  if (!job) return { ok: false };
  const r = typeof a === 'function' ? a : makeRng(((a || 0) * 1000 + (b || 0) + 7) >>> 0);
  js.active = true;
  js.kind = kind;
  js.from = typeof a === 'number' ? { x: a, z: b } : null;
  js.to = randomRoadPoint(r);
  js.reward = 0;
  js.standing = 0;
  return { ok: true };
}
export function completeJob(js, x, z) {
  if (!js.active || !js.to) return { event: 'none' };
  if (dist2(x, z, js.to.x, js.to.z) > CP_REACH) return { event: 'none' };
  const job = JOBS[js.kind];
  js.reward = job ? job.reward : 0;
  js.standing = 3;
  js.active = false;
  return { event: 'complete', reward: js.reward, standing: js.standing };
}

export function tapeSpots() {
  const rng = makeRng(99);
  const perDistrict = { downtown: 4, hills: 3, venice: 3, marina: 3, pier: 3, port: 4 };
  const spots = [];
  for (const d of DISTRICTS) {
    const want = perDistrict[d.id] || 0;
    let placed = 0;
    let guard = 0;
    while (placed < want && guard < 400) {
      guard += 1;
      const p = randomRoadPoint(rng);
      if (districtAt(p.x, p.z).id !== d.id) continue;
      if (spots.some((q) => dist2(q.x, q.z, p.x, p.z) < 60)) continue;
      spots.push({ x: p.x, z: p.z, district: d.id });
      placed += 1;
    }
  }
  return spots;
}
export function createTapeState() {
  return { spots: tapeSpots(), collected: [], found: [], tapesFound: 0 };
}
export function collectTape(ts, x, z) {
  for (let i = 0; i < ts.spots.length; i += 1) {
    const s = ts.spots[i];
    if (ts.collected.includes(i)) continue;
    if (dist2(x, z, s.x, s.z) > TAPE_REACH) continue;
    ts.collected.push(i);
    ts.found.push(i);
    ts.tapesFound += 1;
    return { event: 'tape', bonus: TAPE_BONUS };
  }
  return { event: 'none' };
}
export function tapesFound(ts) {
  return ts ? (ts.tapesFound || 0) : 0;
}
export { TAPES_TOTAL, TAPE_BONUS };
