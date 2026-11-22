// City geography: the road grid, the water on the east, the pier, the port,
// the building footprints, and the places the missions point at.

import { DISTRICTS, MISSIONS } from './config.js';
import { makeRng } from './rng.js';

export const MAP_HALF = 700;
export const ROAD_SPACING = 80;
export const ROAD_HALF = 6;
export const SHORE_X = 540;

export const SHOP_POS = { x: 140, z: 180 };
export const PIER_DECK = { x0: 540, x1: 690, z0: 400, z1: 444 };
export const PORT_RECT = { x0: 540, x1: 690, z0: 170, z1: 340 };
export const MARINA_POS = { x: 600, z: 480 };
export const SPAWN_POS = { x: 0, z: 0 };
export const HILLS_POS = { x: -50, z: -400 };

export function isOnPier(x, z) {
  return x >= PIER_DECK.x0 && x <= PIER_DECK.x1 && z >= PIER_DECK.z0 && z <= PIER_DECK.z1;
}

export function isInPort(x, z) {
  return x >= PORT_RECT.x0 && x <= PORT_RECT.x1 && z >= PORT_RECT.z0 && z <= PORT_RECT.z1;
}

export function isWater(x, z) {
  if (x <= SHORE_X) return false;
  if (isOnPier(x, z)) return false;
  if (isInPort(x, z)) return false;
  return true;
}

export function isOnRoad(x, z) {
  const dx = Math.abs(x - Math.round(x / ROAD_SPACING) * ROAD_SPACING);
  const dz = Math.abs(z - Math.round(z / ROAD_SPACING) * ROAD_SPACING);
  return dx <= ROAD_HALF || dz <= ROAD_HALF;
}

// All the points the missions and the key places point at, so no building
// ever lands on one of them.
function protectedPoints() {
  const pts = [
    [SHOP_POS.x, SHOP_POS.z],
    [SPAWN_POS.x, SPAWN_POS.z],
    [HILLS_POS.x, HILLS_POS.z],
    [530, 500],
    [520, 410],
    [500, 400],
    [480, 390],
    [300, 200],
  ];
  for (const m of MISSIONS) {
    for (const s of m.steps) {
      if (s.x != null) pts.push([s.x, s.z]);
      if (s.points) for (const p of s.points) pts.push(p);
    }
  }
  return pts;
}

function buildBuildings() {
  const rng = makeRng(20261122);
  const keep = protectedPoints();
  const list = [];
  for (let i = -8; i <= 7; i++) {
    for (let j = -8; j <= 7; j++) {
      const cx = i * ROAD_SPACING + ROAD_SPACING / 2;
      const cz = j * ROAD_SPACING + ROAD_SPACING / 2;
      if (cx > SHORE_X - 60) continue;
      if (isInPort(cx, cz)) continue;
      if (keep.some(([px, pz]) => Math.hypot(px - cx, pz - cz) < 55)) continue;
      if (!rng.chance(0.72)) continue;
      const w = rng.range(28, 52);
      const d = rng.range(22, 44);
      const h = rng.range(10, 46);
      const hue = rng.pick([0x8a93a6, 0x9a8f7a, 0x7a8a9a, 0xa67c52, 0x6f7f8a, 0xb0a08a]);
      list.push({ x: cx, z: cz, w, d, h, color: hue });
    }
  }
  // The DELTA ARMS shop is a low, wide building with a forecourt.
  list.push({ x: SHOP_POS.x, z: SHOP_POS.z + 18, w: 34, d: 16, h: 9, color: 0x2e4a5a, shop: true });
  return list;
}

export const BUILDINGS = buildBuildings();

export function buildingAt(x, z) {
  for (const b of BUILDINGS) {
    if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return b;
  }
  return null;
}

export function isBlocked(x, z) {
  if (x < -MAP_HALF || x > MAP_HALF || z < -MAP_HALF || z > MAP_HALF) return true;
  if (isWater(x, z)) return true;
  return buildingAt(x, z) != null;
}

export function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bestScore = Infinity;
  for (const d of DISTRICTS) {
    const dist = Math.hypot(x - d.x, z - d.z);
    const score = dist - d.r;
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export function clampToMap(x, z) {
  return {
    x: Math.max(-MAP_HALF, Math.min(MAP_HALF, x)),
    z: Math.max(-MAP_HALF, Math.min(MAP_HALF, z)),
  };
}
