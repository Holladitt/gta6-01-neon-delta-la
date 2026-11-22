// Mission state machine: walk the objective chain, pay out on completion.
import { MISSIONS, STANDING_GAIN } from './config.js';

export function createMissionState() { return { current: 1, done: [], objectiveIndex: 0 }; }
export function missionById(id) { return MISSIONS.find((m) => m.id === id); }
export function currentMission(ms) { return missionById(ms.current) || null; }
export function currentObjective(ms) {
  const m = currentMission(ms);
  if (!m) return null;
  return m.points[Math.min(ms.objectiveIndex, m.points.length - 1)];
}
export function reachObjective(ms, x, z) {
  const m = currentMission(ms);
  if (!m) return { event: 'none' };
  const pt = m.points[ms.objectiveIndex];
  if (!pt) return { event: 'none' };
  if (Math.hypot(x - pt.x, z - pt.z) > 12) return { event: 'none' };
  if (ms.objectiveIndex < m.points.length - 1) {
    ms.objectiveIndex++;
    return { event: 'objective' };
  }
  ms.done.push(m.id);
  ms.current = m.id + 1;
  ms.objectiveIndex = 0;
  return { event: 'complete', payout: m.payout, district: m.district, standing: STANDING_GAIN.mission };
}
export function allMissionsDone(ms) { return ms.current > MISSIONS.length; }
export function totalPayout() { return MISSIONS.reduce((s, m) => s + m.payout, 0); }
export function totalRp() { return MISSIONS.reduce((s, m) => s + Math.round(m.payout / 10), 0); }
