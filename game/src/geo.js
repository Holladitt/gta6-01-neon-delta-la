// Map geometry: road grid, ocean, buildings, landmarks. Pure.
import { BOAT, CRANE, SHOP, PIER_DECK, GARAGE_POS, districtAt } from './config.js';
import { makeRng } from './rng.js';

export const AVENUES = [-560, -320, -80, 160, 400, 640];
export const STREETS = [-560, -320, -80, 160, 400, 640];
const HALF = 12;

export function onRoad(x, z) {
  if (x < -780 || x > 780 || z < -780 || z > 780) return false;
  for (const ax of AVENUES) if (Math.abs(x - ax) <= HALF) return true;
  for (const sz of STREETS) if (Math.abs(z - sz) <= HALF) return true;
  return false;
}
export function nearestRoadPoint(x, z) {
  let best = { x, z };
  let bestD = Infinity;
  for (const ax of AVENUES) {
    const d = Math.abs(x - ax);
    if (d < bestD) { bestD = d; best = { x: ax, z }; }
  }
  for (const sz of STREETS) {
    const d = Math.abs(z - sz);
    if (d < bestD) { bestD = d; best = { x, z: sz }; }
  }
  return best;
}
export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    const ax = AVENUES[Math.floor(rng() * AVENUES.length)];
    return { x: ax, z: -780 + rng() * 1560 };
  }
  const sz = STREETS[Math.floor(rng() * STREETS.length)];
  return { x: -780 + rng() * 1560, z: sz };
}
// The sea is west of the pier and south of the marina; the pier deck
// (x -780..-620, z 360..500) is land over water, and the port keeps a
// dock strip (x >= 600, z <= 660) dry for the yard.
export function inOcean(x, z) {
  if (z > 620 && x < 600) return true;
  if (z > 660 && x >= 600) return true;
  if (x < -620 && (z < 360 || z > 500)) return true;
  return false;
}

// --- Buildings: one per city block, kept off the avenues, the shop
// forecourt, the shot-1 corridor and the port yard. ---
const BLOCKS = [-440, -200, 40, 280, 520];
const PROTECTED = [
  { x0: 360, z0: 500, x1: 660, z1: 640 },    // port yard
  { x0: -420, z0: -260, x1: -280, z1: -120 }, // shop forecourt
  { x0: -360, z0: -400, x1: -280, z1: -220 }, // shot-1 corridor
];
function rectsOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}
let BUILDINGS = null;
export function buildings() {
  if (BUILDINGS) return BUILDINGS;
  const rng = makeRng(1337);
  const list = [];
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      const w = 60 + rng() * 30;
      const d = 50 + rng() * 30;
      const ox = (rng() - 0.5) * 20;
      const oz = (rng() - 0.5) * 20;
      const rect = { x0: bx + ox - w / 2, z0: bz + oz - d / 2, x1: bx + ox + w / 2, z1: bz + oz + d / 2 };
      if (PROTECTED.some((p) => rectsOverlap(rect, p))) continue;
      const tall = (bx < -40 && bz < -140) || (bx >= -40 && bz < -140);
      const h = tall ? 30 + rng() * 60 : 12 + rng() * 30;
      const hue = rng();
      list.push({ x: bx + ox, z: bz + oz, w, d, h, hue, district: districtAt(bx, bz).id });
    }
  }
  BUILDINGS = list;
  return list;
}
export function buildingCenters() {
  return buildings().map((b) => ({ x: b.x, z: b.z }));
}
export function inBuilding(x, z) {
  for (const b of buildings()) {
    if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && z >= b.z - b.d / 2 && z <= b.z + b.d / 2) return true;
  }
  return false;
}
export function landmarks() {
  return {
    shop: { id: 'shop', name: 'DELTA ARMS', x: SHOP.x, z: SHOP.z },
    crane: { id: 'crane', name: 'Port Crane', x: CRANE.x, z: CRANE.z },
    boat: { id: 'boat', name: 'Drivable Boat', x: BOAT.x, z: BOAT.z },
    pierDeck: { id: 'pierDeck', name: 'Coral Pier Deck', x0: PIER_DECK.x0, x1: PIER_DECK.x1, z0: PIER_DECK.z0, z1: PIER_DECK.z1 },
    garage: { id: 'garage', name: 'Garage', x: GARAGE_POS.x, z: GARAGE_POS.z },
  };
}
export function spawnPoints() {
  return {
    player: { id: 'player', x: -320, z: -261 },
    portYard: { id: 'portYard', x: 470, z: 560 },
    pierStalls: { id: 'pierStalls', x: -700, z: 430 },
  };
}
