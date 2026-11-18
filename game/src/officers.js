// Officers: NDPD foot officers who dismount from patrol cars at wanted 2+
// and exchange fire with the player on foot. Muzzle flash + tracer + gunshot
// sound; officers can be shot down (raises heat). All original content.
import * as THREE from '../vendor/three.module.min.js';
import { buildHuman } from './characters.js';
import { pick } from './rng.js';

const OFFICER_SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa06a3a];
const OFFICER_SHIRT = 0x1a2a4a; // dark navy NDPD uniform (no NPC wears it)
const OFFICER_PANTS = 0x1a1a2e;
const OFFICER_CAP = 0x1a2a4a;

export class Officers {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio || null;
    this.list = []; // {group, parts, x, z, heading, health, fireT, flash, flashT}
    this.spawnT = 0;
    this.shotsFired = 0;
    this.tracers = [];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0 }));
      scene.add(line);
      this.tracers.push({ line, t: 0 });
    }
  }
  maxFor(wanted) { return wanted >= 2 ? Math.min(wanted, 3) : 0; }
  spawn(x, z) {
    const built = buildHuman({
      skin: pick(Math.random, OFFICER_SKINS), shirt: OFFICER_SHIRT, pants: OFFICER_PANTS,
      cap: OFFICER_CAP, height: 1.82,
    });
    built.group.position.set(x, 0, z);
    this.scene.add(built.group);
    const flash = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xffd23d })
    );
    flash.visible = false;
    this.scene.add(flash);
    const o = {
      group: built.group, parts: built.parts, x, z, heading: 0,
      health: 50, fireT: 0.6 + Math.random() * 0.6, flash, flashT: 0,
    };
    this.list.push(o);
    return o;
  }
  remove(i) {
    const o = this.list[i];
    if (!o) return;
    this.scene.remove(o.group);
    this.scene.remove(o.flash);
    this.list.splice(i, 1);
  }
  clear() { while (this.list.length) this.remove(0); }
  damage(o, dmg) {
    o.health -= dmg;
    return o.health <= 0;
  }
  fireAt(o, px, pz, d, onPlayerHit) {
    this.shotsFired++;
    const gx = o.x + Math.sin(o.heading) * 0.7;
    const gz = o.z + Math.cos(o.heading) * 0.7;
    o.flash.position.set(gx, 1.5, gz);
    o.flash.visible = true;
    o.flashT = 0.07;
    const tr = this.tracers.find((t) => t.t <= 0) || this.tracers[0];
    const hit = Math.random() < (d < 20 ? 0.45 : d < 35 ? 0.3 : 0.18);
    const endX = hit ? px : px + (Math.random() - 0.5) * 6;
    const endZ = hit ? pz : pz + (Math.random() - 0.5) * 6;
    tr.line.geometry.setFromPoints([new THREE.Vector3(gx, 1.5, gz), new THREE.Vector3(endX, 1.3, endZ)]);
    tr.line.material.opacity = 0.9;
    tr.t = 0.09;
    if (this.audio) this.audio.shot('PISTOL');
    if (hit && onPlayerHit) onPlayerHit(6 + Math.random() * 4);
    return hit;
  }
  update(dt, t, px, pz, playerOnFoot, wanted, policeCars, onPlayerHit) {
    this.spawnT -= dt;
    const max = this.maxFor(wanted);
    if (playerOnFoot && wanted >= 2 && this.list.length < max && this.spawnT <= 0) {
      const near = policeCars.find((c) => Math.hypot(c.x - px, c.z - pz) < 32);
      if (near) {
        this.spawn(near.x + 3, near.z + 3);
        this.spawnT = 3;
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i];
      const d = Math.hypot(o.x - px, o.z - pz);
      if (wanted < 2 || !playerOnFoot || d > 90) { this.remove(i); continue; }
      o.heading = Math.atan2(px - o.x, pz - o.z);
      o.group.rotation.y = o.heading;
      o.parts.armR.rotation.x = -1.35; // aim the pistol forward
      o.fireT -= dt;
      if (o.fireT <= 0 && d < 45) {
        o.fireT = 1.1 + Math.random() * 0.7;
        this.fireAt(o, px, pz, d, onPlayerHit);
      }
      if (o.flashT > 0) {
        o.flashT -= dt;
        if (o.flashT <= 0) o.flash.visible = false;
      }
    }
    for (const tr of this.tracers) {
      if (tr.t > 0) { tr.t -= dt; if (tr.t <= 0) tr.line.material.opacity = 0; }
    }
  }
}
