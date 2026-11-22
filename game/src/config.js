// Neon Delta LA: District Wars — all game data in one place.
export const TITLE = 'Neon Delta LA: District Wars';
export const ENTRY_TITLE =
  'Neon Delta LA: District Wars — 6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers, 3 save slots, street races';
export const MAP_COVERAGE = '6 districts across the Neon Delta LA coastal map';

// Districts: 2 columns (west/east) x 3 rows (north/mid/south), x in [-780,780), z in [-700,780).
// The north/mid row boundary sits at z=-250 so the DELTA ARMS shop (z -220)
// and its forecourt read as Venice, the district of mission 2.
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x0: -780, x1: 0, z0: -700, z1: -250 },
  { id: 'hills', name: 'Hollywood Hills', x0: 0, x1: 780, z0: -700, z1: -250 },
  { id: 'venice', name: 'Venice', x0: -780, x1: 0, z0: -250, z1: 350 },
  { id: 'marina', name: 'Marina', x0: 0, x1: 780, z0: -250, z1: 350 },
  { id: 'pier', name: 'Coral Pier', x0: -780, x1: 0, z0: 350, z1: 780 },
  { id: 'port', name: 'Long Beach Port', x0: 0, x1: 780, z0: 350, z1: 780 },
];
export function districtAt(x, z) {
  const col = x < 0 ? 0 : 1;
  const row = z < -250 ? 0 : (z < 350 ? 1 : 2);
  return DISTRICTS[row * 2 + col];
}
export function districtById(id) { return DISTRICTS.find((d) => d.id === id); }

// Weapons: tier 1 owned from the start, tiers 2-4 bought at DELTA ARMS.
export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', tier: 1, price: 0, dmg: 12, mag: 12, reserve: 120, range: 60, owned: true },
  { id: 'smg', name: 'SMG', tier: 1, price: 0, dmg: 8, mag: 30, reserve: 240, range: 55, owned: true },
  { id: 'shotgun', name: 'SHOTGUN', tier: 1, price: 0, dmg: 30, mag: 6, reserve: 48, range: 25, owned: true },
  { id: 'carbine', name: 'DELTA CARBINE', tier: 2, price: 900, dmg: 18, mag: 30, reserve: 180, range: 90, owned: false },
  { id: 'longshot', name: 'LONGSHOT', tier: 3, price: 1800, dmg: 45, mag: 8, reserve: 64, range: 140, owned: false },
  { id: 'marauder', name: 'MARAUDER', tier: 4, price: 2500, dmg: 60, mag: 6, reserve: 48, range: 80, owned: false },
];
export function weaponById(id) { return WEAPONS.find((w) => w.id === id); }
export function tierName(t) {
  return { 1: 'STANDARD', 2: 'TACTICAL', 3: 'PRECISION', 4: 'HEAVY' }[t] || 'STANDARD';
}

// 10 story missions. Payouts sum to $13,750, RP to 1,375, day 11 at the end.
export const MISSIONS = [
  { id: 1, name: 'THE GETAWAY', contact: 'Eden Voss', district: 'downtown', hour: 10, minute: 0, payout: 400, startWanted: 0,
    points: [{ x: -320, z: -300, label: 'Pick up Eden' }, { x: -200, z: -400, label: 'Lose the tail' }] },
  { id: 2, name: 'VENICE CANALS', contact: 'Harlan Dray', district: 'venice', hour: 12, minute: 0, payout: 650, startWanted: 0,
    points: [{ x: -400, z: 100, label: 'Meet Harlan' }, { x: -560, z: 200, label: 'Drop the package' }] },
  { id: 3, name: 'THE LONG CON', contact: 'Lucia Marlow', district: 'marina', hour: 14, minute: 0, payout: 700, startWanted: 0,
    points: [{ x: 100, z: 100, label: 'Meet Lucia' }, { x: 280, z: 200, label: 'Grab the ledger' }] },
  { id: 4, name: 'NIGHT SHIFT', contact: 'Dante Kovac', district: 'hills', hour: 19, minute: 0, payout: 800, startWanted: 0,
    points: [{ x: 200, z: -400, label: 'Meet Dante' }, { x: 400, z: -300, label: 'Move the goods' }] },
  { id: 5, name: 'LAST BRIDGE', contact: 'Sable Okonkwo', district: 'downtown', hour: 11, minute: 0, payout: 1000, startWanted: 0,
    points: [{ x: -100, z: -500, label: 'Break the line' }, { x: 0, z: -560, label: 'Cross the freeway' }] },
  { id: 6, name: 'THE VAULT', contact: 'Vera Lindqvist', district: 'marina', hour: 16, minute: 0, payout: 2000, startWanted: 0,
    points: [{ x: 400, z: 100, label: 'Meet Vera' }, { x: 560, z: 0, label: 'Crack the vault' }] },
  { id: 7, name: 'THE NIGHT LEDGER', contact: 'Inez Vargas', district: 'pier', hour: 21, minute: 30, payout: 1200, startWanted: 0,
    points: [{ x: -700, z: 430, label: 'Meet Inez' }, { x: -660, z: 470, label: 'Take the ledger' }, { x: -720, z: 400, label: 'Slip away' }] },
  { id: 8, name: 'THE LAST SIGNAL', contact: 'Orin Beck', district: 'port', hour: 18, minute: 30, payout: 2500, startWanted: 2,
    points: [{ x: 530, z: 500, label: 'Marina drop' }, { x: 520, z: 410, label: 'Pier drop' }, { x: -50, z: -400, label: 'Overlook' }] },
  { id: 9, name: 'THE SUNKEN KEY', contact: 'Lena Marsh', district: 'marina', hour: 20, minute: 0, payout: 1500, startWanted: 0,
    points: [{ x: 300, z: 200, label: 'Meet Lena' }, { x: 560, z: 280, label: 'Raise the key' }] },
  { id: 10, name: 'THE LAST WITNESS', contact: 'Elias Frost', district: 'hills', hour: 9, minute: 0, payout: 3000, startWanted: 3,
    points: [{ x: 100, z: -500, label: 'Meet Elias' }, { x: 300, z: -560, label: 'Protect the witness' }] },
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
  { id: 'juno', name: 'Juno Reyes', role: 'DRIVER', ability: 'CLEAN PLATES', key: 'C', cooldown: 45 },
  { id: 'petra', name: 'Petra Hale', role: 'MECHANIC', ability: 'FIELD REPAIR', key: 'V', cooldown: 60 },
  { id: 'cassia', name: 'Cassia Wren', role: 'LOOKOUT', ability: 'OVERWATCH', key: 'X', cooldown: 25 },
];
export const PED_COUNT = 104;
export const TRAFFIC_TOTAL = 22;
export const NIGHT_DISCS = 28;
export const WANTED_MAX = 5;
export const STANDING_GAIN = { mission: 10, race: 5, job: 3 };
export const RACE = { checkpoints: 5, reward: 300 };
export const JOBS = {
  taxi: { reward: 150, label: 'Taxi' },
  courier: { reward: 200, label: 'Courier' },
};
export const TAPES_TOTAL = 20;
export const TAPE_BONUS = 50;
export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine', price: 1200, desc: '+25% top speed' },
  { id: 'armour', name: 'Armour', price: 1000, desc: 'Less collision damage' },
  { id: 'nitro', name: 'Nitro', price: 800, desc: 'Boost on [Shift]' },
];
export const COVER_MAX = 100;

// Landmarks (world units; x east, z south, origin at city centre).
export const BOAT = { x: 568, z: 644 };
export const CRANE = { x: 575, z: 556 };
export const SHOP = { x: -354, z: -220 };
export const PIER_DECK = { x0: -780, x1: -620, z0: 360, z1: 500 };
export const GARAGE_POS = { x: -180, z: -320 };

// Building footprints, half-open [x0,x1) x [z0,z1), inset in city blocks so roads
// stay clear. The shop is a separate structure, NOT a BUILDINGS rect.
export const BUILDINGS = [
  { x0: -540, x1: -400, z0: -540, z1: -300, h: 34 },
  { x0: -540, x1: -440, z0: -260, z1: -40, h: 55 },
  { x0: -260, x1: -120, z0: -540, z1: -460, h: 40 },
  { x0: -240, x1: -60, z0: -240, z1: -60, h: 22 },
  { x0: 30, x1: 130, z0: -540, z1: -300, h: 48 },
  { x0: 150, x1: 250, z0: -540, z1: -300, h: 60 },
  { x0: 30, x1: 250, z0: -260, z1: -20, h: 26 },
  { x0: 300, x1: 400, z0: -540, z1: -300, h: 44 },
  { x0: 420, x1: 540, z0: -540, z1: -300, h: 70 },
  { x0: 300, x1: 540, z0: -260, z1: -20, h: 30 },
  { x0: 580, x1: 760, z0: -540, z1: -300, h: 38 },
  { x0: 580, x1: 760, z0: -260, z1: -20, h: 24 },
  { x0: -540, x1: -300, z0: 20, z1: 260, h: 20 },
  { x0: -260, x1: -20, z0: 20, z1: 260, h: 28 },
  { x0: 20, x1: 260, z0: 20, z1: 260, h: 32 },
  { x0: 300, x1: 540, z0: 20, z1: 260, h: 26 },
  { x0: 580, x1: 760, z0: 20, z1: 260, h: 22 },
  { x0: -540, x1: -300, z0: 300, z1: 540, h: 18 },
  { x0: -260, x1: -20, z0: 300, z1: 540, h: 24 },
  { x0: 20, x1: 260, z0: 300, z1: 540, h: 20 },
  { x0: 300, x1: 390, z0: 300, z1: 540, h: 16 },
  { x0: 680, x1: 760, z0: 300, z1: 480, h: 28 },
];
