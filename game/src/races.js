// Street races, side jobs and Aurora tapes for Neon Delta LA.
// A race marker starts a 5-checkpoint race in a district (pays money,
// +5 standing). Taxi and courier jobs pay money and +3 standing. Twenty
// collectible Aurora tapes hide around the city; the HUD counts them.
import { RACE, JOBS, TAPES_TOTAL, TAPE_BONUS, STANDING_GAIN, DISTRICTS, districtAt } from './config.js';
import { makeRng, dist2 } from './rng.js';
import { randomRoadPoint } from './geo.js';

export function createRaceState() {
  return { active: false, checkpoints: [], index: 0, district: null, startedAt: 0 };
}

export function startRace(rs, district, seed) {
  const rng = makeRng(seed === undefined ? 99 : seed);
  const d = DISTRICTS.find((x) => x.id === district) || DISTRICTS[0];
  const cps = [];
  let guard = 0;
  while (cps.length < RACE.checkpoints && guard < 200) {
    guard += 1;
    const p = randomRoadPoint(rng);
    if (districtAt(p.x, p.z).id !== d.id) continue;
    if (cps.some((c) => dist2(c.x, c.z, p.x, p.z) < 60)) continue;
    cps.push({ x: Math.round(p.x), z: Math.round(p.z) });
  }
  rs.active = true;
  rs.checkpoints = cps;
  rs.index = 0;
  rs.district = d.id;
  return cps;
}

export function raceCheckpoint(rs, x, z) {
  if (!rs.active) return { event: 'none' };
  const cp = rs.checkpoints[rs.index];
  if (!cp) return { event: 'none' };
  if (dist2(x, z, cp.x, cp.z) > 15) return { event: 'none' };
  rs.index += 1;
  if (rs.index >= rs.checkpoints.length) {
    rs.active = false;
    return { event: 'finish', reward: RACE.reward, standing: STANDING_GAIN.race };
  }
  return { event: 'checkpoint', index: rs.index };
}

export function createJobState() {
  return { active: false, type: null, from: null, to: null, reward: 0 };
}

export function startJob(js, type, x, z) {
  const job = JOBS[type];
  if (!job) return { ok: false };
  const rng = makeRng(1000 + Math.round(x) + Math.round(z));
  const to = randomRoadPoint(rng);
  js.active = true;
  js.type = type;
  js.from = { x, z };
  js.to = { x: Math.round(to.x), z: Math.round(to.z) };
  js.reward = job.reward;
  return { ok: true, to: js.to };
}

export function completeJob(js, x, z) {
  if (!js.active) return { event: 'none' };
  if (dist2(x, z, js.to.x, js.to.z) > 15) return { event: 'none' };
  js.active = false;
  return { event: 'complete', reward: js.reward, standing: STANDING_GAIN.job, type: js.type };
}

export function tapeSpots() {
  const spots = [
    { x: -350, z: -350, district: 'downtown' },
    { x: -150, z: -450, district: 'downtown' },
    { x: -450, z: -150, district: 'downtown' },
    { x: -100, z: -500, district: 'downtown' },
    { x: -450, z: 150, district: 'venice' },
    { x: -350, z: 50, district: 'venice' },
    { x: -500, z: 250, district: 'venice' },
    { x: -200, z: 150, district: 'venice' },
    { x: -700, z: 420, district: 'pier' },
    { x: -650, z: 480, district: 'pier' },
    { x: -750, z: 380, district: 'pier' },
    { x: 450, z: 450, district: 'port' },
    { x: 600, z: 500, district: 'port' },
    { x: 350, z: 550, district: 'port' },
    { x: 150, z: 100, district: 'marina' },
    { x: 50, z: 200, district: 'marina' },
    { x: 250, z: 50, district: 'marina' },
    { x: 200, z: -400, district: 'hills' },
    { x: 400, z: -350, district: 'hills' },
    { x: 100, z: -500, district: 'hills' },
  ];
  return spots.slice(0, TAPES_TOTAL);
}

export function createTapeState() {
  return { found: [] };
}

export function collectTape(ts, x, z) {
  const spots = tapeSpots();
  for (let i = 0; i < spots.length; i += 1) {
    if (ts.found.includes(i)) continue;
    if (dist2(x, z, spots[i].x, spots[i].z) > 10) continue;
    ts.found.push(i);
    return { event: 'tape', bonus: TAPE_BONUS, index: i };
  }
  return { event: 'none' };
}

export function tapesFound(ts) {
  return ts.found.length;
}
