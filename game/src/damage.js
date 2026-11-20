// v13: real car-damage rules (pure, no THREE dependency — sim-testable).
// QA v12 MAJOR: FIELD REPAIR could never succeed in real play because no
// code path ever damaged the player car (collisions only cut speed).
// Now a hard wall hit damages the car, so the repair path is reachable:
// drive into a building fast -> CONDITION drops -> FIELD REPAIR [V] restores
// it for $150. Light taps do nothing; a wrecked-by-gunfire car (health 0)
// is a separate, existing combat path and is not touched here.

// Impact speed in m/s. Below ~18 km/h the hit is a parking tap: no damage.
export const DAMAGE_MIN_IMPACT = 5;
// Damage per m/s of impact above the threshold. A full-speed hit
// (~31 m/s, 113 km/h) costs ~37 condition — three hard hits nearly wreck
// a fresh car, one hard hit is clearly visible on the CONDITION readout.
export const DAMAGE_PER_MPS = 1.2;
// Wall hits never strand the player: condition floors at 5 (still drivable,
// still clearly damaged). Gunfire can still wreck a car to 0 (existing).
export const DAMAGE_MIN_HEALTH = 5;
// Hits closer together than this share one damage event (a car grinding
// along a wall at speed would otherwise lose all health in one scrape).
export const DAMAGE_COOLDOWN_S = 0.5;

export function collisionDamage(impactMps) {
  if (!(impactMps >= DAMAGE_MIN_IMPACT)) return 0;
  return Math.round(impactMps * DAMAGE_PER_MPS);
}

export function applyCollisionDamage(health, impactMps) {
  return Math.max(DAMAGE_MIN_HEALTH, health - collisionDamage(impactMps));
}
