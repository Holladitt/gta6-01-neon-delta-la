// hud.js — DOM HUD: title, dialogue, mission bar, minimap, speed, standing,
// COVER, tapes, money, weapon wheel, shop, dispatch, toasts, pause menu.
import { DISTRICTS, WEAPONS } from './config.js';
import { drawPortrait } from './portraits.js';
import { rankFor } from './rank.js';

function el(id) {
  return document.getElementById(id);
}
export function createHUD() {
  return {
    root: el('hud'),
    titleScreen: el('title-screen'),
    slotList: el('slot-list'),
    dialogue: el('dialogue'),
    dialogueName: el('dialogue-name'),
    dialogueText: el('dialogue-text'),
    portrait: el('portrait'),
    missionBar: el('mission-bar'),
    missionTitle: el('mission-title'),
    missionObjective: el('mission-objective'),
    missionNext: el('mission-next'),
    districtLabel: el('district-label'),
    minimap: el('minimap'),
    speed: el('speed'),
    standingBar: el('standing-bar'),
    standingFill: el('standing-fill'),
    cover: el('hud-cover'),
    coverFill: el('cover-fill'),
    tapes: el('hud-tapes'),
    money: el('hud-money'),
    weapon: el('hud-weapon'),
    wheel: el('wheel'),
    shopPanel: el('shop-panel'),
    shopList: el('shop-list'),
    dispatchPanel: el('dispatch-panel'),
    dispatchList: el('dispatch-list'),
    toast: el('toast'),
    pauseMenu: el('pause-menu'),
    radio: el('radio-label'),
  };
}
export function showDialogue(hud, name, text) {
  if (!hud.dialogue) return;
  hud.dialogue.classList.remove('hidden');
  if (hud.dialogueName) hud.dialogueName.textContent = name;
  if (hud.dialogueText) hud.dialogueText.textContent = text;
  if (hud.portrait) drawPortrait(hud.portrait, name);
}
export function hideDialogue(hud) {
  if (hud.dialogue) hud.dialogue.classList.add('hidden');
}
export function setMissionBar(hud, title, objective, next) {
  if (!hud.missionBar) return;
  hud.missionBar.classList.remove('hidden');
  if (hud.missionTitle) hud.missionTitle.textContent = title;
  if (hud.missionObjective) hud.missionObjective.textContent = objective;
  if (hud.missionNext) hud.missionNext.textContent = next ? 'NEXT: ' + next : '';
}
export function showToast(hud, text, ms) {
  if (!hud.toast) return;
  hud.toast.textContent = text;
  hud.toast.classList.remove('hidden');
  clearTimeout(hud.toast._t);
  hud.toast._t = setTimeout(() => hud.toast.classList.add('hidden'), ms || 2500);
}
export function renderWheel(hud, combat, owned) {
  if (!hud.wheel) return;
  hud.wheel.innerHTML = '';
  for (const w of WEAPONS) {
    const d = document.createElement('div');
    d.className = 'wheel-item' + (owned[w.id] ? ' owned' : ' locked') + (combat.current === w.id ? ' active' : '');
    d.textContent = w.name + ' · T' + w.tier + (owned[w.id] ? '' : ' $' + w.price);
    hud.wheel.appendChild(d);
  }
}
export function renderShop(hud, shop, standing, district) {
  if (!hud.shopList) return;
  hud.shopList.innerHTML = '';
  for (const w of WEAPONS) {
    const d = document.createElement('div');
    d.className = 'shop-item';
    const owned = !!shop.owned[w.id];
    d.textContent = w.name + ' · Tier ' + w.tier + ' — ' + (owned ? 'OWNED' : '$' + w.price);
    if (!owned) {
      const b = document.createElement('button');
      b.textContent = 'BUY';
      b.dataset.weapon = w.id;
      d.appendChild(b);
    }
    hud.shopList.appendChild(d);
  }
}
export function renderDispatch(hud, rows) {
  if (!hud.dispatchList) return;
  hud.dispatchList.innerHTML = '';
  for (const r of rows) {
    const d = document.createElement('div');
    d.className = 'dispatch-row';
    d.textContent = r.callsign + ' · ' + r.role + ' · ' + r.distance + 'm' + (r.takedownIn !== undefined ? ' · takedown ' + r.takedownIn.toFixed(1) + 's' : '');
    hud.dispatchList.appendChild(d);
  }
}
export function drawMinimap(hud, world) {
  const c = hud.minimap;
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width;
  const H = c.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(10, 14, 24, 0.85)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
  ctx.clip();
  const sx = (x) => ((x + 800) / 1600) * W;
  const sz = (z) => ((z + 800) / 1600) * H;
  const colors = { downtown: '#3a4a6b', hills: '#4a3a5e', venice: '#1f6f6b', marina: '#1f5f8a', pier: '#8a6d3b', port: '#6b3a3a' };
  for (const d of DISTRICTS) {
    ctx.fillStyle = colors[d.id] || '#333';
    ctx.fillRect(sx(d.x0), sz(d.z0), sx(d.x1) - sx(d.x0), sz(d.z1) - sz(d.z0));
  }
  ctx.strokeStyle = 'rgba(255, 220, 120, 0.7)';
  ctx.lineWidth = 1;
  for (const ax of [-560, -320, -80, 160, 400]) {
    ctx.beginPath();
    ctx.moveTo(sx(ax), 0);
    ctx.lineTo(sx(ax), H);
    ctx.stroke();
  }
  for (const st of [-560, -320, -80, 160, 400]) {
    ctx.beginPath();
    ctx.moveTo(0, sz(st));
    ctx.lineTo(W, sz(st));
    ctx.stroke();
  }
  // Mission marker.
  const m = world.missions && world.missions.current <= 10 ? world.missions : null;
  if (m) {
    const pts = [null, null];
    void pts;
  }
  // Player dot.
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(sx(world.player.x), sz(world.player.z), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
export function updateHUD(hud, world) {
  if (!hud.root) return;
  const d = world.district ? (DISTRICTS.find((x) => x.id === world.district) || DISTRICTS[0]) : DISTRICTS[0];
  if (hud.districtLabel) hud.districtLabel.textContent = d.name.toUpperCase();
  if (hud.speed) hud.speed.textContent = Math.round(Math.abs(world.car.speed || 0) * 3.6) + ' km/h';
  if (hud.money) hud.money.textContent = '$' + world.money;
  if (hud.tapes) hud.tapes.textContent = 'TAPES ' + (world.tapes ? world.tapes.tapesFound : 0) + '/20';
  if (hud.coverFill) hud.coverFill.style.width = (world.cover ? world.cover.value : 100) + '%';
  if (hud.standingFill) {
    const s = world.standing ? (world.standing[world.district] || 0) : 0;
    hud.standingFill.style.width = s + '%';
  }
  if (hud.weapon) {
    const w = WEAPONS.find((x) => x.id === (world.combat ? world.combat.current : 'pistol')) || WEAPONS[0];
    hud.weapon.textContent = w.name + ' · TIER ' + w.tier;
  }
  if (hud.radio) hud.radio.textContent = 'RADIO: NEON 88';
  if (world.message) showToast(hud, world.message, 1800);
  drawMinimap(hud, world);
}
