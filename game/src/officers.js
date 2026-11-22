// NDPD patrol officers by callsign.
const OFFICERS = [
  { callsign: 'DELTA-7', name: 'Officer Reyes', role: 'FLANKING' },
  { callsign: 'CORAL-3', name: 'Officer Marsh', role: 'PURSUIT' },
  { callsign: 'CORAL-9', name: 'Officer Doyle', role: 'INTERCEPT' },
];
export function officerByCallsign(c) { return OFFICERS.find((o) => o.callsign === c); }
export function patrolOfficers() { return [...OFFICERS]; }
