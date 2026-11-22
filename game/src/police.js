// NDPD units: cars scale with wanted level, heli at 3, roadblocks at 4, SWAT at 5.
import { heliActive, roadblockCount, swatActive, policeCarCount } from './wanted.js';

export function createPolice() { return { cars: [], heli: null, swat: null, roadblocks: [] }; }
export function updatePolice(p, w, dt, now) {
  const want = policeCarCount(w.wanted);
  while (p.cars.length < want) {
    const i = p.cars.length;
    p.cars.push({ x: w.car.x + 30 + i * 18, z: w.car.z - 40 - i * 6, angle: 0, speed: 0 });
  }
  while (p.cars.length > want) p.cars.pop();
  if (heliActive(w.wanted)) {
    if (!p.heli) p.heli = { x: w.car.x + 20, z: w.car.z - 30, y: 40 };
    p.heli.x = w.car.x + 20; p.heli.z = w.car.z - 30;
  } else p.heli = null;
  if (swatActive(w.wanted)) {
    if (!p.swat) p.swat = { x: w.car.x + 60, z: w.car.z + 20 };
  } else p.swat = null;
  const rb = roadblockCount(w.wanted);
  while (p.roadblocks.length < rb) p.roadblocks.push({ x: w.car.x, z: w.car.z - 60 });
  while (p.roadblocks.length > rb) p.roadblocks.pop();
  return p;
}
export function beamOnCar(p, w) {
  if (!p.heli) return false;
  return Math.hypot(p.heli.x - w.car.x, p.heli.z - w.car.z) < 80;
}
