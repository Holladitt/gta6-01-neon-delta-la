// NDPD patrol officers. Pure.
const OFFICERS = [
  { callsign: 'DELTA-7', name: 'Officer Reyes', role: 'FLANKING' },
  { callsign: 'CORAL-3', name: 'Officer Park', role: 'PURSUIT' },
  { callsign: 'CORAL-9', name: 'Officer Diaz', role: 'INTERCEPT' },
  { callsign: 'DELTA-12', name: 'Officer Kim', role: 'PURSUIT' },
  { callsign: 'AIR-1', name: 'Pilot Vega', role: 'AIR UNIT' },
];
export function officerByCallsign(callsign) {
  return OFFICERS.find((o) => o.callsign === callsign) || null;
}
export function patrolOfficers() {
  return OFFICERS.slice(0, 3);
}
