// Neon Delta LA — static game data: missions, weapons, ranks, districts.
// Every number the simulation checks lives here, written from the design brief.

export const STARTING_CASH = 250;
export const SAVE_KEY = 'neon-delta-la.save.v3';
export const RADIO_LABEL = 'RADIO: NEON 88';

export const CALLSIGNS = ['DELTA-7', 'CORAL-3', 'CORAL-9', 'AIR-1'];

export const WEAPONS = [
  { name: 'PISTOL', price: 0, mag: 12, reserve: 120, dmg: 34, range: 120, auto: false, pellets: 1 },
  { name: 'SMG', price: 0, mag: 30, reserve: 240, dmg: 17, range: 90, auto: true, pellets: 1 },
  { name: 'SHOTGUN', price: 0, mag: 6, reserve: 48, dmg: 13, range: 55, auto: false, pellets: 7 },
  { name: 'DELTA CARBINE', price: 900, mag: 30, reserve: 130, dmg: 26, range: 130, auto: true, pellets: 1 },
  { name: 'LONGSHOT', price: 1800, mag: 5, reserve: 180, dmg: 95, range: 180, auto: false, pellets: 1 },
  { name: 'MARAUDER', price: 2500, mag: 60, reserve: 100, dmg: 14, range: 100, auto: true, pellets: 1 },
];

export const RANKS = [
  { title: 'D GREENHORN', minRp: 0 },
  { title: 'C RUNNER', minRp: 100 },
  { title: 'B NIGHTHAWK', minRp: 300 },
  { title: 'A OUTLAW', minRp: 600 },
  { title: 'S DELTA LEGEND', minRp: 1000 },
];

// Mission steps: goto (reach a point), deliver (reach a point in a car),
// steal (get in a car of a kind), visit (touch every point), chase (stay
// close for a while), escape (wanted back to zero), survive (last a while).
export const MISSIONS = [
  {
    name: 'FIRST GEAR', contact: 'Eden Voss', reward: 400, hour: 9,
    brief: 'Eden needs a package moved across town. Take it slow, take it clean.',
    steps: [
      { type: 'goto', x: 120, z: -80, label: 'Meet Eden' },
      { type: 'deliver', x: -200, z: 150, inCar: true, label: 'Deliver the package' },
    ],
  },
  {
    name: 'HOT WHEELS', contact: 'Harlan Dray', reward: 650, hour: 11,
    brief: 'Harlan wants a sedan, no questions. Lift one and bring it to the yard.',
    steps: [
      { type: 'goto', x: 60, z: 200, label: 'Meet Harlan' },
      { type: 'steal', kind: 'sedan', label: 'Steal a sedan' },
      { type: 'deliver', x: -300, z: -100, inCar: true, label: 'Deliver the sedan' },
    ],
  },
  {
    name: 'DEAD DROP', contact: 'Lucia Marlow', reward: 700, hour: 13,
    brief: 'Three drops, three corners of Midtown. Sweep them before the NDPD does.',
    steps: [
      { type: 'visit', points: [[100, 100], [150, 120], [120, 180]], label: 'Sweep the drops' },
      { type: 'goto', x: -50, z: -200, label: 'Meet Lucia' },
    ],
  },
  {
    name: 'THE LONG WAY', contact: 'Dante Kovac', reward: 800, hour: 15,
    brief: 'A tail that will not quit. Stay on it, then shake it off for good.',
    steps: [
      { type: 'chase', seconds: 20, label: 'Stay on the tail' },
      { type: 'escape', label: 'Lose the heat' },
    ],
  },
  {
    name: 'LAST BRIDGE', contact: 'Sable Okonkwo', reward: 1000, hour: 17,
    brief: 'The whole force is after you. Break the line, then cross the bridge.',
    steps: [
      { type: 'chase', seconds: 20, label: 'Break the line' },
      { type: 'deliver', x: 400, z: -300, inCar: true, label: 'Cross the Freeway bridge' },
    ],
  },
  {
    name: 'NIGHT SHIFT', contact: 'Vera Lindqvist', reward: 2000, hour: 20,
    brief: 'A stash in the dark, a buyer at dawn. Check the stash, then deliver.',
    steps: [
      { type: 'goto', x: -100, z: 300, label: 'Meet Vera' },
      { type: 'visit', points: [[-80, 320], [-120, 280]], label: 'Check the stash' },
      { type: 'deliver', x: 200, z: -250, inCar: true, label: 'Deliver the goods' },
    ],
  },
  {
    name: 'THE NIGHT LEDGER', contact: 'Inez Vargas', reward: 1200, hour: 21.5, startWanted: 0,
    brief: 'The pier never sleeps. Two pages, and nobody sees me take them.',
    steps: [
      { type: 'goto', x: 500, z: 400, label: 'Meet Inez at the pier' },
      { type: 'visit', points: [[520, 410], [480, 390]], label: 'Find the two ledger pages' },
      { type: 'deliver', x: 300, z: 200, label: 'Deliver the ledger' },
    ],
  },
  {
    name: 'THE LAST SIGNAL', contact: 'Orin Beck', reward: 2500, hour: 18.5, startWanted: 2,
    brief: 'The drive is in my hand. Two dead drops, then the whole city hears it.',
    steps: [
      { type: 'visit', points: [[530, 500]], label: 'Sweep the marina drop' },
      { type: 'visit', points: [[520, 410]], label: 'Sweep the pier drop' },
      { type: 'goto', x: -50, z: -400, label: 'Reach the overlook' },
    ],
  },
  {
    name: 'THE SUNKEN KEY', contact: 'Lena Marsh', reward: 1500, hour: 14,
    brief: 'Hold the dock until the boat comes. Then bring the key home.',
    steps: [
      { type: 'goto', x: -400, z: 100, label: 'Meet Lena' },
      { type: 'survive', seconds: 30, label: 'Hold the dock' },
      { type: 'deliver', x: -100, z: -300, inCar: true, label: 'Deliver the key' },
    ],
  },
  {
    name: 'THE LAST WITNESS', contact: 'Elias Frost', reward: 3000, hour: 19, startWanted: 3,
    brief: 'One witness left, and the whole city wants him quiet. Run the gauntlet, then vanish.',
    steps: [
      { type: 'goto', x: 0, z: 0, label: 'Meet Elias' },
      { type: 'chase', seconds: 20, label: 'Run the gauntlet' },
      { type: 'escape', label: 'Vanish' },
    ],
  },
];

export const CREW = [
  { name: 'Juno Reyes', role: 'DRIVER', color: '#5aa9e6' },
  { name: 'Petra Hale', role: 'MECHANIC', color: '#7bc96f' },
  { name: 'Cassia Wren', role: 'LOOKOUT', color: '#b388eb' },
];

export const DISTRICTS = [
  { name: 'DOWNTOWN', sub: 'Glass & Concrete', x: -150, z: -150, r: 260 },
  { name: 'MIDTOWN', sub: 'Shops & Theatres', x: 60, z: 120, r: 240 },
  { name: 'VENICE CANALS', sub: 'Water & Walkways', x: -350, z: 250, r: 180 },
  { name: 'CORAL PIER', sub: 'Amusement Pier & Boardwalk', x: 520, z: 420, r: 200 },
  { name: 'LONG BEACH PORT', sub: 'Container Terminal', x: 620, z: 520, r: 220 },
  { name: 'MARINA', sub: 'Boats & Boardwalk', x: 580, z: 480, r: 160 },
  { name: 'HOLLYWOOD HILLS', sub: 'Hills & Views', x: -50, z: -450, r: 220 },
  { name: 'FREEWAY', sub: 'The Long Way Home', x: 300, z: -300, r: 200 },
];

export const PALETTE = {
  turquoise: 0x2ec4b6,
  coral: 0xff5a5f,
  sodium: 0xffc300,
  asphalt: 0x2b2f36,
  grass: 0x4a7c59,
  sand: 0xd9c08a,
  water: 0x1b6ca8,
};
