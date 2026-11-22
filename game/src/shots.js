// shots.js — pure shot data: staging positions and density grids.
// No three.js here: the sim imports this module in Node.
import { SHOP, BOAT, CRANE } from './config.js';
import { inBuilding, inOcean } from './geo.js';

export const SHOTS = {
  1: {
    mission: 1, hour: 18, wanted: 5, standing: 20, cover: 100, tapes: 0, money: 500,
    car: { x: -320, z: -261 },
    camera: { x: -314, y: 2.6, z: -249 },
    look: { x: -320, y: 2.2, z: -272 },
    heli: { x: -320, y: 24, z: -300 },
    roadblock: { x: -320, z: -295 },
    swat: { x: -300, z: -298 },
    peds: [
      { x: -308, z: -250 }, { x: -332, z: -300 }, { x: -308, z: -340 }, { x: -332, z: -260 },
      { x: -308, z: -270 }, { x: -332, z: -380 }, { x: -308, z: -290 }, { x: -332, z: -315 },
    ],
    title: 'M1 THE GETAWAY · TAHAP 1/2',
    objective: 'Pick up Eden',
    next: 'Lose the tail',
    dialogue: { name: 'MARA', text: 'Five stars and a roadblock ahead — punch through, don\'t stop.' },
  },
  2: {
    mission: 2, hour: 10, wanted: 0, standing: 10, cover: 100, tapes: 1, money: 900,
    mara: { x: SHOP.x - 10, z: SHOP.z + 40 },
    parkedCar: { x: SHOP.x - 45, z: SHOP.z - 35 },
    camera: { x: SHOP.x - 10, y: 3.5, z: SHOP.z + 47 },
    look: { x: SHOP.x - 10, y: 2.6, z: SHOP.z + 40 },
    peds: [
      { x: -342, z: -160 }, { x: -310, z: -165 }, { x: -342, z: -185 }, { x: -305, z: -190 }, { x: -340, z: -200 },
    ],
    foregroundPeds: [
      { x: -348, z: -152 }, { x: -312, z: -152 }, { x: -346, z: -168 }, { x: -316, z: -170 },
    ],
    title: 'M2 VENICE CANALS · TAHAP 1/2',
    objective: 'Meet Harlan',
    next: 'Drop the package',
    dialogue: { name: 'HARLAN', text: 'The canals are quiet tonight. Keep the package moving.' },
  },
  3: {
    mission: 7, hour: 21, wanted: 0, standing: 40, cover: 100, tapes: 5, money: 2900,
    mara: { x: -652, z: 428 },
    camera: { x: -639, y: 1.8, z: 428 },
    look: { x: -652, y: 2.2, z: 428 },
    peds: [
      { x: -670, z: 415 }, { x: -668, z: 445 }, { x: -675, z: 425 }, { x: -672, z: 450 },
      { x: -680, z: 440 }, { x: -678, z: 420 }, { x: -685, z: 435 }, { x: -682, z: 455 },
      { x: -690, z: 430 }, { x: -688, z: 448 },
    ],
    foregroundPeds: [
      { x: -664, z: 418 }, { x: -668, z: 414 }, { x: -660, z: 422 }, { x: -664, z: 438 },
      { x: -668, z: 442 }, { x: -660, z: 434 }, { x: -650, z: 440 }, { x: -654, z: 422 },
    ],
    foregroundProps: [
      { x: -674, z: 412 }, { x: -674, z: 444 }, { x: -662, z: 424 }, { x: -662, z: 432 },
      { x: -660, z: 446 }, { x: -668, z: 448 }, { x: -658, z: 428 }, { x: -666, z: 422 }, { x: -666, z: 434 },
    ],
    title: 'M7 THE NIGHT LEDGER · TAHAP 1/2',
    objective: 'Meet Inez',
    next: 'Take the ledger',
    dialogue: { name: 'INEZ', text: 'The ledger is under the boards. Take it and go before the lights come on.' },
  },
  4: {
    mission: 8, hour: 18, wanted: 2, standing: 60, cover: 80, tapes: 8, money: 4500,
    mara: { x: 632, z: 618 },
    car: { x: 615, z: 615 },
    boat: { x: BOAT.x, z: BOAT.z },
    crane: { x: CRANE.x, z: CRANE.z },
    camera: { x: 645, y: 3, z: 626 },
    look: { x: 590, y: 4, z: 615 },
    peds: [
      { x: 400, z: 520 }, { x: 440, z: 560 }, { x: 500, z: 540 }, { x: 460, z: 600 },
      { x: 540, z: 580 }, { x: 380, z: 560 }, { x: 470, z: 600 }, { x: 585, z: 605 },
    ],
    apron: [
      { x: 608, z: 620 }, { x: 600, z: 624 }, { x: 598, z: 610 }, { x: 628, z: 624 }, { x: 620, z: 628 },
    ],
    road: [
      { x: 633.9, z: 608.4 }, { x: 637.6, z: 634.1 }, { x: 630.2, z: 582.7 },
    ],
    title: 'M8 THE LAST SIGNAL · TAHAP 1/3',
    objective: 'Marina drop',
    next: 'Pier drop',
    dialogue: { name: 'ORIN', text: 'Two drops left and the proof goes out tonight. Keep the car running.' },
  },
};

export function shot2ForecourtSpots() {
  const spots = [];
  for (let x = -420; x <= -288; x += 11) {
    for (let z = -240; z <= -120; z += 11) {
      if (inBuilding(x, z)) continue;
      if (inOcean(x, z)) continue;
      spots.push({ x, z });
    }
  }
  return spots;
}
export function shot4YardSpots() {
  const spots = [];
  for (let x = 380; x <= 620; x += 20) {
    for (let z = 500; z <= 608; z += 12) {
      if (inBuilding(x, z)) continue;
      if (inOcean(x, z)) continue;
      spots.push({ x, z });
    }
  }
  return spots;
}
