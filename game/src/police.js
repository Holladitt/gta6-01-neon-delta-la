// Police pursuit. Patrol cars chase with A* over the road graph and flank
// from offset approach nodes; a helicopter joins at wanted 3 and up.
// A staged (scripted) cruiser holds a fixed offset ahead of the player so
// screenshot staging can keep a cruiser in the chase camera's frame.
import * as THREE from '../vendor/three.module.min.js';
import { createVehicle, updateVehicle } from './vehicles.js';
import { astar, nearestNode } from './astar.js';
import { WANTED } from './wanted.js';

const CRUISER_PAINT = 0x141414;

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

// Alternate the light bar between red and blue on a fast beat.
function flashLightBar(car, t) {
  if (!car.lightBar) return;
  const redOn = Math.sin(t * 12) > 0;
  car.lightBar.red.emissiveIntensity = redOn ? 2.2 : 0.1;
  car.lightBar.blue.emissiveIntensity = redOn ? 0.1 : 2.2;
}

export class Police {
  constructor(scene, graph, colliders) {
    this.scene = scene;
    this.graph = graph;
    this.colliders = colliders;
    this.cars = [];
    this.heli = null;
    this.heliLight = null;
    this.heliSpot = null;
    this.repathT = 0;
    this.level = 0;
  }

  // Grow/shrink the patrol to the count the wanted level demands.
  ensureCount(level, px, pz) {
    const want = WANTED.policeFor(level);
    while (this.cars.length < want) {
      const c = createVehicle('police', px + (Math.random() - 0.5) * 200, pz + (Math.random() - 0.5) * 200, 0, CRUISER_PAINT);
      c.targetNode = null;
      c.path = [];
      c.pathI = 0;
      this.cars.push(c);
      this.scene.add(c.group);
    }
    while (this.cars.length > want) {
      const c = this.cars.pop();
      this.scene.remove(c.group);
    }
    if (WANTED.heliFor(level) && !this.heli) this.spawnHeli();
    if (!WANTED.heliFor(level) && this.heli) {
      this.scene.remove(this.heli);
      this.heli = null;
      this.heliLight = null;
      if (this.heliSpot) {
        this.scene.remove(this.heliSpot);
        this.heliSpot = null;
      }
    }
  }

  spawnAt(x, z, heading = 0) {
    const c = createVehicle('police', x, z, heading, CRUISER_PAINT);
    c.targetNode = null;
    c.path = [];
    c.pathI = 0;
    this.cars.push(c);
    this.scene.add(c.group);
    return c;
  }

  spawnHeli() {
    const g = new THREE.Group();
    const addBox = (w, h, d, color, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    addBox(5.5, 1.8, 2.2, 0xf4f4f0); // body
    addBox(5.6, 0.4, 2.25, 0x2471a3); // blue stripe
    addBox(4.5, 0.8, 0.8, 0xf4f4f0, -4.5, 0.5, 0); // tail boom
    addBox(0.4, 1.8, 0.2, 0xc0392b, -6.5, 1.2, 0); // tail fin
    const rotor = addBox(11, 0.15, 0.6, 0x222222, 0, 1.3, 0);
    const rotor2 = rotor.clone();
    rotor2.rotation.y = Math.PI / 2;
    g.add(rotor2);
    addBox(4.5, 0.15, 0.3, 0x333333, 0, -1.2, 0.9); // skids
    addBox(4.5, 0.15, 0.3, 0x333333, 0, -1.2, -0.9);
    // Translucent searchlight cone reaching the ground from the low orbit.
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(5, 20, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false })
    );
    cone.position.y = -11;
    cone.rotation.x = Math.PI;
    g.add(cone);
    // Bright disc on the street under the helicopter, so the hunt reads even
    // when the helicopter itself sits near the frame edge.
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(8, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.15, 0);
    this.heliSpot = spot;
    this.scene.add(spot);
    this.heli = g;
    this.heliRotor = rotor;
    this.heliRotor2 = rotor2;
    this.heliLight = cone;
    this.scene.add(g);
  }

  update(dt, t, px, pz, playerSpeed) {
    const level = this.level || 0;
    this.ensureCount(level, px, pz);
    this.repathT -= dt;
    if (this.repathT <= 0) {
      this.repathT = 1.0;
      const goal = nearestNode(this.graph, px, pz);
      this.cars.forEach((c, i) => {
        if (c.script) return; // staged cruisers never repath
        // Flank: alternate cars aim at a node offset from the player.
        const ox = i % 2 === 0 ? 200 : -200;
        const oz = i % 3 === 0 ? 200 : 0;
        const start = nearestNode(this.graph, c.x, c.z);
        const g2 = nearestNode(this.graph, px + ox, pz + oz) || goal;
        c.path = astar(this.graph, start, g2) || [goal];
        c.pathI = 0;
      });
    }
    for (const c of this.cars) {
      if (c.script) {
        // Staged chase (screenshot only): pin the cruiser to a fixed offset
        // ahead of the player. Only shot staging sets c.script; normal play
        // never does. The light bar keeps flashing.
        const s = c.script;
        const rx = s.dirZ, rz = -s.dirX; // right vector of the travel direction
        c.x = px + s.dirX * s.ahead + rx * s.lane;
        c.z = pz + s.dirZ * s.ahead + rz * s.lane;
        c.group.position.set(c.x, 0, c.z);
        c.group.rotation.y = c.heading;
        flashLightBar(c, t);
        continue;
      }
      // Steer toward the current path node (or straight at the player when close).
      let tx = px, tz = pz;
      if (c.path && c.pathI < c.path.length) {
        const n = this.graph[c.path[c.pathI]];
        if (n) { tx = n.x; tz = n.z; }
        if (Math.hypot(tx - c.x, tz - c.z) < 25) c.pathI++;
      }
      const dx = tx - c.x, dz = tz - c.z;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const dist = Math.hypot(dx, dz);
      const throttle = dist > 18 ? 1 : 0.4;
      updateVehicle(c, { throttle, steer: Math.max(-1, Math.min(1, dh * 1.6)), handbrake: Math.abs(dh) > 1.2 }, dt, this.colliders);
      flashLightBar(c, t);
    }
    if (this.heli) {
      // Low orbit (y ~24, radius ~42): inside the chase camera's frame, so
      // the helicopter is visible instead of circling high overhead.
      const hx = px + Math.sin(t * 0.25) * 42;
      const hz = pz + Math.cos(t * 0.2) * 42;
      this.heli.position.set(hx, 24 + Math.sin(t * 0.5) * 2, hz);
      this.heli.rotation.y = Math.atan2(px - hx, pz - hz);
      this.heliRotor.rotation.y += dt * 22;
      this.heliRotor2.rotation.y += dt * 22;
      if (this.heliSpot) this.heliSpot.position.set(hx, 0.15, hz);
    }
  }

  setLevel(l) { this.level = l; }

  // Line of sight: true when any police car is within 120 units of the player.
  seesPlayer(px, pz) {
    return this.cars.some((c) => Math.hypot(c.x - px, c.z - pz) < 120);
  }
}
