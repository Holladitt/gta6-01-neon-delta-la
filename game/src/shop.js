// DELTA ARMS shop for Neon Delta LA.
// Six weapons in four tiers; the first three are owned from the start.
// Buying is a real click: money goes down by the exact price (minus the
// district discount at standing 50+), and the weapon becomes owned.
import { WEAPONS, weaponById } from './config.js';
import { discountFor } from './standing.js';

export function createShopState() {
  return { owned: { pistol: true, smg: true, shotgun: true } };
}

export function catalog() {
  return WEAPONS.slice();
}

export function isOwned(shop, id) {
  return !!shop.owned[id];
}

export function weaponsByTier(tier) {
  return WEAPONS.filter((w) => w.tier === tier);
}

export function priceFor(shop, id, standing, district) {
  const w = weaponById(id);
  const d = standing && district ? discountFor(standing, district) : 0;
  return Math.round(w.price * (1 - d));
}

export function buyWeapon(shop, money, id, standing, district) {
  if (isOwned(shop, id)) return { ok: false, money, reason: 'owned' };
  const price = priceFor(shop, id, standing, district);
  if (money < price) return { ok: false, money, reason: 'broke' };
  shop.owned[id] = true;
  return { ok: true, money: money - price, weapon: id, price };
}

export function ownedList(shop) {
  return WEAPONS.filter((w) => isOwned(shop, w.id)).map((w) => w.id);
}
