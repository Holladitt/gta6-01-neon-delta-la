// World state + tick: driving, walking, missions, police, traffic.
import { createMissionState, currentObjective, reachObjective } from './missions.js';
import { createStanding, addMissionStanding } from './standing.js';
import { createShopState } from './shop.js';
import { createCrewState } from './crew.js';
import { createWanted } from './wanted.js';
import { createCombat } from './combat.js';
import { createCover } from './cover.js';
import { createRaceState, createJobState, createTapeState } from './races.js';
import { createGarage, createBoat, topSpeed, nitroActive } from './garage.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice } from './police.js';
import { rankFor, rpForPayout } from './rank.js';
import { districtAt } from './config.js';

export function createWorld() {
  return {
    state: 'TITLE', frozen: false, money: 500, day: 1, hour: 10, rp: 0, rank: 'D',
    wanted: createWanted(), missions: createMissionState(), missionsDone: [],
    standing: createStanding(), shop: createShopState(), crew: createCrewState(),
    combat: createCombat(), cover: createCover(), race: createRaceState(),
    job: createJobState(), tapes: createTapeState(), garage: createGarage(), boat: createBoat(),
    traffic: createTraffic(90210), police: createPolice(),
    player: { x: 0, z: 0, angle: 0, onFoot: false },
    car: { x: 0, z: 0, angle: 0, speed: 0, condition: 100 },
    time: 0, district: 'downtown',
  };
}
export function startMission(w, id) {
  w.missions.current = id;
  w.missions.objectiveIndex = 0;
  w.state = 'MISSION';
  return w.missions.current;
}
export function enterCar(w) {
  if (!w.player.onFoot) return false;
  if (Math.hypot(w.player.x - w.car.x, w.player.z - w.car.z) > 6) return false;
  w.player.onFoot = false;
  return true;
}
export function exitCar(w) {
  if (w.player.onFoot) return false;
  w.player.onFoot = true;
  w.player.x = w.car.x + 4; w.player.z = w.car.z + 2;
  return true;
}
export function stealCar(w, cars) {
  if (!w.player.onFoot) return false;
  for (const c of cars) {
    if (Math.hypot(w.player.x - c.x, w.player.z - c.z) <= 5) {
      w.car.x = c.x; w.car.z = c.z; w.car.angle = c.angle;
      w.player.onFoot = false;
      return true;
    }
  }
  return false;
}
export function serializeWorld(w) {
  return {
    money: w.money, day: w.day, rp: w.rp, rank: w.rank, hour: w.hour,
    missionsDone: [...w.missionsDone], standing: { ...w.standing },
    district: w.district, state: w.state,
  };
}
export function updateWorld(w, input, dt) {
  if (w.frozen) return;
  w.time += dt;
  w.hour += dt * 0.002;
  if (w.hour >= 24) w.hour -= 24;
  const car = w.car, player = w.player;
  if (!player.onFoot) {
    const top = topSpeed(w.garage, 34) * (nitroActive(w.garage, w.time) ? 1.6 : 1);
    if (input.forward) car.speed = Math.min(top, car.speed + 12 * dt);
    else if (input.back) car.speed = Math.max(-8, car.speed - 10 * dt);
    else car.speed *= Math.max(0, 1 - 1.5 * dt);
    if (input.left) car.angle += 1.6 * dt;
    if (input.right) car.angle -= 1.6 * dt;
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    player.x = car.x; player.z = car.z; player.angle = car.angle;
  } else {
    let mx = 0, mz = 0;
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx || mz) {
      const l = Math.hypot(mx, mz);
      player.x += (mx / l) * 6 * dt;
      player.z += (mz / l) * 6 * dt;
      player.angle = Math.atan2(mx, mz);
    }
  }
  w.district = districtAt(player.x, player.z).id;
  if (w.state === 'MISSION') {
    const obj = currentObjective(w.missions);
    if (obj && Math.hypot(car.x - obj.x, car.z - obj.z) < 12) {
      const ev = reachObjective(w.missions, car.x, car.z);
      if (ev.event === 'complete') {
        w.money += ev.payout;
        w.rp += rpForPayout(ev.payout);
        w.rank = rankFor(w.rp).code;
        w.day += 1;
        addMissionStanding(w.standing, ev.district);
        w.missionsDone.push(w.missions.done[w.missions.done.length - 1]);
        w.state = 'FREE_ROAM';
      }
    }
  }
  updatePolice(w.police, w, dt, w.time);
  updateTraffic(w.traffic, dt, player.x, player.z);
}
