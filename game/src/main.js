// Neon Delta LA — the game itself. Free-roam, missions, combat, arrest,
// crew abilities, the shop, and the save. Exposes window.__ndState for the
// screenshot driver.

import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS, WEAPONS, STARTING_CASH, SAVE_KEY, RADIO_LABEL, CREW } from './config.js';
import { startMission, updateMission, currentStep } from './missions.js';
import { buyWeapon, canBuy } from './shop.js';
import { Combat } from './combat.js';
import { newCrewState, applySwap, applyRepair, applyOverwatch, tickCooldown } from './crew.js';
import { newWantedState, WANTED } from './wanted.js';
import { nightLevel } from './lights.js';
import { makeSave, decodeSave, encodeSave } from './save.js';
import { rpForReward, rankFor } from './rank.js';
import { collisionDamage } from './damage.js';
import { districtAt, SHOP_POS, SPAWN_POS, isBlocked, isOnPier } from './geo.js';
import { createScene, updateLighting, resize } from './scene.js';
import { buildWorld, updateWorld } from './world.js';
import { createVehicle, stepVehicle } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, syncPolice, heliBeamState } from './police.js';
import { createOfficers, updateOfficers, nearestOfficerDist } from './officers.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { contactLine, contactColor } from './characters.js';
import { crewPortrait } from './portraits.js';
import { buildDispatch } from './dispatch.js';
import { stageForShot } from './shots.js';

const errors = [];
window.addEventListener('error', (e) => {
  errors.push(String(e.message || e.error || 'error'));
});

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function initGame() {
  const canvas = document.getElementById('game');
  const env = createScene(canvas);
  const world = buildWorld(env.scene);
  const traffic = createTraffic(env.scene);
  const police = createPolice(env.scene);
  const officers = createOfficers(env.scene);
  const hud = createHud();
  const input = createInput();
  input.attach();
  const audio = createAudio();
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  // Mara, on foot.
  const maraMat = new THREE.MeshLambertMaterial({ color: 0xff5a5f, roughness: 0.7 });
  const mara = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.0, 3, 8), maraMat);
  mara.castShadow = true;
  env.scene.add(mara);
  const maraJacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.7, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x2ec4b6, roughness: 0.7 }),
  );
  maraJacket.position.y = 0.35;
  mara.add(maraJacket);

  const playerCar = createVehicle({ x: SPAWN_POS.x, z: SPAWN_POS.z + 6, heading: 0, body: 0xff5a5f });
  env.scene.add(playerCar.mesh);

  const state = {
    mode: 'free',
    money: STARTING_CASH,
    day: 1,
    rp: 0,
    health: 100,
    armor: 0,
    hour: 9,
    time: 0,
    ticks: 0,
    wanted: newWantedState(),
    mission: null,
    nextMission: 0,
    crew: newCrewState(),
    combat: new Combat(),
    inCar: false,
    car: playerCar,
    carHealth: 100,
    px: SPAWN_POS.x,
    pz: SPAWN_POS.z,
    heading: 0,
    walkSpeed: 0,
    shopOpen: false,
    radioOn: false,
    arrestT: 0,
    chaseTarget: null,
    stoleKind: null,
    stats: { missionsDone: 0, totalEarned: 0, carsStolen: 0 },
    cameraOverride: null,
    shot: null,
  };

  // --- shot staging (driven by ?shot=N) ---
  const params = new URLSearchParams(window.location.search);
  const shotNum = params.get('shot');
  if (shotNum) {
    const staging = stageForShot(shotNum);
    if (staging) {
      state.shot = staging;
      state.money = staging.money;
      state.hour = staging.hour;
      state.wanted.level = staging.wanted;
      state.px = staging.player.x;
      state.pz = staging.player.z;
      state.heading = staging.player.heading;
      state.cameraOverride = staging.camera;
      state.shopOpen = staging.shopOpen;
      state.car.x = staging.car.x;
      state.car.z = staging.car.z;
      state.car.heading = staging.car.heading;
      state.car.mesh.position.set(state.car.x, 0, state.car.z);
      state.car.mesh.rotation.y = state.car.heading;
      state.inCar = staging.inCar;
      if (staging.mission != null) {
        state.mission = startMission(staging.mission);
        state.mission.step = staging.stage;
        state.nextMission = staging.mission + 1;
        state.mode = 'mission';
      }
    }
  }

  // --- load a save if one exists and no shot is staged ---
  if (!state.shot) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = decodeSave(raw);
        if (s) {
          state.money = s.money;
          state.day = s.day;
          state.rp = s.rp;
          state.health = s.health;
          state.armor = s.armor;
          state.px = s.x;
          state.pz = s.z;
          state.heading = s.heading;
          state.hour = s.hour;
          state.nextMission = s.mission;
          state.stats = s.stats;
          state.crew.cooldownT = s.plateT;
          state.crew.repairT = s.repairT;
          state.crew.watchT = s.watchT;
          state.crew.watchCd = s.watchCd;
          state.combat.ammo = s.ammo;
          state.combat.reserves = s.reserves;
          state.combat.owned = s.weapons;
        }
      }
    } catch {
      // a bad save never blocks the game
    }
  }

  function saveGame() {
    try {
      const s = makeSave({
        money: state.money,
        mission: state.nextMission,
        step: state.mission ? state.mission.step : 0,
        health: state.health,
        armor: state.armor,
        x: state.px,
        z: state.pz,
        heading: state.heading,
        hour: state.hour,
        weapons: state.combat.owned,
        ammo: state.combat.ammo,
        reserves: state.combat.reserves,
        day: state.day,
        rp: state.rp,
        standing: {},
        plateT: state.crew.cooldownT,
        repairT: state.crew.repairT,
        watchT: state.crew.watchT,
        watchCd: state.crew.watchCd,
        stats: state.stats,
      });
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      // storage may be unavailable; the game goes on
    }
  }

  function missionTarget() {
    if (!state.mission) return null;
    const step = currentStep(state.mission);
    if (!step) return null;
    if (step.x != null) return { x: step.x, z: step.z };
    if (step.points) return { x: step.points[0][0], z: step.points[0][1] };
    if (state.chaseTarget) return { x: state.chaseTarget.x, z: state.chaseTarget.z };
    return { x: state.px, z: state.pz };
  }

  function startNextMission() {
    if (state.nextMission >= MISSIONS.length) {
      hud.toast('ALL MISSIONS DONE — YOU ARE A DELTA LEGEND');
      return;
    }
    const def = MISSIONS[state.nextMission];
    state.mission = startMission(state.nextMission);
    state.hour = def.hour;
    state.wanted.level = def.startWanted || 0;
    state.mode = 'mission';
    hud.showDialogue(def.contact, contactColor(def.contact), def.brief);
    hud.toast(`MISSION ${state.nextMission + 1} — ${def.name} · $${def.reward}`);
    audio.click();
  }

  function completeMission() {
    const m = state.mission;
    if (!m) return;
    const reward = m.def.reward;
    state.money += reward;
    state.rp += rpForReward(reward);
    state.day += 1;
    state.stats.missionsDone += 1;
    state.stats.totalEarned += reward;
    state.nextMission = m.index + 1;
    state.mission = null;
    state.mode = 'free';
    const rank = rankFor(state.rp);
    hud.toast(`MISSION COMPLETE · +$${reward} · ${rank.title}`);
    hud.center(`MISSION COMPLETE\n+$${reward}`);
    setTimeout(() => hud.center(''), 2200);
    audio.cash();
    saveGame();
  }

  function doArrest() {
    const lost = Math.min(state.money, 200);
    state.money -= lost;
    state.wanted.level = 0;
    state.wanted.quietTimer = 0;
    state.px = SPAWN_POS.x;
    state.pz = SPAWN_POS.z;
    state.inCar = false;
    state.car.x = SPAWN_POS.x;
    state.car.z = SPAWN_POS.z + 6;
    state.car.health = 100;
    state.mode = 'free';
    state.arrestT = 0;
    hud.toast(`BUSTED — NDPD TOOK $${lost}. BACK ON THE STREET.`);
    hud.center('BUSTED');
    setTimeout(() => hud.center(''), 2200);
    saveGame();
  }

  function usePlates() {
    const res = applySwap(state.crew, state.wanted.level, 45);
    if (res.ok) {
      state.wanted.level = res.wanted;
      hud.toast('CLEAN PLATES — WANTED DOWN');
      audio.click();
    } else if (res.reason === 'no-heat') {
      hud.toast('CLEAN PLATES — NO HEAT TO DROP');
    } else {
      hud.toast('CLEAN PLATES — RECHARGING');
    }
  }

  function useRepair() {
    const res = applyRepair(state.crew, state.inCar ? state.car : null, state.money, 150, 60);
    if (res.ok) {
      state.money = res.money;
      state.car.health = 100;
      hud.toast('FIELD REPAIR — CONDITION 100%');
      audio.click();
    } else if (res.reason === 'cooldown') {
      hud.toast('FIELD REPAIR — RECHARGING');
    } else if (res.reason === 'no-car') {
      hud.toast('FIELD REPAIR — GET IN THE CAR FIRST');
    } else if (res.reason === 'no-funds') {
      hud.toast('FIELD REPAIR — NEED $150');
    } else {
      hud.toast('FIELD REPAIR — CAR OK');
    }
  }

  function useOverwatch() {
    const res = applyOverwatch(state.crew, 20, 45);
    if (res.ok) {
      hud.toast('OVERWATCH — CASSIA HAS THE ROOFS');
      audio.click();
    } else if (res.reason === 'active') {
      hud.toast('OVERWATCH — ALREADY ACTIVE');
    } else {
      hud.toast('OVERWATCH — RECHARGING');
    }
  }

  function onBuy(idx) {
    const res = buyWeapon(state.money, state.combat.owned, state.combat.ammo, state.combat.reserves, idx);
    if (res.ok) {
      state.money = res.money;
      state.combat.owned = res.owned;
      state.combat.ammo = res.ammo;
      state.combat.reserves = res.reserves;
      hud.toast(`${WEAPONS[idx].name} BOUGHT — $${WEAPONS[idx].price}`);
      audio.cash();
      renderShop();
    } else if (res.reason === 'owned') {
      hud.toast('ALREADY OWNED');
    } else {
      hud.toast('NOT ENOUGH CASH');
    }
  }

  function renderShop() {
    hud.renderShop(
      { money: state.money, ownedWeapons: state.combat.owned, shopOpen: state.shopOpen },
      onBuy,
    );
  }

  // A staged shot can open the shop before the first frame.
  if (state.shopOpen) renderShop();

  function tryEnterExitCar() {
    if (state.inCar) {
      state.inCar = false;
      state.px = state.car.x + Math.sin(state.car.heading + Math.PI / 2) * 3;
      state.pz = state.car.z + Math.cos(state.car.heading + Math.PI / 2) * 3;
      state.heading = state.car.heading;
      return;
    }
    const d = Math.hypot(state.car.x - state.px, state.car.z - state.pz);
    if (d < 5) {
      state.inCar = true;
      state.stoleKind = null;
      return;
    }
    // steal the nearest traffic car
    let best = null;
    let bestD = 5;
    for (const car of traffic.cars) {
      const cd = Math.hypot(car.x - state.px, car.z - state.pz);
      if (cd < bestD) {
        bestD = cd;
        best = car;
      }
    }
    if (best) {
      state.car.x = best.x;
      state.car.z = best.z;
      state.car.heading = best.heading;
      state.car.health = 100;
      state.inCar = true;
      state.stoleKind = 'sedan';
      state.stats.carsStolen += 1;
      hud.toast('CAR JACKED — NDPD NOTICED');
      WANTED.add(state.wanted, 1);
    }
  }

  function fireWeapon() {
    const shot = state.combat.fire();
    if (!shot) return;
    audio.shot();
    // hit the nearest police car in front, within range
    const w = WEAPONS[state.combat.current];
    const fx = Math.sin(state.heading);
    const fz = Math.cos(state.heading);
    for (const car of police.cars) {
      const dx = car.x - state.px;
      const dz = car.z - state.pz;
      const dist = Math.hypot(dx, dz);
      if (dist > w.range) continue;
      const dot = (dx * fx + dz * fz) / Math.max(0.001, dist);
      if (dot > 0.7) {
        car.health = (car.health || 100) - w.dmg;
        if (car.health <= 0) {
          car.health = 100;
          car.x = state.px + Math.sin(state.heading + 2.4) * 70;
          car.z = state.pz + Math.cos(state.heading + 2.4) * 70;
          WANTED.add(state.wanted, 1);
          hud.toast('UNIT DOWN — HEAT RISES');
        }
      }
    }
  }

  function update(dt) {
    state.time += dt;
    state.ticks += 1;
    const night = nightLevel(state.hour);
    state.hour = (state.hour + dt / 3600) % 24;

    // --- input ---
    const throttle = input.down('KeyW') || input.down('ArrowUp');
    const brake = input.down('KeyS') || input.down('ArrowDown');
    const left = input.down('KeyA') || input.down('ArrowLeft');
    const right = input.down('KeyD') || input.down('ArrowRight');
    const handbrake = input.down('Space');

    if (input.wasPressed('KeyE')) tryEnterExitCar();
    if (input.wasPressed('KeyC')) usePlates();
    if (input.wasPressed('KeyV')) useRepair();
    if (input.wasPressed('KeyX')) useOverwatch();
    if (input.wasPressed('KeyM')) {
      state.radioOn = audio.toggleRadio();
    }
    if (input.wasPressed('KeyR')) {
      if (state.combat.reload()) hud.toast('RELOADED');
    }
    if (input.wasPressed('Tab')) {
      state.shopOpen = !state.shopOpen;
      renderShop();
    }
    if (input.wasPressed('Enter') && !state.mission && !state.shopOpen) {
      startNextMission();
    }
    if (input.wasPressed('Digit1')) state.combat.switchTo(0);
    if (input.wasPressed('Digit2')) state.combat.switchTo(1);
    if (input.wasPressed('Digit3')) state.combat.switchTo(2);
    if (input.wasPressed('Digit4')) state.combat.switchTo(3);
    if (input.wasPressed('Digit5')) state.combat.switchTo(4);
    if (input.wasPressed('Digit6')) state.combat.switchTo(5);
    if (input.down('Mouse0') || input.down('Space')) fireWeapon();

    // --- movement ---
    if (state.inCar) {
      stepVehicle(state.car, { throttle, brake, left, right, handbrake }, dt);
      state.px = state.car.x;
      state.pz = state.car.z;
      state.heading = state.car.heading;
      state.carHealth = state.car.health;
      if (state.car.health <= 5) {
        state.car.health = 100;
        state.inCar = false;
        state.px = state.car.x + 3;
        state.pz = state.car.z + 3;
        hud.toast('CAR WRECKED — ON FOOT NOW');
        audio.crash();
      }
    } else {
      const moveX = (right ? 1 : 0) - (left ? 1 : 0);
      const moveZ = (throttle ? 1 : 0) - (brake ? 1 : 0);
      const moving = moveX !== 0 || moveZ !== 0;
      const speed = moving ? 6 : 0;
      state.walkSpeed = speed;
      if (moving) {
        const len = Math.hypot(moveX, moveZ) || 1;
        const nx = state.px + (moveX / len) * speed * dt;
        const nz = state.pz + (moveZ / len) * speed * dt;
        if (!isBlocked(nx, nz)) {
          state.px = nx;
          state.pz = nz;
        }
        state.heading = Math.atan2(moveX / len, moveZ / len);
      }
      mara.position.set(state.px, 1.0, state.pz);
      mara.rotation.y = state.heading;
      mara.visible = true;
    }
    if (state.inCar) mara.visible = false;
    state.car.mesh.visible = true;

    // --- mission ---
    if (state.mission) {
      const step = currentStep(state.mission);
      if (step && step.type === 'chase' && !state.chaseTarget) {
        const t = createVehicle({ x: state.px + 40, z: state.pz + 40, heading: state.heading, body: 0x2a2a2a, kind: 'target' });
        env.scene.add(t.mesh);
        state.chaseTarget = t;
      }
      if (state.chaseTarget) {
        const t = state.chaseTarget;
        const dx = t.x - state.px;
        const dz = t.z - state.pz;
        const dist = Math.hypot(dx, dz);
        const away = Math.atan2(dx, dz);
        t.heading = away;
        t.x += Math.sin(away) * 14 * dt;
        t.z += Math.cos(away) * 14 * dt;
        t.mesh.position.set(t.x, 0, t.z);
        t.mesh.rotation.y = t.heading;
        if (step && step.type !== 'chase') {
          env.scene.remove(t.mesh);
          state.chaseTarget = null;
        }
      }
      const ctx = {
        x: state.px,
        z: state.pz,
        inCar: state.inCar,
        stoleKind: state.stoleKind,
        wanted: state.wanted.level,
        chaseClose: state.chaseTarget ? Math.hypot(state.chaseTarget.x - state.px, state.chaseTarget.z - state.pz) < 35 : false,
        speed: state.inCar ? Math.abs(state.car.speed) : state.walkSpeed,
        wrecked: state.carHealth <= 5,
      };
      const before = state.mission.status;
      updateMission(state.mission, dt, ctx);
      if (state.mission.status === 'done' && before !== 'done') {
        completeMission();
      }
    }

    // --- wanted: heat fades when unseen ---
    const nearestPolice = police.cars.length
      ? Math.min(...police.cars.map((c) => Math.hypot(c.x - state.px, c.z - state.pz)))
      : Infinity;
    const seen = nearestPolice < 60 || (police.heli.active && state.wanted.level > 0);
    WANTED.update(state.wanted, dt, seen && state.wanted.level > 0);
    if (state.wanted.level > 0 && state.crew.watchT > 0) {
      state.wanted.quietTimer += dt * 0.5;
    }

    // --- police, officers, traffic, world ---
    syncPolice(police, env.scene, state.px, state.pz, state.wanted.level, dt, state.time);
    updateOfficers(officers, state.px, state.pz, state.wanted.level, dt);
    updateTraffic({ cars: traffic.cars, peds: traffic.peds, night }, dt, state.time);
    updateWorld(world, night, state.time);
    updateLighting(env, night, state.hour);
    audio.update(dt, state.wanted.level);
    audio.siren(state.wanted.level > 0);
    tickCooldown(state.crew, dt);
    state.combat.tick(dt);

    // --- arrest: an officer close by on foot fills the meter ---
    if (!state.inCar && state.wanted.level > 0) {
      const d = nearestOfficerDist(officers, state.px, state.pz);
      if (d < 3) {
        state.arrestT += dt;
        hud.center(`ARREST ${Math.ceil(2 - state.arrestT)}…`);
        if (state.arrestT >= 2) doArrest();
      } else {
        state.arrestT = 0;
        hud.center('');
      }
    }

    // --- camera ---
    if (state.cameraOverride) {
      env.camera.position.set(...state.cameraOverride.pos);
      env.camera.lookAt(...state.cameraOverride.target);
    } else if (state.inCar) {
      const back = 15;
      const up = 7.5;
      const fx = Math.sin(state.heading);
      const fz = Math.cos(state.heading);
      const cx = state.px - fx * back;
      const cz = state.pz - fz * back;
      env.camera.position.set(cx, up, cz);
      env.camera.lookAt(state.px + fx * 10, 2.5, state.pz + fz * 10);
    } else {
      const back = 11;
      const up = 6;
      const fx = Math.sin(state.heading);
      const fz = Math.cos(state.heading);
      env.camera.position.set(state.px - fx * back, up, state.pz - fz * back);
      env.camera.lookAt(state.px + fx * 6, 1.6, state.pz + fz * 6);
    }

    // --- HUD ---
    const dispatch = buildDispatch({
      cars: police.cars,
      heli: police.heli.active ? { x: police.heli.x, z: police.heli.z } : null,
      px: state.px,
      pz: state.pz,
      wanted: state.wanted.level,
      crime: state.mission ? 'EVADING POLICE' : 'GRAND THEFT AUTO',
      seen,
    });
    hud.update(
      {
        money: state.money,
        wanted: state.wanted.level,
        rp: state.rp,
        day: state.day,
        health: state.health,
        armor: state.armor,
        x: state.px,
        z: state.pz,
        heading: state.heading,
        mission: state.mission,
        nextMission: state.nextMission < MISSIONS.length ? state.nextMission : null,
        missionTarget: missionTarget(),
        speedKmh: state.inCar ? Math.abs(state.car.speed) * 3.6 : state.walkSpeed * 3.6,
        weapon: state.combat.current,
        ammo: state.combat.ammo[state.combat.current],
        reserve: state.combat.reserves[state.combat.current],
        dispatch,
        crew: CREW,
        plateT: state.crew.cooldownT,
        repairT: state.crew.repairT,
        watchT: state.crew.watchT,
        watchCd: state.crew.watchCd,
        radioOn: state.radioOn,
        policeCars: police.cars,
      },
      dt,
    );
    input.clearPressed();
  }

  window.__ndState = function () {
    const night = nightLevel(state.hour);
    const heli = police.heli.active ? [police.heli.x, police.heli.y, police.heli.z] : null;
    const beam = police.heli.active ? heliBeamState(police, state.px, state.pz) : null;
    return {
      ticks: state.ticks,
      state: state.mode,
      hour: state.hour,
      night,
      wanted: state.wanted.level,
      heli,
      heliBeam: beam,
      pos: [state.px, state.pz],
      dispatchUnits: police.cars.length + (police.heli.active ? 1 : 0),
      mission: state.mission ? state.mission.index : -1,
      missionStage: state.mission
        ? { index: state.mission.step, total: state.mission.def.steps.length }
        : { index: 0, total: 1 },
      speedKmh: state.inCar ? Math.abs(state.car.speed) * 3.6 : state.walkSpeed * 3.6,
      money: state.money,
      shopOpen: state.shopOpen,
      ownedWeapons: [...state.combat.owned],
      errors: [...errors],
    };
  };

  let last = performance.now();
  let saveTimer = 0;
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0.001, 0.05);
    last = now;
    try {
      update(dt);
      env.renderer.render(env.scene, env.camera);
    } catch (e) {
      errors.push(String((e && e.message) || e));
    }
    saveTimer += dt;
    if (saveTimer > 30) {
      saveTimer = 0;
      saveGame();
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', () => resize(env));
  requestAnimationFrame(frame);
  return state;
}
