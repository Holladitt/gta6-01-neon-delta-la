// Day and night for Neon Delta LA.
// Daylight 06:00-17:30, a dusk ramp to 19:00, full night to about 05:00.
// At night 28 warm light discs glow on the ground.
import { NIGHT_DISCS } from './config.js';

export function phaseFor(hour) {
  if (hour >= 6 && hour < 17.5) return 'day';
  if (hour >= 17.5 && hour < 19) return 'dusk';
  return 'night';
}

export function isNight(hour) {
  return phaseFor(hour) === 'night';
}

export function daylightFactor(hour) {
  const p = phaseFor(hour);
  if (p === 'day') return 1;
  if (p === 'dusk') {
    const t = (hour - 17.5) / 1.5;
    return 1 - 0.7 * Math.max(0, Math.min(1, t));
  }
  return 0.15;
}

export function nightDiscCount() {
  return NIGHT_DISCS;
}
