// Car collision damage (pure, no THREE dependency).
// A hard wall hit is the real damage source that makes FIELD REPAIR
// reachable: light taps do nothing, a full-speed hit costs ~37 condition,
// and wall hits never strand the player — condition floors at 5, still
// drivable. Gunfire can still wreck a car to 0 through the combat path.
// Hits closer than 0.5 s share one damage event, so grinding along a wall
// does not drain the whole car in one scrape.
export const DAMAGE_MIN_IMPACT = 5;
export const DAMAGE_PER_MPS = 1.2;
export const DAMAGE_MIN_HEALTH = 5;
export const DAMAGE_COOLDOWN_S = 0.5;

export function collisionDamage(impactMps) {
  if (!(impactMps >= DAMAGE_MIN_IMPACT)) return 0;
  return Math.round(impactMps * DAMAGE_PER_MPS);
}

export function applyCollisionDamage(health, impactMps) {
  return Math.max(DAMAGE_MIN_HEALTH, health - collisionDamage(impactMps));
}
