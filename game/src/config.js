// Neon Delta LA: District Wars — world constants, districts, weapons,
// missions, ranks, crew and every number the game and the sim share.
// The city is a coastal Los Angeles of six districts on a 1600-unit map:
// Downtown and Hollywood Hills in the north, Venice and Marina in the
// middle, Coral Pier in the south-west over the water, Long Beach Port
// in the south-east. West of x=-660 and south of z=635 is ocean.
export const TITLE = 'Neon Delta LA: District Wars';
export const ENTRY_TITLE = 'Neon Delta LA: District Wars — 6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers, 3 save slots, street races';
export const MAP_COVERAGE = '6 districts across 1600 units of coastal Los Angeles: Downtown, Venice, Coral Pier, Long Beach Port, Marina, Hollywood Hills';
export const WORLD_HALF = 780;
export const OCEAN_WEST = -660;
export const OCEAN_SOUTH = 635;

export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x0: -800, x1: 0, z0: -800, z1: -200 },
  { id: 'hills', name: 'Hollywood Hills', x0: 0, x1: 800, z0: -800, z1: -200 },
  { id: 'venice', name: 'Venice', x0: -800, x1: -100, z0: -200, z1: 300 },
  { id: 'marina', name: 'Marina', x0: -100, x1: 800, z0: -200, z1: 300 },
  { id: 'pier', name: 'Coral Pier', x0: -800, x1: -100, z0: 300, z1: 800 },
  { id: 'port', name: 'Long Beach Port', x0: -100, x1: 800, z0: 300, z1: 800 },
];

export function districtAt(x, z) {
  if (z < -200) return x < 0 ? DISTRICTS[0] : DISTRICTS[1];
  if (z < 300) return x < -100 ? DISTRICTS[2] : DISTRICTS[3];
  return x < -100 ? DISTRICTS[4] : DISTRICTS[5];
}

export function districtById(id) {
  return DISTRICTS.find((d) => d.id === id) || DISTRICTS[0];
}

export const OBJECTIVE_RADIUS = 14;

export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', tier: 1, price: 0, dmg: 12, mag: 12, range: 40 },
  { id: 'smg', name: 'SMG', tier: 1, price: 0, dmg: 8, mag: 30, range: 35 },
  { id: 'shotgun', name: 'SHOTGUN', tier: 1, price: 0, dmg: 24, mag: 6, range: 20 },
  { id: 'carbine', name: 'DELTA CARBINE', tier: 2, price: 900, dmg: 18, mag: 24, range: 60 },
  { id: 'longshot', name: 'LONGSHOT', tier: 3, price: 1800, dmg: 40, mag: 8, range: 120 },
  { id: 'marauder', name: 'MARAUDER', tier: 4, price: 2500, dmg: 55, mag: 10, range: 90 },
];

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function tierName(tier) {
  return ['', 'STANDARD', 'TACTICAL', 'PRECISION', 'HEAVY'][tier] || 'STANDARD';
}

export const MISSIONS = [
  { id: 1, name: 'THE GETAWAY', contact: 'Eden Voss', hour: 10, payout: 400, district: 'downtown', startWanted: 0, points: [{ x: -320, z: -260, label: 'Pick up Eden' }, { x: -200, z: -400, label: 'Lose the tail' }] },
  { id: 2, name: 'VENICE CANALS', contact: 'Harlan Dray', hour: 12, payout: 650, district: 'venice', startWanted: 0, points: [{ x: -400, z: 200, label: 'Meet Harlan' }, { x: -500, z: 100, label: 'Drop the package' }] },
  { id: 3, name: 'MARINA LIGHTS', contact: 'Lucia Marlow', hour: 14, payout: 700, district: 'marina', startWanted: 0, points: [{ x: 100, z: 100, label: 'Find Lucia' }, { x: 200, z: 200, label: 'Deliver the keys' }] },
  { id: 4, name: 'HILLSIDE', contact: 'Dante Kovac', hour: 16, payout: 800, district: 'hills', startWanted: 0, points: [{ x: 200, z: -400, label: 'Climb the hill' }, { x: 300, z: -300, label: 'Take the overlook' }] },
  { id: 5, name: 'THE LAST BRIDGE', contact: 'Sable Okonkwo', hour: 17, payout: 1000, district: 'downtown', startWanted: 0, points: [{ x: 0, z: -560, label: 'Cross the bridge' }, { x: 300, z: -560, label: 'Reach the far side' }] },
  { id: 6, name: 'THE VAULT', contact: 'Vera Lindqvist', hour: 19, payout: 2000, district: 'port', startWanted: 0, points: [{ x: 400, z: 400, label: 'Case the vault' }, { x: 500, z: 500, label: 'Crack the vault' }] },
  { id: 7, name: 'THE NIGHT LEDGER', contact: 'Inez Vargas', hour: 21, payout: 1200, district: 'pier', startWanted: 0, points: [{ x: -640, z: 430, label: 'Meet Inez' }, { x: -700, z: 450, label: 'Take the ledger' }] },
  { id: 8, name: 'THE LAST SIGNAL', contact: 'Orin Beck', hour: 18, payout: 2500, district: 'port', startWanted: 2, points: [{ x: 100, z: 100, label: 'Marina drop' }, { x: -640, z: 430, label: 'Pier drop' }, { x: 200, z: -400, label: 'Hill overlook' }] },
  { id: 9, name: 'THE SUNKEN KEY', contact: 'Lena Marsh', hour: 20, payout: 1500, district: 'marina', startWanted: 0, points: [{ x: 300, z: 200, label: 'Find the key' }, { x: 100, z: 300, label: 'Open the locker' }] },
  { id: 10, name: 'THE LAST WITNESS', contact: 'Elias Frost', hour: 22, payout: 3000, district: 'hills', startWanted: 3, points: [{ x: 400, z: -400, label: 'Reach the witness' }, { x: 100, z: -100, label: 'Get them out' }] },
];
export const MISSION_TOTAL_PAYOUT = 13750;
export const MISSION_TOTAL_RP = 1375;

export const RANKS = [
  { code: 'D', name: 'GREENHORN', rp: 0 },
  { code: 'C', name: 'RUNNER', rp: 100 },
  { code: 'B', name: 'NIGHTHAWK', rp: 300 },
  { code: 'A', name: 'OUTLAW', rp: 600 },
  { code: 'S', name: 'DELTA LEGEND', rp: 1000 },
];

export const CREW = [
  { id: 'juno', name: 'Juno Reyes', role: 'driver', ability: 'CLEAN PLATES', key: 'C', cooldown: 45, desc: 'Wanted -1' },
  { id: 'petra', name: 'Petra Hale', role: 'mechanic', ability: 'FIELD REPAIR', key: 'V', cooldown: 60, desc: '$150, condition 100%' },
  { id: 'cassia', name: 'Cassia Wren', role: 'lookout', ability: 'OVERWATCH', key: 'X', cooldown: 25, desc: '20s police blind spot' },
];

export const PED_COUNT = 104;
export const TRAFFIC_TOTAL = 22;
export const NIGHT_DISCS = 28;
export const WANTED_MAX = 5;
export const STANDING_GAIN = { mission: 10, race: 5, job: 3 };
export const RACE = { checkpoints: 5, reward: 300 };
export const JOBS = {
  taxi: { name: 'TAXI', reward: 120, desc: 'Pick up a pedestrian, drop them at the marked point' },
  courier: { name: 'COURIER', reward: 150, desc: 'Deliver a package to the marked point' },
};
export const TAPES_TOTAL = 20;
export const TAPE_BONUS = 50;
export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'ENGINE', price: 1200, desc: '+25% top speed' },
  { id: 'armour', name: 'ARMOUR', price: 900, desc: 'Half collision damage' },
  { id: 'nitro', name: 'NITRO', price: 800, desc: 'Boost on N, 3s' },
];
export const COVER_MAX = 100;

export const BOAT = { x: 530, z: 648 };
export const CRANE = { x: 420, z: 600 };
export const SHOP = { x: -320, z: -200 };
export const PIER_DECK = { x0: -780, x1: -620, z0: 360, z1: 500 };
export const GARAGE_POS = { x: -260, z: -320 };
