// input.js — keyboard state for driving, combat and crew abilities.
export function createInput() {
  return {
    forward: false, back: false, left: false, right: false,
    brake: false, steer: 0, throttle: 0,
    wheel: false, interact: false, pause: false, mute: false,
    keys: {},
  };
}
const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'brake',
  KeyQ: 'wheel',
  KeyE: 'interact',
  KeyP: 'pause',
  KeyM: 'mute',
};
export function attachInput(input, target) {
  const el = target || (typeof window !== 'undefined' ? window : null);
  if (!el || !el.addEventListener) return () => {};
  function down(e) {
    input.keys[e.code] = true;
    const name = KEYMAP[e.code];
    if (name) input[name] = true;
    if (name === 'brake') input.throttle = 0;
  }
  function up(e) {
    input.keys[e.code] = false;
    const name = KEYMAP[e.code];
    if (name) input[name] = false;
  }
  el.addEventListener('keydown', down);
  el.addEventListener('keyup', up);
  return () => {
    el.removeEventListener('keydown', down);
    el.removeEventListener('keyup', up);
  };
}
export function readInput(input) {
  input.throttle = input.forward ? 1 : 0;
  input.steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  return input;
}
