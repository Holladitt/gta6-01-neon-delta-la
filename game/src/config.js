// Neon Delta LA — config: world layout, districts, tuning, weapons, missions.
// All original content. No Rockstar names, characters, maps or assets.
export const WORLD = {
  HALF: 800,            // world extends x,z in [-800, 800]
  OCEAN_X: -720,        // water begins west of this x
  BEACH_X: -660,        // sand strip ends here (boardwalk meets land)
  ROAD_W: 22,
  WALK_W: 7,
  AVENUES: [-600, -400, -200, 0, 200, 400, 600],
  STREETS: [-600, -400, -200, 0, 200, 400, 600],
  GRID: 200,
};

export const DISTRICTS = [
  { id: 'downtown', name: 'DOWNTOWN', sub: 'Glassline Towers', x0: -320, z0: -720, x1: 320, z1: -80, kind: 'towers' },
  { id: 'marina', name: 'MARINA', sub: 'Yachts & Canals', x0: -660, z0: -720, x1: -340, z1: -80, kind: 'low' },
  { id: 'hills', name: 'HOLLYWOOD HILLS', sub: 'Overlook Estates', x0: -660, z0: -800, x1: 660, z1: -720, kind: 'hills' },
  { id: 'pier', name: 'CORAL PIER', sub: 'Amusement Pier & Boardwalk', x0: -800, z0: 120, x1: -600, z1: 480, kind: 'pier' },
  { id: 'canals', name: 'VENICE CANALS', sub: 'Bridges & Waterways', x0: -660, z0: 420, x1: -120, z1: 720, kind: 'canal' },
  { id: 'port', name: 'LONG BEACH PORT', sub: 'Container Terminal', x0: 340, z0: 340, x1: 720, z1: 720, kind: 'port' },
  { id: 'freeway', name: 'FREEWAY', sub: 'Delta Expressway', x0: 660, z0: -720, x1: 800, z1: 720, kind: 'freeway' },
  { id: 'coral', name: 'CORAL STRIP', sub: 'Beachfront Hotels', x0: -660, z0: -80, x1: -120, z1: 420, kind: 'mid' },
  { id: 'midtown', name: 'MIDTOWN', sub: 'Shops & Theatres', x0: -120, z0: -80, x1: 660, z1: 340, kind: 'mid' },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  return DISTRICTS[8];
}

export const PALETTE = {
  skyDay: 0x87c5e8, skyGold: 0xffb347, skyDusk: 0xff7e5f,
  sun: 0xfff2d0, hemiSky: 0xbfe3ff, hemiGround: 0x8a7a5a,
  asphalt: '#3a3a40', sidewalk: '#b8a88f', sand: '#e8cf9a', grass: '#7fae62',
  water: 0x1e6f9e, coral: 0xff2e4d, turquoise: 0x2ec4b6, sodium: 0xffc53d,
};

export const KEYS = {
  fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  sprint: 'ShiftLeft', handbrake: 'Space', enter: 'KeyF', interact: 'KeyE',
  reload: 'KeyR', horn: 'KeyH', radio: 'KeyQ', pause: 'Escape',
  save: 'KeyN', mission: 'KeyM', map: 'Tab',
  w1: 'Digit1', w2: 'Digit2', w3: 'Digit3',
};

export const WEAPONS = [
  { id: 0, name: 'PISTOL', dmg: 34, mag: 12, reserve: 120, rate: 0.22, spread: 0.012, range: 120, auto: false, price: 0 },
  { id: 1, name: 'SMG', dmg: 17, mag: 30, reserve: 240, rate: 0.085, spread: 0.03, range: 90, auto: true, price: 0 },
  { id: 2, name: 'SHOTGUN', dmg: 13, mag: 6, reserve: 48, rate: 0.85, spread: 0.07, range: 55, auto: false, pellets: 7, price: 0 },
  // v12 gun-shop stock (DELTA ARMS). Prices are real: every one is payable
  // from real mission money (M1-M6 pay $5,550 + $250 start = $5,800; all
  // three cost $5,200 together). Locked until bought — no fake unlocks.
  { id: 3, name: 'DELTA CARBINE', dmg: 26, mag: 30, reserve: 180, rate: 0.12, spread: 0.02, range: 130, auto: true, price: 900 },
  { id: 4, name: 'LONGSHOT', dmg: 95, mag: 5, reserve: 25, rate: 1.1, spread: 0.004, range: 180, auto: false, price: 1800 },
  { id: 5, name: 'MARAUDER', dmg: 14, mag: 60, reserve: 300, rate: 0.07, spread: 0.035, range: 100, auto: true, price: 2500 },
];

// DELTA ARMS — the gun shop. B opens it anywhere (menu access); the
// storefront stands at the Midtown shophouse row, where E/B near the door
// shows the shop prompt. All three new weapons are sold here, nowhere else.
export const SHOP = {
  name: 'DELTA ARMS',
  sub: 'GUNS & AMMO — MIDTOWN',
  x: 90, z: 112, // door of the last shophouse on the row (z = 100, face +12)
  radius: 14,
  key: 'KeyB',
};

export const VEHICLE_DEFS = {
  sedan: { name: 'SEDAN', model: 'MERIDIAN S', accel: 14, top: 34, reverse: 10, turn: 1.9, grip: 6.5, brake: 26, len: 4.6, wid: 2.0 },
  suv: { name: 'SUV', model: 'TERRA X', accel: 11, top: 30, reverse: 9, turn: 1.6, grip: 6.0, brake: 24, len: 5.0, wid: 2.2 },
  pickup: { name: 'PICKUP', model: 'HARROW P', accel: 12, top: 31, reverse: 9, turn: 1.7, grip: 6.2, brake: 24, len: 5.2, wid: 2.1 },
  sport: { name: 'SPORT', model: 'SOLSTICE GT', accel: 19, top: 42, reverse: 8, turn: 2.3, grip: 7.2, brake: 30, len: 4.4, wid: 2.0 },
  bike: { name: 'BIKE', model: 'SPARROW R', accel: 18, top: 38, reverse: 6, turn: 2.6, grip: 5.0, brake: 22, len: 2.4, wid: 0.8 },
  police: { name: 'PATROL', model: 'NDPD INTERCEPTOR', accel: 15, top: 36, reverse: 10, turn: 2.0, grip: 7.0, brake: 28, len: 4.8, wid: 2.1 },
};

// Rank ladder: RP = payout / 10, accumulated from missions + side jobs.
// Titles are original (checked against the top-5 leaderboard findings).
export const RANKS = [
  { letter: 'D', title: 'GREENHORN', minRp: 0 },
  { letter: 'C', title: 'RUNNER', minRp: 100 },
  { letter: 'B', title: 'NIGHTHAWK', minRp: 300 },
  { letter: 'A', title: 'OUTLAW', minRp: 600 },
  { letter: 'S', title: 'DELTA LEGEND', minRp: 1000 },
];

// Crew: three named members, three REAL abilities (v12: all three work).
// Juno (driver): CLEAN PLATES — swap plates, wanted -1, 45s cooldown.
// Petra (mechanic): FIELD REPAIR — fix the current car to 100% condition,
// $150 in parts, 60s cooldown. Cassia (lookout): OVERWATCH — police
// callsigns + distances on the minimap for 20s, 45s cooldown.
export const CREW = [
  { id: 'juno', name: 'JUNO REYES', role: 'DRIVER', ability: { id: 'plates', label: 'CLEAN PLATES', key: 'KeyC', cooldown: 45, desc: 'Swap plates — wanted -1' } },
  { id: 'petra', name: 'PETRA HALE', role: 'MECHANIC', ability: { id: 'repair', label: 'FIELD REPAIR', key: 'KeyV', cooldown: 60, cost: 150, desc: 'Fix the car to 100% — $150 parts' } },
  { id: 'cassia', name: 'CASSIA WREN', role: 'LOOKOUT', ability: { id: 'overwatch', label: 'OVERWATCH', key: 'KeyX', cooldown: 45, duration: 20, desc: 'Track police on the minimap — 20s' } },
];

// NDPD unit callsigns (original; pool is cycled by unit index).
export const CALLSIGNS = ['DELTA-7', 'DELTA-12', 'CORAL-3', 'CORAL-9', 'PIER-5', 'HARBOR-2', 'VENICE-8', 'DELTA-21', 'MARINA-4', 'FREEWAY-6'];

export const PLAYER = {
  walkSpeed: 5.2, runSpeed: 9.5, health: 100, armor: 50, money: 250,
  spawn: { x: 600, z: 700, heading: Math.PI }, // south avenue, facing north (into the city)
};

export const SAVE_KEY = 'neon-delta-la.save.v3';

// Mission + side-job data. Steps: goto | steal | deliver | chase | escape | survive | visit | talk
// stages: groups of step indices with a title. Stages only VIEW the steps —
// they never change step order, step content, or the reward.
export const MISSIONS = [
  { id: 1, name: 'RETURN TO LA', brief: 'Mara is back. Steal a sedan and get to the safehouse.',
    contact: { name: 'EDEN VOSS', role: 'SAFEHOUSE KEEPER', skin: 0xc68642, hair: 0x777777, hairStyle: 'short', shirt: 0x2c3e50 },
    stages: [
      { title: 'GET WHEELS', steps: [0, 1] },
      { title: 'REACH THE SAFEHOUSE', steps: [2] },
    ],
    steps: [
      { type: 'goto', x: 600, z: 560, r: 10, text: 'Get to the parked sedan on Coral Avenue.' },
      { type: 'steal', kind: 'sedan', text: 'Take the sedan. Press F next to it.' },
      { type: 'goto', x: 100, z: -500, r: 14, text: 'Drive to the Downtown safehouse.', inCar: true },
    ], reward: 400 },
  { id: 2, name: 'MIDNIGHT CARGO', brief: 'A crate at the port needs to reach the Marina. No questions.',
    contact: { name: 'HARLAN DRAY', role: 'DOCK FIXER', skin: 0x8d5524, hair: 0x1a1a1a, hairStyle: 'cap', cap: 0x2471a3, shirt: 0x5d6d7e },
    stages: [
      { title: 'PICK UP THE CRATE', steps: [0] },
      { title: 'DELIVER TO THE MARINA', steps: [1] },
    ],
    steps: [
      { type: 'goto', x: 520, z: 560, r: 12, text: 'Pick up the crate at Long Beach Port.' },
      { type: 'deliver', x: -480, z: -560, r: 14, text: 'Deliver the crate to the Marina. Keep it quiet.', inCar: true },
    ], reward: 650 },
  { id: 3, name: 'FESTIVAL OF LIGHTS', brief: 'Something is hidden at Coral Pier. Visit the stalls.',
    contact: { name: 'LUCIA MARLOW', role: 'PIER VENDOR', skin: 0xe0ac69, hair: 0x4a2c0a, hairStyle: 'bun', shirt: 0xff7e5f },
    stages: [
      { title: 'REACH THE PIER', steps: [0] },
      { title: 'CHECK THE STALLS', steps: [1] },
      { title: 'GET BACK TO THE ROAD', steps: [2] },
    ],
    steps: [
      { type: 'goto', x: -700, z: 300, r: 16, text: 'Go to Coral Pier.' },
      { type: 'visit', points: [[-740, 260], [-760, 340], [-730, 420]], r: 8, text: 'Check the three game stalls on the pier.' },
      { type: 'goto', x: -600, z: 300, r: 12, text: 'Get back to the beach road.' },
    ], reward: 700 },
  { id: 4, name: 'CANAL CROSSING', brief: 'A courier is running the canals. Stay on his tail.',
    contact: { name: 'DANTE KOVAC', role: 'CANAL RUNNER', skin: 0xf1c27d, hair: 0x2c2c2c, hairStyle: 'short', shirt: 0x229954 },
    stages: [
      { title: 'FIND THE COURIER', steps: [0] },
      { title: 'STAY ON HIS TAIL', steps: [1] },
      { title: 'LOSE HIM AT MIDTOWN', steps: [2] },
    ],
    steps: [
      { type: 'goto', x: -400, z: 500, r: 12, text: 'Find the courier near the canals.' },
      { type: 'chase', seconds: 20, text: 'Stay close to the courier for 20 seconds.' },
      { type: 'goto', x: 0, z: 100, r: 14, text: 'Lose him at the Midtown crossing.', inCar: true },
    ], reward: 800 },
  { id: 5, name: 'LAST BRIDGE', brief: 'The whole force is after you. Break the line, then cross.',
    contact: { name: 'SABLE OKONKWO', role: 'FREEWAY CONTACT', skin: 0xa06a3a, hair: 0x1a1a1a, hairStyle: 'bandana', bandana: 0x2ec4b6, shirt: 0x1a1a2e },
    stages: [
      { title: 'BREAK THE LINE', steps: [0] },
      { title: 'CROSS THE BRIDGE', steps: [1] },
    ],
    steps: [
      { type: 'escape', text: 'Lose the police. Break line of sight, swap cars, or change clothes.' },
      { type: 'goto', x: 700, z: -300, r: 14, text: 'Cross the Freeway bridge, clean.', inCar: true },
    ], reward: 1000, startWanted: 4 },
  { id: 6, name: 'THE BURNING CITY', brief: 'The proof is in three places. Get it all, then vanish.',
    contact: { name: 'VERA LINDQVIST', role: 'CITY HALL SOURCE', skin: 0xffdbac, hair: 0xd4a017, hairStyle: 'bun', shirt: 0x7d3c98 },
    stages: [
      { title: 'COLLECT THE PROOF', steps: [0] },
      { title: 'VANISH AT THE SOUTH GATE', steps: [1] },
    ],
    steps: [
      { type: 'visit', points: [[100, -500], [-480, -560], [520, 560]], r: 10, text: 'Collect the proof: safehouse, marina, port.' },
      { type: 'goto', x: 0, z: 700, r: 16, text: 'Reach the south gate and disappear.', inCar: true },
    ], reward: 2000, startWanted: 3 },
  // v12: two new missions (total 8). M7 runs at NIGHT (startHour 21.5 — the
  // clock is set when the mission starts, a real time rule, not a label).
  // M8 starts at dusk (18.5) and night falls while it runs.
  { id: 7, name: 'THE NIGHT LEDGER', brief: 'Inez keeps the harbor ledger after dark. Meet her on the pier, find the pages, bring them home.',
    contact: { name: 'INEZ VARGAS', role: 'NIGHT DOCK CLERK', skin: 0xc68642, hair: 0x4a2c0a, hairStyle: 'ponytail', shirt: 0xffc53d },
    stages: [
      { title: 'MEET INEZ AT THE PIER', steps: [0] },
      { title: 'FIND THE LEDGER PAGES', steps: [1] },
      { title: 'DELIVER TO THE SAFEHOUSE', steps: [2] },
    ],
    steps: [
      { type: 'goto', x: -700, z: 300, r: 16, text: 'Meet Inez on Coral Pier — after dark.' },
      { type: 'visit', points: [[-740, 260], [-730, 420]], r: 8, text: 'Find the two ledger pages on the pier.' },
      { type: 'goto', x: 100, z: -500, r: 14, text: 'Deliver the ledger to the Downtown safehouse.', inCar: true },
    ], reward: 1200, startHour: 21.5 },
  { id: 8, name: 'THE LAST SIGNAL', brief: 'Orin can put the proof on the air — if the drive reaches the overlook before the NDPD locks the city down.',
    contact: { name: 'ORIN BECK', role: 'PIRATE RADIO HOST', skin: 0x8d5524, hair: 0x777777, hairStyle: 'short', shirt: 0x2471a3 },
    stages: [
      { title: 'GET THE BROADCAST DRIVE', steps: [0] },
      { title: 'SWEEP THE DEAD DROPS', steps: [1] },
      { title: 'BROADCAST FROM THE OVERLOOK', steps: [2] },
    ],
    steps: [
      { type: 'goto', x: 520, z: 560, r: 12, text: 'Pick up the broadcast drive at Long Beach Port.' },
      { type: 'visit', points: [[-480, -560], [-700, 300]], r: 10, text: 'Sweep the dead drops: marina, then the pier.' },
      { type: 'goto', x: 0, z: -700, r: 16, text: 'Reach the overlook and broadcast the proof.', inCar: true },
    ], reward: 2500, startHour: 18.5, startWanted: 2 },
  // v13: two more missions (total 10). M9 is a daytime marina recovery;
  // M10 is the hot finale — the last witness out, with the NDPD already
  // hunting (startWanted 3).
  { id: 9, name: 'THE SUNKEN KEY', brief: 'Lena dropped the marina master key in the shallows — and it opens the port storage unit with the rigged crane manifests inside.',
    contact: { name: 'LENA MARSH', role: 'MARINA DOCKHAND', skin: 0xf1c27d, hair: 0x6b4423, hairStyle: 'ponytail', shirt: 0x2ec4b6 },
    stages: [
      { title: 'MEET LENA AT THE MARINA', steps: [0] },
      { title: 'DIVE FOR THE SUNKEN KEY', steps: [1] },
      { title: 'UNLOCK THE STORAGE UNIT', steps: [2] },
    ],
    steps: [
      { type: 'goto', x: -480, z: -560, r: 14, text: 'Meet Lena at the marina dock.' },
      { type: 'visit', points: [[-560, -480], [-420, -620]], r: 10, text: 'Search the marina shallows for the sunken key.' },
      { type: 'goto', x: 520, z: 560, r: 14, text: 'Take the key to the port storage unit and open it.', inCar: true },
    ], reward: 1500 },
  { id: 10, name: 'THE LAST WITNESS', brief: 'Elias saw the mayor\u2019s men torch the evidence — and he will testify, if Mara gets him out of the hills before the NDPD cordon closes.',
    contact: { name: 'ELIAS FROST', role: 'EX-DETECTIVE IN HIDING', skin: 0xd9a066, hair: 0xbbbbbb, hairStyle: 'short', shirt: 0x5d6d7e },
    stages: [
      { title: 'FIND ELIAS IN THE HILLS', steps: [0] },
      { title: 'ESCORT ELIAS TO THE CANALS', steps: [1] },
      { title: 'GET ELIAS TO THE PIER BOAT', steps: [2] },
    ],
    steps: [
      { type: 'goto', x: -300, z: -650, r: 14, text: 'Find Elias at the hills hideout.' },
      { type: 'goto', x: -400, z: 500, r: 14, text: 'Walk Elias to the canal safehouse — stay out of sight.' },
      { type: 'goto', x: -700, z: 300, r: 14, text: 'Drive Elias to the pier boat before the cordon closes.', inCar: true },
    ], reward: 3000, startWanted: 3 },
];

export const SIDE_JOBS = [
  { id: 'taxi', name: 'TAXI FARE', text: 'Pick up the passenger and drop them off.', reward: 150 },
  { id: 'delivery', name: 'COURIER RUN', text: 'Deliver the package across town.', reward: 180 },
  { id: 'vigilante', name: 'STREET JUSTICE', text: 'Wreck the target car.', reward: 250 },
  { id: 'stunt', name: 'STUNT JUMP', text: 'Hit the ramp at speed.', reward: 200 },
];
