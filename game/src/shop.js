// shop.js — DELTA ARMS shop: buying weapons (pure).
import { WEAPONS } from './config.js';

export function shopItems() {
  return WEAPONS.map((w, i) => ({ ...w, index: i })).filter((w) => w.price > 0);
}

export function canBuy(money, owned, index) {
  const w = WEAPONS[index];
  if (!w || w.price <= 0) return { ok: false, reason: 'not-for-sale' };
  if (owned.includes(index)) return { ok: false, reason: 'owned' };
  if (money < w.price) return { ok: false, reason: 'no-funds' };
  return { ok: true };
}

export function buyWeapon(money, owned, ammo, reserves, index) {
  const c = canBuy(money, owned, index);
  if (!c.ok) {
    return { ok: false, reason: c.reason, money, owned: owned.slice(), ammo: ammo.slice(), reserves: reserves.slice() };
  }
  const w = WEAPONS[index];
  return { ok: true, money: money - w.price, owned: [...owned, index], ammo: ammo.slice(), reserves: reserves.slice() };
}
