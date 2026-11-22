// wanted.js — wanted 1-5, heli, roadblocks, SWAT, spikes, AIR-1 takedown.
import { WANTED_MAX } from './config.js';
import { clamp } from './rng.js';

export function createWanted() {
  return { level: 0, spikes: [], slowedUntil: 0, airLock: 0, lastCrime: 0 };
}
export function setWanted(w, n) {
  w.level = clamp(Math.round(n), 0, WANTED_MAX);
  return w.level;
}
export function addWanted(w, n, now) {
  if (now !== undefined) w.lastCrime = now;
  return setWanted(w, w.level + n);
}
export function decayWanted(w, dt, now) {
  if (w.level <= 0) return w.level;
  if (now - w.lastCrime > 60) {
    w.level = Math.max(0, w.level - dt / 30);
    w.level = Math.floor(w.level);
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
  return 2 + w.level * 2;
}
export function dropSpike(w, x, z, now) {
  w.spikes.push({ x, z, at: now });
  return true;
}
export function hitSpike(w, x, z, now) {
  for (let i = 0; i < w.spikes.length; i += 1) {
    const s = w.spikes[i];
    const dx = x - s.x;
    const dz = z - s.z;
    if (dx * dx + dz * dz < 36) {
      w.spikes.splice(i, 1);
      w.slowedUntil = now + 5;
      return true;
    }
  }
  return false;
}
export function spikeSlowed(w, now) {
  return now < w.slowedUntil;
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
