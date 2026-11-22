// Wanted 0-5: heli at 3, roadblocks at 4, SWAT at 5, spikes, air takedown.
import { WANTED_MAX } from './config.js';

export function createWanted() { return { level: 0, spikes: [], spikeHitAt: -999, airLock: 0 }; }
export function setWanted(w, level) { w.level = Math.max(0, Math.min(WANTED_MAX, level)); return w.level; }
export function addWanted(w, n, now) { return setWanted(w, w.level + n); }
export function decayWanted(w, now) { return setWanted(w, w.level - 1); }
export function heliActive(w) { return w.level >= 3; }
export function roadblockCount(w) { return w.level >= 4 ? 2 : 0; }
export function swatActive(w) { return w.level >= 5; }
export function policeCarCount(w) { return 2 + w.level * 2; }
export function dropSpike(w, x, z, now) { w.spikes.push({ x, z, at: now }); return w.spikes.length; }
export function hitSpike(w, x, z, now) {
  for (const s of w.spikes) {
    if (now - s.at > 30) continue;
    if (Math.hypot(x - s.x, z - s.z) <= 4) { w.spikeHitAt = now; return true; }
  }
  return false;
}
export function spikeSlowed(w, now) { return now - w.spikeHitAt < 5; }
export function updateAirLock(w, dt, beamOn) {
  if (!beamOn) { w.airLock = 0; return null; }
  w.airLock += dt;
  if (w.airLock >= 5) { w.airLock = 0; return 'takedown'; }
  return null;
}
