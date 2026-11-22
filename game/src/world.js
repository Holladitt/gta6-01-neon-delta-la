// world.js — the world state and its update: driving, missions, wanted, cover.
import { MISSIONS, DISTRICTS } from './config.js';
import { createMissionState, currentMission, reachObjective } from './missions.js';
import { createStanding, addMissionStanding } from './standing.js';
import { createWanted, setWanted, decayWanted } from './wanted.js';
import { createCover, updateCover } from './cover.js';
import { createShopState } from './shop.js';
import { createCrewState } from './crew.js';
import { createCombat } from './combat.js';
import { createRaceState, createJobState, createTapeState } from './races.js';
import { createGarage, topSpeed } from './garage.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice } from './police.js';
import { rankCode, rpForPayout } from './rank.js';
import { districtAt } from './config.js';
import { inBuilding } from './geo.js';
import { clamp, dist2 } from './rng.js';

export function createWorld() {
  return {
    state: 'TITLE',
    money: 500,
    day: 1,
    hour: 10,
    rp: 0,
    rank: 'D',
    district: 'downtown',
    frozen: false,
    driving: true,
    time: 0,
    player: { x: 0, z: 0, angle: 0, onFoot: false },
    car: { x: 0, z: 0, angle: 0, speed: 0, condition: 100 },
    missions: createMissionState(),
    standing: createStanding(),
    wanted: createWanted(),
    cover: createCover(),
    shop: createShopState(),
    crew: createCrewState(),
    combat: createCombat(),
    race: createRaceState(),
    job: createJobState(),
    tapes: createTapeState(),
    garage: createGarage(),
    traffic: createTraffic(90210),
    police: createPolice(),
    boat: { x: 565, z: 648, speed: 0, boarded: false },
    message: '',
  };
}
export function startMission(w, n) {
  const m = MISSIONS[n - 1];
  if (!m) return null;
  w.missions.current = n;
  w.missions.objective = 0;
  w.state = 'MISSION';
  if (m.startWanted) setWanted(w.wanted, m.startWanted);
  w.message = 'M' + m.id + ' ' + m.name.toUpperCase() + ' — ' + m.contact;
  return m;
}
export function enterCar(w) {
  if (dist2(w.player.x, w.player.z, w.car.x, w.car.z) > 8) return false;
  w.driving = true;
  w.player.onFoot = false;
  w.player.x = w.car.x;
  w.player.z = w.car.z;
  return true;
}
export function exitCar(w) {
  w.driving = false;
  w.player.onFoot = true;
  w.player.x = w.car.x;
  w.player.z = w.car.z;
  return true;
}
export function stealCar(w, cars, z) {
  let list = cars;
  if (!Array.isArray(list)) {
    if (typeof cars === 'number' && typeof z === 'number') list = [{ x: cars, z }];
    else if (cars && typeof cars.x === 'number') list = [cars];
    else list = [];
  }
  for (const c of list) {
    if (dist2(w.player.x, w.player.z, c.x, c.z) < 12) {
      w.driving = true;
      w.player.onFoot = false;
      w.car.x = c.x;
      w.car.z = c.z;
      w.player.x = c.x;
      w.player.z = c.z;
      return true;
    }
  }
  // Also allow stealing the hero car itself when standing next to it.
  if (list.length === 0 && dist2(w.player.x, w.player.z, w.car.x, w.car.z) < 12) {
    w.driving = true;
    w.player.onFoot = false;
    return true;
  }
  return false;
}
export function updateWorld(w, input, dt) {
  if (w.frozen) return w;
  w.time += dt || 0;
  const inp = input || {};
  // Driving.
  if (w.driving) {
    const base = topSpeed(w.garage, 34);
    const top = w.garage && w.garage.nitroUntil > w.time ? base * 1.5 : base;
    if (inp.forward || inp.up || inp.throttle) w.car.speed += 22 * dt;
    if (inp.back || inp.down) w.car.speed -= 18 * dt;
    if (inp.brake) w.car.speed *= Math.max(0, 1 - 4 * dt);
    w.car.speed = clamp(w.car.speed, -10, top);
    if (!inp.forward && !inp.up && !inp.throttle && !inp.back && !inp.down) {
      w.car.speed *= Math.max(0, 1 - 0.4 * dt);
      if (Math.abs(w.car.speed) < 0.05) w.car.speed = 0;
    }
    const steer = (inp.left ? 1 : 0) - (inp.right ? 1 : 0) + (inp.steer || 0);
    w.car.angle += steer * w.car.speed * 0.03 * dt;
    const nx = w.car.x + Math.sin(w.car.angle) * w.car.speed * dt;
    const nz = w.car.z + Math.cos(w.car.angle) * w.car.speed * dt;
    if (inBuilding(nx, nz)) {
      w.car.speed = 0;
    } else {
      w.car.x = clamp(nx, -780, 780);
      w.car.z = clamp(nz, -780, 780);
    }
    w.player.x = w.car.x;
    w.player.z = w.car.z;
  } else {
    // On foot.
    const sp = 6;
    let mx = 0;
    let mz = 0;
    if (inp.forward || inp.up) mz -= 1;
    if (inp.back || inp.down) mz += 1;
    if (inp.left) mx -= 1;
    if (inp.right) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      const nx = w.player.x + (mx / len) * sp * dt;
      const nz = w.player.z + (mz / len) * sp * dt;
      if (!inBuilding(nx, nz)) {
        w.player.x = clamp(nx, -780, 780);
        w.player.z = clamp(nz, -780, 780);
      }
      w.player.angle = Math.atan2(mx / len, mz / len);
    }
  }
  // Mission objectives: the car or the player can reach them.
  if (w.state === 'MISSION' || w.missions.current <= MISSIONS.length) {
    let ev = reachObjective(w.missions, w.car.x, w.car.z);
    if (ev.event === 'none') ev = reachObjective(w.missions, w.player.x, w.player.z);
    if (ev.event === 'objective') {
      w.message = 'Objective reached — ' + (currentMission(w.missions) ? currentMission(w.missions).points[w.missions.objective].label : '');
    } else if (ev.event === 'complete') {
      w.money += ev.payout;
      w.rp += ev.rp;
      w.rank = rankCode(w.rp);
      w.day += 1;
      addMissionStanding(w.standing, ev.district);
      w.message = 'MISSION COMPLETE +$' + ev.payout;
      if (w.missions.current > MISSIONS.length) w.state = 'FREE-ROAM';
    }
  }
  // District, hour, wanted decay, cover, traffic, police.
  w.district = districtAt(w.player.x, w.player.z).id;
  w.hour = (w.hour + dt / 90) % 24;
  decayWanted(w.wanted, dt, w.time);
  updateCover(w.cover, dt, w.player.x, w.player.z, w.cover.witnesses.length > 0);
  updateTraffic(w.traffic, dt, w.player.x, w.player.z);
  updatePolice(w.police, w, dt, w.time);
  return w;
}
