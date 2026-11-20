// Traffic-light state machine (pure). Cycle: NS green -> NS yellow -> EW green -> EW yellow.
// t = seconds since start. Returns {ns, ew} each 'red' | 'yellow' | 'green'.
const GREEN = 6, YELLOW = 1.5;
const CYCLE = (GREEN + YELLOW) * 2;
export function lightState(t, offset = 0) {
  const p = (((t + offset) % CYCLE) + CYCLE) % CYCLE;
  if (p < GREEN) return { ns: 'green', ew: 'red' };
  if (p < GREEN + YELLOW) return { ns: 'yellow', ew: 'red' };
  if (p < GREEN + YELLOW + GREEN) return { ns: 'red', ew: 'green' };
  return { ns: 'red', ew: 'yellow' };
}
// A car driving along `axis` ('ns' = along z, 'ew' = along x) may pass the light when its axis is green.
export function canPass(state, axis) { return state[axis] === 'green'; }
export function lightColorName(state, axis) { return state[axis]; }

// Night level (pure): 0 = full daylight, 1 = full night. The game clock
// drives it — night is a real time rule, not a label. Day runs 06:00-17:30,
// dusk ramps 17:30-19:00, night runs 19:00-05:00, dawn ramps 05:00-06:00.
// At 21.5 (mission 7's start) and 03:00 the level is exactly 1.
export function nightLevel(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 19 || h < 5) return 1;
  if (h >= 17.5) return (h - 17.5) / 1.5;
  if (h < 6) return (6 - h) / 1;
  return 0;
}
export function isNight(hour) { return nightLevel(hour) > 0.5; }
