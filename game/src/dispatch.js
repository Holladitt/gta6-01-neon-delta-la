// dispatch.js — NDPD dispatch panel data (browser).
// Units are built from live police positions: FLANKING for even-index
// cars, PURSUIT for odd-index cars, INTERCEPT for scripted cars, and
// AIR UNIT for the helicopter. Callsigns: DELTA-7, CORAL-3, CORAL-9, AIR-1.
import { DISPATCH_SIGNS } from './config.js';

export function buildDispatch(policeCars, heli, playerPos) {
  const units = [];
  policeCars.forEach((car, i) => {
    const role = car.scripted ? 'INTERCEPT' : (i % 2 === 0 ? 'FLANKING' : 'PURSUIT');
    const dx = car.x - playerPos.x, dz = car.z - playerPos.z;
    units.push({
      sign: DISPATCH_SIGNS[i % 3],
      role,
      dist: Math.round(Math.hypot(dx, dz)),
    });
  });
  if (heli) {
    const dx = heli.x - playerPos.x, dz = heli.z - playerPos.z;
    units.push({ sign: 'AIR-1', role: 'AIR UNIT', dist: Math.round(Math.hypot(dx, dz)) });
  }
  return units.slice(0, 4);
}
