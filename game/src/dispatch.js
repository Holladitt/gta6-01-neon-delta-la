// NDPD dispatch panel data: unit callsigns, roles, and distances
// from live police positions. Roles are FLANKING for even-index
// cars, PURSUIT for odd-index cars, INTERCEPT for scripted cars,
// AIR UNIT for the helicopter. SWAT-1 joins at wanted 5; AIR-1
// calls a takedown when its beam holds the car for 5 seconds.
import { DISPATCH_CALLSIGNS, SWAT_CALLSIGN, AIR_UNIT_NAME } from './config.js';
import { dist2 } from './rng.js';

export function callsigns() {
  return DISPATCH_CALLSIGNS.slice();
}

export function roleFor(index, scripted) {
  if (scripted) return 'INTERCEPT';
  return index % 2 === 0 ? 'FLANKING' : 'PURSUIT';
}

export function buildDispatch(units, heli, px, pz, wanted, swat) {
  const rows = [];
  units.forEach((u, i) => {
    rows.push({
      callsign: DISPATCH_CALLSIGNS[i % 3],
      role: roleFor(i, !!u.scripted),
      distance: Math.round(dist2(u.x, u.z, px, pz)),
      unit: u.swat ? SWAT_CALLSIGN : null,
    });
  });
  if (wanted.level >= 5) {
    rows.push({
      callsign: SWAT_CALLSIGN, role: 'INTERCEPT',
      distance: swat ? Math.round(dist2(swat.x, swat.z, px, pz)) : 0,
      unit: SWAT_CALLSIGN,
    });
  }
  if (heli) {
    rows.push({
      callsign: AIR_UNIT_NAME, role: 'AIR UNIT',
      distance: Math.round(dist2(heli.x, heli.z, px, pz)), unit: AIR_UNIT_NAME,
    });
  }
  return rows;
}

export function airRow(heli, px, pz, holdSeconds) {
  if (!heli) return null;
  return {
    callsign: AIR_UNIT_NAME, role: 'AIR UNIT',
    distance: Math.round(dist2(heli.x, heli.z, px, pz)),
    beamHold: Math.round(holdSeconds * 10) / 10,
    takedownIn: Math.max(0, 5 - holdSeconds),
  };
}

export function swatRow(px, pz, swat) {
  if (!swat) return null;
  return {
    callsign: SWAT_CALLSIGN, role: 'INTERCEPT',
    distance: swat ? Math.round(dist2(swat.x, swat.z, px, pz)) : 0,
    unit: SWAT_CALLSIGN,
  };
}
