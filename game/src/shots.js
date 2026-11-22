// Staging for the 4 marketing shots: camera, hero car, Mara, set dressing,
// frozen HUD values. Every position here is a v31 decision (see notes inline).
import { SHOP, BOAT, CRANE } from './config.js';

export const SHOT_DEFS = {
  1: {
    hour: 17, mission: 1, wanted: 5, money: 1250, cover: 100, tapes: 0, sky: 'dusk',
    standing: { downtown: 0 },
    camera: { x: -326, y: 3.5, z: -246 }, look: { x: -312, y: 3, z: -280 },
    car: { x: -320, z: -261, rot: 1.25, scale: 1.8 },
    heli: { x: -310, y: 19, z: -285 },
    roadblock: { x: -320, z: -295 },
    swat: { x: -292, z: -305, scale: 1.3 },
    policeCar: { x: -298, z: -278 },
    trafficCars: [[-318, -340], [-330, -380], [-305, -420], [-335, -450]],
    peds: [[-308, -250], [-332, -300], [-308, -340], [-332, -260], [-308, -270], [-332, -380], [-308, -290], [-332, -315]],
    trees: [[-345, -270], [-295, -270], [-345, -330], [-295, -330]],
    cones: [[-340, -255], [-300, -255]],
    barrier: { x: -336, z: -282 },
    dialogue: { name: 'Mara Solano', text: 'Five stars and a roadblock ahead — punch through, don\'t stop.' },
    missionBar: { title: 'M1 THE GETAWAY · TAHAP 1/2', objective: 'Pick up Eden', next: 'Lose the tail' },
  },
  2: {
    hour: 12, mission: 2, wanted: 0, money: 2150, cover: 100, tapes: 2, sky: 'day',
    standing: { venice: 10 },
    camera: { x: SHOP.x - 10, y: 4, z: SHOP.z + 50 }, look: { x: SHOP.x, y: 3, z: SHOP.z },
    mara: { x: SHOP.x - 10, z: SHOP.z + 40, rot: Math.PI, scale: 1.8 },
    parkedCar: { x: -378, z: -200, rot: Math.PI / 2, scale: 1.5 },
    bench: { x: -375, z: -195 },
    crates: [[-350, -190], [-345, -185]],
    peds: [[-342, -160], [-310, -165], [-342, -185], [-305, -190], [-340, -200]],
    forecourtPeds: [[-348, -152], [-312, -152], [-346, -168], [-316, -170]],
    dialogue: { name: 'Harlan Dray', text: 'The canals are quiet tonight. Keep the package moving.' },
    missionBar: { title: 'M2 VENICE CANALS · TAHAP 1/2', objective: 'Meet Harlan', next: 'Drop the package' },
  },
  3: {
    hour: 22, mission: 7, wanted: 1, money: 4800, cover: 85, tapes: 7, sky: 'night',
    standing: { pier: 20 },
    camera: { x: -634, y: 1.8, z: 428 }, look: { x: -705, y: 4, z: 428 },
    // Mara 3 units south of the camera axis: the wheel hub clears her silhouette.
    mara: { x: -652, z: 431, rot: -Math.PI / 2, scale: 1.8 },
    wheel: { x: -705, z: 428, radius: 19, hubY: 20 },
    stalls: [
      { label: 'BALLOONS', x: -690, z: 410, color: 0xe74c3c },
      { label: 'SNO-CONES', x: -690, z: 445, color: 0xf1c40f },
      { label: 'ARCADE', x: -715, z: 410, color: 0x1abc9c },
    ],
    palm: { x: -700, z: 395 },
    benches: [[-660, 415], [-660, 440]],
    crates: [[-655, 420], [-655, 438]],
    barrels: [[-648, 425], [-648, 435]],
    lightPools: [[-660, 428], [-650, 420], [-650, 435]],
    peds: [[-665, 412], [-665, 444], [-668, 418], [-668, 438], [-663, 425], [-663, 435]],
    nearPeds: [[-652, 418], [-652, 438]],
    confetti: { x: -700, z: 430 },
    dialogue: { name: 'Inez Vargas', text: 'The ledger is under the boards. Take it and go before the lights come on.' },
    missionBar: { title: 'M7 THE NIGHT LEDGER · TAHAP 1/3', objective: 'Meet Inez', next: 'Take the ledger' },
  },
  4: {
    hour: 18, mission: 8, wanted: 2, money: 6200, cover: 90, tapes: 11, sky: 'dusk',
    standing: { port: 15 },
    camera: { x: 645, y: 3, z: 626 }, look: { x: 585, y: 4, z: 612 },
    mara: { x: 632, z: 618, rot: -Math.PI / 2, scale: 1.8 },
    // v32: car moved north of Mara's sightline so it reads fully side-on
    // (at 615,615 it sat directly behind her from the camera).
    car: { x: 620, z: 596, rot: Math.PI, scale: 1.8 },
    // Boat pulled 4 units north of the v30 spot so the hull clears the frame edge.
    boat: { x: BOAT.x, z: BOAT.z, rot: 1.84, scale: 3.6 },
    wake: { x: 565, z: 641 },
    crane: { x: CRANE.x, z: CRANE.z },
    apron: [[608, 620], [600, 624], [598, 610], [628, 624], [620, 628]],
    portRoad: { x: 633.9, z: 608.4 },
    greenContainer: { x: 600, z: 520 },
    yardPeds: [[400, 520], [440, 560], [500, 540], [460, 600], [540, 580], [380, 560], [470, 600], [585, 605]],
    dialogue: { name: 'Orin Beck', text: 'Two drops left and the proof goes out tonight. Keep the car running.' },
    missionBar: { title: 'M8 THE LAST SIGNAL · TAHAP 1/3', objective: 'Marina drop', next: 'Pier drop' },
  },
};
export function shotDef(n) { return SHOT_DEFS[n]; }

// Validated ped grids: every spot clear of buildings and ocean, used to relocate
// ambient peds so none blocks a staged camera.
export function shot4YardSpots() {
  const spots = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 13; c++) spots.push({ x: 395 + c * 22, z: 515 + r * 14 });
  }
  return spots;
}
export function shot2ForecourtSpots() {
  const spots = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 12; c++) spots.push({ x: -415 + c * 12, z: -198 + r * 6 });
  }
  return spots;
}
