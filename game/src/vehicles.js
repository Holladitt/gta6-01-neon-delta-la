// Vehicles: 5 traffic types, the player Solstice GT, NDPD interceptor, SWAT van.
import { pick } from './rng.js';
import { randomRoadPoint } from './geo.js';

export const VEHICLE_TYPES = [
  { id: 'sedan', name: 'Sedan', topSpeed: 26 },
  { id: 'taxi', name: 'Taxi', topSpeed: 28 },
  { id: 'coupe', name: 'Coupe', topSpeed: 32 },
  { id: 'truck', name: 'Truck', topSpeed: 20 },
  { id: 'van', name: 'Van', topSpeed: 22 },
];
export const PLAYER_CAR = { id: 'solstice', name: 'Solstice GT', topSpeed: 34, color: 0xc0392b, roof: 0x1abc9c };
export const POLICE_CAR = { id: 'police', name: 'NDPD Interceptor', topSpeed: 30, color: 0x1a2a3a };
export const SWAT_VAN = { id: 'swat', name: 'SWAT Van', topSpeed: 24, armour: true, color: 0x111111 };
export function spawnTraffic(rng, n, night) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = randomRoadPoint(rng);
    const t = pick(rng, VEHICLE_TYPES);
    out.push({ x: p.x, z: p.z, angle: rng() * Math.PI * 2, speed: 4 + rng() * 6, type: t.id, topSpeed: t.topSpeed });
  }
  return out;
}
