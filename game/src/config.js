// config.js — Neon Delta LA: District Wars. Every number comes from the brief.
// Six districts, six weapons in four tiers, ten missions, crew, ranks, prices.
export const TITLE = 'Neon Delta LA: District Wars';
export const ENTRY_TITLE = 'Neon Delta LA: District Wars — 6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers, 3 save slots, street races';
export const MAP_COVERAGE = '6 districts across 1,560 x 1,560 units of coastal Los Angeles';
export const SAVE_KEY = 'neon-delta-la.save.v3';
export const PED_COUNT = 104;
export const TRAFFIC_TOTAL = 22;
export const NIGHT_DISCS = 28;
export const WANTED_MAX = 5;
export const COVER_MAX = 100;
export const TAPES_TOTAL = 20;
export const TAPE_BONUS = 50;

export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x0: -500, z0: -600, x1: 0, z1: -150 },
  { id: 'hills', name: 'Hollywood Hills', x0: 0, z0: -600, x1: 500, z1: -150 },
  { id: 'venice', name: 'Venice', x0: -650, z0: -150, x1: -150, z1: 250 },
  { id: 'marina', name: 'Marina', x0: -150, z0: -150, x1: 350, z1: 250 },
  { id: 'pier', name: 'Coral Pier', x0: -780, z0: 250, x1: -150, z1: 520 },
  { id: 'port', name: 'Long Beach Port', x0: -150, z0: 250, x1: 780, z1: 700 },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  let best = DISTRICTS[0];
  let bd = Infinity;
  for (const d of DISTRICTS) {
    const cx = (d.x0 + d.x1) / 2;
    const cz = (d.z0 + d.z1) / 2;
    const dd = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}
export function districtById(id) {
  return DISTRICTS.find((d) => d.id === id);
}

export const STANDING_GAIN = { mission: 10, race: 5, job: 3 };

export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', tier: 1, price: 0, dmg: 12, mag: 12, range: 40, fireRate: 0.5, owned: true },
  { id: 'smg', name: 'SMG', tier: 1, price: 0, dmg: 8, mag: 30, range: 35, fireRate: 0.12, owned: true },
  { id: 'shotgun', name: 'SHOTGUN', tier: 1, price: 0, dmg: 30, mag: 6, range: 18, fireRate: 0.9, owned: true },
  { id: 'carbine', name: 'DELTA CARBINE', tier: 2, price: 900, dmg: 18, mag: 30, range: 60, fireRate: 0.15, owned: false },
  { id: 'longshot', name: 'LONGSHOT', tier: 3, price: 1800, dmg: 45, mag: 8, range: 120, fireRate: 1.2, owned: false },
  { id: 'marauder', name: 'MARAUDER', tier: 4, price: 2500, dmg: 60, mag: 100, range: 80, fireRate: 0.1, owned: false },
];
export function weaponById(id) {
  return WEAPONS.find((w) => w.id === id);
}
export function tierName(tier) {
  return ['', 'STANDARD', 'TACTICAL', 'PRECISION', 'HEAVY'][tier] || 'STANDARD';
}

export const MISSIONS = [
  { id: 1, name: 'The Getaway', contact: 'Eden Voss', hour: 10, payout: 400, district: 'downtown', points: [{ x: -320, z: -350, label: 'Pick up Eden' }, { x: -280, z: -420, label: 'Lose the tail' }] },
  { id: 2, name: 'Venice Canals', contact: 'Harlan Dray', hour: 12, payout: 650, district: 'venice', points: [{ x: -320, z: 120, label: 'Meet Harlan' }, { x: -320, z: 200, label: 'Drop the package' }] },
  { id: 3, name: 'The Marina Job', contact: 'Lucia Marlow', hour: 14, payout: 700, district: 'marina', points: [{ x: 160, z: 80, label: 'Meet Lucia' }, { x: 160, z: 150, label: 'Collect the keys' }] },
  { id: 4, name: 'Downtown Heat', contact: 'Dante Kovac', hour: 16, payout: 800, district: 'downtown', points: [{ x: -320, z: -300, label: 'Meet Dante' }, { x: -320, z: -450, label: 'Grab the cash' }] },
  { id: 5, name: 'The Last Bridge', contact: 'Sable Okonkwo', hour: 18, payout: 1000, district: 'hills', points: [{ x: 160, z: -300, label: 'Meet Sable' }, { x: 160, z: -200, label: 'Cross the bridge' }] },
  { id: 6, name: 'Hillside Drop', contact: 'Vera Lindqvist', hour: 20, payout: 2000, district: 'hills', points: [{ x: 400, z: -500, label: 'Meet Vera' }, { x: 400, z: -400, label: 'Deliver the drive' }] },
  { id: 7, name: 'The Night Ledger', contact: 'Inez Vargas', hour: 21, payout: 1200, district: 'pier', points: [{ x: -652, z: 428, label: 'Meet Inez' }, { x: -700, z: 450, label: 'Take the ledger' }] },
  { id: 8, name: 'The Last Signal', contact: 'Orin Beck', hour: 18, payout: 2500, district: 'port', startWanted: 2, points: [{ x: 530, z: 500, label: 'Marina drop' }, { x: 520, z: 410, label: 'Pier drop' }, { x: -50, z: -400, label: 'Overlook' }] },
  { id: 9, name: 'The Sunken Key', contact: 'Lena Marsh', hour: 9, payout: 1500, district: 'marina', points: [{ x: 150, z: 120, label: 'Meet Lena' }, { x: 250, z: 200, label: 'Raise the key' }] },
  { id: 10, name: 'The Last Witness', contact: 'Elias Frost', hour: 11, payout: 3000, district: 'downtown', startWanted: 3, points: [{ x: -80, z: -250, label: 'Meet Elias' }, { x: -80, z: -450, label: 'Protect the witness' }] },
];
export const MISSION_TOTAL_PAYOUT = MISSIONS.reduce((s, m) => s + m.payout, 0);
export const MISSION_TOTAL_RP = MISSIONS.reduce((s, m) => s + Math.round(m.payout / 10), 0);

export const RANKS = [
  { code: 'D', name: 'GREENHORN', rp: 0 },
  { code: 'C', name: 'RUNNER', rp: 100 },
  { code: 'B', name: 'NIGHTHAWK', rp: 300 },
  { code: 'A', name: 'OUTLAW', rp: 600 },
  { code: 'S', name: 'DELTA LEGEND', rp: 1000 },
];

export const CREW = [
  { id: 'juno', name: 'Juno Reyes', role: 'driver', ability: 'CLEAN PLATES', key: 'C', cooldown: 45 },
  { id: 'petra', name: 'Petra Hale', role: 'mechanic', ability: 'FIELD REPAIR', key: 'V', cooldown: 60, cost: 150 },
  { id: 'cassia', name: 'Cassia Wren', role: 'lookout', ability: 'OVERWATCH', key: 'X', cooldown: 25, duration: 20 },
];

export const RACE = { checkpoints: 5, reward: 300 };
export const JOBS = {
  taxi: { name: 'Taxi', reward: 120 },
  courier: { name: 'Courier', reward: 150 },
};

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine', price: 1200, desc: 'Higher top speed' },
  { id: 'armour', name: 'Armour', price: 900, desc: 'Less collision damage' },
  { id: 'nitro', name: 'Nitro', price: 800, desc: 'Boost on demand' },
];

export const SHOP = { x: -340, z: -200, name: 'DELTA ARMS' };
export const GARAGE_POS = { x: -360, z: -320 };
export const CRANE = { x: 600, z: 560 };
export const BOAT = { x: 565, z: 648 };
export const PIER_DECK = { x0: -780, z0: 360, x1: -620, z1: 500 };
