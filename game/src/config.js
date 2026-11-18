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
  { id: 0, name: 'PISTOL', dmg: 34, mag: 12, reserve: 120, rate: 0.22, spread: 0.012, range: 120, auto: false },
  { id: 1, name: 'SMG', dmg: 17, mag: 30, reserve: 240, rate: 0.085, spread: 0.03, range: 90, auto: true },
  { id: 2, name: 'SHOTGUN', dmg: 13, mag: 6, reserve: 48, rate: 0.85, spread: 0.07, range: 55, auto: false, pellets: 7 },
];

export const VEHICLE_DEFS = {
  sedan: { name: 'SEDAN', accel: 14, top: 34, reverse: 10, turn: 1.9, grip: 6.5, brake: 26, len: 4.6, wid: 2.0 },
  suv: { name: 'SUV', accel: 11, top: 30, reverse: 9, turn: 1.6, grip: 6.0, brake: 24, len: 5.0, wid: 2.2 },
  pickup: { name: 'PICKUP', accel: 12, top: 31, reverse: 9, turn: 1.7, grip: 6.2, brake: 24, len: 5.2, wid: 2.1 },
  sport: { name: 'SPORT', accel: 19, top: 42, reverse: 8, turn: 2.3, grip: 7.2, brake: 30, len: 4.4, wid: 2.0 },
  bike: { name: 'BIKE', accel: 18, top: 38, reverse: 6, turn: 2.6, grip: 5.0, brake: 22, len: 2.4, wid: 0.8 },
  police: { name: 'PATROL', accel: 15, top: 36, reverse: 10, turn: 2.0, grip: 7.0, brake: 28, len: 4.8, wid: 2.1 },
};

export const PLAYER = {
  walkSpeed: 5.2, runSpeed: 9.5, health: 100, armor: 50, money: 250,
  spawn: { x: 600, z: 700, heading: Math.PI }, // south avenue, facing north (into the city)
};

export const SAVE_KEY = 'neon-delta-la.save.v3';

// Mission + side-job data. Steps: goto | steal | deliver | chase | escape | survive | visit | talk
export const MISSIONS = [
  { id: 1, name: 'RETURN TO LA', brief: 'Mara is back. Steal a sedan and get to the safehouse.',
    steps: [
      { type: 'goto', x: 600, z: 560, r: 10, text: 'Get to the parked sedan on Coral Avenue.' },
      { type: 'steal', kind: 'sedan', text: 'Take the sedan. Press F next to it.' },
      { type: 'goto', x: 100, z: -500, r: 14, text: 'Drive to the Downtown safehouse.', inCar: true },
    ], reward: 400 },
  { id: 2, name: 'MIDNIGHT CARGO', brief: 'A crate at the port needs to reach the Marina. No questions.',
    steps: [
      { type: 'goto', x: 520, z: 560, r: 12, text: 'Pick up the crate at Long Beach Port.' },
      { type: 'deliver', x: -480, z: -560, r: 14, text: 'Deliver the crate to the Marina. Keep it quiet.', inCar: true },
    ], reward: 650 },
  { id: 3, name: 'FESTIVAL OF LIGHTS', brief: 'Something is hidden at Coral Pier. Visit the stalls.',
    steps: [
      { type: 'goto', x: -700, z: 300, r: 16, text: 'Go to Coral Pier.' },
      { type: 'visit', points: [[-740, 260], [-760, 340], [-730, 420]], r: 8, text: 'Check the three game stalls on the pier.' },
      { type: 'goto', x: -600, z: 300, r: 12, text: 'Get back to the beach road.' },
    ], reward: 700 },
  { id: 4, name: 'CANAL CROSSING', brief: 'A courier is running the canals. Stay on his tail.',
    steps: [
      { type: 'goto', x: -400, z: 500, r: 12, text: 'Find the courier near the canals.' },
      { type: 'chase', seconds: 20, text: 'Stay close to the courier for 20 seconds.' },
      { type: 'goto', x: 0, z: 100, r: 14, text: 'Lose him at the Midtown crossing.', inCar: true },
    ], reward: 800 },
  { id: 5, name: 'LAST BRIDGE', brief: 'The whole force is after you. Break the line, then cross.',
    steps: [
      { type: 'escape', text: 'Lose the police. Break line of sight, swap cars, or change clothes.' },
      { type: 'goto', x: 700, z: -300, r: 14, text: 'Cross the Freeway bridge, clean.', inCar: true },
    ], reward: 1000, startWanted: 4 },
  { id: 6, name: 'THE BURNING CITY', brief: 'The proof is in three places. Get it all, then vanish.',
    steps: [
      { type: 'visit', points: [[100, -500], [-480, -560], [520, 560]], r: 10, text: 'Collect the proof: safehouse, marina, port.' },
      { type: 'goto', x: 0, z: 700, r: 16, text: 'Reach the south gate and disappear.', inCar: true },
    ], reward: 2000, startWanted: 3 },
];

export const SIDE_JOBS = [
  { id: 'taxi', name: 'TAXI FARE', text: 'Pick up the passenger and drop them off.', reward: 150 },
  { id: 'delivery', name: 'COURIER RUN', text: 'Deliver the package across town.', reward: 180 },
  { id: 'vigilante', name: 'STREET JUSTICE', text: 'Wreck the target car.', reward: 250 },
  { id: 'stunt', name: 'STUNT JUMP', text: 'Hit the ramp at speed.', reward: 200 },
];
