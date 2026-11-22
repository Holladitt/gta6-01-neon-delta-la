// Keyboard and mouse input for Neon Delta LA.
// WASD/arrows drive, Q holds the weapon wheel, 1-4 pick a weapon
// tier, E enters a car, C/V/X fire crew abilities, Tab opens the
// pause menu, Enter starts a mission.
import { createCombat, openWheel, closeWheel, selectWeapon } from './combat.js';
import { abilityReady } from './crew.js';

export function createInput() {
  return {
    forward: false,
    back: false,
    left: false,
    right: false,
    wheel: false,
    paused: false,
    keys: new Set(),
  };
}

export function handleKeyDown(input, key, world) {
  const k = key.toLowerCase();
  input.keys.add(k);
  if (k === 'w' || k === 'arrowup') input.forward = true;
  if (k === 's' || k === 'arrowdown') input.back = true;
  if (k === 'a' || k === 'arrowleft') input.left = true;
  if (k === 'd' || k === 'arrowright') input.right = true;
  if (k === 'q') {
    input.wheel = true;
    if (world) openWheel(world.combat, world.combat.currentWeapon || 'pistol');
  }
  if (k === '1' && world) selectWeapon(world.combat, 'pistol');
  if (k === '2' && world) selectWeapon(world.combat, 'smg');
  if (k === '3' && world) selectWeapon(world.combat, 'shotgun');
  if (k === '4' && world) selectWeapon(world.combat, 'carbine');
  if (k === 'tab') input.paused = !input.paused;
}

export function handleKeyUp(input, key, world) {
  const k = key.toLowerCase();
  input.keys.delete(k);
  if (k === 'w' || k === 'arrowup') input.forward = false;
  if (k === 's' || k === 'arrowdown') input.back = false;
  if (k === 'a' || k === 'arrowleft') input.left = false;
  if (k === 'd' || k === 'arrowright') input.right = false;
  if (k === 'q') {
    input.wheel = false;
    if (world) closeWheel(world.combat);
  }
}

export function bindInput(input, world, onPause) {
  if (typeof window === 'undefined') return function () {};
  const down = (e) => {
    if (e.key === 'Tab') e.preventDefault();
    handleKeyDown(input, e.key, world);
    if (e.key === 'Tab' && onPause) onPause(input.paused);
  };
  const up = (e) => handleKeyUp(input, e.key, world);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return function () {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  };
}
