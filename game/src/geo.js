// Map geometry helpers: the road grid, spawn points, and the
// landmarks the shots and missions stage around. Pure coordinates;
// the scene draws them, the sim checks them.
import { MAP, OCEAN_WEST, OCEAN_SOUTH, SHOP, GARAGE_POS, CRANE, BOAT, PIER_DECK } from './config.js';
import { makeRng, range, intRange } from './rng.js';

export function roadLines() {
  const xs = [];
  const zs = [];
  for (let x = -560; x <= 560; x += 120) xs.push(x);
  for (let z = -560; z <= 560; z += 120) zs.push(z);
  return { xs, zs };
}

export function onRoad(x, z) {
  // Road lines sit at (coord + 700) mod 120 == 20; each road is 22 wide.
  const mx = ((x + 700) % 120 + 120) % 120;
  const mz = ((z + 700) % 120 + 120) % 120;
  return (mx >= 9 && mx <= 31) || (mz >= 9 && mz <= 31);
}

export function nearestRoadPoint(x, z) {
  const rx = Math.round((x + 700) / 120) * 120 - 700 + 12;
  const rz = Math.round((z + 700) / 120) * 120 - 700 + 12;
  const dx = Math.abs(x - rx); const dz = Math.abs(z - rz);
  if (dx < dz) return { x: rx, z };
  return { x, z: rz };
}

export function randomRoadPoint(rng) {
  const lines = roadLines();
  const vertical = rng() < 0.5;
  if (vertical) {
    const x = lines.xs[intRange(rng, 0, lines.xs.length - 1)];
    return { x: x + 6, z: range(rng, -560, 560) };
  }
  const z = lines.zs[intRange(rng, 0, lines.zs.length - 1)];
  return { x: range(rng, -560, 560), z: z + 6 };
}

export function inOcean(x, z) {
  return x < OCEAN_WEST || z > OCEAN_SOUTH;
}

export function clampToMap(x, z) {
  return {
    x: Math.max(MAP.x0, Math.min(MAP.x1, x)),
    z: Math.max(MAP.z0, Math.min(MAP.z1, z)),
  };
}

export function landmarks() {
  return {
    shop: { ...SHOP }, garage: { ...GARAGE_POS }, crane: { ...CRANE },
    boat: { ...BOAT }, pierDeck: { ...PIER_DECK },
  };
}

export function spawnPoints() {
  return {
    player: { x: -260, z: -200 },
    shopFront: { x: -260, z: -232 },
    pierStalls: { x: -700, z: 430 },
    portYard: { x: 420, z: 520 },
    marinaDock: { x: 220, z: 240 },
    hillOverlook: { x: -50, z: -400 },
  };
}

export function seededRoadPoints(seed, n) {
  const rng = makeRng(seed);
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(randomRoadPoint(rng));
  return out;
}


// Building footprints: 70-wide boxes centred on (bx+60, bz+60) for
// grid lines bx, bz in -560..560 step 120, checkerboard-thinned,
// skipping the port yard and the low pier district. The scene draws
// exactly these; the sim checks placements against them.
export function buildingCenters() {
  const out = [];
  for (let bx = -560; bx < 560; bx += 120) {
    for (let bz = -560; bz < 560; bz += 120) {
      const ix = (bx + 560) / 120; const iz = (bz + 560) / 120;
      if ((ix + iz) % 2 === 0) continue;
      if (bx > -80 && bz > 280) continue;
      if (bx < -80 && bz > 280 && bz < 620) continue;
      const h = 18 + ((bx * 7 + bz * 13) % 50 + 50) % 50;
      out.push({ x: bx + 60, z: bz + 60, h });
    }
  }
  return out;
}

export function inBuilding(x, z) {
  for (const b of buildingCenters()) {
    if (Math.abs(x - b.x) <= 35 && Math.abs(z - b.z) <= 35) return true;
  }
  return false;
}
