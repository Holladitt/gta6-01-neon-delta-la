// Traffic and pedestrians: 22 cars (16 day, 6 night) and 104
// pedestrians. Cars drive along the road grid; pedestrians walk
// the sidewalks. Cars and pedestrians far from the player respawn
// near the player, so every frame stays dense. Pure positions —
// the scene draws them, the sim checks them.
import { PED_COUNT, TRAFFIC_DAY, TRAFFIC_NIGHT } from './config.js';
import { makeRng, range, pick } from './rng.js';
import { randomRoadPoint, nearestRoadPoint } from './geo.js';
import { pedArchetype } from './characters.js';
import { spawnTrafficCar } from './vehicles.js';

export function createTraffic(seed) {
  const rng = makeRng(seed || 90210);
  const cars = [];
  for (let i = 0; i < TRAFFIC_DAY; i += 1) cars.push(spawnTrafficCar(rng, false));
  for (let i = 0; i < TRAFFIC_NIGHT; i += 1) cars.push(spawnTrafficCar(rng, true));
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const p = randomRoadPoint(rng);
    const arch = pedArchetype(i);
    peds.push({
      x: p.x + range(rng, -14, 14), z: p.z + range(rng, -14, 14),
      angle: range(rng, 0, Math.PI * 2), speed: arch.speed,
      shirt: arch.shirt, pants: arch.pants, skin: arch.skin,
      walk: range(rng, 0, Math.PI * 2), fleeing: false,
    });
  }
  return { cars, peds, rng };
}

export function trafficCounts(t) {
  return { cars: t.cars.length, peds: t.peds.length };
}

// Cars follow their road line; at an intersection they may turn.
// Pedestrians wander on sidewalks. Far ones respawn near the player.
export function updateTraffic(t, dt, px, pz) {
  for (const c of t.cars) {
    const vertical = Math.abs(Math.sin(c.angle)) < 0.5;
    if (vertical) c.z += Math.cos(c.angle) * c.speed * dt;
    else c.x += Math.sin(c.angle) * c.speed * dt;
    if (c.x < -780 || c.x > 640 || c.z < -640 || c.z > 640) {
      const p = nearestRoadPoint(px + range(t.rng, -160, 160), pz + range(t.rng, -160, 160));
      c.x = p.x; c.z = p.z;
    }
    const dx = c.x - px; const dz = c.z - pz;
    if (dx * dx + dz * dz > 420 * 420) {
      const p = randomRoadPoint(t.rng);
      c.x = px + (p.x - px) * 0.2 + range(t.rng, -80, 80);
      c.z = pz + (p.z - pz) * 0.2 + range(t.rng, -80, 80);
    }
  }
  for (const p of t.peds) {
    p.walk += dt;
    const dir = p.fleeing ? p.angle + Math.PI : p.angle;
    p.x += Math.sin(dir) * p.speed * dt * (p.fleeing ? 2.2 : 1);
    p.z += Math.cos(dir) * p.speed * dt * (p.fleeing ? 2.2 : 1);
    if (t.rng() < dt * 0.05) p.angle = range(t.rng, 0, Math.PI * 2);
    if (p.x < -780 || p.x > 640 || p.z < -640 || p.z > 640) {
      p.x = px + range(t.rng, -120, 120);
      p.z = pz + range(t.rng, -120, 120);
    }
    const dx = p.x - px; const dz = p.z - pz;
    if (dx * dx + dz * dz > 380 * 380) {
      p.x = px + range(t.rng, -140, 140);
      p.z = pz + range(t.rng, -140, 140);
      p.fleeing = false;
    }
  }
  return t;
}

export function pedsNear(t, x, z, radius) {
  const out = [];
  for (const p of t.peds) {
    const dx = p.x - x; const dz = p.z - z;
    if (dx * dx + dz * dz <= radius * radius) out.push(p);
  }
  return out;
}

export function carsNear(t, x, z, radius) {
  const out = [];
  for (const c of t.cars) {
    const dx = c.x - x; const dz = c.z - z;
    if (dx * dx + dz * dz <= radius * radius) out.push(c);
  }
  return out;
}
