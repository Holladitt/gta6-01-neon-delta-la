// Collision damage. Pure.
export function collisionDamage(impact) {
  if (impact < 5) return 0;
  return Math.max(5, Math.round(impact * 1.2));
}
export function canDamage(lastHit, now) {
  return now - lastHit >= 0.5;
}
export function applyDamage(condition, impact, armoured) {
  let dealt = collisionDamage(impact);
  if (armoured) dealt = Math.max(1, Math.round(dealt * 0.5));
  return { condition: Math.max(0, condition - dealt), dealt };
}
