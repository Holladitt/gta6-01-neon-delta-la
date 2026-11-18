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
