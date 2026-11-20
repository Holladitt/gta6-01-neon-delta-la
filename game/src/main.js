// Neon Delta LA — main orchestrator. State machine, player, missions, wanted,
// combat, save/load, HUD wiring, screenshot staging. All original content.
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, DISTRICTS, PLAYER, SAVE_KEY, MISSIONS, SIDE_JOBS, KEYS, WEAPONS, CREW, SHOP, districtAt } from './config.js';
import { mulberry32 } from './rng.js';
import { buildWorld, groundY, inWater } from './world.js';
import { buildMara, buildHuman, animateWalk, animateIdle } from './characters.js';
import { createVehicle, updateVehicle, setHeadlights, setTaillights } from './vehicles.js';
import { Traffic, Peds } from './traffic.js';
import { Police } from './police.js';
import { Officers } from './officers.js';
import { Combat, rayHit } from './combat.js';
import { startMission as engineStartMission, updateMission, startSideJob, currentStep, stageOf } from './missions.js';
import { newWantedState, WANTED } from './wanted.js';
import { loadGame, saveGame, hasSave, memoryStore } from './save.js';
import { SceneRig } from './scene.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { applyShot } from './shots.js';
import { buildDispatch } from './dispatch.js';
import { rankFor, rpForReward, addStanding, getStanding, standingLabel } from './rank.js';
import { newCrewState, canSwap, applySwap, applyRepair, applyOverwatch, tickCooldown } from './crew.js';
import { makePortraits } from './portraits.js';
import { buyWeapon } from './shop.js';
import { nightLevel, isNight } from './lights.js';

const rng = mulberry32(4242);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const UP_VEC = new THREE.Vector3(0, 1, 0); // beam-cone quaternion source (no per-frame allocation)
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
  fps: 0, frames: 0, fpsT: 0, ticks: 0, errors: [],
  day: 1, rp: 0, standing: {}, // rank/respect: RP from real payouts only
  stats: { missionsDone: 0, totalEarned: 0, carsStolen: 0 }, // career stats: only real tracked counts (v13)
  statsOpen: false, // career-stats modal open over the pause menu
  crime: 'EVADING POLICE', // last crime label shown on the dispatch panel
  witnessT: 0, // witness report countdown (0 = none pending)
  shotT: -99, // time of the last gunshot (drives NPC panic)
  crewState: newCrewState(), // CLEAN PLATES cooldown
  portraits: null,
  camHold: null, // staging-only chase-cam hold {az, pitch} via setCamHold; null = normal chase cam
};

let rig, world, traffic, peds, police, officers, hud, input, audio, combat;
let scooters = [];
let mara, maraParts, parked = [];
let waypointMarker, waypointBeam, tracers = [];
let beamCone, beamDisc; // v12: player-car headlight beam (cone + ground disc), night only
let player = { x: PLAYER.spawn.x, z: PLAYER.spawn.z, heading: PLAYER.spawn.heading, speed: 0, phase: 0, moving: false };
let camTarget = { x: 0, y: 2, z: 0 };

// ---------- boot ----------
function boot() {
  const canvas = $('c');
  rig = new SceneRig(canvas);
  world = buildWorld(rig.scene);
  traffic = new Traffic(rig.scene, world.colliders, world.trafficLights);
  traffic.spawnPortCars(6); // denser truck + car traffic around the terminal
  peds = new Peds(rig.scene, 48, 20, 24, 12); // 48 sidewalk NPCs + 20 pier crowd + v12 night extras (24 street, 12 pier)
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

  // Named contacts + street life (individual humans, not instanced peds):
  // Lucia tends the CANDY stall, two more vendors behind other stalls,
  // three sitters on pier benches, Eden at the safehouse, Harlan at the port.
  const addNamed = (opt, x, z, heading, y = 0, seated = false) => {
    const b = buildHuman({ ...opt, seated });
    b.group.position.set(x, y, z);
    b.group.rotation.y = heading;
    rig.scene.add(b.group);
    return b;
  };
  addNamed({ skin: 0xe0ac69, hair: 0x4a2c0a, shirt: 0xff7e5f, pants: 0x2c3e50, height: 1.72 }, -702, 327, Math.PI, 2.5); // Lucia Marlow, CANDY stall
  addNamed({ skin: 0xc68642, hair: 0x1a1a1a, shirt: 0xf4f4f0, pants: 0x4a3728, height: 1.78, cap: 0x2ec4b6 }, -724, 272.5, 0, 2.5);
  addNamed({ skin: 0x8d5524, hair: 0x777777, shirt: 0xf4f4f0, pants: 0x2c3e50, height: 1.7, bandana: 0xffc53d }, -680, 327, Math.PI, 2.5);
  addNamed({ skin: 0xf1c27d, hair: 0xd4a017, shirt: 0x2471a3, pants: 0x5d6d7e, height: 1.75 }, -750, 300, 0, 2.3, true);
  addNamed({ skin: 0xa06a3a, hair: 0x1a1a1a, shirt: 0xff6b9d, pants: 0x1a1a2e, height: 1.68, cap: 0xc0392b }, -724, 268, 0, 2.3, true);
  addNamed({ skin: 0xe0ac69, hair: 0xb5651d, shirt: 0x7d3c98, pants: 0x7b7b7b, height: 1.8 }, -698, 332, Math.PI, 2.3, true);
  addNamed({ skin: 0xc68642, hair: 0x777777, shirt: 0x2c3e50, pants: 0x1a1a2e, height: 1.8 }, 104, -492, Math.PI / 2); // Eden Voss, safehouse
  addNamed({ skin: 0x8d5524, hair: 0x1a1a1a, shirt: 0x5d6d7e, pants: 0x4a3728, height: 1.82, cap: 0x2471a3 }, 524, 552, -Math.PI / 2); // Harlan Dray, port gate
  addNamed({ skin: 0xc68642, hair: 0x4a2c0a, shirt: 0xffc53d, pants: 0x2c3e50, height: 1.7, ponytail: true }, -724, 312, 0, 2.5); // Inez Vargas, pier (M7 contact)
  addNamed({ skin: 0x8d5524, hair: 0x777777, shirt: 0x2471a3, pants: 0x1a1a2e, height: 1.78, cap: 0xc0392b }, 540, 580, Math.PI); // Orin Beck, port (M8 contact)
  addNamed({ skin: 0xf1c27d, hair: 0x6b4423, shirt: 0x2ec4b6, pants: 0x2c3e50, height: 1.72, ponytail: true }, -476, -548, Math.PI / 2); // Lena Marsh, marina (M9 contact)
  addNamed({ skin: 0xd9a066, hair: 0xbbbbbb, shirt: 0x5d6d7e, pants: 0x1a1a2e, height: 1.8 }, -292, -642, 0); // Elias Frost, hills (M10 contact)

  // Scooter riders cruise the -200 avenue (rider seated, legs/arms forward).
  scooters = [];
  const scooterColors = [0xff2e4d, 0x2ec4b6, 0xffc53d];
  const riderSkins = [0xf1c27d, 0xc68642, 0xe0ac69];
  const riderShirts = [0xffc53d, 0x2ec4b6, 0x7d3c98];
  const riderCaps = [0xc0392b, 0x2471a3, 0xdddddd];
  for (let i = 0; i < 3; i++) {
    const rider = buildHuman({ skin: riderSkins[i], shirt: riderShirts[i], pants: 0x2c3e50, hair: 0x1a1a1a, height: 1.75, cap: riderCaps[i] });
    rider.parts.legL.rotation.x = -1.1;
    rider.parts.legR.rotation.x = -1.1;
    rider.parts.armL.rotation.x = -0.9;
    rider.parts.armR.rotation.x = -0.9;
    const sc = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: scooterColors[i] });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.7), bodyMat);
    body.position.y = 0.55;
    sc.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.55), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    seat.position.set(-0.4, 0.8, 0);
    sc.add(seat);
    for (const wx of [0.7, -0.7]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 14), new THREE.MeshLambertMaterial({ color: 0x141414 }));
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(wx, 0.3, 0);
      sc.add(wheel);
    }
    rider.group.position.set(0, 0.1, 0);
    sc.add(rider.group);
    sc.position.set(-200 + (i % 2 ? 5.5 : -5.5), 0, -500 + i * 350);
    sc.rotation.y = i % 2 ? 0 : Math.PI;
    rig.scene.add(sc);
    scooters.push({ g: sc, dir: i % 2 ? 1 : -1, speed: 11 + i * 2 });
  }

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

  // v12: player-car headlight beam — a translucent cone ahead of the car +
  // a bright disc on the road where it lands. Visible only at dusk/night
  // while driving; positioned every frame in updateCameraHud.
  beamCone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 15, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false })
  );
  beamCone.visible = false;
  rig.scene.add(beamCone);
  beamDisc = new THREE.Mesh(
    new THREE.CircleGeometry(5, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false })
  );
  beamDisc.rotation.x = -Math.PI / 2;
  beamDisc.visible = false;
  rig.scene.add(beamDisc);

  // Title / pause / map buttons.
  $('btn-new').addEventListener('click', () => { audio.ensure(); newGame(); });
  $('btn-continue').addEventListener('click', () => { audio.ensure(); continueGame(); });
  $('btn-resume').addEventListener('click', () => resumeGame());
  $('btn-restart').addEventListener('click', () => { audio.ensure(); newGame(); });
  $('btn-quit').addEventListener('click', () => { pauseGame(false); toTitle(); });
  // v13: career-stats modal over the pause menu.
  $('btn-stats').addEventListener('click', () => openStats());
  $('btn-stats-close').addEventListener('click', () => closeStats());
  $('btn-map-close').addEventListener('click', () => { game.state = 'playing'; hud.showMap(false); });
  // v12 shop: close button + buy delegation (rows are re-rendered on every
  // open/buy, so clicks are caught on the container, not per button).
  $('btn-shop-close').addEventListener('click', () => closeShop());
  $('shop-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (btn) buyWeaponSlot(parseInt(btn.dataset.buy, 10));
  });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && game.state === 'playing' && !game.shotMode) pauseGame(true);
  });

  hud.setVisible(false);
  hud.showTitle(hasSave(STORE) ? loadGame(STORE) : null);
  hud.setMoney(game.money);
  hud.setWanted(0);
  hud.setHealth(100, 0);
  hud.setWeaponSlots(combat);
  hud.setClock(game.hour, game.day);
  hud.setDistrict('DOWNTOWN', 'Glassline Towers', 'NEUTRAL · 50');
  hud.setMission('Press M to start the next mission.');
  hud.setMissionStage('', null);
  // Procedural portraits (Mara, crew, mission contacts) + rank/crew panels.
  game.portraits = makePortraits(MISSIONS.map((m) => m.contact));
  hud.setPortraits(game.portraits);
  hud.setRank(rankFor(0));
  hud.setCrewAbility(game.crewState, 0, { inCar: false, condition: null, money: game.money });
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
    missionStage: game.mission ? stageOf(game.mission) : null,
    pos: [Math.round(player.x), Math.round(player.z)],
    inCar: game.inCar ? game.inCar.kind : null,
    speedKmh: game.inCar ? Math.round(Math.abs(game.inCar.speed) * 3.6) : 0,
    health: game.health,
    fps: Math.round(game.fps),
    frames: game.frames,
    ticks: game.ticks,
    errors: game.errors,
    waypoint: game.waypoint,
    officers: officers.list.length,
    officerShots: officers.shotsFired,
    pierPeds: peds.npcs.filter((n) => n.zone === 'pier').length,
    portCars: traffic.cars.filter((c) => c.port).length,
    police: police.cars.map((c) => [Math.round(c.x), Math.round(c.z)]),
    heli: police.heli ? [Math.round(police.heli.position.x), Math.round(police.heli.position.y), Math.round(police.heli.position.z)] : null,
    heliBeam: police.beamState ? police.beamState() : null, // v13-fix: searchlight landing point + length + midpoint
    hour: +game.hour.toFixed(2), // v13-fix: staging hour readout (shot 1 dusk = 17.0)
    siren: police.cars.length && police.cars[0].lightBar ? police.cars[0].lightBar.red.emissiveIntensity : null,
    port: world.port,
    pierStats: world.pier.stats || null,
    day: game.day,
    rp: game.rp,
    rank: rankFor(game.rp),
    crime: game.crime,
    witnessT: +game.witnessT.toFixed(2),
    plateCooldown: +game.crewState.cooldownT.toFixed(1),
    dispatchUnits: police.cars.length + (police.heli ? 1 : 0),
    scooters: scooters.length,
    night: +nightLevel(game.hour).toFixed(2),
    shopOpen: game.state === 'shop',
    ownedWeapons: combat.owned.slice(),
    overwatchT: +game.crewState.watchT.toFixed(1),
    repairT: +game.crewState.repairT.toFixed(1),
    totalPeds: peds.npcs.length,
    nightPeds: peds.npcs.filter((n) => n.nightOnly).length,
    totalTraffic: traffic.cars.length,
    nightTraffic: traffic.cars.filter((c) => c.nightOnly).length,
    missions: MISSIONS.length,
    glowDiscs: world.glowDiscs,
    carCondition: game.inCar ? Math.round(game.inCar.health) : null,
    stats: game.stats,
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
    v.parked = true; // it joins the parked list, so entering it counts as
    // a steal exactly like a real parked traffic car (was false before:
    // debug-spawned cars never incremented carsStolen).
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
  setCamHold(az, pitch) {
    // Staging-only camera hold (screenshot renders): pins the chase cam at a
    // fixed azimuth offset from the player's heading + a fixed pitch,
    // overriding the mouse-look/auto-realign every tick. Pass null to clear.
    // Never set by gameplay. Mouse orbit cannot hold an angle in headless
    // (it needs pointer lock, which the headless shell cannot engage), so
    // staged angles go through this instead.
    game.camHold = az === null ? null : { az, pitch };
  },
  setMoney(n) {
    game.money = n;
    hud.setMoney(n);
  },
  setRp(n) {
    game.rp = n;
    hud.setRank(rankFor(n));
  },
  setDay(n) {
    game.day = n;
    hud.setClock(game.hour, n);
  },
  parkedNear(x, z) {
    let best = null, bd = Infinity;
    for (const v of parked) {
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  },
  // Pin the nearest sidewalk ped next to (x, z) (screenshot staging: the
  // witness for the steal shot). Returns the ped or null.
  placePedNear(x, z) {
    let best = null, bd = Infinity;
    for (const n of peds.npcs) {
      if (n.zone === 'pier') continue;
      const nx = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
      const nz = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
      const d = Math.hypot(nx - x, nz - z);
      if (d < bd) { bd = d; best = n; }
    }
    if (!best) return null;
    best.axis = 'z';
    best.road = x - 15.5;
    best.side = 1;
    best.along = z;
    best.dir = 1;
    return best;
  },
  portrait(name) { return game.portraits ? game.portraits[name] : null; },
  openShop() { openShop(); },
  closeShop() { closeShop(); },
  buyWeaponSlot(id) { return buyWeaponSlot(id); },
  shopState() { return { money: game.money, owned: combat.owned.slice(), ammo: combat.ammo.slice(), reserves: combat.reserves.slice() }; },
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
  game.day = 1;
  game.rp = 0;
  game.standing = {};
  game.stats = { missionsDone: 0, totalEarned: 0, carsStolen: 0 };
  game.statsOpen = false;
  game.crime = 'EVADING POLICE';
  game.witnessT = 0;
  game.crewState = newCrewState();
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
  hud.setRank(rankFor(0));
  hud.setClock(game.hour, game.day);
  hud.setCrewAbility(game.crewState, 0, { inCar: false, condition: null, money: game.money });
  hud.setDispatch(null);
  hud.setDialog('Back in Neon Delta. My sister is out there — and so are the answers.', 6000);
  hud.setMission('MISSION 1 — RETURN TO LA: Steal a sedan.');
  hud.setMissionStage('', null);
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
  game.day = s.day || 1;
  game.rp = s.rp || 0;
  game.standing = s.standing || {};
  game.stats = s.stats || { missionsDone: 0, totalEarned: 0, carsStolen: 0 };
  game.statsOpen = false;
  game.crewState.cooldownT = s.plateT || 0;
  game.crewState.repairT = s.repairT || 0;
  game.crewState.watchT = s.watchT || 0;
  game.crewState.watchCd = s.watchCd || 0;
  game.hour = s.hour;
  gameApi.teleport(s.x, s.z, s.heading);
  game.state = 'playing';
  hud.hideTitle();
  hud.showPause(false);
  hud.setVisible(true);
  hud.setMoney(game.money);
  hud.setWanted(0);
  hud.setHealth(game.health, game.armor);
  hud.setClock(game.hour, game.day);
  hud.setRank(rankFor(game.rp));
  hud.setCrewAbility(game.crewState, 0, { inCar: false, condition: null, money: game.money });
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
  game.statsOpen = false;
  hud.hideStats();
  hud.showPause(false);
  lockPointer();
}

// v13: career-stats modal over the pause menu. Every number comes from real
// tracked state — missions done / total missions, total earned, cars stolen,
// days played, rank + RP, weapons owned / total. No invented counters.
function openStats() {
  if (game.state !== 'paused') return;
  game.statsOpen = true;
  const rank = rankFor(game.rp);
  hud.showStats({
    missionsDone: game.stats.missionsDone, missionsTotal: MISSIONS.length,
    totalEarned: game.stats.totalEarned, carsStolen: game.stats.carsStolen,
    days: game.day, rank: `${rank.letter} · ${rank.title}`, rp: game.rp,
    nextRp: rank.nextMin, weaponsOwned: combat.owned.length, weaponsTotal: WEAPONS.length,
  });
}
function closeStats() {
  game.statsOpen = false;
  hud.hideStats();
}

// ---------- DELTA ARMS shop ----------
// B opens the shop anywhere (menu access); E near the storefront does the
// same. The world freezes while the shop is open (state 'shop' — the tick
// only simulates 'playing'), and the overlay shows only real state.
function shopState() {
  return { money: game.money, owned: combat.owned.slice(), ammo: combat.ammo.slice(), reserves: combat.reserves.slice() };
}
function openShop() {
  if (game.state !== 'playing' && game.state !== 'shop') return;
  game.state = 'shop';
  if (document.pointerLockElement) document.exitPointerLock();
  hud.showShop(shopState());
  audio.blip(700, 0.08, 'triangle', 0.15);
}
function closeShop() {
  if (game.state !== 'shop') return;
  game.state = 'playing';
  hud.hideShop();
  lockPointer();
}
function buyWeaponSlot(id) {
  if (!WEAPONS[id]) { hud.toast('No such weapon.'); return false; }
  const res = buyWeapon(game.money, combat.owned, combat.ammo, combat.reserves, id);
  if (!res.ok) {
    const why = res.reason === 'no-funds' ? `Not enough cash — need $${WEAPONS[id].price.toLocaleString('en-US')}.`
      : res.reason === 'owned' ? 'Already owned.'
      : 'That weapon is not for sale.';
    hud.toast(why);
    return false;
  }
  game.money = res.money;
  combat.owned = res.owned;
  combat.ammo = res.ammo;
  combat.reserves = res.reserves;
  hud.setMoney(game.money);
  hud.setWeaponSlots(combat);
  hud.renderShop(shopState());
  hud.toast(`${res.name} bought — $${res.price.toLocaleString('en-US')}. Press ${id + 1} to equip.`);
  audio.blip(880, 0.12, 'sine', 0.2);
  return true;
}

function startMission(i) {
  if (i >= MISSIONS.length) { hud.toast('All missions complete. Free roam.'); return; }
  const m = engineStartMission(i);
  if (!m) return;
  game.mission = m;
  game.sideJob = null;
  const def = MISSIONS[i];
  // v12: a mission may pin the clock (M7 starts at 21.5 = night, M8 at
  // 18.5 = dusk). This is a real time rule — the world actually goes dark.
  if (def.startHour != null) {
    game.hour = def.startHour;
    rig.setTimeOfDay(game.hour);
    hud.setClock(game.hour, game.day);
  }
  if (def.startWanted) {
    WANTED.add(game.wanted, def.startWanted);
    police.setLevel(game.wanted.level);
    hud.setWanted(game.wanted.level);
  }
  if (i === 3) game.courier = traffic.cars[0] || null; // mission 4: tail the courier
  hud.setDialog(`MISSION ${i + 1} — ${def.name}: ${def.brief}`, 6000,
    { name: def.contact.name, img: game.portraits[def.contact.name] });
  hud.setMission(`MISSION ${i + 1} — ${def.name}: ${m.dialog}`);
  hud.setMissionStage(`MISSION ${i + 1} — ${def.name}`, stageOf(m));
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
    game.crime = 'GRAND THEFT AUTO';
    WANTED.add(game.wanted, 2);
    hud.setDialog('Stole a police cruiser. That was loud.', 4000);
  } else if (wasParked && !v.stolen) {
    // Stealing a parked car: a ped within 25u sees it. No instant heat —
    // the witness reports after a real 3s delay, then dispatch sends a unit.
    v.stolen = true;
    game.stats.carsStolen += 1;
    game.crime = 'VEHICLE THEFT';
    if (nearestPed(25)) {
      game.witnessT = 3;
      hud.setDialog('Someone saw that. They are calling it in.', 3500);
      hud.toast('A WITNESS SAW YOU — 3s');
    } else {
      WANTED.add(game.wanted, 1);
      hud.setDialog(`The ${v.def.model} is mine now.`, 3500);
    }
  }
}

// Nearest pedestrian to the player (last-frame positions, same formula as
// the combat target list). Used by the witness mechanic.
function nearestPed(maxD) {
  let best = null, bd = maxD;
  for (const n of peds.npcs) {
    let x, z;
    if (n.zone === 'pier') { x = n.along; z = 300 + n.lane; }
    else {
      x = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
      z = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
    }
    const d = Math.hypot(x - player.x, z - player.z);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
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
  game.shotT = game.time; // nearby NPCs panic for a few seconds after gunfire
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
          game.crime = 'EVADING POLICE';
          WANTED.add(game.wanted, 1);
          hud.toast('Police cruiser wrecked.');
        }
      } else if (t.type === 'officer') {
        if (officers.damage(t.ref, res.weapon.dmg)) {
          officers.remove(officers.list.indexOf(t.ref));
          game.crime = 'ASSAULT ON OFFICER';
          WANTED.add(game.wanted, 1);
          hud.toast('Officer down. The heat rises.');
        }
      } else if (t.type === 'traffic') {
        t.ref.v.health -= res.weapon.dmg;
        if (t.ref.v.health <= 0 && !t.ref.v.wrecked) {
          t.ref.v.wrecked = true;
          game.crime = 'EVADING POLICE';
          WANTED.add(game.wanted, 1);
        }
        t.ref.speed = 0;
      } else if (t.type === 'ped') {
        peds.assignRoad(t.ref, player.x, player.z); // flees
        game.crime = 'ASSAULT';
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
  hud.setWeaponSlots(combat);
}

// ---------- main loop ----------
let last = performance.now();
function tick(now) {
  // dt is clamped to [0, 0.05]: the first rAF timestamp can precede the
  // module-load performance.now() under load, giving a NEGATIVE dt — which
  // once drove the coaster trainT below 0 (JS % keeps the sign) and made
  // coasterPath[-1] throw "reading '0'" on the first tick (v11 shoot).
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  game.time += dt;
  const t = game.time;

  // Settle frames for screenshots: run the world but keep player still.
  if (game.settleFrames > 0) game.settleFrames--;

  // One bad frame must never freeze the game: three.js only schedules the
  // next animation frame if tick() returns, so an uncaught throw here used
  // to brick the whole game into a black screen (v11 shoot, shots 3/4).
  // Record the error (capped) and keep looping instead.
  try {
    if (game.state === 'playing') {
    // Day cycle: 1 game hour per 6 real minutes.
    game.hour = (game.hour + dt / 360) % 24;
    rig.setTimeOfDay(game.hour);
    hud.setClock(game.hour, game.day);
    const dusk = game.hour >= 17.5 || game.hour < 6;
    // v12 night: the real clock drives the whole night layer — lamps and
    // windows glow (world), extra peds + traffic appear (pier/downtown),
    // every car shows headlights + taillights (player, police, traffic).
    const night = nightLevel(game.hour);
    world.setNight(night);
    traffic.setNight(isNight(game.hour));
    peds.setNight(isNight(game.hour));
    for (const v of parked) setHeadlights(v, dusk);
    for (const tc of traffic.cars) setHeadlights(tc.v, dusk);
    if (game.inCar) setHeadlights(game.inCar, dusk);
    for (const c of police.cars) setHeadlights(c, dusk);
    setTaillights(dusk);

    // Mouse look.
    const { dx, dy } = input.consumeMouse();
    if (dx || dy) game.lastMouseMove = t;
    rig.yaw -= dx * 0.003;
    rig.pitch = clamp(rig.pitch + dy * 0.003, 0.05, 1.15);

    if (!game.inCar) updateOnFoot(dt, t);
    else updateDriving(dt, t);

    updateMissions(dt, t);
    updateWanted(dt, t);
    updateWitness(dt);
    tickCooldown(game.crewState, dt);
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
    updateScooters(dt);
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
  } else if (game.state === 'shop') {
    // v13: keep framing the scene behind the overlay — without this the
    // camera stays at its boot position (ground level: a flat brown field)
    // and the minimap never draws on the ?shot=2 boot path, which is why
    // the v12 shop shot showed a near-black world + an empty minimap.
    // The world stays frozen; only the camera + HUD refresh.
    updateCameraHud(dt, t);
    if (input.wasPressed('KeyB') || input.wasPressed('Escape')) closeShop();
    if (input.wasPressed('Digit4')) buyWeaponSlot(3);
    if (input.wasPressed('Digit5')) buyWeaponSlot(4);
    if (input.wasPressed('Digit6')) buyWeaponSlot(5);
  } else if (game.state === 'paused') {
    // v13: Esc closes the stats modal first, only then resumes.
    if (input.wasPressed('Escape')) { if (game.statsOpen) closeStats(); else resumeGame(); }
  }
  } catch (err) {
    // Record the message + stack (capped) so the cause is diagnosable from
    // __ndState instead of a frozen black screen.
    if (game.errors.length < 10) {
      game.errors.push(String(err && err.stack || err && err.message || err));
    }
  }

  // FPS.
  game.frames++;
  game.ticks++; // cumulative tick count (staging gate: frames is per-second FPS and reads 0 under load)
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
  // Prompt: enter car — or the DELTA ARMS shop when standing at its door.
  const nc = nearestCar(4.5);
  if (nc) hud.setPrompt(`F — ${nc.parked && !nc.stolen ? 'STEAL' : 'ENTER'} ${nc.def.model}`);
  else if (Math.hypot(player.x - world.shop.x, player.z - world.shop.z) < SHOP.radius) hud.setPrompt('B — DELTA ARMS WEAPON SHOP');
  else hud.setPrompt('');
  // Combat.
  combat.update(dt);
  if (input.wasPressed('Digit1')) switchWeapon(0);
  if (input.wasPressed('Digit2')) switchWeapon(1);
  if (input.wasPressed('Digit3')) switchWeapon(2);
  if (input.wasPressed('Digit4')) switchWeapon(3);
  if (input.wasPressed('Digit5')) switchWeapon(4);
  if (input.wasPressed('Digit6')) switchWeapon(5);
  if (input.wasPressed('KeyR')) {
    if (combat.reload()) {
      hud.setWeaponSlots(combat);
      audio.blip(1200, 0.05, 'square', 0.1);
    }
  }
  if (input.mouseDown && input.locked) fireWeapon();
  if (input.wasPressed('KeyF') && nc) enterCar(nc);
  if (input.wasPressed('KeyE')) tryInteract();
}

// Gear from the speed band (real speed ratio, not a fake gear number).
function gearFor(v) {
  const s = Math.abs(v.speed);
  if (s < 0.5) return 'N';
  const r = s / v.def.top;
  return r < 0.3 ? 'G1' : r < 0.55 ? 'G2' : r < 0.8 ? 'G3' : 'G4';
}

// --- driving: throttle/steer/handbrake, chase cam, horn, engine hum ---
function updateDriving(dt, t) {
  const inCar = game.inCar;
  const th = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
  const st = (input.down('KeyA') ? -1 : 0) + (input.down('KeyD') ? 1 : 0);
  const hb = input.down('Space');
  updateVehicle(inCar, { throttle: th, steer: st, handbrake: hb }, dt, world.colliders, { damage: true });
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
  hud.setSpeed(Math.abs(inCar.speed) * 3.6, inCar.def.model, `CONDITION ${Math.round(inCar.health)}%`, gearFor(inCar));
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
        // Career stats: every real payout counts; only main missions count
        // toward the missions-completed total (side jobs pay, not a mission).
        game.stats.totalEarned += ev.reward;
        if (active === game.mission) game.stats.missionsDone += 1;
        // Rank/respect: RP comes only from the real payout. A new day dawns
        // after each completed main mission (side jobs pay RP, not a new day).
        game.rp += rpForReward(ev.reward);
        if (active === game.mission) game.day += 1;
        const dist = districtAt(player.x, player.z);
        addStanding(game.standing, dist.id, 8);
        hud.setRank(rankFor(game.rp));
        hud.setClock(game.hour, game.day);
        hud.setMoney(game.money);
        hud.setDialog(`MISSION COMPLETE — ${ev.name}: +$${ev.reward}`, 6000);
        hud.setMission('Press M for the next mission.');
        hud.setMissionStage('', null);
        audio.jingle();
        WANTED.clear(game.wanted);
        police.setLevel(0);
        hud.setWanted(0);
        hud.setDispatch(null);
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
  // Stage tracker follows the live mission (or side job) every frame.
  if (game.mission && game.mission.status === 'active') {
    hud.setMissionStage(`MISSION ${game.mission.idx + 1} — ${game.mission.def.name}`, stageOf(game.mission));
  } else if (game.sideJob && game.sideJob.status === 'active') {
    hud.setMissionStage(`SIDE JOB — ${game.sideJob.def.name}`, stageOf(game.sideJob));
  } else {
    hud.setMissionStage('', null);
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
  hud.setWantedStatus(seen ? 'IN PURSUIT' : 'SEARCHING');
  hud.setDispatch(buildDispatch({
    cars: police.cars,
    heli: police.heli ? { x: police.heli.position.x, z: police.heli.position.z } : null,
    px: player.x, pz: player.z, wanted: game.wanted.level, crime: game.crime, seen,
  }));
  hud.setCrewAbility(game.crewState, game.wanted.level, crewCtx());
  const nearPolice = police.cars.length ? Math.min(...police.cars.map((c) => Math.hypot(c.x - player.x, c.z - player.z))) : 999;
  audio.setSiren(game.wanted.level > 0, nearPolice / 300);
}

// --- witness report: the 3s timer set when a steal is seen. When it fires,
// dispatch sends a unit (wanted +1) — the heat arrives late, not instantly.
function updateWitness(dt) {
  if (game.witnessT > 0) {
    game.witnessT -= dt;
    if (game.witnessT <= 0) {
      game.witnessT = 0;
      WANTED.add(game.wanted, 1);
      police.setLevel(game.wanted.level);
      hud.setWanted(game.wanted.level);
      hud.toast('NDPD DISPATCHED — witness report confirmed.');
      hud.setDialog('NDPD DISPATCH: Unit responding to a vehicle theft.', 4000,
        { name: 'NDPD DISPATCH', img: null });
    }
  }
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

// Live context the crew bar's repair row needs: in a car? how hurt? how much cash?
function crewCtx() {
  return {
    inCar: !!game.inCar,
    condition: game.inCar ? Math.round(game.inCar.health) : null,
    money: game.money,
  };
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
      day: game.day, rp: game.rp, standing: game.standing, plateT: game.crewState.cooldownT,
      repairT: game.crewState.repairT, watchT: game.crewState.watchT, watchCd: game.crewState.watchCd,
      stats: game.stats,
    });
    hud.toast('Game saved.');
    audio.blip(880, 0.1, 'sine', 0.15);
  }
  // B — DELTA ARMS weapon shop (menu access from anywhere; the storefront
  // stands at the Midtown shophouse row).
  if (input.wasPressed('KeyB')) openShop();
  // C — CLEAN PLATES (Juno, the only real crew ability): swap plates,
  // wanted -1, 45s cooldown. Fails honestly when there is no heat or the
  // ability is still recharging.
  if (input.wasPressed('KeyC')) {
    const res = applySwap(game.crewState, game.wanted.level, CREW[0].ability.cooldown);
    if (res.ok) {
      game.wanted.level = res.wanted;
      police.setLevel(res.wanted);
      hud.setWanted(res.wanted);
      hud.setCrewAbility(game.crewState, res.wanted, crewCtx());
      hud.toast('CLEAN PLATES — Juno swapped the plates. Heat down.');
      hud.setDialog('Plates swapped. They lost the tag on us.', 4000,
        { name: 'JUNO REYES', img: game.portraits.juno });
      audio.blip(520, 0.12, 'triangle', 0.2);
    } else if (game.wanted.level <= 0) {
      hud.toast('No heat to lose.');
    } else {
      hud.toast(`CLEAN PLATES recharging — ${Math.ceil(game.crewState.cooldownT)}s.`);
    }
  }
  // V — FIELD REPAIR (Petra): fix the current car to 100% for $150 in
  // parts, 60s cooldown. Honest failures: on foot, car already fine, broke,
  // or still recharging.
  if (input.wasPressed('KeyV')) {
    const res = applyRepair(game.crewState, game.inCar, game.money, CREW[1].ability.cost, CREW[1].ability.cooldown);
    if (res.ok) {
      game.money = res.money;
      hud.setMoney(game.money);
      hud.setCrewAbility(game.crewState, game.wanted.level, crewCtx());
      hud.toast('FIELD REPAIR — Petra fixed the car to 100%. -$150.');
      hud.setDialog('Good as new. Try not to dent it again.', 4000,
        { name: 'PETRA HALE', img: game.portraits.petra });
      audio.blip(660, 0.12, 'triangle', 0.2);
    } else if (res.reason === 'no-car') {
      hud.toast('Get in a car first.');
    } else if (res.reason === 'full') {
      hud.toast('Car is already in top shape.');
    } else if (res.reason === 'no-funds') {
      hud.toast('Need $150 for parts.');
    } else {
      hud.toast(`FIELD REPAIR recharging — ${Math.ceil(game.crewState.repairT)}s.`);
    }
  }
  // X — OVERWATCH (Cassia): police callsigns + distances on the minimap
  // for 20s, 45s cooldown.
  if (input.wasPressed('KeyX')) {
    const res = applyOverwatch(game.crewState, CREW[2].ability.duration, CREW[2].ability.cooldown);
    if (res.ok) {
      hud.setCrewAbility(game.crewState, game.wanted.level, crewCtx());
      hud.toast('OVERWATCH — Cassia is tracking the NDPD for 20s.');
      hud.setDialog('Eyes up. I have every unit on the map.', 4000,
        { name: 'CASSIA WREN', img: game.portraits.cassia });
      audio.blip(990, 0.12, 'triangle', 0.2);
    } else if (res.reason === 'active') {
      hud.toast('OVERWATCH already running.');
    } else {
      hud.toast(`OVERWATCH recharging — ${Math.ceil(game.crewState.watchCd)}s.`);
    }
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
function updateScooters(dt) {
  for (const s of scooters) {
    s.g.position.z += s.dir * s.speed * dt;
    if (s.g.position.z > 760) s.g.position.z = -760;
    if (s.g.position.z < -760) s.g.position.z = 760;
  }
}

function updateWorld(dt, t) {
  world.update(dt, t);
  traffic.update(dt, t);
  // NPC panic: gunfire in the last 5s or wanted 3+ makes nearby peds run.
  const panic = game.wanted.level >= 3 || (game.time - game.shotT) < 5;
  peds.update(dt, player.x, player.z, panic);
  updateScooters(dt);
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
  // Staging camera hold: pin yaw/pitch every tick (the chase cam would
  // otherwise auto-realign to the car's heading within ~1.2s of no mouse).
  if (game.camHold) {
    rig.yaw = player.heading + game.camHold.az;
    rig.pitch = Math.max(0.05, Math.min(1.15, game.camHold.pitch));
  }
  rig.updateCamera(dt, camTarget.x, camTarget.y, camTarget.z, player.heading, speed01, !!game.inCar, world.colliders);
  const dist = districtAt(player.x, player.z);
  const st = getStanding(game.standing, dist.id);
  hud.setDistrict(dist.name, dist.sub, `${standingLabel(st)} · ${st}`);
  if (!game.inCar) hud.setSpeed(0, 'ON FOOT');
  hud.drawMinimap({
    px: player.x, pz: player.z, heading: rig.yaw,
    police: police.cars.map((c) => ({ x: c.x, z: c.z, call: c.callsign })),
    traffic: traffic.cars.map((c) => ({ x: c.v.x, z: c.v.z })),
    waypoint: game.waypoint,
    overwatch: game.crewState.watchT > 0, // v12: Cassia's reveal
  });
  // v12 headlight beam: at dusk/night, a cone ahead of the player's car +
  // a bright disc on the road where it lands. The cone's apex sits at the
  // car and opens forward (quaternion maps +Y onto the back direction).
  const dusk = game.hour >= 17.5 || game.hour < 6;
  const beamOn = dusk && !!game.inCar;
  beamCone.visible = beamOn;
  beamDisc.visible = beamOn;
  if (beamOn) {
    const car = game.inCar;
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    beamCone.position.set(car.x + fx * 7.5, 1.2, car.z + fz * 7.5);
    beamCone.quaternion.setFromUnitVectors(UP_VEC, new THREE.Vector3(-fx, 0.12, -fz).normalize());
    beamDisc.position.set(car.x + fx * 15, 0.15, car.z + fz * 15);
  }
}

function tryInteract() {
  // E: context interaction — mission props near the waypoint, or the
  // DELTA ARMS shop when standing at its door.
  if (Math.hypot(player.x - world.shop.x, player.z - world.shop.z) < SHOP.radius) {
    openShop();
    return;
  }
  if (game.waypoint) {
    const d = Math.hypot(game.waypoint.x - player.x, game.waypoint.z - player.z);
    if (d < 8) hud.toast('You are at the marker.');
  }
}

// Weapon switch with honest feedback (v13-fix): locked slots refuse
// silently in combat.js, so a dead key press now names the gun and its
// real price instead of doing nothing.
function switchWeapon(i) {
  if (!combat.switchTo(i)) hud.toast(`${WEAPONS[i].name} is locked — buy it at DELTA ARMS for $${WEAPONS[i].price.toLocaleString('en-US')}.`);
  hud.setWeaponSlots(combat);
}

boot();
