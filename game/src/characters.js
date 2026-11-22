// characters.js — pedestrians: 104 walkers on the sidewalks (browser).
// Two InstancedMeshes (bodies + heads) keep the whole crowd at 2 draw calls.
import * as THREE from 'three';
import { RNG } from './rng.js';

const PED_COUNT = 104;

export class PedSystem {
  constructor(scene) {
    this.scene = scene;
    this.peds = [];
    const bodyGeo = new THREE.BoxGeometry(0.7, 1.1, 0.42);
    const headGeo = new THREE.SphereGeometry(0.26, 8, 6);
    this.bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.headMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.bodies = new THREE.InstancedMesh(bodyGeo, this.bodyMat, PED_COUNT);
    this.heads = new THREE.InstancedMesh(headGeo, this.headMat, PED_COUNT);
    this.bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.bodies);
    scene.add(this.heads);
    this.dummy = new THREE.Object3D();
    this.colors = new THREE.Color();
    const rng = new RNG(99);
    const shirtPalette = [0xd94f3d, 0x3d7dd9, 0x3dd97a, 0xd9c23d, 0x8a4fd9, 0xe0e0e0, 0x222831, 0xff8a3d];
    const skinPalette = [0xe8b48c, 0xc98d5f, 0x8a5a34, 0xf0c8a0];
    for (let i = 0; i < PED_COUNT; i++) {
      // Walk a straight sidewalk segment, back and forth.
      const bx = Math.round(rng.range(-5, 5)) * 150;
      const bz = Math.round(rng.range(-5, 5)) * 150;
      const alongX = rng.chance(0.5);
      const off = rng.range(-60, 60);
      const a = -66, b = 66;
      const seg = alongX
        ? { ax: bx + a, az: bz + 75 + off * 0.1, bx2: bx + b, bz2: bz + 75 + off * 0.1 }
        : { ax: bx + 75 + off * 0.1, az: bz + a, bx2: bx + 75 + off * 0.1, bz2: bz + b };
      this.peds.push({
        seg, t: rng.next(), dir: rng.chance(0.5) ? 1 : -1,
        speed: rng.range(0.9, 1.9), phase: rng.next() * Math.PI * 2,
        shirt: shirtPalette[rng.int(0, shirtPalette.length - 1)],
        skin: skinPalette[rng.int(0, skinPalette.length - 1)],
      });
      this.bodies.setColorAt(i, this.colors.setHex(this.peds[i].shirt));
      this.heads.setColorAt(i, this.colors.setHex(this.peds[i].skin));
    }
    this.bodies.instanceColor.needsUpdate = true;
    this.heads.instanceColor.needsUpdate = true;
  }

  update(dt, time) {
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      const len = Math.hypot(p.seg.bx2 - p.seg.ax, p.seg.bz2 - p.seg.az);
      p.t += (p.dir * p.speed * dt) / len;
      if (p.t >= 1) { p.t = 1; p.dir = -1; }
      if (p.t <= 0) { p.t = 0; p.dir = 1; }
      const x = p.seg.ax + (p.seg.bx2 - p.seg.ax) * p.t;
      const z = p.seg.az + (p.seg.bz2 - p.seg.az) * p.t;
      const heading = Math.atan2((p.seg.bx2 - p.seg.ax) * p.dir, -(p.seg.bz2 - p.seg.az) * p.dir);
      const bob = Math.abs(Math.sin(time * 6 + p.phase)) * 0.06;
      this.dummy.position.set(x, 0.62 + bob, z);
      this.dummy.rotation.set(0, heading, 0);
      this.dummy.updateMatrix();
      this.bodies.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(x, 1.45 + bob, z);
      this.dummy.updateMatrix();
      this.heads.setMatrixAt(i, this.dummy.matrix);
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
  }
}
