// Neon Delta LA — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, the renderer paints what is there.
// Screen states (title / play / paused / busted) are separate from mission
// progress and from wanted/combat conditions, with explicit precedence:
// busted beats mission, pause beats play, and every transition cleans up
// (see world.js bust handling). ?shot=chase|steal|sunset|title stages a
// screenshot scene instead of running the loop.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_SHOT } from './world.js';
import { ACT_CONFIRM, ACT_INTERACT, ACT_MAP, ACT_PAUSE, ACT_RADIO, ACT_RELOAD, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { startMission, updateJob, updateMission } from './missions.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const saved = loadSave();

function announce(message) { status.textContent = message; }

function runShot(name) {
  const scene = stageShot(name, world);
  world.state.radioName = audio.stations[0];
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.save);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let showMap = false;

  function startNew() {
    world.reset();
    world.state.radioName = audio.stations[audio.station];
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Neon Delta LA as Mara Solano.');
  }
  function continueGame() {
    world.reset();
    if (saved) {
      const p = world.state.player;
      p.money = saved.money; p.health = saved.health; p.armor = saved.armor;
      p.x = saved.x; p.y = saved.y;
      world.state.missionIndex = saved.mission || 0;
      world.state.dayNight = saved.dayNight || 'dusk';
      if (typeof saved.station === 'number') audio.setStation(saved.station);
    }
    world.state.radioName = audio.stations[audio.station];
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Continued your saved game.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const state = world.state;
    const p = state.player;

    // --- screen transitions (edge-triggered, one press = one transition) ---
    if (screen === SCREEN_TITLE) {
      if ((actions & ACT_CONFIRM) || input.mouse.clicked) startNew();
      else if (input.keys.has('KeyC') && saved) continueGame();
    } else if (screen === SCREEN_BUSTED) {
      if (actions & ACT_CONFIRM) { screen = SCREEN_PLAY; announce('Back on the streets.'); }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & ACT_PAUSE) { screen = SCREEN_PLAY; announce('Playing.'); }
    } else if (actions & ACT_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
    input.clearClick();

    // --- global keys, live in every play screen ---
    if (screen === SCREEN_PLAY) {
      if (input.keys.has('KeyM') && state.mode === 'free' && state.missionIndex < 6) {
        startMission(state, state.missionIndex);
        announce(`Mission ${state.missionIndex + 1} started.`);
        input.keys.delete('KeyM');
      }
      if (input.keys.has('KeyN')) {
        if (writeSave(state)) state.banner = { title: 'GAME SAVED', sub: 'Progress stored in this browser', t: 2.5 };
        input.keys.delete('KeyN');
      }
      if (actions & ACT_RADIO) {
        const on = audio.toggleRadio();
        state.radioName = on ? audio.stations[audio.station] : 'RADIO OFF';
      }
      if (input.keys.has('KeyQ')) {
        audio.setStation(audio.station + 1);
        state.radioName = audio.stations[audio.station];
        input.keys.delete('KeyQ');
      }
      if (input.keys.has('Digit1')) p.weapon = 0;
      if (input.keys.has('Digit2')) p.weapon = 1;
      if (input.keys.has('Digit3')) p.weapon = 2;
      if (actions & ACT_MAP) showMap = !showMap;
      if (input.keys.has('KeyH')) audio.horn();
    }

    // --- fixed-step simulation ---
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const axis = input.axis();
        const rect = canvas.getBoundingClientRect();
        const mouseWorldX = state.camera.x + (input.mouse.x - rect.width / 2) / state.camera.zoom;
        const mouseWorldY = state.camera.y + (input.mouse.y - rect.height / 2) / (state.camera.zoom * 0.86);
        const cmd = {
          x: axis.x, y: axis.y, sprint: input.sprint, handbrake: input.handbrake,
          interact: (actions & ACT_INTERACT) !== 0, reload: (actions & ACT_RELOAD) !== 0,
          horn: (actions & 64) !== 0, mouseWorldX, mouseWorldY,
        };
        const fired = input.mouse.down && !p.vehicle;
        const events = world.step(STEP, cmd, fired);
        if (events & EVENT_SHOT) audio.shot();
        if (events & EVENT_BUSTED) {
          audio.bust();
          screen = SCREEN_BUSTED;
          announce('Busted. The police took $200.');
        }
        if (state.mode === 'mission') {
          const result = updateMission(state, STEP, (actions & ACT_INTERACT) !== 0);
          if (result === 'win') { audio.coin(); announce('Mission complete.'); }
          else if (result === 'fail') announce('Mission failed. Press M to retry.');
        } else {
          updateJob(state, STEP, (actions & ACT_INTERACT) !== 0);
        }
        state.radioName = audio.radioOn ? audio.stations[audio.station] : state.radioName;
        audio.update(STEP, p.vehicle ? Math.abs(p.vehicle.speed) / 600 : p.speed / 340, state.wanted);
        audio.setSiren(state.wanted > 0);
      }
    } else {
      accumulator = 0;
    }

    state.radioName = state.radioName || audio.stations[0];
    renderer.draw(state, screen, saved);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });
  announce('Neon Delta LA. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
