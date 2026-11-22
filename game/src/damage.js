// damage.js — collision damage: impacts of 5 m/s or more hurt.
export function collisionDamage(impact) {
  if (impact < 5) return 0;
  return Math.max(5, Math.round(impact * 1.2));
}
export function canDamage(lastTime, now) {
  return now - lastTime >= 0.5;
}
export function applyDamage(condition, impact, armoured) {
  let dealt = collisionDamage(impact);
  if (armoured) dealt = Math.max(1, Math.floor(dealt / 2));
  return { condition: Math.max(0, condition - dealt), dealt };
}
