// Save slots (3) + world serialisation. Pure; localStorage in the
// browser, an in-memory map in node (same singleton either way).
export function slotKey(slot) {
  return 'neon-delta-la.save.v3.slot' + slot;
}
export function slotCount() {
  return 3;
}
const memStore = new Map();
export function saveStore() {
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
    setItem: (k, v) => { memStore.set(k, String(v)); },
    removeItem: (k) => { memStore.delete(k); },
  };
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
  const raw = saveStore().getItem(slotKey(slot));
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
  return d;
}
export function clearSlot(slot) {
  saveStore().removeItem(slotKey(slot));
  return true;
}
export function serializeWorld(w) {
  return {
    money: w.money,
    day: w.day,
    hour: w.hour,
    rp: w.rp,
    missionsDone: w.missions && w.missions.done ? w.missions.done.slice() : [],
    missionsCurrent: w.missions ? w.missions.current : 1,
    standing: w.standing,
  };
}
