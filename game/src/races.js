// Side activities: street races, side jobs, and collectibles.
// A street race is 5 checkpoints in one district; finishing pays
// $350 and adds 5 standing there. Taxi and courier jobs pay $120 /
// $150 and add 3 standing. 20 Aurora tapes are hidden around the
// city; each one collected pays a $50 bonus. The HUD shows the
// tapes counter (found / 20).
import { RACE, JOBS, TAPES_TOTAL, TAPE_BONUS, DISTRICTS, districtAt } from './config.js';
import { makeRng, range, dist2 } from './rng.js';
import { randomRoadPoint, inBuilding } from './geo.js';

export function createRaceState() {
  return { active: false, district: null, checkpoints: [], next: 0, startedAt: 0, finished: 0 };
}

export function startRace(state, districtId, seed) {
  const d = DISTRICTS.find((x) => x.id === districtId) || DISTRICTS[0];
  const rng = makeRng(seed || 1234);
  const cps = [];
  let guard = 0;
  while (cps.length < RACE.checkpoints && guard < 200) {
    guard += 1;
    const p = randomRoadPoint(rng);
    if (districtAt(p.x, p.z).id !== d.id) continue;
    if (inBuilding(p.x, p.z)) continue;
    cps.push({ x: p.x, z: p.z, label: 'CHECKPOINT ' + (cps.length + 1) });
  }
  state.active = true;
  state.district = d.id;
  state.checkpoints = cps;
  state.next = 0;
  state.startedAt = Date.now();
  return cps;
}

export function raceCheckpoint(state, x, z) {
  if (!state.active) return { event: 'none' };
  const cp = state.checkpoints[state.next];
  if (!cp) return { event: 'none' };
  if (dist2(x, z, cp.x, cp.z) > 22) return { event: 'none' };
  state.next += 1;
  if (state.next >= state.checkpoints.length) {
    state.active = false;
    state.finished += 1;
    return { event: 'finish', reward: RACE.reward, standing: RACE.standing, district: state.district };
  }
  return { event: 'checkpoint', next: state.next, total: state.checkpoints.length };
}

export function createJobState() {
  return { active: false, kind: null, from: null, to: null, fare: 0 };
}

export function startJob(state, kind, px, pz) {
  const job = JOBS[kind];
  if (!job) return { ok: false, reason: 'no such job' };
  const d = districtAt(px, pz);
  let to = { x: px + 120, z: pz + 120 };
  let guard = 0;
  while (guard < 60) {
    guard += 1;
    const p = randomRoadPoint(makeRng(Math.floor(Math.random() * 999999)));
    if (districtAt(p.x, p.z).id !== d.id) continue;
    if (inBuilding(p.x, p.z)) continue;
    to = p;
    break;
  }
  state.active = true;
  state.kind = kind;
  state.from = { x: px, z: pz };
  state.to = to;
  state.fare = job.reward;
  return { ok: true, kind, to };
}

export function completeJob(state, x, z) {
  if (!state.active) return { event: 'none' };
  if (dist2(x, z, state.to.x, state.to.z) > 22) return { event: 'none' };
  const job = JOBS[state.kind];
  const d = districtAt(x, z);
  state.active = false;
  return { event: 'complete', kind: state.kind, reward: job.reward, standing: job.standing, district: d.id };
}

// Aurora tapes: 20 fixed hiding spots spread over all six districts.
export function tapeSpots() {
  return [
    { x: -520, z: -520, district: 'downtown' }, { x: -200, z: -420, district: 'downtown' },
    { x: -420, z: -220, district: 'downtown' }, { x: 120, z: -520, district: 'hills' },
    { x: 420, z: -420, district: 'hills' }, { x: 560, z: -220, district: 'hills' },
    { x: -520, z: -40, district: 'venice' }, { x: -320, z: 120, district: 'venice' },
    { x: -160, z: 220, district: 'venice' }, { x: 40, z: -40, district: 'marina' },
    { x: 220, z: 120, district: 'marina' }, { x: 80, z: 220, district: 'marina' },
    { x: -560, z: 340, district: 'pier' }, { x: -300, z: 480, district: 'pier' },
    { x: -680, z: 430, district: 'pier' }, { x: 60, z: 360, district: 'port' },
    { x: 300, z: 480, district: 'port' }, { x: 560, z: 560, district: 'port' },
    { x: 160, z: 580, district: 'port' }, { x: -60, z: 40, district: 'marina' },
  ];
}

export function createTapeState() {
  return { found: [], total: TAPES_TOTAL };
}

export function collectTape(state, x, z) {
  const spots = tapeSpots();
  for (let i = 0; i < spots.length; i += 1) {
    if (state.found.includes(i)) continue;
    if (dist2(x, z, spots[i].x, spots[i].z) > 12) continue;
    state.found.push(i);
    return { event: 'tape', index: i, bonus: TAPE_BONUS, found: state.found.length, total: TAPES_TOTAL };
  }
  return { event: 'none' };
}

export function tapesFound(state) {
  return state.found.length;
}
