// Combat: six weapons in four tiers, and the weapon wheel.
// Hold Q to open the radial wheel showing the four tiers and the
// owned weapons; pick with the mouse or the number keys 1-4.
// The HUD shows the current weapon and its tier.
import { WEAPONS, weaponById } from './config.js';

export function createCombat() {
  return { current: 'pistol', wheelOpen: false, lastShotAt: 0, shotsFired: 0 };
}

export function currentWeapon(c) {
  return weaponById(c.current);
}

export function selectWeapon(c, id, owned) {
  const w = weaponById(id);
  if (!owned || !owned[w.id]) return { ok: false, reason: 'not owned' };
  c.current = w.id;
  return { ok: true, weapon: w };
}

export function selectTier(c, tier, owned) {
  const inTier = WEAPONS.filter((w) => w.tier === tier && owned && owned[w.id]);
  if (inTier.length === 0) return { ok: false, reason: 'no weapon in tier' };
  c.current = inTier[0].id;
  return { ok: true, weapon: inTier[0] };
}

export function openWheel(c) {
  c.wheelOpen = true;
  return c.wheelOpen;
}

export function closeWheel(c) {
  c.wheelOpen = false;
  return c.wheelOpen;
}

export function wheelItems(owned) {
  return WEAPONS.map((w) => ({ id: w.id, name: w.name, tier: w.tier, owned: !!(owned && owned[w.id]) }));
}

export function fire(c, now) {
  const w = weaponById(c.current);
  const gap = 1 / w.rate;
  if (now - c.lastShotAt < gap) return { ok: false, reason: 'rate limited' };
  c.lastShotAt = now;
  c.shotsFired += 1;
  return { ok: true, damage: w.damage, range: w.range, weapon: w };
}
