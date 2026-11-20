// Crew abilities (pure state machines). All three crew members have ONE
// real ability each — nothing decorative on the crew bar.
//  - CLEAN PLATES (Juno): swap plates, wanted -1, 45s cooldown.
//  - FIELD REPAIR (Petra): fix the current car to 100% condition, $150 in
//    parts, 60s cooldown. Needs a car and a damaged car.
//  - OVERWATCH (Cassia): police callsigns + distances on the minimap for
//    20s, 45s cooldown.
// State: { cooldownT (plates), repairT, watchT (remaining reveal),
//           watchCd (overwatch cooldown) }. All timers tick down in real
// seconds; all fields default to 0 on old saves.
export function newCrewState() { return { cooldownT: 0, repairT: 0, watchT: 0, watchCd: 0 }; }

export function canSwap(state, wanted) {
  return wanted > 0 && (state.cooldownT || 0) <= 0;
}

export function applySwap(state, wanted, cooldown) {
  if (!canSwap(state, wanted)) {
    return { ok: false, wanted, reason: wanted <= 0 ? 'no-heat' : 'cooldown' };
  }
  state.cooldownT = cooldown;
  return { ok: true, wanted: Math.max(0, wanted - 1) };
}

// Repair the current car. inCar = the vehicle object (or null when on foot).
// Returns {ok, condition, money, reason}: condition is the car's real
// health after the repair (100 on success), money is the player's cash
// after the $150 parts cost is deducted (unchanged on failure).
export function applyRepair(state, inCar, money, cost, cooldown) {
  if (!inCar) return { ok: false, condition: null, money, reason: 'no-car' };
  if ((inCar.health ?? 100) >= 100) return { ok: false, condition: Math.round(inCar.health), money, reason: 'full' };
  if ((state.repairT || 0) > 0) return { ok: false, condition: Math.round(inCar.health), money, reason: 'cooldown' };
  if (money < cost) return { ok: false, condition: Math.round(inCar.health), money, reason: 'no-funds' };
  state.repairT = cooldown;
  inCar.health = 100;
  return { ok: true, condition: 100, money: money - cost, reason: null };
}

// Overwatch: reveal police identity on the minimap for `duration` seconds.
export function applyOverwatch(state, duration, cooldown) {
  if ((state.watchT || 0) > 0) return { ok: false, reason: 'active' };
  if ((state.watchCd || 0) > 0) return { ok: false, reason: 'cooldown' };
  state.watchT = duration;
  state.watchCd = cooldown;
  return { ok: true, reason: null };
}

export function tickCooldown(state, dt) {
  state.cooldownT = Math.max(0, (state.cooldownT || 0) - dt);
  state.repairT = Math.max(0, (state.repairT || 0) - dt);
  state.watchT = Math.max(0, (state.watchT || 0) - dt);
  state.watchCd = Math.max(0, (state.watchCd || 0) - dt);
  return state;
}
