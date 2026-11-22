// Geography for Neon Delta LA: roads, ocean, buildings, landmarks.
// Avenues run north-south, streets east-west, both 16 units wide.
// West of x=-660 and south of z=635 is ocean. Buildings sit inside
// city blocks, inset from the roads, and never on a shot staging point,
// a mission point, a race checkpoint or the shop and garage.
import { BOAT, CRANE, SHOP, PIER_DECK, GARAGE_POS, OCEAN_WEST, OCEAN_SOUTH } from './config.js';
import { makeRng, range } from './rng.js';

export const AVENUES = [-560, -320, -280, 0, 280, 560];
export const STREETS = [-560, -280, 0, 280, 560];
export const ROAD_HALF = 8;

// Buildings: centre x,z, width, depth, height (storeys of window grid).
// The shop forecourt block (x -560..-320, z -280..0) holds only one
// building, far west of the shop, so the forecourt stays open grass.
// The port yard (x 300..700, z 300..650) holds no buildings at all:
// it is containers, the crane and open concrete.
export const BUILDINGS = [
  { x: -440, z: -420, w: 100, d: 100, h: 40 },
  { x: -440, z: -520, w: 80, d: 60, h: 25 },
  { x: -505, z: -140, w: 70, d: 100, h: 50 },
  { x: -440, z: 140, w: 100, d: 120, h: 35 },
  { x: -440, z: 420, w: 110, d: 100, h: 45 },
  { x: -140, z: -420, w: 100, d: 100, h: 60 },
  { x: -140, z: -520, w: 70, d: 60, h: 30 },
  { x: -80, z: -140, w: 100, d: 120, h: 55 },
  { x: -140, z: 140, w: 110, d: 120, h: 40 },
  { x: -140, z: 420, w: 100, d: 100, h: 30 },
  { x: 120, z: -420, w: 100, d: 100, h: 70 },
  { x: 140, z: -520, w: 80, d: 60, h: 25 },
  { x: 140, z: -140, w: 110, d: 120, h: 50 },
  { x: 170, z: 140, w: 80, d: 100, h: 65 },
  { x: 140, z: 420, w: 100, d: 100, h: 35 },
  { x: 460, z: -420, w: 80, d: 100, h: 55 },
  { x: 420, z: -520, w: 70, d: 60, h: 28 },
  { x: 420, z: -140, w: 110, d: 120, h: 45 },
  { x: 420, z: 140, w: 100, d: 110, h: 60 },
  { x: 420, z: 340, w: 100, d: 60, h: 30 },
  { x: 650, z: -200, w: 80, d: 100, h: 40 },
  { x: 650, z: 100, w: 90, d: 110, h: 50 },
  { x: -100, z: -650, w: 100, d: 80, h: 35 },
  { x: 200, z: -650, w: 90, d: 80, h: 30 },
  { x: -600, z: -100, w: 60, d: 80, h: 25 },
  { x: -600, z: 200, w: 60, d: 80, h: 30 },
];

export function inOcean(x, z) {
  return x < OCEAN_WEST || z > OCEAN_SOUTH;
}

export function onRoad(x, z) {
  for (const a of AVENUES) {
    if (Math.abs(x - a) <= ROAD_HALF) return true;
  }
  for (const s of STREETS) {
    if (Math.abs(z - s) <= ROAD_HALF) return true;
  }
  return false;
}

export function nearestRoadPoint(x, z) {
  let bestA = AVENUES[0];
  for (const a of AVENUES) {
    if (Math.abs(x - a) < Math.abs(x - bestA)) bestA = a;
  }
  let bestS = STREETS[0];
  for (const s of STREETS) {
    if (Math.abs(z - s) < Math.abs(z - bestS)) bestS = s;
  }
  if (Math.abs(x - bestA) <= Math.abs(z - bestS)) return { x: bestA, z };
  return { x, z: bestS };
}

export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    const a = AVENUES[Math.floor(rng() * AVENUES.length)];
    return { x: a, z: Math.round(range(rng, -700, 700)) };
  }
  const s = STREETS[Math.floor(rng() * STREETS.length)];
  return { x: Math.round(range(rng, -700, 700)), z: s };
}

export function inBuilding(x, z) {
  for (const b of BUILDINGS) {
    if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && z >= b.z - b.d / 2 && z <= b.z + b.d / 2) return true;
  }
  return false;
}

export function buildingCenters() {
  return BUILDINGS.map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d, h: b.h }));
}

export function landmarks() {
  return {
    shop: { x: SHOP.x, z: SHOP.z },
    crane: { x: CRANE.x, z: CRANE.z },
    boat: { x: BOAT.x, z: BOAT.z },
    pierDeck: { x0: PIER_DECK.x0, x1: PIER_DECK.x1, z0: PIER_DECK.z0, z1: PIER_DECK.z1 },
    garage: { x: GARAGE_POS.x, z: GARAGE_POS.z },
  };
}

export function spawnPoints() {
  return {
    player: { x: -280, z: -280 },
    portYard: { x: 500, z: 560 },
    pierStalls: { x: -700, z: 430 },
    shop: { x: SHOP.x, z: SHOP.z },
    marina: { x: 100, z: 100 },
  };
}

export function makeRoadRng(seed) {
  return makeRng(seed);
}
