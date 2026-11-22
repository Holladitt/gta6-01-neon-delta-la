// Crew of three, each with one ability on a key.
// CLEAN PLATES [C] lowers wanted by 1 (45 s cooldown).
// FIELD REPAIR [V] costs exactly 150 and restores condition to 100%
// (60 s cooldown; while recharging a second use is refused, money
// stays unchanged, and a toast says it is recharging).
// OVERWATCH [X] lasts 20 s with a 25 s cooldown.
import { CREW } from './config.js';

export function createCrewState() {
  const s = { cooldowns: {}, overwatchUntil: 0 };
  for (const c of CREW) s.cooldowns[c.id] = 0;
  return s;
}

export function crewMember(id) {
  return CREW.find((c) => c.id === id) || null;
}

export function abilityReady(crew, id, now) {
  return (crew.cooldowns[id] || 0) <= now;
}

export function cooldownLeft(crew, id, now) {
  return Math.max(0, (crew.cooldowns[id] || 0) - now);
}

export function useAbility(crew, id, now, game) {
  const c = crewMember(id);
  if (!c) return { ok: false, reason: 'no such crew' };
  if (!abilityReady(crew, id, now)) {
    return { ok: false, reason: 'recharging', left: cooldownLeft(crew, id, now) };
  }
  if (id === 'juno') {
    crew.cooldowns.juno = now + c.cooldown;
    game.wanted.level = Math.max(0, game.wanted.level - 1);
    return { ok: true, reason: 'clean plates', wanted: game.wanted.level };
  }
  if (id === 'petra') {
    if (game.money < c.cost) return { ok: false, reason: 'not enough money' };
    game.money -= c.cost;
    game.car.condition = 100;
    crew.cooldowns.petra = now + c.cooldown;
    return { ok: true, reason: 'field repair', money: game.money };
  }
  if (id === 'cassia') {
    crew.cooldowns.cassia = now + c.cooldown;
    crew.overwatchUntil = now + c.duration;
    return { ok: true, reason: 'overwatch', until: crew.overwatchUntil };
  }
  return { ok: false, reason: 'unknown ability' };
}

export function overwatchActive(crew, now) {
  return now < crew.overwatchUntil;
}
