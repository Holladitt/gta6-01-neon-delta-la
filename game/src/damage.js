// damage.js — collision damage rules (pure).
export const DAMAGE_MIN_IMPACT = 5;

export function collisionDamage(impact) {
  if (impact < DAMAGE_MIN_IMPACT) return 0;
  return Math.max(5, Math.round(impact * 1.2));
}

// Applies collision damage to a health/condition value; the result never
// drops below 5 from a single hit.
export function applyCollisionDamage(health, impact) {
  return Math.max(5, health - collisionDamage(impact));
}
