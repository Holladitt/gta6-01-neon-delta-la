// Wanted level, spike strips, AIR-1 spotlight lock. Pure.
import { WANTED_MAX } from './config.js';
export function createWanted() {
  return { level: 0, heat: 0, spikes: [], slowedUntil: 0, airLock: 0, decayTimer: 0 };
}
export function setWanted(w, level) {
  w.level = Math.max(0, Math.min(WANTED_MAX, level));
  return w.level;
}
export function addWanted(w, amount, heat) {
  if (heat !== undefined) w.heat = heat;
  return setWanted(w, w.level + amount);
}
export function decayWanted(w, dt) {
  w.decayTimer += dt;
  if (w.decayTimer >= 30 && w.level > 0) {
    w.level -= 1;
    w.decayTimer = 0;
  }
  return w.level;
}
export function heliActive(w) {
  return w.level >= 3;
}
export function roadblockCount(w) {
  return w.level >= 4 ? 2 : 0;
}
export function swatActive(w) {
  return w.level >= 5;
}
export function policeCarCount(w) {
  return 2 + 2 * w.level;
}
export function dropSpike(w, x, z, t) {
  w.spikes.push({ x, z, t });
  return w.spikes.length;
}
export function hitSpike(w, x, z, t) {
  for (const s of w.spikes) {
    if (Math.hypot(x - s.x, z - s.z) <= 3 && t - s.t <= 10) {
      w.slowedUntil = t + 5;
      return true;
    }
  }
  return false;
}
export function spikeSlowed(w, t) {
  return t < w.slowedUntil;
}
export function updateAirLock(w, dt, beamOn) {
  if (!beamOn) {
    w.airLock = 0;
    return null;
  }
  w.airLock += dt;
  if (w.airLock >= 5) {
    w.airLock = 0;
    return 'takedown';
  }
  return null;
}
