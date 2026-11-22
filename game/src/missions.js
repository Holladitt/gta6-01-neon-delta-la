// Mission scripting engine: ten story missions in order, each with
// ordered objective points. Finishing a mission reports the payout
// and the district it finished in; the world applies the payout,
// the rank points (payout / 10), the day advance, and the district
// standing. The engine itself only moves the objective pointer.
import { MISSIONS, MISSION_TOTAL_PAYOUT, MISSION_TOTAL_RP, STANDING_GAIN, districtAt, missionById } from './config.js';

export { missionById };

export function createMissionState() {
  return { current: 1, objective: 0, day: 1, completed: [], rp: 0, money: 0 };
}

export function currentMission(state) {
  if (!state.current) return null;
  return MISSIONS.find((m) => m.id === state.current) || null;
}

export function currentObjective(state) {
  const m = currentMission(state);
  if (!m) return null;
  return m.points[state.objective] || null;
}

export function missionProgress(state) {
  const m = currentMission(state);
  if (!m) return { done: true, label: 'ALL MISSIONS DONE' };
  const p = m.points[state.objective];
  return { done: false, label: p ? p.label : m.title, mission: m };
}

// Reach an objective point: advance, or finish the mission.
export function reachObjective(state, x, z) {
  const m = currentMission(state);
  if (!m) return { event: 'none' };
  const p = m.points[state.objective];
  if (!p) return { event: 'none' };
  const dx = x - p.x; const dz = z - p.z;
  if (dx * dx + dz * dz > 25 * 25) return { event: 'none' };
  state.objective += 1;
  if (state.objective < m.points.length) {
    return { event: 'objective', mission: m, next: m.points[state.objective] };
  }
  // Mission complete. The world applies payout, rp and day.
  state.completed.push(m.id);
  const d = districtAt(x, z);
  state.current = m.id + 1 <= MISSIONS.length ? m.id + 1 : null;
  state.objective = 0;
  return { event: 'complete', mission: m, payout: m.payout, district: d.id, standing: STANDING_GAIN.mission };
}

export function totalPayout() {
  return MISSION_TOTAL_PAYOUT;
}

export function totalRp() {
  return MISSION_TOTAL_RP;
}

export function allMissionsDone(state) {
  return state.completed.length === MISSIONS.length;
}
