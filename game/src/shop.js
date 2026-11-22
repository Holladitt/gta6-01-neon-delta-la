// DELTA ARMS shop: real purchases, district-standing discount.
import { WEAPONS, weaponById, tierName } from './config.js';

export function createShopState() { return { owned: { pistol: true, smg: true, shotgun: true } }; }
export function catalog() { return WEAPONS.map((w) => ({ ...w, tierName: tierName(w.tier) })); }
export function isOwned(shop, id) { return !!shop.owned[id]; }
export function priceFor(shop, id, standing, district) {
  const w = weaponById(id);
  if (!w) return 0;
  const disc = standing && district && standing[district] >= 50 ? 0.1 : 0;
  return Math.round(w.price * (1 - disc));
}
export function buyWeapon(shop, money, id, standing, district) {
  const w = weaponById(id);
  if (!w) return { ok: false, money };
  if (shop.owned[id]) return { ok: false, money };
  const price = priceFor(shop, id, standing, district);
  if (money < price) return { ok: false, money };
  shop.owned[id] = true;
  return { ok: true, money: money - price, owned: { ...shop.owned } };
}
export function ownedList(shop) { return WEAPONS.filter((w) => shop.owned[w.id]).map((w) => w.id); }
export function weaponsByTier(tier) { return WEAPONS.filter((w) => w.tier === tier); }
