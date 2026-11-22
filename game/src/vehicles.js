// vehicles.js — low-poly car models and arcade car physics (browser).
import * as THREE from 'three';

const CAR_COLORS = {
  sedan: 0xc0392b, sports: 0x2e86c1, van: 0x7d7d7d, taxi: 0xf1c40f,
  player: 0x1f8a8a, police: 0xf2f2f2,
};

// One shared "NDPD" door decal texture for police cars.
let ndpdTex = null;
function ndpdTexture() {
  if (ndpdTex) return ndpdTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#101418';
  g.fillRect(0, 0, 128, 48);
  g.fillStyle = '#f2f2f2';
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('NDPD', 64, 26);
  ndpdTex = new THREE.CanvasTexture(c);
  return ndpdTex;
}

export function makeCarMesh(kind, colorHex) {
  const group = new THREE.Group();
  const color = colorHex ?? CAR_COLORS[kind] ?? 0x888888;
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a33 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x14181c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 2.0), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 1.8), glassMat);
  cabin.position.set(-0.2, 1.35, 0);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  wheelGeo.rotateX(Math.PI / 2);
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(wx, 0.36, wz);
    group.add(w);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x665522 });
  for (const wz of [0.6, -0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.4), lightMat);
    hl.position.set(2.22, 0.7, wz);
    group.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0xaa2222, emissive: 0x440000 }));
    tl.position.set(-2.22, 0.7, wz);
    group.add(tl);
  }
  if (kind === 'police') {
    // Two-tone: black doors band + light bar + NDPD door decals.
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 2.04), new THREE.MeshLambertMaterial({ color: 0x14181c }));
    band.position.set(0, 0.62, 0);
    group.add(band);
    const decalMat = new THREE.MeshBasicMaterial({ map: ndpdTexture() });
    for (const side of [1, -1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55), decalMat);
      decal.position.set(0, 0.66, side * 1.03);
      if (side < 0) decal.rotation.y = Math.PI;
      group.add(decal);
    }
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 1.4), darkMat);
    barBase.position.set(-0.2, 1.78, 0);
    group.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.6), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    red.position.set(-0.2, 1.86, 0.36);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.6), new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
    blue.position.set(-0.2, 1.86, -0.36);
    group.add(blue);
  }
  return group;
}

// Arcade car physics with a light drift feel. Position is the ground
// point; heading 0 faces -z (north), turning clockwise.
export class Car {
  constructor(x, z, heading, kind, colorHex) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.slide = 0; // lateral drift velocity
    this.health = 100;
    this.kind = kind;
    this.color = colorHex;
    this.mesh = makeCarMesh(kind, colorHex);
    this.collideCooldown = 0;
    this.onCollide = null;
  }

  get dirX() { return Math.sin(this.heading); }
  get dirZ() { return -Math.cos(this.heading); }

  update(dt, input, colliders) {
    const fwd = input.forward ? 1 : 0;
    const back = input.back ? 1 : 0;
    if (fwd) this.speed += 14 * dt;
    if (back) this.speed -= this.speed > 0.5 ? 26 * dt : 12 * dt;
    if (!fwd && !back) this.speed -= this.speed * 0.9 * dt;
    const maxF = 38, maxR = -10;
    this.speed = Math.max(maxR, Math.min(maxF, this.speed));
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const turnAuthority = Math.min(1, Math.abs(this.speed) / 8);
    let turnRate = 1.9 * turnAuthority * (this.speed < 0 ? -1 : 1);
    if (input.handbrake && Math.abs(this.speed) > 10) {
      turnRate *= 1.7;
      this.slide += steer * 6 * dt;
    }
    this.heading += steer * turnRate * dt;
    this.slide *= Math.max(0, 1 - 3.2 * dt);
    this.slide = Math.max(-6, Math.min(6, this.slide));
    const nx = this.x + (this.dirX * this.speed + Math.cos(this.heading) * this.slide) * dt;
    const nz = this.z + (this.dirZ * this.speed - Math.sin(this.heading) * this.slide) * dt;
    // Circle vs AABB collision.
    let hit = null;
    for (const c of colliders) {
      const cx = Math.max(c.x0, Math.min(nx, c.x1));
      const cz = Math.max(c.z0, Math.min(nz, c.z1));
      const dx = nx - cx, dz = nz - cz;
      if (dx * dx + dz * dz < 1.7 * 1.7) { hit = { impact: Math.abs(this.speed) }; break; }
    }
    if (hit) {
      if (this.collideCooldown <= 0 && this.onCollide) this.onCollide(hit.impact);
      this.collideCooldown = 0.5;
      this.speed *= -0.25;
      this.slide *= 0.4;
    } else {
      this.x = nx;
      this.z = nz;
    }
    if (this.collideCooldown > 0) this.collideCooldown -= dt;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }
}
