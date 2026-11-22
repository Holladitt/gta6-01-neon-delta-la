// world.js — ground texture, colliders, glow discs (browser).
// The whole city is painted once onto a single 2048 canvas texture;
// buildings and props are 3D on top of it.
import * as THREE from 'three';
import { buildBuildings, buildProps, glowDiscs, roadLines, SEA_Z, PIER, PORT, CANALS, MARINA } from './geo.js';
import { ROAD_SPACING, ROAD_WIDTH, WORLD_HALF } from './config.js';

const TEX = 2048;
const SCALE = TEX / (WORLD_HALF * 2);
const ux = (x) => (x + WORLD_HALF) * SCALE;
const vz = (z) => (z + WORLD_HALF) * SCALE;

export function paintGroundTexture() {
  const c = document.createElement('canvas');
  c.width = TEX;
  c.height = TEX;
  const g = c.getContext('2d');
  // Base city blocks.
  g.fillStyle = '#b5ac9c';
  g.fillRect(0, 0, TEX, TEX);
  // Hills (green-brown).
  g.fillStyle = '#8a9a6a';
  g.fillRect(ux(150), vz(-900), ux(600) - ux(150), vz(-450) - vz(-900));
  // Port concrete.
  g.fillStyle = '#9a9a92';
  g.fillRect(ux(PORT.x0), vz(PORT.z0), ux(PORT.x1) - ux(PORT.x0), vz(PORT.z1) - vz(PORT.z0));
  // Sea (south of the coastal road).
  g.fillStyle = '#2f7fae';
  g.fillRect(0, vz(SEA_Z), TEX, TEX - vz(SEA_Z));
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = vz(SEA_Z) + 20 + i * 14;
    g.beginPath();
    for (let x = 0; x <= TEX; x += 64) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 4);
    g.stroke();
  }
  // Canals.
  g.fillStyle = '#2f7fae';
  g.fillRect(ux(CANALS.x0), vz(CANALS.z0), ux(CANALS.x1) - ux(CANALS.x0), vz(CANALS.z1) - vz(CANALS.z0));
  // Marina basin.
  g.beginPath();
  g.arc(ux(MARINA.x), vz(MARINA.z), MARINA.r * SCALE, 0, Math.PI * 2);
  g.fill();
  // Sidewalks (light band) then asphalt, for every road line.
  const lines = roadLines();
  for (const L of lines) {
    if (L <= 750) {
      // Horizontal road (east-west) at z = L.
      g.fillStyle = '#c9c2b4';
      g.fillRect(0, vz(L) - (ROAD_WIDTH + 10) / 2 * SCALE, TEX, (ROAD_WIDTH + 10) * SCALE);
      g.fillStyle = '#3a3a3d';
      g.fillRect(0, vz(L) - ROAD_WIDTH / 2 * SCALE, TEX, ROAD_WIDTH * SCALE);
    }
    // Vertical road (north-south) at x = L, down to the coastal road.
    g.fillStyle = '#c9c2b4';
    g.fillRect(ux(L) - (ROAD_WIDTH + 10) / 2 * SCALE, 0, (ROAD_WIDTH + 10) * SCALE, vz(750) + (ROAD_WIDTH + 10) / 2 * SCALE);
    g.fillStyle = '#3a3a3d';
    g.fillRect(ux(L) - ROAD_WIDTH / 2 * SCALE, 0, ROAD_WIDTH * SCALE, vz(750) + ROAD_WIDTH / 2 * SCALE);
  }
  // Lane dashes.
  g.fillStyle = '#e8c33c';
  for (const L of lines) {
    if (L <= 750) {
      for (let x = -WORLD_HALF; x < WORLD_HALF; x += 30) {
        g.fillRect(ux(x), vz(L) - 1, 14 * SCALE, 2);
      }
    }
    for (let z = -WORLD_HALF; z < 750; z += 30) {
      g.fillRect(ux(L) - 1, vz(z), 2, 14 * SCALE);
    }
  }
  // Crosswalks at intersections.
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (const ix of lines) {
    for (const iz of lines) {
      if (iz > 750) continue;
      for (let k = -2; k <= 2; k++) {
        g.fillRect(ux(ix) + k * 5 * SCALE - 2, vz(iz) - ROAD_WIDTH / 2 * SCALE, 3, ROAD_WIDTH * SCALE);
      }
    }
  }
  // Pier deck (wood).
  g.fillStyle = '#8a6a45';
  g.fillRect(ux(PIER.x0), vz(PIER.z0), ux(PIER.x1) - ux(PIER.x0), vz(PIER.z1) - vz(PIER.z0));
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let z = PIER.z0; z < PIER.z1; z += 12) {
    g.beginPath();
    g.moveTo(ux(PIER.x0), vz(z));
    g.lineTo(ux(PIER.x1), vz(z));
    g.stroke();
  }
  // Port container rows (colour blocks).
  const contCols = ['#c0392b', '#2e86c1', '#e67e22', '#7d3c98', '#1abc9c'];
  let ci = 0;
  for (let i = 0; i < 10; i++) {
    const cx = 640 + (i % 5) * 46, cz = 340 + Math.floor(i / 5) * 40;
    g.fillStyle = contCols[ci++ % contCols.length];
    g.fillRect(ux(cx - 18), vz(cz - 8), 36 * SCALE, 16 * SCALE);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Axis-aligned colliders for the player car: buildings + solid props.
export function buildColliders() {
  const out = [];
  for (const b of buildBuildings()) {
    out.push({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2 });
  }
  const solid = new Set(['crate', 'container', 'stall', 'planter', 'lamp', 'pallet', 'forklift', 'bikerack', 'newsbox', 'bin', 'hedge', 'bench']);
  for (const p of buildProps()) {
    if (!solid.has(p.type)) continue;
    const r = p.type === 'container' ? 9 : p.type === 'stall' ? 4 : 1.6;
    out.push({ x0: p.x - r, x1: p.x + r, z0: p.z - r, z1: p.z + r });
  }
  // The shop building itself.
  out.push({ x0: 78, x1: 102, z0: 145, z1: 159 });
  return out;
}

export function getGlowDiscs() {
  return glowDiscs();
}
