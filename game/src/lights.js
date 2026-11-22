// Day and night. Daylight holds until half past five, dusk ramps to seven,
// night runs to five in the morning, then dawn ramps back to six.

export function nightLevel(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6 && h < 17.5) return 0;
  if (h >= 17.5 && h < 19) return (h - 17.5) / 1.5;
  if (h >= 19 || h < 5) return 1;
  return 6 - h;
}

export function isNight(hour) {
  return nightLevel(hour) >= 0.5;
}

// Traffic lights cycle on a 16-second loop: north-south green, a yellow
// beat, then east-west green, a yellow beat, and back.
export function lightState(t) {
  const phase = ((t % 16) + 16) % 16;
  if (phase < 6) return { ns: 'green', ew: 'red' };
  if (phase < 8) return { ns: 'yellow', ew: 'red' };
  if (phase < 14) return { ns: 'red', ew: 'green' };
  return { ns: 'red', ew: 'yellow' };
}
