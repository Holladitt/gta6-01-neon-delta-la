// Wanted level. Heat rises on crime and fades when the NDPD loses sight of
// you for a while; the helicopter only flies once the heat is serious.

export function newWantedState() {
  return { level: 0, quietTimer: 0 };
}

export const WANTED = {
  add(state, n) {
    state.level = Math.min(5, Math.max(0, state.level + n));
    if (n > 0) state.quietTimer = 0;
    return state.level;
  },
  update(state, dt, seen) {
    if (seen) {
      state.quietTimer = 0;
      return;
    }
    state.quietTimer += dt;
    if (state.quietTimer >= 14 && state.level > 0) {
      state.level -= 1;
      state.quietTimer = 0;
    }
  },
  policeFor(level) {
    return level;
  },
  heliFor(level) {
    return level >= 3 ? 1 : 0;
  },
};
