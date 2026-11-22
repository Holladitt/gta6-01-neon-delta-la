// title.js — title screen and the three save slots.
import { TITLE, SAVE_KEY } from './config.js';
import { slotKey, slotSummary, slotCount, saveGame, loadGame } from './save.js';

export function titleText() {
  return TITLE;
}
export function slotSummaries() {
  const out = [];
  for (let i = 1; i <= slotCount(); i += 1) {
    const s = slotSummary(i);
    out.push(s ? { slot: i, ...s } : { slot: i, empty: true });
  }
  return out;
}
export function startNewGame(slot) {
  const data = {
    money: 500, day: 1, rp: 0, rank: 'D', district: 'downtown', hour: 10,
    missionsDone: [], standing: {}, owned: ['pistol', 'smg', 'shotgun'],
  };
  saveGame(slot, data);
  return data;
}
export function continueGame(slot) {
  return loadGame(slot);
}
export function saveKeyFor(slot) {
  return slotKey(slot);
}
export function baseSaveKey() {
  return SAVE_KEY;
}
