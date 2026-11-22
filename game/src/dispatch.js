// NDPD dispatch panel: which unit is doing what, and how far away it is.
// Roles are fixed by the car's place in the pursuit; distances are real
// metres measured from the live police positions.

import { CALLSIGNS } from './config.js';

export function unitRole(car, index) {
  if (car.script) return 'INTERCEPT';
  return index % 2 === 0 ? 'FLANKING' : 'PURSUIT';
}

export function buildDispatch({ cars, heli, px, pz, wanted, crime, seen }) {
  if (!wanted || wanted <= 0) return null;
  const units = cars.slice(0, 4).map((car, i) => ({
    callsign: car.callsign || CALLSIGNS[i % CALLSIGNS.length],
    role: unitRole(car, i),
    dist: Math.round(Math.hypot(car.x - px, car.z - pz)),
  }));
  if (heli) {
    units.push({
      callsign: 'AIR-1',
      role: 'AIR UNIT',
      dist: Math.round(Math.hypot(heli.x - px, heli.z - pz)),
    });
  }
  const extra = Math.max(0, cars.length - 4);
  return {
    code: wanted,
    crime: crime || 'EVADING POLICE',
    status: seen ? 'IN PURSUIT' : 'SEARCHING',
    units,
    more: extra,
  };
}
