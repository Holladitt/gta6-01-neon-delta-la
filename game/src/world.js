// World state: the whole game in one plain object, plus the tick
// that moves it. No DOM, no three.js here — the browser loop calls
// updateWorld and the scene syncs meshes from this state, so the
// simulation can drive the same world in node.
import { districtAt, MAP_COVERAGE, RADIO } from './config.js';
import { createMissionState, currentMission, currentObjective, reachObjective } from './missions.js';
import { createStanding, addMissionStanding, addRaceStanding, addJobStanding } from './standing.js';
import { createShopState } from './shop.js';
import { createCrewState } from './crew.js';
import { createWanted, decayWanted, spikeSlowed, hitSpike } from './wanted.js';
import { createCombat } from './combat.js';
import { createCover, updateCover } from './cover.js';
import { createRaceState, createJobState, createTapeState, raceCheckpoint, completeJob, collectTape } from './races.js';
import { createGarage, topSpeed, nitroActive } from './garage.js';
import { createBoat, driveBoat } from './garage.js';
import { createPlayerCar } from './vehicles.js';
import { clamp, dist2 } from './rng.js';
import { rankFor } from './rank.js';

export const STATES = ['TITLE', 'FREE_ROAM', 'MISSION', 'COMBAT', 'ARREST'];

export function createWorld() {
  const car = createPlayerCar(-260, -200);
  return {
    state: 'TITLE',
    time: 0, hour: 10, day: 1,
    money: 500, rp: 0, rankCode: 'D',
    districtId: 'downtown', mapCoverage: MAP_COVERAGE, radio: RADIO,
    player: { x: -260, z: -200, angle: 0, speed: 0, onFoot: false },
    car,
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
    toast: '',
    shotMode: 0,
    frozen: false,
  };
}

export function currentDistrict(w) {
  return districtAt(w.player.x, w.player.z);
}

export function updateRank(w) {
  w.rankCode = rankFor(w.rp).code;
}

function movePlayer(w, input, dt) {
  const p = w.player;
  const car = w.car;
  if (w.boat.boarded) {
    driveBoat(w.boat, input, dt);
    p.x = w.boat.x; p.z = w.boat.z;
    return;
  }
  if (p.onFoot) {
    const sp = 6;
    let mx = 0; let mz = 0;
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.sqrt(mx * mx + mz * mz);
      p.x += (mx / len) * sp * dt;
      p.z += (mz / len) * sp * dt;
      p.angle = Math.atan2(mx, mz);
      p.speed = sp;
    } else {
      p.speed = 0;
    }
    p.x = clamp(p.x, -780, 700);
    p.z = clamp(p.z, -700, 700);
    return;
  }
  // Driving: arcade physics with drift.
  const top = topSpeed(w.garage, car.topSpeed) * (spikeSlowed(w.wanted, w.time) ? 0.35 : 1);
  const boost = nitroActive(w.garage, w.time) ? 1.4 : 1;
  const accel = car.accel * (input.forward ? 1 : input.back ? -0.6 : 0);
  car.speed = clamp(car.speed + accel * dt, -12, top * boost);
  if (!input.forward && !input.back) car.speed *= Math.max(0, 1 - dt * 1.4);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const drift = Math.abs(car.speed) > 18 && steer !== 0 ? 0.25 : 0;
  car.angle += steer * dt * 1.9 * Math.min(1, Math.abs(car.speed) / 12) * (car.speed < 0 ? -1 : 1);
  car.drift = drift;
  car.x += Math.sin(car.angle) * car.speed * dt;
  car.z += Math.cos(car.angle) * car.speed * dt;
  if (car.x < -700) { car.x = -700; car.speed *= -0.4; }
  if (car.x > 700) { car.x = 700; car.speed *= -0.4; }
  if (car.z < -700) { car.z = -700; car.speed *= -0.4; }
  if (car.z > 700) { car.z = 700; car.speed *= -0.4; }
  p.x = car.x; p.z = car.z; p.angle = car.angle; p.speed = Math.abs(car.speed);
  if (hitSpike(w.wanted, car.x, car.z, w.time)) w.toast = 'SPIKE STRIP! SPEED CUT';
}

export function updateWorld(w, input, dt) {
  w.time += dt;
  if (w.frozen) {
    // Shot mode: the diorama is frozen — hour, mission, wanted,
    // standing, cover, tapes and money do not move. Only the
    // visible vehicles keep moving, handled by traffic/police.
    // The district still tracks the player, so the HUD label is right.
    w.districtId = currentDistrict(w).id;
    return w;
  }
  w.hour += dt / 240;
  if (w.hour >= 24) { w.hour -= 24; }
  movePlayer(w, input, dt);
  w.districtId = currentDistrict(w).id;

  // Wanted decay.
  decayWanted(w.wanted, dt, w.time);

  // COVER: witnesses watch the player after a crime.
  const seenBy = w.cover.witnesses.length > 0;
  const raised = updateCover(w.cover, dt, w.player.x, w.player.z, seenBy);
  if (raised > 0) {
    w.wanted.level = Math.min(5, w.wanted.level + raised);
    w.toast = 'WITNESS CALLED THE NDPD!';
  }

  // Missions.
  if (w.state === 'MISSION' || w.state === 'FREE_ROAM') {
    const ev = reachObjective(w.missions, w.player.x, w.player.z);
    if (ev.event === 'complete') {
      w.money += ev.payout;
      w.rp += ev.payout / 10;
      w.day += 1;
      addMissionStanding(w.standing, ev.district);
      updateRank(w);
      w.toast = ev.mission.title + ' COMPLETE  +$' + ev.payout;
      const m = currentMission(w.missions);
      if (m) {
        w.wanted.level = m.startWanted;
        w.state = 'MISSION';
      } else {
        w.state = 'FREE_ROAM';
      }
    } else if (ev.event === 'objective') {
      w.toast = 'NEXT: ' + ev.next.label;
    }
  }

  // Street race checkpoints.
  const rev = raceCheckpoint(w.race, w.player.x, w.player.z);
  if (rev.event === 'finish') {
    w.money += rev.reward;
    addRaceStanding(w.standing, rev.district);
    w.toast = 'RACE WON  +$' + rev.reward;
  } else if (rev.event === 'checkpoint') {
    w.toast = 'CHECKPOINT ' + rev.next + '/' + rev.total;
  }

  // Side jobs.
  const jev = completeJob(w.job, w.player.x, w.player.z);
  if (jev.event === 'complete') {
    w.money += jev.reward;
    addJobStanding(w.standing, jev.district);
    w.toast = jev.kind.toUpperCase() + ' DONE  +$' + jev.reward;
  }

  // Aurora tapes.
  const tev = collectTape(w.tapes, w.player.x, w.player.z);
  if (tev.event === 'tape') {
    w.money += tev.bonus;
    w.toast = 'AURORA TAPE ' + tev.found + '/' + tev.total + '  +$' + tev.bonus;
  }
  return w;
}

export function enterCar(w) {
  const d = dist2(w.player.x, w.player.z, w.car.x, w.car.z);
  if (d > 8) return false;
  w.player.onFoot = false;
  return true;
}

export function exitCar(w) {
  w.player.onFoot = true;
  w.player.x = w.car.x + 4;
  w.player.z = w.car.z + 4;
  return true;
}

export function stealCar(w, cars) {
  let best = null; let bestD = 10;
  for (const c of cars) {
    const d = dist2(w.player.x, w.player.z, c.x, c.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return false;
  w.car.x = best.x; w.car.z = best.z; w.car.angle = best.angle;
  w.car.speed = 0;
  w.player.onFoot = false;
  return true;
}

export function startMission(w, id) {
  const m = w.missions;
  m.current = id;
  m.objective = 0;
  w.state = 'MISSION';
  const mission = currentMission(m);
  if (mission) w.wanted.level = mission.startWanted;
  return mission;
}

export function missionObjectiveLabel(w) {
  const o = currentObjective(w.missions);
  if (!o) return 'FREE ROAM — NEON DELTA';
  return o.label;
}
