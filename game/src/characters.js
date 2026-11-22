// People: Mara, pedestrian archetypes, mission contacts. Pure.
export const MARA = {
  name: 'Mara Solano',
  age: 27,
  role: 'Ex-getaway driver',
  jacket: 'red',
  hair: 'dark',
  district: 'downtown',
};
const ARCHETYPES = [
  { name: 'commuter', job: 'Office worker', speed: 1.2 },
  { name: 'tourist', job: 'Sightseer', speed: 0.8 },
  { name: 'dockworker', job: 'Port labour', speed: 1.0 },
  { name: 'vendor', job: 'Street vendor', speed: 0.6 },
  { name: 'jogger', job: 'Runner', speed: 2.2 },
  { name: 'student', job: 'Student', speed: 1.4 },
  { name: 'fisherman', job: 'Pier angler', speed: 0.7 },
  { name: 'shopper', job: 'Shopper', speed: 1.0 },
];
export function pedArchetype(i) {
  return ARCHETYPES[((i % ARCHETYPES.length) + ARCHETYPES.length) % ARCHETYPES.length];
}
const CONTACTS = {
  'Eden Voss': { name: 'Eden Voss', district: 'downtown', role: 'Fixer' },
  'Harlan Dray': { name: 'Harlan Dray', district: 'venice', role: 'Smuggler' },
  'Lucia Marlow': { name: 'Lucia Marlow', district: 'marina', role: 'Sailor' },
  'Dante Kovac': { name: 'Dante Kovac', district: 'hills', role: 'Broker' },
  'Sable Okonkwo': { name: 'Sable Okonkwo', district: 'downtown', role: 'Driver' },
  'Vera Lindqvist': { name: 'Vera Lindqvist', district: 'venice', role: 'Hacker' },
  'Inez Vargas': { name: 'Inez Vargas', district: 'pier', role: 'Ledger keeper' },
  'Orin Beck': { name: 'Orin Beck', district: 'marina', role: 'Signalman' },
  'Lena Marsh': { name: 'Lena Marsh', district: 'marina', role: 'Diver' },
  'Elias Frost': { name: 'Elias Frost', district: 'hills', role: 'Witness' },
};
export function contactByName(name) {
  return CONTACTS[name] || null;
}
