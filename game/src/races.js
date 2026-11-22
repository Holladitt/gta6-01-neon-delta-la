// Street races (5 checkpoints on a road in the district), side jobs, Aurora tapes.
import { RACE, JOBS, STANDING_GAIN, TAPES_TOTAL, TAPE_BONUS, districtById, districtAt } from './config.js';
import { makeRng } from './rng.js';
import { nearestRoadPoint } from './geo.js';

const AVENUES = [-560, -280, 0, 280, 560];

export function createRaceState() { return { active: false, district: null, checkpoints: [], index: 0 }; }
export function raceCheckpointsFor(districtId, seed) {
  const d = districtById(districtId);
  if (!d) return [];
  const rng = makeRng(seed || 7);
  const aves = AVENUES.filter((x) => x >= d.x0 + 20 && x < d.x1 - 20);
  const pts = [];
  if (aves.length) {
    const x = aves[Math.floor(rng() * aves.length)];
    const z0 = d.z0 + 60, z1 = Math.min(d.z1 - 60, 620);
    for (let i = 0; i < RACE.checkpoints; i++) pts.push({ x, z: z0 + (z1 - z0) * (i / (RACE.checkpoints - 1)) });
  }
  return pts;
}
export function startRace(rs, district, seed) {
  rs.active = true; rs.district = district;
  rs.checkpoints = raceCheckpointsFor(district, seed); rs.index = 0;
  return rs.checkpoints;
}
export function raceCheckpoint(rs, x, z) {
  if (!rs.active) return { event: 'none' };
  const cp = rs.checkpoints[rs.index];
  if (!cp || Math.hypot(x - cp.x, z - cp.z) > 15) return { event: 'none' };
  rs.index++;
  if (rs.index >= rs.checkpoints.length) {
    rs.active = false;
    return { event: 'finish', reward: RACE.reward, standing: STANDING_GAIN.race };
  }
  return { event: 'checkpoint', index: rs.index };
}

export function createJobState() { return { active: false, type: null, from: null, to: null }; }
export function startJob(js, type, sx, sz) {
  if (!JOBS[type]) return { ok: false };
  js.active = true; js.type = type; js.from = { x: sx, z: sz };
  js.to = nearestRoadPoint(sx + 160, sz + 80);
  return { ok: true, js };
}
export function completeJob(js, x, z) {
  if (!js.active || !js.to) return { event: 'none' };
  if (Math.hypot(x - js.to.x, z - js.to.z) > 12) return { event: 'none' };
  js.active = false;
  return { event: 'complete', reward: JOBS[js.type].reward, standing: STANDING_GAIN.job };
}

const TAPE_SPOTS = [
  [-400, -500], [-200, -300], [-100, -280], [-300, -600],
  [100, -600], [280, -400], [500, -300], [700, -600],
  [-500, 0], [-280, 280], [-400, 280],
  [200, 0], [400, 280], [600, 280],
  [-700, 400], [-400, 600], [-200, 560],
  [100, 560], [400, 600], [600, 450],
];
export function tapeSpots() { return TAPE_SPOTS.map(([x, z]) => ({ x, z, district: districtAt(x, z).id })); }
export function createTapeState() { return { found: [] }; }
export function collectTape(ts, x, z) {
  const spots = tapeSpots();
  for (let i = 0; i < spots.length; i++) {
    if (ts.found.includes(i)) continue;
    if (Math.hypot(x - spots[i].x, z - spots[i].z) <= 10) {
      ts.found.push(i);
      return { event: 'tape', bonus: TAPE_BONUS, index: i };
    }
  }
  return { event: 'none' };
}
export function tapesFound(ts) { return ts.found.length; }
