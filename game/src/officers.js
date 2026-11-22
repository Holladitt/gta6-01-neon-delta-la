// Police officers on foot. They step out when the heat is on and close on
// Mara; if one gets close enough while she is out of the car, the arrest
// meter starts.

import * as THREE from '../vendor/three.module.min.js';
import { makeRng } from './rng.js';

export function createOfficers(scene) {
  const rng = makeRng(4242);
  const geo = new THREE.CapsuleGeometry(0.38, 1.0, 3, 6);
  const mat = new THREE.MeshLambertMaterial({ color: 0x1d3a5f, roughness: 0.7 });
  const list = [];
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    const off = {
      mesh,
      x: rng.range(-200, 200),
      z: rng.range(-200, 200),
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(2.2, 3.2),
      active: false,
    };
    mesh.position.set(off.x, 1.0, off.z);
    mesh.visible = false;
    scene.add(mesh);
    list.push(off);
  }
  return list;
}

export function updateOfficers(officers, px, pz, wanted, dt) {
  const want = Math.min(officers.length, wanted);
  officers.forEach((off, i) => {
    off.active = i < want;
    off.mesh.visible = off.active;
    if (!off.active) return;
    const dx = px - off.x;
    const dz = pz - off.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 120) {
      off.x = px + dx / dist * 90;
      off.z = pz + dz / dist * 90;
    }
    off.heading = Math.atan2(dx, dz);
    off.x += Math.sin(off.heading) * off.speed * dt;
    off.z += Math.cos(off.heading) * off.speed * dt;
    off.mesh.position.set(off.x, 1.0, off.z);
    off.mesh.rotation.y = off.heading;
  });
}

export function nearestOfficerDist(officers, px, pz) {
  let best = Infinity;
  for (const off of officers) {
    if (!off.active) continue;
    best = Math.min(best, Math.hypot(off.x - px, off.z - pz));
  }
  return best;
}
