// DELTA ARMS shop. Pure.
import { WEAPONS, weaponById } from './config.js';
export function createShopState() {
  return { owned: ['pistol', 'smg', 'shotgun'] };
}
export function catalog() {
  return WEAPONS.slice();
}
export function isOwned(shop, id) {
  return shop.owned.indexOf(id) >= 0;
}
export function weaponsByTier(tier) {
  return WEAPONS.filter((w) => w.tier === tier);
}
export function ownedList(shop) {
  return shop.owned.slice();
}
export function priceFor(shop, id, standing, district) {
  const w = weaponById(id);
  if (!w) return 0;
  const disc = standing && district && standing[district] >= 50 ? 0.1 : 0;
  return Math.round(w.price * (1 - disc));
}
export function buyWeapon(shop, money, id, standing, district) {
  const w = weaponById(id);
  if (!w) return { ok: false, money };
  if (isOwned(shop, id)) return { ok: false, money };
  const price = priceFor(shop, id, standing, district);
  if (money < price) return { ok: false, money };
  shop.owned.push(id);
  return { ok: true, money: money - price };
}
