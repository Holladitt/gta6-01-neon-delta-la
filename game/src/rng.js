// rng.js — deterministic seeded RNG and small math helpers.
export function makeRng(seed) {
  let s = seed >>> 0;
  if (s === 0) s = 1;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
export function dist2(x0, z0, x1, z1) {
  return Math.hypot(x1 - x0, z1 - z0);
}
