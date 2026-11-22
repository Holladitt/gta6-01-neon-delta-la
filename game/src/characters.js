// characters.js — Mara, the crew contacts and the ped archetypes.
import { MISSIONS } from './config.js';

export const MARA = {
  name: 'Mara Solano',
  role: 'Ex-getaway driver',
  age: 28,
  jacket: 0xe74c3c,
  backpack: 0x2e6fb0,
  bio: 'A getaway driver who walked away from the life — until her sister vanished with proof of a corruption ring.',
};

const ARCHETYPES = [
  { name: 'commuter', speed: 1.2, color: 0x8a8f98 },
  { name: 'tourist', speed: 0.9, color: 0xf2c14e },
  { name: 'dockworker', speed: 1.1, color: 0xe67e22 },
  { name: 'vendor', speed: 0.8, color: 0x9b59b6 },
  { name: 'jogger', speed: 2.4, color: 0x1abc9c },
  { name: 'student', speed: 1.4, color: 0x3498db },
  { name: 'officer', speed: 1.3, color: 0x2c3e50 },
  { name: 'dealer', speed: 1.0, color: 0x27ae60 },
];
export function pedArchetype(i) {
  return ARCHETYPES[i % ARCHETYPES.length];
}
export function contacts() {
  return MISSIONS.map((m) => ({ name: m.contact, district: m.district, mission: m.id }));
}
export function contactByName(name) {
  return contacts().find((c) => c.name === name);
}
