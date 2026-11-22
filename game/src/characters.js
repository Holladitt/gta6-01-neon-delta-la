// People of Neon Delta LA: Mara Solano, the crew, the contacts and the
// pedestrian archetypes that dress the sidewalks.
export const MARA = {
  name: 'Mara Solano',
  role: 'ex-getaway driver',
  jacket: 0xe74c3c,
  backpack: 0x2471a3,
  district: 'downtown',
  bio: 'Ex-getaway driver. Her vanished sister held proof of corruption: a mayor, a port businessman, the police.',
};

export const CONTACTS = [
  { name: 'Eden Voss', district: 'downtown', role: 'fixer' },
  { name: 'Harlan Dray', district: 'venice', role: 'smuggler' },
  { name: 'Lucia Marlow', district: 'marina', role: 'mechanic' },
  { name: 'Dante Kovac', district: 'hills', role: 'lookout' },
  { name: 'Sable Okonkwo', district: 'downtown', role: 'fence' },
  { name: 'Vera Lindqvist', district: 'port', role: 'broker' },
  { name: 'Inez Vargas', district: 'pier', role: 'ledger keeper' },
  { name: 'Orin Beck', district: 'port', role: 'whistleblower' },
  { name: 'Lena Marsh', district: 'marina', role: 'diver' },
  { name: 'Elias Frost', district: 'hills', role: 'witness' },
];

export function contactByName(name) {
  return CONTACTS.find((c) => c.name === name) || CONTACTS[0];
}

const ARCHETYPES = [
  { name: 'commuter', shirt: 0x34495e, speed: 1.2 },
  { name: 'tourist', shirt: 0xf39c12, speed: 0.8 },
  { name: 'dockworker', shirt: 0xe67e22, speed: 1.0 },
  { name: 'student', shirt: 0x3498db, speed: 1.5 },
  { name: 'vendor', shirt: 0x2ecc71, speed: 0.6 },
  { name: 'runner', shirt: 0xe74c3c, speed: 2.0 },
];

export function pedArchetype(i) {
  return ARCHETYPES[((i % ARCHETYPES.length) + ARCHETYPES.length) % ARCHETYPES.length];
}
