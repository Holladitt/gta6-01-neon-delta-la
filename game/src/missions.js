// Mission engine: starts a mission, tracks its current step, and advances
// the step when the player meets its condition. Each step is one verb:
// reach a point, deliver in a car, steal a kind of car, touch every point,
// stay close for a while, lose the heat, or hold out for a while.

import { MISSIONS } from './config.js';

const REACH_RADIUS = 10;
const VISIT_RADIUS = 12;

export function startMission(index) {
  const def = MISSIONS[index];
  return { index, def, step: 0, status: 'active', timer: 0, visited: new Set() };
}

export function currentStep(m) {
  if (!m || m.status !== 'active') return null;
  return m.def.steps[m.step] || null;
}

function distance(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function updateMission(m, dt, ctx) {
  if (!m || m.status !== 'active') return m;
  const s = currentStep(m);
  if (!s) {
    m.status = 'done';
    return m;
  }
  let finished = false;
  if (s.type === 'goto' || s.type === 'deliver') {
    const inRange = distance(ctx.x, ctx.z, s.x, s.z) < REACH_RADIUS;
    if (inRange && (!s.inCar || ctx.inCar)) finished = true;
  } else if (s.type === 'steal') {
    if (ctx.inCar && ctx.stoleKind === s.kind) finished = true;
  } else if (s.type === 'visit') {
    for (const p of s.points) {
      if (distance(ctx.x, ctx.z, p[0], p[1]) < VISIT_RADIUS) {
        m.visited.add(p.join(','));
      }
    }
    if (m.visited.size >= s.points.length) finished = true;
  } else if (s.type === 'chase') {
    if (ctx.chaseClose) m.timer += dt;
    if (m.timer >= (s.seconds || 20)) finished = true;
  } else if (s.type === 'escape') {
    if ((ctx.wanted || 0) === 0) finished = true;
  } else if (s.type === 'survive') {
    m.timer += dt;
    if (m.timer >= (s.seconds || 30)) finished = true;
  }
  if (finished) {
    m.step += 1;
    m.timer = 0;
    m.visited = new Set();
    if (m.step >= m.def.steps.length) m.status = 'done';
  }
  return m;
}
