// NDPD dispatch panel data (pure). Every row is built from live state:
// unit positions come from the real police cars, distances are real meters,
// roles match the behavior the code actually runs (flanking cars aim at an
// offset node, pursuit cars aim straight at the player, staged cruisers hold
// an intercept offset, the helicopter orbits). Nothing is invented.
import { CALLSIGNS } from './config.js';

// Role of one patrol car. index = position in the live police list.
// police.js: even-index cars aim at a node offset from the player (flank),
// odd-index cars aim straight at the player (pursuit).
export function unitRole(car, index) {
  if (car.script) return 'INTERCEPT';
  return index % 2 === 0 ? 'FLANKING' : 'PURSUIT';
}

export function buildDispatch({ cars, heli, px, pz, wanted, crime, seen }) {
  if (!wanted || wanted <= 0) return null;
  const units = cars.slice(0, 4).map((c, i) => ({
    callsign: c.callsign || CALLSIGNS[i % CALLSIGNS.length],
    role: unitRole(c, i),
    dist: Math.round(Math.hypot(c.x - px, c.z - pz)),
  }));
  if (heli) {
    units.push({
      callsign: 'AIR-1',
      role: 'AIR UNIT',
      dist: Math.round(Math.hypot(heli.x - px, heli.z - pz)),
    });
  }
  return {
    code: wanted,
    crime: crime || 'EVADING POLICE',
    status: seen ? 'IN PURSUIT' : 'SEARCHING',
    units,
    more: Math.max(0, cars.length - 4),
  };
}
