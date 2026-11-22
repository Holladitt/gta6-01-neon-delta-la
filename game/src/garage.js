// Garage tuning (Engine/Armour/Nitro) and the drivable boat.
import { GARAGE_UPGRADES, BOAT } from './config.js';

export function createGarage() { return { owned: [], nitroUntil: 0 }; }
export function buyUpgrade(g, money, id) {
  const up = GARAGE_UPGRADES.find((u) => u.id === id);
  if (!up) return { ok: false, money };
  if (g.owned.includes(id)) return { ok: false, money };
  if (money < up.price) return { ok: false, money };
  g.owned.push(id);
  return { ok: true, money: money - up.price };
}
export function topSpeed(g, base) { return g.owned.includes('engine') ? base * 1.25 : base; }
export function hasNitro(g) { return g.owned.includes('nitro'); }
export function triggerNitro(g, now) {
  if (!hasNitro(g)) return false;
  g.nitroUntil = now + 3;
  return true;
}
export function nitroActive(g, now) { return now < g.nitroUntil; }
export function ownedUpgrades(g) { return [...g.owned]; }

export function createBoat() { return { x: BOAT.x, z: BOAT.z, angle: 0, speed: 0, boarded: false }; }
export function boardBoat(b, x, z) {
  if (Math.hypot(x - b.x, z - b.z) > 12) return false;
  b.boarded = true;
  return true;
}
export function driveBoat(b, input, dt) {
  if (!b.boarded) return false;
  if (input.forward) b.speed = Math.min(14, b.speed + 8 * dt);
  if (input.back) b.speed = Math.max(-4, b.speed - 6 * dt);
  if (input.left) b.angle += 1.2 * dt;
  if (input.right) b.angle -= 1.2 * dt;
  b.x += Math.sin(b.angle) * b.speed * dt;
  b.z += Math.cos(b.angle) * b.speed * dt;
  return true;
}
export function leaveBoat(b) { b.boarded = false; b.speed = 0; return true; }
