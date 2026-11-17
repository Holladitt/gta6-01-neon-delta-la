// DOM HUD: money, wanted stars, health/armour, speed, circular minimap,
// mission bar, dialogue, district banner and the title/pause/busted screens.
// The HUD is DOM (crisp at any resolution) while the 3D world is WebGL;
// the minimap and the full city map are small 2D canvases drawn top-down.
// Stars are SVG paths, never font glyphs, so a wanted level reads the same
// in every font.
import { AVENUES, BEACH, CANAL, DISTRICTS, STREETS, WEAPONS, WORLD } from './config.js';
import { missionWaypoint } from './missions.js';

const STAR_PATH = 'M12 1 L14.7 8.6 L22.8 8.9 L16.7 13.7 L18.8 21.5 L12 17.3 L5.2 21.5 L7.3 13.7 L1.2 8.9 L9.3 8.6 Z';

function starSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '26');
  svg.setAttribute('height', '26');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', STAR_PATH);
  svg.appendChild(path);
  return { svg, path };
}

function clockText(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    clock: $('clock'), radio: $('radio'), money: $('money'), stars: $('stars'),
    wantedLabel: $('wanted-label'), weapon: $('weapon'),
    healthFill: $('health-fill'), armorFill: $('armor-fill'),
    speed: $('speed'), speedUnit: $('speed-unit'), vehicleName: $('vehicle-name'),
    districtTitle: $('district-title'), districtSub: $('district-sub'),
    objective: $('objective'), dialogue: $('dialogue'),
    bust: $('bust'), bustFill: $('bust-fill'), prompt: $('prompt'),
    minimap: $('minimap'), mapOverlay: $('map-overlay'), mapCanvas: $('map-canvas'),
    titleScreen: $('title-screen'), continueLine: $('continue-line'),
    pauseScreen: $('pause-screen'), bustedScreen: $('busted-screen'),
    crosshair: $('crosshair'), hud: $('hud'),
  };
  const starPaths = [];
  for (let i = 0; i < 5; i += 1) {
    const { svg, path } = starSvg();
    els.stars.appendChild(svg);
    starPaths.push(path);
  }
  const mm = els.minimap.getContext('2d');
  const mapCtx = els.mapCanvas.getContext('2d');

  function drawMap(ctx, size, state, showLabels) {
    const s = size / WORLD.w;
    ctx.clearRect(0, 0, size, size * (WORLD.h / WORLD.w));
    ctx.fillStyle = '#1d2340';
    ctx.fillRect(0, 0, size, size * (WORLD.h / WORLD.w));
    ctx.fillStyle = '#19b8c9';
    ctx.fillRect(BEACH.seaX * s, 0, size, size * (WORLD.h / WORLD.w));
    ctx.fillStyle = '#f2d492';
    ctx.fillRect(BEACH.x0 * s, 0, (BEACH.seaX - BEACH.x0) * s, size * (WORLD.h / WORLD.w));
    ctx.fillStyle = '#1fb6c9';
    ctx.fillRect(CANAL.x0 * s, CANAL.y0 * s, (CANAL.x1 - CANAL.x0) * s, (CANAL.y1 - CANAL.y0) * s);
    ctx.strokeStyle = '#3a3a4d';
    ctx.lineWidth = Math.max(2, size / 260);
    for (const a of AVENUES) { ctx.beginPath(); ctx.moveTo(a * s, 0); ctx.lineTo(a * s, size * (WORLD.h / WORLD.w)); ctx.stroke(); }
    for (const st of STREETS) { ctx.beginPath(); ctx.moveTo(0, st * s); ctx.lineTo(size, st * s); ctx.stroke(); }
    if (showLabels) {
      ctx.font = `bold ${Math.round(size / 34)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      for (const d of DISTRICTS) {
        ctx.fillStyle = d.color;
        const w = ctx.measureText(d.name).width;
        const cx = Math.max(w / 2 + 4, Math.min(size - w / 2 - 4, ((d.x0 + d.x1) / 2) * s));
        ctx.fillText(d.name, cx, ((d.y0 + d.y1) / 2) * s);
      }
    }
    const dot = (x, y, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x * s, y * s, r, 0, Math.PI * 2); ctx.fill();
    };
    for (const v of state.vehicles) if (v.active && v.driver === 'traffic') dot(v.x, v.y, '#9aa3b2', Math.max(1.5, size / 500));
    for (const pol of state.police) if (pol.active) dot(pol.x, pol.y, '#2e6bff', Math.max(2, size / 260));
    const wp = missionWaypoint(state) || (state.job ? { x: state.job.def.tx, y: state.job.def.ty } : null);
    if (wp) {
      dot(wp.x, wp.y, '#ffd23e', Math.max(3, size / 130));
      ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wp.x * s, wp.y * s, Math.max(5, size / 90), 0, Math.PI * 2); ctx.stroke();
    }
    // Player arrow.
    const p = state.player;
    ctx.save();
    ctx.translate(p.x * s, p.y * s);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
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

  function nearestCarPrompt(state) {
    const p = state.player;
    if (p.vehicle) return '';
    let best = null, bd = 80 * 80;
    for (const v of state.vehicles) {
      if (!v.active) continue;
      const dx = p.x - v.x, dy = p.y - v.y, d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = v; }
    }
    if (!best) return '';
    return `F — Steal ${best.def.name}`;
  }

  function update(state, screen, save, extras) {
    const p = state.player;
    els.clock.textContent = `${clockText(state.clockMin)} · ${state.dayNight === 'night' ? 'NIGHT' : 'SUNSET'}`;
    els.radio.textContent = `♪ ${state.radioName || 'NEON 88 — Sunset Drive'}`;
    els.money.textContent = `$${Math.floor(p.money).toLocaleString('en-US')}`;
    for (let i = 0; i < 5; i += 1) {
      const on = i < state.wanted;
      starPaths[i].setAttribute('fill', on ? (state.wanted >= 3 ? '#ff5e7a' : '#ffd23e') : 'rgba(255,255,255,0.25)');
      starPaths[i].setAttribute('stroke', on ? 'none' : 'rgba(255,255,255,0.6)');
    }
    if (state.wanted > 0) {
      const label = state.wantedPhase === 'search'
        ? `SEARCHING — escape ${Math.floor(state.escapeProgress * 100)}%`
        : state.wanted >= 3 ? 'HELICOPTER OVERHEAD' : 'IN SIGHT';
      els.wantedLabel.textContent = label;
      els.wantedLabel.style.display = 'block';
    } else els.wantedLabel.style.display = 'none';
    const w = WEAPONS[p.weapon];
    els.weapon.textContent = `${w.name}  ${p.ammo[p.weapon]} / ${p.reserve[p.weapon]}`;
    els.healthFill.style.width = `${Math.max(0, p.health)}%`;
    els.armorFill.style.width = `${Math.max(0, p.armor)}%`;
    if (p.vehicle) {
      els.speed.style.display = 'block';
      els.speedUnit.style.display = 'block';
      els.vehicleName.style.display = 'block';
      els.speed.textContent = String(Math.round(Math.abs(p.speed || 0) * 0.18));
      els.vehicleName.textContent = p.vehicle.def.name.toUpperCase();
    } else {
      els.speed.style.display = 'none';
      els.speedUnit.style.display = 'none';
      els.vehicleName.style.display = 'none';
    }
    if (state.banner && state.banner.t > 0) {
      els.districtTitle.style.opacity = Math.min(1, state.banner.t);
      els.districtSub.style.opacity = Math.min(1, state.banner.t);
      els.districtTitle.textContent = state.banner.title;
      els.districtSub.textContent = state.banner.sub;
    } else {
      els.districtTitle.style.opacity = 0;
      els.districtSub.style.opacity = 0;
    }
    els.objective.textContent = objectiveText(state);
    if (state.dialogue && state.dialogue.t > 0) {
      els.dialogue.style.display = 'block';
      els.dialogue.textContent = `${state.dialogue.who}: ${state.dialogue.text}`;
    } else els.dialogue.style.display = 'none';
    if (state.bust > 0.02) {
      els.bust.style.display = 'block';
      els.bustFill.style.width = `${Math.round(state.bust * 100)}%`;
    } else els.bust.style.display = 'none';
    const prompt = screen === 'play' ? nearestCarPrompt(state) : '';
    els.prompt.textContent = prompt;
    els.prompt.style.display = prompt ? 'block' : 'none';
    // Crosshair follows the mouse while on foot.
    if (screen === 'play' && !p.vehicle && extras) {
      els.crosshair.style.display = 'block';
      els.crosshair.style.left = `${extras.mouseX}px`;
      els.crosshair.style.top = `${extras.mouseY}px`;
    } else els.crosshair.style.display = 'none';
    // Minimap + full map.
    drawMap(mm, els.minimap.width, state, false);
    if (extras && extras.showMap) {
      els.mapOverlay.style.display = 'flex';
      drawMap(mapCtx, els.mapCanvas.width, state, true);
    } else els.mapOverlay.style.display = 'none';
    // Screens.
    els.titleScreen.style.display = screen === 'title' ? 'flex' : 'none';
    els.pauseScreen.style.display = screen === 'paused' ? 'flex' : 'none';
    els.bustedScreen.style.display = screen === 'busted' ? 'flex' : 'none';
    els.hud.style.display = screen === 'play' || screen === 'paused' || screen === 'busted' ? 'block' : 'none';
    if (save) els.continueLine.textContent = `CONTINUE  —  $${Math.floor(save.money).toLocaleString('en-US')}`;
    else els.continueLine.textContent = 'CONTINUE  —  no save yet';
  }

  return { update };
}
