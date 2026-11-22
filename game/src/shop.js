// DELTA ARMS. Three weapons come with the starter kit and are never for
// sale; three sit on the shelf with a fixed price, bought once each.

import { WEAPONS } from './config.js';

export function shopItems() {
  return WEAPONS.map((w, i) => ({ ...w, index: i })).filter((w) => w.price > 0);
}

export function canBuy(money, owned, idx) {
  const w = WEAPONS[idx];
  if (!w || w.price <= 0) return { ok: false, reason: 'not-for-sale' };
  if (owned.includes(idx)) return { ok: false, reason: 'owned' };
  if (money < w.price) return { ok: false, reason: 'no-funds' };
  return { ok: true };
}

export function buyWeapon(money, owned, ammo, reserves, idx) {
  const verdict = canBuy(money, owned, idx);
  if (!verdict.ok) {
    return { ok: false, reason: verdict.reason, money, owned, ammo, reserves };
  }
  const w = WEAPONS[idx];
  const nextOwned = [...owned, idx];
  const nextAmmo = [...ammo];
  const nextReserves = [...reserves];
  nextAmmo[idx] = w.mag;
  nextReserves[idx] = w.reserve;
  return { ok: true, money: money - w.price, owned: nextOwned, ammo: nextAmmo, reserves: nextReserves };
}
