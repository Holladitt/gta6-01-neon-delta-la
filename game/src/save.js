// Save system: 3 slots, per-slot keys. Saving writes the slot;
// loading returns the data or null; a corrupt save starts safe
// (null, never a crash). Works in the browser and in node tests
// (falls back to an in-memory store when localStorage is absent).
import { SAVE_KEY_BASE, SAVE_SLOTS } from './config.js';

function backend() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch (e) { /* fall through */ }
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
}

let store = null;
export function saveStore() {
  if (!store) store = backend();
  return store;
}

export function slotKey(slot) {
  return SAVE_KEY_BASE + '.slot' + slot;
}

export function slotCount() {
  return SAVE_SLOTS;
}

export function saveGame(slot, data) {
  if (slot < 1 || slot > SAVE_SLOTS) return false;
  try {
    saveStore().setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame(slot) {
  if (slot < 1 || slot > SAVE_SLOTS) return null;
  let raw = null;
  try {
    raw = saveStore().getItem(slotKey(slot));
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function slotSummary(slot) {
  const d = loadGame(slot);
  if (!d) return null;
  return { money: d.money || 0, day: d.day || 1, rank: d.rank || 'D', district: d.district || 'Downtown' };
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
    money: w.money, day: w.day, rp: w.rp, hour: w.hour,
    district: w.districtId, standing: w.standing, tapes: w.tapesFound,
    missionsDone: w.missions.completed, currentMission: w.missions.current,
    rank: w.rankCode, carCondition: w.car.condition, owned: w.shop.owned,
    garage: w.garage, savedAt: Date.now(),
  };
}
