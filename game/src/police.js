// police.js — NDPD pursuit: police cars flank via A*, helicopter + beam (browser).
import * as THREE from 'three';
import { makeCarMesh } from './vehicles.js';
import { buildGraph, findPath } from './astar.js';
import { nearestNode } from './geo.js';
import { WANTED } from './wanted.js';

export class PoliceSystem {
  constructor(scene) {
    this.scene = scene;
    this.graph = buildGraph();
    this.cars = [];
    for (let i = 0; i < 5; i++) {
      const mesh = makeCarMesh('police');
      mesh.visible = false;
      scene.add(mesh);
      this.cars.push({ mesh, x: 0, z: 0, heading: 0, speed: 0, path: [], pathIndex: 0, repath: 0, scripted: false, active: false });
    }
    // Helicopter: body, tail, rotor.
    this.heli = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a2a33 });
    const white = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 2.2), white);
    this.heli.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 0.7), dark);
    tail.position.set(-3.6, 0.4, 0);
    this.heli.add(tail);
    const rotorGeo = new THREE.BoxGeometry(9, 0.1, 0.5);
    this.rotor = new THREE.Mesh(rotorGeo, dark);
    this.rotor.position.y = 1.1;
    this.heli.add(this.rotor);
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    for (const sz of [0.9, -0.9]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.12), skidMat);
      skid.position.set(0, -1.0, sz);
      this.heli.add(skid);
    }
    this.heli.visible = false;
    scene.add(this.heli);
    this.heliPos = { x: 0, y: 42, z: 0 };
    this.heliActive = false;
    // Spotlight beam: a cone, apex at the heli, wide disc on the car.
    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(6, 1, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.beam.visible = false;
    scene.add(this.beam);
    this.disc = new THREE.Mesh(
      new THREE.CircleGeometry(6, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.disc.rotation.x = -Math.PI / 2;
    this.disc.position.y = 0.15;
    this.disc.visible = false;
    scene.add(this.disc);
    this.beamData = null;
    this.onRam = null;
  }

  get activeCars() {
    return this.cars.filter((c) => c.active);
  }

  update(dt, player, wantedLevel, time) {
    const want = WANTED.policeFor(wantedLevel);
    // Spawn / despawn cars.
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (i < want && !c.active) {
        c.active = true;
        c.mesh.visible = true;
        const node = nearestNode(player.x + (i % 2 === 0 ? 150 : -150), player.z + (i < 2 ? 150 : -150));
        c.x = node[0];
        c.z = node[1];
        c.heading = 0;
        c.speed = 0;
        c.path = [];
        c.pathIndex = 0;
        c.repath = 0;
        c.scripted = i === 2 && wantedLevel >= 4;
      } else if (i >= want && c.active) {
        c.active = false;
        c.mesh.visible = false;
      }
    }
    // Chase.
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (!c.active) continue;
      c.repath -= dt;
      const distToPlayer = Math.hypot(player.x - c.x, player.z - c.z);
      if (c.repath <= 0 || c.pathIndex >= c.path.length) {
        c.repath = 2;
        let target;
        if (c.scripted) {
          target = [player.x + 300, player.z - 150];
        } else if (i % 2 === 0) {
          // FLANKING: a node ahead of the player's heading.
          const fx = player.x + Math.sin(player.heading) * 220;
          const fz = player.z - Math.cos(player.heading) * 220;
          target = nearestNode(fx, fz);
        } else {
          target = nearestNode(player.x, player.z);
        }
        const path = findPath(this.graph, [c.x, c.z], target);
        c.path = path || [];
        c.pathIndex = 0;
      }
      // Drive toward the next waypoint (or straight at the player if close).
      let tx, tz;
      if (distToPlayer < 14) {
        tx = player.x;
        tz = player.z;
      } else if (c.path.length && c.pathIndex < c.path.length) {
        [tx, tz] = c.path[c.pathIndex];
        if (Math.hypot(tx - c.x, tz - c.z) < 8) c.pathIndex++;
      } else {
        tx = player.x;
        tz = player.z;
      }
      const wantHeading = Math.atan2(tx - c.x, -(tz - c.z));
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const targetSpeed = distToPlayer < 6 ? 6 : 17;
      c.speed += (targetSpeed - c.speed) * Math.min(1, 1.6 * dt);
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += -Math.cos(c.heading) * c.speed * dt;
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      // Ram: close enough to the player's car to hit it.
      if (distToPlayer < 4 && player.inCar && this.onRam) this.onRam(9);
    }
    // Helicopter.
    const wantHeli = WANTED.heliFor(wantedLevel) === 1;
    this.heliActive = wantHeli;
    this.heli.visible = wantHeli;
    this.beam.visible = wantHeli;
    this.disc.visible = wantHeli;
    if (wantHeli) {
      const tx = player.x - 18;
      const tz = player.z - 24;
      this.heliPos.x += (tx - this.heliPos.x) * Math.min(1, 1.2 * dt);
      this.heliPos.z += (tz - this.heliPos.z) * Math.min(1, 1.2 * dt);
      this.heliPos.y = 42;
      this.heli.position.set(this.heliPos.x, this.heliPos.y, this.heliPos.z);
      this.heli.rotation.y = Math.atan2(player.x - this.heliPos.x, -(player.z - this.heliPos.z));
      this.rotor.rotation.y += dt * 22;
      // Beam: apex at the heli, wide base on the car.
      const px = player.x, pz = player.z;
      const dx = this.heliPos.x - px, dy = this.heliPos.y, dz = this.heliPos.z - pz;
      const len = Math.hypot(dx, dy, dz);
      const midX = (this.heliPos.x + px) / 2, midY = this.heliPos.y / 2, midZ = (this.heliPos.z + pz) / 2;
      this.beam.position.set(midX, midY, midZ);
      this.beam.scale.set(1, len, 1);
      this.beam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(dx / len, dy / len, dz / len)
      );
      this.disc.position.set(px, 0.15, pz);
      this.beamData = { disc: [px, pz], len, mid: [midX, midY, midZ] };
    } else {
      this.beamData = null;
    }
  }
}
