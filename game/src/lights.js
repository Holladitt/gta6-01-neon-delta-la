// Day and night. Daylight 06:00-17:30, a dusk ramp to 19:00, full
// night to about 05:00. At night 28 warm light discs glow on the
// ground. The port shot is dusk at 18:00.
import { NIGHT_DISCS } from './config.js';

export function phaseFor(hour) {
  if (hour >= 6 && hour < 17.5) return 'day';
  if (hour >= 17.5 && hour < 19) return 'dusk';
  return 'night';
}

export function isNight(hour) {
  return phaseFor(hour) === 'night';
}

export function isDusk(hour) {
  return phaseFor(hour) === 'dusk';
}

export function daylightFactor(hour) {
  if (hour >= 6 && hour < 17.5) return 1;
  if (hour >= 17.5 && hour < 19) return 1 - (hour - 17.5) / 1.5;
  if (hour >= 19 || hour < 5) return 0.12;
  return 0.12 + ((hour - 5) / 1) * 0.88;
}

export function skyTop(hour) {
  const p = phaseFor(hour);
  if (p === 'day') return '#3fa7d6';
  if (p === 'dusk') return '#e86a3c';
  return '#0d1b2e';
}

export function skyBottom(hour) {
  const p = phaseFor(hour);
  if (p === 'day') return '#bfe8f2';
  if (p === 'dusk') return '#f7b267';
  return '#1c2f4a';
}

export function nightDiscCount() {
  return NIGHT_DISCS;
}

export function lampGlow(hour) {
  return phaseFor(hour) === 'day' ? 0 : 1;
}
