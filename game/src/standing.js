// District standing, 0-100 per district. Pure.
import { DISTRICTS, STANDING_GAIN } from './config.js';
export function createStanding() {
  const s = {};
  for (const d of DISTRICTS) s[d.id] = 0;
  return s;
}
export function addStanding(s, district, amount) {
  const v = Math.max(0, Math.min(100, (s[district] || 0) + amount));
  s[district] = v;
  return v;
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
  let t = 0;
  for (const k of Object.keys(s)) t += s[k];
  return t;
}
