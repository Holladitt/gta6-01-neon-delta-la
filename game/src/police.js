// police.js — NDPD presence scales with the wanted level.
import { policeCarCount, roadblockCount, heliActive, swatActive } from './wanted.js';
import { dist2 } from './rng.js';
import { callsigns } from './dispatch.js';

export function createPolice() {
  return { cars: [], heli: null, swat: null, roadblocks: [] };
}
export function beamOnCar(pol, world) {
  if (!pol.heli || !world) return false;
  const target = (world.car && world.car.x !== undefined) ? world.car : world.player;
  if (!target) return false;
  return dist2(pol.heli.x, pol.heli.z, target.x, target.z) < 40;
}
export function updatePolice(pol, world, dt, time) {
  const level = world && world.wanted ? world.wanted.level : (typeof world === 'number' ? world : 0);
  const player = (world && world.player) || { x: 0, z: 0 };
  const px = player.x;
  const pz = player.z;
  const want = policeCarCount({ level });
  while (pol.cars.length < want) {
    const i = pol.cars.length;
    pol.cars.push({
      x: px + 60 + i * 30, z: pz - 40 - i * 20,
      callsign: callsigns()[i % 3], role: i % 2 === 0 ? 'FLANKING' : 'PURSUIT',
    });
  }
  pol.cars.length = want;
  for (let i = 0; i < pol.cars.length; i += 1) {
    const c = pol.cars[i];
    const dx = px - c.x;
    const dz = pz - c.z;
    const d = Math.hypot(dx, dz) || 1;
    const sp = 14 * (dt || 0.016);
    c.x += (dx / d) * sp;
    c.z += (dz / d) * sp;
  }
  const rb = roadblockCount({ level });
  while (pol.roadblocks.length < rb) {
    pol.roadblocks.push({ x: px, z: pz - 60 - pol.roadblocks.length * 30 });
  }
  pol.roadblocks.length = rb;
  pol.heli = heliActive({ level }) ? { x: px, y: 28, z: pz - 10 } : null;
  pol.swat = swatActive({ level }) ? { x: px + 40, z: pz - 30, callsign: 'SWAT-1' } : null;
  return pol;
}
