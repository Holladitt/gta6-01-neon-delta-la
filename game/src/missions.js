// missions.js — mission scripting engine (pure).
// Steps: goto/deliver {x,z[,inCar]} | steal {kind} | visit {points} |
// chase | escape | survive {seconds}. A step completes, the engine
// advances; when the last step completes the mission is done.
import { MISSIONS } from './config.js';

const RADIUS = 14;

export function startMission(index) {
  return { index, def: MISSIONS[index], step: 0, status: 'active', timer: 0, visited: [] };
}

export function currentStep(m) {
  if (!m || m.status !== 'active') return null;
  return m.def.steps[m.step] || null;
}

function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function updateMission(m, dt, ctx) {
  if (!m || m.status !== 'active') return;
  const s = currentStep(m);
  if (!s) {
    m.status = 'done';
    return;
  }
  let done = false;
  if (s.type === 'goto' || s.type === 'deliver') {
    if (dist2(ctx.x, ctx.z, s.x, s.z) <= RADIUS * RADIUS && (!s.inCar || ctx.inCar)) done = true;
  } else if (s.type === 'steal') {
    if (ctx.inCar && ctx.stoleKind === s.kind) done = true;
  } else if (s.type === 'visit') {
    for (const p of s.points) {
      if (!m.visited.includes(p) && dist2(ctx.x, ctx.z, p[0], p[1]) <= RADIUS * RADIUS) m.visited.push(p);
    }
    if (m.visited.length >= s.points.length) done = true;
  } else if (s.type === 'chase') {
    if (ctx.chaseClose) {
      m.timer += dt;
      if (m.timer >= 20) done = true;
    }
  } else if (s.type === 'escape') {
    if ((ctx.wanted || 0) <= 0) done = true;
  } else if (s.type === 'survive') {
    m.timer += dt;
    if (m.timer >= (s.seconds || 30)) done = true;
  }
  if (done) {
    m.step += 1;
    m.timer = 0;
    m.visited = [];
    if (m.step >= m.def.steps.length) m.status = 'done';
  }
}
