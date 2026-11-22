// missions.js — mission scripting engine: objectives, completion, totals.
import { MISSIONS, STANDING_GAIN } from './config.js';
import { rpForPayout } from './rank.js';

const REACH = 14;

export function createMissionState() {
  return { current: 1, objective: 0, done: [] };
}
export function currentMission(ms) {
  return MISSIONS[ms.current - 1] || null;
}
export function currentObjective(ms) {
  const m = currentMission(ms);
  if (!m) return null;
  return m.points[ms.objective] || null;
}
export function reachObjective(ms, x, z) {
  const m = currentMission(ms);
  if (!m) return { event: 'none' };
  const p = m.points[ms.objective];
  if (!p) return { event: 'none' };
  const dx = x - p.x;
  const dz = z - p.z;
  if (dx * dx + dz * dz > REACH * REACH) return { event: 'none' };
  if (ms.objective < m.points.length - 1) {
    ms.objective += 1;
    return { event: 'objective', mission: m.id };
  }
  ms.done.push(m.id);
  ms.current = m.id + 1;
  ms.objective = 0;
  return { event: 'complete', mission: m.id, payout: m.payout, rp: rpForPayout(m.payout), district: m.district, standing: STANDING_GAIN.mission };
}
export function totalPayout() {
  return MISSIONS.reduce((s, m) => s + m.payout, 0);
}
export function totalRp() {
  return MISSIONS.reduce((s, m) => s + rpForPayout(m.payout), 0);
}
export function allMissionsDone(ms) {
  return ms.done.length >= MISSIONS.length;
}
