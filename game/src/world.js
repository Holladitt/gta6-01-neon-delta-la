// The game world for Neon Delta LA: District Wars.
// Holds player, car, wanted, standing, missions, crew, combat, cover,
// races, jobs, tapes, garage, boat, traffic and police. The update
// loop drives the car, the missions, the clock and the pursuit; a
// frozen world (shot mode) never changes.
import { MISSIONS, OBJECTIVE_RADIUS, PED_COUNT, TRAFFIC_TOTAL, WANTED_MAX, SHOP, GARAGE_POS, BOAT } from './config.js';
import { districtAt } from './config.js';
import { createMissionState, currentMission, currentObjective, reachObjective } from './missions.js';
import { createStanding, addMissionStanding } from './standing.js';
import { createShopState } from './shop.js';
import { createCrewState } from './crew.js';
import { createWanted } from './wanted.js';
import { createCombat } from './combat.js';
import { createCover } from './cover.js';
import { createRaceState, createJobState, createTapeState } from './races.js';
import { createGarage, createBoat } from './garage.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice } from './police.js';
import { clamp, dist2 } from './rng.js';
import { onRoad, inOcean, inBuilding } from './geo.js';

export function createWorld(seed) {
  return {
    state: 'TITLE',
    frozen: false,
    money: 500,
    day: 1,
    hour: 10,
    rp: 0,
    rank: 'D',
    district: 'downtown',
    player: { x: -280, z: -280, angle: 0, onFoot: false },
    car: { x: -280, z: -280, angle: 0, speed: 0, condition: 100, nitro: false, nitroTimer: 0 },
    wanted: createWanted(),
    standing: createStanding(),
    missions: createMissionState(),
    shop: createShopState(),
    crew: createCrewState(),
    combat: createCombat(),
    cover: createCover(),
    race: createRaceState(),
    jobs: createJobState(),
    tapes: createTapeState(),
    garage: createGarage(),
    boat: createBoat(),
    traffic: createTraffic(seed === undefined ? 90210 : seed),
    police: createPolice(),
    wheelOpen: false,
    toast: '',
  };
}

export function startMission(w, id) {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) return false;
  w.missions.current = id;
  w.missions.done = w.missions.done.filter((x) => x !== id);
  if (m.startWanted !== undefined) w.wanted.level = m.startWanted;
  w.state = 'MISSION';
  return true;
}

function nearObjective(w) {
  const obj = currentObjective(w.missions);
  if (!obj) return false;
  const cx = w.player.onFoot ? w.player.x : w.car.x;
  const cz = w.player.onFoot ? w.player.z : w.car.z;
  return dist2(cx, cz, obj.x, obj.z) <= OBJECTIVE_RADIUS;
}

function driveCar(w, input, dt) {
  const car = w.car;
  const top = car.nitro ? 34 * 1.25 : 34;
  if (input.forward) car.speed = Math.min(top, car.speed + 22 * dt);
  else if (input.back) car.speed = Math.max(-8, car.speed - 18 * dt);
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 12 * dt);
  if (input.left) car.angle -= 2.2 * dt * (car.speed > 0 ? 1 : -1);
  if (input.right) car.angle += 2.2 * dt * (car.speed > 0 ? 1 : -1);
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  if (!inOcean(nx, nz) && !inBuilding(nx, nz)) {
    car.x = nx;
    car.z = nz;
  } else {
    car.speed *= 0.5;
  }
  car.x = clamp(car.x, -760, 760);
  car.z = clamp(car.z, -760, 620);
  w.player.x = car.x;
  w.player.z = car.z;
  w.player.angle = car.angle;
}

function walkPlayer(w, input, dt) {
  const p = w.player;
  const sp = 6;
  if (input.forward) {
    p.x += Math.sin(p.angle) * sp * dt;
    p.z += Math.cos(p.angle) * sp * dt;
  }
  if (input.back) {
    p.x -= Math.sin(p.angle) * sp * dt;
    p.z -= Math.cos(p.angle) * sp * dt;
  }
  if (input.left) p.angle -= 2.2 * dt;
  if (input.right) p.angle += 2.2 * dt;
  p.x = clamp(p.x, -760, 760);
  p.z = clamp(p.z, -760, 620);
}

export function updateWorld(w, input, dt) {
  if (w.frozen) return;
  const inp = input || {};
  w.hour += dt / 60;
  if (w.hour >= 24) {
    w.hour -= 24;
    w.day += 1;
  }
  if (w.player.onFoot) walkPlayer(w, inp, dt);
  else driveCar(w, inp, dt);
  w.district = districtAt(w.player.x, w.player.z);
  if (w.state === 'MISSION') {
    const cx = w.player.onFoot ? w.player.x : w.car.x;
    const cz = w.player.onFoot ? w.player.z : w.car.z;
    const ev = reachObjective(w.missions, cx, cz);
    if (ev && ev.event === 'complete') {
      w.money += ev.payout;
      w.rp += Math.round(ev.payout / 10);
      w.day += 1;
      addMissionStanding(w.standing, ev.district);
      w.state = 'FREE_ROAM';
    }
  }
  const now = Date.now();
  updateTraffic(w.traffic, dt, w.player.x, w.player.z);
  updatePolice(w.police, w, dt, now);
}

export function enterCar(w) {
  const d = dist2(w.player.x, w.player.z, w.car.x, w.car.z);
  if (d > 10) return false;
  w.player.onFoot = false;
  w.player.x = w.car.x;
  w.player.z = w.car.z;
  return true;
}

export function exitCar(w) {
  w.player.onFoot = true;
  w.player.x = w.car.x + 3;
  w.player.z = w.car.z;
  return true;
}

export function stealCar(w, cars) {
  const list = Array.isArray(cars) ? cars : [cars];
  let best = null;
  let bestD = Infinity;
  for (const car of list) {
    const d = dist2(w.player.x, w.player.z, car.x, car.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  if (!best || bestD > 5) return false;
  w.player.onFoot = false;
  w.car.x = best.x;
  w.car.z = best.z;
  w.car.speed = 0;
  return true;
}

export function enterBoat(w) {
  if (w.boat.boarded) return false;
  const d = dist2(w.player.x, w.player.z, w.boat.x, w.boat.z);
  if (d > 12) return false;
  w.boat.boarded = true;
  return true;
}

export function leaveBoat(w) {
  w.boat.boarded = false;
  return true;
}

export function setState(w, state) {
  w.state = state;
}

export function pedTotal(w) {
  return w.traffic.peds.length;
}

export function trafficTotal(w) {
  return w.traffic.cars.length;
}
