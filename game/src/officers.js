// officers.js — NDPD officers behind the dispatch callsigns.
export const OFFICERS = [
  { callsign: 'DELTA-7', name: 'Officer Reyes', unit: 'patrol', district: 'downtown' },
  { callsign: 'CORAL-3', name: 'Officer Park', unit: 'patrol', district: 'venice' },
  { callsign: 'CORAL-9', name: 'Officer Diaz', unit: 'patrol', district: 'marina' },
  { callsign: 'AIR-1', name: 'Pilot Vega', unit: 'air', district: 'downtown' },
  { callsign: 'SWAT-1', name: 'Sergeant Cole', unit: 'swat', district: 'port' },
];
export function officerByCallsign(callsign) {
  return OFFICERS.find((o) => o.callsign === callsign);
}
export function patrolOfficers() {
  return OFFICERS.filter((o) => o.unit === 'patrol').slice(0, 3);
}
