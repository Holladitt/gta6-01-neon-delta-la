// crew.js — Juno (clean plates), Petra (field repair), Cassia (overwatch).
import { CREW } from './config.js';

export function createCrewState() {
  return { lastUsed: {}, overwatchUntil: 0 };
}
function crewDef(id) {
  return CREW.find((c) => c.id === id);
}
export function abilityReady(crew, id, now) {
  const def = crewDef(id);
  if (!def) return false;
  const last = crew.lastUsed[id];
  if (last === undefined) return true;
  return now - last >= def.cooldown;
}
export function cooldownLeft(crew, id, now) {
  const def = crewDef(id);
  if (!def) return 0;
  const last = crew.lastUsed[id];
  if (last === undefined) return 0;
  return Math.max(0, def.cooldown - (now - last));
}
export function overwatchActive(crew, now) {
  return now < crew.overwatchUntil;
}
export function useAbility(crew, id, now, game) {
  const def = crewDef(id);
  if (!def) return { ok: false, reason: 'unknown' };
  if (!abilityReady(crew, id, now)) return { ok: false, reason: 'recharging' };
  if (id === 'juno') {
    if (!game || !game.wanted) return { ok: false, reason: 'no-wanted' };
    game.wanted.level = Math.max(0, game.wanted.level - 1);
    crew.lastUsed[id] = now;
    return { ok: true };
  }
  if (id === 'petra') {
    if (!game || game.money === undefined || !game.car) return { ok: false, reason: 'no-game' };
    if (game.money < def.cost) return { ok: false, reason: 'broke' };
    game.money -= def.cost;
    game.car.condition = 100;
    crew.lastUsed[id] = now;
    return { ok: true };
  }
  if (id === 'cassia') {
    crew.overwatchUntil = now + def.duration;
    crew.lastUsed[id] = now;
    return { ok: true };
  }
  return { ok: false, reason: 'unknown' };
}
