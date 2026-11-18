// Save / load: pure serialization + a storage shim (localStorage in browser, memory in node).
import { SAVE_KEY } from './config.js';

export function makeSave(data) {
  return {
    v: 3, money: data.money | 0, mission: data.mission | 0, step: data.step | 0,
    health: data.health | 0, armor: data.armor | 0,
    x: +data.x.toFixed(2), z: +data.z.toFixed(2), heading: +data.heading.toFixed(3),
    hour: +data.hour.toFixed(2), weapons: data.weapons, ammo: data.ammo, reserves: data.reserves,
    savedAt: Date.now(),
  };
}
export function encodeSave(data) { return JSON.stringify(makeSave(data)); }
export function decodeSave(text) {
  if (!text) return null;
  let o;
  try { o = JSON.parse(text); } catch { return null; }
  if (!o || o.v !== 3 || typeof o.money !== 'number' || typeof o.mission !== 'number') return null;
  if (typeof o.x !== 'number' || typeof o.z !== 'number') return null;
  if (!Array.isArray(o.weapons) || !Array.isArray(o.ammo)) return null;
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
export function saveGame(store, data) { store.setItem(SAVE_KEY, encodeSave(data)); return true; }
export function loadGame(store) { return decodeSave(store.getItem(SAVE_KEY)); }
export function hasSave(store) { return store.getItem(SAVE_KEY) !== null; }
