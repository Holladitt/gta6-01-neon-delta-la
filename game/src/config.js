// Neon Delta LA: District Wars — all game constants, in one place.
// Pure data + tiny lookups. No browser globals, no three.js.
export const TITLE = 'Neon Delta LA: District Wars';
export const ENTRY_TITLE =
  'Neon Delta LA: District Wars — 6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers, 3 save slots, street races';
export const MAP_COVERAGE = 'A coastal city of 6 districts across 1560 m of shoreline, freeways and port.';

// --- Districts (rectangles in world metres; x east, z south) ---
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', sub: 'Shops & Theatres', x0: -560, z0: -560, x1: -40, z1: -140 },
  { id: 'hills', name: 'Hollywood Hills', sub: 'Hilltop Views', x0: -40, z0: -560, x1: 780, z1: -140 },
  { id: 'venice', name: 'Venice', sub: 'Canals & Boardwalk', x0: -620, z0: -140, x1: -40, z1: 260 },
  { id: 'marina', name: 'Marina', sub: 'Boats & Boardwalk', x0: -40, z0: -140, x1: 780, z1: 260 },
  { id: 'pier', name: 'Coral Pier', sub: 'Amusement Pier & Boardwalk', x0: -780, z0: 260, x1: -40, z1: 780 },
  { id: 'port', name: 'Long Beach Port', sub: 'Container Terminal', x0: -40, z0: 260, x1: 780, z1: 780 },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  return DISTRICTS[5];
}
export function districtById(id) {
  return DISTRICTS.find((d) => d.id === id) || DISTRICTS[0];
}

// --- Weapons (6, in 4 tiers) ---
export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', tier: 1, price: 0, damage: 12, mag: 12, reserve: 120, range: 120, auto: false },
  { id: 'smg', name: 'SMG', tier: 1, price: 0, damage: 17, mag: 30, reserve: 240, range: 90, auto: true },
  { id: 'shotgun', name: 'SHOTGUN', tier: 1, price: 0, damage: 13, mag: 6, reserve: 48, range: 55, pellets: 7, auto: false },
  { id: 'carbine', name: 'DELTA CARBINE', tier: 2, price: 900, damage: 26, mag: 30, reserve: 130, range: 130, auto: true },
  { id: 'longshot', name: 'LONGSHOT', tier: 3, price: 1800, damage: 95, mag: 5, reserve: 5, range: 180, auto: false },
  { id: 'marauder', name: 'MARAUDER', tier: 4, price: 2500, damage: 14, mag: 60, reserve: 100, range: 100, auto: true },
];
export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id);
}
export function tierName(tier) {
  return tier === 1 ? 'STREET' : tier === 2 ? 'TACTICAL' : tier === 3 ? 'PRECISION' : 'HEAVY';
}

// --- Missions (10; payouts sum to 13750, RP to 1375) ---
export const MISSIONS = [
  { id: 1, name: 'FIRST GEAR', contact: 'Eden Voss', payout: 400, hour: 10, startWanted: 0, district: 'downtown',
    desc: 'Pick up Eden downtown and drop her at the hideout.',
    next: 'Drive Eden to the hideout, clean.',
    points: [{ x: -300, z: -400, label: 'Pick up Eden' }, { x: -200, z: -300, label: 'Drop Eden at the hideout' }] },
  { id: 2, name: 'HOT WHEELS', contact: 'Harlan Dray', payout: 650, hour: 12, startWanted: 0, district: 'venice',
    desc: 'Meet Harlan in Venice, then run the package to the Marina.',
    next: 'Deliver the package to the Marina.',
    points: [{ x: -400, z: 100, label: 'Meet Harlan in Venice' }, { x: 100, z: 100, label: 'Deliver the package' }] },
  { id: 3, name: 'CANAL RUN', contact: 'Lucia Marlow', payout: 700, hour: 14, startWanted: 0, district: 'marina',
    desc: 'Pick up Lucia at the Marina and lose the tail downtown.',
    next: 'Lose the tail, then park it.',
    points: [{ x: 100, z: 100, label: 'Pick up Lucia' }, { x: -200, z: -300, label: 'Lose the tail' }] },
  { id: 4, name: 'THE FIXER', contact: 'Dante Kovac', payout: 800, hour: 16, startWanted: 0, district: 'hills',
    desc: 'Meet Dante in the Hills, then collect the debt downtown.',
    next: 'Collect the debt, no witnesses.',
    points: [{ x: 200, z: -400, label: 'Meet Dante in the Hills' }, { x: -300, z: -400, label: 'Collect the debt' }] },
  { id: 5, name: 'LAST BRIDGE', contact: 'Sable Okonkwo', payout: 1000, hour: 17, startWanted: 0, district: 'downtown',
    desc: 'The whole force is after you. Break the line, then cross.',
    next: 'Cross the Freeway bridge, clean.',
    points: [{ x: -320, z: -261, label: 'Break the line' }, { x: 400, z: 400, label: 'Cross to the Port' }] },
  { id: 6, name: 'THE VAULT', contact: 'Vera Lindqvist', payout: 2000, hour: 19, startWanted: 0, district: 'venice',
    desc: 'Get the vault codes in Venice, then open the vault in the Hills.',
    next: 'Open the vault before dawn.',
    points: [{ x: -400, z: 100, label: 'Get the vault codes' }, { x: 200, z: -400, label: 'Open the vault' }] },
  { id: 7, name: 'THE NIGHT LEDGER', contact: 'Inez Vargas', payout: 1200, hour: 21, startWanted: 0, district: 'pier',
    desc: 'Meet Inez on Coral Pier — after dark.',
    next: 'Find the two ledger pages on the pier.',
    points: [{ x: -652, z: 431, label: 'Meet Inez at the pier' }, { x: -700, z: 430, label: 'Find the ledger pages' }] },
  { id: 8, name: 'THE LAST SIGNAL', contact: 'Orin Beck', payout: 2500, hour: 18, startWanted: 2, district: 'marina',
    desc: 'Sweep the dead drops: marina, then the pier.',
    next: 'Reach the overlook and broadcast the proof.',
    points: [
      { x: 100, z: 100, label: 'Marina dead drop' },
      { x: -600, z: 400, label: 'Pier dead drop' },
      { x: 200, z: -400, label: 'Overlook broadcast' },
    ] },
  { id: 9, name: 'THE SUNKEN KEY', contact: 'Lena Marsh', payout: 1500, hour: 20, startWanted: 0, district: 'marina',
    desc: 'Meet Lena at the Marina, then find the key at the Port.',
    next: 'Bring the key back to Lena.',
    points: [{ x: 100, z: 100, label: 'Meet Lena at the Marina' }, { x: 400, z: 400, label: 'Find the key at the Port' }] },
  { id: 10, name: 'THE LAST WITNESS', contact: 'Elias Frost', payout: 3000, hour: 22, startWanted: 3, district: 'hills',
    desc: 'Find Elias in the Hills and protect the witness downtown.',
    next: 'Get the witness out of the city.',
    points: [{ x: 200, z: -400, label: 'Find Elias in the Hills' }, { x: -300, z: -400, label: 'Protect the witness' }] },
];
export const MISSION_TOTAL_PAYOUT = MISSIONS.reduce((s, m) => s + m.payout, 0);
export const MISSION_TOTAL_RP = MISSIONS.reduce((s, m) => s + Math.round(m.payout / 10), 0);

// --- Ranks ---
export const RANKS = [
  { code: 'D', name: 'GREENHORN', rp: 0 },
  { code: 'C', name: 'RUNNER', rp: 100 },
  { code: 'B', name: 'NIGHTHAWK', rp: 300 },
  { code: 'A', name: 'OUTLAW', rp: 600 },
  { code: 'S', name: 'DELTA LEGEND', rp: 1000 },
];

// --- Crew ---
export const CREW = [
  { id: 'juno', name: 'Juno Reyes', role: 'DRIVER', ability: 'CLEAN PLATES', key: 'C', cooldown: 45 },
  { id: 'petra', name: 'Petra Hale', role: 'MECHANIC', ability: 'FIELD REPAIR', key: 'V', cooldown: 60 },
  { id: 'cassia', name: 'Cassia Wren', role: 'LOOKOUT', ability: 'OVERWATCH', key: 'X', cooldown: 25 },
];

// --- World numbers ---
export const PED_COUNT = 104;
export const TRAFFIC_TOTAL = 22;
export const NIGHT_DISCS = 28;
export const WANTED_MAX = 5;
export const STANDING_GAIN = { mission: 10, race: 5, job: 3 };
export const RACE = { checkpoints: 5, reward: 300 };
export const JOBS = { taxi: { reward: 120 }, courier: { reward: 150 } };
export const TAPES_TOTAL = 20;
export const TAPE_BONUS = 50;
export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'ENGINE', price: 1200, desc: 'Higher top speed' },
  { id: 'armour', name: 'ARMOUR', price: 1000, desc: 'Less collision damage' },
  { id: 'nitro', name: 'NITRO', price: 800, desc: 'Boost on a key' },
];
export const COVER_MAX = 100;

// --- Places ---
export const BOAT = { x: 568, z: 644 };
export const CRANE = { x: 560, z: 560 };
export const SHOP = { x: -320, z: -200 };
export const GARAGE_POS = { x: -200, z: -80 };
export const PIER_DECK = { x0: -780, x1: -620, z0: 360, z1: 500 };
