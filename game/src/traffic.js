// traffic.js — 22 cars and 104 peds, seeded, moving on roads and decks.
import { PED_COUNT, TRAFFIC_TOTAL, PIER_DECK } from './config.js';
import { makeRng, range, dist2 } from './rng.js';
import { randomRoadPoint, inBuilding, inOcean, onRoad, nearestRoadPoint } from './geo.js';
import { pedArchetype } from './characters.js';

function spawnCar(rng, night) {
  const p = randomRoadPoint(rng);
  const onAvenue = Math.abs(p.x - Math.round(p.x)) < 1 && [ -560, -320, -80, 160, 400 ].includes(p.x);
  return {
    x: p.x, z: p.z,
    dir: onAvenue ? (rng() < 0.5 ? 1 : -1) : 0,
    dirZ: onAvenue ? 0 : (rng() < 0.5 ? 1 : -1),
    speed: range(rng, 6, 14),
    color: [0x95a5a6, 0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c][Math.floor(rng() * 6)],
    night: !!night,
  };
}
export function spawnTraffic(rng, n, night) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(spawnCar(rng, night));
  return out;
}
function spawnPed(rng, i) {
  const onDeck = i % 5 === 0;
  let x;
  let z;
  if (onDeck) {
    x = range(rng, PIER_DECK.x0 + 8, PIER_DECK.x1 - 8);
    z = range(rng, PIER_DECK.z0 + 8, PIER_DECK.z1 - 8);
  } else {
    const p = randomRoadPoint(rng);
    x = p.x + range(rng, -14, 14);
    z = p.z + range(rng, -14, 14);
    if (inBuilding(x, z) || inOcean(x, z)) {
      const n = nearestRoadPoint(x, z);
      x = n.x + range(rng, -6, 6);
      z = n.z + range(rng, -6, 6);
    }
  }
  const a = pedArchetype(i);
  return {
    x, z, deck: onDeck,
    dx: range(rng, -1, 1), dz: range(rng, -1, 1),
    speed: a.speed, color: a.color, archetype: a.name,
  };
}
export function createTraffic(seed) {
  const rng = makeRng(seed === undefined ? 90210 : seed);
  const night = false;
  const cars = [];
  const dayCount = Math.round(TRAFFIC_TOTAL * 16 / 22);
  for (let i = 0; i < TRAFFIC_TOTAL; i += 1) {
    cars.push(spawnCar(rng, i >= dayCount));
  }
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    peds.push(spawnPed(rng, i));
  }
  return { cars, peds, seed: seed === undefined ? 90210 : seed };
}
export function pedsNear(tr, x, z, r) {
  const out = [];
  for (const p of tr.peds) {
    if (dist2(x, z, p.x, p.z) <= r) out.push(p);
  }
  return out;
}
export function carsNear(tr, x, z, r) {
  const out = [];
  for (const c of tr.cars) {
    if (dist2(x, z, c.x, c.z) <= r) out.push(c);
  }
  return out;
}
export function trafficCounts(tr) {
  return { cars: tr.cars.length, peds: tr.peds.length, total: tr.cars.length + tr.peds.length };
}
export function updateTraffic(tr, dt, cx, cz) {
  for (const c of tr.cars) {
    c.x += c.dir * c.speed * dt;
    c.z += c.dirZ * c.speed * dt;
    if (c.x > 780 || c.x < -780) c.dir *= -1;
    if (c.z > 780 || c.z < -780) c.dirZ *= -1;
    c.x = Math.max(-780, Math.min(780, c.x));
    c.z = Math.max(-780, Math.min(780, c.z));
  }
  for (const p of tr.peds) {
    let nx = p.x + p.dx * p.speed * dt;
    let nz = p.z + p.dz * p.speed * dt;
    if (p.deck) {
      if (nx < PIER_DECK.x0 + 4 || nx > PIER_DECK.x1 - 4) { p.dx *= -1; nx = p.x; }
      if (nz < PIER_DECK.z0 + 4 || nz > PIER_DECK.z1 - 4) { p.dz *= -1; nz = p.z; }
    } else if (inBuilding(nx, nz) || inOcean(nx, nz)) {
      p.dx *= -1;
      p.dz *= -1;
      nx = p.x;
      nz = p.z;
    }
    p.x = nx;
    p.z = nz;
  }
  return tr;
}
export { onRoad };
