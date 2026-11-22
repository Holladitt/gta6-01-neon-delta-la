// shots.js — fixed shot staging (?shot=N) and the debug state hook.
// The shoot driver reads window.__ndState() and checks these exact values.
import { startMission } from './missions.js';
import { nightLevel } from './lights.js';

export function stageShot(G, n) {
  G.freezeClock = true;
  if (n === 1) {
    // Chase: M5 stage 1/2, 17:00, wanted 3, $8,450, in the car on the avenue.
    G.hour = 17.0;
    G.money = 8450;
    G.missionIndex = 4;
    G.mission = startMission(4);
    G.state = 'mission';
    G.wanted.level = 3;
    G.wanted.quietTimer = 0;
    G.player.inCar = true;
    G.player.x = 0;
    G.player.z = 100;
    G.player.heading = 0;
    G.car.x = 0;
    G.car.z = 100;
    G.car.heading = 0;
    G.car.speed = 0;
    G.chaseTarget = { x: 0, z: 40, heading: 0, speed: 10 };
    G.cameraOverride = { pos: [0, 11, 148], look: [0, 8, 40] };
  } else if (n === 2) {
    // Shop: day, on foot before DELTA ARMS, shop panel open, $5,200.
    G.hour = 13.0;
    G.money = 5200;
    G.missionIndex = 1;
    G.mission = null;
    G.state = 'roam';
    G.wanted.level = 0;
    G.player.inCar = false;
    G.player.x = 90;
    G.player.z = 128;
    G.player.heading = Math.PI;
    G.cameraOverride = { pos: [90, 4.5, 112], look: [90, 3, 152] };
    G.hud.openShop();
  } else if (n === 3) {
    // Pier at night: M7, 21:30, on the deck among the stalls.
    G.hour = 21.5;
    G.money = 3200;
    G.missionIndex = 6;
    G.mission = startMission(6);
    G.state = 'mission';
    G.wanted.level = 0;
    G.player.inCar = false;
    G.player.x = 3;
    G.player.z = 772;
    G.player.heading = Math.PI;
    G.cameraOverride = { pos: [0, 6, 762], look: [0, 2.5, 822] };
  } else if (n === 4) {
    // Port at dusk: M8, 18:00, wanted 2, in the car by the crane.
    G.hour = 18.0;
    G.money = 6100;
    G.missionIndex = 7;
    G.mission = startMission(7);
    G.state = 'mission';
    G.wanted.level = 2;
    G.wanted.quietTimer = 0;
    G.player.inCar = true;
    G.player.x = 700;
    G.player.z = 580;
    G.player.heading = Math.PI * 0.25;
    G.car.x = 700;
    G.car.z = 580;
    G.car.heading = Math.PI * 0.25;
    G.car.speed = 0;
    G.cameraOverride = { pos: [688, 11, 608], look: [762, 13, 512] };
  }
}

export function buildState(G) {
  const heli = G.police.heliActive
    ? [G.police.heliPos.x, G.police.heliPos.y, G.police.heliPos.z]
    : null;
  return {
    ticks: G.ticks,
    state: G.state,
    hour: G.hour,
    night: nightLevel(G.hour),
    wanted: G.wanted.level,
    money: G.money,
    mission: G.mission ? G.missionIndex : -1,
    missionStage: G.mission ? { index: G.mission.step, total: G.mission.def.steps.length } : null,
    speedKmh: G.player.inCar ? Math.round(Math.abs(G.car.speed) * 3.6) : Math.round(G.player.speed * 3.6),
    heli,
    heliBeam: G.police.beamData,
    pos: [G.player.x, G.player.z],
    dispatchUnits: G.dispatchUnits.length,
    shopOpen: G.shopOpen,
    ownedWeapons: G.combat.owned.slice(),
    errors: G.errors,
  };
}
