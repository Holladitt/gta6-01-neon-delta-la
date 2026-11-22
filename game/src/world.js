// The world: state, driving, missions, traffic, police. Pure.
import { MISSIONS, districtAt } from './config.js';
import { createMissionState, currentObjective, reachObjective } from './missions.js';
import { createStanding, addMissionStanding } from './standing.js';
import { createShopState } from './shop.js';
import { createCrewState } from './crew.js';
import { createWanted, setWanted } from './wanted.js';
import { createCombat } from './combat.js';
import { createCover } from './cover.js';
import { createRaceState, createJobState, createTapeState } from './races.js';
import { createGarage, createBoat, topSpeed } from './garage.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice } from './police.js';
import { rpForPayout } from './rank.js';

export function createWorld() {
  return {
    state: 'TITLE',
    frozen: false,
    money: 500,
    day: 1,
    hour: 10,
    rp: 0,
    time: 0,
    missions: createMissionState(),
    standing: createStanding(),
    shop: createShopState(),
    crew: createCrewState(),
    wanted: createWanted(),
    combat: createCombat(),
    cover: createCover(),
    race: createRaceState(),
    job: createJobState(),
    tapes: createTapeState(),
    garage: createGarage(),
    boat: createBoat(),
    traffic: createTraffic(90210),
    police: createPolice(),
    player: { x: -320, z: -261, angle: 0, onFoot: false, speed: 0 },
    car: { x: -320, z: -261, angle: Math.PI, speed: 0, condition: 100, name: 'SOLSTICE GT' },
    district: 'downtown',
  };
}
export function startMission(w, id) {
  const m = MISSIONS[id - 1];
  if (!m) return false;
  w.missions.current = id;
  w.missions.objective = 0;
  w.state = 'MISSION';
  w.hour = m.hour;
  if (m.startWanted) setWanted(w.wanted, m.startWanted);
  return true;
}
export function updateWorld(w, input, dt) {
  if (w.frozen) return;
  w.time += dt;
  w.hour += dt / 120;
  if (w.hour >= 24) {
    w.hour -= 24;
    w.day += 1;
  }
  const top = topSpeed(w.garage, 34);
  if (!w.player.onFoot) {
    const c = w.car;
    if (input.forward) c.speed = Math.min(top, c.speed + 18 * dt);
    else if (input.back) c.speed = Math.max(-8, c.speed - 12 * dt);
    else c.speed *= Math.max(0, 1 - 1.5 * dt);
    if (input.left) c.angle += 1.6 * dt * (c.speed >= 0 ? 1 : -1);
    if (input.right) c.angle -= 1.6 * dt * (c.speed >= 0 ? 1 : -1);
    c.x += Math.sin(c.angle) * c.speed * dt;
    c.z += Math.cos(c.angle) * c.speed * dt;
    w.player.x = c.x;
    w.player.z = c.z;
    w.player.angle = c.angle;
  } else {
    const sp = 5;
    if (input.forward) {
      w.player.x += Math.sin(w.player.angle) * sp * dt;
      w.player.z += Math.cos(w.player.angle) * sp * dt;
    }
    if (input.back) {
      w.player.x -= Math.sin(w.player.angle) * sp * dt;
      w.player.z -= Math.cos(w.player.angle) * sp * dt;
    }
    if (input.left) w.player.angle += 2 * dt;
    if (input.right) w.player.angle -= 2 * dt;
  }
  if (w.state === 'MISSION') {
    const px = w.player.onFoot ? w.player.x : w.car.x;
    const pz = w.player.onFoot ? w.player.z : w.car.z;
    const ev = reachObjective(w.missions, px, pz);
    if (ev.event === 'complete') {
      w.money += ev.payout;
      w.rp += rpForPayout(ev.payout);
      w.day += 1;
      addMissionStanding(w.standing, ev.district);
      w.state = 'FREE_ROAM';
    }
  }
  w.district = districtAt(w.car.x, w.car.z).id;
  updateTraffic(w.traffic, dt, w.player.x, w.player.z);
  updatePolice(w.police, w, dt, w.time);
}
export function enterCar(w) {
  if (!w.player.onFoot) return false;
  if (Math.hypot(w.player.x - w.car.x, w.player.z - w.car.z) > 6) return false;
  w.player.onFoot = false;
  w.player.x = w.car.x;
  w.player.z = w.car.z;
  return true;
}
export function exitCar(w) {
  if (w.player.onFoot) return false;
  w.player.onFoot = true;
  w.player.x = w.car.x + 3;
  w.player.z = w.car.z + 3;
  return true;
}
export function stealCar(w, cars) {
  if (!w.player.onFoot) return false;
  for (const c of cars) {
    if (Math.hypot(w.player.x - c.x, w.player.z - c.z) <= 6) {
      w.car.x = c.x;
      w.car.z = c.z;
      w.player.onFoot = false;
      w.player.x = c.x;
      w.player.z = c.z;
      return true;
    }
  }
  return false;
}
