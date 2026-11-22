// All fixed numbers for Neon Delta LA: District Wars.
// One source of truth: missions, ranks, weapons, districts, crew,
// races, jobs, tapes, garage, police escalation and the save keys.
// Pure data plus the district lookup; nothing here touches the DOM.
export const TITLE = 'Neon Delta LA: District Wars';
export const ENTRY_TITLE = 'Neon Delta LA: District Wars — 6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers, 3 save slots, street races';
export const RADIO = 'RADIO: NEON 88';
export const SAVE_KEY_BASE = 'neon-delta-la.save.v3';
export const SAVE_SLOTS = 3;

export const MAP = { x0: -700, z0: -700, x1: 700, z1: 700 };
export const OCEAN_WEST = -620;
export const OCEAN_SOUTH = 620;
export const MAP_COVERAGE = '6 districts across a 1,400 by 1,400 coastal map';

// Six districts. Bounds are inline on each district; look them up
// with districtAt, never from a separate bounds table.
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x0: -620, z0: -620, x1: -80, z1: -120 },
  { id: 'hills', name: 'Hollywood Hills', x0: -80, z0: -620, x1: 700, z1: -120 },
  { id: 'venice', name: 'Venice', x0: -620, z0: -120, x1: -80, z1: 280 },
  { id: 'marina', name: 'Marina', x0: -80, z0: -120, x1: 320, z1: 280 },
  { id: 'pier', name: 'Coral Pier', x0: -620, z0: 280, x1: -80, z1: 620 },
  { id: 'port', name: 'Long Beach Port', x0: -80, z0: 280, x1: 700, z1: 620 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  // The pier deck hangs over the ocean west of Coral Pier.
  if (x < -620 && z >= 280 && z < 620) return districtById('pier');
  if (x < -620 && z >= -120 && z < 280) return districtById('venice');
  if (x < -620) return districtById('downtown');
  return DISTRICTS[0];
}

export function districtById(id) {
  return DISTRICTS.find((d) => d.id === id) || DISTRICTS[0];
}

// Four weapon tiers. Tier 1 is owned from the start.
export const WEAPON_TIERS = [
  { tier: 1, name: 'STREET' },
  { tier: 2, name: 'DELTA' },
  { tier: 3, name: 'PRECISION' },
  { tier: 4, name: 'HEAVY' },
];

export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', tier: 1, price: 0, damage: 12, rate: 3, range: 40, owned: true },
  { id: 'smg', name: 'SMG', tier: 1, price: 0, damage: 8, rate: 9, range: 35, owned: true },
  { id: 'shotgun', name: 'SHOTGUN', tier: 1, price: 0, damage: 30, rate: 1, range: 18, owned: true },
  { id: 'carbine', name: 'DELTA CARBINE', tier: 2, price: 900, damage: 18, rate: 7, range: 70, owned: false },
  { id: 'longshot', name: 'LONGSHOT', tier: 3, price: 1800, damage: 45, rate: 1, range: 120, owned: false },
  { id: 'marauder', name: 'MARAUDER', tier: 4, price: 2500, damage: 60, rate: 5, range: 90, owned: false },
];

export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}

export function tierName(tier) {
  const t = WEAPON_TIERS.find((x) => x.tier === tier);
  return t ? t.name : 'STREET';
}

// Ten story missions. Payouts are exact; the total is 13,750.
export const MISSIONS = [
  { id: 1, title: 'THE GETAWAY', contact: 'Eden Voss', payout: 400, startWanted: 0, hour: 9, points: [{ x: -300, z: -400, label: 'Pick up Eden' }, { x: -140, z: -300, label: 'Lose the tail' }] },
  { id: 2, title: 'CANAL RUN', contact: 'Harlan Dray', payout: 650, startWanted: 0, hour: 11, points: [{ x: -480, z: 0, label: 'Meet Harlan' }, { x: -300, z: 180, label: 'Drop the package' }] },
  { id: 3, title: 'PIER LIGHTS', contact: 'Lucia Marlow', payout: 700, startWanted: 0, hour: 20, points: [{ x: -560, z: 420, label: 'Find Lucia' }, { x: -420, z: 480, label: 'Light the fuse' }] },
  { id: 4, title: 'HARBOR HEIST', contact: 'Dante Kovac', payout: 800, startWanted: 1, hour: 14, points: [{ x: 200, z: 420, label: 'Crack the gate' }, { x: 480, z: 520, label: 'Grab the crate' }] },
  { id: 5, title: 'HILL CLIMB', contact: 'Sable Okonkwo', payout: 1000, startWanted: 0, hour: 8, points: [{ x: 100, z: -420, label: 'Climb the hill' }, { x: 420, z: -300, label: 'Plant the beacon' }] },
  { id: 6, title: 'MARINA GHOST', contact: 'Vera Lindqvist', payout: 2000, startWanted: 1, hour: 22, points: [{ x: 120, z: 120, label: 'Board the yacht' }, { x: 260, z: 220, label: 'Copy the ledger' }] },
  { id: 7, title: 'THE NIGHT LEDGER', contact: 'Inez Vargas', payout: 1200, startWanted: 0, hour: 21, minute: 30, points: [{ x: -420, z: -300, label: 'Meet Inez' }, { x: -200, z: -500, label: 'Deliver the ledger' }] },
  { id: 8, title: 'THE LAST SIGNAL', contact: 'Orin Beck', payout: 2500, startWanted: 2, hour: 18, minute: 30, points: [{ x: 100, z: 100, label: 'Marina drop' }, { x: -590, z: 430, label: 'Pier drop' }, { x: -50, z: -400, label: 'Hill overlook' }] },
  { id: 9, title: 'THE SUNKEN KEY', contact: 'Lena Marsh', payout: 1500, startWanted: 1, hour: 16, points: [{ x: 180, z: 200, label: 'Dive the marina' }, { x: 40, z: 60, label: 'Unlock the locker' }] },
  { id: 10, title: 'THE LAST WITNESS', contact: 'Elias Frost', payout: 3000, startWanted: 3, hour: 19, points: [{ x: -300, z: -200, label: 'Reach the witness' }, { x: 500, z: 400, label: 'Get them to the port' }] },
];

export const MISSION_TOTAL_PAYOUT = MISSIONS.reduce((s, m) => s + m.payout, 0);
export const MISSION_TOTAL_RP = MISSION_TOTAL_PAYOUT / 10;

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

// Ranks: D at 0, C at 100, B at 300, A at 600, S at 1000.
export const RANKS = [
  { min: 0, code: 'D', name: 'GREENHORN' },
  { min: 100, code: 'C', name: 'RUNNER' },
  { min: 300, code: 'B', name: 'NIGHTHAWK' },
  { min: 600, code: 'A', name: 'OUTLAW' },
  { min: 1000, code: 'S', name: 'DELTA LEGEND' },
];

// Crew of three. Keys and cooldowns are exact.
export const CREW = [
  { id: 'juno', name: 'Juno Reyes', role: 'Driver', ability: 'CLEAN PLATES', key: 'C', cooldown: 45, cost: 0, district: 'venice', text: 'Wanted -1' },
  { id: 'petra', name: 'Petra Hale', role: 'Mechanic', ability: 'FIELD REPAIR', key: 'V', cooldown: 60, cost: 150, district: 'port', text: 'Condition 100%' },
  { id: 'cassia', name: 'Cassia Wren', role: 'Lookout', ability: 'OVERWATCH', key: 'X', cooldown: 25, duration: 20, cost: 0, district: 'hills', text: 'Police marked 20s' },
];

export const DISPATCH_CALLSIGNS = ['DELTA-7', 'CORAL-3', 'CORAL-9', 'AIR-1'];
export const SWAT_CALLSIGN = 'SWAT-1';
export const AIR_UNIT_NAME = 'AIR-1';

export const PED_COUNT = 104;
export const TRAFFIC_DAY = 16;
export const TRAFFIC_NIGHT = 6;
export const TRAFFIC_TOTAL = TRAFFIC_DAY + TRAFFIC_NIGHT;
export const NIGHT_DISCS = 28;

export const WANTED_MAX = 5;
export const HELI_WANTED = 3;
export const ROADBLOCK_WANTED = 4;
export const SWAT_WANTED = 5;
export const AIR_TAKEDOWN_SECONDS = 5;
export const SPIKE_SLOW_SECONDS = 5;

export const COLLISION = { minSpeed: 5, mult: 1.2, minDamage: 5, cooldown: 0.5 };

export const STANDING_GAIN = { mission: 10, race: 5, job: 3 };
export const STANDING_DISCOUNT_AT = 50;
export const STANDING_DISCOUNT = 0.1;

export const RACE = { checkpoints: 5, reward: 350, standing: 5 };
export const JOBS = {
  taxi: { name: 'TAXI', reward: 120, standing: 3 },
  courier: { name: 'COURIER', reward: 150, standing: 3 },
};
export const TAPES_TOTAL = 20;
export const TAPE_BONUS = 50;

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'ENGINE', price: 1200, text: 'Higher top speed' },
  { id: 'armour', name: 'ARMOUR', price: 900, text: 'Less collision damage' },
  { id: 'nitro', name: 'NITRO', price: 800, text: 'Boost on SHIFT' },
];

export const COVER_MAX = 100;
export const WITNESS_SECONDS = 3;
export const WITNESS_RANGE = 45;

export const BOAT = { x: 600, z: 650, name: 'DELTA SKIFF' };
export const CRANE = { x: 450, z: 470 };
export const SHOP = { x: -320, z: -180, name: 'DELTA ARMS' };
export const GARAGE_POS = { x: -180, z: -180, name: 'DELTA GARAGE' };
export const PIER_DECK = { x0: -780, z0: 360, x1: -620, z1: 500 };
