// Save / load: pure serialization plus a storage shim
// (localStorage in the browser, an in-memory map in node/tests).
import { SAVE_KEY, WEAPONS } from './config.js';

export function makeSave(data) {
  return {
    v: 3,
    money: data.money | 0,
    mission: data.mission | 0,
    step: data.step | 0,
    health: data.health | 0,
    armor: data.armor | 0,
    x: +data.x.toFixed(2),
    z: +data.z.toFixed(2),
    heading: +data.heading.toFixed(3),
    hour: +data.hour.toFixed(2),
    weapons: data.weapons,
    ammo: data.ammo,
    reserves: data.reserves,
    day: data.day | 0 || 1,
    rp: data.rp | 0,
    standing: data.standing || {},
    plateT: +(data.plateT || 0).toFixed(1),
    // Crew timers round-trip too, so reloading mid-cooldown does not reset them.
    repairT: +(data.repairT || 0).toFixed(1),
    watchT: +(data.watchT || 0).toFixed(1),
    watchCd: +(data.watchCd || 0).toFixed(1),
    // Career stats: only real tracked counts.
    stats: {
      missionsDone: (data.stats && data.stats.missionsDone | 0) || 0,
      totalEarned: (data.stats && data.stats.totalEarned | 0) || 0,
      carsStolen: (data.stats && data.stats.carsStolen | 0) || 0,
    },
    savedAt: Date.now(),
  };
}

export function encodeSave(data) {
  return JSON.stringify(makeSave(data));
}

export function decodeSave(text) {
  if (!text) return null;
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (!o || o.v !== 3 || typeof o.money !== 'number' || typeof o.mission !== 'number') return null;
  if (typeof o.x !== 'number' || typeof o.z !== 'number') return null;
  if (!Array.isArray(o.weapons) || !Array.isArray(o.ammo)) return null;

  // Older saves load with safe defaults: day/rp/standing/plateT,
  // crew timers, and career stats are all optional in the file.
  if (typeof o.day !== 'number' || o.day < 1) o.day = 1;
  if (typeof o.rp !== 'number' || o.rp < 0) o.rp = 0;
  if (!o.standing || typeof o.standing !== 'object') o.standing = {};
  if (typeof o.plateT !== 'number' || o.plateT < 0) o.plateT = 0;

  // Weapons are filtered to real ids; ammo/reserves are padded to the full
  // six-slot rack, so an old three-slot save never leaves a slot undefined.
  o.weapons = o.weapons.filter((id) => Number.isInteger(id) && id >= 0 && id < WEAPONS.length);
  if (!o.weapons.includes(0)) {
    o.weapons = [0, 1, 2, ...o.weapons].filter((id, i, a) => a.indexOf(id) === i);
  }
  o.ammo = WEAPONS.map((w, i) => (typeof o.ammo[i] === 'number' && o.ammo[i] >= 0 ? o.ammo[i] : w.mag));
  o.reserves = Array.isArray(o.reserves)
    ? WEAPONS.map((w, i) => (typeof o.reserves[i] === 'number' && o.reserves[i] >= 0 ? o.reserves[i] : w.reserve))
    : WEAPONS.map((w) => w.reserve);
  if (typeof o.repairT !== 'number' || o.repairT < 0) o.repairT = 0;
  if (typeof o.watchT !== 'number' || o.watchT < 0) o.watchT = 0;
  if (typeof o.watchCd !== 'number' || o.watchCd < 0) o.watchCd = 0;

  if (!o.stats || typeof o.stats !== 'object') {
    o.stats = { missionsDone: 0, totalEarned: 0, carsStolen: 0 };
  }
  for (const k of ['missionsDone', 'totalEarned', 'carsStolen']) {
    if (typeof o.stats[k] !== 'number' || o.stats[k] < 0) o.stats[k] = 0;
  }
  return o;
}

export function memoryStore() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

export function saveGame(store, data) {
  store.setItem(SAVE_KEY, encodeSave(data));
  return true;
}

export function loadGame(store) {
  return decodeSave(store.getItem(SAVE_KEY));
}

export function hasSave(store) {
  return store.getItem(SAVE_KEY) !== null;
}
