// Characters: Mara Solano, ped archetypes, mission contacts.
import { MISSIONS } from './config.js';

export const MARA = { name: 'Mara Solano', role: 'EX-GETAWAY DRIVER', jacket: 0xe74c3c, backpack: 0x2e6fb0, hair: 0x2c1a12, skin: 0xd9a066 };
export const PED_ARCHETYPES = [
  { name: 'commuter', speed: 1.5 },
  { name: 'tourist', speed: 1.0 },
  { name: 'dockworker', speed: 1.8 },
  { name: 'runner', speed: 3.0 },
  { name: 'vendor', speed: 0.8 },
];
export function pedArchetype(i) { return PED_ARCHETYPES[i % PED_ARCHETYPES.length]; }
export function contactByName(name) {
  const m = MISSIONS.find((m) => m.contact === name);
  if (!m) return null;
  return { name: m.contact, district: m.district, mission: m.id };
}
