// Crew abilities: Juno clears a star, Petra repairs for $150, Cassia overwatch.
import { CREW } from './config.js';

export function createCrewState() {
  const s = { overwatchUntil: 0 };
  for (const c of CREW) s[c.id] = { readyAt: 0 };
  return s;
}
export function crewById(id) { return CREW.find((c) => c.id === id); }
export function abilityReady(crew, id, now) { return now >= ((crew[id] && crew[id].readyAt) || 0); }
export function cooldownLeft(crew, id, now) { return Math.max(0, ((crew[id] && crew[id].readyAt) || 0) - now); }
export function overwatchActive(crew, now) { return now < (crew.overwatchUntil || 0); }
export function useAbility(crew, id, now, game) {
  if (!abilityReady(crew, id, now)) return { ok: false, reason: 'recharging' };
  if (id === 'juno') {
    if (game.wanted) game.wanted.level = Math.max(0, game.wanted.level - 1);
    crew.juno.readyAt = now + 45;
    return { ok: true, ability: 'CLEAN PLATES' };
  }
  if (id === 'petra') {
    if (game.money < 150) return { ok: false, reason: 'broke' };
    game.money -= 150;
    if (game.car) game.car.condition = 100;
    crew.petra.readyAt = now + 60;
    return { ok: true, ability: 'FIELD REPAIR' };
  }
  if (id === 'cassia') {
    crew.overwatchUntil = now + 20;
    crew.cassia.readyAt = now + 25;
    return { ok: true, ability: 'OVERWATCH' };
  }
  return { ok: false };
}
