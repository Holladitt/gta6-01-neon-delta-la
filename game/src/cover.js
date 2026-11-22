// cover.js — COVER meter and witnesses: crime in view makes a witness.
import { COVER_MAX } from './config.js';
import { clamp, dist2 } from './rng.js';

const WITNESS_RANGE = 25;
const WITNESS_TIME = 3;

export function createCover() {
  return { value: COVER_MAX, witnesses: [] };
}
export function coverLevel(cover) {
  return cover.value;
}
export function witnessCount(cover) {
  return cover.witnesses.length;
}
export function reportCrime(cover, peds, x, z) {
  let added = 0;
  for (let i = 0; i < peds.length; i += 1) {
    const p = peds[i];
    if (dist2(x, z, p.x, p.z) > WITNESS_RANGE) continue;
    if (cover.witnesses.some((w) => w.ped === i)) continue;
    cover.witnesses.push({ ped: i, time: 0 });
    added += 1;
  }
  return added;
}
export function updateCover(cover, dt, x, z, watched) {
  let raised = 0;
  if (watched && cover.witnesses.length > 0) {
    cover.value = clamp(cover.value - 10 * dt, 0, COVER_MAX);
    for (let i = cover.witnesses.length - 1; i >= 0; i -= 1) {
      cover.witnesses[i].time += dt;
      if (cover.witnesses[i].time >= WITNESS_TIME) {
        cover.witnesses.splice(i, 1);
        raised += 1;
      }
    }
  } else {
    cover.value = clamp(cover.value + 5 * dt, 0, COVER_MAX);
  }
  return raised;
}
