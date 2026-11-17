// Seeded random (mulberry32): the same seed gives the same city, traffic and
// screenshot scenes, so a staged frame is repeatable.
export function createRandom(seed) {
  let a = (seed | 0) || 1;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function pick(rand, list) { return list[Math.floor(rand() * list.length)]; }
export function range(rand, lo, hi) { return lo + rand() * (hi - lo); }
