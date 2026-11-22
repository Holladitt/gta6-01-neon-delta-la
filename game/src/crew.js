// Crew abilities for Neon Delta LA.
// Juno Reyes (driver): CLEAN PLATES [C] lowers wanted by 1, 45s cooldown.
// Petra Hale (mechanic): FIELD REPAIR [V] costs exactly $150 and restores
// the car condition to 100%, 60s cooldown; a use while recharging is
// refused and the money stays unchanged. Cassia Wren (lookout):
// OVERWATCH [X] lasts 20 seconds, 25s cooldown.
import { CREW } from './config.js';

export function createCrewState() {
  const lastUsed = {};
  for (const c of CREW) lastUsed[c.id] = -1e9;
  return { lastUsed, overwatchUntil: -1e9 };
}

export function crewMember(id) {
  return CREW.find((c) => c.id === id) || null;
}

export function abilityReady(crew, id, now) {
  const m = crewMember(id);
  if (!m) return false;
  return now - crew.lastUsed[id] >= m.cooldown;
}

export function cooldownLeft(crew, id, now) {
  const m = crewMember(id);
  if (!m) return 0;
  return Math.max(0, m.cooldown - (now - crew.lastUsed[id]));
}

export function useAbility(crew, id, now, game) {
  const m = crewMember(id);
  if (!m) return { ok: false, reason: 'unknown' };
  if (!abilityReady(crew, id, now)) return { ok: false, reason: 'recharging' };
  if (id === 'juno') {
    crew.lastUsed[id] = now;
    if (game && game.wanted) game.wanted.level = Math.max(0, game.wanted.level - 1);
    return { ok: true, ability: 'CLEAN PLATES' };
  }
  if (id === 'petra') {
    if (!game || game.money < 150) return { ok: false, reason: 'broke' };
    game.money -= 150;
    if (game.car) game.car.condition = 100;
    crew.lastUsed[id] = now;
    return { ok: true, ability: 'FIELD REPAIR', cost: 150 };
  }
  if (id === 'cassia') {
    crew.lastUsed[id] = now;
    crew.overwatchUntil = now + 20;
    return { ok: true, ability: 'OVERWATCH' };
  }
  return { ok: false, reason: 'unknown' };
}

export function overwatchActive(crew, now) {
  return now < crew.overwatchUntil;
}
