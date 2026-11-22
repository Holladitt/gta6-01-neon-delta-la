// config.js — Neon Delta LA: static game data (pure, no DOM, no THREE).
// Missions, weapons, ranks, world constants. The sim imports this in Node.

export const START_CASH = 250;
export const SAVE_KEY = 'neon-delta-la.save.v3';
export const RADIO_TEXT = 'RADIO: NEON 88';
export const WORLD_HALF = 900; // city spans x,z in [-900, 900]
export const ROAD_SPACING = 150;
export const ROAD_WIDTH = 18;

// ---- Weapons ----
// mag = rounds per magazine, reserve = spare rounds carried, price 0 = owned from start.
export const WEAPONS = [
  { name: 'PISTOL', short: 'PST', mag: 12, reserve: 120, price: 0, rate: 0.28, damage: 25, range: 60 },
  { name: 'SMG', short: 'SMG', mag: 30, reserve: 240, price: 0, rate: 0.09, damage: 12, range: 50 },
  { name: 'SHOTGUN', short: 'SGN', mag: 6, reserve: 48, price: 0, rate: 0.85, damage: 60, range: 25 },
  { name: 'DELTA CARBINE', short: 'CAR', mag: 30, reserve: 130, price: 900, rate: 0.12, damage: 20, range: 80 },
  { name: 'LONGSHOT', short: 'LNG', mag: 5, reserve: 180, price: 1800, rate: 1.1, damage: 95, range: 120 },
  { name: 'MARAUDER', short: 'MRD', mag: 60, reserve: 100, price: 2500, rate: 0.06, damage: 10, range: 55 },
];

// ---- Ranks ----
export const RANKS = [
  { minRp: 0, title: 'D GREENHORN' },
  { minRp: 100, title: 'C RUNNER' },
  { minRp: 300, title: 'B NIGHTHAWK' },
  { minRp: 600, title: 'A OUTLAW' },
  { minRp: 1000, title: 'S DELTA LEGEND' },
];

// ---- Missions ----
// Step types: goto {x,z} | deliver {x,z,inCar} | steal {kind} |
// visit {points:[[x,z]...]} | chase | escape | survive {seconds}.
export const MISSIONS = [
  {
    name: 'FIRST GEAR', contact: 'Eden Voss', reward: 400,
    brief: 'Eden needs a package moved across downtown. Meet her, then drive it to the drop.',
    steps: [
      { type: 'goto', x: 20, z: -30, label: 'Meet Eden at the downtown garage' },
      { type: 'deliver', x: 120, z: 80, inCar: true, label: 'Drive the package to the drop' },
    ],
  },
  {
    name: 'HOT WHEELS', contact: 'Harlan Dray', reward: 650,
    brief: 'Harlan wants a sedan, no questions. Lift one and bring it to his lockup.',
    steps: [
      { type: 'steal', kind: 'sedan', label: 'Steal a sedan' },
      { type: 'deliver', x: 200, z: -100, inCar: true, label: 'Deliver the sedan to Harlan' },
    ],
  },
  {
    name: 'CANAL RUN', contact: 'Lucia Marlow', reward: 700,
    brief: 'Three drops along the Venice canals. Check them all, then bring the ledger to Lucia.',
    steps: [
      { type: 'visit', points: [[-600, 280], [-560, 320], [-620, 340]], label: 'Check the three canal drops' },
      { type: 'deliver', x: -500, z: 300, inCar: true, label: 'Deliver the ledger to Lucia' },
    ],
  },
  {
    name: 'PIER PRESSURE', contact: 'Dante Kovac', reward: 800,
    brief: 'Dante is waiting at the Coral Pier. Walk into the ambush and walk out of it.',
    steps: [
      { type: 'goto', x: 0, z: 690, label: 'Reach the Coral Pier entrance' },
      { type: 'survive', seconds: 30, label: 'Survive the ambush' },
      { type: 'deliver', x: 100, z: 600, inCar: true, label: 'Drive the goods to Dante' },
    ],
  },
  {
    name: 'NIGHT SHIFT', contact: 'Sable Okonkwo', reward: 1000,
    brief: 'Tail the courier through the night streets. Stay close, then lose the heat.',
    steps: [
      { type: 'chase', label: 'Tail the courier — stay close' },
      { type: 'escape', label: 'Lose the heat' },
    ],
  },
  {
    name: 'CLEAN GETAWAY', contact: 'Vera Lindqvist', reward: 2000,
    brief: 'Vera needs a sports car and a clean exit. Lift it, deliver it, vanish.',
    steps: [
      { type: 'steal', kind: 'sports', label: 'Steal a sports car' },
      { type: 'deliver', x: 400, z: 200, inCar: true, label: 'Deliver it to Vera' },
      { type: 'escape', label: 'Lose the heat' },
    ],
  },
  {
    name: 'THE NIGHT LEDGER', contact: 'Inez Vargas', reward: 1200, hour: 21.5,
    brief: 'Inez keeps the ledger on the pier after dark. Collect its three pages under the lights.',
    steps: [
      { type: 'goto', x: 0, z: 780, label: 'Reach the pier stalls at night' },
      { type: 'visit', points: [[-25, 800], [0, 820], [25, 800]], label: 'Collect the three ledger pages' },
      { type: 'deliver', x: -100, z: 700, inCar: true, label: 'Deliver the ledger to Inez' },
    ],
  },
  {
    name: 'THE LAST SIGNAL', contact: 'Orin Beck', reward: 2500, hour: 18.5, startWanted: 2,
    brief: 'Three signal points before dusk fades: the marina quay, the pier, the hill overlook.',
    steps: [
      { type: 'visit', points: [[-660, -460], [20, 820], [300, -680]], label: 'Hit the three signal points' },
      { type: 'deliver', x: 500, z: 400, inCar: true, label: 'Deliver the signal to Orin' },
    ],
  },
  {
    name: 'THE SUNKEN KEY', contact: 'Lena Marsh', reward: 1500,
    brief: 'Lena lost the key with a van. Steal a van and bring it back to her.',
    steps: [
      { type: 'steal', kind: 'van', label: 'Steal a van' },
      { type: 'deliver', x: -300, z: -300, inCar: true, label: 'Deliver the van to Lena' },
    ],
  },
  {
    name: 'THE LAST WITNESS', contact: 'Elias Frost', reward: 3000, startWanted: 3,
    brief: 'The last witness is downtown and the hit squad is already moving. Bring them to the port alive.',
    steps: [
      { type: 'goto', x: 0, z: 0, label: 'Reach downtown' },
      { type: 'chase', label: 'Tail the witness' },
      { type: 'survive', seconds: 45, label: 'Survive the hit squad' },
      { type: 'deliver', x: 700, z: 600, inCar: true, label: 'Drive the witness to the port' },
    ],
  },
];

// ---- Crew ----
export const CREW = [
  { name: 'Juno Reyes', role: 'DRIVER', key: 'C', ability: 'CLEAN PLATES', desc: 'Drops wanted by 1 (45s cooldown)' },
  { name: 'Petra Hale', role: 'MECHANIC', key: 'V', ability: 'FIELD REPAIR', desc: '$150 restores the car to 100% (60s cooldown)' },
  { name: 'Cassia Wren', role: 'LOOKOUT', key: 'X', ability: 'OVERWATCH', desc: '20s of marked police (25s cooldown)' },
];

// ---- Dispatch callsigns ----
export const DISPATCH_SIGNS = ['DELTA-7', 'CORAL-3', 'CORAL-9', 'AIR-1'];

// ---- Districts (name, bounds, colour for the HUD/minimap) ----
export const DISTRICTS = [
  { name: 'DOWNTOWN', x0: -300, z0: -300, x1: 300, z1: 300, color: '#e8b64c' },
  { name: 'VENICE CANALS', x0: -900, z0: 150, x1: -300, z1: 600, color: '#2fb8a6' },
  { name: 'CORAL PIER', x0: -150, z0: 600, x1: 150, z1: 900, color: '#ff6b5e' },
  { name: 'LONG BEACH PORT', x0: 450, z0: 300, x1: 900, z1: 760, color: '#ff9a3c' },
  { name: 'MARINA', x0: -900, z0: -750, x1: -450, z1: -300, color: '#4aa8ff' },
  { name: 'HOLLYWOOD HILLS', x0: 150, z0: -900, x1: 600, z1: -450, color: '#9ccc65' },
  { name: 'FREEWAY', x0: -900, z0: -900, x1: 900, z1: 900, color: '#9a9a9a' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (d.name === 'FREEWAY') continue;
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  return DISTRICTS[DISTRICTS.length - 1];
}
