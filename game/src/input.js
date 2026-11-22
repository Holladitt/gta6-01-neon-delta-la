// Keyboard input. One shared state object; the game loop reads it, the
// shoot driver writes synthetic keys into it.

export function createInput() {
  const keys = {};
  const pressed = new Set();
  const api = {
    keys,
    down(code) {
      return !!keys[code];
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    press(code) {
      keys[code] = true;
      pressed.add(code);
    },
    release(code) {
      keys[code] = false;
    },
    clearPressed() {
      pressed.clear();
    },
    attach() {
      window.addEventListener('keydown', (e) => {
        if (!keys[e.code]) pressed.add(e.code);
        keys[e.code] = true;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
          e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
      });
      window.addEventListener('blur', () => {
        for (const k of Object.keys(keys)) keys[k] = false;
      });
    },
  };
  return api;
}
