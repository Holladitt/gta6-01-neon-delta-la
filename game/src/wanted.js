// wanted.js — wanted level: heat, quiet decay, police response (pure).
export function newWantedState() {
  return { level: 0, quietTimer: 0 };
}

export const WANTED = {
  add(state, n) {
    state.level = Math.min(5, state.level + n);
    state.quietTimer = 0;
  },
  // seen = the police currently have eyes on the player.
  // After 14 quiet game-seconds the level drops by one.
  update(state, dt, seen) {
    if (seen) {
      state.quietTimer = 0;
      return;
    }
    if (state.level <= 0) return;
    state.quietTimer += dt;
    if (state.quietTimer >= 14) {
      state.level -= 1;
      state.quietTimer = 0;
    }
  },
  policeFor(level) {
    return Math.max(0, Math.min(5, level));
  },
  heliFor(level) {
    return level >= 3 ? 1 : 0;
  },
};
