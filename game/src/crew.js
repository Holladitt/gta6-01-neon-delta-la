// Crew plate-swap ability (pure state machine). The ONLY crew ability that
// exists: CLEAN PLATES — swap plates, wanted -1, cooldown seconds. The other
// crew members have no ability by design (no fake abilities on the HUD).
export function newCrewState() { return { cooldownT: 0 }; }

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

export function tickCooldown(state, dt) {
  state.cooldownT = Math.max(0, (state.cooldownT || 0) - dt);
  return state.cooldownT;
}
