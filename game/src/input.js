// Keyboard and mouse input. WASD/arrows drive, E enters/exits the
// car, F steals a car, SPACE fires, Q holds the weapon wheel open
// (1-4 pick a tier), C/V/X are crew abilities, SHIFT is nitro,
// M starts a mission, R starts a race, J starts a side job, P
// pauses, T saves. Safe to construct in node tests (no listeners
// attach without a window).
export function createInput() {
  const input = {
    forward: false, back: false, left: false, right: false,
    fire: false, nitro: false, wheel: false,
    pressed: {}, mouseX: 0, mouseY: 0, mouseDown: false,
    attach() {
      if (typeof window === 'undefined') return;
      window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'arrowup') input.forward = true;
        if (k === 's' || k === 'arrowdown') input.back = true;
        if (k === 'a' || k === 'arrowleft') input.left = true;
        if (k === 'd' || k === 'arrowright') input.right = true;
        if (k === ' ') input.fire = true;
        if (k === 'shift') input.nitro = true;
        if (k === 'q') input.wheel = true;
        if (!input.pressed[k]) input.pressed[k] = true;
      });
      window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'arrowup') input.forward = false;
        if (k === 's' || k === 'arrowdown') input.back = false;
        if (k === 'a' || k === 'arrowleft') input.left = false;
        if (k === 'd' || k === 'arrowright') input.right = false;
        if (k === ' ') input.fire = false;
        if (k === 'shift') input.nitro = false;
        if (k === 'q') input.wheel = false;
      });
      window.addEventListener('mousemove', (e) => {
        input.mouseX = e.clientX; input.mouseY = e.clientY;
      });
      window.addEventListener('mousedown', () => { input.mouseDown = true; });
      window.addEventListener('mouseup', () => { input.mouseDown = false; });
    },
    // One-shot key: true once per press, then cleared by the loop.
    consume(k) {
      if (input.pressed[k]) { input.pressed[k] = false; return true; }
      return false;
    },
    clearPressed() {
      input.pressed = {};
    },
  };
  return input;
}
