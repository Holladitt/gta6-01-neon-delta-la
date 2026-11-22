// Wanted level 1-5 and the tactical police escalation.
// Heli from 3. Roadblocks (2 units) from 4. Black SWAT van at 5.
// Spike strips cap the car's speed for 5 s. AIR-1, the named air
// unit: when its spotlight holds on the car for 5 unbroken seconds
// it calls a takedown (wanted +1 and two more police cars spawn).
import { WANTED_MAX, HELI_WANTED, ROADBLOCK_WANTED, SWAT_WANTED, AIR_TAKEDOWN_SECONDS, SPIKE_SLOW_SECONDS } from './config.js';

export function createWanted() {
  return {
    level: 0, heat: 0, lastCrimeAt: -999,
    spikeUntil: 0, airHold: 0, takedowns: 0,
    roadblocks: [], swat: false, spikes: [],
  };
}

export function setWanted(w, level) {
  w.level = Math.max(0, Math.min(WANTED_MAX, level));
  return w.level;
}

export function addWanted(w, n, now) {
  w.level = Math.max(0, Math.min(WANTED_MAX, w.level + n));
  w.lastCrimeAt = now;
  return w.level;
}

export function decayWanted(w, dt, now) {
  if (w.level === 0) return w.level;
  w.heat += dt;
  if (w.heat >= 20 && now - w.lastCrimeAt > 20) {
    w.level = Math.max(0, w.level - 1);
    w.heat = 0;
  }
  return w.level;
}

export function heliActive(w) {
  return w.level >= HELI_WANTED;
}

export function roadblockCount(w) {
  return w.level >= ROADBLOCK_WANTED ? 2 : 0;
}

export function swatActive(w) {
  return w.level >= SWAT_WANTED;
}

export function dropSpike(w, x, z, now) {
  w.spikes.push({ x, z, at: now });
  if (w.spikes.length > 6) w.spikes.shift();
  return w.spikes.length;
}

export function hitSpike(w, x, z, now) {
  for (const s of w.spikes) {
    const dx = x - s.x; const dz = z - s.z;
    if (dx * dx + dz * dz < 6 * 6) {
      w.spikeUntil = now + SPIKE_SLOW_SECONDS;
      return true;
    }
  }
  return false;
}

export function spikeSlowed(w, now) {
  return now < w.spikeUntil;
}

// Call every tick with whether the heli beam is on the car.
// Returns 'takedown' once the hold reaches 5 seconds.
export function updateAirLock(w, dt, beamOn) {
  if (!beamOn) { w.airHold = 0; return null; }
  w.airHold += dt;
  if (w.airHold >= AIR_TAKEDOWN_SECONDS) {
    w.airHold = 0;
    w.takedowns += 1;
    return 'takedown';
  }
  return null;
}

export function policeCarCount(w) {
  return Math.min(2 + w.level * 2 + w.takedowns * 2, 12);
}
