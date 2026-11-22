// geo.js — roads, ocean, buildings, landmarks, spawn points.
// The map is x,z in [-800,800]. Ground texture maps world -780..780.
import { SHOP, CRANE, BOAT, PIER_DECK } from './config.js';
import { makeRng, range } from './rng.js';

export const ROAD_X = [-560, -320, -80, 160, 400];
export const ROAD_Z = [-560, -320, -80, 160, 400];
export const ROAD_HALF = 12;

export function onRoad(x, z) {
  for (const ax of ROAD_X) {
    if (Math.abs(x - ax) <= ROAD_HALF) return true;
  }
  for (const sz of ROAD_Z) {
    if (Math.abs(z - sz) <= ROAD_HALF) return true;
  }
  return false;
}
function nearestLine(v, lines) {
  let best = lines[0];
  let bd = Math.abs(v - best);
  for (const l of lines) {
    const d = Math.abs(v - l);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}
export function nearestRoadPoint(x, z) {
  const ax = nearestLine(x, ROAD_X);
  const sz = nearestLine(z, ROAD_Z);
  if (Math.abs(x - ax) <= Math.abs(z - sz)) {
    return { x: ax, z: Math.max(-780, Math.min(780, z)) };
  }
  return { x: Math.max(-780, Math.min(780, x)), z: sz };
}
export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    const ax = ROAD_X[Math.floor(rng() * ROAD_X.length)];
    return { x: ax, z: range(rng, -700, 700) };
  }
  const sz = ROAD_Z[Math.floor(rng() * ROAD_Z.length)];
  return { x: range(rng, -700, 700), z: sz };
}

export function inOcean(x, z) {
  const onDeck = x >= PIER_DECK.x0 && x <= PIER_DECK.x1 && z >= PIER_DECK.z0 && z <= PIER_DECK.z1;
  if (x <= -700 && !onDeck) return true;
  if (z > 640) return true;
  if (z > 620 && x < 600) return true;
  return false;
}

// 28 buildings, each at least 15 units clear of every road centreline and
// clear of every pinned staging point, mission point and landmark.
export const BUILDINGS = [
  { x0: -480, z0: -580, x1: -360, z1: -440 },
  { x0: -260, z0: -540, x1: -120, z1: -400 },
  { x0: 20, z0: -540, x1: 180, z1: -400 },
  { x0: 220, z0: -540, x1: 380, z1: -400 },
  { x0: -480, z0: -300, x1: -400, z1: -180 },
  { x0: -250, z0: -300, x1: -120, z1: -180 },
  { x0: 20, z0: -300, x1: 180, z1: -180 },
  { x0: 220, z0: -300, x1: 380, z1: -180 },
  { x0: -480, z0: -60, x1: -360, z1: 40 },
  { x0: -540, z0: 40, x1: -380, z1: 140 },
  { x0: -260, z0: -140, x1: -120, z1: -20 },
  { x0: -260, z0: 40, x1: -120, z1: 140 },
  { x0: 20, z0: -140, x1: 180, z1: -20 },
  { x0: 20, z0: 40, x1: 180, z1: 140 },
  { x0: 220, z0: -60, x1: 380, z1: 40 },
  { x0: 220, z0: 40, x1: 380, z1: 140 },
  { x0: -540, z0: 280, x1: -380, z1: 380 },
  { x0: -260, z0: 280, x1: -120, z1: 380 },
  { x0: 20, z0: 280, x1: 180, z1: 380 },
  { x0: 220, z0: 280, x1: 380, z1: 380 },
  { x0: 420, z0: 260, x1: 560, z1: 380 },
  { x0: 420, z0: 420, x1: 500, z1: 520 },
  { x0: 580, z0: 420, x1: 720, z1: 520 },
  { x0: 640, z0: 560, x1: 760, z1: 660 },
  { x0: 580, z0: 260, x1: 720, z1: 380 },
  { x0: 20, z0: 180, x1: 180, z1: 260 },
  { x0: -540, z0: 420, x1: -380, z1: 500 },
  { x0: -260, z0: 420, x1: -120, z1: 500 },
  { x0: -376, z0: -235, x1: -332, z1: -205 },
];
// The shop building: DELTA ARMS, front door faces south (z -200).
export function inBuilding(x, z) {
  for (const b of BUILDINGS) {
    if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true;
  }
  return false;
}
export function buildingCenters() {
  return BUILDINGS.map((b) => ({
    x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1,
    cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2,
  }));
}
export function landmarks() {
  return { shop: SHOP, crane: CRANE, boat: BOAT, pierDeck: PIER_DECK };
}
export function spawnPoints() {
  return {
    player: { x: -320, z: -260 },
    portYard: { x: 500, z: 560 },
    pierStalls: { x: -700, z: 430 },
  };
}
export function makeWorldRng() {
  return makeRng(90210);
}
