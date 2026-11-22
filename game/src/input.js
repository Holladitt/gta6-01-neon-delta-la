// Keyboard + mouse input: WASD/arrows drive, E enter/exit, Q wheel, 1-4 tiers,
// C/V/X crew abilities, F fire, P pause.
export function createInput() {
  const state = { forward: false, back: false, left: false, right: false, brake: false, nitro: false };
  const keys = {};
  const handlers = [];
  function key(e, down) {
    const k = e.key.toLowerCase();
    keys[k] = down;
    state.forward = !!(keys['w'] || keys['arrowup']);
    state.back = !!(keys['s'] || keys['arrowdown']);
    state.left = !!(keys['a'] || keys['arrowleft']);
    state.right = !!(keys['d'] || keys['arrowright']);
    state.brake = !!keys[' '];
    state.nitro = !!keys['shift'];
    if (down) for (const h of handlers) h(k);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  }
  window.addEventListener('keydown', (e) => key(e, true));
  window.addEventListener('keyup', (e) => key(e, false));
  return { state, onKey: (h) => handlers.push(h) };
}
