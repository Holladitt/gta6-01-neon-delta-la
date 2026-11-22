// NDPD officers: the named patrol units and the SWAT team.
// Pure data: callsigns, names, posts, and the roles they take in
// a pursuit. The dispatch panel reads this table.
import { DISPATCH_CALLSIGNS, SWAT_CALLSIGN } from './config.js';

export const OFFICERS = [
  { callsign: 'DELTA-7', name: 'Officer Reyes', post: 'Downtown', role: 'FLANKING' },
  { callsign: 'CORAL-3', name: 'Officer Park', post: 'Coral Pier', role: 'PURSUIT' },
  { callsign: 'CORAL-9', name: 'Officer Dunn', post: 'Marina', role: 'FLANKING' },
  { callsign: 'AIR-1', name: 'Pilot Vega', post: 'Air support', role: 'AIR UNIT' },
  { callsign: 'SWAT-1', name: 'Sgt. Marsh', post: 'Tactical', role: 'INTERCEPT' },
];

export function officerByCallsign(callsign) {
  return OFFICERS.find((o) => o.callsign === callsign) || null;
}

export function patrolOfficers() {
  return OFFICERS.filter((o) => o.callsign !== 'AIR-1' && o.callsign !== 'SWAT-1');
}

export function swatOfficer() {
  return officerByCallsign(SWAT_CALLSIGN);
}

export function airOfficer() {
  return officerByCallsign('AIR-1');
}

export function dispatchCallsigns() {
  return DISPATCH_CALLSIGNS.slice();
}
