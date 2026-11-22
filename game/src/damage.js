// Collision damage: an impact of 5 m/s or more deals damage equal
// to the impact times 1.2 rounded, minimum 5, with a 0.5 s cooldown.
import { COLLISION } from './config.js';

export function collisionDamage(impactSpeed) {
  if (impactSpeed < COLLISION.minSpeed) return 0;
  const raw = Math.round(impactSpeed * COLLISION.mult);
  return raw < COLLISION.minDamage ? COLLISION.minDamage : raw;
}

export function canDamage(lastHitAt, now) {
  return now - lastHitAt >= COLLISION.cooldown;
}

export function applyDamage(condition, impactSpeed, armour) {
  const dmg = collisionDamage(impactSpeed);
  if (dmg === 0) return { condition, dealt: 0 };
  const reduced = armour ? Math.max(1, Math.round(dmg * 0.6)) : dmg;
  return { condition: Math.max(0, condition - reduced), dealt: reduced };
}
