// Wanted level for Neon Delta LA: 0 to 5.
// Helicopter AIR-1 from level 3, two roadblocks at 4, a black SWAT van
// at 5. Police drop spike strips; driving over one caps the car speed
// for 5 seconds. AIR-1 calls a takedown when its spotlight holds on the
// car for 5 unbroken seconds (wanted +1, two more police cars).
import { WANTED_MAX } from './config.js';

export function createWanted() {
  return { level: 0, spikes: [], airLock: 0, lastSpikeHit: -1e9, lastCrime: -1e9 };
}

export function setWanted(w, level) {
  w.level = Math.max(0, Math.min(WANTED_MAX, level));
  return w.level;
}

export function addWanted(w, amount, now) {
  if (now !== undefined) w.lastCrime = now;
  return setWanted(w, w.level + amount);
}

export function decayWanted(w, dt, now) {
  if (w.level <= 0) return w.level;
  if (now - w.lastCrime > 30) {
    w.decayAcc = (w.decayAcc || 0) + dt;
    if (w.decayAcc >= 30) {
      w.decayAcc = 0;
      w.level = Math.max(0, w.level - 1);
    }
  } else {
    w.decayAcc = 0;
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
  return Math.min(12, 2 + w.level * 2);
}

export function dropSpike(w, x, z, now) {
  w.spikes.push({ x, z, t: now });
  if (w.spikes.length > 6) w.spikes.shift();
}

export function hitSpike(w, x, z, now) {
  for (const s of w.spikes) {
    if (now - s.t > 30) continue;
    const dx = x - s.x;
    const dz = z - s.z;
    if (dx * dx + dz * dz <= 36) {
      w.lastSpikeHit = now;
      return true;
    }
  }
  return false;
}

export function spikeSlowed(w, now) {
  return now - w.lastSpikeHit <= 5;
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
