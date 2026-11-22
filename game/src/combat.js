// combat.js — weapon wheel, tier selection, firing with per-weapon rate.
import { WEAPONS, weaponById } from './config.js';

export function createCombat() {
  return { current: 'pistol', wheelOpen: false, lastFire: -99, shotsFired: 0 };
}
export function currentWeapon(c) {
  return weaponById(c.current) || WEAPONS[0];
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
  return WEAPONS.map((w) => ({ id: w.id, name: w.name, tier: w.tier, price: w.price, owned: !!owned[w.id] }));
}
export function selectWeapon(c, id, owned) {
  if (!owned[id]) return { ok: false };
  c.current = id;
  return { ok: true };
}
export function selectTier(c, tier, owned) {
  const w = WEAPONS.find((x) => x.tier === tier && owned[x.id]);
  if (!w) return { ok: false };
  c.current = w.id;
  return { ok: true };
}
export function fire(c, now) {
  const w = currentWeapon(c);
  if (now - c.lastFire < w.fireRate) return { ok: false };
  c.lastFire = now;
  c.shotsFired += 1;
  return { ok: true, damage: w.dmg, weapon: w.id };
}
