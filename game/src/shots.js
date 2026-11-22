// Screenshot staging: four frozen dioramas, one per shot.
// In shot mode the game freezes hour, mission, wanted, standing,
// cover, tapes and money — the car, traffic, police and heli still
// move visually. Each shot is composed DENSE: no large empty
// ground or empty sky in the frame. Cameras sit LOW on the road
// or the deck, looking along the action — never high above a
// building roof.
//   1 chase: wanted 5, golden-hour dusk, heli visible ahead-left with
//      its beam slanting onto the car, roadblock ahead, SWAT van in
//      frame, 4+ traffic cars and 6+ pedestrians visible, weapon
//      wheel open showing the 4 tiers (small, off-centre). Camera
//      LOW and CLOSE behind the car on the x=-320 road, looking north.
//   2 shop: DELTA ARMS front with tier labels, Mara LARGE and whole
//      right-of-centre (east of the door, against the dark wall),
//      parked car + bench + crates + newspaper box +
//      bin, no bike rack, rooftop billboard with DISTRICT WARS
//      readable. Camera just behind Mara, pulled back and raised
//      so the billboard clears the DELTA ARMS sign.
//   3 pier at night: stalls readable (name signs, none cut off),
//      string lights, ferris wheel + fireworks, palm, COTTON CANDY
//      sign, 8+ NPCs on the deck, Mara large and visible
//      right-of-centre, bright night market. Camera on the deck,
//      low, pulled back a little so Mara is a quarter of the
//      frame and the wheel stays clear of her.
//   4 port at dusk 18:00: crane load in frame, deep red dusk sky,
//      freeway bridge, containers + lamps + puddles + the boat LARGE
//      at the south dock, the hero car LARGE side-on, Mara LARGE on
//      foot in the foreground. Camera LOW east of the boat, over
//      the water, looking west-northwest across the dock.
import { SHOP, CRANE, BOAT } from './config.js';
import { startRace } from './races.js';

// Story lines shown in the dialogue box in shot mode (shots 1, 3, 4).
export const SHOT_DIALOGUE = {
  1: { speaker: 'Mara Solano', line: 'Five stars and a roadblock ahead — punch through, don\'t stop.' },
  3: { speaker: 'Inez Vargas', line: 'Meet me where the lights are loudest. The ledger pages are already moving.' },
  4: { speaker: 'Orin Beck', line: 'Two drops left and the proof goes out tonight. Keep the car running.' },
};

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
    // Golden-hour dusk: the hero car is LOW and LARGE, the heli is
    // staged ahead-left so it reads in the sky, beam slanting down.
    world.hour = 17.5;
    world.wanted.level = 5;
    world.car.x = -320; world.car.z = -260; world.car.angle = Math.PI; world.car.speed = 22;
    world.player.onFoot = false;
    world.player.x = world.car.x; world.player.z = world.car.z;
    world.combat.wheelOpen = true;
    world.combat.current = 'carbine';
    world.money = 2450; world.rp = 620; world.rankCode = 'A';
    world.missions.current = 1; world.missions.objective = 0;
    // Roadblocks ahead on the road, SWAT van ahead-left.
    police.roadblocks = [
      { x: -320, z: -350, angle: 0, cars: 2 },
      { x: -320, z: -382, angle: 0, cars: 2 },
    ];
    police.swat = { type: 'swat', color: 0x111111, x: -300, z: -330, angle: Math.PI, speed: 12, topSpeed: 26, armour: true, swat: true };
    police.heli = { x: -330, z: -295, y: 30, angle: 0, rotor: 0 };
    police.cars = [];
    const copSpots = [[-340, -300], [-300, -310], [-320, -340], [-340, -360], [-300, -280], [-280, -320], [-360, -290]];
    for (let i = 0; i < copSpots.length; i += 1) {
      police.cars.push({ type: 'ndpd', color: 0x1a1a2e, x: copSpots[i][0], z: copSpots[i][1], angle: Math.PI, speed: 14, topSpeed: 32, path: [], pathI: 0, scripted: i === 0, swat: false });
    }
    // Traffic on the road and the cross street, all ahead of the camera.
    const carSpots = [[-320, -420], [-280, -360], [-280, -320], [-240, -320]];
    for (let i = 0; i < carSpots.length; i += 1) {
      const c = traffic.cars[i];
      c.x = carSpots[i][0]; c.z = carSpots[i][1]; c.angle = i < 2 ? Math.PI : Math.PI / 2; c.speed = 8;
    }
    // Pedestrians on the sidewalks along the road, all ahead of the camera.
    const pedSpots = [[-308, -250], [-332, -300], [-308, -340], [-332, -260], [-308, -270], [-332, -380]];
    for (let i = 0; i < pedSpots.length; i += 1) {
      const p = traffic.peds[i];
      p.x = pedSpots[i][0]; p.z = pedSpots[i][1]; p.angle = 1.2;
    }
    return { camera: { x: -320, y: 6, z: -238 }, look: { x: -320, y: 5, z: -290 } };
  }
  if (n === 2) {
    // Mara LARGE, whole, right-of-centre, back view, standing
    // EAST of the door's centreline so the yellow door is a
    // separate element to her left, not a huge flat wall directly
    // behind her — she reads against the dark shop wall instead.
    // The camera sits 10 units behind her but pulled back to
    // z = SHOP.z + 50 and raised to y = 4: from there the sightline
    // to the rooftop billboard clears the top of the DELTA ARMS
    // sign, so the "DISTRICT WARS" subtitle reads instead of
    // hiding behind the sign. The DELTA ARMS sign and the
    // NEON DELTA LA billboard both stay readable above her.
    world.hour = 10;
    world.wanted.level = 0;
    world.player.onFoot = true;
    world.player.x = SHOP.x + 20; world.player.z = SHOP.z + 40; world.player.angle = Math.PI;
    world.money = 3200; world.rp = 340; world.rankCode = 'B';
    world.shopOpen = true;
    // Parked car on the road west of the shop, in frame, clear of
    // the shop panel.
    const c = traffic.cars[0];
    c.x = SHOP.x - 45; c.z = SHOP.z - 35; c.angle = 0; c.speed = 0;
    const pedSpots = [[-342, -160], [-310, -165], [-342, -185], [-305, -190], [-340, -200]];
    for (let i = 0; i < pedSpots.length; i += 1) {
      const p = traffic.peds[i + 1];
      p.x = pedSpots[i][0]; p.z = pedSpots[i][1]; p.angle = 2.6;
    }
    return { camera: { x: SHOP.x + 20, y: 4, z: SHOP.z + 50 }, look: { x: SHOP.x + 5, y: 8, z: SHOP.z } };
  }
  if (n === 3) {
    // Pier at night: Mara LARGE and whole, back view, facing the
    // stalls (angle -PI/2, back to the camera) — but OFF-CENTRE
    // to the right, and the camera pulled back a little, so she
    // is roughly a quarter of the frame tall and does NOT block
    // the ferris wheel or the ARCADE sign: the wheel, the
    // fireworks and all three stall signs (SNO-CONES, ARCADE,
    // BALLOONS) stay fully visible around her. She stands 13
    // units west of the camera and 4 units south of the look
    // line, which puts her right-of-centre; the mission is M7
    // (Inez Vargas). The camera sits 58 units east of the stall
    // row, so the row's 80-unit span fits the frame with all
    // three signs readable.
    world.hour = 22;
    world.wanted.level = 1;
    world.player.onFoot = true;
    world.player.x = -652; world.player.z = 428; world.player.angle = -Math.PI / 2;
    world.money = 1800; world.rp = 480; world.rankCode = 'B';
    world.missions.current = 7; world.missions.objective = 0;
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
    return { camera: { x: -639, y: 1.8, z: 432 }, look: { x: -720, y: 6, z: 435 } };
  }
  // Shot 4: port at dusk, crane load in frame, boat at the south dock.
  // Mara LARGE + boat LARGE + crane all fit by DEPTH, and the
  // camera now sits SOUTH-EAST of the dock, just over the water
  // (z = 624, past the dock edge at z = 620), looking
  // west-northwest: the near foreground is blue water, not grey
  // concrete, so the boat reads as a boat ON the water. Mara is
  // large in the right foreground on the dock edge (back view,
  // whole), the hero car is side-on near the centre, the boat is
  // large in the left mid-ground well out in open water (its hull
  // sits ~23 units south of the dock edge, water all around it),
  // and the crane and the freeway bridge close the background —
  // the camera is far enough east that the crane's jib and load
  // fit inside the frame instead of being cut at the edge. The
  // mission is M8 (Orin Beck).
  world.hour = 18;
  world.wanted.level = 2;
  // The hero car sits east of the dock centre, side-on, near the
  // camera so it reads large in the mid-ground without Mara
  // blocking it.
  world.car.x = 570; world.car.z = 600; world.car.angle = 0.4; world.car.speed = 0;
  world.player.onFoot = true;
  // Mara on the dock edge, facing northwest away from the camera
  // (back view); the camera sits southeast of her, over the water.
  world.player.x = 607; world.player.z = 615; world.player.angle = -3 * Math.PI / 4;
  world.money = 5100; world.rp = 900; world.rankCode = 'A';
  world.missions.current = 8; world.missions.objective = 0;
  // The boat turns to a three-quarter view so the hull, the teal
  // cabin and the mast all read instead of one long grey side.
  // Moored well out in open water south of the dock, so blue
  // water shows around the amber hull on every side and it reads
  // as one boat shape at a glance, not a dock wall.
  world.boat.x = 465; world.boat.z = 655; world.boat.angle = Math.PI / 4;
  startRace(world.race, 'port', 42);
  const carSpots = [[420, 540], [520, 560], [360, 580], [560, 520], [580, 590]];
  for (let i = 0; i < carSpots.length; i += 1) {
    const c = traffic.cars[i];
    c.x = carSpots[i][0]; c.z = carSpots[i][1]; c.angle = -0.6; c.speed = 0;
  }
  const pedSpots = [[400, 520], [440, 560], [500, 540], [460, 600], [540, 580], [380, 560], [470, 600], [585, 605]];
  for (let i = 0; i < pedSpots.length; i += 1) {
    const p = traffic.peds[i];
    p.x = pedSpots[i][0]; p.z = pedSpots[i][1]; p.angle = 2.2;
  }
  return { camera: { x: 620, y: 2.5, z: 624 }, look: { x: 506, y: 6, z: 587 } };
}

export function shotFile(n) {
  const d = SHOT_DEFS.find((x) => x.n === n);
  return d ? d.file : '0' + n + '.jpg';
}
