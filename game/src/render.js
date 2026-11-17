// Drawing only: the world's state and the current screen in, pixels out.
// Oblique low-poly look: flat colours, extruded building blocks, warm sunset
// sky, sharp HUD text with outline/shadow. The HUD is drawn on the canvas so
// screenshots capture the whole game. Buildings and actors are painted in
// depth order (by world y) so a tower never hides the player outright.
import { AVENUES, BEACH, CANAL, FONT, PALETTE, PORT, STREETS, WEAPONS, WORLD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';

const fonts = new Map();
function font(size, italic) {
  const key = `${italic ? 'italic ' : ''}${size}`;
  if (!fonts.has(key)) fonts.set(key, `${italic ? 'italic ' : ''}bold ${size}px ${FONT}`);
  return fonts.get(key);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 720, dpr: 1 };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    view.dpr = dpr;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    view.w = window.innerWidth; view.h = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function text(str, x, y, size, color, align, italic) {
    ctx.font = font(size, italic);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = Math.max(2, size / 6);
    ctx.strokeStyle = 'rgba(10,6,24,0.85)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    rr(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,122,26,0.55)'; ctx.lineWidth = 2; ctx.stroke();
  }
  // World -> screen using the camera. The oblique squash (0.86) gives depth.
  function w2s(state, x, y) {
    const cam = state.camera;
    return { x: (x - cam.x) * cam.zoom + view.w / 2, y: (y - cam.y) * cam.zoom * 0.86 + view.h / 2 };
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return `rgb(${r},${g},${b})`;
  }

  function drawGround(state) {
    const night = state.dayNight === 'night';
    const g = ctx.createLinearGradient(0, 0, 0, view.h);
    if (night) { g.addColorStop(0, '#241b4d'); g.addColorStop(0.6, '#3a2358'); g.addColorStop(1, '#ff7a5c'); }
    else { g.addColorStop(0, '#ff8f5e'); g.addColorStop(0.55, '#ff6b8a'); g.addColorStop(1, '#7a4a9e'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
    const cam = state.camera, z = cam.zoom;
    const ox = view.w / 2 - cam.x * z, oy = view.h / 2 - cam.y * z * 0.86;
    const X = (x) => x * z + ox, Y = (y) => y * z * 0.86 + oy, S = (v) => v * z;
    // Land everywhere first, so the camera never shows bare sky past the edge:
    // east of the world is more ocean, every other side is city haze.
    ctx.fillStyle = night ? '#3d3358' : '#8a7a5e'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = night ? '#0e4a6b' : PALETTE.sea; ctx.fillRect(Math.max(0, X(BEACH.seaX)), 0, view.w, view.h);
    ctx.fillStyle = PALETTE.sand; ctx.fillRect(X(BEACH.x0), Y(0), S(BEACH.seaX - BEACH.x0), S(WORLD.h));
    ctx.fillStyle = night ? '#0e4a6b' : PALETTE.sea; ctx.fillRect(X(BEACH.seaX), Y(0), S(WORLD.w - BEACH.seaX), S(WORLD.h));
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.25;
    for (let i = 0; i < 4; i += 1) ctx.fillRect(X(BEACH.seaX + 30 + i * 40), Y(200 + i * 320), S(90), S(5));
    ctx.globalAlpha = 1;
    // Canal water + bridges.
    ctx.fillStyle = night ? '#0e4a6b' : '#1fb6c9';
    ctx.fillRect(X(CANAL.x0), Y(CANAL.y0), S(CANAL.x1 - CANAL.x0), S(CANAL.y1 - CANAL.y0));
    ctx.fillStyle = '#c9b8a3';
    for (const s of STREETS) ctx.fillRect(X(CANAL.x0 - 26), Y(s - 30), S(CANAL.x1 - CANAL.x0 + 52), S(60));
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const a of AVENUES) ctx.fillRect(X(a - 42), Y(0), S(84), S(WORLD.h));
    for (const s of STREETS) ctx.fillRect(X(0), Y(s - 42), S(WORLD.w), S(84));
    ctx.fillStyle = PALETTE.roadLine;
    for (const a of AVENUES) for (let y = 40; y < WORLD.h; y += 90) ctx.fillRect(X(a - 3), Y(y), S(6), S(44));
    for (const s of STREETS) for (let x = 40; x < WORLD.w; x += 90) ctx.fillRect(X(x), Y(s - 3), S(44), S(6));
    // Sidewalks.
    ctx.fillStyle = 'rgba(201,184,163,0.5)';
    for (const a of AVENUES) { ctx.fillRect(X(a - 56), Y(0), S(10), S(WORLD.h)); ctx.fillRect(X(a + 46), Y(0), S(10), S(WORLD.h)); }
    // Port: containers + cranes.
    for (const c of state.containers) {
      ctx.fillStyle = c.color; ctx.fillRect(X(c.x), Y(c.y), S(c.w), S(c.h));
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(X(c.x), Y(c.y), S(c.w), S(6));
    }
    for (const cr of state.cranes) {
      ctx.strokeStyle = PALETTE.crane; ctx.lineWidth = Math.max(2, 5 * z);
      ctx.beginPath(); ctx.moveTo(X(cr.x), Y(PORT.y0 + 90)); ctx.lineTo(X(cr.x), Y(PORT.y0 + 90) - cr.h * z * 0.86);
      ctx.lineTo(X(cr.x + 90), Y(PORT.y0 + 90) - cr.h * z * 0.86); ctx.stroke();
    }
    // Santa Monica pier planks into the sea.
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(X(2460), Y(1080), S(130), S(26));
    ctx.fillStyle = '#e4572e';
    ctx.beginPath(); ctx.arc(X(2570), Y(1093), S(16), 0, Math.PI * 2); ctx.fill();
    // Palm trees.
    for (const pl of state.palms) {
      const px = X(pl.x), py = Y(pl.y);
      ctx.strokeStyle = '#6b4a2f'; ctx.lineWidth = Math.max(2, 4 * z);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 34 * z); ctx.stroke();
      ctx.fillStyle = '#3f9e4d';
      for (let f = 0; f < 5; f += 1) {
        const a = (f / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * 12 * z, py - 34 * z + Math.sin(a) * 6 * z, 13 * z, 4 * z, a, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Sun.
    const sunX = view.w * 0.78, sunY = view.h * 0.16;
    const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
    sg.addColorStop(0, 'rgba(255,240,180,0.95)'); sg.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sunY, 90, 0, Math.PI * 2); ctx.fill();
  }

  function drawBuilding(state, b) {
    const cam = state.camera, z = cam.zoom;
    const ox = view.w / 2 - cam.x * z, oy = view.h / 2 - cam.y * z * 0.86;
    const X = (x) => x * z + ox, Y = (y) => y * z * 0.86 + oy, S = (v) => v * z;
    const h = b.height * z * 0.86;
    const x = X(b.x), y = Y(b.y), w = S(b.w), hh = S(b.h);
    ctx.fillStyle = shade(b.color, 0.62); // south face
    ctx.beginPath(); ctx.moveTo(x, y + hh); ctx.lineTo(x + w, y + hh); ctx.lineTo(x + w, y + hh - h); ctx.lineTo(x, y + hh - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(b.color, 0.8); // east face
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + hh); ctx.lineTo(x + w, y + hh - h); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = b.color; // roof
    ctx.fillRect(x, y - h, w, hh);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 4, y - h + 4, w - 8, 5);
    if (b.height > 120) { // tower windows
      ctx.fillStyle = '#ffe9a8';
      for (let wy = y - h + 12; wy < y + hh - 10; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 14) ctx.fillRect(wx, wy, 5, 7);
    }
  }

  function drawVehicle(state, v, isPlayer) {
    const p = w2s(state, v.x, v.y);
    const z = state.camera.zoom;
    const len = v.def.len * z, wid = v.def.wid * z;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(v.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(-len / 2 + 3, -wid / 2 + 4, len, wid, 8); ctx.fill();
    ctx.fillStyle = v.color;
    rr(-len / 2, -wid / 2, len, wid, 8); ctx.fill();
    ctx.fillStyle = v.roof;
    rr(-len * 0.18, -wid * 0.36, len * 0.42, wid * 0.72, 5); ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(len * 0.28, -wid * 0.42, 5, wid * 0.84);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-len / 2 + 8, -wid / 2, 5, 0, Math.PI * 2); ctx.arc(-len / 2 + 8, wid / 2, 5, 0, Math.PI * 2);
    ctx.arc(len / 2 - 8, -wid / 2, 5, 0, Math.PI * 2); ctx.arc(len / 2 - 8, wid / 2, 5, 0, Math.PI * 2); ctx.fill();
    if (v.kind === 'police') {
      ctx.fillStyle = '#ff2e4d'; ctx.fillRect(-4, -wid / 2 - 2, 8, 7);
      ctx.fillStyle = '#2e6bff'; ctx.fillRect(-4, wid / 2 - 5, 8, 7);
      ctx.fillStyle = '#fff'; text('PD', 0, 4, 11, '#111', 'center');
    }
    if (v.kind === 'boat') {
      ctx.fillStyle = '#ff7a1a'; ctx.fillRect(-len * 0.3, -wid / 2, len * 0.2, wid);
    }
    if (v.smoke > 0) { ctx.fillStyle = 'rgba(120,120,120,0.8)'; ctx.beginPath(); ctx.arc(-len / 2, 0, 10, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (isPlayer) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(18, len * 0.62), 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawPerson(state, x, y, color, angle, label) {
    const p = w2s(state, x, y);
    const z = state.camera.zoom;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 10 * z, 10 * z, 4 * z, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 9 * z, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2b3a';
    ctx.fillRect(p.x - 7 * z, p.y + 6 * z, 14 * z, 12 * z);
    ctx.strokeStyle = color; ctx.lineWidth = 3 * z;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 2 * z); ctx.lineTo(p.x + Math.cos(angle) * 16 * z, p.y + Math.sin(angle) * 16 * z); ctx.stroke();
    if (label) text(label, p.x, p.y - 16 * z, 12, '#fff', 'center');
  }

  function drawWorld(state) {
    drawGround(state);
    // Depth order: buildings, vehicles, people and the player sorted by y.
    const items = [];
    for (const b of state.buildings) items.push({ y: b.y + b.h, b });
    for (const v of state.vehicles) if (v.active) items.push({ y: v.y, v });
    for (const pol of state.police) if (pol.active) items.push({ y: pol.y, pol });
    for (const p of state.peds) if (p.active) items.push({ y: p.y, ped: p });
    items.push({ y: state.player.y, player: true });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.b) drawBuilding(state, it.b);
      else if (it.v) drawVehicle(state, it.v, it.v === state.player.vehicle);
      else if (it.pol) drawVehicle(state, it.pol, false);
      else if (it.ped) drawPerson(state, it.ped.x, it.ped.y, it.ped.color, 0);
      else if (it.player) {
        const pl = state.player;
        if (!pl.vehicle) drawPerson(state, pl.x, pl.y, '#ff7a1a', pl.angle, 'MARA');
      }
    }
    // Helicopter + searchlight.
    if (state.heli.active) {
      const h = w2s(state, state.heli.x, state.heli.y);
      ctx.fillStyle = 'rgba(255,240,160,0.18)';
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x - 60, h.y + 150); ctx.lineTo(h.x + 60, h.y + 150); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#20242e'; ctx.fillRect(h.x - 34, h.y - 10, 68, 18);
      ctx.strokeStyle = '#20242e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(h.x - 26, h.y - 8); ctx.lineTo(h.x - 70, h.y - 18); ctx.moveTo(h.x + 26, h.y - 8); ctx.lineTo(h.x + 70, h.y - 18); ctx.stroke();
      ctx.fillStyle = '#ff2e4d'; ctx.beginPath(); ctx.arc(h.x, h.y - 12, 4, 0, Math.PI * 2); ctx.fill();
      text('LAPD AIR', h.x, h.y - 24, 12, '#fff', 'center');
    }
    // Bullets and particles.
    for (const b of state.bullets) {
      if (!b.active) continue;
      const p = w2s(state, b.x, b.y);
      ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - b.vx * 0.02, p.y - b.vy * 0.02); ctx.stroke();
    }
    for (const q of state.particles) {
      if (!q.active) continue;
      const p = w2s(state, q.x, q.y);
      ctx.fillStyle = q.color; ctx.globalAlpha = Math.max(0, q.life);
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6); ctx.globalAlpha = 1;
    }
    // Mission / job waypoint marker + off-screen arrow.
    const target = waypointTarget(state);
    if (target) {
      const p = w2s(state, target.x, target.y);
      const bob = Math.sin(state.time * 4) * 6;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 34 + bob); ctx.lineTo(p.x - 12, p.y - 58 + bob); ctx.lineTo(p.x + 12, p.y - 58 + bob); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function waypointTarget(state) {
    if (state.mode === 'mission') {
      const m = state.missionIndex;
      const steps = [
        [{ x: 700, y: 650 }, { x: 1100, y: 650 }, { x: 1100, y: 1000 }],
        [{ x: 600, y: 1750 }, { x: 700, y: 1000 }, { x: 700, y: 1000 }],
        [{ x: 450, y: 750 }, { x: 2100, y: 1600 }, { x: 2400, y: 1450 }],
        [{ x: 1285, y: 1000 }, { x: 1500, y: 1000 }],
        [{ x: 1285, y: 650 }, { x: 1500, y: 650 }],
        [{ x: 400, y: 300 }, { x: 400, y: 300 }, { x: 700, y: 300 }],
      ];
      const list = steps[m] || null;
      return list ? list[Math.min(state.missionStep, list.length - 1)] : null;
    }
    if (state.job) return { x: state.job.def.tx, y: state.job.def.ty };
    return null;
  }

  function drawMinimap(state) {
    const R = 92, cx = R + 22, cy = view.h - R - 22;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#1d2340'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    const s = (R * 2) / WORLD.w;
    ctx.fillStyle = '#2ee6d6'; ctx.fillRect(cx + (BEACH.seaX - 0) * 0 + (BEACH.x0) * s - R + R, cy - R, 0, 0);
    ctx.fillStyle = '#19b8c9'; ctx.fillRect(cx + (BEACH.seaX * s) - R, cy - R, R * 2, R * 2);
    ctx.fillStyle = '#f2d492'; ctx.fillRect(cx + (BEACH.x0 * s) - R, cy - R, (BEACH.seaX - BEACH.x0) * s, R * 2);
    ctx.fillStyle = '#1fb6c9'; ctx.fillRect(cx + (CANAL.x0 * s) - R, cy + (CANAL.y0 * s) - R, (CANAL.x1 - CANAL.x0) * s, (CANAL.y1 - CANAL.y0) * s);
    ctx.strokeStyle = '#3a3a4d'; ctx.lineWidth = 3;
    for (const a of AVENUES) { ctx.beginPath(); ctx.moveTo(cx + a * s - R, cy - R); ctx.lineTo(cx + a * s - R, cy + R); ctx.stroke(); }
    for (const st of STREETS) { ctx.beginPath(); ctx.moveTo(cx - R, cy + st * s - R); ctx.lineTo(cx + R, cy + st * s - R); ctx.stroke(); }
    const dot = (x, y, color, r) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx + x * s - R, cy + y * s - R, r, 0, Math.PI * 2); ctx.fill(); };
    for (const v of state.vehicles) if (v.active && v.driver === 'traffic') dot(v.x, v.y, '#9aa3b2', 2);
    for (const pol of state.police) if (pol.active) dot(pol.x, pol.y, '#2e6bff', 3.5);
    const t = waypointTarget(state);
    if (t) { dot(t.x, t.y, '#ffd23e', 5); ctx.strokeStyle = '#ffd23e'; ctx.beginPath(); ctx.arc(cx + t.x * s - R, cy + t.y * s - R, 8, 0, Math.PI * 2); ctx.stroke(); }
    dot(state.player.x, state.player.y, '#fff', 4);
    ctx.restore();
    ctx.strokeStyle = '#2ee6d6'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    text(state.district.name, cx, cy - R - 8, 13, '#2ee6d6', 'center');
  }

  function drawHud(state) {
    const p = state.player;
    // Money + wanted stars, top right. Stars are drawn shapes, never glyphs,
    // so a wanted level reads the same in every font.
    text(`$${Math.floor(p.money).toLocaleString('en-US')}`, view.w - 24, 44, 30, PALETTE.money, 'right');
    for (let i = 0; i < 5; i += 1) {
      const sx = view.w - 30 - i * 30, sy = 66;
      ctx.beginPath();
      for (let k = 0; k < 10; k += 1) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 === 0 ? 11 : 5;
        const px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (i < state.wanted) { ctx.fillStyle = state.wanted >= 3 ? '#ff5e7a' : '#ffd23e'; ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    if (state.wanted > 0) {
      const label = state.wantedPhase === 'search' ? `SEARCHING — escape ${Math.floor(state.escapeProgress * 100)}%` : state.wanted >= 3 ? 'HELICOPTER OVERHEAD' : 'IN SIGHT';
      text(label, view.w - 24, 104, 14, '#ff8fab', 'right');
    }
    // Weapon + ammo, top right under the stars.
    const w = WEAPONS[p.weapon];
    text(`${w.name}  ${p.ammo[p.weapon]} / ${p.reserve[p.weapon]}`, view.w - 24, 132, 18, '#fff', 'right');
    // Health / armour bars, top left under the radio line.
    const barY = 66;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(22, barY, 190, 12);
    ctx.fillStyle = '#7dffa8'; ctx.fillRect(22, barY, 190 * Math.max(0, p.health / 100), 12);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(22, barY + 16, 190, 12);
    ctx.fillStyle = '#7fd4ff'; ctx.fillRect(22, barY + 16, 190 * Math.max(0, p.armor / 100), 12);
    text('HEALTH', 218, barY + 11, 11, '#fff', 'left');
    text('ARMOR', 218, barY + 27, 11, '#fff', 'left');
    // Speed, bottom right, big — only while driving.
    if (p.vehicle) {
      const kmh = Math.round(Math.abs(p.speed || 0) * 0.16);
      text(String(kmh), view.w - 30, view.h - 44, 52, '#fff', 'right');
      text('KM/H', view.w - 30, view.h - 18, 15, PALETTE.muted, 'right');
      text(p.vehicle.def.name.toUpperCase(), view.w - 30, view.h - 84, 15, PALETTE.cyan, 'right');
    }
    // District banner, big italic, bottom right above the speed.
    if (state.banner && state.banner.t > 0) {
      text(state.banner.title, view.w - 30, view.h - 130, 30, '#fff', 'right', true);
      text(state.banner.sub, view.w - 30, view.h - 106, 16, PALETTE.cyan, 'right');
    }
    // Mission objective bar, bottom centre.
    const objective = objectiveText(state);
    if (objective) {
      const wdt = Math.min(760, view.w * 0.6);
      panel((view.w - wdt) / 2, view.h - 66, wdt, 46);
      text(objective, view.w / 2, view.h - 36, 17, '#fff', 'center');
    }
    // Dialogue line above the objective bar.
    if (state.dialogue && state.dialogue.t > 0) {
      text(`${state.dialogue.who}: ${state.dialogue.text}`, view.w / 2, view.h - 84, 17, '#ffd9a0', 'center');
    }
    // Bust progress while an arrest is closing in.
    if (state.bust > 0.02) {
      panel(view.w / 2 - 180, 90, 360, 40);
      text('BUSTED — break away!', view.w / 2, 118, 18, '#ff5e7a', 'center');
      ctx.fillStyle = '#ff2e4d'; ctx.fillRect(view.w / 2 - 170, 126, 340 * state.bust, 6);
    }
    // Radio station + time of day, small, top left.
    text(`♪ ${state.radioName || 'NEON 88 — Sunset Drive'} · ${state.dayNight === 'night' ? 'NIGHT' : 'SUNSET'}`, 22, 36, 14, PALETTE.muted, 'left');
    drawMinimap(state);
  }

  function objectiveText(state) {
    if (state.mode === 'mission') {
      const titles = ['RETURN TO LA', 'MIDNIGHT CARGO', 'FESTIVAL OF LIGHTS', 'CANAL CROSSING', 'LAST BRIDGE', 'THE BURNING CITY'];
      const t = titles[state.missionIndex] || '';
      return `MISSION ${state.missionIndex + 1}: ${t} — follow the yellow waypoint`;
    }
    if (state.job) return `SIDE JOB: ${state.job.def.title} — reach the waypoint`;
    return 'FREE ROAM — press M for the next mission, F to steal a car';
  }

  function drawTitle(state, save) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(16,8,32,0.55)'; ctx.fillRect(0, 0, view.w, view.h);
    text('NEON DELTA LA', 64, 170, 64, '#ff7a1a', 'left', true);
    text('AN OPEN-WORLD CRIME GAME', 66, 206, 22, PALETTE.cyan, 'left');
    text('Mara Solano is back in Los Angeles. Her sister is gone —', 66, 244, 17, '#fff', 'left');
    text('and the city is watching. Steal, drive, outrun the law.', 66, 268, 17, '#fff', 'left');
    panel(64, 300, 460, 150);
    text('NEW GAME', 88, 348, 26, '#fff', 'left');
    if (save) text('CONTINUE  —  $' + Math.floor(save.money).toLocaleString('en-US'), 88, 388, 22, '#7dffa8', 'left');
    else text('CONTINUE  —  no save yet', 88, 388, 22, '#8b93a3', 'left');
    text('Press Enter or click to start', 88, 424, 16, PALETTE.muted, 'left');
    panel(64, 470, 460, 190);
    text('CONTROLS', 88, 502, 18, '#ffd23e', 'left');
    const lines = [
      'WASD move / drive    Mouse aim    Click shoot',
      'Shift sprint    Space handbrake / drift',
      'F enter, exit or carjack    E talk / interact',
      'R reload    1-3 switch weapon    X radio',
      'Q next station    H horn    Tab city map',
      'Esc pause    M next mission    N save game',
    ];
    lines.forEach((l, i) => text(l, 88, 528 + i * 20, 14, '#eef1f5', 'left'));
  }

  function drawPaused(state) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(10,6,24,0.6)'; ctx.fillRect(0, 0, view.w, view.h);
    panel(view.w / 2 - 260, view.h / 2 - 130, 520, 260);
    text('PAUSED', view.w / 2, view.h / 2 - 78, 40, '#fff', 'center');
    text('Esc resume  •  N save game  •  M next mission', view.w / 2, view.h / 2 - 30, 17, PALETTE.muted, 'center');
    text('The city waits for you.', view.w / 2, view.h / 2 + 6, 17, '#fff', 'center');
    text('Radio: X on/off, Q next station', view.w / 2, view.h / 2 + 40, 15, PALETTE.muted, 'center');
    text('Save: LocalStorage — progress survives a reload', view.w / 2, view.h / 2 + 66, 15, PALETTE.muted, 'center');
  }

  function drawBusted(state) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(10,6,24,0.72)'; ctx.fillRect(0, 0, view.w, view.h);
    panel(view.w / 2 - 280, view.h / 2 - 120, 560, 240);
    text('BUSTED', view.w / 2, view.h / 2 - 66, 48, '#ff5e7a', 'center');
    text('The police took $200. Mara wakes at the hospital.', view.w / 2, view.h / 2 - 18, 17, '#fff', 'center');
    text('Press Enter to get back on the streets', view.w / 2, view.h / 2 + 22, 17, PALETTE.muted, 'center');
  }

  function draw(state, screen, save) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a0f2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (screen === SCREEN_TITLE) { drawTitle(state, save); return; }
    drawWorld(state);
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPaused(state);
    else if (screen === SCREEN_BUSTED) drawBusted(state);
  }

  return { draw, resize };
}
