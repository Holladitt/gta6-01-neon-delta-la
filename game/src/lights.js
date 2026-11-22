// Day / dusk / night phases. Pure.
import { NIGHT_DISCS } from './config.js';
export function phaseFor(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 6 && h < 18) return 'day';
  if (h === 18) return 'dusk';
  return 'night';
}
export function isNight(hour) {
  return phaseFor(hour) === 'night';
}
export function daylightFactor(hour) {
  const p = phaseFor(hour);
  if (p === 'day') return 1;
  if (p === 'dusk') return 0.5;
  return 0.1;
}
export function nightDiscCount() {
  return NIGHT_DISCS;
}
