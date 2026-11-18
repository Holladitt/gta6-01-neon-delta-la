// Wanted-level rules (pure). Levels 1-5. Police + heli counts per level.
// state: {level, seenTimer, quietTimer}
export const WANTED = {
  policeFor(level) { return level <= 0 ? 0 : Math.min(level, 5); },
  heliFor(level) { return level >= 3 ? 1 : 0; },
  add(state, amount) {
    state.level = Math.max(0, Math.min(5, state.level + amount));
    state.quietTimer = 0;
    return state.level;
  },
  // dt seconds pass; seen = police currently has line of sight to the player.
  // Returns new level. Quiet time decays the level: 8s per star at 1-2, 14s per star at 3+.
  update(state, dt, seen) {
    if (state.level <= 0) return 0;
    if (seen) { state.quietTimer = 0; return state.level; }
    state.quietTimer += dt;
    const per = state.level >= 3 ? 14 : 8;
    if (state.quietTimer >= per) {
      state.level -= 1;
      state.quietTimer = 0;
    }
    return state.level;
  },
  clear(state) { state.level = 0; state.quietTimer = 0; return 0; },
};
export function newWantedState() { return { level: 0, quietTimer: 0 }; }
