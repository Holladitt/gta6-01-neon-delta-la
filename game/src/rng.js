// Seeded RNG + small math helpers. Pure, no browser globals.
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
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
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
