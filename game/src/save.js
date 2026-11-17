// Save / load through LocalStorage. A save holds money, mission progress, the
// player's health/armour/position, the time of day and the radio station.
// Everything is guarded: private windows and bad JSON fall back to a fresh game.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.money !== 'number') return null;
    return data;
  } catch { return null; }
}

export function writeSave(state) {
  try {
    const data = {
      money: Math.floor(state.player.money), mission: state.missionIndex,
      health: state.player.health, armor: state.player.armor,
      x: Math.round(state.player.x), y: Math.round(state.player.y),
      dayNight: state.dayNight, station: state.radio.station, rep: state.rep || 0,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage off */ }
}
