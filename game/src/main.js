// Entry point: world + scene + input + HUD + title screen + game loop.
import { createWorld, updateWorld, enterCar, exitCar, serializeWorld } from './world.js';
import { createGame } from './scene.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { updateHUD, bindHUD } from './hud.js';
import { createTitle } from './title.js';
import { useAbility } from './crew.js';
import { selectTier, fire } from './combat.js';
import { saveGame } from './save.js';

const canvas = document.getElementById('game');
const world = createWorld();
const game = createGame(canvas, world);
const input = createInput();
const audio = createAudio();
const title = createTitle(world, game);
bindHUD(world);

const params = new URLSearchParams(location.search);
const shotN = parseInt(params.get('shot') || '0', 10);
let ticks = 0;
let savedMissions = 0;
window.__game = { ticks: 0, world, game, shot: shotN };

if (shotN >= 1 && shotN <= 4) {
  document.body.classList.add('shot' + shotN);
  game.applyShot(shotN);
  updateHUD(world, shotN);
} else {
  title.show();
}

input.onKey((k) => {
  if (world.state === 'TITLE' || world.frozen) return;
  if (k === 'e') { if (world.player.onFoot) enterCar(world); else exitCar(world); }
  if (k === 'q') { world.combat.wheelOpen = !world.combat.wheelOpen; }
  if (k === 'c') useAbility(world.crew, 'juno', world.time, world);
  if (k === 'v') useAbility(world.crew, 'petra', world.time, world);
  if (k === 'x') useAbility(world.crew, 'cassia', world.time, world);
  if (k === '1') selectTier(world.combat, 1, world.shop.owned);
  if (k === '2') selectTier(world.combat, 2, world.shop.owned);
  if (k === '3') selectTier(world.combat, 3, world.shop.owned);
  if (k === '4') selectTier(world.combat, 4, world.shop.owned);
  if (k === 'f') { fire(world.combat, world.time); audio.blip(220); }
  if (k === 'p' || k === 'escape') { world.frozen = !world.frozen; }
});
canvas.addEventListener('pointerdown', () => {
  if (world.state === 'TITLE' || world.frozen) return;
  fire(world.combat, world.time);
  audio.blip(220);
});

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!world.frozen && world.state !== 'TITLE') {
    updateWorld(world, input.state, dt);
    audio.engine(world.car.speed);
    if (world.missionsDone.length > savedMissions) {
      savedMissions = world.missionsDone.length;
      saveGame(1, serializeWorld(world));
    }
  }
  game.tick(dt);
  if (ticks % 6 === 0) updateHUD(world, shotN);
  ticks++;
  window.__game.ticks = ticks;
  game.renderer.render(game.scene, game.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
