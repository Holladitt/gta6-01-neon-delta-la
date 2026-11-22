// Screenshot staging: four frozen dioramas, one per shot.
// In shot mode the game freezes hour, mission, wanted, standing,
// cover, tapes and money — the car, traffic, police and heli still
// move visually. Each shot is composed DENSE: no large empty
// ground or empty sky in the frame. Cameras sit LOW on the road
// or the deck, looking along the action — never high above a
// building roof.
//   1 chase: wanted 5, heli beam on the car, roadblock ahead, SWAT
//      van in frame, 4+ traffic cars and 6+ pedestrians visible,
//      weapon wheel open showing the 4 tiers. Camera low behind
//      the car on the x=-320 road, looking north.
//   2 shop: DELTA ARMS front with tier labels, Mara whole, parked
//      car + bench + crates + newspaper box + bin, no bike rack.
//      Camera south of the shop on the x=-320 road, looking north.
//   3 pier at night: stalls readable (name signs), string lights,
//      8+ NPCs on the deck, Mara large and visible, bright night
//      market. Camera on the deck, low, looking west along it.
//   4 port at dusk 18:00: crane load in frame, dusk gradient sky,
//      containers + lamps + puddles + the boat at the south dock,
//      car large and clear of the minimap. Camera over the south
//      water, looking north-west across the dock.
import { SHOP, CRANE, BOAT } from './config.js';
import { startRace } from './races.js';

export const SHOT_DEFS = [
  { n: 1, name: 'chase', file: '01-chase.jpg' },
  { n: 2, name: 'shop', file: '02-shop.jpg' },
  { n: 3, name: 'pier', file: '03-pier.jpg' },
  { n: 4, name: 'port', file: '04-tracker.jpg' },
];

export function shotFromUrl() {
  try {
    const u = new URL(window.location.href);
    const n = parseInt(u.searchParams.get('shot') || '0', 10);
    return n >= 1 && n <= 4 ? n : 0;
  } catch (e) {
    return 0;
  }
}

export function applyShot(n, world, traffic, police) {
  world.shotMode = n;
  world.frozen = true;
  world.state = 'FREE_ROAM';
  if (n === 1) {
    // Northbound chase on the x=-320 road (angle PI = heading -z).
    world.hour = 11;
    world.wanted.level = 5;
    world.car.x = -320; world.car.z = -260; world.car.angle = Math.PI; world.car.speed = 22;
    world.player.onFoot = false;
    world.player.x = world.car.x; world.player.z = world.car.z;
    world.combat.wheelOpen = true;
    world.combat.current = 'carbine';
    world.money = 2450; world.rp = 620; world.rankCode = 'A';
    // Roadblocks ahead on the road, SWAT van ahead-left.
    police.roadblocks = [
      { x: -320, z: -350, angle: 0, cars: 2 },
      { x: -320, z: -382, angle: 0, cars: 2 },
    ];
    police.swat = { type: 'swat', color: 0x111111, x: -300, z: -330, angle: Math.PI, speed: 12, topSpeed: 26, armour: true, swat: true };
    police.heli = { x: -320, z: -260, y: 55, angle: 0, rotor: 0 };
    police.cars = [];
    const copSpots = [[-340, -300], [-300, -310], [-320, -340], [-340, -360], [-300, -280], [-280, -320], [-360, -290]];
    for (let i = 0; i < copSpots.length; i += 1) {
      police.cars.push({ type: 'ndpd', color: 0x1a1a2e, x: copSpots[i][0], z: copSpots[i][1], angle: Math.PI, speed: 14, topSpeed: 32, path: [], pathI: 0, scripted: i === 0, swat: false });
    }
    // Traffic on the road and the cross street.
    const carSpots = [[-320, -420], [-320, -200], [-280, -320], [-240, -320]];
    for (let i = 0; i < carSpots.length; i += 1) {
      const c = traffic.cars[i];
      c.x = carSpots[i][0]; c.z = carSpots[i][1]; c.angle = i < 2 ? Math.PI : Math.PI / 2; c.speed = 8;
    }
    // Pedestrians on the sidewalks along the road.
    const pedSpots = [[-308, -280], [-332, -300], [-308, -340], [-332, -260], [-308, -230], [-332, -380]];
    for (let i = 0; i < pedSpots.length; i += 1) {
      const p = traffic.peds[i];
      p.x = pedSpots[i][0]; p.z = pedSpots[i][1]; p.angle = 1.2;
    }
    return { camera: { x: -320, y: 16, z: -218 }, look: { x: -320, y: 3, z: -300 } };
  }
  if (n === 2) {
    world.hour = 10;
    world.wanted.level = 0;
    world.player.onFoot = true;
    world.player.x = SHOP.x - 12; world.player.z = SHOP.z + 50; world.player.angle = 0;
    world.money = 3200; world.rp = 340; world.rankCode = 'B';
    world.shopOpen = true;
    // Parked car on the road strip beside the forecourt.
    const c = traffic.cars[0];
    c.x = SHOP.x + 20; c.z = SHOP.z + 60; c.angle = 0; c.speed = 0;
    const pedSpots = [[-335, -140], [-305, -130], [-340, -160], [-300, -150], [-330, -100]];
    for (let i = 0; i < pedSpots.length; i += 1) {
      const p = traffic.peds[i + 1];
      p.x = pedSpots[i][0]; p.z = pedSpots[i][1]; p.angle = 2.6;
    }
    return { camera: { x: SHOP.x, y: 14, z: SHOP.z + 95 }, look: { x: SHOP.x, y: 6, z: SHOP.z } };
  }
  if (n === 3) {
    world.hour = 22;
    world.wanted.level = 1;
    world.player.onFoot = true;
    world.player.x = -662; world.player.z = 432; world.player.angle = Math.PI / 2;
    world.money = 1800; world.rp = 480; world.rankCode = 'B';
    // 10 NPCs on the pier deck around the stalls.
    const pedSpots = [[-670, 415], [-668, 445], [-675, 425], [-672, 450], [-680, 440], [-678, 420], [-685, 435], [-682, 455], [-690, 430], [-688, 448]];
    for (let i = 0; i < pedSpots.length; i += 1) {
      const p = traffic.peds[i];
      p.x = pedSpots[i][0]; p.z = pedSpots[i][1]; p.angle = 0.6 + i * 0.3;
    }
    for (let i = 0; i < 4; i += 1) {
      const c = traffic.cars[i];
      c.x = -640 + i * 8; c.z = 560 + i * 6; c.angle = 0; c.speed = 0;
    }
    return { camera: { x: -650, y: 6, z: 432 }, look: { x: -740, y: 4, z: 430 } };
  }
  // Shot 4: port at dusk, crane load in frame, boat at the south dock.
  world.hour = 18;
  world.wanted.level = 2;
  world.car.x = 480; world.car.z = 610; world.car.angle = 2.2; world.car.speed = 0;
  world.player.onFoot = false;
  world.player.x = world.car.x; world.player.z = world.car.z;
  world.money = 5100; world.rp = 900; world.rankCode = 'A';
  world.boat.x = 560; world.boat.z = 635;
  startRace(world.race, 'port', 42);
  const carSpots = [[420, 540], [520, 560], [360, 580], [560, 520], [540, 600]];
  for (let i = 0; i < carSpots.length; i += 1) {
    const c = traffic.cars[i];
    c.x = carSpots[i][0]; c.z = carSpots[i][1]; c.angle = -0.6; c.speed = 0;
  }
  const pedSpots = [[400, 520], [440, 560], [500, 540], [460, 600], [540, 580], [380, 560], [470, 600], [500, 615]];
  for (let i = 0; i < pedSpots.length; i += 1) {
    const p = traffic.peds[i];
    p.x = pedSpots[i][0]; p.z = pedSpots[i][1]; p.angle = 2.2;
  }
  return { camera: { x: 430, y: 8, z: 660 }, look: { x: 520, y: 4, z: 540 } };
}

export function shotFile(n) {
  const d = SHOT_DEFS.find((x) => x.n === n);
  return d ? d.file : '0' + n + '.jpg';
}
