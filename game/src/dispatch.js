// NDPD dispatch panel. Pure.
import { dist2 } from './rng.js';
export function callsigns() {
  return ['DELTA-7', 'CORAL-3', 'CORAL-9', 'AIR-1'];
}
export function roleFor(index, scripted) {
  if (scripted) return 'INTERCEPT';
  return index % 2 === 0 ? 'FLANKING' : 'PURSUIT';
}
// units: [{x, z, scripted}]; player: {x, z}; wanted: {level}
export function buildDispatch(units, player, x, z, wanted) {
  const px = player ? player.x : x;
  const pz = player ? player.z : z;
  const names = ['DELTA-7', 'CORAL-3', 'CORAL-9', 'DELTA-12', 'CORAL-5', 'DELTA-9'];
  const rows = units.map((u, i) => ({
    callsign: names[i % names.length],
    role: roleFor(i, !!u.scripted),
    distance: Math.round(dist2(u.x, u.z, px, pz)),
  }));
  rows.push({ callsign: 'AIR-1', role: 'AIR UNIT', distance: 45 });
  if (wanted && wanted.level >= 5) {
    rows.push({ callsign: 'SWAT-1', role: 'SWAT', distance: 60 });
  }
  return rows;
}
export function airRow(pos, x, z, takedownIn) {
  return {
    callsign: 'AIR-1',
    role: 'AIR UNIT',
    distance: Math.round(dist2(pos.x, pos.z, x, z)),
    takedownIn,
  };
}
export function swatRow(x, z, swat) {
  if (!swat) return null;
  return { callsign: 'SWAT-1', role: 'SWAT', distance: Math.round(dist2(swat.x, swat.z, x, z)) };
}
