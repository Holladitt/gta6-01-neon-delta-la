// Keyboard + mouse input. Held keys are read every frame; one-shot presses
// are queued as bit flags and taken once, so a press between frames is never
// lost. The mouse position is raw screen pixels — the caller raycasts it to
// the ground plane for aiming.
export const ACT_CONFIRM = 1;
export const ACT_PAUSE = 2;
export const ACT_INTERACT = 4;
export const ACT_RELOAD = 8;
export const ACT_RADIO = 16;
export const ACT_MAP = 32;
export const ACT_HORN = 64;
export const ACT_SAVE = 128;
export const ACT_MISSION = 256;
export const ACT_STATION = 512;
export const ACT_W1 = 1024;
export const ACT_W2 = 2048;
export const ACT_W3 = 4096;
export const ACT_CONTINUE = 8192;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  const pressMap = {
    Space: ACT_CONFIRM, Enter: ACT_CONFIRM, KeyF: ACT_INTERACT, KeyE: ACT_INTERACT,
    KeyR: ACT_RELOAD, KeyX: ACT_RADIO, Tab: ACT_MAP, KeyH: ACT_HORN, Escape: ACT_PAUSE, KeyP: ACT_PAUSE,
    KeyN: ACT_SAVE, KeyM: ACT_MISSION, KeyQ: ACT_STATION,
    Digit1: ACT_W1, Digit2: ACT_W2, Digit3: ACT_W3, KeyC: ACT_CONTINUE,
  };
  window.addEventListener('keydown', (e) => {
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (pressMap[e.code] && !e.repeat) actions |= pressMap[e.code];
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left; mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => { mouseDown = true; mouseClicked = true; if (e.button === 0) actions |= ACT_CONFIRM; });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys,
    get mouse() { return { x: mouseX, y: mouseY, down: mouseDown, clicked: mouseClicked }; },
    clearClick() { mouseClicked = false; },
    takeActions() { const t = actions; actions = 0; return t; },
    axis() {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    get sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get handbrake() { return keys.has('Space'); },
  };
}
