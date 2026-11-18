// Police: wanted response — patrol cars pursue with A* over the road graph,
// flanking from different approach nodes; helicopter joins at wanted 3+.
import * as THREE from '../vendor/three.module.min.js';
import { createVehicle, updateVehicle } from './vehicles.js';
import { astar, nearestNode } from './astar.js';
import { WANTED } from './wanted.js';

export class Police {
  constructor(scene, graph, colliders) {
    this.scene = scene; this.graph = graph; this.colliders = colliders;
    this.cars = [];
    this.heli = null;
    this.heliLight = null;
    this.repathT = 0;
  }
  ensureCount(level, px, pz) {
    const want = WANTED.policeFor(level);
    while (this.cars.length < want) {
      const c = createVehicle('police', px + (Math.random() - 0.5) * 200, pz + (Math.random() - 0.5) * 200, 0, 0x141414);
      c.targetNode = null; c.path = []; c.pathI = 0;
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
      this.heli = null; this.heliLight = null;
    }
  }
  spawnAt(x, z, heading = 0) {
    const c = createVehicle('police', x, z, heading, 0x141414);
    c.targetNode = null; c.path = []; c.pathI = 0;
    this.cars.push(c);
    this.scene.add(c.group);
    return c;
  }
  spawnHeli() {
    const g = new THREE.Group();
    const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.8, 2.2), lam(0xf4f4f0));
    g.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 2.25), lam(0x2471a3));
    g.add(stripe);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 0.8), lam(0xf4f4f0));
    tail.position.set(-4.5, 0.5, 0);
    g.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 0.2), lam(0xc0392b));
    fin.position.set(-6.5, 1.2, 0);
    g.add(fin);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.15, 0.6), lam(0x222222));
    rotor.position.y = 1.3;
    g.add(rotor);
    const rotor2 = rotor.clone();
    rotor2.rotation.y = Math.PI / 2;
    g.add(rotor2);
    const skids = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.15, 0.3), lam(0x333333));
    skids.position.set(0, -1.2, 0.9);
    g.add(skids);
    const skids2 = skids.clone(); skids2.position.z = -0.9;
    g.add(skids2);
    // searchlight cone (translucent)
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(6, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false })
    );
    cone.position.y = -14;
    cone.rotation.x = Math.PI;
    g.add(cone);
    this.heli = g; this.heliRotor = rotor; this.heliRotor2 = rotor2; this.heliLight = cone;
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
        // flank: alternate cars aim at a node offset from the player
        const ox = i % 2 === 0 ? 200 : -200;
        const oz = i % 3 === 0 ? 200 : 0;
        const start = nearestNode(this.graph, c.x, c.z);
        const g2 = nearestNode(this.graph, px + ox, pz + oz) || goal;
        c.path = astar(this.graph, start, g2) || [goal];
        c.pathI = 0;
      });
    }
    for (const c of this.cars) {
      // steer toward current path node (or straight at the player when close)
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
      // flash light bar
      const on = Math.sin(t * 12) > 0;
      if (c.lightBar) {
        c.lightBar.red.emissiveIntensity = on ? 2.2 : 0.1;
        c.lightBar.blue.emissiveIntensity = on ? 0.1 : 2.2;
      }
    }
    if (this.heli) {
      const hx = px + Math.sin(t * 0.25) * 30;
      const hz = pz + Math.cos(t * 0.2) * 30;
      this.heli.position.set(hx, 55 + Math.sin(t * 0.5) * 3, hz);
      this.heli.rotation.y = Math.atan2(px - hx, pz - hz);
      this.heliRotor.rotation.y += dt * 22;
      this.heliRotor2.rotation.y += dt * 22;
    }
  }
  setLevel(l) { this.level = l; }
  // line of sight: true when any police car is within 120 units of the player.
  seesPlayer(px, pz) {
    return this.cars.some((c) => Math.hypot(c.x - px, c.z - pz) < 120);
  }
}
