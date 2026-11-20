// Vehicles: five distinct classes + police, each with its own shape and details
// (grille, headlights, rims, windows, two-tone paint) + arcade physics.
import * as THREE from '../vendor/three.module.min.js';
import { VEHICLE_DEFS } from './config.js';
import { policeDoorTexture } from './geo.js';
import { applyCollisionDamage, DAMAGE_MIN_IMPACT, DAMAGE_COOLDOWN_S } from './damage.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
// v13: cabin glass was near-black (0x1d2733) and read as a solid black box
// on the car roof from the 3/4 rear chase angle, day and night. Slate blue
// with a faint emissive so it reads as glass, never pitch black.
const glassMat = new THREE.MeshLambertMaterial({ color: 0x4a6a8a, emissive: 0x2c4a66, emissiveIntensity: 1.0 });
const tireMat = lam(0x141414);
const hubMat = lam(0xcccccc);
const chromeMat = lam(0xdddddd);
const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0xffe9a0, emissiveIntensity: 0.25 });
const tailMat = new THREE.MeshLambertMaterial({ color: 0xaa1111, emissive: 0xcc2222, emissiveIntensity: 0.4 });

function box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function wheel(x, y, z, r) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 12), tireMat);
  tire.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.34, 8), hubMat);
  hub.rotation.z = Math.PI / 2;
  g.add(tire, hub);
  return g;
}

// Builders return {group, wheels:[frontL,frontR,rearL,rearR], steer:[frontL,frontR], lights, lightBar}
function buildSedan(color, twoTone) {
  const g = new THREE.Group();
  const body = lam(color);
  g.add(box(4.6, 0.75, 2.0, 0, 0.62, 0, body));
  g.add(box(2.4, 0.62, 1.8, -0.2, 1.28, 0, glassMat)); // cabin
  g.add(box(2.2, 0.1, 1.7, -0.2, 1.62, 0, twoTone || color)); // roof
  g.add(box(0.5, 0.4, 1.9, 2.28, 0.55, 0, chromeMat)); // grille + bumper
  g.add(box(0.3, 0.28, 1.7, -2.32, 0.55, 0, chromeMat));
  g.add(box(0.2, 0.22, 0.4, 2.32, 0.75, 0.65, lightMat));
  g.add(box(0.2, 0.22, 0.4, 2.32, 0.75, -0.65, lightMat));
  g.add(box(0.2, 0.22, 0.4, -2.36, 0.75, 0.65, tailMat));
  g.add(box(0.2, 0.22, 0.4, -2.36, 0.75, -0.65, tailMat));
  const wheels = [wheel(1.5, 0.42, 0.95, 0.42), wheel(1.5, 0.42, -0.95, 0.42), wheel(-1.5, 0.42, 0.95, 0.42), wheel(-1.5, 0.42, -0.95, 0.42)];
  wheels.forEach((w) => g.add(w));
  return { group: g, wheels, steer: [wheels[0], wheels[1]], lights: lightMat };
}
function buildSUV(color) {
  const g = new THREE.Group();
  const body = lam(color);
  g.add(box(5.0, 1.0, 2.2, 0, 0.75, 0, body));
  g.add(box(3.2, 0.85, 2.0, -0.2, 1.65, 0, glassMat));
  g.add(box(3.0, 0.12, 1.9, -0.2, 2.1, 0, color));
  g.add(box(3.0, 0.12, 0.3, -0.2, 2.18, 0.8, chromeMat)); // roof rail
  g.add(box(3.0, 0.12, 0.3, -0.2, 2.18, -0.8, chromeMat));
  g.add(box(0.5, 0.45, 2.1, 2.5, 0.7, 0, chromeMat));
  g.add(box(0.2, 0.26, 0.45, 2.54, 0.95, 0.7, lightMat));
  g.add(box(0.2, 0.26, 0.45, 2.54, 0.95, -0.7, lightMat));
  g.add(box(0.2, 0.26, 0.45, -2.54, 0.95, 0.7, tailMat));
  g.add(box(0.2, 0.26, 0.45, -2.54, 0.95, -0.7, tailMat));
  const wheels = [wheel(1.6, 0.52, 1.05, 0.52), wheel(1.6, 0.52, -1.05, 0.52), wheel(-1.6, 0.52, 1.05, 0.52), wheel(-1.6, 0.52, -1.05, 0.52)];
  wheels.forEach((w) => g.add(w));
  return { group: g, wheels, steer: [wheels[0], wheels[1]], lights: lightMat };
}
function buildPickup(color, twoTone) {
  const g = new THREE.Group();
  const body = lam(color);
  g.add(box(5.2, 0.8, 2.1, 0, 0.65, 0, body));
  g.add(box(2.0, 0.7, 1.9, 0.9, 1.35, 0, glassMat)); // cab
  g.add(box(1.9, 0.1, 1.8, 0.9, 1.72, 0, twoTone || color));
  // open bed: floor + walls (hollow)
  g.add(box(2.4, 0.15, 1.9, -1.5, 0.85, 0, lam(0x2a2a2a)));
  g.add(box(2.4, 0.55, 0.15, -1.5, 1.15, 0.95, body));
  g.add(box(2.4, 0.55, 0.15, -1.5, 1.15, -0.95, body));
  g.add(box(0.15, 0.55, 1.9, -2.7, 1.15, 0, body));
  // square grille with bars + round headlights
  g.add(box(0.25, 0.5, 1.6, 2.62, 0.7, 0, chromeMat));
  for (const dy of [-0.12, 0.12]) g.add(box(0.28, 0.08, 1.5, 2.62, 0.7 + dy, 0, lam(0x333333)));
  for (const dz of [0.6, -0.6]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), lightMat);
    hl.rotation.z = Math.PI / 2;
    hl.position.set(2.64, 0.75, dz);
    g.add(hl);
  }
  g.add(box(0.3, 0.3, 2.0, -2.72, 0.5, 0, chromeMat));
  const wheels = [wheel(1.7, 0.5, 1.0, 0.5), wheel(1.7, 0.5, -1.0, 0.5), wheel(-1.7, 0.5, 1.0, 0.5), wheel(-1.7, 0.5, -1.0, 0.5)];
  wheels.forEach((w) => g.add(w));
  return { group: g, wheels, steer: [wheels[0], wheels[1]], lights: lightMat };
}
function buildSport(color, stripe) {
  const g = new THREE.Group();
  const body = lam(color);
  g.add(box(4.4, 0.55, 2.0, 0, 0.55, 0, body)); // low body
  g.add(box(2.0, 0.5, 1.7, -0.3, 1.05, 0, glassMat));
  g.add(box(1.9, 0.08, 1.6, -0.3, 1.32, 0, color));
  // racing stripe over hood + roof
  g.add(box(4.2, 0.04, 0.5, 0, 0.84, 0, lam(stripe || 0xf4f4f0)));
  // spoiler
  g.add(box(0.12, 0.35, 1.9, -2.15, 1.0, 0, lam(0x1a1a1a)));
  g.add(box(0.5, 0.08, 1.9, -2.2, 1.2, 0, lam(0x1a1a1a)));
  // side skirts + grille
  g.add(box(4.0, 0.15, 0.1, 0, 0.32, 1.02, lam(0x1a1a1a)));
  g.add(box(4.0, 0.15, 0.1, 0, 0.32, -1.02, lam(0x1a1a1a)));
  g.add(box(0.3, 0.3, 1.8, 2.2, 0.5, 0, lam(0x1a1a1a)));
  g.add(box(0.18, 0.18, 0.45, 2.24, 0.62, 0.6, lightMat));
  g.add(box(0.18, 0.18, 0.45, 2.24, 0.62, -0.6, lightMat));
  g.add(box(0.18, 0.18, 0.45, -2.24, 0.62, 0.6, tailMat));
  g.add(box(0.18, 0.18, 0.45, -2.24, 0.62, -0.6, tailMat));
  const wheels = [wheel(1.45, 0.4, 0.95, 0.4), wheel(1.45, 0.4, -0.95, 0.4), wheel(-1.45, 0.4, 0.95, 0.4), wheel(-1.45, 0.4, -0.95, 0.4)];
  wheels.forEach((w) => g.add(w));
  return { group: g, wheels, steer: [wheels[0], wheels[1]], lights: lightMat };
}
function buildBike(color) {
  const g = new THREE.Group();
  const body = lam(color);
  const mkWheel = (x) => {
    const w = new THREE.Group();
    w.position.set(x, 0.35, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 8, 16), tireMat);
    tire.rotation.y = Math.PI / 2;
    w.add(tire);
    return w;
  };
  const wF = mkWheel(0.85), wR = mkWheel(-0.85);
  g.add(wF, wR);
  g.add(box(1.5, 0.12, 0.12, 0, 0.62, 0, lam(0x333333))); // frame
  g.add(box(0.5, 0.35, 0.5, 0.15, 0.75, 0, body)); // tank
  g.add(box(0.55, 0.12, 0.4, -0.55, 0.78, 0, lam(0x1a1a1a))); // seat
  g.add(box(0.1, 0.1, 0.7, 0.95, 0.95, 0, chromeMat)); // handlebar
  const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 8), lightMat);
  hl.rotation.z = Math.PI / 2;
  hl.position.set(1.0, 0.7, 0);
  g.add(hl);
  return { group: g, wheels: [wF, wR], steer: [wF], lights: lightMat };
}
function buildPolice() {
  const g = new THREE.Group();
  const black = lam(0x141414);
  g.add(box(4.8, 0.75, 2.1, 0, 0.62, 0, black));
  g.add(box(2.4, 0.62, 1.9, -0.2, 1.28, 0, glassMat));
  g.add(box(2.2, 0.1, 1.8, -0.2, 1.62, 0, lam(0xf4f4f0))); // white roof
  // white doors with NDPD texture — wide planes so the livery reads at
  // chase distance, not just in close-up.
  const doorTex = policeDoorTexture();
  const doorMat = new THREE.MeshLambertMaterial({ map: doorTex });
  for (const dz of [1.06, -1.06]) {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.85), doorMat);
    door.position.set(0.1, 0.65, dz);
    if (dz < 0) door.rotation.y = Math.PI;
    g.add(door);
  }
  // light bar (flashing red/blue)
  const barBase = box(0.5, 0.14, 1.2, -0.2, 1.72, 0, lam(0x1a1a1a));
  g.add(barBase);
  const redMat = new THREE.MeshLambertMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 0 });
  const blueMat = new THREE.MeshLambertMaterial({ color: 0x000055, emissive: 0x2244ff, emissiveIntensity: 0 });
  const red = box(0.44, 0.22, 0.55, -0.2, 1.85, 0.3, redMat);
  const blue = box(0.44, 0.22, 0.55, -0.2, 1.85, -0.3, blueMat);
  g.add(red, blue);
  g.add(box(0.4, 0.5, 2.0, 2.42, 0.55, 0, lam(0x333333))); // push bumper
  g.add(box(0.2, 0.22, 0.4, 2.44, 0.75, 0.65, lightMat));
  g.add(box(0.2, 0.22, 0.4, 2.44, 0.75, -0.65, lightMat));
  g.add(box(0.2, 0.22, 0.4, -2.44, 0.75, 0.65, tailMat));
  g.add(box(0.2, 0.22, 0.4, -2.44, 0.75, -0.65, tailMat));
  const wheels = [wheel(1.55, 0.44, 1.0, 0.44), wheel(1.55, 0.44, -1.0, 0.44), wheel(-1.55, 0.44, 1.0, 0.44), wheel(-1.55, 0.44, -1.0, 0.44)];
  wheels.forEach((w) => g.add(w));
  return { group: g, wheels, steer: [wheels[0], wheels[1]], lights: lightMat, lightBar: { red: redMat, blue: blueMat } };
}

export const BUILDERS = { sedan: buildSedan, suv: buildSUV, pickup: buildPickup, sport: buildSport, bike: buildBike, police: buildPolice };

export function createVehicle(kind, x, z, heading, color) {
  const def = VEHICLE_DEFS[kind];
  const built = BUILDERS[kind](color ?? 0xcccccc, kind === 'sport' ? 0xf4f4f0 : 0xdddddd);
  built.group.position.set(x, 0, z);
  built.group.rotation.y = heading;
  return {
    kind, def, x, z, heading, speed: 0, steer: 0,
    vx: 0, vz: 0, health: 100, dmgCd: 0, ...built,
  };
}

// Arcade physics: forward speed + lateral slide (handbrake kills grip).
// opts.damage (player car only): a hard wall hit damages the car — this is
// the real damage source that makes FIELD REPAIR reachable (QA v12 MAJOR:
// no code path ever damaged the player car, so repair always answered
// "already in top shape"). Police/traffic cars pass no opts: their health
// stays governed by gunfire only, as before.
export function updateVehicle(v, input, dt, colliders, opts) {
  const d = v.def;
  const grip = input.handbrake ? 2.2 : d.grip;
  const target = input.throttle * (input.throttle >= 0 ? d.top : d.reverse);
  if (input.throttle !== 0) v.speed += Math.sign(target - v.speed) * d.accel * dt;
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), d.brake * 0.5 * dt);
  if (Math.abs(v.speed) < 0.05 && input.throttle === 0) v.speed = 0;
  v.speed = Math.max(-d.reverse, Math.min(d.top, v.speed));
  v.heading += input.steer * d.turn * (v.speed / d.top) * dt * (input.handbrake ? 1.7 : 1);
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
  const fwd = v.vx * fx + v.vz * fz;
  const latX = v.vx - fwd * fx, latZ = v.vz - fwd * fz;
  const decay = Math.exp(-grip * dt);
  v.vx = fwd * fx + latX * decay + (v.speed - fwd) * fx * Math.min(1, 8 * dt);
  v.vz = fwd * fz + latZ * decay + (v.speed - fwd) * fz * Math.min(1, 8 * dt);
  v.x += v.vx * dt;
  v.z += v.vz * dt;
  // world bounds + building collision (circle vs AABB)
  v.x = Math.max(-795, Math.min(795, v.x));
  v.z = Math.max(-795, Math.min(795, v.z));
  const r = d.len / 2;
  v.dmgCd = Math.max(0, (v.dmgCd || 0) - dt);
  for (const c of colliders) {
    const cx = Math.max(c.x0, Math.min(v.x, c.x1));
    const cz = Math.max(c.z0, Math.min(v.z, c.z1));
    const dx = v.x - cx, dz = v.z - cz;
    const dd = Math.hypot(dx, dz);
    if (dd < r && dd > 0.001) {
      v.x = cx + (dx / dd) * r;
      v.z = cz + (dz / dd) * r;
      const vn = (v.vx * dx + v.vz * dz) / dd;
      if (vn < 0) {
        v.vx -= vn * dx / dd; v.vz -= vn * dz / dd; v.speed *= 0.6;
        // Hard hit into the wall: real damage (player car only).
        const impact = -vn;
        if (opts && opts.damage && impact >= DAMAGE_MIN_IMPACT && v.dmgCd <= 0) {
          v.health = applyCollisionDamage(v.health, impact);
          v.dmgCd = DAMAGE_COOLDOWN_S;
        }
      }
    }
  }
  // sync mesh
  v.group.position.set(v.x, 0, v.z);
  v.group.rotation.y = v.heading;
  const spin = (v.speed / 0.45) * dt;
  for (const w of v.wheels) {
    const tire = w.children[0];
    if (tire) tire.rotation.x += spin;
  }
  for (const s of v.steer) s.rotation.y = input.steer * 0.42;
  return v;
}

export function setHeadlights(built, on) {
  if (built.lights) built.lights.emissiveIntensity = on ? 1.4 : 0.25;
}

// Taillights: one shared material for every car, so one call flips the whole
// city's rear lights at dusk — bright red at night, dim by day.
export function setTaillights(on) {
  tailMat.emissiveIntensity = on ? 1.6 : 0.4;
}
