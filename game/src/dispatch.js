// NDPD dispatch: callsigns, pursuit roles, AIR-1 and SWAT rows.
export function callsigns() { return ['DELTA-7', 'CORAL-3', 'CORAL-9', 'AIR-1']; }
export function roleFor(index, scripted) {
  if (scripted) return 'INTERCEPT';
  return index % 2 === 0 ? 'FLANKING' : 'PURSUIT';
}
export function buildDispatch(units, player, heliX, heliZ, wanted) {
  const rows = units.map((u, i) => ({
    callsign: callsigns()[i % 3],
    role: roleFor(i, u.scripted),
    distance: Math.round(Math.hypot(u.x - player.x, u.z - player.z)),
  }));
  rows.push({ callsign: 'AIR-1', role: 'AIR UNIT', distance: Math.round(Math.hypot(heliX - player.x, heliZ - player.z)) });
  if (wanted && wanted.level >= 5) rows.push({ callsign: 'SWAT-1', role: 'SWAT', distance: 0 });
  return rows;
}
export function airRow(heli, px, pz, takedownIn) {
  return { callsign: 'AIR-1', role: 'AIR UNIT', distance: Math.round(Math.hypot(heli.x - px, heli.z - pz)), takedownIn };
}
export function swatRow(x, z, swat) {
  if (!swat) return null;
  return { callsign: 'SWAT-1', role: 'SWAT', distance: Math.round(Math.hypot(swat.x - x, swat.z - z)) };
}
