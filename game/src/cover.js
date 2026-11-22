// COVER meter: witnesses watch a crime, 3 s in view raises the heat. Pure.
import { COVER_MAX } from './config.js';
export function createCover() {
  return { value: COVER_MAX, witnesses: [], watchedTime: 0, raised: 0 };
}
export function coverLevel(cover) {
  return cover.value;
}
export function witnessCount(cover) {
  return cover.witnesses.length;
}
export function reportCrime(cover, peds, x, z) {
  let added = 0;
  for (const p of peds) {
    if (Math.hypot(p.x - x, p.z - z) <= 60) {
      cover.witnesses.push({ x: p.x, z: p.z });
      added += 1;
    }
  }
  return added;
}
export function updateCover(cover, dt, x, z, watched) {
  if (watched && cover.witnesses.length > 0) {
    cover.watchedTime += dt;
    cover.value = Math.max(0, cover.value - dt * 6);
    if (cover.watchedTime >= 3) {
      cover.watchedTime = 0;
      cover.raised += 1;
      return 1;
    }
    return 0;
  }
  cover.watchedTime = 0;
  cover.value = Math.min(COVER_MAX, cover.value + dt * 8);
  return 0;
}
