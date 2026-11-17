// Neon Delta LA — boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps, the 3D scene paints what is there.
// Screen states (title / play / paused / busted) are separate from mission
// progress and from wanted/combat conditions, with explicit precedence:
// busted beats mission, pause beats play, and every transition cleans up
// (see world.js bust handling). ?shot=chase|steal|sunset|title stages a
// screenshot scene instead of running the loop.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_SHOT } from './world.js';
import { ACT_CONFIRM, ACT_CONTINUE, ACT_HORN, ACT_INTERACT, ACT_MAP, ACT_MISSION, ACT_PAUSE, ACT_RADIO, ACT_RELOAD, ACT_SAVE, ACT_STATION, ACT_W1, ACT_W2, ACT_W3, createInput } from './input.js';
import { createScene3D } from './scene3d.js';
import { createHud } from './hud.js';
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
const scene3d = createScene3D(canvas);
const hud = createHud();
const audio = createAudio();
const saved = loadSave();

function announce(message) { status.textContent = message; }

function runShot(name) {
  const scene = stageShot(name, world);
  world.state.radioName = audio.stations[0];
  let painted = 0;
  function paint() {
    // The chase camera lerps into place over many frames; paint plenty of
    // them so the staged frame is settled before the screenshot is taken.
    scene3d.update(world.state, 1 / 60, scene.screen);
    hud.update(world.state, scene.screen, scene.save, { showMap: false, mouseX: window.innerWidth / 2, mouseY: window.innerHeight / 2 });
    painted += 1;
    if (painted < 70) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  let showMap = false;

  function startNew() {
    world.reset();
    world.state.radioName = audio.stations[audio.station];
    screen = 'play';
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
    screen = 'play';
    audio.unlock();
    announce('Continued your saved game.');
  }

  document.getElementById('btn-new').addEventListener('click', () => { if (screen === 'title') startNew(); });
  document.getElementById('btn-continue').addEventListener('click', () => { if (screen === 'title' && saved) continueGame(); });

  const emptyCmd = { x: 0, y: 0, sprint: false, handbrake: false, interact: false, reload: false, horn: false, mouseX: 700, mouseY: 650 };

  function frame(now) {
    requestAnimationFrame(frame);
    const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += frameDt;
    last = now;
    const actions = input.takeActions();
    const state = world.state;
    const p = state.player;

    // --- screen transitions (edge-triggered, one press = one transition) ---
    if (screen === 'title') {
      if ((actions & ACT_CONFIRM) || input.mouse.clicked) startNew();
      else if ((actions & ACT_CONTINUE) && saved) continueGame();
    } else if (screen === 'busted') {
      if (actions & ACT_CONFIRM) { screen = 'play'; announce('Back on the streets.'); }
    } else if (screen === 'paused') {
      if (actions & ACT_PAUSE) { screen = 'play'; announce('Playing.'); }
    } else if (actions & ACT_PAUSE) {
      screen = 'paused';
      announce('Paused.');
    }
    input.clearClick();

    // --- global keys, live in every play screen ---
    if (screen === 'play') {
      if ((actions & ACT_MISSION) && state.mode === 'free' && state.missionIndex < 6) {
        startMission(state, state.missionIndex);
        announce(`Mission ${state.missionIndex + 1} started.`);
      }
      if (actions & ACT_SAVE) {
        if (writeSave(state, audio.station)) state.banner = { title: 'GAME SAVED', sub: 'Progress stored in this browser', t: 2.5 };
      }
      if (actions & ACT_RADIO) {
        const on = audio.toggleRadio();
        state.radioName = on ? audio.stations[audio.station] : 'RADIO OFF';
      }
      if (actions & ACT_STATION) {
        audio.setStation(audio.station + 1);
        state.radioName = audio.stations[audio.station];
      }
      if (actions & ACT_W1) p.weapon = 0;
      if (actions & ACT_W2) p.weapon = 1;
      if (actions & ACT_W3) p.weapon = 2;
      if (actions & ACT_MAP) showMap = !showMap;
      if (actions & ACT_HORN) audio.horn();
    }

    // --- fixed-step simulation ---
    if (screen === 'play') {
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const axis = input.axis();
        const aim = scene3d.screenToGround(input.mouse.x, input.mouse.y);
        const cmd = {
          x: axis.x, y: axis.y, sprint: input.sprint, handbrake: input.handbrake,
          interact: (actions & ACT_INTERACT) !== 0, reload: (actions & ACT_RELOAD) !== 0,
          horn: (actions & ACT_HORN) !== 0, mouseX: aim.x, mouseY: aim.y,
        };
        const fired = input.mouse.down && !p.vehicle;
        const events = world.step(STEP, cmd, fired);
        if (events & EVENT_SHOT) audio.shot();
        if (events & EVENT_BUSTED) {
          audio.bust();
          screen = 'busted';
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
    } else if (screen === 'title') {
      // Attract mode: traffic and pedestrians move behind the title screen.
      while (accumulator >= STEP) {
        accumulator -= STEP;
        world.step(STEP, emptyCmd, false);
      }
    } else {
      accumulator = 0;
    }

    state.radioName = state.radioName || audio.stations[0];
    scene3d.update(state, Math.max(0.001, frameDt), screen);
    hud.update(state, screen, saved, { showMap, mouseX: input.mouse.x, mouseY: input.mouse.y });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') { screen = 'paused'; announce('Paused.'); }
  });
  // Read-only debug handle for automated QA (position, wanted, mission).
  window.__ndState = () => world.state;
  announce('Neon Delta LA. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
