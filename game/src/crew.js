// Crew abilities and their cooldowns. Plates drop the heat, Petra fixes the
// car, Cassia watches the street from above.

export function newCrewState() {
  return { cooldownT: 0, repairT: 0, watchT: 0, watchCd: 0 };
}

export function canSwap(state, wanted) {
  if (wanted <= 0) return { ok: false, reason: 'no-heat' };
  if (state.cooldownT > 0) return { ok: false, reason: 'cooldown' };
  return { ok: true };
}

export function applySwap(state, wanted, cooldown = 45) {
  if (wanted <= 0) return { ok: false, reason: 'no-heat', wanted };
  if (state.cooldownT > 0) return { ok: false, reason: 'cooldown', wanted };
  state.cooldownT = cooldown;
  return { ok: true, wanted: wanted - 1 };
}

export function applyRepair(state, car, money, cost = 150, cooldown = 60) {
  if (state.repairT > 0) return { ok: false, reason: 'cooldown', money };
  if (!car) return { ok: false, reason: 'no-car', money };
  if (money < cost) return { ok: false, reason: 'no-funds', money };
  const health = car.health != null ? car.health : car.condition;
  if (health != null && health >= 100) return { ok: false, reason: 'full', money };
  car.health = 100;
  if ('condition' in car) car.condition = 100;
  state.repairT = cooldown;
  return { ok: true, condition: 100, money: money - cost };
}

export function applyOverwatch(state, duration = 20, cooldown = 45) {
  if (state.watchT > 0) return { ok: false, reason: 'active' };
  if (state.watchCd > 0) return { ok: false, reason: 'cooldown' };
  state.watchT = duration;
  state.watchCd = cooldown;
  return { ok: true };
}

export function tickCooldown(state, dt) {
  for (const key of ['cooldownT', 'repairT', 'watchT', 'watchCd']) {
    if (typeof state[key] === 'number') {
      state[key] = Math.max(0, state[key] - dt);
    }
  }
}
