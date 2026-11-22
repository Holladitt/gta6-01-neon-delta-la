// NDPD pursuit: police cars spawn by wanted level, chase the
// player, and flank using A-star waypoints on the road grid.
// At wanted 4 two roadblock units spawn ahead on the road; at
// wanted 5 the black SWAT van joins. Police drop spike strips.
// The helicopter orbits from wanted 3 and its spotlight tracks
// the car. Pure positions — the scene draws them.
import { POLICE_CAR, SWAT_VAN } from './vehicles.js';
import { findPath } from './astar.js';
import { makeRng, range, clamp, dist2 } from './rng.js';
import { policeCarCount, roadblockCount, swatActive, heliActive } from './wanted.js';

export function createPolice() {
  return {
    cars: [], heli: null, roadblocks: [], swat: null,
    rng: makeRng(777), pathTimer: 0, spikeTimer: 0,
  };
}

export function spawnCar(p, x, z, scripted) {
  const c = {
    type: POLICE_CAR.type, color: POLICE_CAR.color,
    x, z, angle: 0, speed: 0, topSpeed: POLICE_CAR.topSpeed,
    path: [], pathI: 0, scripted: !!scripted, swat: false,
  };
  p.cars.push(c);
  return c;
}

export function updatePolice(p, world, dt, now) {
  const w = world.wanted;
  const want = policeCarCount(w);
  while (p.cars.length < want) {
    const a = p.rng() * Math.PI * 2;
    spawnCar(p, world.car.x + Math.sin(a) * 160, world.car.z + Math.cos(a) * 160, false);
  }
  while (p.cars.length > want) p.cars.pop();

  // Roadblocks: two units ahead of the car on the road. In shot mode
  // the diorama is frozen, so the staged roadblocks stay put.
  const rb = roadblockCount(w);
  while (p.roadblocks.length < rb) {
    const ahead = 90 + p.roadblocks.length * 30;
    p.roadblocks.push({
      x: world.car.x + Math.sin(world.car.angle) * ahead,
      z: world.car.z + Math.cos(world.car.angle) * ahead,
      angle: world.car.angle + Math.PI / 2, cars: 2,
    });
  }
  while (p.roadblocks.length > rb) p.roadblocks.pop();
  if (!world.frozen) {
    for (const r of p.roadblocks) {
      const tx = world.car.x + Math.sin(world.car.angle) * 90;
      const tz = world.car.z + Math.cos(world.car.angle) * 90;
      r.x += (tx - r.x) * Math.min(1, dt * 0.5);
      r.z += (tz - r.z) * Math.min(1, dt * 0.5);
    }
  }

  // SWAT van at wanted 5.
  if (swatActive(w) && !p.swat) {
    p.swat = {
      type: SWAT_VAN.type, color: SWAT_VAN.color,
      x: world.car.x + 120, z: world.car.z - 120, angle: 0,
      speed: 0, topSpeed: SWAT_VAN.topSpeed, armour: true, swat: true,
    };
  }
  if (!swatActive(w)) p.swat = null;

  // Spike strips: a pursuit car drops one every 9 seconds at wanted 3+.
  p.spikeTimer += dt;
  if (w.level >= 3 && p.spikeTimer > 9 && p.cars.length > 0) {
    p.spikeTimer = 0;
    const lead = p.cars[0];
    world.wanted.spikes.push({ x: lead.x, z: lead.z, at: now });
    if (world.wanted.spikes.length > 6) world.wanted.spikes.shift();
  }

  // Pursuit: steer toward the player, re-pathing every 2 seconds.
  p.pathTimer += dt;
  for (const c of p.cars) {
    if (p.pathTimer > 2) {
      c.path = findPath(c.x, c.z, world.car.x, world.car.z);
      c.pathI = 0;
    }
    const target = c.path && c.path[c.pathI] ? c.path[c.pathI] : { x: world.car.x, z: world.car.z };
    const dx = target.x - c.x; const dz = target.z - c.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 12 && c.pathI < c.path.length - 1) c.pathI += 1;
    const wantAngle = Math.atan2(dx, dz);
    let da = wantAngle - c.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    c.angle += clamp(da, -dt * 2.2, dt * 2.2);
    c.speed = clamp(c.speed + 14 * dt, 0, c.topSpeed);
    c.x += Math.sin(c.angle) * c.speed * dt;
    c.z += Math.cos(c.angle) * c.speed * dt;
  }
  if (p.pathTimer > 2) p.pathTimer = 0;

  if (p.swat && !world.frozen) {
    const s = p.swat;
    const dx = world.car.x - s.x; const dz = world.car.z - s.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const wantAngle = Math.atan2(dx, dz);
    let da = wantAngle - s.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    s.angle += clamp(da, -dt * 1.6, dt * 1.6);
    s.speed = clamp(s.speed + 10 * dt, 0, s.topSpeed);
    s.x += Math.sin(s.angle) * s.speed * dt;
    s.z += Math.cos(s.angle) * s.speed * dt;
    if (d > 400) { s.x = world.car.x + 140; s.z = world.car.z + 140; }
  }

  // Helicopter: orbit above the car from wanted 3. In shot mode the
  // diorama is frozen, so the staged heli stays where the shot put
  // it (ahead-left, visible in the sky) instead of orbiting away.
  if (heliActive(w)) {
    if (!p.heli) p.heli = { x: world.car.x, z: world.car.z, y: 55, angle: 0, rotor: 0 };
    if (!world.frozen) {
      const h = p.heli;
      h.angle += dt * 0.5;
      h.x = world.car.x + Math.sin(h.angle) * 40;
      h.z = world.car.z + Math.cos(h.angle) * 40;
      h.y = 55;
      h.rotor += dt * 20;
    }
  } else {
    p.heli = null;
  }
  return p;
}

export function beamOnCar(p, world) {
  if (!p.heli) return false;
  return dist2(p.heli.x, p.heli.z, world.car.x, world.car.z) < 60;
}
