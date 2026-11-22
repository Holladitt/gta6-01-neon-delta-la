// Entry point for Neon Delta LA: District Wars.
// ?shot=N opens a frozen diorama for the submission screenshots.
// Without it the title screen opens, then free-roam: drive with
// WASD, E enters a car, Q holds the weapon wheel, C/V/X fire crew
// abilities, Tab pauses, Enter starts the next mission.
import { createWorld, updateWorld, startMission, enterCar, exitCar } from './world.js';
import { createScene } from './scene.js';
import { createInput, bindInput } from './input.js';
import { createAudio, radioStation } from './audio.js';
import { MISSIONS, DISTRICTS, ENTRY_TITLE, districtAt } from './config.js';
import { currentMission, currentObjective } from './missions.js';
import { catalog, priceFor, isOwned } from './shop.js';
import { slotSummary, slotCount, saveGame, loadGame } from './save.js';
import { rankFor } from './rank.js';
import { shotByNumber } from './shots.js';
import { drawPortrait } from './portraits.js';
import { createHudState, moneyText, wantedStars, speedText } from './hud.js';

const params = new URLSearchParams(location.search);
const shotN = parseInt(params.get('shot') || '0', 10);
const world = createWorld(90210);
const input = createInput();
const audio = createAudio();
const hudState = createHudState();
const container = document.getElementById('game');
const api = createScene(container, world);
window.__game = api;
window.__game.world = world;

function el(id) {
  return document.getElementById(id);
}

function show(id, on) {
  const e = el(id);
  if (e) e.style.display = on ? 'block' : 'none';
}

function setText(id, text) {
  const e = el(id);
  if (e) e.textContent = text;
}

function drawMinimap() {
  const c = el('minimap');
  if (!c) return;
  const ctx = c.getContext('2d');
  const S = 160;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(0, 0, S, S);
  const colors = { downtown: '#8a8f96', venice: '#5f9ea0', marina: '#6a9bb5', hills: '#6f9e5f', pier: '#8a7a5a', port: '#9a8f7a' };
  for (const d of DISTRICTS) {
    ctx.fillStyle = colors[d.id] || '#7a9b58';
    ctx.fillRect(((d.x0 + 780) / 1560) * S, ((d.z0 + 780) / 1560) * S, ((d.x1 - d.x0) / 1560) * S, ((d.z1 - d.z0) / 1560) * S);
  }
  ctx.fillStyle = '#1f6fb2';
  ctx.fillRect(0, 0, (( -660 + 780) / 1560) * S, S);
  ctx.fillRect(0, ((635 + 780) / 1560) * S, S, S);
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(((world.player.x + 780) / 1560) * S - 3, ((world.player.z + 780) / 1560) * S - 3, 6, 6);
  const obj = currentObjective(world.missions);
  if (obj && world.state === 'MISSION') {
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(((obj.x + 780) / 1560) * S, ((obj.z + 780) / 1560) * S, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateHud() {
  setText('hud-money', moneyText(world.money) + '  ' + wantedStars(world.wanted.level));
  setText('hud-speed', speedText(world.car.speed));
  setText('hud-district', (world.district || 'downtown').toUpperCase());
  setText('hud-cover', 'COVER ' + Math.round(world.cover.value) + ' · TAPES ' + world.tapes.found.length + '/20 · ' + radioStation(audio));
  // In shot mode the mission bar is the shot's staged bar (set once by
  // renderMissionBar); free-roam updates it live from the mission state.
  if (!api.shot) {
    const m = currentMission(world.missions);
    if (m && world.state === 'MISSION') {
      const obj = currentObjective(world.missions);
      setText('mb-title', 'M' + m.id + ' ' + m.name + ' · TAHAP ' + (world.missions.objective + 1) + '/' + m.points.length);
      setText('mb-objective', obj ? obj.label : '');
      setText('mb-next', 'NEXT: ' + (m.next || ''));
    } else if (m) {
      setText('mb-title', 'FREE ROAM — M' + m.id + ' ' + m.name + ' READY');
      setText('mb-objective', 'Press Enter to start M' + m.id + ' ' + m.name);
      setText('mb-next', '');
    }
  }
  drawMinimap();
}

function renderWheel() {
  const w = el('wheel');
  if (!w) return;
  const open = input.wheel || (api.shot && api.shot.wheelOpen);
  w.style.display = open ? 'block' : 'none';
  if (!open) return;
  const tiers = [
    { tier: 1, name: 'PISTOL · SMG · SHOTGUN', owned: true },
    { tier: 2, name: 'DELTA CARBINE — $900', owned: isOwned(world.shop, 'carbine') },
    { tier: 3, name: 'LONGSHOT — $1,800', owned: isOwned(world.shop, 'longshot') },
    { tier: 4, name: 'MARAUDER — $2,500', owned: isOwned(world.shop, 'marauder') },
  ];
  w.innerHTML = '<div class="wheel-title">WEAPON WHEEL — HOLD Q</div>' + tiers.map((t) => '<div class="wheel-row' + (t.owned ? ' owned' : '') + '">TIER ' + t.tier + ' · ' + t.name + (t.owned ? ' ✓' : '') + '</div>').join('');
}

function renderShopPanel() {
  const p = el('shop-panel');
  if (!p) return;
  if (!api.shot || api.shot.n !== 2) {
    p.style.display = 'none';
    return;
  }
  p.style.display = 'block';
  const rows = catalog().map((w) => {
    const owned = isOwned(world.shop, w.id);
    const price = priceFor(world.shop, w.id, world.standing, world.district);
    return '<div class="shop-row' + (owned ? ' owned' : '') + '"><span class="shop-tier">TIER ' + w.tier + '</span> ' + w.name + ' — ' + (owned ? 'OWNED' : '$' + price) + '</div>';
  }).join('');
  p.innerHTML = '<div class="shop-title">DELTA ARMS</div>' + rows + '<div class="shop-note">Standing 10% off at 50+ in this district</div>';
}

function renderDialogue() {
  const d = el('dialogue');
  if (!d) return;
  const s = api.shot;
  if (!s || !s.dialogue) {
    d.style.display = 'none';
    return;
  }
  d.style.display = 'block';
  const name = s.dialogue.name;
  const line = s.dialogue.line;
  d.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 72;
  canvas.className = 'dlg-portrait';
  d.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const key = name.toLowerCase().includes('inez') ? 'inez' : (name.toLowerCase().includes('orin') ? 'orin' : 'mara');
  drawPortrait(ctx, key, 0, 0, 72);
  const n = document.createElement('div');
  n.className = 'dlg-name';
  n.textContent = name;
  d.appendChild(n);
  const l = document.createElement('div');
  l.className = 'dlg-line';
  l.textContent = line;
  d.appendChild(l);
}

function renderMissionBar() {
  const s = api.shot;
  if (!s || !s.missionBar) return;
  setText('mb-title', s.missionBar.title + ' · ' + s.missionBar.stage);
  setText('mb-objective', s.missionBar.objective);
  setText('mb-next', 'NEXT: ' + s.missionBar.next);
}

function renderTitle() {
  const t = el('title-screen');
  if (!t) return;
  if (world.state !== 'TITLE') {
    t.style.display = 'none';
    return;
  }
  t.style.display = 'block';
  const slots = el('title-slots');
  if (slots) {
    slots.innerHTML = '';
    for (let i = 0; i < slotCount(); i += 1) {
      const s = slotSummary(i);
      const row = document.createElement('div');
      row.className = 'slot-row';
      row.textContent = s ? ('SLOT ' + (i + 1) + ' — $' + s.money + ' · DAY ' + s.day + ' · ' + (s.rank || rankFor(s.rp || 0))) : ('SLOT ' + (i + 1) + ' — EMPTY');
      slots.appendChild(row);
    }
  }
}

function startFreeRoam() {
  world.state = 'FREE_ROAM';
  renderTitle();
}

function bindTitleButtons() {
  const ng = el('btn-new');
  if (ng) ng.addEventListener('click', () => startFreeRoam());
  const ct = el('btn-continue');
  if (ct) ct.addEventListener('click', () => {
    for (let i = slotCount() - 1; i >= 0; i -= 1) {
      if (slotSummary(i)) { loadGame(i); startFreeRoam(); return; }
    }
    startFreeRoam();
  });
  const ld = el('btn-load');
  if (ld) ld.addEventListener('click', () => {
    const s = slotSummary(0);
    if (s) loadGame(0);
    startFreeRoam();
  });
}

bindInput(input, world, (paused) => show('pause-menu', paused));
bindTitleButtons();

if (shotN >= 1 && shotN <= 4) {
  api.applyShot(shotN);
  // v26: shot 1 stages the hero car big in the lower frame, so its HUD
  // (dialogue + mission bar) moves to the top for this shot only.
  document.body.classList.toggle('shot1', shotN === 1);
  world.state = 'FREE_ROAM';
  const anchor = api.shot.mara || api.shot.car;
  if (anchor) world.district = districtAt(anchor.x, anchor.z).id;
  show('title-screen', false);
  show('hud', true);
  show('game-title', true);
  renderMissionBar();
  renderDialogue();
  renderWheel();
  renderShopPanel();
  updateHud();
} else {
  world.state = 'TITLE';
  renderTitle();
  show('hud', false);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (world.state !== 'TITLE' && !world.frozen) {
    updateWorld(world, input, dt);
  }
  api.update(dt, now);
  if (world.state !== 'TITLE') {
    updateHud();
    renderWheel();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Enter starts the next mission; E enters/exits the car.
window.addEventListener('keydown', (e) => {
  if (world.state === 'TITLE') return;
  if (e.key === 'Enter' && world.state === 'FREE_ROAM') {
    const m = currentMission(world.missions);
    if (m) startMission(world, m.id);
  }
  if (e.key.toLowerCase() === 'e') {
    if (world.player.onFoot) enterCar(world);
    else exitCar(world);
  }
});

document.title = ENTRY_TITLE;
