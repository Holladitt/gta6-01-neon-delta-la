// Vehicles for Neon Delta LA: five traffic types, the player's red
// Solstice GT, the two-tone NDPD police car and the armoured SWAT van.
import { makeRng, range } from './rng.js';
import { randomRoadPoint } from './geo.js';

export const VEHICLE_TYPES = [
  { id: 'sedan', name: 'Sedan', topSpeed: 24, color: 0x95a5a6 },
  { id: 'coupe', name: 'Coupe', topSpeed: 30, color: 0xe74c3c },
  { id: 'truck', name: 'Truck', topSpeed: 18, color: 0x7f8c8d },
  { id: 'van', name: 'Van', topSpeed: 20, color: 0x3498db },
  { id: 'taxi', name: 'Taxi', topSpeed: 26, color: 0xf1c40f },
];

export const PLAYER_CAR = { id: 'solstice', name: 'SOLSTICE GT', topSpeed: 34, color: 0xc0392b, roof: 0x1abc9c };
export const POLICE_CAR = { id: 'ndpd', name: 'NDPD Interceptor', topSpeed: 28, color: 0xecf0f1 };
export const SWAT_VAN = { id: 'swat', name: 'SWAT Van', topSpeed: 22, color: 0x1a1a1a, armour: true };

export function spawnTraffic(rng, count, night) {
  const cars = [];
  let guard = 0;
  while (cars.length < count && guard < 500) {
    guard += 1;
    const p = randomRoadPoint(rng);
    const type = VEHICLE_TYPES[Math.floor(rng() * VEHICLE_TYPES.length)];
    cars.push({ x: p.x, z: p.z, angle: rng() < 0.5 ? 0 : Math.PI / 2, speed: range(rng, 6, 14), type: type.id, night: !!night });
  }
  return cars;
}

export function vehicleType(id) {
  return VEHICLE_TYPES.find((v) => v.id === id) || VEHICLE_TYPES[0];
}

export function makeTrafficRng(seed) {
  return makeRng(seed);
}
