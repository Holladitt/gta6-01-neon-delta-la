// main.js — Neon Delta LA: boot, game loop, player, missions, combat.
// The entry the page loads. Exposes window.__ndState for the shoot driver.
import * as THREE from 'three';
import { START_CASH, SAVE_KEY, MISSIONS, WEAPONS, districtAt } from './config.js';
import { startMission, updateMission, currentStep } from './missions.js';
import { WANTED, newWantedState } from './wanted.js';
import { newCrewState, applySwap, applyRepair, applyOverwatch, tickCooldown } from './crew.js';
import { Combat } from './combat.js';
import { buyWeapon } from './shop.js';
import { collisionDamage, applyCollisionDamage } from './damage.js';
import { nightLevel } from './lights.js';
import { makeSave, decodeSave, encodeSave } from './save.js';
import { rpForReward, rankFor } from './rank.js';
import { createScene, updateScene } from './scene.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createHUD } from './hud.js';
import { PedSystem } from './characters.js';
import { Car, makeCarMesh } from './vehicles.js';
import { TrafficSystem } from './traffic.js';
import { PoliceSystem } from './police.js';
import { OfficerSystem } from './officers.js';
import { buildDispatch } from './dispatch.js';
import { buildParkedCars } from './geo.js';
import { stageShot, buildState } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = Number(params.get('shot') || 0);

const G = {
  state: 'title',
  ticks: 0,
  time: 0,
  hour: 12,
  day: 1,
  money: START_CASH,
  rp: 0,
  freezeClock: false,
  errors: [],
  player: { x: 0, z: 40, heading: 0, speed: 0, onFoot: true, health: 100 },
  car: null,
  parkedCars: [],
  missionIndex: 0,
  mission: null,
  missionTarget: null,
  wanted: newWantedState(),
  crew: newCrewState(),
  combat: new Combat(),
  dispatchUnits: [],
  shopOpen: false,
  cameraOverride: null,
  chaseTarget: null,
  enemies: [],
  stats: { missionsDone: 0, totalEarned: 0, carsStolen: 0 },
};

// ---- Boot ----
const S = createScene();
const input = createInput();
const audio = createAudio();
const hud = createHUD(G);
G.hud = hud;
const peds = new PedSystem(S.scene);
const traffic = new TrafficSystem(S.scene);
const police = new PoliceSystem(S.scene);
const officers = new OfficerSystem(S.scene);
G.police = police;

// Player car (starts parked beside the player downtown).
G.car = new Car(0, 52, 0, 'player', 0x1f8a8a);
G.car.onCollide = (impact) => {
  const dmg = collisionDamage(impact);
  if (dmg > 0) {
    G.car.health = applyCollisionDamage(G.car.health, impact);
    hud.toast(`Crash! -$${dmg} condition`);
  }
};
S.scene.add(G.car.mesh);

// Player on-foot figure (turquoise jacket).
const playerMesh = new THREE.Group();
{
  const jacket = new THREE.MeshLambertMaterial({ color: 0x1f8a8a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b48c });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222831 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.45), jacket);
  body.position.y = 0.85;
  playerMesh.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
  head.position.y = 1.75;
  playerMesh.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.31, 10, 8), dark);
  hair.position.y = 1.82;
  hair.scale.set(1, 0.7, 1);
  playerMesh.add(hair);
  for (const s of [0.22, -0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), dark);
    leg.position.set(s, 0.3, 0);
    playerMesh.add(leg);
  }
}
S.scene.add(playerMesh);

// Parked cars (stealable).
for (const p of buildParkedCars()) {
  const mesh = makeCarMesh(p.kind, p.color);
  mesh.position.set(p.x, 0, p.z);
  mesh.rotation.y = p.heading;
  S.scene.add(mesh);
  G.parkedCars.push({ ...p, mesh, taken: false });
}

// Chase target car (used by chase steps).
const chaseMesh = makeCarMesh('sedan', 0xf1c40f);
chaseMesh.visible = false;
S.scene.add(chaseMesh);

// Mission beacon: a bobbing golden diamond at the current objective.
const beacon = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.6),
  new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.85 })
);
beacon.visible = false;
S.scene.add(beacon);

// Enemy shooters (survive steps): dark-red figures.
const enemyMeshes = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0x8a1f1f });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a06b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.15, 0.45), red);
  body.position.y = 0.65;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 6), skin);
  head.position.y = 1.45;
  g.add(head);
  g.visible = false;
  S.scene.add(g);
  enemyMeshes.push(g);
}

// ---- Save / load ----
function saveGame() {
  const s = {
    money: G.money, mission: G.missionIndex, step: G.mission ? G.mission.step : 0,
    health: G.player.health, armor: 0, x: G.player.x, z: G.player.z, heading: G.player.heading,
    hour: G.hour, weapons: G.combat.owned.slice(), ammo: G.combat.ammo.slice(),
    reserves: G.combat.reserves.slice(), day: G.day, rp: G.rp, standing: {},
    plateT: G.crew.cooldownT, repairT: G.crew.repairT, watchT: G.crew.watchT, watchCd: G.crew.watchCd,
    stats: { ...G.stats },
  };
  try {
    localStorage.setItem(SAVE_KEY, encodeSave(s));
    hud.toast('Game saved');
  } catch { /* storage unavailable */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = decodeSave(raw);
    if (!d) return false;
    G.money = d.money;
    G.missionIndex = d.mission;
    G.day = d.day;
    G.rp = d.rp;
    G.hour = d.hour;
    G.player.x = d.x;
    G.player.z = d.z;
    G.player.heading = d.heading;
    G.player.health = d.health;
    G.combat.owned = d.weapons.slice();
    G.combat.ammo = d.ammo.slice();
    G.combat.reserves = d.reserves.slice();
    G.crew.cooldownT = d.plateT;
    G.crew.repairT = d.repairT;
    G.crew.watchT = d.watchT;
    G.crew.watchCd = d.watchCd;
    G.stats = { ...d.stats };
    return true;
  } catch {
    return false;
  }
}

// ---- Missions ----
function beginMission(i) {
  if (i < 0 || i >= MISSIONS.length) return;
  G.missionIndex = i;
  G.mission = startMission(i);
  G.state = 'mission';
  const def = MISSIONS[i];
  if (def.startWanted) WANTED.add(G.wanted, def.startWanted);
  if (def.hour) G.hour = def.hour;
  hud.showDialog(def.contact, `M${i + 1} • ${def.name} — $${def.reward}`, def.brief);
  hud.toast(`New job: ${def.name}`);
  audio.blip(660);
}

function completeMission() {
  const def = G.mission.def;
  G.money += def.reward;
  G.rp += rpForReward(def.reward);
  G.stats.missionsDone += 1;
  G.stats.totalEarned += def.reward;
  G.day += 1;
  hud.toast(`JOB DONE — ${def.name} +$${def.reward} • ${rankFor(G.rp).title}`);
  hud.showDialog(def.contact, `${def.name} — DONE`, `Clean work, Mara. $${def.reward} is yours. ${rankFor(G.rp).title} now.`);
  audio.blip(880);
  G.mission = null;
  G.missionTarget = null;
  G.missionIndex = def ? MISSIONS.indexOf(def) + 1 : G.missionIndex + 1;
  G.state = 'roam';
  saveGame();
}

function missionContext() {
  const ctx = {
    x: G.player.x, z: G.player.z,
    inCar: G.player.inCar,
    stoleKind: G.justStoleKind || null,
    wanted: G.wanted.level,
    chaseClose: false,
    speed: G.player.inCar ? Math.abs(G.car.speed) : G.player.speed,
    wrecked: G.player.health <= 0,
  };
  const s = currentStep(G.mission);
  if (s && s.type === 'chase' && G.chaseTarget) {
    ctx.chaseClose = Math.hypot(G.chaseTarget.x - G.player.x, G.chaseTarget.z - G.player.z) < 25;
  }
  return ctx;
}

function updateMissionTarget() {
  if (!G.mission) {
    G.missionTarget = null;
    beacon.visible = false;
    return;
  }
  const s = currentStep(G.mission);
  if (!s) {
    G.missionTarget = null;
    beacon.visible = false;
    return;
  }
  if (s.type === 'goto' || s.type === 'deliver') G.missionTarget = { x: s.x, z: s.z };
  else if (s.type === 'visit') {
    const next = s.points.find((p) => !G.mission.visited.includes(p));
    G.missionTarget = next ? { x: next[0], z: next[1] } : null;
  } else if (s.type === 'steal') {
    const pc = G.parkedCars.find((c) => !c.taken && c.kind === s.kind);
    G.missionTarget = pc ? { x: pc.x, z: pc.z } : null;
  } else if (s.type === 'chase' && G.chaseTarget) {
    G.missionTarget = { x: G.chaseTarget.x, z: G.chaseTarget.z };
  } else {
    G.missionTarget = null;
  }
  beacon.visible = !!G.missionTarget;
  if (G.missionTarget) {
    beacon.position.set(G.missionTarget.x, 3 + Math.sin(G.time * 2) * 0.5, G.missionTarget.z);
    beacon.rotation.y += 0.02;
  }
}

// ---- Combat / shooting ----
function fireWeapon() {
  const shot = G.combat.fire();
  if (!shot) return;
  audio.shot();
  // Aim: the camera's forward direction projected to the ground.
  const dir = new THREE.Vector3();
  S.camera.getWorldDirection(dir);
  const aimX = dir.x, aimZ = dir.z;
  const aimLen = Math.hypot(aimX, aimZ) || 1;
  const ax = aimX / aimLen, az = aimZ / aimLen;
  let best = null, bestD = Infinity;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const dx = e.x - G.player.x, dz = e.z - G.player.z;
    const d = Math.hypot(dx, dz);
    if (d > WEAPONS[shot.weapon].range) continue;
    const dot = (dx * ax + dz * az) / (d || 1);
    if (dot > 0.86 && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (best) {
    best.health -= shot.damage;
    hud.toast(`Hit! ${best.health > 0 ? 'target wounded' : 'target down'}`);
    if (best.health <= 0) {
      best.alive = false;
      best.mesh.visible = false;
    }
  }
}

// ---- Arrest / wasted ----
function arrest() {
  if (G.state === 'arrest') return;
  G.state = 'arrest';
  const fine = Math.min(200, G.money);
  G.money -= fine;
  G.wanted.level = 0;
  G.wanted.quietTimer = 0;
  hud.showBusted(true);
  setTimeout(() => {
    hud.showBusted(false);
    G.player.x = 0;
    G.player.z = 40;
    G.player.heading = 0;
    G.player.onFoot = true;
    G.player.health = 100;
    G.state = 'roam';
  }, 2600);
}

function wasted() {
  if (G.state === 'arrest') return;
  G.state = 'arrest';
  const fine = Math.min(200, G.money);
  G.money -= fine;
  hud.toast('WASTED — you wake up downtown, $200 lighter');
  setTimeout(() => {
    G.player.x = 0;
    G.player.z = 40;
    G.player.heading = 0;
    G.player.onFoot = true;
    G.player.health = 100;
    if (G.mission) G.mission = startMission(G.missionIndex);
    G.state = G.mission ? 'mission' : 'roam';
  }, 2200);
}

officers.onArrest = arrest;

// ---- Shop ----
G.buyWeapon = (index) => {
  const r = buyWeapon(G.money, G.combat.owned, G.combat.ammo, G.combat.reserves, index);
  if (r.ok) {
    G.money = r.money;
    G.combat.owned = r.owned;
    G.combat.ammo = r.ammo;
    G.combat.reserves = r.reserves;
  }
  return r;
};

// ---- Player ----
function nearestParked(maxD) {
  let best = null, bestD = Infinity;
  for (const pc of G.parkedCars) {
    if (pc.taken) continue;
    const d = Math.hypot(pc.x - G.player.x, pc.z - G.player.z);
    if (d < bestD && d < maxD) {
      best = pc;
      bestD = d;
    }
  }
  return best;
}

function enterCar(pc) {
  const car = new Car(pc.x, pc.z, pc.heading, pc.kind, pc.color);
  car.onCollide = G.car ? G.car.onCollide : null;
  S.scene.add(car.mesh);
  if (G.car) {
    S.scene.remove(G.car.mesh);
    G.car = car;
  } else {
    G.car = car;
  }
  pc.taken = true;
  pc.mesh.visible = false;
  G.player.inCar = true;
  G.player.x = car.x;
  G.player.z = car.z;
  G.player.heading = car.heading;
  G.justStoleKind = pc.kind;
  G.stats.carsStolen += 1;
  WANTED.add(G.wanted, 1);
  hud.toast(`Stole a ${pc.kind} — the NDPD is on you`);
}

function exitCar() {
  if (!G.car) return;
  G.player.inCar = false;
  G.player.x = G.car.x + Math.sin(G.car.heading + Math.PI / 2) * 3;
  G.player.z = G.car.z - Math.cos(G.car.heading + Math.PI / 2) * 3;
  G.player.heading = G.car.heading;
  G.player.speed = 0;
}

function updatePlayer(dt) {
  const k = input.down;
  if (G.player.inCar && G.car) {
    const carInput = {
      forward: !!(k.KeyW || k.ArrowUp),
      back: !!(k.KeyS || k.ArrowDown),
      left: !!(k.KeyA || k.ArrowLeft),
      right: !!(k.KeyD || k.ArrowRight),
      handbrake: !!k.Space,
    };
    G.car.update(dt, carInput, S.colliders);
    G.player.x = G.car.x;
    G.player.z = G.car.z;
    G.player.heading = G.car.heading;
    G.player.speed = G.car.speed;
    playerMesh.visible = false;
    G.car.mesh.visible = true;
  } else {
    const mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const mz = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    const len = Math.hypot(mx, mz) || 1;
    const sp = 6;
    G.player.speed = (mx || mz) ? sp : 0;
    // Move relative to the camera (camera looks along the player's heading).
    const fx = Math.sin(G.player.heading), fz = -Math.cos(G.player.heading);
    const rx = Math.cos(G.player.heading), rz = Math.sin(G.player.heading);
    G.player.x += (fx * -mz + rx * mx) / len * sp * dt;
    G.player.z += (fz * -mz + rz * mx) / len * sp * dt;
    if (mx || mz) G.player.heading = Math.atan2((fx * -mz + rx * mx) / len, -((fz * -mz + rz * mx) / len));
    playerMesh.position.set(G.player.x, 0, G.player.z);
    playerMesh.rotation.y = G.player.heading;
    playerMesh.visible = true;
    if (G.car) G.car.mesh.visible = true;
  }
  // Enter / exit a car.
  if (input.wasPressed('KeyE')) {
    if (G.player.inCar) {
      exitCar();
    } else {
      const pc = nearestParked(5);
      if (pc) enterCar(pc);
      else if (G.car && Math.hypot(G.car.x - G.player.x, G.car.z - G.player.z) < 5) {
        G.player.inCar = true;
        G.player.x = G.car.x;
        G.player.z = G.car.z;
        G.player.heading = G.car.heading;
      } else if (Math.hypot(90 - G.player.x, 152 - G.player.z) < 18) {
        if (G.shopOpen) hud.closeShop();
        else hud.openShop();
      }
    }
  }
}

// ---- Enemies / chase target ----
function updateEnemies(dt) {
  const s = G.mission ? currentStep(G.mission) : null;
  const wantEnemies = s && s.type === 'survive' ? 3 : 0;
  for (let i = 0; i < enemyMeshes.length; i++) {
    const mesh = enemyMeshes[i];
    let e = G.enemies[i];
    if (i < wantEnemies) {
      if (!e) {
        const a = (i / 3) * Math.PI * 2;
        e = { x: G.player.x + Math.sin(a) * 30, z: G.player.z + Math.cos(a) * 30, health: 100, alive: true, mesh };
        G.enemies[i] = e;
      }
      if (!e.alive) continue;
      mesh.visible = true;
      const dx = G.player.x - e.x, dz = G.player.z - e.z;
      const d = Math.hypot(dx, dz);
      if (d > 1) {
        e.x += (dx / d) * 3.4 * dt;
        e.z += (dz / d) * 3.4 * dt;
      }
      mesh.position.set(e.x, 0, e.z);
      mesh.rotation.y = Math.atan2(dx, -dz);
      if (d < 30) {
        G.player.health -= 4 * dt;
        if (G.player.health <= 0) {
          G.player.health = 0;
          wasted();
        }
      }
    } else {
      if (e) {
        e.alive = false;
        mesh.visible = false;
      }
    }
  }
}

function updateChaseTarget(dt) {
  const s = G.mission ? currentStep(G.mission) : null;
  const active = (s && s.type === 'chase') || SHOT === 1;
  if (!active || !G.chaseTarget) {
    chaseMesh.visible = false;
    return;
  }
  chaseMesh.visible = true;
  G.chaseTarget.z -= G.chaseTarget.speed * dt;
  if (G.chaseTarget.z < -880) G.chaseTarget.z = 800;
  chaseMesh.position.set(G.chaseTarget.x, 0, G.chaseTarget.z);
  chaseMesh.rotation.y = G.chaseTarget.heading;
}

// ---- Main loop ----
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) dt = 0.001;
  try {
    tick(dt);
  } catch (err) {
    G.errors.push(String(err && err.message || err).slice(0, 200));
  }
  input.endFrame();
}

function tick(dt) {
  G.ticks += 1;
  G.time += dt;
  if (!G.freezeClock) G.hour = (G.hour + dt / 60) % 24;

  // Title / pause gating.
  if (G.state === 'title') {
    if (input.wasPressed('Enter') || input.anyKey) {
      audio.unlock();
      hud.hideTitle();
      G.state = G.mission ? 'mission' : 'roam';
    }
    updateScene(S, G, dt);
    S.renderer.render(S.scene, S.camera);
    hud.update();
    return;
  }
  if (input.wasPressed('Escape')) {
    if (G.state === 'paused') {
      G.state = G.mission ? 'mission' : 'roam';
      hud.showPaused(false);
    } else if (G.state !== 'arrest') {
      G.state = 'paused';
      hud.showPaused(true);
    }
  }
  if (G.state === 'paused') {
    if (input.wasPressed('KeyS')) saveGame();
    if (input.wasPressed('KeyL')) location.reload();
    updateScene(S, G, 0);
    S.renderer.render(S.scene, S.camera);
    return;
  }
  if (G.state === 'arrest') {
    updateScene(S, G, dt);
    S.renderer.render(S.scene, S.camera);
    return;
  }

  // Crew abilities.
  if (input.wasPressed('KeyC')) {
    const r = applySwap(G.crew, G.wanted.level, 45);
    if (r.ok) {
      G.wanted.level = r.wanted;
      hud.toast(`CLEAN PLATES — wanted down to ${r.wanted}`);
    } else if (r.reason === 'cooldown') {
      hud.toast(`CLEAN PLATES recharging — ${Math.ceil(G.crew.cooldownT)}s`);
    } else {
      hud.toast('CLEAN PLATES — no heat to lose');
    }
  }
  if (input.wasPressed('KeyV')) {
    const r = applyRepair(G.crew, G.car, G.money, 150, 60);
    if (r.ok) {
      G.money = r.money;
      hud.toast('FIELD REPAIR — condition 100%');
    } else if (r.reason === 'cooldown') {
      hud.toast(`FIELD REPAIR recharging — ${Math.ceil(G.crew.repairT)}s`);
    } else if (r.reason === 'no-car') {
      hud.toast('FIELD REPAIR — no car');
    } else if (r.reason === 'full') {
      hud.toast('FIELD REPAIR — already 100%');
    } else {
      hud.toast('FIELD REPAIR — not enough cash');
    }
  }
  if (input.wasPressed('KeyX')) {
    const r = applyOverwatch(G.crew, 20, 45);
    if (r.ok) hud.toast('OVERWATCH — police marked for 20s');
    else hud.toast(`OVERWATCH ${r.reason === 'active' ? 'already active' : 'recharging'}`);
  }
  tickCooldown(G.crew, dt);
  G.combat.tick(dt);

  // Next mission.
  if (input.wasPressed('KeyM') && !G.mission) {
    if (G.missionIndex < MISSIONS.length) beginMission(G.missionIndex);
    else hud.toast('All ten jobs done — you are DELTA LEGEND');
  }

  // Shooting + reload.
  if (input.clicked && G.state !== 'title') fireWeapon();
  if (input.wasPressed('KeyR')) {
    if (G.combat.reload()) hud.toast('Reloaded');
  }

  // Player + world.
  updatePlayer(dt);
  peds.update(dt, G.time);
  traffic.update(dt, G.time, G.hour);
  police.update(dt, G.player, G.wanted.level, G.time);
  officers.update(dt, G.player, !G.player.inCar, G.wanted.level);
  updateEnemies(dt);
  updateChaseTarget(dt);

  // Wanted: seen when a police car or the heli is close.
  const seen = police.activeCars.some((c) => Math.hypot(c.x - G.player.x, c.z - G.player.z) < 40) || police.heliActive;
  WANTED.update(G.wanted, dt, seen);

  // Mission engine.
  if (G.mission) {
    updateMission(G.mission, dt, missionContext());
    if (G.mission.status === 'done') completeMission();
  }
  updateMissionTarget();

  // Dispatch panel data.
  G.dispatchUnits = buildDispatch(police.activeCars, police.heliActive ? police.heliPos : null, G.player);

  // Audio.
  audio.engine(G.player.inCar ? Math.abs(G.car.speed) / 38 : 0, G.player.inCar);
  audio.siren(dt, G.wanted.level);

  updateScene(S, G, dt);
  S.renderer.render(S.scene, S.camera);
  hud.update();
  // Clear the one-tick steal flag after the mission engine has read it.
  G.justStoleKind = null;
}

// ---- Start ----
window.__ndState = () => buildState(G);
window.addEventListener('error', (e) => {
  G.errors.push(String(e.message || e).slice(0, 200));
});

if (SHOT >= 1 && SHOT <= 4) {
  loadGame();
  hud.hideTitle();
  stageShot(G, SHOT);
} else {
  const had = loadGame();
  if (had) hud.toast('Save loaded — welcome back, Mara');
  hud.showTitle();
}
requestAnimationFrame(frame);
