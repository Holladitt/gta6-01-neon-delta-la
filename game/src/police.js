// NDPD pursuit for Neon Delta LA.
// Two patrol cars at wanted 0, more as the level rises (2 + level x 2,
// capped at 12). The helicopter AIR-1 spawns at wanted 3 and its beam
// tracks the car. Two roadblocks appear at wanted 4, a black SWAT van
// at wanted 5. Dropping to wanted 0 clears the helicopter, the van
// and the roadblocks.
import { policeCarCount, heliActive, roadblockCount, swatActive } from './wanted.js';
import { dist2 } from './rng.js';
import { randomRoadPoint } from './geo.js';
import { makeRng } from './rng.js';

export function createPolice() {
  return { cars: [], heli: null, swat: null, roadblocks: [], rng: makeRng(777) };
}

export function updatePolice(p, world, dt, now) {
  const level = world.wanted.level;
  const target = policeCarCount(world.wanted);
  const car = world.car || { x: 0, z: 0 };
  while (p.cars.length < target) {
    const rp = randomRoadPoint(p.rng);
    p.cars.push({ x: rp.x, z: rp.z, angle: 0, speed: 0, scripted: p.cars.length % 3 === 2 });
  }
  while (p.cars.length > target) p.cars.pop();
  for (const c of p.cars) {
    const d = dist2(c.x, c.z, car.x, car.z);
    if (d > 12) {
      const a = Math.atan2(car.x - c.x, car.z - c.z);
      c.angle = a;
      const sp = Math.min(26, 10 + level * 2);
      c.x += Math.sin(a) * sp * dt;
      c.z += Math.cos(a) * sp * dt;
    }
  }
  if (heliActive(world.wanted)) {
    if (!p.heli) p.heli = { x: car.x, z: car.z, y: 60, angle: 0 };
    p.heli.x = car.x;
    p.heli.z = car.z - 10;
    p.heli.angle += dt * 2;
  } else {
    p.heli = null;
  }
  const rb = roadblockCount(world.wanted);
  if (p.roadblocks.length !== rb) {
    p.roadblocks = [];
    for (let i = 0; i < rb; i += 1) {
      p.roadblocks.push({ x: car.x - 20 + i * 40, z: car.z - 90, angle: 0 });
    }
  }
  if (swatActive(world.wanted)) {
    if (!p.swat) p.swat = { x: car.x + 40, z: car.z + 30, angle: 0, speed: 0 };
    const d = dist2(p.swat.x, p.swat.z, car.x, car.z);
    if (d > 20) {
      const a = Math.atan2(car.x - p.swat.x, car.z - p.swat.z);
      p.swat.x += Math.sin(a) * 18 * dt;
      p.swat.z += Math.cos(a) * 18 * dt;
    }
  } else {
    p.swat = null;
  }
}

export function beamOnCar(p, world) {
  if (!p.heli) return false;
  const car = world.car || { x: 0, z: 0 };
  return dist2(p.heli.x, p.heli.z, car.x, car.z) < 100;
}
