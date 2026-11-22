// NDPD dispatch panel for Neon Delta LA.
// Unit callsigns DELTA-7, CORAL-3, CORAL-9 and the air unit AIR-1.
// Even-index cars flank, odd-index cars pursue, scripted cars
// intercept. At wanted 5 a SWAT-1 row joins the panel.
import { dist2 } from './rng.js';

export function callsigns() {
  return ['DELTA-7', 'CORAL-3', 'CORAL-9', 'AIR-1'];
}

export function roleFor(index, scripted) {
  if (scripted) return 'INTERCEPT';
  return index % 2 === 0 ? 'FLANKING' : 'PURSUIT';
}

export function buildDispatch(units, player, x, z, wanted) {
  const px = player && player.x !== undefined ? player.x : x;
  const pz = player && player.z !== undefined ? player.z : z;
  const names = ['DELTA-7', 'CORAL-3', 'CORAL-9'];
  const rows = [];
  units.forEach((u, i) => {
    rows.push({
      callsign: names[i % names.length],
      role: roleFor(i, !!u.scripted),
      distance: Math.round(dist2(px, pz, u.x, u.z)),
      x: u.x,
      z: u.z,
    });
  });
  const level = wanted ? wanted.level : 0;
  if (level >= 5) {
    rows.push({ callsign: 'SWAT-1', role: 'INTERCEPT', distance: Math.round(dist2(px, pz, px + 60, pz + 40)), x: px + 60, z: pz + 40 });
  }
  rows.push({ callsign: 'AIR-1', role: 'AIR UNIT', distance: 0, x: px, z: pz });
  return rows;
}

export function airRow(helicopter, px, pz, takedownIn) {
  return {
    callsign: 'AIR-1',
    role: 'AIR UNIT',
    distance: Math.round(dist2(px, pz, helicopter.x, helicopter.z)),
    takedownIn,
  };
}

export function swatRow(x, z, swat) {
  if (!swat) return null;
  return { callsign: 'SWAT-1', role: 'INTERCEPT', distance: Math.round(dist2(x, z, swat.x, swat.z)), x: swat.x, z: swat.z };
}
