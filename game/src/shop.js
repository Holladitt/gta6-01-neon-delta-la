// shop.js — DELTA ARMS: six weapons, real purchases, district discounts.
import { WEAPONS } from './config.js';
import { discountFor } from './standing.js';

export function createShopState() {
  const owned = {};
  for (const w of WEAPONS) owned[w.id] = !!w.owned;
  return { owned };
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
  const w = WEAPONS.find((x) => x.id === id);
  if (!w) return 0;
  const d = standing ? discountFor(standing, district) : 0;
  return Math.round(w.price * (1 - d));
}
export function buyWeapon(shop, money, id, standing, district) {
  if (isOwned(shop, id)) return { ok: false, money };
  const price = priceFor(shop, id, standing, district);
  if (money < price) return { ok: false, money };
  shop.owned[id] = true;
  return { ok: true, money: money - price };
}
export function ownedList(shop) {
  return WEAPONS.filter((w) => shop.owned[w.id]).map((w) => w.id);
}
