// Combat and the weapon wheel for Neon Delta LA.
// Six weapons in four tiers. Holding Q opens a radial wheel showing the
// four tiers and the owned weapons; pick with the mouse or keys 1-4.
// Firing is rate-limited (0.5s between shots).
import { WEAPONS, weaponById } from './config.js';

export const FIRE_COOLDOWN = 0.5;

export function createCombat() {
  return { current: 'pistol', wheelOpen: false, lastShot: -1e9, shotsFired: 0 };
}

export function currentWeapon(c) {
  return weaponById(c.current);
}

export function openWheel(c) {
  c.wheelOpen = true;
  return true;
}

export function closeWheel(c) {
  c.wheelOpen = false;
  return false;
}

export function wheelItems(owned) {
  return WEAPONS.map((w) => ({
    id: w.id,
    name: w.name,
    tier: w.tier,
    price: w.price,
    dmg: w.dmg,
    mag: w.mag,
    range: w.range,
    owned: !!owned[w.id],
  }));
}

export function selectWeapon(c, id, owned) {
  if (!owned[id]) return { ok: false, reason: 'not owned' };
  c.current = id;
  return { ok: true, weapon: id };
}

export function selectTier(c, tier, owned) {
  const w = WEAPONS.find((x) => x.tier === tier && owned[x.id]);
  if (!w) return { ok: false, reason: 'empty tier' };
  c.current = w.id;
  return { ok: true, weapon: w.id };
}

export function fire(c, now) {
  if (now - c.lastShot < FIRE_COOLDOWN) return { ok: false, reason: 'rate' };
  c.lastShot = now;
  c.shotsFired += 1;
  return { ok: true, damage: currentWeapon(c).dmg, weapon: c.current };
}
