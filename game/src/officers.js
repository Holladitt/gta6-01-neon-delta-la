// NDPD officers for Neon Delta LA.
const OFFICERS = [
  { callsign: 'DELTA-7', name: 'Officer Reyes', role: 'FLANKING', district: 'downtown' },
  { callsign: 'CORAL-3', name: 'Officer Park', role: 'PURSUIT', district: 'pier' },
  { callsign: 'CORAL-9', name: 'Officer Diaz', role: 'INTERCEPT', district: 'port' },
  { callsign: 'AIR-1', name: 'Pilot Vega', role: 'AIR UNIT', district: 'downtown' },
  { callsign: 'SWAT-1', name: 'Sergeant Cole', role: 'INTERCEPT', district: 'port' },
];

export function officerByCallsign(callsign) {
  return OFFICERS.find((o) => o.callsign === callsign) || OFFICERS[0];
}

export function patrolOfficers() {
  return OFFICERS.slice(0, 3);
}
