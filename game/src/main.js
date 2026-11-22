// main.js — browser entry: renderer, world, HUD, loop, title screen, shots.
import { createWorld, updateWorld, startMission, enterCar, exitCar } from './world.js';
import { createScene } from './scene.js';
import { createHUD, updateHUD, showToast, showDialogue, setMissionBar, renderWheel, renderShop, renderDispatch } from './hud.js';
import { createInput, attachInput, readInput } from './input.js';
import { ensureAudio, setMuted, isMuted, playShot, playPickup, startEngine, setEngineSpeed } from './audio.js';
import { slotSummaries, startNewGame, continueGame } from './title.js';
import { saveGame, loadGame, serializeWorld } from './save.js';
import { buyWeapon, priceFor } from './shop.js';
import { selectTier, fire, openWheel, closeWheel } from './combat.js';
import { useAbility } from './crew.js';
import { buildDispatch } from './dispatch.js';
import { TITLE, MISSIONS } from './config.js';
import { SHOTS } from './shots.js';

const world = createWorld();
const hud = createHUD();
const input = createInput();
attachInput(input, window);
const sceneApi = createScene(world, hud);
document.getElementById('game-container').appendChild(sceneApi.renderer.domElement);

window.__game = { ticks: 0, world, title: TITLE };

const params = new URLSearchParams(window.location.search);
const shotParam = parseInt(params.get('shot') || '0', 10);
let paused = false;
let slot = 1;

function buildTitleScreen() {
  if (!hud.titleScreen) return;
  const slots = slotSummaries();
  if (hud.slotList) {
    hud.slotList.innerHTML = '';
    for (const s of slots) {
      const b = document.createElement('button');
      b.className = 'slot-btn';
      b.textContent = s.empty
        ? 'SLOT ' + s.slot + ' — EMPTY'
        : 'SLOT ' + s.slot + ' — $' + s.money + ' · DAY ' + s.day + ' · RANK ' + s.rank;
      b.addEventListener('click', () => {
        slot = s.slot;
        const data = s.empty ? startNewGame(slot) : continueGame(slot);
        if (data) {
          world.money = data.money;
          world.day = data.day;
          world.rp = data.rp;
          world.rank = data.rank;
          world.district = data.district || 'downtown';
          world.hour = data.hour || 10;
        }
        hud.titleScreen.classList.add('hidden');
        world.state = 'FREE-ROAM';
        startMission(world, 1);
        showDialogue(hud, 'MARA', 'Five stars and a roadblock ahead — punch through, don\'t stop.');
        ensureAudio();
      });
      hud.slotList.appendChild(b);
    }
  }
}

if (shotParam >= 1 && shotParam <= 4 && SHOTS[shotParam]) {
  document.body.classList.add('shot' + shotParam);
  sceneApi.applyShot(shotParam);
  // Staged shot: refresh the HUD once (district label + minimap + speed).
  updateHUD(hud, world);
  if (hud.titleScreen) hud.titleScreen.classList.add('hidden');
} else {
  buildTitleScreen();
}

// Shop BUY buttons.
if (hud.shopList) {
  hud.shopList.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-weapon]');
    if (!b) return;
    const id = b.dataset.weapon;
    const price = priceFor(world.shop, id, world.standing, world.district);
    const res = buyWeapon(world.shop, world.money, id, world.standing, world.district);
    if (res.ok) {
      world.money = res.money;
      playPickup();
      showToast(hud, 'Bought ' + id.toUpperCase() + ' for $' + price);
    } else {
      showToast(hud, 'Cannot buy ' + id.toUpperCase());
    }
    renderShop(hud, world.shop, world.standing, world.district);
  });
}

let last = performance.now();
let dispatchTimer = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  window.__game.ticks += 1;
  if (paused) {
    sceneApi.renderer.render(sceneApi.scene, sceneApi.camera);
    return;
  }
  readInput(input);
  if (shotParam === 0) {
    // Free-roam input.
    if (input.keys.KeyE && !loop._eDown) {
      if (world.driving) exitCar(world);
      else enterCar(world);
    }
    loop._eDown = !!input.keys.KeyE;
    if (input.keys.KeyQ) openWheel(world.combat);
    else closeWheel(world.combat);
    for (let t = 1; t <= 4; t += 1) {
      if (input.keys['Digit' + t]) selectTier(world.combat, t, world.shop.owned);
    }
    if (input.keys.KeyC) useAbility(world.crew, 'juno', world.time, world);
    if (input.keys.KeyV) useAbility(world.crew, 'petra', world.time, world);
    if (input.keys.KeyX) useAbility(world.crew, 'cassia', world.time, world);
    if (input.keys.KeyF) {
      const r = fire(world.combat, world.time);
      if (r.ok) playShot();
    }
    if (input.keys.KeyP && !loop._pDown) {
      paused = !paused;
      if (hud.pauseMenu) hud.pauseMenu.classList.toggle('hidden', !paused);
    }
    loop._pDown = !!input.keys.KeyP;
    if (input.keys.KeyM && !loop._mDown) setMuted(!isMuted());
    loop._mDown = !!input.keys.KeyM;
    if (world.driving) {
      startEngine();
      setEngineSpeed(world.car.speed);
    }
    updateWorld(world, input, dt);
    // Mission bar follows the live mission.
    const cur = world.missions.current;
    if (cur >= 1 && cur <= 10) {
      const mission = MISSIONS[cur - 1];
      if (mission) {
        const obj = mission.points[world.missions.objective] || mission.points[mission.points.length - 1];
        const next = mission.points[world.missions.objective + 1];
        setMissionBar(hud, 'M' + mission.id + ' ' + mission.name.toUpperCase() + ' · TAHAP ' + (world.missions.objective + 1) + '/' + mission.points.length, obj.label, next ? next.label : 'Finish the job');
      }
    }
    dispatchTimer += dt;
    if (dispatchTimer > 1) {
      dispatchTimer = 0;
      const rows = buildDispatch(world.police.cars.slice(0, 3), world.player, { level: world.wanted.level, heli: world.police.heli });
      renderDispatch(hud, rows);
      renderWheel(hud, world.combat, world.shop.owned);
      renderShop(hud, world.shop, world.standing, world.district);
    }
    // Autosave every ~30 s.
    if (Math.floor(world.time) % 30 === 0 && Math.floor(world.time) !== loop._savedAt) {
      loop._savedAt = Math.floor(world.time);
      saveGame(slot, serializeWorld(world));
    }
    updateHUD(hud, world);
  }
  sceneApi.animate(dt);
  sceneApi.renderer.render(sceneApi.scene, sceneApi.camera);
}
requestAnimationFrame(loop);
