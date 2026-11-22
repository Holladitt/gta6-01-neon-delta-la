// On-foot combat + weapon wheel. Pure.
import { WEAPONS, weaponById } from './config.js';
export function createCombat() {
  return { current: 'pistol', wheelOpen: false, lastShot: -100, shotsFired: 0 };
}
export function currentWeapon(c) {
  return weaponById(c.current) || WEAPONS[0];
}
export function selectWeapon(c, id, owned) {
  if (owned && !owned[id]) return { ok: false };
  if (!weaponById(id)) return { ok: false };
  c.current = id;
  return { ok: true };
}
export function selectTier(c, tier, owned) {
  const w = WEAPONS.find((w) => w.tier === tier && owned && owned[w.id]);
  if (!w) return { ok: false };
  c.current = w.id;
  return { ok: true };
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
    damage: w.damage,
    owned: !!(owned && owned[w.id]),
  }));
}
export function fire(c, t) {
  if (t - c.lastShot < 0.5) return { ok: false };
  c.lastShot = t;
  c.shotsFired += 1;
  return { ok: true, damage: currentWeapon(c).damage };
}
