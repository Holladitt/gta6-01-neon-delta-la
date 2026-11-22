// Ambient city life: 104 peds, 22 cars, seeded and deterministic.
import { makeRng, pick } from './rng.js';
import { PED_COUNT, TRAFFIC_TOTAL } from './config.js';
import { randomRoadPoint } from './geo.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xf39c12, 0xecf0f1, 0x34495e];
const CAR_COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xbdc3c7, 0x2c3e50];

export function createTraffic(seed) {
  const rng = makeRng(seed);
  const peds = [];
  for (let i = 0; i < PED_COUNT; i++) {
    let x, z;
    const r = rng();
    if (r < 0.15) { x = -780 + rng() * 160; z = 360 + rng() * 140; }
    else if (r < 0.3) { x = 380 + rng() * 280; z = 400 + rng() * 200; }
    else { const p = randomRoadPoint(rng); x = p.x + (rng() - 0.5) * 24; z = p.z + (rng() - 0.5) * 24; }
    peds.push({ x, z, angle: rng() * Math.PI * 2, speed: 1 + rng() * 1.5, shirt: pick(rng, SHIRTS) });
  }
  const cars = [];
  for (let i = 0; i < TRAFFIC_TOTAL; i++) {
    const p = randomRoadPoint(rng);
    cars.push({ x: p.x, z: p.z, angle: rng() * Math.PI * 2, speed: 4 + rng() * 6, color: pick(rng, CAR_COLORS) });
  }
  return { peds, cars, rng };
}
export function trafficCounts(t) { return { cars: t.cars.length, peds: t.peds.length }; }
export function pedsNear(t, x, z, r) { return t.peds.filter((p) => Math.hypot(p.x - x, p.z - z) <= r); }
export function carsNear(t, x, z, r) { return t.cars.filter((c) => Math.hypot(c.x - x, c.z - z) <= r); }
export function spawnTraffic(rng, n, night) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = randomRoadPoint(rng);
    out.push({ x: p.x, z: p.z, angle: rng() * Math.PI * 2, speed: 4 + rng() * 6, color: pick(rng, CAR_COLORS) });
  }
  return out;
}
export function updateTraffic(t, dt, px, pz) {
  for (const p of t.peds) {
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.z += Math.sin(p.angle) * p.speed * dt;
    if (p.x < -790 || p.x > 790 || p.z < -690 || p.z > 760) p.angle += Math.PI;
  }
  for (const c of t.cars) {
    c.x += Math.sin(c.angle) * c.speed * dt;
    c.z += Math.cos(c.angle) * c.speed * dt;
    if (c.x < -770 || c.x > 770 || c.z < -690 || c.z > 750) c.angle += Math.PI;
  }
}
