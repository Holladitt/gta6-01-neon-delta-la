// standing.js — district standing 0-100, discounts and crew unlocks.
import { DISTRICTS, STANDING_GAIN } from './config.js';
import { clamp } from './rng.js';

export function createStanding() {
  const s = {};
  for (const d of DISTRICTS) s[d.id] = 0;
  return s;
}
export function addStanding(s, district, n) {
  s[district] = clamp((s[district] || 0) + n, 0, 100);
  return s[district];
}
export function addMissionStanding(s, district) {
  return addStanding(s, district, STANDING_GAIN.mission);
}
export function discountFor(s, district) {
  return (s[district] || 0) >= 50 ? 0.1 : 0;
}
export function crewUnlocked(s, district) {
  return (s[district] || 0) >= 50;
}
export function totalStanding(s) {
  return Object.values(s).reduce((a, b) => a + b, 0);
}
