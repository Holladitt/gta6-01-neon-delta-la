// DELTA ARMS shop: six weapons in four tiers. Buying is a real
// click: money goes down by the exact price (less the district
// standing discount) and the weapon becomes owned. All six fire.
import { WEAPONS, weaponById, STANDING_DISCOUNT } from './config.js';
import { discountFor } from './standing.js';

export function createShopState() {
  const owned = {};
  for (const w of WEAPONS) owned[w.id] = !!w.owned;
  return { owned };
}

export function catalog() {
  return WEAPONS.map((w) => ({ ...w }));
}

export function isOwned(shop, id) {
  return !!shop.owned[id];
}

export function priceFor(shop, id, standing, districtId) {
  const w = weaponById(id);
  if (shop.owned[id]) return 0;
  const disc = standing ? discountFor(standing, districtId) : 0;
  return Math.round(w.price * (1 - disc));
}

export function buyWeapon(shop, money, id, standing, districtId) {
  const w = weaponById(id);
  if (shop.owned[id]) return { ok: false, reason: 'already owned', money };
  const price = priceFor(shop, id, standing, districtId);
  if (money < price) return { ok: false, reason: 'not enough money', money };
  shop.owned[id] = true;
  return { ok: true, reason: 'bought', money: money - price, price, weapon: w };
}

export function ownedList(shop) {
  return WEAPONS.filter((w) => shop.owned[w.id]).map((w) => w.id);
}

export function weaponsByTier(tier) {
  return WEAPONS.filter((w) => w.tier === tier);
}

export function shopDiscountLabel(standing, districtId) {
  return discountFor(standing, districtId) >= STANDING_DISCOUNT ? '10% DISTRICT DISCOUNT' : '';
}
