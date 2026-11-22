// City geometry: road grid, ocean, building footprints, landmarks.
import { BUILDINGS, SHOP, CRANE, BOAT, PIER_DECK, GARAGE_POS } from './config.js';

export const AVENUES = [-560, -280, 0, 280, 560];
export const STREETS = [-560, -280, 0, 280, 560];
const ROAD_HALF = 7;

export function onRoad(x, z) {
  for (const a of AVENUES) if (Math.abs(x - a) <= ROAD_HALF) return true;
  for (const s of STREETS) if (Math.abs(z - s) <= ROAD_HALF) return true;
  return false;
}
export function nearestRoadPoint(x, z) {
  let best = null, bd = Infinity;
  for (const a of AVENUES) {
    const d = Math.abs(x - a);
    if (d < bd) { bd = d; best = { x: a, z }; }
  }
  for (const s of STREETS) {
    const d = Math.abs(z - s);
    if (d < bd) { bd = d; best = { x, z: s }; }
  }
  return best;
}
export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    const a = AVENUES[Math.floor(rng() * AVENUES.length)];
    return { x: a, z: -700 + rng() * 1400 };
  }
  const s = STREETS[Math.floor(rng() * STREETS.length)];
  return { x: -700 + rng() * 1400, z: s };
}
export function inOcean(x, z) { return x < -620 || z > 637; }
export function inBuilding(x, z) {
  for (const b of BUILDINGS) if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1) return true;
  return false;
}
export function landmarks() { return { shop: SHOP, crane: CRANE, boat: BOAT, pierDeck: PIER_DECK }; }
export function spawnPoints() { return { player: { x: 0, z: 0 }, portYard: { x: 520, z: 580 }, pierStalls: { x: -700, z: 430 } }; }
export function buildingCenters() { return BUILDINGS.map((b) => ({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, h: b.h })); }
