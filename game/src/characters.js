// Characters: Mara Solano, the protagonist, plus pedestrian
// archetypes and the NDPD officers. Pure data — colours, sizes and
// names the scene and the portraits draw from.
export const MARA = {
  name: 'Mara Solano',
  title: 'Ex-getaway driver',
  jacket: 0xe74c3c, shirt: 0xecf0f1, pants: 0x2c3e50, hair: 0x1a1a1a,
  height: 1.75, speed: 6,
  story: 'Her vanished sister held proof of corruption: a mayor, a port businessman, the police.',
};

export const PED_ARCHETYPES = [
  { name: 'commuter', shirt: 0x3498db, pants: 0x2c3e50, skin: 0xe0ac69, speed: 1.4 },
  { name: 'tourist', shirt: 0xe74c3c, pants: 0xecf0f1, skin: 0xc68642, speed: 1.1 },
  { name: 'worker', shirt: 0xf39c12, pants: 0x34495e, skin: 0x8d5524, speed: 1.6 },
  { name: 'student', shirt: 0x9b59b6, pants: 0x2c3e50, skin: 0xffdbac, speed: 1.8 },
  { name: 'elder', shirt: 0x95a5a6, pants: 0x7f8c8d, skin: 0xe0ac69, speed: 0.9 },
  { name: 'runner', shirt: 0x2ecc71, pants: 0x1a1a1a, skin: 0xc68642, speed: 2.4 },
];

export const CONTACTS = [
  { name: 'Eden Voss', role: 'Fixer', shirt: 0x8e44ad, district: 'downtown' },
  { name: 'Harlan Dray', role: 'Smuggler', shirt: 0x16a085, district: 'venice' },
  { name: 'Lucia Marlow', role: 'Informant', shirt: 0xd35400, district: 'pier' },
  { name: 'Dante Kovac', role: 'Fence', shirt: 0x2c3e50, district: 'port' },
  { name: 'Sable Okonkwo', role: 'Racer', shirt: 0xc0392b, district: 'hills' },
  { name: 'Vera Lindqvist', role: 'Broker', shirt: 0x2980b9, district: 'marina' },
  { name: 'Inez Vargas', role: 'Archivist', shirt: 0x7d3c98, district: 'downtown' },
  { name: 'Orin Beck', role: 'Runner', shirt: 0x117a65, district: 'marina' },
  { name: 'Lena Marsh', role: 'Diver', shirt: 0x1a5276, district: 'marina' },
  { name: 'Elias Frost', role: 'Witness', shirt: 0x616a6b, district: 'downtown' },
];

export function pedArchetype(i) {
  return PED_ARCHETYPES[i % PED_ARCHETYPES.length];
}

export function contactByName(name) {
  return CONTACTS.find((c) => c.name === name) || null;
}
