// traffic.js — ambient traffic on the road grid (browser).
// 22 cars exist; 16 run by day and 6 by night. Cars drive along road
// lines, turn at intersections, and stop for red lights.
import * as THREE from 'three';
import { makeCarMesh } from './vehicles.js';
import { lightState, isNight } from './lights.js';
import { RNG } from './rng.js';
import { ROAD_SPACING, WORLD_HALF } from './config.js';

const DAY_CARS = 16;

export class TrafficSystem {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    const rng = new RNG(2024);
    const palette = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x1abc9c, 0xe67e22, 0xdddddd, 0x333a45];
    for (let i = 0; i < 22; i++) {
      const axis = rng.chance(0.5) ? 'x' : 'z';
      const road = Math.round(rng.range(-5, 5)) * ROAD_SPACING;
      const along = rng.range(-WORLD_HALF, WORLD_HALF);
      const dir = rng.chance(0.5) ? 1 : -1;
      const mesh = makeCarMesh('sedan', palette[rng.int(0, palette.length - 1)]);
      scene.add(mesh);
      this.cars.push({
        axis, road, along, dir,
        speed: rng.range(7, 11),
        targetSpeed: rng.range(7, 11),
        mesh, rng,
      });
    }
  }

  get activeCount() {
    return this._night ? 6 : DAY_CARS;
  }

  update(dt, time, hour) {
    this._night = isNight(hour);
    const lights = lightState(time);
    const active = this.activeCount;
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const on = i < active;
      c.mesh.visible = on;
      if (!on) continue;
      // Approaching an intersection? Stop for a red light on this axis.
      const nextCross = Math.round(c.along / ROAD_SPACING) * ROAD_SPACING;
      const distToCross = (nextCross - c.along) * c.dir;
      let want = c.targetSpeed;
      if (distToCross > 0 && distToCross < 16) {
        const light = c.axis === 'x' ? lights.ew : lights.ns;
        if (light === 'red') want = 0;
        else if (light === 'yellow') want = Math.min(want, 3);
      }
      c.speed += (want - c.speed) * Math.min(1, 2.5 * dt);
      c.along += c.dir * c.speed * dt;
      // Turn or U-turn at intersections / map edge.
      const atCross = Math.abs(c.along - Math.round(c.along / ROAD_SPACING) * ROAD_SPACING) < 1.2;
      if (atCross && Math.abs(c.along) < WORLD_HALF - 10 && c.rng.next() < 0.12) {
        // Turn onto the crossing road: the axis swaps, and the car's
        // coordinates swap roles (road <-> along) at the intersection.
        const cross = Math.round(c.along / ROAD_SPACING) * ROAD_SPACING;
        const oldRoad = c.road;
        c.axis = c.axis === 'x' ? 'z' : 'x';
        c.road = cross;
        c.along = oldRoad;
        c.dir = c.rng.chance(0.5) ? 1 : -1;
      }
      if (Math.abs(c.along) > WORLD_HALF - 6) {
        c.dir *= -1;
        c.along = Math.max(-WORLD_HALF + 6, Math.min(WORLD_HALF - 6, c.along));
      }
      const x = c.axis === 'x' ? c.along : c.road;
      const z = c.axis === 'x' ? c.road : c.along;
      c.mesh.position.set(x, 0, z);
      const heading = c.axis === 'x' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? Math.PI : 0);
      c.mesh.rotation.y = heading;
    }
  }
}
