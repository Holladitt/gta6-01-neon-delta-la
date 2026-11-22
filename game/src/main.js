// Bootstrap and game loop for Neon Delta LA: District Wars.
// Builds the world, the three.js scene, the HUD and the title
// screen, then ticks at a capped dt of 0.05. Shot mode (?shot=1..4)
// skips the title screen and stages a frozen diorama. The loop
// exposes window.__game so the screenshot driver can wait for
// ticks and read the state.
import * as THREE from 'three';
import { TITLE, SHOP, GARAGE_POS, BOAT, CREW } from './config.js';
import { createWorld, updateWorld, enterCar, exitCar, stealCar, startMission, missionObjectiveLabel } from './world.js';
import { createTraffic, updateTraffic, pedsNear } from './traffic.js';
import { createPolice, updatePolice, beamOnCar } from './police.js';
import { createScene, syncScene } from './scene.js';
import { createHud, updateHud, showShop, hideShop, showGarage, hideGarage, showDialogue } from './hud.js';
import { createTitle } from './title.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWanted, updateAirLock, addWanted } from './wanted.js';
import { createCover, reportCrime } from './cover.js';
import { useAbility, cooldownLeft, abilityReady, overwatchActive } from './crew.js';
import { buyWeapon, catalog, priceFor } from './shop.js';
import { buyUpgrade, GARAGE_UPGRADES, boardBoat, leaveBoat, triggerNitro } from './garage.js';
import { startRace, startJob } from './races.js';
import { fire, selectTier, openWheel, closeWheel } from './combat.js';
import { saveGame, serializeWorld } from './save.js';
import { shotFromUrl, applyShot, SHOT_DIALOGUE } from './shots.js';
import { districtAt } from './config.js';
import { dist2 } from './rng.js';

const world = createWorld();
const traffic = createTraffic(90210);
const police = createPolice();
const input = createInput();
const audio = createAudio();
input.attach();

let scene = null;
let hud = null;
let title = null;
let shotCam = null;
let ticks = 0;
let last = performance.now();
let currentSlot = 1;
let paused = false;

function buildCrewList(now) {
  return CREW.map((c) => ({
    id: c.id, name: c.name, ability: c.ability, key: c.key, text: c.text,
    ready: abilityReady(world.crew, c.id, now), left: cooldownLeft(world.crew, c.id, now),
  }));
}

function shopHtml() {
  // MAG is a display stat only (ammo capacity shown in the panel).
  const MAG = { pistol: 12, smg: 30, shotgun: 6, carbine: 30, longshot: 5, marauder: 60 };
  const rows = catalog().map((w) => {
    const price = priceFor(world.shop, w.id, world.standing, world.districtId);
    const owned = world.shop.owned[w.id];
    return '<div style="display:flex;justify-content:space-between;gap:10px"><span><b>TIER ' + w.tier + '</b> — ' + w.name + ' — DMG ' + w.damage + ' · MAG ' + (MAG[w.id] || 12) + ' · RANGE ' + w.range + 'm' +
      (owned ? ' — <span style="color:#1abc9c">OWNED</span>' : '') + '</span>' +
      (owned ? '' : '<button data-buy="' + w.id + '" style="cursor:pointer;background:#e74c3c;color:#fff;border:none;padding:4px 12px;font-weight:900">BUY $' + price + '</button>') + '</div>';
  }).join('');
  return '<b style="font-size:18px">DELTA ARMS</b> — 4 weapon tiers<br>' + rows +
    '<div style="margin-top:6px;color:#f7d154">District discount: ' + (world.standing[world.districtId] >= 50 ? '10% active' : 'reach standing 50') + '</div>' +
    '<div style="opacity:0.7">Press B to close</div>';
}

function garageHtml() {
  const rows = GARAGE_UPGRADES.map((u) => {
    const owned = world.garage[u.id];
    return '<div><b>' + u.name + '</b> — ' + u.text +
      (owned ? ' — <span style="color:#1abc9c">OWNED</span>'
        : ' — $' + u.price + ' <button data-upgrade="' + u.id + '" style="cursor:pointer">BUY</button>') + '</div>';
  }).join('');
  return '<b style="font-size:18px">DELTA GARAGE</b> — tuning<br>' + rows +
    '<div style="opacity:0.7">Press G to close</div>';
}

function bindPanelButtons() {
  if (!hud) return;
  hud.shop.querySelectorAll('[data-buy]').forEach((b) => {
    b.addEventListener('click', () => {
      const r = buyWeapon(world.shop, world.money, b.getAttribute('data-buy'), world.standing, world.districtId);
      if (r.ok) { world.money = r.money; world.toast = r.weapon.name + ' BOUGHT'; audio.cash(); }
      else world.toast = r.reason.toUpperCase();
      showShop(hud, shopHtml());
      bindPanelButtons();
    });
  });
  hud.garage.querySelectorAll('[data-upgrade]').forEach((b) => {
    b.addEventListener('click', () => {
      const r = buyUpgrade(world.garage, world.money, b.getAttribute('data-upgrade'));
      if (r.ok) { world.money = r.money; world.toast = r.upgrade.name + ' INSTALLED'; audio.cash(); }
      else world.toast = r.reason.toUpperCase();
      showGarage(hud, garageHtml());
      bindPanelButtons();
    });
  });
}

function nearShop() {
  return dist2(world.player.x, world.player.z, SHOP.x, SHOP.z) < 45;
}

function nearGarage() {
  return dist2(world.player.x, world.player.z, GARAGE_POS.x, GARAGE_POS.z) < 45;
}

function startPlaying(mode, slot, data) {
  currentSlot = slot || 1;
  if (mode === 'load' && data) {
    world.money = data.money || 500;
    world.day = data.day || 1;
    world.rp = data.rp || 0;
    world.hour = data.hour || 10;
    if (data.standing) world.standing = data.standing;
    if (data.owned) world.shop.owned = data.owned;
    if (data.garage) world.garage = data.garage;
    if (data.missionsDone) world.missions.completed = data.missionsDone;
    if (data.currentMission) world.missions.current = data.currentMission;
  }
  world.state = 'FREE_ROAM';
  if (title) title.hide();
  audio.radioSting();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (paused) return;
  ticks += 1;

  // One-shot keys.
  if (input.consume('e')) {
    if (world.boat && !world.boat.boarded && dist2(world.player.x, world.player.z, world.boat.x, world.boat.z) < 14) {
      if (boardBoat(world.boat, world.player.x, world.player.z)) world.toast = 'ABOARD THE DELTA SKIFF';
    } else if (world.boat.boarded) {
      leaveBoat(world.boat);
      world.player.x = world.boat.x + 6; world.player.z = world.boat.z + 6;
      world.player.onFoot = true;
    } else if (world.player.onFoot) {
      if (!enterCar(world)) world.toast = 'NO CAR NEARBY';
    } else {
      exitCar(world);
    }
  }
  if (input.consume('f') && world.player.onFoot) {
    if (stealCar(world, traffic.cars)) {
      reportCrime(world.cover, traffic.peds, world.player.x, world.player.z);
      addWanted(world.wanted, 1, world.time);
      world.toast = 'CAR STOLEN';
      audio.siren();
    }
  }
  if (input.consume('c')) {
    const r = useAbility(world.crew, 'juno', world.time, world);
    world.toast = r.ok ? 'CLEAN PLATES — WANTED ' + r.wanted : (r.reason === 'recharging' ? 'CLEAN PLATES RECHARGING' : r.reason.toUpperCase());
  }
  if (input.consume('v')) {
    const r = useAbility(world.crew, 'petra', world.time, world);
    world.toast = r.ok ? 'FIELD REPAIR — CONDITION 100%' : (r.reason === 'recharging' ? 'FIELD REPAIR RECHARGING' : r.reason.toUpperCase());
  }
  if (input.consume('x')) {
    const r = useAbility(world.crew, 'cassia', world.time, world);
    world.toast = r.ok ? 'OVERWATCH — POLICE MARKED 20s' : (r.reason === 'recharging' ? 'OVERWATCH RECHARGING' : r.reason.toUpperCase());
  }
  if (input.consume('m')) {
    const m = startMission(world, world.missions.current || 1);
    if (m) world.toast = 'MISSION ' + m.id + ': ' + m.title;
  }
  if (input.consume('r') && !world.race.active) {
    startRace(world.race, world.districtId, Math.floor(Math.random() * 99999));
    world.toast = 'STREET RACE — 5 CHECKPOINTS';
  }
  if (input.consume('j') && !world.job.active) {
    const kind = Math.random() < 0.5 ? 'taxi' : 'courier';
    startJob(world.job, kind, world.player.x, world.player.z);
    world.toast = kind.toUpperCase() + ' JOB — FOLLOW THE MARKER';
  }
  if (input.consume('b') && nearShop()) {
    if (hud.shop.style.display === 'block') hideShop(hud);
    else { showShop(hud, shopHtml()); bindPanelButtons(); }
  }
  if (input.consume('g') && nearGarage()) {
    if (hud.garage.style.display === 'block') hideGarage(hud);
    else { showGarage(hud, garageHtml()); bindPanelButtons(); }
  }
  if (input.consume('t')) {
    const data = serializeWorld(world);
    data.rank = world.rankCode;
    if (saveGame(currentSlot, data)) world.toast = 'SAVED TO SLOT ' + currentSlot;
    else world.toast = 'SAVE FAILED';
  }
  if (input.consume('p')) {
    paused = !paused;
    world.toast = paused ? 'PAUSED' : '';
  }
  if (input.consume('1')) selectTier(world.combat, 1, world.shop.owned);
  if (input.consume('2')) selectTier(world.combat, 2, world.shop.owned);
  if (input.consume('3')) selectTier(world.combat, 3, world.shop.owned);
  if (input.consume('4')) selectTier(world.combat, 4, world.shop.owned);
  if (world.shotMode === 0) { if (input.wheel) openWheel(world.combat); else closeWheel(world.combat); }
  if (input.nitro) triggerNitro(world.garage, world.time);
  if (input.fire && !world.player.onFoot) {
    const r = fire(world.combat, world.time);
    if (r.ok) {
      reportCrime(world.cover, traffic.peds, world.player.x, world.player.z);
      audio.shot();
    }
  }

  updateWorld(world, input, dt);
  updateTraffic(traffic, dt, world.player.x, world.player.z);
  updatePolice(police, world, dt, world.time);

  // AIR-1 takedown: beam held on the car for 5 seconds.
  const beam = beamOnCar(police, world);
  const ev = updateAirLock(world.wanted, dt, beam);
  if (ev === 'takedown') {
    addWanted(world.wanted, 1, world.time);
    world.toast = 'AIR-1 TAKEDOWN — NDPD SURGE';
    audio.siren();
  }

  // Overwatch marks police on the minimap (kept in world for HUD).
  world.overwatch = overwatchActive(world.crew, world.time);
  world.crewList = buildCrewList(world.time);
  world.missionLabel = missionObjectiveLabel(world);

  // Camera.
  if (shotCam) {
    scene.camera.position.set(shotCam.camera.x, shotCam.camera.y, shotCam.camera.z);
    scene.camera.lookAt(shotCam.look.x, shotCam.look.y, shotCam.look.z);
  } else if (world.boat.boarded) {
    scene.camera.position.set(world.boat.x - Math.sin(world.boat.angle) * 26, 16, world.boat.z - Math.cos(world.boat.angle) * 26);
    scene.camera.lookAt(world.boat.x, 2, world.boat.z);
  } else if (world.player.onFoot) {
    scene.camera.position.set(world.player.x - Math.sin(world.player.angle) * 10, 7, world.player.z - Math.cos(world.player.angle) * 10);
    scene.camera.lookAt(world.player.x, 2, world.player.z);
  } else {
    const back = 16 + Math.abs(world.car.speed) * 0.25;
    scene.camera.position.set(
      world.car.x - Math.sin(world.car.angle) * back,
      9 + Math.abs(world.car.speed) * 0.12,
      world.car.z - Math.cos(world.car.angle) * back
    );
    scene.camera.lookAt(world.car.x, 2, world.car.z);
  }

  syncScene(scene, world, traffic, police, world.hour);
  updateHud(hud, world, police, traffic);
  scene.renderer.render(scene.scene, scene.camera);
}

export function startGame() {
  document.title = TITLE;
  scene = createScene();
  document.body.appendChild(scene.renderer.domElement);
  scene.renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;';
  hud = createHud(world);
  hud.shop.style.pointerEvents = 'auto';
  hud.garage.style.pointerEvents = 'auto';
  world.crewList = buildCrewList(0);
  world.missionLabel = missionObjectiveLabel(world);

  const shot = shotFromUrl();
  if (shot > 0) {
    shotCam = applyShot(shot, world, traffic, police);
    if (shot === 2) {
      showShop(hud, shopHtml());
      bindPanelButtons();
    }
    if (SHOT_DIALOGUE[shot]) showDialogue(hud, SHOT_DIALOGUE[shot].speaker, SHOT_DIALOGUE[shot].line);
    world.state = 'FREE_ROAM';
  } else {
    title = createTitle(world, startPlaying);
  }
  window.__game = {
    get ticks() { return ticks; },
    get ready() { return ticks > 2; },
    world, traffic, police, shot,
    title: TITLE,
  };
  requestAnimationFrame(frame);
}

startGame();
