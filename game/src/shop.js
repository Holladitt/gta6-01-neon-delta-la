// DELTA ARMS weapon shop (pure). Every price is real money: buying
// deducts from the player's cash, adds the weapon id to the owned list, and
// fills its magazine + reserve from the weapon's own stats. Nothing here is
// decorative — a weapon with a price can always be bought with real mission
// money, and a bought weapon stays bought (owned is saved).
import { WEAPONS } from './config.js';

// The three shop-only weapons (ids 3-5). Slots 0-2 are owned from the start.
export function shopItems() {
  return WEAPONS.filter((w) => w.price > 0).map((w) => ({
    id: w.id, name: w.name, price: w.price,
    dmg: w.dmg, mag: w.mag, reserve: w.reserve, range: w.range, auto: w.auto,
  }));
}

export function canBuy(money, owned, id) {
  const w = WEAPONS[id];
  if (!w || w.price <= 0) return { ok: false, reason: 'not-for-sale' };
  if (owned.includes(id)) return { ok: false, reason: 'owned' };
  if (money < w.price) return { ok: false, reason: 'no-funds' };
  return { ok: true, price: w.price };
}

// Buy weapon id: returns {ok, money, owned, ammo, reserves, reason}.
// On success money is reduced by the exact price, id joins owned, and the
// new weapon starts with a full magazine + full reserve. On failure nothing
// changes (money and owned are returned untouched).
export function buyWeapon(money, owned, ammo, reserves, id) {
  const check = canBuy(money, owned, id);
  if (!check.ok) return { ok: false, money, owned, ammo, reserves, reason: check.reason };
  const w = WEAPONS[id];
  const nextOwned = [...owned, id].sort((a, b) => a - b);
  const nextAmmo = ammo.slice();
  const nextReserves = reserves.slice();
  nextAmmo[id] = w.mag;
  nextReserves[id] = w.reserve;
  return { ok: true, money: money - w.price, owned: nextOwned, ammo: nextAmmo, reserves: nextReserves, price: w.price, name: w.name };
}
