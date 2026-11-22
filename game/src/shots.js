// Screenshot staging for Neon Delta LA: District Wars.
// Four frozen dioramas. Shot mode freezes hour, mission, wanted,
// standing, cover, tapes and money; vehicles, police and the helicopter
// still move visually. Mara is large in shots 2, 3 and 4 (red jacket,
// blue backpack, back view, whole) and the boat reads as a boat in
// shot 4. Unstaged pedestrians stand on validated grids, never near
// the camera: the port-yard grid keeps every ped at least 60 units
// from the shot-4 camera, the forecourt grid at least 32 from the
// shot-2 camera, so no foreground ped reads as a random block.
import { SHOP, BOAT, CRANE, PIER_DECK } from './config.js';
import { inBuilding, inOcean, onRoad } from './geo.js';
import { dist2 } from './rng.js';

export const SHOT2_CAMERA = { x: SHOP.x, y: 4, z: SHOP.z + 50 };
export const SHOT4_CAMERA = { x: 645, y: 3, z: 626 };
export const SHOT2_MARA = { x: SHOP.x - 10, z: SHOP.z + 40 };
export const SHOT4_MARA = { x: 632, z: 618 };
export const SHOT4_BOAT = { x: 530, z: 648 };
export const SHOP_FOOTPRINT = { x0: -350, x1: -290, z0: -230, z1: -170 };

// Port yard grid: 13 columns x 9 rows over the open yard, filtered to
// spots clear of buildings and water and at least 60 units from the
// shot-4 camera, so no ped ever blocks the foreground.
export function shot4YardSpots() {
  const spots = [];
  for (let i = 0; i < 13; i += 1) {
    for (let j = 0; j < 9; j += 1) {
      const x = 380 + i * 20;
      const z = 500 + j * 15;
      if (inBuilding(x, z)) continue;
      if (inOcean(x, z)) continue;
      if (dist2(x, z, SHOT4_CAMERA.x, SHOT4_CAMERA.z) < 60) continue;
      if (dist2(x, z, CRANE.x, CRANE.z) < 12) continue;
      spots.push({ x, z });
    }
  }
  return spots;
}

// Shop forecourt grid: a wide sweep of the forecourt, filtered to spots
// clear of buildings and water, off the road, clear of the shop front
// and at least 32 units from the shot-2 camera.
export function shot2ForecourtSpots() {
  const spots = [];
  for (let i = 0; i < 16; i += 1) {
    for (let j = 0; j < 14; j += 1) {
      const x = -460 + i * 20;
      const z = -300 + j * 20;
      if (inBuilding(x, z)) continue;
      if (inOcean(x, z)) continue;
      if (onRoad(x, z)) continue;
      if (x >= SHOP_FOOTPRINT.x0 && x <= SHOP_FOOTPRINT.x1 && z >= SHOP_FOOTPRINT.z0 && z <= SHOP_FOOTPRINT.z1) continue;
      if (dist2(x, z, SHOT2_CAMERA.x, SHOT2_CAMERA.z) < 32) continue;
      spots.push({ x, z });
    }
  }
  return spots;
}

// Staged pedestrians the shots place by hand (visible in the frame).
export const SHOT1_PEDS = [
  { x: -308, z: -250 }, { x: -332, z: -300 }, { x: -308, z: -340 },
  { x: -332, z: -260 }, { x: -308, z: -270 }, { x: -332, z: -380 },
];
export const SHOT2_PEDS = [
  { x: -342, z: -160 }, { x: -310, z: -165 }, { x: -342, z: -185 },
  { x: -305, z: -190 }, { x: -340, z: -200 },
];
export const SHOT2_FOREGROUND_PEDS = [
  { x: -348, z: -152 }, { x: -312, z: -152 }, { x: -346, z: -168 }, { x: -316, z: -170 },
];
export const SHOT3_PEDS = [
  { x: -670, z: 415 }, { x: -668, z: 445 }, { x: -675, z: 425 }, { x: -672, z: 450 },
  { x: -680, z: 440 }, { x: -678, z: 420 }, { x: -685, z: 435 }, { x: -682, z: 455 },
  { x: -690, z: 430 }, { x: -688, z: 448 },
];
export const SHOT4_PEDS = [
  { x: 400, z: 520 }, { x: 440, z: 560 }, { x: 500, z: 540 }, { x: 460, z: 600 },
  { x: 540, z: 580 }, { x: 380, z: 560 }, { x: 470, z: 600 }, { x: 585, z: 605 },
];

// The four shots: hour, mission, wanted and the full staging.
// Mara is the hero of shots 2-4; the car is the hero of shot 1.
export const SHOTS = [
  {
    n: 1, name: 'chase', hour: 18, mission: 1, wanted: 5, money: 1250, day: 3,
    car: { x: -320, z: -260, angle: Math.PI },
    camera: { x: -320, y: 3.5, z: -248 },
    look: { x: -320, y: 1, z: -320 },
    heli: { x: -320, z: -270 },
    roadblock: { x: -320, z: -350 },
    swat: { x: -300, z: -330 },
    police: [{ x: -340, z: -330 }, { x: -300, z: -300 }],
    traffic: [{ x: -320, z: -400 }, { x: -280, z: -320 }, { x: -320, z: -180 }, { x: -280, z: -220 }],
    peds: SHOT1_PEDS,
    dialogue: { name: 'MARA SOLANO', line: 'Five stars and a roadblock ahead — punch through, don\'t stop.' },
    missionBar: { title: 'M1 THE GETAWAY', stage: 'TAHAP 1/2', objective: 'Pick up Eden', next: 'Lose the tail' },
    wheelOpen: true,
  },
  {
    n: 2, name: 'shop', hour: 10, mission: 2, wanted: 0, money: 850, day: 2,
    mara: { x: SHOT2_MARA.x, z: SHOT2_MARA.z, scale: 1.8, angle: Math.PI },
    camera: { x: SHOT2_CAMERA.x, y: SHOT2_CAMERA.y, z: SHOT2_CAMERA.z },
    look: { x: -330, y: 1.2, z: -160 },
    parkedCar: { x: SHOP.x - 45, z: SHOP.z - 35, angle: 0.4 },
    peds: SHOT2_PEDS,
    foregroundPeds: SHOT2_FOREGROUND_PEDS,
    dialogue: null,
    missionBar: { title: 'M2 VENICE CANALS', stage: 'TAHAP 1/2', objective: 'Meet Harlan', next: 'Drop the package' },
    wheelOpen: false,
  },
  {
    n: 3, name: 'pier', hour: 21, mission: 7, wanted: 1, money: 2100, day: 7,
    mara: { x: -652, z: 428, scale: 1.8, angle: Math.PI * 0.5 },
    camera: { x: -639, y: 1.8, z: 428 },
    look: { x: -720, y: 2, z: 445 },
    peds: SHOT3_PEDS,
    dialogue: { name: 'INEZ VARGAS', line: 'Meet me where the lights are loudest. The ledger pages are already moving.' },
    missionBar: { title: 'M7 THE NIGHT LEDGER', stage: 'TAHAP 1/2', objective: 'Meet Inez', next: 'Take the ledger' },
    wheelOpen: false,
  },
  {
    n: 4, name: 'port', hour: 18, mission: 8, wanted: 2, money: 3400, day: 8,
    mara: { x: SHOT4_MARA.x, z: SHOT4_MARA.z, scale: 2, angle: -1.28 },
    car: { x: 595, z: 605, angle: 0 },
    boat: { x: SHOT4_BOAT.x, z: SHOT4_BOAT.z, scale: 3, angle: 0.4 },
    camera: { x: SHOT4_CAMERA.x, y: SHOT4_CAMERA.y, z: SHOT4_CAMERA.z },
    look: { x: 560, y: 2, z: 630 },
    peds: SHOT4_PEDS,
    dialogue: { name: 'ORIN BECK', line: 'Two drops left and the proof goes out tonight. Keep the car running.' },
    missionBar: { title: 'M8 THE LAST SIGNAL', stage: 'TAHAP 1/3', objective: 'Marina drop', next: 'Pier drop' },
    wheelOpen: false,
  },
];

export function shotByNumber(n) {
  return SHOTS.find((s) => s.n === n) || SHOTS[0];
}

export function pierDeck() {
  return { x0: PIER_DECK.x0, x1: PIER_DECK.x1, z0: PIER_DECK.z0, z1: PIER_DECK.z1 };
}

export function boatSpot() {
  return { x: BOAT.x, z: BOAT.z };
}
