// Collision damage for Neon Delta LA.
// An impact of 5 m/s or more deals damage equal to the impact times 1.2,
// rounded, with a minimum of 5, and a 0.5-second cooldown between hits.
// Garage armour halves the damage (never below 1).
export function collisionDamage(impact) {
  if (impact < 5) return 0;
  return Math.max(5, Math.round(impact * 1.2));
}

export function canDamage(lastHit, now) {
  return now - lastHit >= 0.5;
}

export function applyDamage(condition, impact, armoured) {
  let dealt = collisionDamage(impact);
  if (armoured) dealt = Math.max(1, Math.floor(dealt / 2));
  return { condition: Math.max(0, condition - dealt), dealt };
}
