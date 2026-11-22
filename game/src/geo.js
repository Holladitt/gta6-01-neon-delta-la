// geo.js — city layout data for Neon Delta LA (pure, no THREE, no DOM).
// The city is a 150-unit road grid over x,z in [-900, 900]. The sea lies
// south of z = 760; the Coral Pier reaches into it. All positions the
// game stages (shop, pier, port, marina, overlook) are defined here so
// the scene, the missions and the shots all agree on them.
import { RNG } from './rng.js';
import { ROAD_SPACING, WORLD_HALF } from './config.js';

export const SEA_Z = 760; // water south of this line
export const PIER = { x0: -45, x1: 45, z0: 700, z1: 880 };
export const SHOP = { x: 90, z: 152, face: Math.PI }; // DELTA ARMS storefront
export const PORT = { x0: 600, z0: 300, x1: 900, z1: 750 };
export const CRANE = { x: 760, z: 520 };
export const MARINA = { x: -720, z: -520, r: 90 };
export const OVERLOOK = { x: 300, z: -680 };
export const CANALS = { x0: -720, z0: 220, x1: -480, z1: 420 };

// Road lines (multiples of 150). The southernmost road is the coastal road.
export function roadLines() {
  const lines = [];
  for (let v = -WORLD_HALF; v <= WORLD_HALF; v += ROAD_SPACING) lines.push(v);
  return lines;
}

// Intersections of the road grid (drivable, z <= 750 keeps cars off the sea).
export function roadNodes() {
  const nodes = [];
  for (let x = -WORLD_HALF; x <= WORLD_HALF; x += ROAD_SPACING) {
    for (let z = -WORLD_HALF; z <= 750; z += ROAD_SPACING) {
      nodes.push([x, z]);
    }
  }
  return nodes;
}

export function nearestNode(x, z) {
  const nx = Math.round(x / ROAD_SPACING) * ROAD_SPACING;
  const nz = Math.round(z / ROAD_SPACING) * ROAD_SPACING;
  return [Math.max(-WORLD_HALF, Math.min(WORLD_HALF, nx)), Math.max(-WORLD_HALF, Math.min(750, nz))];
}

// ---- Buildings (procedural, seeded, deterministic) ----
// A block is the square between four roads. Special areas stay clear.
function inSpecial(x, z) {
  if (z >= 690) return true; // pier / beach
  if (x >= PORT.x0 && z >= PORT.z0) return true; // port yard
  if (x >= CANALS.x0 && x <= CANALS.x1 && z >= CANALS.z0 && z <= CANALS.z1) return true; // canals
  const dx = x - MARINA.x, dz = z - MARINA.z;
  if (dx * dx + dz * dz < (MARINA.r + 40) * (MARINA.r + 40)) return true; // marina basin
  if (Math.abs(x - SHOP.x) < 90 && Math.abs(z - SHOP.z) < 90) return true; // shop block
  return false;
}

export function buildBuildings() {
  const rng = new RNG(1337);
  const list = [];
  const palette = [0x8a7f70, 0x7d8a99, 0xa89a80, 0x6f7d6a, 0x9c8a7a, 0x7a6f8a, 0xb0a08a, 0x5f7080];
  for (let bx = -WORLD_HALF; bx < WORLD_HALF; bx += ROAD_SPACING) {
    for (let bz = -WORLD_HALF; bz < 750; bz += ROAD_SPACING) {
      const cx = bx + ROAD_SPACING / 2;
      const cz = bz + ROAD_SPACING / 2;
      if (inSpecial(cx, cz)) continue;
      const downtown = Math.abs(cx) < 300 && Math.abs(cz) < 300;
      const n = downtown ? rng.int(2, 4) : rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const w = rng.range(22, 46);
        const d = rng.range(22, 46);
        const x = cx + rng.range(-42, 42);
        const z = cz + rng.range(-42, 42);
        if (inSpecial(x, z)) continue;
        const h = downtown ? rng.range(24, 68) : rng.range(9, 26);
        list.push({ x, z, w, d, h, color: palette[rng.int(0, palette.length - 1)] });
      }
    }
  }
  return list;
}

// ---- Hand-placed props (v16: dense, lived-in scenes) ----
export function buildProps() {
  const rng = new RNG(4242);
  const props = [];
  const add = (type, x, z, rot = 0, s = 1) => props.push({ type, x, z, rot, s });

  // Shop forecourt (DELTA ARMS at 90,152; forecourt to its south).
  add('planter', 62, 132); add('planter', 118, 132);
  add('tree', 66, 135); add('tree', 114, 128);
  add('crate', 70, 120); add('crate', 74, 120); add('crate', 72, 117);
  add('crate', 108, 118); add('barrel', 112, 118); add('barrel', 112, 122);
  add('bikerack', 84, 124); add('bike', 82, 124); add('bike', 86, 124);
  add('newsbox', 96, 126); add('bin', 104, 126);
  add('board', 78, 140, 0.4); // OPEN sandwich board
  add('hedge', 64, 142); add('hedge', 70, 142); add('hedge', 76, 142);
  add('flower', 64, 144); add('flower', 76, 144);

  // Street props along the avenue (parked cars on the edge, lawn props).
  for (let i = 0; i < 8; i++) {
    const x = -300 + i * 85 + rng.range(-8, 8);
    add('parked', x, -8, 0, rng.pick([0.9, 1, 1.1]));
  }
  add('tree', -40, 60); add('tree', 150, -60); add('tree', -160, 120);
  add('bench', -30, 48); add('bench', 170, -40);
  add('hydrant', 30, 52); add('bin', -90, -48);

  // Pier: lamp posts, stalls, boats, glow pools.
  for (let z = 720; z <= 860; z += 28) {
    add('lamp', -38, z); add('lamp', 38, z);
  }
  add('stall', -25, 800, 0, 1); // BALLOONS
  add('stall', 0, 820, 0, 1); // ARCADE
  add('stall', 25, 800, 0, 1); // SNO-CONES
  add('stall', -25, 845, 0, 1);
  add('stall', 25, 845, 0, 1);
  add('boat', -90, 800, 0.3); add('boat', 90, 830, -0.4); add('boat', 120, 790, 0.1);
  add('glowpool', -20, 780); add('glowpool', 20, 800); add('glowpool', 0, 840);
  add('glowpool', -30, 830); add('glowpool', 30, 760);

  // Port yard: containers, lamps, puddles, forklift, pallet stack.
  for (let i = 0; i < 10; i++) {
    add('container', 640 + (i % 5) * 46, 340 + Math.floor(i / 5) * 40, rng.chance(0.5) ? 0 : Math.PI / 2);
  }
  add('container', 700, 620, 0.2); add('container', 740, 630, -0.15);
  add('container', 820, 420, Math.PI / 2); add('container', 820, 460, Math.PI / 2);
  add('lamp', 660, 380); add('lamp', 780, 420); add('lamp', 860, 560);
  add('puddle', 700, 500); add('puddle', 780, 560); add('puddle', 660, 620);
  add('forklift', 720, 580, 0.6); add('pallet', 730, 590); add('pallet', 734, 590);
  add('crate', 690, 560); add('crate', 694, 560); add('barrel', 800, 600);

  // Marina quay: boats, crates, lamps.
  add('boat', -700, -500, 0.5); add('boat', -760, -560, -0.3);
  add('crate', -660, -440); add('lamp', -640, -470); add('lamp', -680, -430);

  // Hills overlook: a couple of trees and a viewpoint bench.
  add('tree', 280, -660); add('tree', 330, -700); add('bench', 300, -672);
  return props;
}

// Parked cars the player can steal (kind + spot).
export function buildParkedCars() {
  const rng = new RNG(777);
  const kinds = ['sedan', 'sports', 'van', 'taxi', 'sedan', 'sports'];
  const spots = [
    [60, -12], [-120, 138], [240, -138], [-240, 12], [420, 138], [-420, -12],
    [120, 288], [-60, -288], [660, 288], [-660, -138], [300, 438], [-300, 438],
  ];
  return spots.map(([x, z], i) => ({
    x, z, kind: kinds[i % kinds.length],
    color: [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x1abc9c, 0xe67e22][i % 6],
    heading: rng.chance(0.5) ? 0 : Math.PI / 2,
  }));
}

// Warm ground light discs at night (28 of them).
export function glowDiscs() {
  const discs = [];
  // Pier lamps + stall glow.
  for (let z = 720; z <= 860; z += 28) {
    discs.push([-38, z]); discs.push([38, z]);
  }
  discs.push([-25, 800]); discs.push([0, 820]); discs.push([25, 800]);
  discs.push([-25, 845]); discs.push([25, 845]);
  discs.push([-20, 780]); discs.push([20, 800]); discs.push([0, 840]);
  discs.push([-30, 830]); discs.push([30, 760]);
  // Port yard.
  discs.push([660, 380]); discs.push([780, 420]); discs.push([860, 560]);
  discs.push([700, 500]); discs.push([780, 560]); discs.push([660, 620]);
  // Street lamps near the shop + avenue.
  discs.push([62, 132]); discs.push([118, 132]); discs.push([0, 0]);
  return discs.slice(0, 28);
}
