// The NDPD: patrol cars that chase, flank with A* routes, and scripted
// intercept cars, plus the helicopter that only flies at wanted 3 and above.
// The heli carries a beam that starts narrow at the rotor and widens down
// until it lands exactly on the car.

import * as THREE from '../vendor/three.module.min.js';
import { createVehicle, makeCarMesh } from './vehicles.js';
import { findPath } from './astar.js';
import { isBlocked } from './geo.js';
import { WANTED } from './wanted.js';
import { CALLSIGNS } from './config.js';

export function createPolice(scene) {
  const heliGroup = new THREE.Group();
  const heliBody = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.4, 6.5),
    new THREE.MeshLambertMaterial({ color: 0x1d3a5f, roughness: 0.5, metalness: 0.3 }),
  );
  heliBody.position.y = 0;
  heliGroup.add(heliBody);
  const heliTail = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 4.5),
    new THREE.MeshLambertMaterial({ color: 0x1d3a5f, roughness: 0.5 }),
  );
  heliTail.position.set(0, 0.3, -5);
  heliGroup.add(heliTail);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x111111, roughness: 0.7 }),
  );
  rotor.position.y = 1.1;
  heliGroup.add(rotor);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 4.0, 1, 12, 1, true), beamMat);
  heliGroup.add(beam);
  const discMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), discMat);
  disc.rotation.x = -Math.PI / 2;
  scene.add(disc);
  scene.add(heliGroup);
  return {
    cars: [],
    heli: {
      group: heliGroup,
      beam,
      disc,
      rotor,
      x: 0,
      z: 0,
      y: 60,
      angle: 0,
      active: false,
    },
  };
}

function spawnCar(scene, x, z, script, index) {
  const car = createVehicle({
    x,
    z,
    heading: Math.atan2(-x, -z),
    body: 0x1d3a5f,
    police: true,
    kind: 'police',
  });
  car.callsign = CALLSIGNS[index % CALLSIGNS.length];
  car.script = script;
  car.path = null;
  car.pathIndex = 0;
  car.repath = 0;
  scene.add(car.mesh);
  return car;
}

export function syncPolice(police, scene, px, pz, wanted, dt, time) {
  const wantCars = WANTED.policeFor(wanted);
  while (police.cars.length < wantCars) {
    const i = police.cars.length;
    const angle = (i / Math.max(1, wantCars)) * Math.PI * 2 + time * 0.1;
    const car = spawnCar(scene, px + Math.sin(angle) * 60, pz + Math.cos(angle) * 60, i === wantCars - 1 && wanted >= 4, i);
    police.cars.push(car);
  }
  while (police.cars.length > wantCars) {
    const car = police.cars.pop();
    scene.remove(car.mesh);
  }
  const wantHeli = WANTED.heliFor(wanted);
  police.heli.active = wantHeli === 1;
  police.heli.group.visible = police.heli.active;
  police.heli.disc.visible = police.heli.active;
  police.heli.beam.visible = police.heli.active;

  for (const car of police.cars) {
    car.repath -= dt;
    if (car.repath <= 0) {
      car.repath = 1.5;
      car.path = findPath(car.x, car.z, px, pz, isBlocked, 10, 60);
      car.pathIndex = 0;
    }
    let tx = px;
    let tz = pz;
    if (car.path && car.path.length > 1) {
      const wp = car.path[Math.min(car.pathIndex, car.path.length - 1)];
      tx = wp[0];
      tz = wp[1];
      if (Math.hypot(tx - car.x, tz - car.z) < 8) car.pathIndex += 1;
    }
    const dx = tx - car.x;
    const dz = tz - car.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
    const speed = car.script ? 30 : 26;
    const gap = dist < 14 ? 0.4 : 1;
    car.x += Math.sin(car.heading) * speed * gap * dt;
    car.z += Math.cos(car.heading) * speed * gap * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    // light bar strobes
    const on = Math.floor(time * 6) % 2 === 0;
    if (car.mesh.userData.redLens) {
      car.mesh.userData.redLens.material.emissive.setHex(on ? 0xff0000 : 0x220000);
      car.mesh.userData.blueLens.material.emissive.setHex(on ? 0x000022 : 0x0022ff);
    }
  }

  if (police.heli.active) {
    const h = police.heli;
    h.angle += dt * 0.35;
    const radius = 26;
    h.x = px + Math.sin(h.angle) * radius;
    h.z = pz + Math.cos(h.angle) * radius;
    h.y = 55 + Math.sin(time * 0.7) * 2;
    h.group.position.set(h.x, h.y, h.z);
    h.group.rotation.y = -h.angle;
    h.rotor.rotation.y += dt * 22;
    // beam: narrow at the rotor, widening down to the car
    const len = Math.hypot(h.x - px, h.y, h.z - pz);
    const midX = (h.x + px) / 2;
    const midY = h.y / 2;
    const midZ = (h.z + pz) / 2;
    h.beam.scale.set(1, len, 1);
    h.beam.position.set(midX - h.x, midY - h.y, midZ - h.z);
    h.beam.lookAt(px - h.x, 0 - h.y, pz - h.z);
    h.beam.rotateX(Math.PI / 2);
    h.disc.position.set(px, 0.08, pz);
  }
}

export function heliBeamState(police, px, pz) {
  const h = police.heli;
  if (!h.active) return null;
  const len = Math.hypot(h.x - px, h.y, h.z - pz);
  return {
    disc: [px, pz],
    len,
    mid: [(h.x + px) / 2, h.y / 2, (h.z + pz) / 2],
  };
}
