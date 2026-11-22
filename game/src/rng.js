// Deterministic RNG + small math helpers (pure, no DOM, no three.js).
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function range(rng, lo, hi) { return lo + rng() * (hi - lo); }
export function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
export function dist2(x0, z0, x1, z1) { return Math.hypot(x1 - x0, z1 - z0); }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
