// garage.js — tuning upgrades with real effects: engine, armour, nitro.
import { GARAGE_UPGRADES, BOAT } from './config.js';
import { dist2 } from './rng.js';

export function createGarage() {
  return { owned: {}, nitroUntil: 0 };
}
export function buyUpgrade(g, money, id) {
  const up = GARAGE_UPGRADES.find((u) => u.id === id);
  if (!up) return { ok: false, money };
  if (g.owned[id]) return { ok: false, money };
  if (money < up.price) return { ok: false, money };
  g.owned[id] = true;
  return { ok: true, money: money - up.price };
}
export function topSpeed(g, base) {
  return g.owned.engine ? base * 1.25 : base;
}
export function hasNitro(g) {
  return !!g.owned.nitro;
}
export function triggerNitro(g, now) {
  if (!g.owned.nitro) return false;
  g.nitroUntil = now + 3;
  return true;
}
export function nitroActive(g, now) {
  return now < g.nitroUntil;
}
export function ownedUpgrades(g) {
  return Object.keys(g.owned).filter((k) => g.owned[k]);
}

// The drivable boat at the Marina.
export function createBoat() {
  return { x: BOAT.x, z: BOAT.z, angle: 0, speed: 0, boarded: false };
}
export function boardBoat(boat, x, z) {
  if (dist2(x, z, boat.x, boat.z) > 12) return false;
  boat.boarded = true;
  return true;
}
export function leaveBoat(boat) {
  boat.boarded = false;
  boat.speed = 0;
  return true;
}
export function driveBoat(boat, input, dt) {
  if (!boat.boarded) return false;
  const go = input === true || (input && input.forward);
  if (go) boat.speed = Math.min(20, boat.speed + 8 * dt);
  else boat.speed = Math.max(0, boat.speed - 4 * dt);
  boat.x += Math.sin(boat.angle) * boat.speed * dt;
  boat.z += Math.cos(boat.angle) * boat.speed * dt;
  return true;
}
