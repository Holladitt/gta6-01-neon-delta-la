// Vehicle definitions: types, colours, and driving stats.
// Traffic cars, the player's car, police cars, the SWAT van and
// the boat all come from this table. Pure data plus spawns.
import { makeRng, pick, range } from './rng.js';
import { randomRoadPoint } from './geo.js';

export const VEHICLE_TYPES = [
  { type: 'sedan', color: 0x2e86c1, topSpeed: 30, accel: 16, length: 4.4 },
  { type: 'taxi', color: 0xf4c20d, topSpeed: 28, accel: 15, length: 4.4 },
  { type: 'truck', color: 0x7f8c8d, topSpeed: 22, accel: 10, length: 6.5 },
  { type: 'sport', color: 0xe74c3c, topSpeed: 38, accel: 22, length: 4.2 },
  { type: 'van', color: 0xecf0f1, topSpeed: 24, accel: 11, length: 5.2 },
];

export const PLAYER_CAR = { type: 'delta-gt', color: 0x1abc9c, topSpeed: 34, accel: 20, length: 4.4 };
export const POLICE_CAR = { type: 'ndpd', color: 0x1a1a2e, topSpeed: 32, accel: 18, length: 4.6 };
export const SWAT_VAN = { type: 'swat', color: 0x111111, topSpeed: 26, accel: 13, length: 5.6, armour: true };

export function vehicleByType(type) {
  return VEHICLE_TYPES.find((v) => v.type === type) || VEHICLE_TYPES[0];
}

export function spawnTrafficCar(rng, night) {
  const p = randomRoadPoint(rng);
  const def = pick(rng, VEHICLE_TYPES);
  return {
    type: def.type, color: def.color, topSpeed: def.topSpeed,
    x: p.x, z: p.z, angle: (rng() < 0.5 ? 0 : Math.PI / 2) + (rng() < 0.5 ? 0 : Math.PI),
    speed: range(rng, 6, 12), night: !!night, length: def.length,
  };
}

export function spawnTraffic(rng, count, night) {
  const cars = [];
  for (let i = 0; i < count; i += 1) cars.push(spawnTrafficCar(rng, night));
  return cars;
}

export function createPlayerCar(x, z) {
  return {
    type: PLAYER_CAR.type, color: PLAYER_CAR.color,
    x, z, angle: 0, speed: 0, condition: 100,
    topSpeed: PLAYER_CAR.topSpeed, accel: PLAYER_CAR.accel,
    lastHitAt: -999, drift: 0,
  };
}
