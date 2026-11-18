// Neon Delta LA — every tuning number, colour and district in one place.
// The city is a fixed 2600 x 1900 coastal grid; the simulation runs in that
// 2D plane (x east, y south) and the 3D scene maps it to (x, 0, y). The fixed
// step is 1/60 s and no rule here depends on screen size.
export const STEP = 1 / 60;
export const WORLD = { w: 2600, h: 1900 };
export const SAVE_KEY = 'neon-delta-la.save.v2';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Warm golden-hour palette, calibrated to the San Andreas feel: a deeply
// saturated orange-gold horizon, golden-pink mid-sky, a light rose above,
// and warm light washing the streets (the asphalt itself reads warm brown,
// never cold grey). Nothing dark or gloomy at dusk.
export const PALETTE = {
  skyTop: '#c98aa0', skyMid: '#ffa06a', skyHorizon: '#ff9e3d', skyEast: '#a8dcd8',
  nightTop: '#1c1440', nightMid: '#4a2a68', nightHorizon: '#ff8a6a', nightEast: '#2a3a5a',
  fogDusk: '#f5ab72', fogNight: '#5a4066',
  sea: '#19b8c9', sand: '#f2d492', land: '#8a7a5e', sidewalk: '#c9b8a3',
  road: '#332e38', roadLine: '#ffd23e', crane: '#e5382e',
  text: '#fff7ea', muted: '#ffd9a0', panel: 'rgba(16,10,32,0.82)',
  accent: '#ff7a1a', cyan: '#2ee6d6', pink: '#ff4d8d', money: '#7dffa8',
  police: '#e8ecf5', policeBlue: '#2e6bff', policeRed: '#ff2e4d',
};

// Avenues run north-south, streets east-west. The canal cuts north-south
// between the two middle avenues; bridges cross it at each street.
export const AVENUES = [300, 700, 1100, 1500, 1900];
export const STREETS = [300, 650, 1000, 1350, 1650];
export const CANAL = { x0: 1240, x1: 1330, y0: 120, y1: 1780 };
export const BEACH = { x0: 2250, seaX: 2460 };
export const PORT = { x0: 150, x1: 1050, y0: 1680, y1: 1880 };
// Coral Pier: the amusement pier on the beach, named for the Coral Strip
// district it belongs to — an original name, nothing borrowed from Rockstar.
// The boardwalk runs east from the sand into the sea at y ~ 1093; the
// roller coaster loops south of it, over the water, on its own posts.
export const PIER = {
  name: 'CORAL PIER', x0: 2250, x1: 2620, y: 1093, halfW: 30,
  wheel: { x: 2560, y: 1093, r: 55 },
  coaster: { cx: 2500, cy: 1230, rx: 95, rz: 62, h: 58 },
};

// Districts: name, rect, label colour. The HUD shows the big italic banner
// when the player crosses into a new one.
export const DISTRICTS = [
  { name: 'DOWNTOWN', sub: 'Glassline Towers', x0: 120, y0: 120, x1: 1050, y1: 620, color: '#7fd4ff' },
  { name: 'HOLLYWOOD HILLS', sub: 'Hillside Homes', x0: 120, y0: 620, x1: 1050, y1: 980, color: '#ffd23e' },
  { name: 'VENICE CANALS', sub: 'Canal District', x0: 1100, y0: 120, x1: 1500, y1: 980, color: '#2ee6d6' },
  { name: 'CORAL STRIP', sub: 'Beachfront Hotels', x0: 1900, y0: 120, x1: 2600, y1: 980, color: '#ff4d8d' },
  { name: 'CORAL PIER', sub: 'Amusement Pier & Boardwalk', x0: 1900, y0: 980, x1: 2600, y1: 1350, color: '#ffb347' },
  { name: 'LONG BEACH PORT', sub: 'Container Docks', x0: 120, y0: 1650, x1: 1500, y1: 1900, color: '#f2a541' },
  { name: 'THE MARINA', sub: 'Boats & Boardwalk', x0: 1500, y0: 1350, x1: 2600, y1: 1900, color: '#19b8c9' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  return DISTRICTS[3];
}

// Arcade vehicle feel: sedan balanced, SUV heavy and planted, bike quick and
// loose, truck slow and wide, speedboat only on water, police fast with grip.
// len/wid are sim units; the 3D scene scales them to the same proportions.
export const VEHICLES = {
  sedan: { name: 'Sedan', len: 52, wid: 26, accel: 420, maxSpeed: 560, grip: 6.5, turn: 2.9, drift: 0.55, color: '#ff4d6d', roof: '#ffd23e' },
  suv: { name: 'SUV', len: 58, wid: 30, accel: 340, maxSpeed: 500, grip: 8.0, turn: 2.4, drift: 0.30, color: '#2e6bff', roof: '#dfe8ff' },
  bike: { name: 'Motorbike', len: 44, wid: 16, accel: 520, maxSpeed: 640, grip: 4.2, turn: 3.6, drift: 0.85, color: '#19b8c9', roof: '#12202e' },
  truck: { name: 'Truck', len: 86, wid: 30, accel: 260, maxSpeed: 420, grip: 7.0, turn: 1.9, drift: 0.20, color: '#f2a541', roof: '#7a4a12' },
  boat: { name: 'Speedboat', len: 64, wid: 28, accel: 460, maxSpeed: 600, grip: 3.0, turn: 2.6, drift: 0.90, color: '#ffffff', roof: '#ff7a1a' },
  police: { name: 'Police Cruiser', len: 54, wid: 27, accel: 480, maxSpeed: 600, grip: 7.5, turn: 3.1, drift: 0.35, color: '#e8ecf5', roof: '#2e6bff' },
};

export const PLAYER = { walkSpeed: 230, sprintSpeed: 340, radius: 14, health: 100, armor: 50 };
export const WEAPONS = [
  { name: 'PISTOL', damage: 34, mag: 12, reserve: 72, rate: 0.22, spread: 0.05, range: 420 },
  { name: 'SMG', damage: 18, mag: 30, reserve: 120, rate: 0.09, spread: 0.11, range: 360 },
  { name: 'SHOTGUN', damage: 22, mag: 6, reserve: 36, rate: 0.7, spread: 0.22, range: 260 },
];
