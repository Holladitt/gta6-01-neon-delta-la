// Save data, version 3. Old or partial saves load with sane defaults;
// corrupt text and wrong versions are rejected outright.

import { WEAPONS } from './config.js';

export function makeSave(state) {
  return { ...state, v: 3, savedAt: Date.now() };
}

export function encodeSave(state) {
  return JSON.stringify(makeSave(state));
}

function padAmmo(rawAmmo) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const v = rawAmmo && rawAmmo[i] != null ? rawAmmo[i] : WEAPONS[i].mag;
    out.push(v);
  }
  return out;
}

function padReserves(rawReserves) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const v = rawReserves && rawReserves[i] != null ? rawReserves[i] : WEAPONS[i].reserve;
    out.push(v);
  }
  return out;
}

export function decodeSave(str) {
  let raw;
  try {
    raw = JSON.parse(str);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || raw.v !== 3) return null;
  const stats = raw.stats || {};
  return {
    v: 3,
    money: raw.money ?? 250,
    mission: raw.mission ?? 0,
    step: raw.step ?? 0,
    health: raw.health ?? 100,
    armor: raw.armor ?? 0,
    x: raw.x ?? 0,
    z: raw.z ?? 0,
    heading: raw.heading ?? 0,
    hour: raw.hour ?? 9,
    weapons: raw.weapons ?? [0, 1, 2],
    ammo: padAmmo(raw.ammo),
    reserves: padReserves(raw.reserves),
    day: raw.day ?? 1,
    rp: raw.rp ?? 0,
    standing: raw.standing ?? {},
    plateT: raw.plateT ?? 0,
    repairT: raw.repairT ?? 0,
    watchT: raw.watchT ?? 0,
    watchCd: raw.watchCd ?? 0,
    stats: {
      missionsDone: stats.missionsDone ?? 0,
      totalEarned: stats.totalEarned ?? 0,
      carsStolen: stats.carsStolen ?? 0,
    },
    savedAt: raw.savedAt ?? 0,
  };
}
