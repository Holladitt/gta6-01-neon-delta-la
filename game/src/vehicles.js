// vehicles.js — the five vehicle types plus police and SWAT.
export const VEHICLES = [
  { id: 'sedan', name: 'Sedan', topSpeed: 30, color: 0x95a5a6 },
  { id: 'coupe', name: 'Coupe', topSpeed: 34, color: 0xe74c3c },
  { id: 'truck', name: 'Truck', topSpeed: 26, color: 0x7f8c8d },
  { id: 'taxi', name: 'Taxi', topSpeed: 30, color: 0xf1c40f },
  { id: 'van', name: 'Van', topSpeed: 24, color: 0x34495e },
];
export const VEHICLE_TYPES = VEHICLES;
export const POLICE_CAR = { id: 'police', name: 'NDPD Cruiser', topSpeed: 32, color: 0x1a1a2e, armour: false };
export const SWAT_VAN = { id: 'swat', name: 'SWAT Van', topSpeed: 26, color: 0x111111, armour: true };
export const HERO_CAR = { id: 'hero', name: 'Mara\'s Coupe', topSpeed: 34, color: 0xe74c3c, roof: 0x1abc9c };
export const PLAYER_CAR = HERO_CAR;
export function vehicleById(id) {
  return VEHICLES.find((v) => v.id === id);
}
export { spawnTraffic } from './traffic.js';
