// Day cycle: day 06:00-17:30, dusk ramp to 19:00, night after.
import { NIGHT_DISCS } from './config.js';

export function phaseFor(hour) {
  if (hour >= 6 && hour < 17.5) return 'day';
  if (hour >= 17.5 && hour < 19) return 'dusk';
  return 'night';
}
export function isNight(hour) { return phaseFor(hour) === 'night'; }
export function daylightFactor(hour) {
  const p = phaseFor(hour);
  if (p === 'day') return 1;
  if (p === 'dusk') return 1 - (hour - 17.5) * 0.6;
  return 0.08;
}
export function nightDiscCount() { return NIGHT_DISCS; }
