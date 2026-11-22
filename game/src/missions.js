// Mission state machine. Pure.
import { MISSIONS, STANDING_GAIN } from './config.js';
import { dist2 } from './rng.js';
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
  const o = m.points[ms.objective];
  if (!o) return { event: 'none' };
  if (dist2(x, z, o.x, o.z) > 15) return { event: 'none' };
  if (ms.objective >= m.points.length - 1) {
    ms.done.push(m.id);
    ms.current += 1;
    ms.objective = 0;
    return { event: 'complete', payout: m.payout, district: m.district, standing: STANDING_GAIN.mission, id: m.id, name: m.name };
  }
  ms.objective += 1;
  return { event: 'objective', index: ms.objective };
}
export function totalPayout() {
  return MISSIONS.reduce((s, m) => s + m.payout, 0);
}
export function totalRp() {
  return MISSIONS.reduce((s, m) => s + Math.round(m.payout / 10), 0);
}
export function allMissionsDone(ms) {
  return ms.current > MISSIONS.length;
}
