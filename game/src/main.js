// Entry point: boots the world, the scene, the HUD, the title screen.
// ?shot=N freezes a staged shot for the screenshot driver; otherwise
// it is the playable game.
import { createWorld, updateWorld, startMission, enterCar, exitCar, stealCar } from './world.js';
import { createScene, createDynamic, updateScene } from './scene.js';
import { createHUD } from './hud.js';
import { createInput } from './input.js';
import { createTitle } from './title.js';
import { unlockAudio, playBlip, setEngine, setSiren, playRadioJingle } from './audio.js';
import { MISSIONS, districtById, SHOP, BOAT } from './config.js';
import { currentObjective, currentMission } from './missions.js';
import { buyWeapon, priceFor } from './shop.js';
import { useAbility, abilityReady } from './crew.js';
import { addWanted, setWanted } from './wanted.js';
import { openWheel, closeWheel, wheelItems, selectTier, fire } from './combat.js';
import { saveGame, loadGame } from './save.js';
import { startRace, raceCheckpoint, startJob, completeJob, collectTape, tapeSpots } from './races.js';
import { buyUpgrade, triggerNitro, boardBoat, leaveBoat, driveBoat } from './garage.js';
import { districtAt } from './config.js';

const params = new URLSearchParams(window.location.search);
const shotParam = parseInt(params.get('shot') || '0', 10);
const canvas = document.getElementById('game');
const world = createWorld();
const sceneCtx = createScene(canvas);
const dyn = createDynamic(sceneCtx.scene);
const hud = createHUD();
const input = createInput();
let ticks = 0;
let camOverride = null;
let slot = 1;
window.__game = { ticks: 0 };

// --- Shot staging (frozen worlds, one per screenshot) ---
function stageShot(n) {
  world.frozen = true;
  world.state = 'FREE_ROAM';
  world.player.onFoot = false;
  world.playerScale = 1;
  if (n === 1) {
    // THE CHASE — dusk, south down the western avenue toward the pier,
    // ferris wheel glowing on the horizon, heli beam on the car.
    world.day = 5;
    world.state = 'MISSION';
    startMission(world, 5);
    // Dusk (18:00) for the ember chase — set after startMission, which
    // resets the hour to the mission's own hour.
    world.hour = 18;
    world.missions.current = 5;
    world.missions.objective = 0;
    world.missionLabel = 'Break the line, then cross.';
    setWanted(world.wanted, 5);
    world.car.x = -560; world.car.z = -140; world.car.angle = 0;
    world.player.x = -560; world.player.z = -140; world.player.angle = 0;
    world.player.onFoot = false;
    // Roadblocks + SWAT + spikes ahead of the car.
    world.police.roadblocks = [{ x: -560, z: -118, angle: 0 }, { x: -560, z: -95, angle: 0 }];
    world.police.swat = { x: -548, z: -125, angle: 0, speed: 0 };
    world.police.heli = { x: -560, z: -140, y: 35, angle: 0 };
    world.wanted.spikes = [{ x: -560, z: -128, t: 0 }, { x: -560, z: -105, t: 0 }];
    // Chase traffic + sidewalk crowd along the avenue.
    for (let i = 0; i < 6; i += 1) {
      const c = world.traffic.cars[i];
      c.x = -560 + (i % 2 === 0 ? -4 : 4);
      c.z = -200 + i * 22;
      c.angle = Math.PI;
    }
    const pedSpots = [[-548, -160], [-572, -180], [-548, -120], [-572, -100], [-548, -200], [-572, -220], [-548, -80], [-572, -60]];
    pedSpots.forEach((p, i) => {
      const ped = world.traffic.peds[i];
      ped.x = p[0]; ped.z = p[1]; ped.angle = 0.4;
    });
    camOverride = { pos: [-578, 8, -182], target: [-560, 25, -110] };
    hud.showDialogue('Sable Okonkwo', 'Dusk run. The heli is on us — stay in the golden lanes.');
    hud.showWheel(wheelItems({ pistol: true, smg: true, shotgun: true }), 'pistol');
    openWheel(world.combat);
  } else if (n === 2) {
    // THE SHOP — DELTA ARMS forecourt, Mara whole, crowd doing jobs.
    world.hour = 10;
    world.day = 2;
    world.state = 'FREE_ROAM';
    world.player.onFoot = true;
    world.playerScale = 1.8;
    world.player.x = SHOP.x - 10;
    world.player.z = SHOP.z + 40;
    world.player.angle = Math.PI;
    world.car.x = -378; world.car.z = -200; world.car.angle = Math.PI / 2;
    // Parked car in the forecourt + a job-doing crowd.
    const parked = world.traffic.cars[0];
    parked.x = -378; parked.z = -200; parked.angle = Math.PI / 2;
    const fore = [[-342, -160], [-310, -165], [-342, -185], [-305, -190], [-340, -200], [-348, -152], [-312, -152], [-346, -168], [-316, -170], [-330, -150], [-320, -180], [-350, -190]];
    fore.forEach((p, i) => {
      const ped = world.traffic.peds[i];
      ped.x = p[0]; ped.z = p[1]; ped.angle = 0.5 + (i % 3) * 0.4;
      ped.job = ['vendor', 'tourist', 'shopper', 'commuter'][i % 4];
    });
    camOverride = { pos: [-330, 4.5, -146], target: [-330, 3, -200] };
    hud.showDialogue('Mara Solano', 'DELTA ARMS. Four tiers, one rule: never pay full price twice.');
    hud.showShop(world.shop, world.money, world.standing, world.district, (id) => {
      const r = buyWeapon(world.shop, world.money, id, world.standing, world.district);
      if (r.ok) world.money = r.money;
    });
  } else if (n === 3) {
    // THE PIER AT NIGHT — stalls, string lights, ferris wheel, confetti.
    world.hour = 21;
    world.day = 7;
    world.state = 'MISSION';
    startMission(world, 7);
    world.missions.current = 7;
    world.missions.objective = 0;
    world.missionLabel = 'Meet Inez on Coral Pier — after dark.';
    world.player.onFoot = true;
    world.playerScale = 1.8;
    world.player.x = -652; world.player.z = 431; world.player.angle = Math.PI / 2;
    const deckPeds = [[-665, 412], [-665, 444], [-668, 418], [-668, 438], [-663, 425], [-663, 435], [-652, 418], [-652, 438], [-672, 430], [-645, 420]];
    deckPeds.forEach((p, i) => {
      const ped = world.traffic.peds[i];
      ped.x = p[0]; ped.z = p[1]; ped.angle = 0.3 + (i % 4) * 0.5;
      ped.job = ['tourist', 'vendor', 'fisherman', 'shopper'][i % 4];
    });
    camOverride = { pos: [-642, 4, 431], target: [-705, 20, 431] };
    hud.showDialogue('Inez Vargas', 'The ledger is on this pier. Two pages — and the wheel never stops turning.');
  } else if (n === 4) {
    // THE PORT AT DUSK — crane load, boat, containers, freeway bridge.
    world.hour = 18;
    world.day = 8;
    world.state = 'MISSION';
    startMission(world, 8);
    world.missions.current = 8;
    world.missions.objective = 0;
    world.missionLabel = 'Sweep the dead drops: marina, then the pier.';
    setWanted(world.wanted, 2);
    world.player.onFoot = true;
    world.playerScale = 2;
    world.player.x = 632; world.player.z = 618; world.player.angle = -Math.PI / 2;
    world.car.x = 620; world.car.z = 596; world.car.angle = Math.PI / 2;
    world.boat.x = BOAT.x; world.boat.z = BOAT.z;
    const yardPeds = [[400, 520], [440, 560], [500, 540], [460, 600], [540, 580], [380, 560], [470, 600], [585, 605], [520, 520], [610, 610]];
    yardPeds.forEach((p, i) => {
      const ped = world.traffic.peds[i];
      ped.x = p[0]; ped.z = p[1]; ped.angle = 0.6 + (i % 3) * 0.5;
      ped.job = ['dockworker', 'commuter', 'tourist'][i % 3];
    });
    camOverride = { pos: [655, 9, 632], target: [588, 8, 605] };
    hud.showDialogue('Orin Beck', 'The signal is in the containers. The crane never sleeps — neither do we.');
  }
  world.district = districtAt(world.player.x, world.player.z).id;
  updateScene(sceneCtx, dyn, world, 0.016, 0, camOverride);
  hud.update(world, 0);
}

// --- Normal play ---
let paused = false;
let shopOpen = false;
const title = createTitle({
  onNew(s) {
    slot = s;
    world.state = 'FREE_ROAM';
    title.hide();
    hud.hideDialogue();
    playRadioJingle();
  },
  onLoad(s, data) {
    slot = s;
    if (data) {
      world.money = data.money || 500;
      world.day = data.day || 1;
      world.rp = data.rp || 0;
      if (data.missionsDone) world.missions.done = data.missionsDone.slice();
      if (data.missionsCurrent) world.missions.current = data.missionsCurrent;
      if (data.standing) world.standing = data.standing;
    }
    world.state = 'FREE_ROAM';
    title.hide();
    hud.hideDialogue();
    playRadioJingle();
  },
});

function saveNow() {
  saveGame(slot, {
    money: Math.floor(world.money),
    day: world.day,
    rp: world.rp,
    rank: districtById(world.district).name,
    missionsDone: world.missions.done,
    missionsCurrent: world.missions.current,
    standing: world.standing,
  });
}

function gameStep(dt, t) {
  const inputState = {
    forward: input.forward(),
    back: input.back(),
    left: input.left(),
    right: input.right(),
  };
  // Keys.
  if (input.wasPressed('KeyE')) {
    if (shopOpen) { hud.hideShop(); shopOpen = false; }
    else if (world.player.onFoot) {
      const nearShop = Math.hypot(world.player.x - SHOP.x, world.player.z - SHOP.z) < 20;
      if (nearShop) {
        hud.showShop(world.shop, world.money, world.standing, world.district, (id) => {
          const r = buyWeapon(world.shop, world.money, id, world.standing, world.district);
          if (r.ok) { world.money = r.money; playBlip(880); }
        });
        shopOpen = true;
      } else if (enterCar(world)) {
        playBlip(440);
      } else {
        const near = world.traffic.cars.filter((c) => Math.hypot(world.player.x - c.x, world.player.z - c.z) < 6);
        if (near.length && stealCar(world, near)) playBlip(440);
      }
    } else if (exitCar(world)) {
      playBlip(330);
    }
  }
  if (input.wasPressed('KeyQ')) {
    if (world.combat.wheelOpen) { closeWheel(world.combat); hud.hideWheel(); }
    else {
      openWheel(world.combat);
      const owned = {};
      for (const id of world.shop.owned) owned[id] = true;
      hud.showWheel(wheelItems(owned), world.combat.current);
    }
  }
  if (world.combat.wheelOpen) {
    for (let tier = 1; tier <= 4; tier += 1) {
      if (input.wasPressed('Digit' + tier)) {
        const owned = {};
        for (const id of world.shop.owned) owned[id] = true;
        selectTier(world.combat, tier, owned);
        hud.showWheel(wheelItems(owned), world.combat.current);
      }
    }
  }
  if (input.wasPressed('KeyC') && abilityReady(world.crew, 'juno', t)) useAbility(world.crew, 'juno', t, world);
  if (input.wasPressed('KeyV') && abilityReady(world.crew, 'petra', t)) useAbility(world.crew, 'petra', t, world);
  if (input.wasPressed('KeyX') && abilityReady(world.crew, 'cassia', t)) useAbility(world.crew, 'cassia', t, world);
  if (input.wasPressed('KeyM')) {
    const m = currentMission(world.missions);
    if (m) hud.showDialogue(m.contact, m.desc + ' — ' + m.next);
  }
  if (input.wasPressed('KeyG')) {
    const r = buyUpgrade(world.garage, world.money, 'engine');
    if (r.ok) world.money = r.money;
  }
  if (input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) triggerNitro(world.garage, t);
  if (input.wasPressed('KeyF')) {
    if (world.boat.boarded) leaveBoat(world.boat);
    else boardBoat(world.boat, world.player.x, world.player.z);
  }
  if (input.wasPressed('KeyP')) { paused = !paused; }
  if (input.wasPressed('KeyR')) {
    const obj = currentObjective(world.missions);
    if (obj && world.state === 'MISSION') {
      const d = districtAt(obj.x, obj.z);
      hud.showDialogue('GPS', 'Objective: ' + obj.label + ' — ' + d.name);
    }
  }
  // Mission objective label for the HUD.
  const obj = currentObjective(world.missions);
  world.missionLabel = obj ? obj.label : '';
  // Boat driving.
  if (world.boat.boarded) {
    driveBoat(world.boat, inputState, dt);
    world.player.x = world.boat.x;
    world.player.z = world.boat.z;
  }
  if (!paused) updateWorld(world, inputState, dt);
  // Wanted: siren + engine audio.
  setSiren(world.wanted.level >= 2);
  setEngine(!world.player.onFoot, Math.abs(world.car.speed));
  // Tapes: auto-collect when close.
  const spots = tapeSpots();
  for (const s of spots) {
    if (Math.hypot(world.player.x - s.x, world.player.z - s.z) < 10) {
      const ev = collectTape(world.tapes, s.x, s.z);
      if (ev.event === 'tape') {
        world.money += ev.bonus;
        playBlip(990);
      }
    }
  }
  // Autosave every ~60 s.
  if (Math.floor(t) % 60 === 0 && Math.floor(t) !== Math.floor(t - dt)) saveNow();
  input.clearPressed();
}

// --- Main loop ---
let last = performance.now();
function loop(now) {
  const rawDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (shotParam >= 1 && shotParam <= 4) {
    ticks += 1;
    window.__game.ticks = ticks;
    updateScene(sceneCtx, dyn, world, rawDt, t, camOverride);
    hud.update(world, t);
    // Shot mode renders exactly 14 frames, then the page goes static
    // so the screenshot driver captures a settled frame fast.
    if (ticks < 14) requestAnimationFrame(loop);
  } else if (world.state !== 'TITLE') {
    ticks += 1;
    window.__game.ticks = ticks;
    gameStep(rawDt, t);
    updateScene(sceneCtx, dyn, world, rawDt, t, null);
    hud.update(world, t);
    requestAnimationFrame(loop);
  } else {
    updateScene(sceneCtx, dyn, world, rawDt, t, { pos: [-320, 60, -420], target: [-200, 0, -200] });
    requestAnimationFrame(loop);
  }
}

if (shotParam >= 1 && shotParam <= 4) {
  stageShot(shotParam);
} else {
  title.show();
}
requestAnimationFrame(loop);
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });
