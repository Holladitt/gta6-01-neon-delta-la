// input.js — keyboard + mouse input state (browser).
export function createInput() {
  const keys = {};
  const pressed = {}; // edge-triggered: true only on the frame the key went down
  let mouseX = 0, mouseY = 0, mouseDown = false, clicked = false;
  let anyKey = false;

  function onDown(e) {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    anyKey = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  }
  function onUp(e) {
    keys[e.code] = false;
  }
  function onMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }
  function onMouseDown(e) {
    mouseDown = true;
    clicked = true;
  }
  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    get down() { return keys; },
    get mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    wasPressed(code) {
      return !!pressed[code];
    },
    get clicked() { return clicked; },
    get anyKey() { return anyKey; },
    // Call once per tick: clears the edge-triggered flags.
    endFrame() {
      for (const k of Object.keys(pressed)) pressed[k] = false;
      clicked = false;
      anyKey = false;
    },
  };
}
