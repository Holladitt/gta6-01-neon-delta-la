// COVER meter and the witness system for Neon Delta LA.
// COVER starts at 100. Committing a crime in view of a pedestrian makes
// that pedestrian a witness (a visible "!" appears over them). Stay in a
// witness's view for 3 seconds and wanted rises by 1 and the witness
// runs off. Break line of sight first and nothing happens. COVER falls
// while a witness watches and recovers when unseen.
import { COVER_MAX } from './config.js';
import { dist2 } from './rng.js';

export const WITNESS_RANGE = 40;
export const WITNESS_TIME = 3;

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
  for (const p of peds) {
    if (dist2(x, z, p.x, p.z) > WITNESS_RANGE) continue;
    if (cover.witnesses.some((w) => w.ped === p)) continue;
    cover.witnesses.push({ ped: p, watchTime: 0 });
    added += 1;
  }
  return added;
}

export function updateCover(cover, dt, x, z, watched) {
  if (watched && cover.witnesses.length > 0) {
    cover.value = Math.max(0, cover.value - 8 * dt);
    let raised = 0;
    const kept = [];
    for (const w of cover.witnesses) {
      w.watchTime += dt;
      if (w.watchTime >= WITNESS_TIME) {
        raised += 1;
      } else {
        kept.push(w);
      }
    }
    cover.witnesses = kept;
    return raised;
  }
  cover.value = Math.min(COVER_MAX, cover.value + 5 * dt);
  return 0;
}
