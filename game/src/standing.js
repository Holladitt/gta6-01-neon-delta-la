// District standing 0-100: missions +10, races +5, jobs +3.
// Standing >= 50 in a district unlocks the 10% shop discount and crew there.
import { DISTRICTS, STANDING_GAIN } from './config.js';

export function createStanding() {
  const s = {};
  for (const d of DISTRICTS) s[d.id] = 0;
  return s;
}
export function addStanding(s, district, n) {
  s[district] = Math.max(0, Math.min(100, (s[district] || 0) + n));
  return s[district];
}
export function addMissionStanding(s, district) { return addStanding(s, district, STANDING_GAIN.mission); }
export function addRaceStanding(s, district) { return addStanding(s, district, STANDING_GAIN.race); }
export function addJobStanding(s, district) { return addStanding(s, district, STANDING_GAIN.job); }
export function discountFor(s, district) { return (s[district] || 0) >= 50 ? 0.1 : 0; }
export function crewUnlocked(s, district) { return (s[district] || 0) >= 50; }
export function totalStanding(s) { return Object.values(s).reduce((a, b) => a + b, 0); }
