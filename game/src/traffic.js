// Traffic and pedestrians for Neon Delta LA.
// 22 traffic cars on the roads, 104 pedestrians wandering the
// sidewalks. Pedestrians on the pier deck stay on the deck: they
// wander in small steps and are clamped to the deck bounds, never
// teleported away. No ped is ever respawned near the player.
import { PED_COUNT, TRAFFIC_TOTAL, PIER_DECK } from './config.js';
import { makeRng, range, dist2, clamp } from './rng.js';
import { onRoad, randomRoadPoint, inOcean, inBuilding } from './geo.js';

const PED_SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1, 0x34495e, 0xd35400];

export function spawnTraffic(rng, count, night) {
  const cars = [];
  let guard = 0;
  while (cars.length < count && guard < 500) {
    guard += 1;
    const p = randomRoadPoint(rng);
    if (inOcean(p.x, p.z)) continue;
    cars.push({
      x: p.x,
      z: p.z,
      angle: rng() < 0.5 ? 0 : Math.PI / 2,
      speed: range(rng, 6, 14),
      type: Math.floor(rng() * 5),
      night: !!night,
    });
  }
  return cars;
}

export function createTraffic(seed) {
  const rng = makeRng(seed === undefined ? 90210 : seed);
  const cars = spawnTraffic(rng, TRAFFIC_TOTAL, false);
  const peds = [];
  let guard = 0;
  while (peds.length < PED_COUNT && guard < 4000) {
    guard += 1;
    const x = Math.round(range(rng, -700, 700));
    const z = Math.round(range(rng, -700, 620));
    if (inOcean(x, z)) continue;
    if (inBuilding(x, z)) continue;
    if (onRoad(x, z)) continue;
    peds.push({
      x,
      z,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 0.6, 1.6),
      shirt: PED_SHIRTS[Math.floor(rng() * PED_SHIRTS.length)],
      onDeck: x >= PIER_DECK.x0 && x <= PIER_DECK.x1 && z >= PIER_DECK.z0 && z <= PIER_DECK.z1,
    });
  }
  return { cars, peds, rng };
}

export function trafficCounts(t) {
  return { cars: t.cars.length, peds: t.peds.length };
}

export function updateTraffic(t, dt, px, pz) {
  for (const ped of t.peds) {
    ped.angle += (t.rng() - 0.5) * 1.2 * dt;
    const nx = ped.x + Math.sin(ped.angle) * ped.speed * dt;
    const nz = ped.z + Math.cos(ped.angle) * ped.speed * dt;
    if (ped.onDeck) {
      ped.x = clamp(nx, PIER_DECK.x0 + 4, PIER_DECK.x1 - 4);
      ped.z = clamp(nz, PIER_DECK.z0 + 4, PIER_DECK.z1 - 4);
      continue;
    }
    if (inOcean(nx, nz) || inBuilding(nx, nz) || onRoad(nx, nz)) {
      ped.angle += Math.PI;
      continue;
    }
    ped.x = nx;
    ped.z = nz;
  }
  for (const car of t.cars) {
    car.x += Math.sin(car.angle) * car.speed * dt;
    car.z += Math.cos(car.angle) * car.speed * dt;
    if (car.x < -740 || car.x > 740 || car.z < -740 || car.z > 620) {
      car.angle += Math.PI;
      car.x = clamp(car.x, -740, 740);
      car.z = clamp(car.z, -740, 620);
    }
  }
}

export function pedsNear(t, x, z, radius) {
  const out = [];
  for (const p of t.peds) {
    if (dist2(x, z, p.x, p.z) <= radius) out.push(p);
  }
  return out;
}

export function carsNear(t, x, z, radius) {
  const out = [];
  for (const c of t.cars) {
    if (dist2(x, z, c.x, c.z) <= radius) out.push(c);
  }
  return out;
}
