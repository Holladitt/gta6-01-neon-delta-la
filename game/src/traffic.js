// Street traffic + pedestrians. Pure.
import { PED_COUNT, TRAFFIC_TOTAL, PIER_DECK } from './config.js';
import { makeRng } from './rng.js';
import { onRoad, randomRoadPoint, nearestRoadPoint, inOcean, inBuilding } from './geo.js';

const PED_JOBS = ['commuter', 'tourist', 'dockworker', 'vendor', 'jogger', 'student', 'fisherman', 'shopper'];

export function createTraffic(seed) {
  const rng = makeRng(seed || 1);
  const cars = [];
  for (let i = 0; i < TRAFFIC_TOTAL; i += 1) {
    const p = randomRoadPoint(rng);
    cars.push({ x: p.x, z: p.z, angle: rng() * Math.PI * 2, speed: 6 + rng() * 8, kind: i % 5, color: Math.floor(rng() * 6) });
  }
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    let x;
    let z;
    if (i < 12) {
      x = PIER_DECK.x0 + rng() * (PIER_DECK.x1 - PIER_DECK.x0);
      z = PIER_DECK.z0 + rng() * (PIER_DECK.z1 - PIER_DECK.z0);
    } else {
      const p = randomRoadPoint(rng);
      x = p.x + (rng() - 0.5) * 24;
      z = p.z + (rng() - 0.5) * 24;
      if (inOcean(x, z) || inBuilding(x, z)) { x = p.x; z = p.z; }
    }
    peds.push({ x, z, angle: rng() * Math.PI * 2, speed: 0.8 + rng() * 0.8, archetype: i % 8, job: PED_JOBS[i % PED_JOBS.length] });
  }
  return { cars, peds, rng };
}
export function trafficCounts(t) {
  return { cars: t.cars.length, peds: t.peds.length };
}
function onDeck(p) {
  return p.x >= PIER_DECK.x0 && p.x <= PIER_DECK.x1 && p.z >= PIER_DECK.z0 && p.z <= PIER_DECK.z1;
}
export function updateTraffic(t, dt, px, pz) {
  for (const ped of t.peds) {
    const deck = onDeck(ped);
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.z += Math.sin(ped.angle) * ped.speed * dt;
    if (deck) {
      if (ped.x < PIER_DECK.x0 + 5 || ped.x > PIER_DECK.x1 - 5 || ped.z < PIER_DECK.z0 + 5 || ped.z > PIER_DECK.z1 - 5) {
        ped.angle += Math.PI;
        ped.x = Math.max(PIER_DECK.x0 + 5, Math.min(PIER_DECK.x1 - 5, ped.x));
        ped.z = Math.max(PIER_DECK.z0 + 5, Math.min(PIER_DECK.z1 - 5, ped.z));
      }
    } else if (inOcean(ped.x, ped.z) || inBuilding(ped.x, ped.z)) {
      ped.angle += Math.PI;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.z += Math.sin(ped.angle) * ped.speed * dt;
    }
    if (t.rng && t.rng() < dt * 0.05) ped.angle = t.rng() * Math.PI * 2;
  }
  for (const car of t.cars) {
    const ox = car.x;
    const oz = car.z;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.z += Math.sin(car.angle) * car.speed * dt;
    if (!onRoad(car.x, car.z)) {
      car.x = ox;
      car.z = oz;
      car.angle += Math.PI / 2;
      if (!onRoad(car.x + Math.cos(car.angle) * 2, car.z + Math.sin(car.angle) * 2)) {
        const p = randomRoadPoint(t.rng);
        car.x = p.x;
        car.z = p.z;
        car.angle = t.rng() * Math.PI * 2;
      }
    }
    if (car.x < -780 || car.x > 780 || car.z < -780 || car.z > 780) {
      const p = randomRoadPoint(t.rng);
      car.x = p.x;
      car.z = p.z;
    }
    // At a crossing, sometimes turn onto the other road.
    if (t.rng && t.rng() < dt * 0.15) {
      const ax = Math.abs(car.x - Math.round(car.x / 240) * 240) < 14;
      if (ax) car.angle += (t.rng() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
  }
}
export function pedsNear(t, x, z, radius) {
  return t.peds.filter((p) => Math.hypot(p.x - x, p.z - z) <= radius);
}
export function carsNear(t, x, z, radius) {
  return t.cars.filter((c) => Math.hypot(c.x - x, c.z - z) <= radius);
}
