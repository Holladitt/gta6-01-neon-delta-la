// Vehicle types + traffic spawning. Pure.
import { makeRng } from './rng.js';
import { randomRoadPoint } from './geo.js';
export const VEHICLE_TYPES = [
  { id: 'sedan', name: 'Sedan', topSpeed: 26 },
  { id: 'coupe', name: 'Coupe', topSpeed: 30 },
  { id: 'truck', name: 'Truck', topSpeed: 22 },
  { id: 'van', name: 'Van', topSpeed: 24 },
  { id: 'sports', name: 'Sports', topSpeed: 34 },
];
export const PLAYER_CAR = { id: 'solstice', name: 'SOLSTICE GT', topSpeed: 34 };
export const POLICE_CAR = { id: 'police', name: 'NDPD Interceptor', topSpeed: 30 };
export const SWAT_VAN = { id: 'swat', name: 'SWAT Van', topSpeed: 26, armour: true };
export function spawnTraffic(rng, count, night) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(rng);
    cars.push({ x: p.x, z: p.z, angle: rng() * Math.PI * 2, speed: 6 + rng() * 8, kind: Math.floor(rng() * VEHICLE_TYPES.length), night: !!night });
  }
  return cars;
}
