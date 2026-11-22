// NDPD pursuit: patrol cars, the AIR-1 heli, roadblocks, SWAT. Pure.
import { policeCarCount, heliActive, roadblockCount, swatActive } from './wanted.js';
import { makeRng } from './rng.js';
export function createPolice() {
  return { cars: [], heli: null, swat: null, roadblocks: [], rng: makeRng(99) };
}
export function updatePolice(p, w, dt, t) {
  const level = w.wanted ? w.wanted.level : 0;
  const want = policeCarCount({ level });
  while (p.cars.length < want) {
    const a = p.rng() * Math.PI * 2;
    const d = 60 + p.rng() * 80;
    p.cars.push({ x: w.car.x + Math.cos(a) * d, z: w.car.z + Math.sin(a) * d, angle: 0, speed: 20, kind: 'police' });
  }
  while (p.cars.length > want) p.cars.pop();
  for (const c of p.cars) {
    const dx = w.car.x - c.x;
    const dz = w.car.z - c.z;
    const d = Math.hypot(dx, dz) || 1;
    c.angle = Math.atan2(dz, dx);
    c.x += (dx / d) * c.speed * dt;
    c.z += (dz / d) * c.speed * dt;
  }
  if (heliActive({ level })) {
    if (!p.heli) p.heli = { x: w.car.x, z: w.car.z - 40, y: 60, angle: 0 };
    p.heli.x += (w.car.x - p.heli.x) * Math.min(1, dt * 2);
    p.heli.z += (w.car.z - p.heli.z) * Math.min(1, dt * 2);
  } else {
    p.heli = null;
  }
  const rb = roadblockCount({ level });
  while (p.roadblocks.length < rb) {
    p.roadblocks.push({ x: w.car.x + (p.roadblocks.length === 0 ? 40 : -40), z: w.car.z - 60, angle: 0 });
  }
  while (p.roadblocks.length > rb) p.roadblocks.pop();
  if (swatActive({ level })) {
    if (!p.swat) p.swat = { x: w.car.x + 30, z: w.car.z + 30, angle: 0, speed: 22 };
    p.swat.x += (w.car.x - p.swat.x) * Math.min(1, dt);
    p.swat.z += (w.car.z - p.swat.z) * Math.min(1, dt);
  } else {
    p.swat = null;
  }
  return p;
}
export function beamOnCar(p, w) {
  if (!p.heli) return false;
  return Math.hypot(p.heli.x - w.car.x, p.heli.z - w.car.z) < 60;
}
