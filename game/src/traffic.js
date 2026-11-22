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

// Right-hand traffic: a car going the positive direction sits on +5.5.
const laneFor = (dir) => (dir > 0 ? 5.5 : -5.5);

// ---------- traffic cars ----------
export class Traffic {
  constructor(scene, colliders, lightGroups) {
    this.scene = scene;
    this.colliders = colliders;
    this.lights = lightGroups;
    this.cars = [];
    this.nightOn = false;
    for (let i = 0; i < 10; i++) this.spawnCar(true);
    this.spawnNightCars(6); // extra cars that only appear at night
  }

  // Night traffic: 6 more cars on the grid, invisible by day. They keep
  // driving their routes while hidden (cheap — one visible flag flips them
  // on), so the streets read busier the moment night falls.
  spawnNightCars(n) {
    for (let i = 0; i < n; i++) {
      const car = this.spawnCar(true);
      car.nightOnly = true;
      car.v.group.visible = false;
    }
    return n;
  }

  setNight(on) {
    if (this.nightOn === on) return;
    this.nightOn = on;
    for (const car of this.cars) {
      if (car.nightOnly) car.v.group.visible = on;
    }
  }

  spawnCar(anywhere) {
    const kind = pick(rng, KINDS);
    const v = createVehicle(kind, 0, 0, 0, pick(rng, CAR_COLORS));
    const axis = rng() < 0.5 ? 'x' : 'z';
    const road = pick(rng, axis === 'x' ? WORLD.STREETS : WORLD.AVENUES);
    const dir = rng() < 0.5 ? 1 : -1;
    const along = range(rng, -700, 700);
    const car = { v, axis, road, dir, along, speed: range(rng, 9, 14) };
    this.place(car, along, laneFor(dir));
    this.cars.push(car);
    this.scene.add(v.group);
    return car;
  }

  // Place one traffic car at an exact spot on a road (screenshot staging).
  spawnAt(kind, axis, road, along, dir, speed, color) {
    const v = createVehicle(kind, 0, 0, 0, color ?? pick(rng, CAR_COLORS));
    const car = { v, axis, road, dir, along, speed };
    this.place(car, along, laneFor(dir));
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
      const car = { v, axis, road, dir, along, speed: range(rng, 8, 13), port: true };
      this.place(car, along, laneFor(dir));
      this.cars.push(car);
      this.scene.add(v.group);
    }
    return n;
  }

  place(car, along, lane) {
    if (car.axis === 'x') {
      car.v.x = along;
      car.v.z = car.road + lane;
      car.v.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.v.x = car.road + lane;
      car.v.z = along;
      car.v.heading = car.dir > 0 ? 0 : Math.PI;
    }
    car.v.group.position.set(car.v.x, 0, car.v.z);
    car.v.group.rotation.y = car.v.heading;
  }

  nearestLight(x, z) {
    let best = null;
    let bd = Infinity;
    for (const lg of this.lights) {
      const d = (lg.x - x) ** 2 + (lg.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = lg;
      }
    }
    return bd < 60 * 60 ? best : null;
  }

  update(dt, t) {
    for (const car of this.cars) {
      car.along += car.dir * car.speed * dt;
      // Wrap at the world edge.
      if (car.along > 760) car.along = -760;
      if (car.along < -760) car.along = 760;
      // Next intersection on this car's line.
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
        // Random turn at the intersection: swap axis, road = crossing line,
        // along = current position.
        if (next < 2 && rng() < 0.3) {
          const newAxis = car.axis === 'x' ? 'z' : 'x';
          const newRoad = Math.round(car.along / 200) * 200;
          car.along = car.road;
          car.axis = newAxis;
          car.road = newRoad;
          car.dir = rng() < 0.5 ? 1 : -1;
        }
      }
      car.speed += (want - car.speed) * Math.min(1, 3 * dt);
      this.place(car, car.along, laneFor(car.dir));
    }
  }
}

// ---------- pedestrians (instanced) ----------
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa06a3a];
const SHIRTS = [0x2ec4b6, 0xffc53d, 0xff7e5f, 0x7d3c98, 0x2471a3, 0x229954, 0xe8e8e8, 0x333333, 0xd4ac0d, 0xff6b9d, 0x00c2a8, 0xff8c42, 0x9b59b6, 0x1abc9c];
const PANTS = [0x2c3e50, 0x5d6d7e, 0x7b7b7b, 0x4a3728, 0x1a1a2e, 0x6e2c00, 0x1b4f72];
const HAIRS = [0x1a1a1a, 0x4a2c0a, 0x8a6a42, 0xd4a017, 0x777777, 0x5d4037, 0xb5651d, 0xe8e8e8];
const CAPS = [0xc0392b, 0x2471a3, 0x229954, 0xdddddd, 0xffc53d, 0x7d3c98];

// boxes: [w,h,d, x,y,z, color] — merged with vertex colors.
function partGeo(boxes) {
  const items = boxes.map(([w, h, d, x, y, z, c]) => ({
    geo: new THREE.BoxGeometry(w, h, d),
    matrix: new THREE.Matrix4().makeTranslation(x, y, z),
    color: c,
  }));
  return mergeItems(items);
}

function randomNpc() {
  return {
    skin: pick(rng, SKINS),
    shirt: pick(rng, SHIRTS),
    pants: pick(rng, PANTS),
    hair: pick(rng, HAIRS),
    cap: rng() < 0.25 ? pick(rng, CAPS) : null,
    pack: rng() < 0.3 ? pick(rng, [0x7d3c98, 0x2471a3, 0xd4ac0d]) : null,
    scale: range(rng, 0.88, 1.16), // taller/shorter silhouettes
    wide: range(rng, 0.85, 1.25), // narrow/broad builds
    phase: range(rng, 0, 6.28),
  };
}

export class Peds {
  // count = sidewalk NPCs; pierCount = festival crowd confined to the pier deck.
  // nightSidewalk extra sidewalk NPCs + nightPier extra pier crowd, both
  // invisible by day (zero scale) and strolling at night.
  constructor(scene, count = 48, pierCount = 0, nightSidewalk = 24, nightPier = 12) {
    this.scene = scene;
    this.count = count;
    this.pierCount = pierCount;
    this.nightOn = false;
    const total = count + pierCount + nightSidewalk + nightPier;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mk = (geo) => {
      const m = new THREE.InstancedMesh(geo, mat, total);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    // Geometries are pre-offset so limb pivots sit at the joint.
    this.head = mk(partGeo([[0.36, 0.36, 0.34, 0, 0, 0, 0xffffff]]));
    this.hair = mk(partGeo([[0.38, 0.14, 0.36, 0, 0.18, 0, 0xffffff], [0.38, 0.3, 0.1, 0, 0.06, -0.18, 0xffffff]]));
    this.torso = mk(partGeo([[0.66, 0.68, 0.38, 0, 0, 0, 0xffffff]]));
    this.legL = mk(partGeo([[0.24, 0.82, 0.26, 0, -0.41, 0, 0xffffff]]));
    this.legR = mk(partGeo([[0.24, 0.82, 0.26, 0, -0.41, 0, 0xffffff]]));
    this.armL = mk(partGeo([[0.2, 0.66, 0.22, 0, -0.33, 0, 0xffffff], [0.18, 0.16, 0.2, 0, -0.68, 0, 0xffffff]]));
    this.armR = mk(partGeo([[0.2, 0.66, 0.22, 0, -0.33, 0, 0xffffff], [0.18, 0.16, 0.2, 0, -0.68, 0, 0xffffff]]));
    // Faces: two eyes + mouth, baked dark in vertex colors (no per-instance
    // color, so every NPC reads as having a face at chase distance).
    this.face = mk(partGeo([
      [0.05, 0.07, 0.02, -0.085, 0.01, 0.18, 0x14100c],
      [0.05, 0.07, 0.02, 0.085, 0.01, 0.18, 0x14100c],
      [0.1, 0.02, 0.02, 0, -0.12, 0.18, 0x7a2a20],
    ]));
    this.cap = mk(partGeo([[0.4, 0.12, 0.38, 0, 0, 0, 0xffffff], [0.4, 0.05, 0.2, 0, -0.04, 0.26, 0xffffff]]));
    this.pack = mk(partGeo([[0.44, 0.5, 0.2, 0, 0, 0, 0xffffff]]));
    this.npcs = [];
    for (let i = 0; i < count; i++) {
      const npc = {
        ...randomNpc(),
        speed: range(rng, 1.2, 2.2),
        road: 0,
        side: 1,
        along: 0,
        dir: 1,
        axis: 'z',
      };
      this.assignRoad(npc, 0, 0);
      this.npcs.push(npc);
    }
    // Groups of 4-5 share a road: cluster them.
    for (let g = 0; g < count; g += 5) {
      const road = pick(rng, WORLD.AVENUES);
      const side = rng() < 0.5 ? 1 : -1;
      const along = range(rng, -600, 600);
      for (let k = g; k < Math.min(g + 5, count); k++) {
        const n = this.npcs[k];
        n.axis = 'z';
        n.road = road;
        n.side = side;
        n.along = along + (k - g) * 6;
        n.dir = side > 0 ? 1 : -1;
      }
    }
    // Pier festival crowd: walks the boardwalk deck (y 2.5), never leaves it.
    // road/side are set so the shared ped-position formula lands on the deck.
    // Four lanes spread the crowd across the deck instead of two files
    // (kept within |lane| <= 5 so the crowd stays on the deck center).
    const pierLanes = [-4.5, -1.5, 1.5, 4.5];
    for (let i = 0; i < pierCount; i++) {
      const lane = pierLanes[i % 4] + range(rng, -0.5, 0.5);
      const npc = {
        ...randomNpc(),
        speed: range(rng, 1.0, 1.8),
        road: 300,
        side: lane / 15.5,
        along: range(rng, -780, -670),
        dir: rng() < 0.5 ? 1 : -1,
        axis: 'x',
        zone: 'pier',
        y: 2.5,
        lane,
      };
      this.npcs.push(npc);
    }
    // Night extras: extra sidewalk strollers + extra pier crowd, parked
    // at zero scale by day. They are real NPCs (same walk, same panic)
    // that only exist on the street at night.
    for (let i = 0; i < nightSidewalk; i++) {
      const npc = {
        ...randomNpc(),
        speed: range(rng, 1.2, 2.2),
        road: 0,
        side: 1,
        along: 0,
        dir: 1,
        axis: 'z',
        nightOnly: true,
      };
      this.assignRoad(npc, 0, 0);
      this.npcs.push(npc);
    }
    for (let i = 0; i < nightPier; i++) {
      const lane = pierLanes[i % 4] + range(rng, -0.5, 0.5);
      const npc = {
        ...randomNpc(),
        speed: range(rng, 1.0, 1.8),
        road: 300,
        side: lane / 15.5,
        along: range(rng, -780, -670),
        dir: rng() < 0.5 ? 1 : -1,
        axis: 'x',
        zone: 'pier',
        y: 2.5,
        lane,
        nightOnly: true,
      };
      this.npcs.push(npc);
    }
    this.applyColors();
  }

  // Flip the night crowd on/off. Day hides them (zero scale); night lets
  // them stroll. The respawn logic in update() pulls far night NPCs back
  // near the player once night starts.
  setNight(on) {
    this.nightOn = on;
  }

  // (Re)assign an NPC to a road: pier crowd just reverses on the deck,
  // street NPCs get a fresh random road/side/along.
  assignRoad(npc, px, pz) {
    if (npc.zone === 'pier') {
      npc.dir *= -1;
      return; // festival crowd stays on the pier
    }
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

  update(dt, px, pz, panic = false) {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sv = new THREE.Vector3();
    const pos = new THREE.Vector3();
    this.npcs.forEach((n, i) => {
      let x;
      let z;
      let heading;
      // Night-only NPCs stand still + invisible by day.
      const hidden = n.nightOnly && !this.nightOn;
      if (n.zone === 'pier') {
        // Festival crowd: stroll the deck between the gate and the wheel, bounce at the ends.
        if (!hidden) {
          n.along += n.dir * n.speed * dt;
          if (n.along > -668) {
            n.along = -668;
            n.dir = -1;
          }
          if (n.along < -782) {
            n.along = -782;
            n.dir = 1;
          }
        }
        x = n.along;
        z = 300 + n.lane;
        heading = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        if (!hidden) {
          n.along += n.dir * n.speed * dt;
          if (n.along > 760 || n.along < -760) this.assignRoad(n, px, pz);
          // Respawn groups that drifted far from the player.
          const wx0 = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
          const wz0 = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
          if ((wx0 - px) ** 2 + (wz0 - pz) ** 2 > 420 * 420) this.assignRoad(n, px, pz);
          // Panic: when the player is shooting or the heat is high, nearby
          // NPCs run away from the player at 2.5x speed instead of strolling.
          const wx = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
          const wz = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
          if (panic && (wx - px) ** 2 + (wz - pz) ** 2 < 45 * 45) {
            n.dir = (n.axis === 'z' ? (wz - pz) : (wx - px)) >= 0 ? 1 : -1;
            n.along += n.dir * n.speed * 1.5 * dt; // burst on top of the stroll step = 2.5x
          }
        }
        x = n.axis === 'z' ? n.road + n.side * 15.5 : n.along;
        z = n.axis === 'z' ? n.along : n.road + n.side * 15.5;
        heading = n.axis === 'z' ? (n.dir > 0 ? 0 : Math.PI) : (n.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      n.phase += dt * n.speed * 2.4;
      const sw = Math.sin(n.phase) * 0.75; // bigger limb swing — walk reads at distance
      const s = n.scale;
      const wd = n.wide || 1;
      const yb = n.y || 0;
      const vis = hidden ? 0.0001 : s; // hidden night NPCs collapse to a point
      const set = (mesh, px2, py, pz2, rx = 0, ry = heading, rz = 0, sc = s, swd = 1) => {
        e.set(rx, ry, rz);
        q.setFromEuler(e);
        pos.set(px2, py, pz2);
        sv.set(sc * swd, sc, sc);
        m4.compose(pos, q, sv);
        mesh.setMatrixAt(i, m4);
      };
      set(this.torso, x, 1.18 * s + yb, z, 0, heading, 0, vis, wd);
      set(this.head, x, 1.68 * s + yb, z, 0, heading, 0, vis);
      set(this.hair, x, 1.68 * s + yb, z, 0, heading, 0, vis);
      set(this.face, x, 1.68 * s + yb, z, 0, heading, 0, vis);
      set(this.cap, x, 1.9 * s + yb, z, 0, heading, 0, n.cap ? vis : 0.0001);
      set(this.pack, x - Math.sin(heading) * 0.3, 1.2 * s + yb, z - Math.cos(heading) * 0.3, 0, heading, 0, n.pack ? vis : 0.0001);
      set(this.legL, x - Math.cos(heading) * 0.15 * s * wd, 0.84 * s + yb, z + Math.sin(heading) * 0.15 * s * wd, sw, heading, 0, vis);
      set(this.legR, x + Math.cos(heading) * 0.15 * s * wd, 0.84 * s + yb, z - Math.sin(heading) * 0.15 * s * wd, -sw, heading, 0, vis);
      set(this.armL, x - Math.cos(heading) * 0.44 * s * wd, 1.46 * s + yb, z + Math.sin(heading) * 0.44 * s * wd, -sw * 0.8, heading, 0.18, vis, wd);
      set(this.armR, x + Math.cos(heading) * 0.44 * s * wd, 1.46 * s + yb, z - Math.sin(heading) * 0.44 * s * wd, sw * 0.8, heading, -0.18, vis, wd);
    });
    for (const m of [this.head, this.hair, this.face, this.torso, this.legL, this.legR, this.armL, this.armR, this.cap, this.pack]) {
      m.instanceMatrix.needsUpdate = true;
    }
  }
}
