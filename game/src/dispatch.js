// dispatch.js — NDPD dispatch rows: callsigns, roles, AIR-1 and SWAT.
import { dist2 } from './rng.js';

export function callsigns() {
  return ['DELTA-7', 'CORAL-3', 'CORAL-9', 'AIR-1'];
}
export function roleFor(index, scripted) {
  if (scripted) return 'INTERCEPT';
  return index % 2 === 0 ? 'FLANKING' : 'PURSUIT';
}
export function buildDispatch(units, player, a, b, opts) {
  let heli = null;
  let options = opts;
  if (a && typeof a === 'object') {
    options = a;
    heli = null;
  } else if (typeof a === 'number' && typeof b === 'number') {
    heli = { x: a, z: b };
  }
  const rows = units.map((u, i) => ({
    callsign: callsigns()[i % 3],
    role: roleFor(i, !!u.scripted),
    distance: Math.round(dist2(player.x, player.z, u.x, u.z)),
    x: u.x,
    z: u.z,
  }));
  const h = heli || (options && options.heli) || { x: player.x, z: player.z - 60 };
  rows.push({
    callsign: 'AIR-1',
    role: 'AIR UNIT',
    distance: Math.round(dist2(player.x, player.z, h.x, h.z)),
    x: h.x,
    z: h.z,
  });
  if (options && options.level >= 5) {
    const swat = options.swat || { x: player.x + 40, z: player.z };
    rows.push({
      callsign: 'SWAT-1',
      role: 'SWAT',
      distance: Math.round(dist2(player.x, player.z, swat.x, swat.z)),
      x: swat.x,
      z: swat.z,
    });
  }
  return rows;
}
export function airRow(heli, a, b, lock) {
  let player = null;
  let lk = lock;
  if (a && typeof a === 'object') {
    player = a;
    lk = b;
  } else if (typeof a === 'number' && typeof b === 'number') {
    player = { x: a, z: b };
  }
  return {
    callsign: 'AIR-1',
    role: 'AIR UNIT',
    distance: player ? Math.round(dist2(player.x, player.z, heli.x, heli.z)) : 0,
    x: heli.x,
    z: heli.z,
    takedownIn: Math.max(0, 5 - (lk || 0)),
  };
}
export function swatRow(x, z, player) {
  if (!player) return null;
  return {
    callsign: 'SWAT-1',
    role: 'SWAT',
    distance: Math.round(dist2(player.x, player.z, x, z)),
    x,
    z,
  };
}
