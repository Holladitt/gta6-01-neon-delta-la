// Combat: weapon wheel by tier, fire rate ~0.5 s.
import { WEAPONS, weaponById } from './config.js';

export function createCombat() { return { current: 'pistol', wheelOpen: false, lastShotAt: -99, shotsFired: 0 }; }
export function currentWeapon(c) { return weaponById(c.current); }
export function openWheel(c) { c.wheelOpen = true; return true; }
export function closeWheel(c) { c.wheelOpen = false; return false; }
export function wheelItems(owned) {
  return WEAPONS.map((w) => ({ id: w.id, name: w.name, tier: w.tier, price: w.price, owned: !!owned[w.id], locked: !owned[w.id] }));
}
export function selectWeapon(c, id, owned) {
  if (!owned[id]) return { ok: false };
  c.current = id;
  return { ok: true };
}
export function selectTier(c, tier, owned) {
  const w = WEAPONS.find((w) => w.tier === tier && owned[w.id]);
  if (!w) return { ok: false };
  c.current = w.id;
  return { ok: true, weapon: w.id };
}
export function fire(c, now) {
  if (now - c.lastShotAt < 0.5) return { ok: false };
  c.lastShotAt = now;
  c.shotsFired++;
  return { ok: true, damage: currentWeapon(c).dmg };
}
