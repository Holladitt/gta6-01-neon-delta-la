// Keyboard + mouse input. Browser only.
export function createInput() {
  const keys = {};
  const pressed = {};
  function onKeyDown(e) {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
  }
  function onKeyUp(e) {
    keys[e.code] = false;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return {
    forward() { return !!(keys['KeyW'] || keys['ArrowUp']); },
    back() { return !!(keys['KeyS'] || keys['ArrowDown']); },
    left() { return !!(keys['KeyA'] || keys['ArrowLeft']); },
    right() { return !!(keys['KeyD'] || keys['ArrowRight']); },
    isDown(code) { return !!keys[code]; },
    wasPressed(code) { return !!pressed[code]; },
    clearPressed() {
      for (const k of Object.keys(pressed)) pressed[k] = false;
    },
  };
}
