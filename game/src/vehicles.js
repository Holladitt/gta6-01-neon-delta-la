// Vehicles: arcade driving with drift, and the boxy low-poly cars the city
// is built from. One car is a plain object with a mesh; the physics step
// moves it and resolves building collisions as a circle against boxes.

import * as THREE from '../vendor/three.module.min.js';
import { buildingAt, clampToMap, isWater, isOnPier, isInPort } from './geo.js';
import { applyCollisionDamage } from './damage.js';

export function makeCarMesh({ body = 0xff5a5f, cabin = 0x1d2733, police = false } = {}) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: body, roughness: 0.55, metalness: 0.25 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14181f, roughness: 0.8 });
  const glassMat = new THREE.MeshLambertMaterial({ color: cabin, roughness: 0.15, metalness: 0.6 });
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  bodyMesh.position.y = 0.55;
  group.add(bodyMesh);
  const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabinMesh.position.set(0, 1.1, -0.2);
  group.add(cabinMesh);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.18, 0.3), darkMat);
  bumper.position.set(0, 0.32, 2.25);
  group.add(bumper);
  const bumperR = bumper.clone();
  bumperR.position.z = -2.25;
  group.add(bumperR);
  // headlights and tail lights
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x554400, roughness: 0.3 });
  for (const sx of [-0.65, 0.65]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
    hl.position.set(sx, 0.62, 2.22);
    group.add(hl);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x440000, roughness: 0.3 });
  for (const sx of [-0.65, 0.65]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat);
    tl.position.set(sx, 0.62, -2.22);
    group.add(tl);
  }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111, roughness: 0.9 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.36, wz);
    group.add(w);
    wheels.push(w);
  }
  if (police) {
    // two-tone livery: white doors and a light bar
    const doorMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2, roughness: 0.5 });
    for (const sx of [-1.01, 1.01]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 1.6), doorMat);
      door.position.set(sx, 0.62, 0);
      group.add(door);
    }
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.3), darkMat);
    barBase.position.set(0, 1.48, -0.2);
    group.add(barBase);
    const redLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.32),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000, roughness: 0.3 }),
    );
    redLens.position.set(-0.32, 1.48, -0.2);
    group.add(redLens);
    const blueLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.32),
      new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: 0x0022aa, roughness: 0.3 }),
    );
    blueLens.position.set(0.32, 1.48, -0.2);
    group.add(blueLens);
    group.userData.redLens = redLens;
    group.userData.blueLens = blueLens;
  }
  group.userData.wheels = wheels;
  return group;
}

export function createVehicle({ x = 0, z = 0, heading = 0, body = 0xff5a5f, police = false, kind = 'sedan' } = {}) {
  const mesh = makeCarMesh({ body, police });
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  return {
    x, z, heading,
    speed: 0,
    steer: 0,
    health: 100,
    kind,
    police,
    mesh,
    damageCooldown: 0,
    onGround: true,
  };
}

// Arcade step: throttle accelerates, brake reverses, handbrake breaks grip
// and slides the tail out. Buildings stop the car with a damage hit.
export function stepVehicle(car, input, dt) {
  const accel = 22;
  const brake = 30;
  const maxSpeed = 42;
  const maxReverse = 12;
  const grip = input.handbrake ? 1.6 : 5.2;
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const steerSpeed = 2.4;
  car.steer += (steerTarget - car.steer) * Math.min(1, steerSpeed * dt);
  if (input.throttle) car.speed += accel * dt;
  if (input.brake) {
    if (car.speed > 0.5) car.speed -= brake * dt;
    else car.speed -= accel * 0.5 * dt;
  }
  car.speed = Math.max(-maxReverse, Math.min(maxSpeed, car.speed));
  // drag and rolling resistance
  car.speed -= car.speed * 0.55 * dt;
  if (!input.throttle && !input.brake) car.speed -= car.speed * 0.8 * dt;
  const turnRate = car.steer * (car.speed >= 0 ? 1 : -1) * (1.9 - Math.min(0.9, Math.abs(car.speed) / 60));
  car.heading += turnRate * (Math.abs(car.speed) / 12) * dt * (input.handbrake ? 1.7 : 1);
  const forwardX = Math.sin(car.heading);
  const forwardZ = Math.cos(car.heading);
  let nx = car.x + forwardX * car.speed * dt;
  let nz = car.z + forwardZ * car.speed * dt;
  if (input.handbrake) {
    // slide sideways a little while the tail steps out
    nx += Math.cos(car.heading) * car.steer * car.speed * 0.35 * dt;
    nz -= Math.sin(car.heading) * car.steer * car.speed * 0.35 * dt;
  }
  const impact = Math.abs(car.speed);
  const blocked = isWater(nx, nz) && !isOnPier(nx, nz) && !isInPort(nx, nz);
  const building = buildingAt(nx, nz);
  const clamped = clampToMap(nx, nz);
  if (blocked || building || clamped.x !== nx || clamped.z !== nz) {
    if (car.damageCooldown <= 0 && impact >= 5) {
      car.health = applyCollisionDamage(car.health, impact);
      car.damageCooldown = 0.5;
    }
    car.speed *= -0.25;
    nx = car.x;
    nz = car.z;
  }
  car.x = nx;
  car.z = nz;
  car.damageCooldown = Math.max(0, car.damageCooldown - dt);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // wheels spin with speed, front wheels steer
  const spin = car.speed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  return car;
}
