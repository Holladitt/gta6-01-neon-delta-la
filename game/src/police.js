// Police pursuit. Patrol cars chase with A* over the road graph and flank
// from offset approach nodes; a helicopter joins at wanted 3 and up.
// A staged (scripted) cruiser holds a fixed offset ahead of the player so
// screenshot staging can keep a cruiser in the chase camera's frame.
import * as THREE from '../vendor/three.module.min.js';
import { createVehicle, updateVehicle } from './vehicles.js';
import { astar, nearestNode } from './astar.js';
import { WANTED } from './wanted.js';
import { CALLSIGNS } from './config.js';

const CRUISER_PAINT = 0x141414;

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

// Searchlight beam temps (no per-frame allocation).
const BEAM_UP = new THREE.Vector3(0, 1, 0);
const _beamDir = new THREE.Vector3();
const _beamMid = new THREE.Vector3();

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
    this.callIdx = 0; // cycles the callsign pool so each unit keeps its own callsign
    // Searchlight readout (scalars, no per-frame allocation): where the beam
    // lands, its length, and its midpoint — filled by update(), read by beamState().
    this._beamLen = 0;
    this._beamDiscX = 0;
    this._beamDiscZ = 0;
    this._beamMidX = 0;
    this._beamMidY = 0;
    this._beamMidZ = 0;
  }

  nextCallsign() {
    return CALLSIGNS[this.callIdx++ % CALLSIGNS.length];
  }

  // Grow/shrink the patrol to the count the wanted level demands.
  ensureCount(level, px, pz) {
    const want = WANTED.policeFor(level);
    while (this.cars.length < want) {
      const c = createVehicle('police', px + (Math.random() - 0.5) * 200, pz + (Math.random() - 0.5) * 200, 0, CRUISER_PAINT);
      c.callsign = this.nextCallsign();
      c.targetNode = null;
      c.path = [];
      c.pathI = 0;
      this.cars.push(c);
      this.scene.add(c.group);
    }
    // Never trim a scripted (staged) cruiser: screenshot staging pins it to
    // a fixed offset ahead of the player, and ensureCount used to pop it the
    // moment wanted dropped to 0. Scripted cars only exist under ?shot=
    // staging, so normal play is unaffected; the grow loop still counts
    // them toward `want`.
    while (this.cars.length > want) {
      const idx = this.cars.findIndex((c) => !c.script);
      if (idx < 0) break; // only scripted cruisers remain — keep them
      const [c] = this.cars.splice(idx, 1);
      this.scene.remove(c.group);
    }
    if (WANTED.heliFor(level) && !this.heli) this.spawnHeli();
    if (!WANTED.heliFor(level) && this.heli) {
      this.scene.remove(this.heli);
      this.heli = null;
      if (this.heliLight) {
        this.scene.remove(this.heliLight);
        this.heliLight = null;
      }
      if (this.heliSpot) {
        this.scene.remove(this.heliSpot);
        this.heliSpot = null;
      }
    }
  }

  spawnAt(x, z, heading = 0) {
    const c = createVehicle('police', x, z, heading, CRUISER_PAINT);
    c.callsign = this.nextCallsign();
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
    // Searchlight cone: a SCENE-level mesh (not a child of the heli group),
    // so it can aim at the player instead of hanging straight down under
    // the helicopter. ConeGeometry's apex is at +Y and the base is wide at
    // -Y: update() maps +Y onto the heli direction, so the narrow end sits
    // at the heli and the wide base lands on the player — narrow at the
    // source, wide at the ground, like a real searchlight.
    // Opacity 0.34: the beam must still read against a bright golden-hour
    // sky, not only at night. A vertical alpha fade makes the cone's wide
    // base rim dissolve instead of cutting a hard diagonal edge across the
    // sky — opaque at the apex, fading out over the last ~35% toward the
    // base. (alphaMap reads the green channel, so the gradient is grayscale.)
    const beamFade = document.createElement('canvas');
    beamFade.width = 1;
    beamFade.height = 64;
    const bctx = beamFade.getContext('2d');
    const bgr = bctx.createLinearGradient(0, 0, 0, 64);
    bgr.addColorStop(0, '#ffffff');
    bgr.addColorStop(0.65, '#ffffff');
    bgr.addColorStop(1, '#000000');
    bctx.fillStyle = bgr;
    bctx.fillRect(0, 0, 1, 64);
    const beamFadeTex = new THREE.CanvasTexture(beamFade);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(5, 20, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.34, alphaMap: beamFadeTex, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.heliLight = cone;
    this.scene.add(cone);
    // Soft outer halo cone (1.5x radius, faint) riding the same axis —
    // the beam's edge reads as light falloff, not a hard triangle.
    const halo = new THREE.Mesh(
      new THREE.ConeGeometry(7.5, 20, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.10, alphaMap: beamFadeTex, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.heliHalo = halo;
    this.scene.add(halo);
    // Bright disc on the street where the beam lands — on the player, not
    // under the orbiting helicopter (update() moves it to the player).
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(8, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.50, side: THREE.DoubleSide, depthWrite: false }),
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.15, 0);
    this.heliSpot = spot;
    this.scene.add(spot);
    this.heli = g;
    this.heliRotor = rotor;
    this.heliRotor2 = rotor2;
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
        const rx = s.dirZ;
        const rz = -s.dirX; // right vector of the travel direction
        c.x = px + s.dirX * s.ahead + rx * s.lane;
        c.z = pz + s.dirZ * s.ahead + rz * s.lane;
        c.group.position.set(c.x, 0, c.z);
        c.group.rotation.y = c.heading;
        flashLightBar(c, t);
        continue;
      }
      // Steer toward the current path node (or straight at the player when close).
      let tx = px;
      let tz = pz;
      if (c.path && c.pathI < c.path.length) {
        const n = this.graph[c.path[c.pathI]];
        if (n) {
          tx = n.x;
          tz = n.z;
        }
        if (Math.hypot(tx - c.x, tz - c.z) < 25) c.pathI++;
      }
      const dx = tx - c.x;
      const dz = tz - c.z;
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
      const hy = 24 + Math.sin(t * 0.5) * 2;
      this.heli.position.set(hx, hy, hz);
      this.heli.rotation.y = Math.atan2(px - hx, pz - hz);
      this.heliRotor.rotation.y += dt * 22;
      this.heliRotor2.rotation.y += dt * 22;
      // Searchlight tracks the player: the cone spans heli -> player ground
      // position (apex at the heli, wide base on the car), and the bright
      // disc sits where the beam lands — on the player, not 42 m away
      // under the orbiting helicopter. Same quaternion trick as the
      // player-car headlight beam in main.js: +Y (cone apex) maps onto the
      // heli direction, the cone is centred on the heli-target midpoint,
      // and Y-scale stretches its 20-unit height to the true distance.
      if (this.heliLight) {
        _beamDir.set(hx - px, hy, hz - pz);
        const dist = _beamDir.length();
        _beamDir.divideScalar(dist);
        _beamMid.set((hx + px) / 2, hy / 2, (hz + pz) / 2);
        this.heliLight.position.copy(_beamMid);
        this.heliLight.quaternion.setFromUnitVectors(BEAM_UP, _beamDir);
        // Stretch the cone 2 m past both ends (apex buried 1 m inside the
        // heli body, base 1 m past the player) so the apex reads as attached
        // to the helicopter instead of floating just below it. _beamLen
        // stays the true heli->player distance, and the ground disc stays
        // on the car.
        this.heliLight.scale.set(1, (dist + 2) / 20, 1);
        if (this.heliHalo) {
          this.heliHalo.position.copy(_beamMid);
          this.heliHalo.quaternion.setFromUnitVectors(BEAM_UP, _beamDir);
          this.heliHalo.scale.set(1, (dist + 2) / 20, 1);
        }
        this._beamLen = dist;
        this._beamDiscX = px;
        this._beamDiscZ = pz;
        this._beamMidX = _beamMid.x;
        this._beamMidY = _beamMid.y;
        this._beamMidZ = _beamMid.z;
      }
      if (this.heliSpot) this.heliSpot.position.set(px, 0.15, pz);
    }
  }

  setLevel(l) {
    this.level = l;
  }

  // Debug readout for the searchlight: where the beam lands, its length,
  // and its midpoint (null when no helicopter is up).
  beamState() {
    if (!this.heli || !this.heliLight || this._beamLen <= 0) return null;
    return {
      disc: [Math.round(this._beamDiscX), Math.round(this._beamDiscZ)],
      len: +this._beamLen.toFixed(1),
      mid: [+this._beamMidX.toFixed(1), +this._beamMidY.toFixed(1), +this._beamMidZ.toFixed(1)],
    };
  }

  // Line of sight: true when any police car is within 120 units of the player.
  seesPlayer(px, pz) {
    return this.cars.some((c) => Math.hypot(c.x - px, c.z - pz) < 120);
  }
}
