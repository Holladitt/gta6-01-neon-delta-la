// Collision damage: impacts of 5 m/s or more hurt, armour softens the hit.
export function collisionDamage(impact) {
  if (impact < 5) return 0;
  return Math.max(5, Math.round(impact * 1.2));
}
export function canDamage(lastHitAt, now) { return now - lastHitAt >= 0.5; }
export function applyDamage(condition, impact, armoured) {
  const raw = collisionDamage(impact);
  const dealt = armoured ? Math.max(1, Math.round(raw * 0.5)) : raw;
  return { condition: Math.max(0, condition - dealt), dealt };
}
