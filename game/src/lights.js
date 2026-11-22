// Traffic-light cycle + night level (pure). The light cycle is
// NS green -> NS yellow -> EW green -> EW yellow, 15 seconds total.
// The night level is a real function of the game clock: full daylight
// 06:00-17:30, a dusk ramp 17:30-19:00, full night 19:00-05:00, and a
// dawn ramp 05:00-06:00.
const GREEN_S = 6;
const YELLOW_S = 1.5;
const CYCLE_S = (GREEN_S + YELLOW_S) * 2;

export function lightState(t, offset = 0) {
  const p = (((t + offset) % CYCLE_S) + CYCLE_S) % CYCLE_S;
  if (p < GREEN_S) return { ns: 'green', ew: 'red' };
  if (p < GREEN_S + YELLOW_S) return { ns: 'yellow', ew: 'red' };
  if (p < GREEN_S + YELLOW_S + GREEN_S) return { ns: 'red', ew: 'green' };
  return { ns: 'red', ew: 'yellow' };
}

// A car travelling along `axis` ('ns' = along z, 'ew' = along x) may pass
// only while its own axis is green.
export function canPass(state, axis) {
  return state[axis] === 'green';
}

export function lightColorName(state, axis) {
  return state[axis];
}

// 0 = full daylight, 1 = full night. 21:30 and 03:00 are exactly 1;
// 18:00 is exactly 1/3; 05:30 is exactly 1/2.
export function nightLevel(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 19 || h < 5) return 1;
  if (h >= 17.5) return (h - 17.5) / 1.5;
  if (h < 6) return (6 - h) / 1;
  return 0;
}

export function isNight(hour) {
  return nightLevel(hour) > 0.5;
}
