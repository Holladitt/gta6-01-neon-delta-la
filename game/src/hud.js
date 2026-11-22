// HUD: money, stars, weapon, cover, tapes, district, minimap, mission bar, dialogue.
import { DISTRICTS, districtAt } from './config.js';
import { currentMission, currentObjective } from './missions.js';
import { coverLevel } from './cover.js';
import { currentWeapon } from './combat.js';
import { portraitDataURL } from './portraits.js';
import { shotDef } from './shots.js';

let els = {};
export function bindHUD(world) {
  els = {
    money: document.getElementById('hud-money'),
    wanted: document.getElementById('hud-wanted'),
    weapon: document.getElementById('hud-weapon'),
    cover: document.getElementById('hud-cover'),
    tapes: document.getElementById('hud-tapes'),
    district: document.getElementById('hud-district'),
    standing: document.getElementById('hud-standing'),
    speed: document.getElementById('hud-speed'),
    mission: document.getElementById('hud-mission'),
    dialogue: document.getElementById('hud-dialogue'),
    minimap: document.getElementById('hud-minimap'),
    stats: document.getElementById('hud-stats'),
    wheel: document.getElementById('wheel'),
  };
}
function fmtHour(h) {
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
export function updateHUD(world, shotN) {
  if (!els.money) return;
  let missionTitle = '', objective = '', next = '', speaker = '', text = '';
  if (shotN >= 1 && shotN <= 4) {
    const def = shotDef(shotN);
    missionTitle = def.missionBar.title; objective = def.missionBar.objective; next = def.missionBar.next;
    speaker = def.dialogue.name; text = def.dialogue.text;
  } else {
    const m = currentMission(world.missions);
    if (m) {
      const obj = currentObjective(world.missions);
      missionTitle = 'M' + m.id + ' ' + m.name + ' · TAHAP ' + (world.missions.objectiveIndex + 1) + '/' + m.points.length;
      objective = obj ? obj.label : '';
      next = '—';
    }
  }
  els.money.textContent = '$' + world.money.toLocaleString('en-US');
  els.wanted.textContent = '★'.repeat(world.wanted.level) + '☆'.repeat(5 - world.wanted.level);
  const w = currentWeapon(world.combat);
  els.weapon.textContent = (w ? w.name : 'PISTOL') + ' · TIER ' + (w ? w.tier : 1);
  els.cover.textContent = 'COVER ' + Math.round(coverLevel(world.cover)) + '%';
  els.tapes.textContent = 'TAPES ' + world.tapes.found.length + '/20';
  const d = districtAt(world.player.x, world.player.z);
  els.district.textContent = d.name.toUpperCase();
  els.standing.textContent = 'STANDING ' + Math.round(world.standing[d.id] || 0);
  els.speed.textContent = Math.round(Math.abs(world.car.speed) * 3.2) + ' MPH';
  els.mission.innerHTML = '<b>' + missionTitle + '</b><span>' + objective + '</span><i>NEXT: ' + next + '</i>';
  els.stats.textContent = 'DAY ' + world.day + ' · ' + fmtHour(world.hour) + ' · RADIO: NEON 88 · RANK ' + world.rank;
  if (speaker) {
    els.dialogue.innerHTML = '<img src="' + portraitDataURL(speaker) + '" alt=""><div><b>' + speaker + '</b><p>' + text + '</p></div>';
  }
  if (els.wheel) els.wheel.style.display = world.combat.wheelOpen ? 'block' : 'none';
  drawMinimap(world);
}
function drawMinimap(world) {
  const c = els.minimap;
  if (!c) return;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const cols = { downtown: '#c0392b', hills: '#8e44ad', venice: '#27ae60', marina: '#2980b9', pier: '#e67e22', port: '#f1c40f' };
  for (const d of DISTRICTS) {
    g.fillStyle = cols[d.id] || '#888888';
    g.globalAlpha = 0.55;
    g.fillRect((d.x0 + 780) / 1560 * W, (d.z0 + 700) / 1480 * H, (d.x1 - d.x0) / 1560 * W, (d.z1 - d.z0) / 1480 * H);
  }
  g.globalAlpha = 1;
  // mission objective marker
  const obj = currentObjective(world.missions);
  if (obj && world.state === 'MISSION') {
    const ox = (obj.x + 780) / 1560 * W, oz = (obj.z + 700) / 1480 * H;
    g.fillStyle = '#ffd76a';
    g.beginPath(); g.arc(ox, oz, 4, 0, Math.PI * 2); g.fill();
  }
  const px = (world.player.x + 780) / 1560 * W;
  const pz = (world.player.z + 700) / 1480 * H;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(px, pz, 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#111111'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(px, pz, 4, 0, Math.PI * 2); g.stroke();
}
