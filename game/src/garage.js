// Garage tuning + the drivable boat. Pure.
import { GARAGE_UPGRADES, BOAT } from './config.js';
export function createGarage() {
  return { owned: [], nitroUntil: 0 };
}
export function buyUpgrade(g, money, id) {
  const u = GARAGE_UPGRADES.find((u) => u.id === id);
  if (!u) return { ok: false, money };
  if (g.owned.indexOf(id) >= 0) return { ok: false, money };
  if (money < u.price) return { ok: false, money };
  g.owned.push(id);
  return { ok: true, money: money - u.price };
}
export function topSpeed(g, base) {
  return g.owned.indexOf('engine') >= 0 ? base * 1.25 : base;
}
export function hasNitro(g) {
  return g.owned.indexOf('nitro') >= 0;
}
export function triggerNitro(g, t) {
  if (!hasNitro(g)) return false;
  g.nitroUntil = t + 3;
  return true;
}
export function nitroActive(g, t) {
  return t < g.nitroUntil;
}
export function ownedUpgrades(g) {
  return g.owned.slice();
}
export function createBoat() {
  return { boarded: false, speed: 0, x: BOAT.x, z: BOAT.z, angle: 0 };
}
export function boardBoat(b, x, z) {
  if (Math.hypot(x - b.x, z - b.z) > 12) return false;
  b.boarded = true;
  return true;
}
export function leaveBoat(b) {
  if (!b.boarded) return false;
  b.boarded = false;
  b.speed = 0;
  return true;
}
export function driveBoat(b, input, dt) {
  if (!b.boarded) return b.speed;
  if (input.forward) b.speed = Math.min(28, b.speed + 12 * dt);
  else if (input.back) b.speed = Math.max(-8, b.speed - 8 * dt);
  else b.speed *= Math.max(0, 1 - 2 * dt);
  if (input.left) b.angle += 1.2 * dt;
  if (input.right) b.angle -= 1.2 * dt;
  b.x += Math.sin(b.angle) * b.speed * dt;
  b.z += Math.cos(b.angle) * b.speed * dt;
  return b.speed;
}
