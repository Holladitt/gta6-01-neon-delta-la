// COVER meter: a crime in a ped's view makes them a witness ("!").
// 3 s in view -> wanted +1 and the witness runs off. Break line of sight to recover.
import { COVER_MAX } from './config.js';

export function createCover() { return { value: COVER_MAX, witnesses: [] }; }
export function coverLevel(cover) { return cover.value; }
export function witnessCount(cover) { return cover.witnesses.length; }
export function reportCrime(cover, peds, x, z) {
  let added = 0;
  for (const p of peds) {
    if (Math.hypot(p.x - x, p.z - z) > 30) continue;
    if (cover.witnesses.some((w) => w.ped === p)) continue;
    cover.witnesses.push({ ped: p, x: p.x, z: p.z, time: 0 });
    added++;
  }
  return added;
}
export function updateCover(cover, dt, px, pz, seen) {
  let raised = 0;
  if (cover.witnesses.length && seen) {
    cover.value = Math.max(0, cover.value - 4 * dt);
    for (let i = cover.witnesses.length - 1; i >= 0; i--) {
      const w = cover.witnesses[i];
      w.time += dt;
      if (w.time >= 3) { cover.witnesses.splice(i, 1); raised++; }
    }
  } else if (!seen) {
    cover.value = Math.min(COVER_MAX, cover.value + 3 * dt);
  }
  return raised;
}
