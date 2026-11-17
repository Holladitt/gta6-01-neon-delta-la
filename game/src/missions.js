// The mission scripting engine: missions and side jobs are data, not code.
// Each step has a line of HUD dialogue, a GPS waypoint, a trigger radius and a
// kind — goto, interact, escape, board, shoot — plus an optional time limit.
// The engine advances steps, pays the reward on a win and names the failure.
// Screen states (title/play/paused/busted) stay separate from mission progress:
// a mission can be failed, retried or abandoned without touching the screen.
export const MISSIONS = [
  {
    id: 1, title: 'RETURN TO LA', reward: 400,
    briefing: 'Mara Solano is back. Her sister is gone — and the city is watching.',
    steps: [
      { say: 'Mara: I need wheels. Take any car on the street — press F next to one.', x: 700, y: 650, r: 90, kind: 'steal' },
      { say: 'Mara: That was too easy. Lose the patrols and reach the safehouse.', x: 1100, y: 650, r: 90, kind: 'goto' },
      { say: 'Mara: My sister left a note here. Somebody in the port knows something.', x: 1100, y: 1000, r: 80, kind: 'interact' },
    ],
  },
  {
    id: 2, title: 'MIDNIGHT CARGO', reward: 800,
    briefing: 'A container truck in Long Beach is carrying more than freight.',
    steps: [
      { say: 'Contact: The truck is parked at the docks. Take it — quietly.', x: 600, y: 1750, r: 90, kind: 'stealTruck' },
      { say: 'Mara: They know it is gone. Drive the truck to the garage, fast.', x: 700, y: 1000, r: 100, kind: 'goto', time: 75 },
      { say: 'Contact: The manifest names the port boss. This is bigger than us.', x: 700, y: 1000, r: 80, kind: 'interact' },
    ],
  },
  {
    id: 3, title: 'FESTIVAL OF LIGHTS', reward: 1000,
    briefing: 'An officials’ party in Hollywood Hills — and a boat waiting at the Marina.',
    steps: [
      { say: 'Mara: The party is up the hill. Walk in like you belong there.', x: 450, y: 750, r: 80, kind: 'interact' },
      { say: 'Mara: Got the guest list. Now run — the Marina boat is our way out.', x: 2100, y: 1600, r: 100, kind: 'board' },
      { say: 'Mara: Full throttle across the water. Do not stop for anyone.', x: 2400, y: 1450, r: 110, kind: 'goto', time: 60 },
    ],
  },
  {
    id: 4, title: 'CANAL CROSSING', reward: 900,
    briefing: 'A shootout on the wooden bridge over the Venice canals.',
    steps: [
      { say: 'Mara: They are waiting on the bridge. Take out their cars.', x: 1285, y: 1000, r: 140, kind: 'shoot', count: 2 },
      { say: 'Mara: Bridge is clear. Cross to the other side.', x: 1500, y: 1000, r: 90, kind: 'goto' },
    ],
  },
  {
    id: 5, title: 'LAST BRIDGE', reward: 1100,
    briefing: 'Lose the police, then cross Sunset Bridge. One clean run.',
    steps: [
      { say: 'Mara: Break line of sight. Swap cars or hide until the stars fade.', x: 1285, y: 650, r: 60, kind: 'escape' },
      { say: 'Mara: Clear. Cross Sunset Bridge — and do not look back.', x: 1500, y: 650, r: 90, kind: 'goto' },
    ],
  },
  {
    id: 6, title: 'THE BURNING CITY', reward: 2000,
    briefing: 'The proof goes public tonight — or the command post burns with it.',
    steps: [
      { say: 'Mara: The command post holds the original files. Get inside.', x: 400, y: 300, r: 90, kind: 'interact' },
      { say: 'Mara: Uploading the proof now. Hold the plaza while it sends.', x: 400, y: 300, r: 110, kind: 'hold', time: 20 },
      { say: 'Mara: It is out. Every screen in the city just saw the truth.', x: 700, y: 300, r: 90, kind: 'goto' },
    ],
  },
];

// Side jobs, repeatable from free roam. Each pays cash; each teaches one system.
export const JOBS = [
  { id: 'singer', title: 'CLUB SINGER', pay: 300, say: 'Singer: Take me to the club downtown — and do not scratch the paint.', x: 2100, y: 500, tx: 900, ty: 500 },
  { id: 'recover', title: 'RECOVERED RIDE', pay: 350, say: 'Garage: A stolen sedan is dumped by the pier. Bring it home.', x: 1900, y: 1350, tx: 700, ty: 1000 },
  { id: 'market', title: 'NIGHT MARKET', pay: 250, say: 'Trader: Move this crate to the night market. Keep it quiet.', x: 1500, y: 1350, tx: 1500, ty: 1350 },
  { id: 'race', title: 'CANAL RACE', pay: 400, say: 'Racer: First boat through the three buoys wins the pot.', x: 2100, y: 1600, tx: 2400, ty: 1450 },
];

export function missionAt(state) { return MISSIONS[state.missionIndex] || null; }

// Start a mission: reset its steps, show the briefing, switch the game mode
// to mission (free-roam stays available between missions).
export function startMission(state, index) {
  const m = MISSIONS[index];
  if (!m) return false;
  state.missionIndex = index;
  state.missionStep = 0;
  state.missionTimer = 0;
  state.missionFailed = false;
  state.missionDone = false;
  state.mode = 'mission';
  state.dialogue = { who: 'MARA', text: m.briefing, t: 5 };
  state.banner = { title: `MISSION ${m.id} — ${m.title}`, sub: 'Follow the GPS waypoint', t: 3.5 };
  return true;
}

function stepOf(state) {
  const m = missionAt(state);
  return m ? m.steps[state.missionStep] : null;
}

// One fixed step of the mission engine. `pressed` is true on the frame the
// player pressed Interact. Returns 'win' | 'fail' | null.
export function updateMission(state, dt, pressed) {
  const m = missionAt(state);
  if (!m || state.mode !== 'mission') return null;
  const step = stepOf(state);
  if (!step) return null;
  const p = state.player;
  const d = Math.hypot(p.x - step.x, p.y - step.y);
  if (step.time) {
    state.missionTimer += dt;
    if (state.missionTimer > step.time) {
      state.mode = 'free'; state.missionFailed = true;
      state.banner = { title: 'MISSION FAILED', sub: 'Out of time — press M to retry', t: 4 };
      state.dialogue = { who: 'MARA', text: 'Too slow. We go again.', t: 4 };
      return 'fail';
    }
  }
  let done = false;
  if (step.kind === 'goto' || step.kind === 'interact') done = d < step.r && (step.kind === 'goto' || pressed);
  else if (step.kind === 'steal' || step.kind === 'stealTruck') done = p.vehicle !== null && d < step.r + 60;
  else if (step.kind === 'board') done = p.vehicle !== null && p.vehicle.kind === 'boat';
  else if (step.kind === 'shoot') done = (state.kills || 0) >= (step.count || 1);
  else if (step.kind === 'escape') done = state.wanted === 0 && d < step.r + 120;
  else if (step.kind === 'hold') done = state.missionTimer > (step.time || 15) && d < step.r;
  if (!done) return null;
  state.missionStep += 1;
  state.missionTimer = 0;
  const next = stepOf(state);
  if (!next) {
    state.player.money += m.reward;
    state.rep = (state.rep || 0) + 1;
    state.mode = 'free';
    state.missionDone = true;
    state.banner = { title: `MISSION COMPLETE — $${m.reward}`, sub: m.title, t: 4 };
    state.dialogue = { who: 'MARA', text: 'Done. The city just got a little smaller.', t: 4 };
    state.missionIndex = Math.min(state.missionIndex + 1, MISSIONS.length);
    return 'win';
  }
  state.dialogue = { who: 'MARA', text: next.say, t: 5 };
  return null;
}

// Side-job engine: a job is accepted at its marker, then its target becomes
// the waypoint. Completing it pays cash and returns to free roam.
export function updateJob(state, dt, pressed) {
  if (!state.job) {
    for (const j of JOBS) {
      const d = Math.hypot(state.player.x - j.x, state.player.y - j.y);
      if (d < 80 && pressed) {
        state.job = { def: j, phase: 'go' };
        state.dialogue = { who: 'JOB', text: j.say, t: 5 };
        state.banner = { title: `SIDE JOB — ${j.title}`, sub: 'Follow the GPS waypoint', t: 3 };
        return;
      }
    }
    return;
  }
  const j = state.job.def;
  const d = Math.hypot(state.player.x - j.tx, state.player.y - j.ty);
  if (d < 90) {
    state.player.money += j.pay;
    state.banner = { title: `JOB DONE — $${j.pay}`, sub: j.title, t: 3.5 };
    state.dialogue = { who: 'JOB', text: 'Paid in full. Come back for more work.', t: 4 };
    state.job = null;
  }
}
