// save.js — three save slots, per-slot keys, safe corrupt-save start.
import { SAVE_KEY } from './config.js';

let memoryStore = null;
function memStore() {
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
export function saveStore() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch (e) { /* fall through to memory */ }
  return memStore();
}
export function slotKey(n) {
  return SAVE_KEY + '.slot' + n;
}
export function slotCount() {
  return 3;
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
    hour: w.hour,
    missionsDone: (w.missions && w.missions.done ? w.missions.done.slice() : []),
    standing: w.standing ? { ...w.standing } : {},
    owned: w.shop ? Object.keys(w.shop.owned || {}).filter((k) => w.shop.owned[k]) : [],
  };
}
