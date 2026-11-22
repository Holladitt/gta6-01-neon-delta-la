// lights.js — day/night cycle and traffic lights (pure).

// Night level 0..1. Daylight 06:00-17:30, dusk ramp to 19:00,
// full night 19:00-05:00, dawn ramp 05:00-06:00.
export function nightLevel(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6 && h <= 17.5) return 0;
  if (h > 17.5 && h < 19) return (h - 17.5) / 1.5;
  if (h >= 19 || h < 5) return 1;
  return 1 - (h - 5);
}

export function isNight(hour) {
  return nightLevel(hour) > 0;
}

// Traffic light cycle, 16 s: NS green 0-6, NS yellow 6-8,
// EW green 8-14, EW yellow 14-16.
export function lightState(t) {
  const p = ((t % 16) + 16) % 16;
  if (p < 6) return { ns: 'green', ew: 'red' };
  if (p < 8) return { ns: 'yellow', ew: 'red' };
  if (p < 14) return { ns: 'red', ew: 'green' };
  return { ns: 'red', ew: 'yellow' };
}
