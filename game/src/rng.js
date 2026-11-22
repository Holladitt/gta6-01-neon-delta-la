// Deterministic random numbers for Neon Delta LA.
// A single seeded generator drives traffic, spawns and races, so a
// screenshot staged from a fixed seed is reproducible tick for tick.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function rangeInt(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist2(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
