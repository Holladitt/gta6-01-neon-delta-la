// officers.js — NDPD officers on foot: they close in when the player
// is on foot and wanted, and an arrest follows if one reaches the player.
import * as THREE from 'three';
import { RNG } from './rng.js';

export class OfficerSystem {
  constructor(scene) {
    this.scene = scene;
    this.officers = [];
    const rng = new RNG(555);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const navy = new THREE.MeshLambertMaterial({ color: 0x1d3557 });
      const skin = new THREE.MeshLambertMaterial({ color: 0xe8b48c });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.45), navy);
      body.position.y = 0.65;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), skin);
      head.position.y = 1.48;
      g.add(head);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.14, 8), navy);
      cap.position.y = 1.68;
      g.add(cap);
      g.visible = false;
      scene.add(g);
      this.officers.push({ mesh: g, x: 0, z: 0, active: false, speed: 3.2 + rng.range(0, 0.5) });
    }
    this.onArrest = null;
    this.arrestCooldown = 0;
  }

  update(dt, player, onFoot, wantedLevel) {
    if (this.arrestCooldown > 0) this.arrestCooldown -= dt;
    const want = onFoot && wantedLevel > 0 ? Math.min(4, wantedLevel + 1) : 0;
    for (let i = 0; i < this.officers.length; i++) {
      const o = this.officers[i];
      if (i < want && !o.active) {
        o.active = true;
        o.mesh.visible = true;
        const a = (i / 4) * Math.PI * 2 + 0.7;
        o.x = player.x + Math.sin(a) * 26;
        o.z = player.z + Math.cos(a) * 26;
      } else if (i >= want && o.active) {
        o.active = false;
        o.mesh.visible = false;
      }
      if (!o.active) continue;
      const dx = player.x - o.x, dz = player.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01) {
        o.x += (dx / d) * o.speed * dt;
        o.z += (dz / d) * o.speed * dt;
      }
      o.mesh.position.set(o.x, 0, o.z);
      o.mesh.rotation.y = Math.atan2(dx, -dz);
      if (d < 2.5 && this.arrestCooldown <= 0 && this.onArrest) {
        this.arrestCooldown = 5;
        this.onArrest();
      }
    }
  }
}
