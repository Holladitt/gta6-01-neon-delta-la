// Crew abilities (Juno / Petra / Cassia). Pure.
import { CREW } from './config.js';
export function createCrewState() {
  return { lastUsed: {}, overwatchUntil: 0 };
}
function crewDef(id) {
  return CREW.find((c) => c.id === id) || null;
}
export function abilityReady(crew, id, t) {
  const def = crewDef(id);
  if (!def) return false;
  const last = crew.lastUsed[id];
  if (last === undefined) return true;
  return t - last >= def.cooldown;
}
export function cooldownLeft(crew, id, t) {
  const def = crewDef(id);
  if (!def) return 0;
  const last = crew.lastUsed[id];
  if (last === undefined) return 0;
  return Math.max(0, def.cooldown - (t - last));
}
export function useAbility(crew, id, t, game) {
  const def = crewDef(id);
  if (!def) return { ok: false };
  if (!abilityReady(crew, id, t)) return { ok: false };
  if (id === 'juno') {
    if (game && game.wanted) game.wanted.level = Math.max(0, game.wanted.level - 1);
  } else if (id === 'petra') {
    if (!game || !game.car || game.money === undefined || game.money < 150) return { ok: false };
    game.money -= 150;
    game.car.condition = 100;
  } else if (id === 'cassia') {
    crew.overwatchUntil = t + 20;
  }
  crew.lastUsed[id] = t;
  return { ok: true };
}
export function overwatchActive(crew, t) {
  return t < crew.overwatchUntil;
}
