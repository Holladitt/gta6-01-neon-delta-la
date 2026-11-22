// Ambient city life: traffic cars that follow the road grid and stop at red
// lights, and pedestrians who stroll the sidewalks. Counts are fixed by the
// brief: 104 pedestrians, 22 traffic cars (16 by day, 6 at night).

import * as THREE from '../vendor/three.module.min.js';
import { makeCarMesh } from './vehicles.js';
import { makeRng } from './rng.js';
import { ROAD_SPACING, isOnRoad } from './geo.js';
import { lightState } from './lights.js';

export const PED_COUNT = 104;
export const TRAFFIC_DAY = 16;
export const TRAFFIC_NIGHT = 6;

const CAR_COLORS = [0x3a7bd5, 0xd5a23a, 0x7a4a9a, 0x4a9a6a, 0xc0c0c0, 0x2a2a2a, 0x8a5a3a, 0x5a8a8a];

export function createTraffic(scene) {
  const rng = makeRng(777);
  const cars = [];
  for (let i = 0; i < TRAFFIC_DAY + TRAFFIC_NIGHT; i++) {
    const color = CAR_COLORS[i % CAR_COLORS.length];
    const mesh = makeCarMesh({ body: color });
    const onX = rng.chance(0.5);
    const line = (rng.int(-8, 8)) * ROAD_SPACING;
    const along = rng.range(-600, 600);
    const car = {
      mesh,
      x: onX ? along : line,
      z: onX ? line : along,
      heading: onX ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI),
      speed: rng.range(6, 11),
      night: i >= TRAFFIC_DAY,
      wait: 0,
    };
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
    scene.add(mesh);
    cars.push(car);
  }
  const peds = [];
  const pedGeo = new THREE.CapsuleGeometry(0.35, 0.9, 3, 6);
  const pedMats = [0xe65a8a, 0x5aa9e6, 0x7bc96f, 0xe6a35a, 0xb388eb, 0xdddddd].map(
    (c) => new THREE.MeshLambertMaterial({ color: c, roughness: 0.8 }),
  );
  for (let i = 0; i < PED_COUNT; i++) {
    const mat = pedMats[i % pedMats.length];
    const mesh = new THREE.Mesh(pedGeo, mat);
    const bx = rng.int(-8, 7) * ROAD_SPACING + ROAD_SPACING / 2 + rng.range(-25, 25);
    const bz = rng.int(-8, 7) * ROAD_SPACING + ROAD_SPACING / 2 + rng.range(-25, 25);
    const ped = {
      mesh,
      x: bx,
      z: bz,
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(0.8, 1.6),
      phase: rng.range(0, Math.PI * 2),
    };
    mesh.position.set(bx, 0.95, bz);
    scene.add(mesh);
    peds.push(ped);
  }
  return { cars, peds };
}

export function updateTraffic(state, dt, time) {
  const lights = lightState(time);
  for (const car of state.cars) {
    if (car.night && state.night < 0.5) {
      car.mesh.visible = false;
      continue;
    }
    car.mesh.visible = true;
    // stop at red lights when approaching an intersection
    const nearX = Math.abs(car.x - Math.round(car.x / ROAD_SPACING) * ROAD_SPACING) < 9;
    const nearZ = Math.abs(car.z - Math.round(car.z / ROAD_SPACING) * ROAD_SPACING) < 9;
    const onEastWest = Math.abs(Math.sin(car.heading)) > 0.7;
    let stop = false;
    if (nearX && nearZ) {
      const nsGreen = lights.ns === 'green';
      stop = onEastWest ? nsGreen : !nsGreen;
    }
    if (stop) {
      car.wait += dt;
    } else {
      car.wait = 0;
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      if (car.x > 680) car.x = -680;
      if (car.x < -680) car.x = 680;
      if (car.z > 680) car.z = -680;
      if (car.z < -680) car.z = 680;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
  for (const ped of state.peds) {
    ped.phase += dt;
    ped.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.z += Math.cos(ped.heading) * ped.speed * dt;
    if (!isOnRoad(ped.x, ped.z) && Math.random() < 0.01) {
      ped.heading += Math.PI / 2;
    }
    if (Math.abs(ped.x) > 660 || Math.abs(ped.z) > 660) ped.heading += Math.PI;
    ped.mesh.position.set(ped.x, 0.95 + Math.sin(ped.phase * 6) * 0.06, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }
}
