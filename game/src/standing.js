// District standing for Neon Delta LA.
// Six districts, each 0-100. Missions add 10, races 5, side jobs 3.
// At 50 or more a district gives a 10% shop discount and unlocks its
// crew ability. The save stores all six standings.
import { DISTRICTS, STANDING_GAIN } from './config.js';

export function createStanding() {
  const s = {};
  for (const d of DISTRICTS) s[d.id] = 0;
  return s;
}

export function addStanding(s, district, amount) {
  if (!(district in s)) return 0;
  s[district] = Math.max(0, Math.min(100, s[district] + amount));
  return s[district];
}

export function addMissionStanding(s, district) {
  return addStanding(s, district, STANDING_GAIN.mission);
}

export function addRaceStanding(s, district) {
  return addStanding(s, district, STANDING_GAIN.race);
}

export function addJobStanding(s, district) {
  return addStanding(s, district, STANDING_GAIN.job);
}

export function discountFor(s, district) {
  return (s[district] || 0) >= 50 ? 0.1 : 0;
}

export function crewUnlocked(s, district) {
  return (s[district] || 0) >= 50;
}

export function totalStanding(s) {
  let total = 0;
  for (const d of DISTRICTS) total += s[d.id] || 0;
  return total;
}
