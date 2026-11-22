// crew.js — crew abilities: clean plates, field repair, overwatch (pure).
export function newCrewState() {
  return { cooldownT: 0, repairT: 0, watchT: 0, watchCd: 0 };
}

export function canSwap(state, wanted) {
  return wanted > 0 && state.cooldownT <= 0;
}

// Juno Reyes — CLEAN PLATES: drops wanted by 1.
export function applySwap(state, wanted, cd = 45) {
  if (wanted <= 0) return { ok: false, reason: 'no-heat', wanted };
  if (state.cooldownT > 0) return { ok: false, reason: 'cooldown', wanted };
  state.cooldownT = cd;
  return { ok: true, wanted: wanted - 1 };
}

// Petra Hale — FIELD REPAIR: $150 restores the car to 100%.
// Cooldown is checked before "full", so a press during the 60 s recharge
// answers 'cooldown' (the toast reads "recharging"), not 'full'.
export function applyRepair(state, car, money, cost = 150, cd = 60) {
  if (!car) return { ok: false, reason: 'no-car', money };
  if (state.repairT > 0) return { ok: false, reason: 'cooldown', money };
  if (car.health >= 100) return { ok: false, reason: 'full', money };
  if (money < cost) return { ok: false, reason: 'no-funds', money };
  state.repairT = cd;
  car.health = 100;
  return { ok: true, condition: 100, money: money - cost };
}

// Cassia Wren — OVERWATCH: marks police for a while.
export function applyOverwatch(state, duration = 20, cd = 45) {
  if (state.watchT > 0) return { ok: false, reason: 'active' };
  if (state.watchCd > 0) return { ok: false, reason: 'cooldown' };
  state.watchT = duration;
  state.watchCd = cd;
  return { ok: true, duration };
}

export function tickCooldown(state, dt) {
  for (const k of ['cooldownT', 'repairT', 'watchT', 'watchCd']) {
    if (typeof state[k] === 'number') state[k] = Math.max(0, state[k] - dt);
  }
}
