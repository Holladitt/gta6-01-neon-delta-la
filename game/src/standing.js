// District standing: each of the six districts holds 0-100.
// Missions add 10, races 5, side jobs 3, in the district where the
// work was done. At 50 or more the district gives a 10% shop
// discount and unlocks that district's crew ability.
import { DISTRICTS, STANDING_GAIN, STANDING_DISCOUNT_AT, STANDING_DISCOUNT } from './config.js';
import { clamp } from './rng.js';

export function createStanding() {
  const s = {};
  for (const d of DISTRICTS) s[d.id] = 0;
  return s;
}

export function addStanding(s, districtId, amount) {
  if (!(districtId in s)) return 0;
  s[districtId] = clamp(s[districtId] + amount, 0, 100);
  return s[districtId];
}

export function addMissionStanding(s, districtId) {
  return addStanding(s, districtId, STANDING_GAIN.mission);
}

export function addRaceStanding(s, districtId) {
  return addStanding(s, districtId, STANDING_GAIN.race);
}

export function addJobStanding(s, districtId) {
  return addStanding(s, districtId, STANDING_GAIN.job);
}

export function standingOf(s, districtId) {
  return s[districtId] || 0;
}

export function discountFor(s, districtId) {
  return standingOf(s, districtId) >= STANDING_DISCOUNT_AT ? STANDING_DISCOUNT : 0;
}

export function crewUnlocked(s, districtId) {
  return standingOf(s, districtId) >= STANDING_DISCOUNT_AT;
}

export function totalStanding(s) {
  return Object.values(s).reduce((a, b) => a + b, 0);
}

export function topDistrict(s) {
  let best = DISTRICTS[0].id; let bestV = -1;
  for (const d of DISTRICTS) {
    if (s[d.id] > bestV) { bestV = s[d.id]; best = d.id; }
  }
  return best;
}
