// Garage tuning and the drivable boat for Neon Delta LA.
// The garage sells Engine (+25% top speed), Armour (half collision
// damage) and Nitro (a 3-second boost on N). Each is a real effect on
// the car and the panel shows what is owned. The boat at the Marina
// floats, steers and has a speed readout.
import { GARAGE_UPGRADES, BOAT } from './config.js';
import { dist2, clamp } from './rng.js';

export function createGarage() {
  return { owned: {}, nitroUntil: -1e9 };
}

export function garageUpgrade(id) {
  return GARAGE_UPGRADES.find((u) => u.id === id) || null;
}

export function buyUpgrade(g, money, id) {
  const u = garageUpgrade(id);
  if (!u) return { ok: false, money, reason: 'unknown' };
  if (g.owned[id]) return { ok: false, money, reason: 'owned' };
  if (money < u.price) return { ok: false, money, reason: 'broke' };
  g.owned[id] = true;
  return { ok: true, money: money - u.price, upgrade: id, price: u.price };
}

export function ownedUpgrades(g) {
  return GARAGE_UPGRADES.filter((u) => g.owned[u.id]).map((u) => u.id);
}

export function topSpeed(g, base) {
  return g.owned.engine ? base * 1.25 : base;
}

export function hasNitro(g) {
  return !!g.owned.nitro;
}

export function triggerNitro(g, now) {
  if (!hasNitro(g)) return false;
  g.nitroUntil = now + 3;
  return true;
}

export function nitroActive(g, now) {
  return now < g.nitroUntil;
}

export function createBoat() {
  return { x: BOAT.x, z: BOAT.z, angle: 0, speed: 0, boarded: false };
}

export function boardBoat(b, x, z) {
  if (dist2(x, z, b.x, b.z) > 12) return false;
  b.boarded = true;
  return true;
}

export function leaveBoat(b) {
  b.boarded = false;
  b.speed = 0;
  return true;
}

export function driveBoat(b, input, dt) {
  if (!b.boarded) return;
  if (input.forward) b.speed = Math.min(18, b.speed + 12 * dt);
  else if (input.back) b.speed = Math.max(-6, b.speed - 8 * dt);
  else b.speed *= Math.max(0, 1 - 0.8 * dt);
  if (input.left) b.angle += 1.1 * dt;
  if (input.right) b.angle -= 1.1 * dt;
  b.x += Math.sin(b.angle) * b.speed * dt;
  b.z += Math.cos(b.angle) * b.speed * dt;
  b.x = clamp(b.x, -700, 760);
  b.z = clamp(b.z, 640, 790);
}
