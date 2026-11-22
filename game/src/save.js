// save.js — save encoding/decoding with old-save defaults (pure).
import { WEAPONS } from './config.js';

export function makeSave(state) {
  return { v: 3, savedAt: Date.now(), ...state };
}

export function encodeSave(state) {
  return JSON.stringify(makeSave(state));
}

function padToSix(arr, defaults) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    out.push(Array.isArray(arr) && typeof arr[i] === 'number' ? arr[i] : defaults[i]);
  }
  return out;
}

export function decodeSave(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    return null;
  }
  if (!d || typeof d !== 'object' || d.v !== 3) return null;
  return {
    v: 3,
    money: d.money ?? 250,
    mission: d.mission ?? 0,
    step: d.step ?? 0,
    health: d.health ?? 100,
    armor: d.armor ?? 0,
    x: d.x ?? 0,
    z: d.z ?? 0,
    heading: d.heading ?? 0,
    hour: d.hour ?? 12,
    weapons: Array.isArray(d.weapons) ? d.weapons.slice() : [0, 1, 2],
    ammo: padToSix(d.ammo, WEAPONS.map((w) => w.mag)),
    reserves: padToSix(d.reserves, WEAPONS.map((w) => w.reserve)),
    day: d.day ?? 1,
    rp: d.rp ?? 0,
    standing: d.standing ?? {},
    plateT: d.plateT ?? 0,
    repairT: d.repairT ?? 0,
    watchT: d.watchT ?? 0,
    watchCd: d.watchCd ?? 0,
    stats: {
      missionsDone: d.stats?.missionsDone ?? 0,
      totalEarned: d.stats?.totalEarned ?? 0,
      carsStolen: d.stats?.carsStolen ?? 0,
    },
    savedAt: d.savedAt ?? 0,
  };
}
