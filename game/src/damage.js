// Collision damage: a hard hit hurts, a soft bump does not, and a crash
// never takes the car below 5 condition on its own.

export const DAMAGE_MIN_IMPACT = 5;

export function collisionDamage(impact) {
  if (impact < DAMAGE_MIN_IMPACT) return 0;
  return Math.round(impact * 1.2);
}

export function applyCollisionDamage(health, impact) {
  return Math.max(5, health - collisionDamage(impact));
}
