// Neon Delta LA — main orchestrator. State machine, player, missions, wanted,
// combat, save/load, HUD wiring, screenshot staging. All original content.
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, DISTRICTS, PLAYER, SAVE_KEY, MISSIONS, SIDE_JOBS, KEYS, WEAPONS, districtAt } from './config.js';
import { mulberry32 } from './rng.js';
import { buildWorld, groundY, inWater } from './world.js';
import { buildMara, animateWalk, animateIdle } from './characters.js';
import { createVehicle, updateVehicle, setHeadlights } from './vehicles.js';
import { Traffic, Peds } from './traffic.js';
import { Police } from './police.js';
import { Officers } from './officers.js';
import { Combat, rayHit } from './combat.js';
import { startMission as engineStartMission, updateMission, startSideJob, currentStep } from './missions.js';
import { newWantedState, WANTED } from './wanted.js';
import { loadGame, saveGame, hasSave, memoryStore } from './save.js';
import { SceneRig } from './scene.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { applyShot } from './shots.js';

const rng = mulberry32(4242);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (id) => document.getElementById(id);
// Wrap an angle to [-PI, PI].
function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function lockPointer() {
  try {
    const p = document.getElementById('c').requestPointerLock();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch { /* headless or denied: mouse look just stays off */ }
}
const STORE = (() => {
  try {
    localStorage.setItem('__nd_probe', '1');
    localStorage.removeItem('__nd_probe');
    return localStorage;
  } catch {
    return memoryStore();
  }
})();

const game = {
  state: 'title', // title | playing | paused | map
  money: PLAYER.money, health: 100, armor: 0,
  hour: 13.5, time: 0, lastMouseMove: -10,
  wanted: newWantedState(),
  mission: null, // engine mission state from startMission() (missions.js)
  sideJob: null,
  waypoint: null,
  inCar: null,
  bustT: 0, deadT: 0,
  fps: 0, frames: 0, fpsT: 0, errors: [],
};

let rig, world, traffic, peds, police, officers, hud, input, audio, combat;
let mara, maraParts, parked = [];
let waypointMarker, waypointBeam, tracers = [];
let player = { x: PLAYER.spawn.x, z: PLAYER.spawn.z, heading: PLAYER.spawn.heading, speed: 0, phase: 0, moving: false };
let camTarget = { x: 0, y: 2, z: 0 };

// ---------- boot ----------
function boot() {
  const canvas = $('c');
  rig = new SceneRig(canvas);
  world = buildWorld(rig.scene);
  traffic = new Traffic(rig.scene, world.colliders, world.trafficLights);
  traffic.spawnPortCars(6); // denser truck + car traffic around the terminal
  peds = new Peds(rig.scene, 48, 12); // 48 sidewalk NPCs + 12 pier festival crowd
  police = new Police(rig.scene, world.graph, world.colliders);
  officers = new Officers(rig.scene, null); // audio wired below once AudioSys exists
  hud = new HUD();
  input = new Input(canvas);
  audio = new AudioSys();
  officers.audio = audio;
  combat = new Combat();
  game.hud = hud;

  const m = buildMara();
  mara = m.group;
  maraParts = m.parts;
  mara.position.set(player.x, 0, player.z);
  rig.scene.add(mara);

  for (const spot of world.parkedSpots) {
    const v = createVehicle(spot.kind, spot.x, spot.z, spot.heading, spot.color);
    v.parked = true;
    v.health = 100;
    parked.push(v);
    rig.scene.add(v.group);
  }

  // 3D waypoint marker + beam.
  waypointMarker = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.6),
    new THREE.MeshBasicMaterial({ color: 0xffd23d })
  );
  waypointBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
  );
  waypointMarker.visible = false;
  waypointBeam.visible = false;
  rig.scene.add(waypointMarker, waypointBeam);

  // Tracer pool for gunshots.
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0 }));
    rig.scene.add(line);
    tracers.push({ line, t: 0 });
  }

  // Title / pause / map buttons.
  $('btn-new').addEventListener('click', () => { audio.ensure(); newGame(); });
  $('btn-continue').addEventListener('click', () => { audio.ensure(); continueGame(); });
  $('btn-resume').addEventListener('click', () => resumeGame());
  $('btn-restart').addEventListener('click', () => { audio.ensure(); newGame(); });
  $('btn-quit').addEventListener('click', () => { pauseGame(false); toTitle(); });
  $('btn-map-close').addEventListener('click', () => { game.state = 'playing'; hud.showMap(false); });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && game.state === 'playing' && !game.shotMode) pauseGame(true);
  });

  hud.setVisible(false);
  hud.showTitle(hasSave(STORE) ? loadGame(STORE) : null);
  hud.setMoney(game.money);
  hud.setWanted(0);
  hud.setHealth(100, 0);
  hud.setWeapon(combat.hudText());
  hud.setClock(game.hour);
  hud.setDistrict('DOWNTOWN', 'Glassline Towers');
  hud.setMission('Press M to start the next mission.');
  rig.setTimeOfDay(game.hour);

  // Screenshot staging (?shot=1..4).
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    game.shotMode = true;
    applyShot(gameApi, parseInt(shot, 10));
    // Let the world settle for a few frames before capture.
    game.settleFrames = 5;
  }

  window.__ndDebug = gameApi;
  window.__ndState = () => ({
    state: game.state,
    money: game.money,
    wanted: game.wanted.level,
    weapon: combat.weapon.name,
    ammo: combat.ammo[combat.current],
    mission: game.mission ? game.mission.idx : -1,
    missionStep: game.mission ? game.mission.step : -1,
    pos: [Math.round(player.x), Math.round(player.z)],
    inCar: game.inCar ? game.inCar.kind : null,
    speedKmh: game.inCar ? Math.round(Math.abs(game.inCar.speed) * 3.6) : 0,
    health: game.health,
    fps: Math.round(game.fps),
    errors: game.errors,
    waypoint: game.waypoint,
    officers: officers.list.length,
    officerShots: officers.shotsFired,
    pierPeds: peds.npcs.filter((n) => n.zone === 'pier').length,
    portCars: traffic.cars.filter((c) => c.port).length,
    police: police.cars.map((c) => [Math.round(c.x), Math.round(c.z)]),
    heli: police.heli ? [Math.round(police.heli.position.x), Math.round(police.heli.position.y), Math.round(police.heli.position.z)] : null,
    siren: police.cars.length && police.cars[0].lightBar ? police.cars[0].lightBar.red.emissiveIntensity : null,
    port: world.port,
    pierStats: world.pier.stats || null,
  });
  window.addEventListener('error', (e) => game.errors.push(String(e.message)));

  rig.renderer.setAnimationLoop(tick);
}

// ---------- game API (used by shots.js) ----------
const gameApi = {
  setState(s) {
    game.state = s;
    if (s === 'playing') hud.hideTitle();
    hud.setVisible(s !== 'title');
  },
  teleport(x, z, heading) {
    player.x = x;
    player.z = z;
    player.heading = heading;
    mara.position.set(x, groundY(x, z), z);
    mara.rotation.y = heading;
  },
  spawnCar(kind, x, z, heading, color) {
    const v = createVehicle(kind, x, z, heading, color);
    v.health = 100;
    parked.push(v);
    rig.scene.add(v.group);
    return v;
  },
  enterCar(v) { enterCar(v); },
  setWanted(n) {
    game.wanted.level = n;
    police.setLevel(n);
    hud.setWanted(n);
  },
  spawnPolice(x, z, heading) { return police.spawnAt(x, z, heading || 0); },
  spawnTraffic(kind, axis, road, along, dir, speed) { return traffic.spawnAt(kind, axis, road, along, dir, speed); },
  setHour(h) {
    game.hour = h;
    rig.setTimeOfDay(h);
    hud.setClock(h);
  },
  startMission(i) { startMission(i); },
  setCamera(yaw, pitch) {
    rig.yaw = yaw;
    rig.pitch = pitch;
  },
  setMoney(n) {
    game.money = n;
    hud.setMoney(n);
  },
  setHealth(h) {
    game.health = h;
    hud.setHealth(h, game.armor);
  },
  get officers() { return officers; },
  get hud() { return hud; }, // live binding: hud is assigned in boot(), after this object is created
};

// ---------- state transitions ----------
function newGame() {
  game.money = PLAYER.money;
  game.health = 100;
  game.armor = 0;
  game.mission = null;
  game.sideJob = null;
  game.waypoint = null;
  game.courier = null;
  WANTED.clear(game.wanted);
  police.setLevel(0);
  game.inCar = null;
  gameApi.teleport(PLAYER.spawn.x, PLAYER.spawn.z, PLAYER.spawn.heading);
  game.state = 'playing';
  hud.hideTitle();
  hud.showPause(false);
  hud.setVisible(true);
  hud.setMoney(game.money);
  hud.setWanted(0);
  hud.setHealth(100, 0);
  hud.setDialog('MARA: Back in Neon Delta. My sister is out there — and so are the answers.', 6000);
  hud.setMission('MISSION 1 — RETURN TO LA: Steal a sedan.');
  hud.toast('WASD move · F enter car · M mission');
  lockPointer();
}

function continueGame() {
  const s = loadGame(STORE);
  if (!s) { newGame(); return; }
  game.money = s.money;
  game.health = s.health;
  game.armor = s.armor;
  game.mission = engineStartMission(s.mission);
  if (game.mission && s.step) game.mission.step = Math.min(s.step, game.mission.def.steps.length - 1);
  if (Array.isArray(s.weapons)) combat.owned = s.weapons;
  if (Array.isArray(s.ammo)) combat.ammo = s.ammo;
  if (Array.isArray(s.reserves)) combat.reserves = s.reserves;
  game.hour = s.hour;
  gameApi.teleport(s.x, s.z, s.heading);
  game.state = 'playing';
  hud.hideTitle();
  hud.showPause(false);
  hud.setVisible(true);
  hud.setMoney(game.money);
  hud.setWanted(0);
  hud.setHealth(game.health, game.armor);
  hud.setClock(game.hour);
  rig.setTimeOfDay(game.hour);
  hud.toast('Save loaded.');
  lockPointer();
}

function toTitle() {
  game.state = 'title';
  hud.setVisible(false);
  hud.showPause(false);
  hud.showMap(false);
  hud.showTitle(hasSave(STORE) ? loadGame(STORE) : null);
  if (document.pointerLockElement) document.exitPointerLock();
}

function pauseGame(fromLockLoss) {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  hud.showPause(true);
  if (document.pointerLockElement) document.exitPointerLock();
}

function resumeGame() {
  if (game.state !== 'paused') return;
  game.state = 'playing';
  hud.showPause(false);
  lockPointer();
}

function startMission(i) {
  if (i >= MISSIONS.length) { hud.toast('All missions complete. Free roam.'); return; }
  const m = engineStartMission(i);
  if (!m) return;
  game.mission = m;
  game.sideJob = null;
  const def = MISSIONS[i];
  if (def.startWanted) {
    WANTED.add(game.wanted, def.startWanted);
    police.setLevel(game.wanted.level);
    hud.setWanted(game.wanted.level);
  }
  if (i === 3) game.courier = traffic.cars[0] || null; // mission 4: tail the courier
  hud.setDialog(`MISSION ${i + 1} — ${def.name}: ${def.brief}`, 6000);
  hud.setMission(`MISSION ${i + 1} — ${def.name}: ${m.dialog}`);
  audio.blip(660, 0.12, 'triangle', 0.2);
}

// ---------- vehicles ----------
function nearestCar(maxD) {
  let best = null, bd = maxD;
  for (const v of parked) {
    if (v.wrecked) continue;
    const d = Math.hypot(v.x - player.x, v.z - player.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

function enterCar(v) {
  const wasParked = !!v.parked;
  game.inCar = v;
  v.parked = false;
  mara.visible = false;
  hud.setPrompt('');
  audio.setRadio(true);
  audio.blip(440, 0.08, 'square', 0.15);
  if (v.kind === 'police') {
    WANTED.add(game.wanted, 2);
    hud.setDialog('MARA: Stole a police cruiser. That was loud.', 4000);
  } else if (wasParked && !v.stolen) {
    // Stealing a parked car raises heat once.
    v.stolen = true;
    WANTED.add(game.wanted, 1);
    hud.setDialog(`MARA: ${v.def.name} is mine now.`, 3500);
  }
}

function exitCar() {
  const v = game.inCar;
  if (!v) return;
  game.inCar = null;
  player.x = v.x - Math.sin(v.heading + Math.PI / 2) * 3;
  player.z = v.z - Math.cos(v.heading + Math.PI / 2) * 3;
  player.heading = v.heading;
  mara.visible = true;
  mara.position.set(player.x, groundY(player.x, player.z), player.z);
  mara.rotation.y = player.heading;
  audio.setRadio(false);
}

// ---------- combat ----------
function fireWeapon() {
  const res = combat.fire();
  if (!res) {
    if (combat.ammo[combat.current] === 0) hud.setPrompt('R — RELOAD');
    return;
  }
  audio.shot(res.weapon.name);
  const cam = rig.camera;
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const o = cam.position;
  // Targets: police cars, traffic cars, peds, foot officers.
  const targets = [];
  for (const c of police.cars) targets.push({ x: c.x, y: 1.2, z: c.z, r: 2.6, type: 'police', ref: c });
  for (const tc of traffic.cars) targets.push({ x: tc.v.x, y: 1.2, z: tc.v.z, r: 2.6, type: 'traffic', ref: tc });
  for (const o of officers.list) targets.push({ x: o.x, y: 1.2, z: o.z, r: 1.0, type: 'officer', ref: o });
  peds.npcs.forEach((n, i) => {
    const x = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
    const z = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
    targets.push({ x, y: 1.2, z, r: 1.0, type: 'ped', ref: n });
  });
  let end = new THREE.Vector3().copy(o).addScaledVector(dir, 120);
  for (let p = 0; p < res.pellets; p++) {
    const spread = res.pellets > 1 ? 0.06 : 0.008;
    const d2 = dir.clone();
    d2.x += (Math.random() - 0.5) * spread;
    d2.y += (Math.random() - 0.5) * spread;
    d2.z += (Math.random() - 0.5) * spread;
    d2.normalize();
    const hit = rayHit(o.x, o.y, o.z, d2.x, d2.y, d2.z, targets, 120);
    if (hit) {
      end = new THREE.Vector3().copy(o).addScaledVector(d2, hit.t);
      const t = hit.target;
      if (t.type === 'police') {
        t.ref.health -= res.weapon.dmg;
        if (t.ref.health <= 0 && !t.ref.wrecked) {
          t.ref.wrecked = true;
          WANTED.add(game.wanted, 1);
          hud.toast('Police cruiser wrecked.');
        }
      } else if (t.type === 'officer') {
        if (officers.damage(t.ref, res.weapon.dmg)) {
          officers.remove(officers.list.indexOf(t.ref));
          WANTED.add(game.wanted, 1);
          hud.toast('Officer down. The heat rises.');
        }
      } else if (t.type === 'traffic') {
        t.ref.v.health -= res.weapon.dmg;
        if (t.ref.v.health <= 0 && !t.ref.v.wrecked) {
          t.ref.v.wrecked = true;
          WANTED.add(game.wanted, 1);
        }
        t.ref.speed = 0;
      } else if (t.type === 'ped') {
        peds.assignRoad(t.ref, player.x, player.z); // flees
        WANTED.add(game.wanted, 1);
      }
      break;
    }
  }
  const tr = tracers.find((t) => t.t <= 0) || tracers[0];
  const muzzle = new THREE.Vector3().copy(o).addScaledVector(dir, 1.5);
  tr.line.geometry.setFromPoints([muzzle, end]);
  tr.line.material.opacity = 0.9;
  tr.t = 0.08;
  hud.setWeapon(combat.hudText());
}

// ---------- main loop ----------
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;
  const t = game.time;

  // Settle frames for screenshots: run the world but keep player still.
  if (game.settleFrames > 0) game.settleFrames--;

  if (game.state === 'playing') {
    // Day cycle: 1 game hour per 6 real minutes.
    game.hour = (game.hour + dt / 360) % 24;
    rig.setTimeOfDay(game.hour);
    hud.setClock(game.hour);
    const dusk = game.hour >= 17.5 || game.hour < 6;
    for (const v of parked) setHeadlights(v, dusk);
    for (const tc of traffic.cars) setHeadlights(tc.v, dusk);

    // Mouse look.
    const { dx, dy } = input.consumeMouse();
    if (dx || dy) game.lastMouseMove = t;
    rig.yaw -= dx * 0.003;
    rig.pitch = clamp(rig.pitch + dy * 0.003, 0.05, 1.15);

    if (!game.inCar) updateOnFoot(dt, t);
    else updateDriving(dt, t);

    updateMissions(dt, t);
    updateWanted(dt, t);
    updateBustedWasted(dt, t);
    updateHotkeys(dt, t);
    updateWorld(dt, t);
    updateCameraHud(dt, t);
  } else if (game.state === 'title') {
    // Slow orbit over the city behind the title screen (lower, more skyline in frame).
    const a = t * 0.02;
    rig.camera.position.set(Math.cos(a) * 420, 100, Math.sin(a) * 420);
    rig.camera.lookAt(0, 40, 0); // more sky gradient in frame
    rig.skyMesh.position.set(rig.camera.position.x, 0, rig.camera.position.z);
    world.update(dt, t);
    traffic.update(dt, t);
    peds.update(dt, 0, 0);
    if (input.wasPressed('Enter')) newGame();
  } else if (game.state === 'map') {
    hud.drawCityMap({
      px: player.x, pz: player.z, heading: rig.yaw,
      police: police.cars.map((c) => ({ x: c.x, z: c.z })),
      waypoint: game.waypoint,
    });
    if (input.wasPressed('Tab') || input.wasPressed('Escape')) {
      game.state = 'playing';
      hud.showMap(false);
    }
  } else if (game.state === 'paused') {
    if (input.wasPressed('Escape')) resumeGame();
  }

  // FPS.
  game.frames++;
  if (now - game.fpsT > 1000) {
    game.fps = game.frames * 1000 / (now - game.fpsT);
    game.frames = 0;
    game.fpsT = now;
  }
  input.endFrame();
  rig.render();
}

// --- on foot: move, collide, animate, prompt, combat ---
function updateOnFoot(dt, t) {
  const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
  const sp = sprint ? 9 : 4.5;
  let mx = 0, mz = 0;
  if (input.down('KeyW')) { mx += Math.sin(rig.yaw); mz += Math.cos(rig.yaw); }
  if (input.down('KeyS')) { mx -= Math.sin(rig.yaw); mz -= Math.cos(rig.yaw); }
  if (input.down('KeyA')) { mx -= Math.cos(rig.yaw); mz += Math.sin(rig.yaw); }
  if (input.down('KeyD')) { mx += Math.cos(rig.yaw); mz -= Math.sin(rig.yaw); }
  const ml = Math.hypot(mx, mz);
  player.moving = ml > 0;
  if (ml > 0) {
    mx /= ml;
    mz /= ml;
    let nx = player.x + mx * sp * dt;
    let nz = player.z + mz * sp * dt;
    // Water boundary: the ocean is not walkable; only the pier deck corridor
    // leads west past the beach. Block the axis that would enter the water,
    // so the player slides along the shore instead.
    if (inWater(nx, nz)) nx = player.x;
    if (inWater(player.x, nz)) nz = player.z;
    player.x = nx;
    player.z = nz;
    player.heading = Math.atan2(mx, mz);
    player.phase += dt * sp * 1.6;
    // Collide with buildings.
    const r = 0.7;
    for (const c of world.colliders) {
      const cx = clamp(player.x, c.x0, c.x1), cz = clamp(player.z, c.z0, c.z1);
      const dx2 = player.x - cx, dz2 = player.z - cz;
      const dd = Math.hypot(dx2, dz2);
      if (dd < r && dd > 0.001) {
        player.x = cx + (dx2 / dd) * r;
        player.z = cz + (dz2 / dd) * r;
      }
    }
    player.x = clamp(player.x, -795, 795);
    player.z = clamp(player.z, -795, 795);
  }
  mara.position.set(player.x, groundY(player.x, player.z), player.z);
  mara.rotation.y = player.heading;
  if (player.moving) animateWalk(maraParts, player.phase, 0.7, sprint ? 1.3 : 1);
  else animateIdle(maraParts, t);
  // Prompt: enter car.
  const nc = nearestCar(4.5);
  if (nc) hud.setPrompt(`F — ${nc.parked && !nc.stolen ? 'STEAL' : 'ENTER'} ${nc.def.name}`);
  else hud.setPrompt('');
  // Combat.
  combat.update(dt);
  if (input.wasPressed('Digit1')) { combat.switchTo(0); hud.setWeapon(combat.hudText()); }
  if (input.wasPressed('Digit2')) { combat.switchTo(1); hud.setWeapon(combat.hudText()); }
  if (input.wasPressed('Digit3')) { combat.switchTo(2); hud.setWeapon(combat.hudText()); }
  if (input.wasPressed('KeyR')) {
    if (combat.reload()) {
      hud.setWeapon(combat.hudText());
      audio.blip(1200, 0.05, 'square', 0.1);
    }
  }
  if (input.mouseDown && input.locked) fireWeapon();
  if (input.wasPressed('KeyF') && nc) enterCar(nc);
  if (input.wasPressed('KeyE')) tryInteract();
}

// --- driving: throttle/steer/handbrake, chase cam, horn, engine hum ---
function updateDriving(dt, t) {
  const inCar = game.inCar;
  const th = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
  const st = (input.down('KeyA') ? -1 : 0) + (input.down('KeyD') ? 1 : 0);
  const hb = input.down('Space');
  updateVehicle(inCar, { throttle: th, steer: st, handbrake: hb }, dt, world.colliders);
  player.x = inCar.x;
  player.z = inCar.z;
  player.heading = inCar.heading;
  // Chase cam follows the car unless the mouse moved recently.
  if (t - game.lastMouseMove > 1.2) {
    rig.yaw += normAngle(inCar.heading - rig.yaw) * Math.min(1, 2.2 * dt);
  }
  if (input.wasPressed('KeyF')) exitCar();
  if (input.wasPressed('KeyH')) audio.blip(220, 0.35, 'square', 0.2);
  audio.setEngine(Math.abs(inCar.speed) / inCar.def.top, true);
  hud.setSpeed(Math.abs(inCar.speed) * 3.6, inCar.def.name);
  if (inCar.wrecked) hud.setPrompt('Vehicle wrecked — press F to get out.');
}

// --- missions: feed context to the engine, apply its events ---
function updateMissions(dt, t) {
  const courierNear = game.courier ? Math.hypot(game.courier.v.x - player.x, game.courier.v.z - player.z) < 25 : false;
  const mctx = {
    x: player.x, z: player.z,
    inCar: !!game.inCar, stoleKind: game.inCar ? game.inCar.kind : null,
    wanted: game.wanted.level,
    chaseClose: (game.mission && game.mission.idx === 3 && game.mission.step === 1) ? courierNear
      : police.cars.some((c) => Math.hypot(c.x - player.x, c.z - player.z) < 60),
    speed: game.inCar ? Math.abs(game.inCar.speed) : 0,
    wrecked: game.inCar ? !!game.inCar.wrecked : false,
  };
  const active = game.mission && game.mission.status === 'active' ? game.mission
    : game.sideJob && game.sideJob.status === 'active' ? game.sideJob : null;
  if (active) {
    const events = updateMission(active, dt, mctx);
    for (const ev of events) {
      if (ev.type === 'step') hud.setMission(ev.text);
      if (ev.type === 'dialog') hud.setDialog(ev.text, 5000);
      if (ev.type === 'complete') {
        game.money += ev.reward;
        hud.setMoney(game.money);
        hud.setDialog(`MISSION COMPLETE — ${ev.name}: +$${ev.reward}`, 6000);
        hud.setMission('Press M for the next mission.');
        audio.jingle();
        WANTED.clear(game.wanted);
        police.setLevel(0);
        hud.setWanted(0);
        game.waypoint = null;
        if (active === game.sideJob) game.sideJob = null;
      }
    }
    // Mission 5 fails if the car is wrecked while escaping.
    if (active === game.mission && game.mission.idx === 4 && mctx.wrecked) {
      game.mission.status = 'failed';
      hud.setDialog('MISSION FAILED — Car wrecked. Press M to retry.', 6000);
      game.waypoint = null;
    }
  }
  // Waypoint from the current step.
  game.waypoint = null;
  if (active) {
    const step = currentStep(active);
    if (step) {
      if (step.type === 'goto' || step.type === 'deliver') game.waypoint = { x: step.x, z: step.z };
      else if (step.type === 'visit') {
        const next = step.points.findIndex((_, i) => !active.visited.has(i));
        if (next >= 0) game.waypoint = { x: step.points[next][0], z: step.points[next][1] };
      } else if (step.type === 'chase' && game.courier) {
        game.waypoint = { x: game.courier.v.x, z: game.courier.v.z };
      }
    }
  }
}

// --- wanted level: decay when unseen, siren volume by distance ---
function updateWanted(dt, t) {
  const seen = police.seesPlayer(player.x, player.z);
  WANTED.update(game.wanted, dt, seen);
  police.setLevel(game.wanted.level);
  hud.setWanted(game.wanted.level);
  const nearPolice = police.cars.length ? Math.min(...police.cars.map((c) => Math.hypot(c.x - player.x, c.z - player.z))) : 999;
  audio.setSiren(game.wanted.level > 0, nearPolice / 300);
}

// --- busted (arrested on foot at wanted 3+) / wasted (health 0) ---
function updateBustedWasted(dt, t) {
  if (!game.inCar && game.wanted.level >= 3) {
    const close = police.cars.some((c) => Math.hypot(c.x - player.x, c.z - player.z) < 4);
    game.bustT = close ? game.bustT + dt : 0;
    if (game.bustT > 1.5) {
      game.money = Math.max(0, game.money - 100);
      hud.setMoney(game.money);
      hud.setDialog('BUSTED — $100 bail. The heat is off... for now.', 5000);
      WANTED.clear(game.wanted);
      police.setLevel(0);
      hud.setWanted(0);
      gameApi.teleport(PLAYER.spawn.x, PLAYER.spawn.z, PLAYER.spawn.heading);
      game.bustT = 0;
    }
  }
  if (game.health <= 0) {
    game.health = 100;
    game.money = Math.max(0, game.money - 150);
    hud.setMoney(game.money);
    hud.setHealth(100, game.armor);
    hud.setDialog('WASTED — You woke up at Delta General. -$150.', 5000);
    WANTED.clear(game.wanted);
    police.setLevel(0);
    hud.setWanted(0);
    gameApi.teleport(200, -440, 0);
  }
}

// --- hotkeys: pause, map, next mission, save, radio, side job, interact ---
function updateHotkeys(dt, t) {
  if (input.wasPressed('Escape')) pauseGame(false);
  if (input.wasPressed('Tab')) {
    game.state = 'map';
    hud.showMap(true);
  }
  if (input.wasPressed('KeyM')) {
    if (!game.mission || game.mission.status !== 'active') {
      const idx = !game.mission ? 0 : game.mission.status === 'done' ? game.mission.idx + 1 : game.mission.idx;
      startMission(idx);
    } else hud.toast('Mission already active.');
  }
  if (input.wasPressed('KeyN')) {
    saveGame(STORE, {
      money: game.money, health: game.health, armor: game.armor,
      mission: game.mission ? game.mission.idx : 0,
      step: game.mission ? game.mission.step : 0,
      hour: game.hour, x: player.x, z: player.z, heading: player.heading,
      weapons: combat.owned, ammo: combat.ammo, reserves: combat.reserves,
    });
    hud.toast('Game saved.');
    audio.blip(880, 0.1, 'sine', 0.15);
  }
  if (input.wasPressed('KeyQ')) {
    const n = audio.nextStation();
    hud.setRadio('RADIO: ' + n);
    audio.setRadio(true);
  }
  if (input.wasPressed('KeyJ')) {
    const ids = SIDE_JOBS.map((j) => j.id);
    const last = game.sideJob ? ids.indexOf(game.sideJob.def.id) : -1;
    const idx = (last + 1) % ids.length;
    const spots = parked.map((v) => [v.x, v.z]);
    game.sideJob = startSideJob(ids[idx], rng, spots.length ? spots : [[0, 0], [600, 700]]);
    if (game.sideJob) hud.setDialog(`SIDE JOB — ${game.sideJob.def.name}: ${game.sideJob.def.brief}`, 5000);
  }
  if (input.wasPressed('KeyE')) tryInteract();
}

// --- world simulation: traffic, peds, police, officers, tracers, ramming ---
function updateWorld(dt, t) {
  world.update(dt, t);
  traffic.update(dt, t);
  peds.update(dt, player.x, player.z);
  police.update(dt, t, player.x, player.z, game.inCar ? Math.abs(game.inCar.speed) : 0);
  officers.update(dt, t, player.x, player.z, !game.inCar, game.wanted.level, police.cars, (dmg) => {
    game.health -= dmg;
    hud.setHealth(Math.max(0, game.health), game.armor);
    hud.flashDamage();
  });
  for (const tr of tracers) {
    if (tr.t > 0) {
      tr.t -= dt;
      if (tr.t <= 0) tr.line.material.opacity = 0;
    }
  }
  // Police ramming damage on foot.
  if (!game.inCar) {
    for (const c of police.cars) {
      if (Math.hypot(c.x - player.x, c.z - player.z) < 2.5) {
        game.health -= 12 * dt;
        hud.setHealth(Math.max(0, game.health), game.armor);
        hud.flashDamage();
      }
    }
  }
  // Waypoint marker.
  if (game.waypoint) {
    waypointMarker.visible = true;
    waypointBeam.visible = true;
    waypointMarker.position.set(game.waypoint.x, groundY(game.waypoint.x, game.waypoint.z) + 8 + Math.sin(t * 3) * 1.2, game.waypoint.z);
    waypointMarker.rotation.y = t * 1.5;
    waypointBeam.position.set(game.waypoint.x, groundY(game.waypoint.x, game.waypoint.z) + 30, game.waypoint.z);
    const d = Math.hypot(game.waypoint.x - player.x, game.waypoint.z - player.z);
    const cur = $('mission-text');
    if (cur && game.mission && game.mission.status === 'active') {
      const step = currentStep(game.mission);
      if (step) cur.textContent = `MISSION ${game.mission.idx + 1} — ${game.mission.def.name}: ${step.text} (${Math.round(d)}m)`;
    }
  } else {
    waypointMarker.visible = false;
    waypointBeam.visible = false;
  }
}

// --- camera + HUD: chase cam, district label, speed, minimap ---
function updateCameraHud(dt, t) {
  const gy = groundY(player.x, player.z);
  const speed01 = game.inCar ? Math.abs(game.inCar.speed) / game.inCar.def.top : 0;
  camTarget = { x: player.x, y: gy + 2.2, z: player.z };
  rig.updateCamera(dt, camTarget.x, camTarget.y, camTarget.z, player.heading, speed01, !!game.inCar, world.colliders);
  const dist = districtAt(player.x, player.z);
  hud.setDistrict(dist.name, dist.sub);
  if (!game.inCar) hud.setSpeed(0, 'ON FOOT');
  hud.drawMinimap({
    px: player.x, pz: player.z, heading: rig.yaw,
    police: police.cars.map((c) => ({ x: c.x, z: c.z })),
    traffic: traffic.cars.map((c) => ({ x: c.v.x, z: c.v.z })),
    waypoint: game.waypoint,
  });
}

function tryInteract() {
  // E: context interaction — mission props near the waypoint.
  if (game.waypoint) {
    const d = Math.hypot(game.waypoint.x - player.x, game.waypoint.z - player.z);
    if (d < 8) hud.toast('You are at the marker.');
  }
}

boot();
