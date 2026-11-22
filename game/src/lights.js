// lights.js — day/dusk/night phases and the warm glow discs at night.
import { NIGHT_DISCS } from './config.js';

export function phaseFor(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6 && h < 18) return 'day';
  if (h >= 18 && h < 19) return 'dusk';
  return 'night';
}
export function isNight(hour) {
  return phaseFor(hour) === 'night';
}
export function daylightFactor(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6 && h < 17.5) return 1;
  if (h >= 17.5 && h < 19) return 1 - (h - 17.5) / 1.5 * 0.9;
  if (h >= 19 || h < 5) return 0.1;
  if (h >= 5 && h < 6) return 0.1 + (h - 5) * 0.9;
  return 0.1;
}
export function nightDiscCount() {
  return NIGHT_DISCS;
}
