// Traffic + pedestrians. Cars drive the road grid and stop at red lights;
// pedestrians walk the sidewalks in groups, rendered as instanced parts
// (9 draw calls for all 48 NPCs).
import * as THREE from '../vendor/three.module.min.js';
import { WORLD } from './config.js';
import { mulberry32, pick, range } from './rng.js';
import { createVehicle } from './vehicles.js';
import { lightState } from './lights.js';
import { mergeItems } from './geo.js';

const rng = mulberry32(777);
const CAR_COLORS = [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98, 0xe8e8e8, 0x333333, 0xff7e5f, 0x2ec4b6];
const KINDS = ['sedan', 'sedan', 'suv', 'pickup', 'sport', 'sedan'];
// Port roads: the two avenues/streets that bound the Container Terminal.
const PORT_ROADS = [400, 600];
const PORT_KINDS = ['pickup', 'pickup', 'sedan', 'suv', 'pickup', 'sport'];

// ---------- traffic cars ----------
export class Traffic {
  constructor(scene, colliders, lightGroups) {
    this.scene = scene; this.colliders = colliders; this.lights = lightGroups;
    this.cars = [];
    for (let i = 0; i < 10; i++) this.spawnCar(true);
  }
  spawnCar(anywhere) {
    const kind = pick(rng, KINDS);
    const v = createVehicle(kind, 0, 0, 0, pick(rng, CAR_COLORS));
    const axis = rng() < 0.5 ? 'x' : 'z';
    const road = pick(rng, axis === 'x' ? WORLD.STREETS : WORLD.AVENUES);
    const dir = rng() < 0.5 ? 1 : -1;
    const along = range(rng, -700, 700);
    const lane = dir > 0 ? 5.5 : -5.5; // right-hand traffic
    const car = { v, axis, road, dir, along, speed: range(rng, 9, 14) };
    this.place(car, along, lane);
    this.cars.push(car);
    this.scene.add(v.group);
    return car;
  }
  // Place one traffic car at an exact spot on a road (screenshot staging).
  spawnAt(kind, axis, road, along, dir, speed, color) {
    const v = createVehicle(kind, 0, 0, 0, color ?? pick(rng, CAR_COLORS));
    const lane = dir > 0 ? 5.5 : -5.5;
    const car = { v, axis, road, dir, along, speed };
    this.place(car, along, lane);
    this.cars.push(car);
    this.scene.add(v.group);
    return car;
  }
  // Extra traffic confined to the port roads (trucks + cars around the terminal).
  spawnPortCars(n) {
    for (let i = 0; i < n; i++) {
      const kind = pick(rng, PORT_KINDS);
      const v = createVehicle(kind, 0, 0, 0, pick(rng, CAR_COLORS));
      const axis = rng() < 0.5 ? 'x' : 'z';
      const road = pick(rng, PORT_ROADS);
      const dir = rng() < 0.5 ? 1 : -1;
      const along = range(rng, 340, 700);
      const lane = dir > 0 ? 5.5 : -5.5;
      const car = { v, axis, road, dir, along, speed: range(rng, 8, 13), port: true };
      this.place(car, along, lane);
      this.cars.push(car);
      this.scene.add(v.group);
    }
    return n;
  }
  place(car, along, lane) {
    if (car.axis === 'x') { car.v.x = along; car.v.z = car.road + lane; car.v.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { car.v.x = car.road + lane; car.v.z = along; car.v.heading = car.dir > 0 ? 0 : Math.PI; }
    car.v.group.position.set(car.v.x, 0, car.v.z);
    car.v.group.rotation.y = car.v.heading;
  }
  nearestLight(x, z) {
    let best = null, bd = Infinity;
    for (const lg of this.lights) {
      const d = (lg.x - x) ** 2 + (lg.z - z) ** 2;
      if (d < bd) { bd = d; best = lg; }
    }
    return bd < 60 * 60 ? best : null;
  }
  update(dt, t) {
    for (const car of this.cars) {
      car.along += car.dir * car.speed * dt;
      // wrap at world edge
      if (car.along > 760) car.along = -760;
      if (car.along < -760) car.along = 760;
      // next intersection
      const lines = car.axis === 'x' ? WORLD.AVENUES : WORLD.STREETS;
      let next = null;
      for (const l of lines) {
        const d = (l - car.along) * car.dir;
        if (d > 0 && (next === null || d < next)) next = d;
      }
      let want = car.speed;
      if (next !== null && next < 26) {
        const lg = this.nearestLight(car.v.x, car.v.z);
        if (lg) {
          const st = lightState(t, lg.offset);
          const axisKey = car.axis === 'x' ? 'ew' : 'ns';
          if (st[axisKey] !== 'green') want = next < 14 ? 0 : Math.max(0, (next - 14) * 0.8);
        }
        // random turn at the intersection: swap axis, road = crossing line, along = current position
        if (next < 2 && rng() < 0.3) {
          const newAxis = car.axis === 'x' ? 'z' : 'x';
          const newRoad = Math.round(car.along / 200) * 200;
          car.along = car.road;
          car.axis = newAxis; car.road = newRoad;
          car.dir = rng() < 0.5 ? 1 : -1;
        }
      }
      car.speed += (want - car.speed) * Math.min(1, 3 * dt);
      const lane = car.dir > 0 ? 5.5 : -5.5;
      this.place(car, car.along, lane);
    }
  }
}

// ---------- pedestrians (instanced) ----------
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa06a3a];
const SHIRTS = [0x2ec4b6, 0xffc53d, 0xff7e5f, 0x7d3c98, 0x2471a3, 0x229954, 0xe8e8e8, 0x333333, 0xd4ac0d];
const PANTS = [0x2c3e50, 0x5d6d7e, 0x7b7b7b, 0x4a3728, 0x1a1a2e];
const HAIRS = [0x1a1a1a, 0x4a2c0a, 0x8a6a42, 0xd4a017, 0x777777, 0x5d4037];
const CAPS = [0xc0392b, 0x2471a3, 0x229954, 0xdddddd];

function partGeo(boxes) {
  // boxes: [w,h,d, x,y,z, color] — merged with vertex colors.
  const items = boxes.map(([w, h, d, x, y, z, c]) => ({
    geo: new THREE.BoxGeometry(w, h, d),
    matrix: new THREE.Matrix4().makeTranslation(x, y, z),
    color: c,
  }));
  return mergeItems(items);
}

export class Peds {
  // count = sidewalk NPCs; pierCount = festival crowd confined to the pier deck.
  constructor(scene, count = 48, pierCount = 0) {
    this.scene = scene; this.count = count; this.pierCount = pierCount;
    const total = count + pierCount;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mk = (geo) => {
      const m = new THREE.InstancedMesh(geo, mat, total);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    // geometries are pre-offset so limb pivots sit at the joint
    this.head = mk(partGeo([[0.36, 0.36, 0.34, 0, 0, 0, 0xffffff]]));
    this.hair = mk(partGeo([[0.38, 0.14, 0.36, 0, 0.18, 0, 0xffffff], [0.38, 0.3, 0.1, 0, 0.06, -0.18, 0xffffff]]));
    this.torso = mk(partGeo([[0.66, 0.68, 0.38, 0, 0, 0, 0xffffff]]));
    this.legL = mk(partGeo([[0.24, 0.82, 0.26, 0, -0.41, 0, 0xffffff]]));
    this.legR = mk(partGeo([[0.24, 0.82, 0.26, 0, -0.41, 0, 0xffffff]]));
    this.armL = mk(partGeo([[0.2, 0.66, 0.22, 0, -0.33, 0, 0xffffff], [0.18, 0.16, 0.2, 0, -0.68, 0, 0xffffff]]));
    this.armR = mk(partGeo([[0.2, 0.66, 0.22, 0, -0.33, 0, 0xffffff], [0.18, 0.16, 0.2, 0, -0.68, 0, 0xffffff]]));
    this.cap = mk(partGeo([[0.4, 0.12, 0.38, 0, 0, 0, 0xffffff], [0.4, 0.05, 0.2, 0, -0.04, 0.26, 0xffffff]]));
    this.pack = mk(partGeo([[0.44, 0.5, 0.2, 0, 0, 0, 0xffffff]]));
    this.npcs = [];
    for (let i = 0; i < count; i++) {
      const npc = {
        skin: pick(rng, SKINS), shirt: pick(rng, SHIRTS), pants: pick(rng, PANTS),
        hair: pick(rng, HAIRS), cap: rng() < 0.25 ? pick(rng, CAPS) : null,
        pack: rng() < 0.3 ? pick(rng, [0x7d3c98, 0x2471a3, 0xd4ac0d]) : null,
        scale: range(rng, 0.92, 1.08), phase: range(rng, 0, 6.28),
        speed: range(rng, 1.2, 2.2), road: 0, side: 1, along: 0, dir: 1, axis: 'z',
      };
      this.assignRoad(npc, 0, 0);
      this.npcs.push(npc);
    }
    // groups of 4-5 share a road: cluster them
    for (let g = 0; g < count; g += 5) {
      const road = pick(rng, WORLD.AVENUES);
      const side = rng() < 0.5 ? 1 : -1;
      const along = range(rng, -600, 600);
      for (let k = g; k < Math.min(g + 5, count); k++) {
        const n = this.npcs[k];
        n.axis = 'z'; n.road = road; n.side = side; n.along = along + (k - g) * 6; n.dir = side > 0 ? 1 : -1;
      }
    }
    // pier festival crowd: walks the boardwalk deck (y 2.5), never leaves it.
    // road/side are set so the shared ped-position formula lands on the deck.
    for (let i = 0; i < pierCount; i++) {
      const lane = (i % 2 === 0 ? 4 : -4) + range(rng, -1, 1);
      const npc = {
        skin: pick(rng, SKINS), shirt: pick(rng, SHIRTS), pants: pick(rng, PANTS),
        hair: pick(rng, HAIRS), cap: rng() < 0.25 ? pick(rng, CAPS) : null,
        pack: rng() < 0.3 ? pick(rng, [0x7d3c98, 0x2471a3, 0xd4ac0d]) : null,
        scale: range(rng, 0.92, 1.08), phase: range(rng, 0, 6.28),
        speed: range(rng, 1.0, 1.8), road: 300, side: lane / 15.5, along: range(rng, -780, -670),
        dir: rng() < 0.5 ? 1 : -1, axis: 'x', zone: 'pier', y: 2.5, lane,
      };
      this.npcs.push(npc);
    }
    this.applyColors();
  }
  assignRoad(npc, px, pz) {
    if (npc.zone === 'pier') { npc.dir *= -1; return; } // festival crowd stays on the pier
    npc.axis = rng() < 0.5 ? 'z' : 'x';
    npc.road = pick(rng, npc.axis === 'z' ? WORLD.AVENUES : WORLD.STREETS);
    npc.side = rng() < 0.5 ? 1 : -1;
    npc.along = range(rng, -700, 700);
    npc.dir = rng() < 0.5 ? 1 : -1;
  }
  applyColors() {
    const c = new THREE.Color();
    this.npcs.forEach((n, i) => {
      this.head.setColorAt(i, c.set(n.skin));
      this.hair.setColorAt(i, c.set(n.hair));
      this.torso.setColorAt(i, c.set(n.shirt));
      this.legL.setColorAt(i, c.set(n.pants));
      this.legR.setColorAt(i, c.set(n.pants));
      this.armL.setColorAt(i, c.set(n.shirt));
      this.armR.setColorAt(i, c.set(n.shirt));
      this.cap.setColorAt(i, c.set(n.cap ?? 0xffffff));
      this.pack.setColorAt(i, c.set(n.pack ?? 0xffffff));
    });
    for (const m of [this.head, this.hair, this.torso, this.legL, this.legR, this.armL, this.armR, this.cap, this.pack]) {
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
  update(dt, px, pz) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const sv = new THREE.Vector3(), pos = new THREE.Vector3();
    this.npcs.forEach((n, i) => {
      let x, z, heading;
      if (n.zone === 'pier') {
        // festival crowd: stroll the deck between the gate and the wheel, bounce at the ends
        n.along += n.dir * n.speed * dt;
        if (n.along > -668) { n.along = -668; n.dir = -1; }
        if (n.along < -782) { n.along = -782; n.dir = 1; }
        x = n.along; z = 300 + n.lane;
        heading = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        n.along += n.dir * n.speed * dt;
        if (n.along > 760 || n.along < -760) { this.assignRoad(n, px, pz); }
        // respawn groups that drifted far from the player
        const wx = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
        const wz = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
        if ((wx - px) ** 2 + (wz - pz) ** 2 > 420 * 420) this.assignRoad(n, px, pz);
        x = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
        z = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
        heading = n.axis === 'z' ? (n.dir > 0 ? 0 : Math.PI) : (n.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      n.phase += dt * n.speed * 2.4;
      const sw = Math.sin(n.phase) * 0.55;
      const s = n.scale, yb = n.y || 0;
      const set = (mesh, px2, py, pz2, rx = 0, ry = heading, rz = 0, sc = s) => {
        e.set(rx, ry, rz); q.setFromEuler(e);
        pos.set(px2, py, pz2); sv.set(sc, sc, sc);
        m4.compose(pos, q, sv);
        mesh.setMatrixAt(i, m4);
      };
      set(this.torso, x, 1.18 * s + yb, z);
      set(this.head, x, 1.68 * s + yb, z);
      set(this.hair, x, 1.68 * s + yb, z);
      set(this.cap, x, 1.9 * s + yb, z, 0, heading, 0, n.cap ? s : 0.0001);
      set(this.pack, x - Math.sin(heading) * 0.3, 1.2 * s + yb, z - Math.cos(heading) * 0.3, 0, heading, 0, n.pack ? s : 0.0001);
      set(this.legL, x - Math.cos(heading) * 0.15 * s, 0.84 * s + yb, z + Math.sin(heading) * 0.15 * s, sw, heading, 0);
      set(this.legR, x + Math.cos(heading) * 0.15 * s, 0.84 * s + yb, z - Math.sin(heading) * 0.15 * s, -sw, heading, 0);
      set(this.armL, x - Math.cos(heading) * 0.44 * s, 1.46 * s + yb, z + Math.sin(heading) * 0.44 * s, -sw * 0.8, heading, 0.12);
      set(this.armR, x + Math.cos(heading) * 0.44 * s, 1.46 * s + yb, z - Math.sin(heading) * 0.44 * s, sw * 0.8, heading, -0.12);
    });
    for (const m of [this.head, this.hair, this.torso, this.legL, this.legR, this.armL, this.armR, this.cap, this.pack]) {
      m.instanceMatrix.needsUpdate = true;
    }
  }
}
