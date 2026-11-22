// Mission scripting engine for Neon Delta LA.
// Ten story missions, each a chain of objective points. Reaching a point
// advances the chain; the last point completes the mission, pays out,
// raises the district standing and moves the day forward by one.
import { MISSIONS, MISSION_TOTAL_PAYOUT, MISSION_TOTAL_RP, STANDING_GAIN } from './config.js';
import { dist2 } from './rng.js';

export const OBJECTIVE_RADIUS = 14;

export function createMissionState() {
  return { current: 1, done: [], objectiveIndex: 0 };
}

export function currentMission(ms) {
  return MISSIONS[ms.current - 1] || null;
}

export function currentObjective(ms) {
  const m = currentMission(ms);
  if (!m) return null;
  return m.points[ms.objectiveIndex] || null;
}

export function reachObjective(ms, x, z) {
  const m = currentMission(ms);
  if (!m) return { event: 'none' };
  const p = m.points[ms.objectiveIndex];
  if (!p) return { event: 'none' };
  if (dist2(x, z, p.x, p.z) > OBJECTIVE_RADIUS) return { event: 'none' };
  ms.objectiveIndex += 1;
  if (ms.objectiveIndex >= m.points.length) {
    ms.done.push(m.id);
    ms.current = Math.min(m.id + 1, MISSIONS.length + 1);
    ms.objectiveIndex = 0;
    return { event: 'complete', payout: m.payout, district: m.district, standing: STANDING_GAIN.mission, mission: m.id };
  }
  return { event: 'objective', mission: m.id, index: ms.objectiveIndex };
}

export function totalPayout() {
  return MISSION_TOTAL_PAYOUT;
}

export function totalRp() {
  return MISSION_TOTAL_RP;
}

export function allMissionsDone(ms) {
  return ms.done.length >= MISSIONS.length;
}
