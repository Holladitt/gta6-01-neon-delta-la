// Save system for Neon Delta LA: 3 save slots, one key per slot.
// A corrupt save starts safe (load returns null). In the browser the
// store is localStorage; in node it is a module-level in-memory store,
// so the simulation can round-trip saves without a browser.
import { MISSIONS } from './config.js';

export const SAVE_BASE = 'neon-delta-la.save.v3';

export function slotKey(slot) {
  return SAVE_BASE + '.slot' + slot;
}

export function slotCount() {
  return 3;
}

let memoryStore = null;

export function saveStore() {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (!memoryStore) {
    const map = new Map();
    memoryStore = {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => { map.set(k, String(v)); },
      removeItem: (k) => { map.delete(k); },
    };
  }
  return memoryStore;
}

export function saveGame(slot, data) {
  try {
    saveStore().setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame(slot) {
  let raw = null;
  try {
    raw = saveStore().getItem(slotKey(slot));
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function slotSummary(slot) {
  const d = loadGame(slot);
  if (!d) return null;
  return { money: d.money, day: d.day, rp: d.rp, rank: d.rank, district: d.district };
}

export function clearSlot(slot) {
  try {
    saveStore().removeItem(slotKey(slot));
    return true;
  } catch (e) {
    return false;
  }
}

export function serializeWorld(w) {
  return {
    money: w.money,
    day: w.day,
    rp: w.rp,
    rank: w.rank,
    district: w.district,
    missionsDone: (w.missions ? w.missions.done.slice() : []),
    standing: w.standing ? { ...w.standing } : {},
    tapesFound: w.tapes ? w.tapes.found.length : 0,
    hour: w.hour,
  };
}

export function deserializeWorld(w, data) {
  if (!data) return false;
  w.money = data.money || 0;
  w.day = data.day || 1;
  w.rp = data.rp || 0;
  w.rank = data.rank || 'D';
  w.district = data.district || 'downtown';
  if (w.missions && Array.isArray(data.missionsDone)) {
    w.missions.done = data.missionsDone.slice();
    w.missions.current = Math.min(data.missionsDone.length + 1, MISSIONS.length + 1);
  }
  if (w.standing && data.standing) {
    for (const k of Object.keys(data.standing)) w.standing[k] = data.standing[k];
  }
  return true;
}
