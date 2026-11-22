// Mission scripting engine (pure). Data-driven steps; main.js feeds it
// a context {x, z, inCar, stoleKind, wanted, chaseClose, speed, wrecked}
// every frame.
import { MISSIONS, SIDE_JOBS } from './config.js';

export function startMission(idx) {
  const def = MISSIONS[idx];
  if (!def) return null;
  return {
    def,
    idx,
    step: 0,
    status: 'active',
    visited: new Set(),
    chaseT: 0,
    surviveT: 0,
    dialog: def.brief,
    events: [],
  };
}

export function currentStep(m) {
  return m.def.steps[m.step];
}

export function stepText(m) {
  const s = currentStep(m);
  return s ? s.text : '';
}

// Stage view over the mission's steps (pure grouping — never changes the
// engine). Returns {index (0-based), total, title, done, totalSteps, next}.
// done counts completed steps inside the current stage; for a visit step
// it counts visited points. next = text of the following step, or null.
export function stageOf(m) {
  const stages = m.def.stages || [{ title: m.def.name, steps: m.def.steps.map((_, i) => i) }];
  let si = 0;
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].steps.includes(m.step)) {
      si = i;
      break;
    }
    si = i;
  }
  const stage = stages[si];
  let done = 0;
  let totalSteps = stage.steps.length;
  for (const sIdx of stage.steps) {
    if (sIdx < m.step) done++;
    else if (sIdx === m.step) {
      const s = m.def.steps[sIdx];
      if (s.type === 'visit') {
        done += m.visited.size;
        totalSteps = stage.steps.length - 1 + s.points.length;
      }
    }
  }
  const nextStep = m.def.steps[m.step + 1];
  return {
    index: si,
    total: stages.length,
    title: stage.title,
    done,
    totalSteps,
    next: nextStep ? nextStep.text : null,
  };
}

function dist(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function updateMission(m, dt, ctx) {
  m.events.length = 0;
  if (!m || m.status !== 'active') return m.events;
  const s = currentStep(m);
  if (!s) {
    complete(m);
    return m.events;
  }
  switch (s.type) {
    case 'goto':
    case 'deliver': {
      if (s.inCar && !ctx.inCar) break;
      if (dist(ctx.x, ctx.z, s.x, s.z) <= s.r) nextStep(m);
      break;
    }
    case 'steal': {
      if (ctx.stoleKind === s.kind) {
        ctx.stoleKind = null;
        nextStep(m);
      }
      break;
    }
    case 'visit': {
      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i];
        if (!m.visited.has(i) && dist(ctx.x, ctx.z, p[0], p[1]) <= s.r) {
          m.visited.add(i);
          m.events.push({ type: 'dialog', text: `Point ${m.visited.size}/${s.points.length} checked.` });
        }
      }
      if (m.visited.size >= s.points.length) nextStep(m);
      break;
    }
    case 'chase': {
      if (ctx.chaseClose) {
        m.chaseT += dt;
        if (m.chaseT >= s.seconds) nextStep(m);
      }
      break;
    }
    case 'escape': {
      if (ctx.wanted === 0) nextStep(m);
      break;
    }
    case 'survive': {
      m.surviveT += dt;
      if (m.surviveT >= (s.seconds || 30)) nextStep(m);
      break;
    }
    default:
      break;
  }
  return m.events;
}

function nextStep(m) {
  m.step += 1;
  m.chaseT = 0;
  m.surviveT = 0;
  if (m.step >= m.def.steps.length) {
    complete(m);
    return;
  }
  m.dialog = currentStep(m).text;
  m.events.push({ type: 'step', text: m.dialog });
}

function complete(m) {
  m.status = 'done';
  m.events.push({ type: 'complete', reward: m.def.reward, name: m.def.name });
}

// Side jobs: generated one-off missions with the same engine shape.
export function startSideJob(kind, rng, spots) {
  const def = SIDE_JOBS.find((j) => j.id === kind);
  if (!def) return null;
  const pick = spots[Math.floor(rng() * spots.length)];
  const drop = spots[Math.floor(rng() * spots.length)];
  let steps;
  if (kind === 'taxi') {
    steps = [
      { type: 'goto', x: pick[0], z: pick[1], r: 10, text: 'Pick up the passenger.' },
      { type: 'deliver', x: drop[0], z: drop[1], r: 12, text: 'Drop the passenger off.', inCar: true },
    ];
  } else if (kind === 'delivery') {
    steps = [
      { type: 'deliver', x: drop[0], z: drop[1], r: 12, text: 'Deliver the package.', inCar: true },
    ];
  } else if (kind === 'vigilante') {
    steps = [
      { type: 'goto', x: pick[0], z: pick[1], r: 16, text: 'Find the target car.' },
      { type: 'survive', seconds: 12, text: 'Wreck the target car!' },
    ];
  } else {
    steps = [
      { type: 'goto', x: pick[0], z: pick[1], r: 12, text: 'Reach the stunt ramp.' },
      { type: 'survive', seconds: 6, text: 'Hit the ramp at full speed!' },
    ];
  }
  return {
    def: { id: kind, name: def.name, brief: def.text, steps, reward: def.reward },
    idx: -1,
    step: 0,
    status: 'active',
    visited: new Set(),
    chaseT: 0,
    surviveT: 0,
    dialog: def.text,
    events: [],
  };
}
