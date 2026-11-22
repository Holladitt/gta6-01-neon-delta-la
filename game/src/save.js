// 3 save slots, localStorage in the browser, an in-memory store in node.
export function slotCount() { return 3; }
export function slotKey(slot) { return 'neon-delta-la.save.v3.slot' + slot; }

let memStore = null;
export function saveStore() {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (!memStore) {
    const m = new Map();
    memStore = {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(k, String(v)); },
      removeItem: (k) => { m.delete(k); },
    };
  }
  return memStore;
}
export function saveGame(slot, data) {
  try { saveStore().setItem(slotKey(slot), JSON.stringify(data)); return true; }
  catch (e) { return false; }
}
export function loadGame(slot) {
  const raw = saveStore().getItem(slotKey(slot));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
export function slotSummary(slot) {
  const d = loadGame(slot);
  if (!d) return null;
  return { money: d.money, day: d.day, rp: d.rp, rank: d.rank, district: d.district };
}
export function clearSlot(slot) {
  try { saveStore().removeItem(slotKey(slot)); } catch (e) {}
  return true;
}
// World snapshot for a save slot: money, progress, standing.
export function serializeWorld(w) {
  return {
    money: w.money, day: w.day, rp: w.rp, rank: w.rank, hour: w.hour,
    missionsDone: [...w.missionsDone], standing: { ...w.standing },
    district: w.district, state: w.state,
  };
}
