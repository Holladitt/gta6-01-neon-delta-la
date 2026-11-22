// COVER meter (witness stealth), 0-100, starting at 100.
// Committing a crime (stealing a car, firing a weapon) in view of a
// pedestrian makes that pedestrian a witness (a visible "!" over
// them). If you stay in that witness's view for 3 seconds, wanted
// rises by 1 and the witness runs off. Leave the area or break line
// of sight before 3 seconds and no wanted rise follows. COVER falls
// while a witness is watching and recovers when unseen. This is a
// real witness system, separate from wanted decay.
import { COVER_MAX, WITNESS_SECONDS, WITNESS_RANGE } from './config.js';
import { clamp } from './rng.js';

export function createCover() {
  return { value: COVER_MAX, witnesses: [], crimes: 0 };
}

export function reportCrime(cover, peds, px, pz) {
  cover.crimes += 1;
  let added = 0;
  for (const p of peds) {
    const dx = p.x - px; const dz = p.z - pz;
    if (dx * dx + dz * dz > WITNESS_RANGE * WITNESS_RANGE) continue;
    if (cover.witnesses.some((w) => w.ped === p)) continue;
    cover.witnesses.push({ ped: p, seen: 0, fleeing: false });
    added += 1;
  }
  return added;
}

// dt tick. seenBy is true while any witness still sees the player.
// Returns the number of wanted levels raised this tick.
export function updateCover(cover, dt, px, pz, seenBy) {
  let raised = 0;
  if (cover.witnesses.length > 0 && seenBy) {
    cover.value = clamp(cover.value - dt * 25, 0, COVER_MAX);
    for (const w of cover.witnesses) {
      w.seen += dt;
      if (w.seen >= WITNESS_SECONDS && !w.fleeing) {
        w.fleeing = true;
        raised += 1;
      }
    }
    cover.witnesses = cover.witnesses.filter((w) => !w.fleeing || w.seen < WITNESS_SECONDS + 2);
  } else {
    cover.value = clamp(cover.value + dt * 12, 0, COVER_MAX);
    for (const w of cover.witnesses) w.seen = Math.max(0, w.seen - dt * 2);
    cover.witnesses = cover.witnesses.filter((w) => w.seen > 0);
  }
  return raised;
}

export function witnessCount(cover) {
  return cover.witnesses.filter((w) => !w.fleeing).length;
}

export function coverLevel(cover) {
  return Math.round(cover.value);
}
