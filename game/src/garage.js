// DELTA GARAGE tuning plus the drivable boat.
// Three upgrades, each a real effect on the car: ENGINE raises top
// speed, ARMOUR cuts collision damage, NITRO gives a boost on
// SHIFT. The garage panel shows what is owned. The DELTA SKIFF
// sits at the Marina's south dock: board it and drive it on the
// water — it floats, steers, and has a speed readout.
import { GARAGE_UPGRADES, BOAT } from './config.js';

export { GARAGE_UPGRADES };
import { clamp } from './rng.js';

export function createGarage() {
  return { engine: false, armour: false, nitro: false, nitroUntil: 0 };
}

export function upgradeById(id) {
  return GARAGE_UPGRADES.find((u) => u.id === id) || null;
}

export function buyUpgrade(garage, money, id) {
  const u = upgradeById(id);
  if (!u) return { ok: false, reason: 'no such upgrade', money };
  if (garage[id]) return { ok: false, reason: 'already owned', money };
  if (money < u.price) return { ok: false, reason: 'not enough money', money };
  garage[id] = true;
  return { ok: true, reason: 'bought', money: money - u.price, price: u.price, upgrade: u };
}

export function topSpeed(garage, base) {
  return base * (garage.engine ? 1.25 : 1);
}

export function hasNitro(garage) {
  return !!garage.nitro;
}

export function triggerNitro(garage, now) {
  if (!garage.nitro) return false;
  garage.nitroUntil = now + 3;
  return true;
}

export function nitroActive(garage, now) {
  return now < garage.nitroUntil;
}

export function ownedUpgrades(garage) {
  return GARAGE_UPGRADES.filter((u) => garage[u.id]).map((u) => u.id);
}

// Boat state.
export function createBoat() {
  return { x: BOAT.x, z: BOAT.z, angle: 0, speed: 0, boarded: false, topSpeed: 26 };
}

export function boardBoat(boat, px, pz) {
  const dx = px - boat.x; const dz = pz - boat.z;
  if (dx * dx + dz * dz > 14 * 14) return false;
  boat.boarded = true;
  return true;
}

export function leaveBoat(boat) {
  boat.boarded = false;
  boat.speed = 0;
  return true;
}

export function driveBoat(boat, input, dt) {
  if (!boat.boarded) return boat;
  const accel = input.forward ? 14 : input.back ? -8 : 0;
  boat.speed = clamp(boat.speed + accel * dt, -6, boat.topSpeed);
  if (!input.forward && !input.back) boat.speed *= Math.max(0, 1 - dt * 0.8);
  if (input.left) boat.angle += dt * 1.1;
  if (input.right) boat.angle -= dt * 1.1;
  boat.x += Math.sin(boat.angle) * boat.speed * dt;
  boat.z += Math.cos(boat.angle) * boat.speed * dt;
  return boat;
}
