// The simulation: city, player, traffic, pedestrians, police and combat.
// No drawing and no browser here — step() advances one fixed step and the
// 3D scene paints the state. Screen states (title/play/paused/busted) are the
// caller's job; missions are a separate progression (missions.js) and wanted
// and combat are conditions on top of play, never a screen of their own.
// Arrest, death, mission failure and restart have explicit precedence and
// cleanup in reset() and in the bust branch, so no timer or actor survives
// a transition.
import { AVENUES, BEACH, CANAL, DISTRICTS, PLAYER, PORT, STREETS, VEHICLES, WEAPONS, WORLD, districtAt } from './config.js';
import { makeVehicle, stepVehicle, steerToward, dist2 } from './vehicles.js';
import { cellOf, findPath, nearestRoadCell, cellCenter } from './astar.js';
import { pick } from './random.js';

export const EVENT_BUSTED = 1;
export const EVENT_SHOT = 2;
export const EVENT_CRIME = 4;

const CAR_COLORS = ['#ff4d6d', '#2ee6d6', '#ffd23e', '#ff7a1a', '#b388ff', '#e8ecf5', '#7dffa8'];
const PED_COLORS = ['#ff8fab', '#ffd23e', '#7fd4ff', '#b388ff', '#7dffa8', '#ff9a5c'];
const PED_SKINS = ['#e8b48a', '#c98d5f', '#8a5a3a', '#f2c9a0'];
const PED_PANTS = ['#2b2b3a', '#3a4a6b', '#5a3a2a', '#2e4a3a', '#6b6b7a'];
const PED_HAIR = ['#3a2a1a', '#1a1a1a', '#6b4a2f', '#8a8a8a', '#e5382e', '#2e6bff'];

function circleVsRect(px, py, r, b) {
  const cx = Math.max(b.x, Math.min(px, b.x + b.w)), cy = Math.max(b.y, Math.min(py, b.y + b.h));
  const dx = px - cx, dy = py - cy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  const d = Math.sqrt(Math.max(d2, 0.01));
  return { push: r - d, dx, dy, d };
}

function inWater(x, y) {
  if (x > BEACH.seaX) return true;
  if (x > CANAL.x0 && x < CANAL.x1 && y > CANAL.y0 && y < CANAL.y1) {
    return !STREETS.some((s) => Math.abs(y - s) < 48); // bridges cross the canal
  }
  return false;
}

export function createWorld(rand) {
// ---- static city: grid-based blocks, lots that never overlap, height
// falling off from the downtown core to low beach hotels. Each block is
// split into lots with alley margins, so buildings sit in tidy rows instead
// of piling up at random. A few lots stay empty as plazas with a palm.
const GLASS_COLORS = ['#5f6fb0', '#3fd2e0', '#8f7fb8', '#4a7fb8', '#6fb0c9'];
const MID_COLORS = ['#c96f4a', '#b08968', '#a87a5a', '#8a6f8a', '#7fae5a'];
const HILL_COLORS = ['#c9a06a', '#a8b08a', '#d9c49a', '#b08968', '#8a9a7a'];
const BEACH_COLORS = ['#f2d8c9', '#ffd9a0', '#ffb3a0', '#c9e8e0', '#f2e8d5'];
const buildings = [];
const containers = [];
const cranes = [];
const palms = [];
for (let bi = 0; bi < AVENUES.length - 1; bi += 1) {
  for (let si = 0; si < STREETS.length - 1; si += 1) {
    const x0 = AVENUES[bi] + 55, x1 = AVENUES[bi + 1] - 55;
    const y0 = STREETS[si] + 55, y1 = STREETS[si + 1] - 55;
    if (x0 >= x1 || y0 >= y1) continue;
    if (x0 > CANAL.x0 - 120 && x0 < CANAL.x1 + 120) continue; // canal corridor
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const d = districtAt(cx, cy);
    const distDowntown = Math.hypot(cx - 675, cy - 370);
    let minH, maxH, colors, glass;
    if (d.name === 'DOWNTOWN' || distDowntown < 550) {
      minH = 140; maxH = 260; colors = GLASS_COLORS; glass = true;
    } else if (cx > 1900) {
      minH = 26; maxH = 55; colors = BEACH_COLORS; glass = false;
    } else if (d.name === 'HOLLYWOOD HILLS') {
      minH = 24; maxH = 46; colors = HILL_COLORS; glass = false;
    } else if (distDowntown < 1100) {
      minH = 60; maxH = 130; colors = MID_COLORS; glass = rand() < 0.3;
    } else {
      minH = 30; maxH = 60; colors = MID_COLORS; glass = false;
    }
    const cols = (x1 - x0) > 260 ? 3 : 2;
    const rows = 2;
    const lotW = (x1 - x0) / cols, lotH = (y1 - y0) / rows;
    const margin = 14; // alley around every lot, so nothing ever touches
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        if (rand() < 0.1) {
          palms.push({ x: x0 + c * lotW + lotW / 2, y: y0 + r * lotH + lotH / 2 });
          continue; // plaza lot: open space, no building
        }
        const bw = lotW - margin * 2, bh = lotH - margin * 2;
        const shrink = 0.75 + rand() * 0.25;
        const w = bw * shrink, h = bh * shrink;
        const x = x0 + c * lotW + margin + (bw - w) / 2 + (rand() - 0.5) * 6;
        const y = y0 + r * lotH + margin + (bh - h) / 2 + (rand() - 0.5) * 6;
        const height = minH + rand() * (maxH - minH);
        const color = pick(rand, colors);
        const roof = height < 70 && rand() < 0.45; // rooftop AC box
        buildings.push({ x, y, w, h, height, color, glass, roof, z0: 0 });
        if (glass && rand() < 0.5) {
          // Stepped crown: a smaller box on top, so towers vary in silhouette.
          const cw = w * 0.55, ch = h * 0.55;
          buildings.push({
            x: x + (w - cw) / 2, y: y + (h - ch) / 2, w: cw, h: ch,
            height: height * 0.28, color, glass: true, roof: false, z0: height,
          });
        }
      }
    }
  }
}
  for (let i = 0; i < 10; i += 1) {
    containers.push({ x: PORT.x0 + 40 + i * 90, y: PORT.y0 + 40 + (i % 2) * 70, w: 64, h: 30, color: pick(rand, ['#f2a541', '#19b8c9', '#e5382e', '#7dffa8']) });
  }
  for (let i = 0; i < 4; i += 1) cranes.push({ x: PORT.x0 + 120 + i * 240, y: PORT.y0 + 8, h: 190 });
  // Palm trees along the beach and the Coral Strip boulevard.
  for (let y = 140; y < 1700; y += 130) palms.push({ x: 2280 + (rand() < 0.5 ? -14 : 14), y });
  for (let x = 1950; x < 2250; x += 120) palms.push({ x, y: 300 });
  // Beach umbrellas on the sand.
  const umbrellas = [];
  for (let i = 0; i < 10; i += 1) umbrellas.push({ x: 2300 + rand() * 120, y: 300 + i * 130 + rand() * 40, color: pick(rand, ['#ff4d6d', '#ffd23e', '#2ee6d6', '#ff7a1a']) });
  // Traffic lights at the busiest intersections (phase cycles with time).
  const lights = [
    { x: 700, y: 650, phase: 0 }, { x: 1100, y: 650, phase: 3 },
    { x: 700, y: 1000, phase: 6 }, { x: 1900, y: 650, phase: 9 },
  ];

  // ---- pooled actors: allocated once, reused, never grown in the hot loop ----
  const vehicles = [];
  const peds = [];
  const police = [];
  const bullets = [];
  const particles = [];
  for (let i = 0; i < 40; i += 1) vehicles.push({ active: false });
  for (let i = 0; i < 48; i += 1) peds.push({ active: false });
  for (let i = 0; i < 6; i += 1) police.push({ active: false });
  for (let i = 0; i < 64; i += 1) bullets.push({ active: false });
  for (let i = 0; i < 96; i += 1) particles.push({ active: false });

  const player = {
    x: 700, y: 750, angle: -Math.PI / 2, vx: 0, vy: 0, health: PLAYER.health, armor: PLAYER.armor,
    money: 250, vehicle: null, weapon: 0, ammo: [12, 30, 6], reserve: [72, 120, 36],
    aim: 0, speed: 0, onFoot: true, invuln: 0, walkPhase: 0,
  };
  const heli = { active: false, x: 0, y: 0, angle: 0 };

  const state = {
    time: 0, clockMin: 17 * 60 + 21, dayNight: 'dusk', player, vehicles, peds, police, bullets, particles,
    buildings, containers, cranes, palms, umbrellas, lights, heli,
    wanted: 0, wantedPhase: 'clear', unseenTimer: 0, escapeProgress: 0, lastKnown: null,
    mode: 'free', missionIndex: 0, missionStep: 0, missionTimer: 0,
    missionFailed: false, missionDone: false, kills: 0, rep: 0, job: null,
    dialogue: null, banner: null, district: districtAt(700, 750), districtTimer: 0,
    bust: 0, bustTimer: 0, shotCooldown: 0, trafficTimer: 0, pedTimer: 0,
    radioName: 'NEON 88 — Sunset Drive', radioStation: 0,
  };

  function freeFrom(list) { for (const it of list) if (!it.active) return it; return null; }
  function spawnParked(kind, x, y, angle) {
    const slot = freeFrom(vehicles);
    if (!slot) return null;
    const v = makeVehicle(kind, x, y, angle, pick(rand, CAR_COLORS));
    Object.assign(slot, v, { active: true, driver: null });
    return slot;
  }
  function spawnTraffic() {
    const slot = freeFrom(vehicles);
    if (!slot) return;
    const vertical = rand() < 0.5;
    const kind = pick(rand, ['sedan', 'sedan', 'suv', 'bike', 'truck']);
    let x, y, angle;
    if (vertical) {
      const a = pick(rand, AVENUES); x = a + (rand() < 0.5 ? -14 : 14); y = 150 + rand() * 1600;
      angle = rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const s = pick(rand, STREETS); y = s + (rand() < 0.5 ? -14 : 14); x = 150 + rand() * 2000;
      angle = rand() < 0.5 ? 0 : Math.PI;
    }
    const v = makeVehicle(kind, x, y, angle, pick(rand, CAR_COLORS));
    Object.assign(slot, v, { active: true, driver: 'traffic', cruise: 150 + rand() * 120, turnAt: 0 });
  }
  function spawnPed() {
    const slot = freeFrom(peds);
    if (!slot) return;
    const x = 150 + rand() * 2100, y = 150 + rand() * 1550;
    const shirt = pick(rand, PED_COLORS);
    Object.assign(slot, {
      active: true, x, y, tx: x, ty: y, speed: 40 + rand() * 30,
      color: shirt, shirt, skin: pick(rand, PED_SKINS), pants: pick(rand, PED_PANTS),
      hair: pick(rand, PED_HAIR), pack: rand() < 0.3, face: rand() * Math.PI * 2,
      flee: 0, wait: rand() * 3, walkPhase: rand() * 6,
    });
  }

  function reset() {
    player.x = 700; player.y = 750; player.angle = -Math.PI / 2; player.vx = 0; player.vy = 0; player.speed = 0;
    player.health = PLAYER.health; player.armor = PLAYER.armor; player.money = 250;
    player.vehicle = null; player.weapon = 0; player.ammo = [12, 30, 6]; player.reserve = [72, 120, 36];
    player.onFoot = true; player.invuln = 0; player.walkPhase = 0;
    for (const v of vehicles) v.active = false;
    for (const p of peds) p.active = false;
    for (const p of police) p.active = false;
    for (const b of bullets) b.active = false;
    for (const q of particles) q.active = false;
    state.time = 0; state.clockMin = 17 * 60 + 21; state.dayNight = 'dusk';
    state.wanted = 0; state.wantedPhase = 'clear'; state.unseenTimer = 0; state.escapeProgress = 0; state.lastKnown = null;
    state.mode = 'free'; state.missionIndex = 0; state.missionStep = 0; state.missionTimer = 0;
    state.missionFailed = false; state.missionDone = false; state.kills = 0; state.rep = 0; state.job = null;
    state.dialogue = null; state.banner = null; state.bust = 0; state.bustTimer = 0;
    heli.active = false;
    // Parked cars worth stealing, a boat at the Marina, trucks at the port.
    spawnParked('sedan', 700, 650, 0); spawnParked('suv', 1100, 1000, Math.PI / 2);
    spawnParked('bike', 1500, 650, 0); spawnParked('sedan', 1900, 1000, -Math.PI / 2);
    spawnParked('sedan', 2100, 500, 0); spawnParked('truck', 600, 1750, 0);
    spawnParked('boat', 2100, 1600, -Math.PI / 2); spawnParked('boat', 2400, 1450, 0);
    spawnParked('suv', 900, 500, Math.PI); spawnParked('sedan', 1500, 1350, 0);
    for (let i = 0; i < 10; i += 1) spawnTraffic();
    for (let i = 0; i < 22; i += 1) spawnPed();
  }

  function collideBuildings(e, r) {
    for (const b of buildings) {
      const hit = circleVsRect(e.x, e.y, r, b);
      if (!hit) continue;
      const nx = hit.d > 0.01 ? hit.dx / hit.d : 1, ny = hit.d > 0.01 ? hit.dy / hit.d : 0;
      e.x += nx * hit.push; e.y += ny * hit.push;
      if (e.vx !== undefined) {
        const dot = e.vx * nx + e.vy * ny;
        if (dot < 0) { e.vx -= dot * nx; e.vy -= dot * ny; }
      }
      return true;
    }
    return false;
  }

  function addWanted(n) {
    const before = state.wanted;
    state.wanted = Math.max(0, Math.min(5, state.wanted + n));
    if (state.wanted > before) {
      state.wantedPhase = 'pursuit'; state.unseenTimer = 0; state.escapeProgress = 0;
      state.lastKnown = { x: player.x, y: player.y };
    }
    return state.wanted;
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i += 1) {
      const q = freeFrom(particles); if (!q) return;
      Object.assign(q, { active: true, x, y, vx: (rand() - 0.5) * 260, vy: (rand() - 0.5) * 260, life: 0.5 + rand() * 0.4, color });
    }
  }

  function fireBullet() {
    if (state.shotCooldown > 0 || player.vehicle) return 0;
    const w = WEAPONS[player.weapon];
    if (player.ammo[player.weapon] <= 0) return 0;
    player.ammo[player.weapon] -= 1;
    state.shotCooldown = w.rate;
    const b = freeFrom(bullets); if (!b) return EVENT_SHOT;
    const spread = (rand() - 0.5) * w.spread * 2;
    Object.assign(b, {
      active: true, x: player.x + Math.cos(player.aim) * 24, y: player.y + Math.sin(player.aim) * 24,
      vx: Math.cos(player.aim + spread) * 900, vy: Math.sin(player.aim + spread) * 900,
      life: w.range / 900, damage: w.damage, weapon: player.weapon,
    });
    return EVENT_SHOT;
  }

  // Police: capped pursuers, roles held for seconds, flank targets are road
  // nodes ahead of the player's motion — never raw offsets, never on bridges.
  function desiredPolice() {
    if (state.wanted <= 0) return 0;
    if (state.wanted <= 2) return 1;
    if (state.wanted === 3) return 2;
    if (state.wanted === 4) return 3;
    return 4;
  }
  function spawnPolice() {
    const slot = freeFrom(police);
    if (!slot) return;
    // Spawn on a road out of the player's view, with time to approach.
    let x = 0, y = 0;
    for (let tries = 0; tries < 12; tries += 1) {
      const c = nearestRoadCell(player.x + (rand() - 0.5) * 1800, player.y + (rand() - 0.5) * 1400);
      const cc = cellCenter(c.cx, c.cy);
      if (Math.hypot(cc.x - player.x, cc.y - player.y) > 750) { x = cc.x; y = cc.y; break; }
      x = cc.x; y = cc.y;
    }
    const v = makeVehicle('police', x, y, 0, '#e8ecf5');
    Object.assign(slot, v, {
      active: true, x, y, angle: 0, vx: 0, vy: 0, speed: 0, color: '#e8ecf5', roof: '#2e6bff',
      damaged: 0, smoke: 0, driver: 'police', path: [], pathIndex: 0, repath: rand() * 1.5,
      role: 'chase', stuck: 0, reverseT: 0, bustHold: 0, sight: 0,
    });
  }

  function policeTarget(pol, index) {
    const p = player;
    if (pol.role === 'chase' || index === 0) {
      const lk = state.lastKnown || { x: p.x, y: p.y };
      return nearestRoadCell(lk.x, lk.y);
    }
    // Interceptor: a road node ahead of the player's motion, offset to one side.
    const sp = Math.hypot(p.vx, p.vy);
    const ahead = sp > 60 ? 420 : 200;
    const dirx = sp > 60 ? p.vx / sp : Math.cos(p.angle), diry = sp > 60 ? p.vy / sp : Math.sin(p.angle);
    const side = index % 2 === 0 ? 1 : -1;
    const tx = p.x + dirx * ahead - diry * side * 320;
    const ty = p.y + diry * ahead + dirx * side * 320;
    return nearestRoadCell(tx, ty);
  }

  function stepPolice(dt) {
    const want = desiredPolice();
    let active = 0;
    for (const pol of police) if (pol.active) active += 1;
    while (active < want) { spawnPolice(); active += 1; }
    let idx = 0;
    for (const pol of police) {
      if (!pol.active) continue;
      idx += 1;
      const dPlayer = Math.hypot(pol.x - player.x, pol.y - player.y);
      const sightR = state.wanted <= 2 ? 300 : 430;
      const sees = dPlayer < sightR;
      if (sees) { state.lastKnown = { x: player.x, y: player.y }; pol.sight = 1; }
      else pol.sight = Math.max(0, pol.sight - dt * 0.2);
      // Repath staggered; flank roles held, never recomputed every tick.
      pol.repath -= dt;
      if (pol.repath <= 0 || pol.pathIndex >= pol.path.length) {
        pol.repath = 1.2 + (idx % 3) * 0.3;
        const from = nearestRoadCell(pol.x, pol.y);
        const to = policeTarget(pol, idx);
        const pts = findPath(from.cx, from.cy, to.cx, to.cy);
        pol.path = pts; pol.pathIndex = 0;
        if (pol.path.length === 0) pol.stuck += dt;
      }
      // Follow the route waypoint by waypoint: skip passed waypoints, brake
      // for turns and for the final approach, and reverse out if stuck.
      let throttle = 0.55, steer = 0;
      while (pol.pathIndex < pol.path.length) {
        const wp = pol.path[pol.pathIndex];
        if (Math.hypot(wp.x - pol.x, wp.y - pol.y) < 55) pol.pathIndex += 1;
        else break;
      }
      if (pol.pathIndex >= pol.path.length) pol.repath = 0;
      const target = pol.path[pol.pathIndex];
      if (target) {
        steer = steerToward(pol, target.x, target.y);
        const td = Math.hypot(target.x - pol.x, target.y - pol.y);
        throttle = Math.abs(steer) > 0.6 ? 0.35 : td < 130 ? 0.4 : 0.7;
        if (dPlayer < 90) { throttle = 0.9; steer = steerToward(pol, player.x, player.y); }
      } else if (dPlayer < 400) { throttle = 0.8; steer = steerToward(pol, player.x, player.y); }
      if (pol.reverseT > 0) {
        pol.reverseT -= dt;
        throttle = -0.6; steer = -steer;
      } else if (Math.hypot(pol.vx, pol.vy) < 25 && pol.path.length > 0) {
        pol.stuck += dt;
        if (pol.stuck > 1.5) { pol.reverseT = 0.6; pol.stuck = 0; pol.repath = 0; }
      } else pol.stuck = 0;
      if (!player.vehicle && dPlayer < 260) {
        // Crawl in for the arrest, never arrive at ramming speed: brake down
        // to a slow approach, then sit on the player so the bust timer can
        // run. A sprinting player outruns the crawl and re-triggers the chase.
        throttle = Math.abs(pol.speed) > 70 ? -0.5 : 0.3;
        steer = steerToward(pol, player.x, player.y);
        if (dPlayer < 110 && Math.abs(pol.speed) < 70) { throttle = 0; steer = 0; }
      }
      stepVehicle(pol, throttle, steer, false, dt);
      collideBuildings(pol, 24);
      // Ram damage and the arrest rule: sustained close contact while the
      // player is on foot or effectively stopped, with visible progress.
      if (dPlayer < (player.vehicle ? 64 : 110)) {
        if (player.vehicle) {
          player.vehicle.damaged = (player.vehicle.damaged || 0) + 12 * dt;
          if (player.health > 0) player.health = Math.max(1, player.health - 4 * dt);
        } else {
          pol.bustHold += dt;
          state.bust = Math.min(1, pol.bustHold / 2.5);
          if (pol.bustHold > 2.5) { state.bust = 0; return EVENT_BUSTED; }
        }
      } else { pol.bustHold = Math.max(0, pol.bustHold - dt); }
      if (pol.damaged >= 100) {
        pol.active = false; state.kills += 1;
        burst(pol.x, pol.y, '#888888', 14);
        addWanted(1);
      }
    }
    // Helicopter at 3+ stars: a readable search indicator that circles the
    // player and keeps the heat on — escapable under cover, never a gunship.
    heli.active = state.wanted >= 3;
    if (heli.active) {
      heli.angle += dt * 0.45;
      heli.x = player.x + Math.cos(heli.angle) * 260;
      heli.y = player.y + Math.sin(heli.angle) * 260 - 60;
    }
    return 0;
  }

  function stepWanted(dt) {
    if (state.wanted === 0) { state.wantedPhase = 'clear'; state.escapeProgress = 0; return; }
    let seen = false;
    for (const pol of police) {
      if (pol.active && Math.hypot(pol.x - player.x, pol.y - player.y) < (state.wanted <= 2 ? 300 : 430)) seen = true;
    }
    if (heli.active && Math.hypot(heli.x - player.x, heli.y - player.y) < 520) seen = true;
    if (seen) { state.unseenTimer = 0; state.escapeProgress = 0; state.wantedPhase = 'pursuit'; }
    else {
      state.unseenTimer += dt;
      if (state.unseenTimer > 4) {
        state.wantedPhase = 'search';
        const need = 10 + state.wanted * 5;
        state.escapeProgress = Math.min(1, state.escapeProgress + dt / need);
        if (state.escapeProgress >= 1) {
          state.wanted = 0; state.wantedPhase = 'clear'; state.escapeProgress = 0;
          for (const pol of police) pol.active = false;
          heli.active = false;
          state.banner = { title: 'YOU LOST THE POLICE', sub: 'Wanted level cleared', t: 3 };
        }
      }
    }
  }

  function stepTraffic(dt) {
    state.trafficTimer -= dt;
    let count = 0;
    for (const v of vehicles) if (v.active && v.driver === 'traffic') count += 1;
    if (state.trafficTimer <= 0) {
      state.trafficTimer = 0.8;
      if (count < 14) { spawnTraffic(); if (count < 13) spawnTraffic(); }
    }
    for (const v of vehicles) {
      if (!v.active || v.driver !== 'traffic') continue;
      // Follow the road ahead; brake for the car ahead.
      const aheadX = v.x + Math.cos(v.angle) * 70, aheadY = v.y + Math.sin(v.angle) * 70;
      let blocked = false;
      for (const o of vehicles) {
        if (o === v || !o.active) continue;
        if (dist2(aheadX, aheadY, o.x, o.y) < 55 * 55) { blocked = true; break; }
      }
      const onAve = AVENUES.some((a) => Math.abs(v.x - a) < 50);
      const onSt = STREETS.some((s) => Math.abs(v.y - s) < 50);
      let steer = 0, throttle = blocked ? 0 : 0.55;
      // Stay centred on the current road.
      if (onAve && !onSt) {
        const a = AVENUES.reduce((best, cur) => Math.abs(cur - v.x) < Math.abs(best - v.x) ? cur : best, AVENUES[0]);
        steer = steerToward(v, a + (v.angle > 0 ? 12 : -12), v.y + (v.angle > 0 ? 300 : -300));
      } else if (onSt) {
        const s = STREETS.reduce((best, cur) => Math.abs(cur - v.y) < Math.abs(best - v.y) ? cur : best, STREETS[0]);
        steer = steerToward(v, v.x + (Math.abs(v.angle) < Math.PI / 2 ? 300 : -300), s + 12);
      }
      stepVehicle(v, throttle, steer, false, dt);
      if (v.x < 100 || v.x > WORLD.w - 100 || v.y < 100 || v.y > WORLD.h - 100) v.active = false;
    }
  }

  function stepPeds(dt) {
    state.pedTimer -= dt;
    let count = 0;
    for (const p of peds) if (p.active) count += 1;
    if (state.pedTimer <= 0) { state.pedTimer = 2; if (count < 24) spawnPed(); }
    for (const p of peds) {
      if (!p.active) continue;
      const dPlayer = Math.hypot(p.x - player.x, p.y - player.y);
      if (dPlayer < 260 && (state.shotCooldown > 0 || player.vehicle)) p.flee = 2.5;
      if (p.flee > 0) {
        p.flee -= dt;
        const a = Math.atan2(p.y - player.y, p.x - player.x);
        p.face = a;
        p.x += Math.cos(a) * 130 * dt; p.y += Math.sin(a) * 130 * dt;
        p.walkPhase += dt * 9;
      } else {
        p.wait -= dt;
        if (p.wait <= 0) { p.tx = 150 + rand() * 2100; p.ty = 150 + rand() * 1550; p.wait = 4 + rand() * 5; }
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d > 12) {
          p.face = Math.atan2(dy, dx);
          p.x += (dx / d) * p.speed * dt; p.y += (dy / d) * p.speed * dt;
          p.walkPhase += dt * 7;
        }
      }
      p.x = Math.max(60, Math.min(WORLD.w - 60, p.x));
      p.y = Math.max(60, Math.min(WORLD.h - 60, p.y));
    }
  }

  function stepBullets(dt) {
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.w || b.y > WORLD.h) { b.active = false; continue; }
      for (const v of vehicles) {
        if (!v.active || v.driver === 'player') continue;
        if (Math.abs(b.x - v.x) < 30 && Math.abs(b.y - v.y) < 18) {
          b.active = false;
          v.damaged = (v.damaged || 0) + b.damage;
          burst(b.x, b.y, '#ffd23e', 5);
          if (v.damaged >= 100) {
            v.driver = null; v.smoke = 1;
            addWanted(1);
          }
          break;
        }
      }
      for (const pol of police) {
        if (!pol.active) continue;
        if (Math.abs(b.x - pol.x) < 30 && Math.abs(b.y - pol.y) < 18) {
          b.active = false;
          pol.damaged = (pol.damaged || 0) + b.damage;
          burst(b.x, b.y, '#ffd23e', 5);
          break;
        }
      }
    }
    for (const q of particles) {
      if (!q.active) continue;
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (q.life <= 0) q.active = false;
    }
  }

  // One fixed step of play. `cmd` carries the frame's input (mouseX/mouseY are
  // world coordinates the caller raycasts from the screen); `fired` is true on
  // the frame the player clicked. Returns event flags for the caller.
  function step(dt, cmd, fired) {
    state.time += dt;
    state.clockMin += dt; // one game minute per real second, cosmetic only
    if (state.shotCooldown > 0) state.shotCooldown -= dt;
    if (player.invuln > 0) player.invuln -= dt;
    if (state.banner && state.banner.t > 0) state.banner.t -= dt;
    if (state.dialogue && state.dialogue.t > 0) state.dialogue.t -= dt;
    state.dayNight = state.missionIndex === 1 ? 'night' : 'dusk';
    let events = 0;
    const p = player;

    // --- player on foot ---
    if (!p.vehicle) {
      const sp = cmd.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
      p.vx = cmd.x * sp; p.vy = cmd.y * sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.speed = Math.hypot(p.vx, p.vy);
      if (p.speed > 10) { p.angle = Math.atan2(p.vy, p.vx); p.walkPhase += dt * p.speed * 0.045; }
      p.x = Math.max(40, Math.min(WORLD.w - 40, p.x));
      p.y = Math.max(40, Math.min(WORLD.h - 40, p.y));
      if (inWater(p.x, p.y)) { p.x -= p.vx * dt; p.y -= p.vy * dt; }
      collideBuildings(p, PLAYER.radius);
      p.aim = Math.atan2(cmd.mouseY - p.y, cmd.mouseX - p.x);
      if (fired) events |= fireBullet();
      if (cmd.reload && p.reserve[p.weapon] > 0 && p.ammo[p.weapon] < WEAPONS[p.weapon].mag) {
        const need = WEAPONS[p.weapon].mag - p.ammo[p.weapon];
        const take = Math.min(need, p.reserve[p.weapon]);
        p.ammo[p.weapon] += take; p.reserve[p.weapon] -= take;
      }
      // Enter / carjack a nearby vehicle with F.
      if (cmd.interact) {
        let best = null, bd = 80 * 80;
        for (const v of vehicles) {
          if (!v.active || v.kind === 'boat') continue;
          const d2 = dist2(p.x, p.y, v.x, v.y);
          if (d2 < bd) { bd = d2; best = v; }
        }
        // Boats board from the Marina dock.
        if (!best) {
          for (const v of vehicles) {
            if (!v.active || v.kind !== 'boat') continue;
            if (dist2(p.x, p.y, v.x, v.y) < 90 * 90) { best = v; break; }
          }
        }
        if (best) {
          if (!best.everDriven) {
            addWanted(1); best.everDriven = true;
            if (best.driver === 'traffic') burst(best.x, best.y, '#ff4d6d', 6);
          }
          best.driver = 'player'; p.vehicle = best; p.onFoot = false;
          events |= EVENT_CRIME;
        }
      }
    } else {
      // --- driving: throttle from W/S, steering from A/D, Space handbrake ---
      const v = p.vehicle;
      const throttle = cmd.y < 0 ? 1 : cmd.y > 0 ? -0.6 : 0;
      const steer = cmd.x;
      const wasWater = v.kind === 'boat';
      stepVehicle(v, throttle, steer, cmd.handbrake, dt);
      if (wasWater) {
        if (!inWater(v.x, v.y) && v.x < BEACH.seaX - 40) { v.x -= v.vx * dt; v.y -= v.vy * dt; v.vx *= 0.5; v.vy *= 0.5; }
      } else {
        if (inWater(v.x, v.y)) { v.x -= v.vx * dt; v.y -= v.vy * dt; v.vx *= 0.4; v.vy *= 0.4; }
        collideBuildings(v, 26);
        if (v.damaged >= 100) {
          burst(v.x, v.y, '#888888', 16);
          p.vehicle = null; p.onFoot = true; p.x = v.x + 40; p.y = v.y;
          v.driver = null;
          state.banner = { title: 'YOUR CAR IS WRECKED', sub: 'Find another ride', t: 3 };
        }
      }
      p.x = v.x; p.y = v.y; p.angle = v.angle; p.speed = Math.abs(v.speed);
      if (cmd.interact) {
        p.x = v.x + Math.cos(v.angle + Math.PI / 2) * 44;
        p.y = v.y + Math.sin(v.angle + Math.PI / 2) * 44;
        v.driver = null; p.vehicle = null; p.onFoot = true; p.vx = 0; p.vy = 0;
      }
    }

    const bustEvent = stepPolice(dt);
    if (bustEvent & EVENT_BUSTED) {
      // Arrest: explicit cleanup — wanted clears, police stand down, the
      // player wakes at the hospital with less cash. The caller shows Busted.
      state.wanted = 0; state.wantedPhase = 'clear'; state.escapeProgress = 0;
      for (const pol of police) pol.active = false;
      heli.active = false;
      player.money = Math.max(0, player.money - 200);
      player.health = PLAYER.health; player.armor = 0;
      if (player.vehicle) { player.vehicle.driver = null; player.vehicle = null; player.onFoot = true; }
      player.x = 700; player.y = 750;
      return EVENT_BUSTED;
    }
    stepWanted(dt);
    stepTraffic(dt);
    stepPeds(dt);
    stepBullets(dt);

    // Mode is a condition, not a screen: combat while shooting or chased,
    // mission while a mission runs, arrest only via the bust above.
    if (state.mode !== 'mission') {
      state.mode = (state.wanted > 0 || state.shotCooldown > 0.05) ? 'combat' : 'free';
    }
    const d = districtAt(p.x, p.y);
    if (d !== state.district) {
      state.district = d; state.districtTimer = 3;
      state.banner = { title: d.name, sub: d.sub, t: 2.5 };
    } else if (state.districtTimer > 0) state.districtTimer -= dt;

    return events;
  }

  reset();
  return { state, reset, step, addWanted, inWater };
}
