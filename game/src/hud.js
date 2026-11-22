// HUD: money and wanted stars top-right, circular minimap
// bottom-left, big speed bottom-right, mission bar bottom-centre,
// big italic district name, district standing bar, COVER meter,
// tapes counter, weapon + tier, dispatch panel, crew panel,
// radio, weapon wheel, and toasts. Pure DOM; updates from the
// world every frame.
import { districtById, RADIO } from './config.js';
import { rankFor } from './rank.js';
import { currentWeapon, wheelItems } from './combat.js';
import { buildDispatch } from './dispatch.js';
import { coverLevel, witnessCount } from './cover.js';
import { tapesFound } from './races.js';
import { ownedUpgrades } from './garage.js';
import { phaseFor } from './lights.js';
import { missionById, currentObjective } from './missions.js';
import { drawPortrait, maraPortrait, contactPortrait } from './portraits.js';

// Portrait colours for the three crew members (drawn in the crew panel).
const CREW_FACES = {
  juno: { name: 'Juno Reyes', skin: 0xe0ac69, hair: 0x1a1a1a, shirt: 0x3498db },
  petra: { name: 'Petra Hale', skin: 0xc68642, hair: 0x2c3e50, shirt: 0x2ecc71 },
  cassia: { name: 'Cassia Wren', skin: 0xffdbac, hair: 0x1a1a1a, shirt: 0x9b59b6 },
};

export function showDialogue(h, speaker, line) {
  if (!h.dialogue) return;
  h.dialogueName.textContent = speaker.toUpperCase();
  h.dialogueLine.textContent = line;
  h.dialogue.style.display = 'flex';
  if (speaker === 'Mara Solano') maraPortrait(h.dialoguePortrait, 64);
  else contactPortrait(h.dialoguePortrait, speaker, 64);
}

export function createHud(world) {
  const root = document.createElement('div');
  root.id = 'hud';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:Arial,sans-serif;color:#fff;z-index:10;';
  root.innerHTML = `
    <div id="hud-top-right" style="position:absolute;top:12px;right:16px;text-align:right">
      <div id="hud-money" style="font-size:30px;font-weight:900;text-shadow:2px 2px 0 #000">$500</div>
      <div id="hud-stars" style="font-size:26px;letter-spacing:2px;text-shadow:2px 2px 0 #000"></div>
      <div id="hud-rank" style="font-size:15px;font-weight:700;text-shadow:1px 1px 0 #000"></div>
      <div id="hud-radio" style="font-size:13px;color:#f7d154;text-shadow:1px 1px 0 #000">${RADIO}</div>
    </div>
    <div id="hud-district" style="position:absolute;top:12px;left:16px">
      <div id="hud-district-name" style="font-size:34px;font-style:italic;font-weight:900;text-shadow:2px 2px 0 #000">Downtown</div>
      <div id="hud-standing" style="width:220px;height:12px;background:rgba(0,0,0,0.55);border:1px solid #fff;margin-top:4px"><div id="hud-standing-fill" style="height:100%;width:0%;background:#1abc9c"></div></div>
      <div id="hud-standing-text" style="font-size:12px;text-shadow:1px 1px 0 #000">STANDING 0/100</div>
      <div id="hud-cover" style="margin-top:6px;font-size:13px;font-weight:700;text-shadow:1px 1px 0 #000">COVER 100</div>
      <div id="hud-tapes" style="font-size:13px;text-shadow:1px 1px 0 #000">AURORA TAPES 0/20</div>
    </div>
    <canvas id="hud-minimap" width="180" height="180" style="position:absolute;left:16px;bottom:16px;border-radius:50%;border:3px solid rgba(255,255,255,0.8);background:rgba(0,0,0,0.55)"></canvas>
    <div id="hud-speed" style="position:absolute;right:20px;bottom:16px;font-size:44px;font-weight:900;text-shadow:2px 2px 0 #000">0</div>
    <div id="hud-speed-unit" style="position:absolute;right:22px;bottom:64px;font-size:13px;text-shadow:1px 1px 0 #000">MPH</div>
    <div id="hud-mission" style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,0.6);padding:8px 18px;font-size:16px;font-weight:700;white-space:nowrap">FREE ROAM</div>
    <div id="hud-mission-next" style="position:absolute;left:50%;bottom:58px;transform:translateX(-50%);font-size:13px;font-weight:700;color:#f7d154;text-shadow:1px 1px 0 #000;white-space:nowrap"></div>
    <div id="hud-dialogue" style="position:absolute;left:50%;top:12px;transform:translateX(-50%);display:none;max-width:560px;background:rgba(0,0,0,0.72);border:1px solid rgba(255,255,255,0.35);padding:8px 12px;align-items:center;gap:10px"><canvas id="hud-dialogue-portrait" width="64" height="64" style="flex:0 0 64px"></canvas><div><div id="hud-dialogue-name" style="font-size:12px;font-weight:900;color:#1abc9c;letter-spacing:1px"></div><div id="hud-dialogue-line" style="font-size:15px;font-weight:700"></div></div></div>
    <div id="hud-weapon" style="position:absolute;right:20px;bottom:110px;font-size:15px;font-weight:700;text-align:right;text-shadow:1px 1px 0 #000"></div>
    <div id="hud-dispatch" style="position:absolute;right:16px;top:150px;background:rgba(0,0,0,0.55);padding:8px 10px;font-size:12px;line-height:1.5"></div>
    <div id="hud-crew" style="position:absolute;left:16px;top:170px;background:rgba(0,0,0,0.55);padding:8px 10px;font-size:12px;line-height:1.6"></div>
    <div id="hud-toast" style="position:absolute;left:50%;top:22%;transform:translateX(-50%);font-size:22px;font-weight:900;text-shadow:2px 2px 0 #000"></div>
    <div id="hud-wheel" style="position:absolute;left:80%;top:36%;transform:translate(-50%,-50%);width:220px;height:220px;border-radius:50%;background:rgba(0,0,0,0.72);border:3px solid #f7d154;display:none"></div>
    <div id="hud-shop" style="position:absolute;right:16px;top:10%;background:rgba(10,20,30,0.92);border:2px solid #1abc9c;padding:14px 18px;font-size:14px;line-height:1.7;display:none;min-width:380px"></div>
    <div id="hud-garage" style="position:absolute;right:16px;top:10%;background:rgba(10,20,30,0.92);border:2px solid #e67e22;padding:14px 18px;font-size:14px;line-height:1.7;display:none;min-width:380px"></div>
  `;
  document.body.appendChild(root);
  return {
    root,
    money: root.querySelector('#hud-money'),
    stars: root.querySelector('#hud-stars'),
    rank: root.querySelector('#hud-rank'),
    districtName: root.querySelector('#hud-district-name'),
    standingFill: root.querySelector('#hud-standing-fill'),
    standingText: root.querySelector('#hud-standing-text'),
    cover: root.querySelector('#hud-cover'),
    tapes: root.querySelector('#hud-tapes'),
    minimap: root.querySelector('#hud-minimap'),
    speed: root.querySelector('#hud-speed'),
    mission: root.querySelector('#hud-mission'),
    missionNext: root.querySelector('#hud-mission-next'),
    dialogue: root.querySelector('#hud-dialogue'),
    dialoguePortrait: root.querySelector('#hud-dialogue-portrait'),
    dialogueName: root.querySelector('#hud-dialogue-name'),
    dialogueLine: root.querySelector('#hud-dialogue-line'),
    weapon: root.querySelector('#hud-weapon'),
    dispatch: root.querySelector('#hud-dispatch'),
    crew: root.querySelector('#hud-crew'),
    toast: root.querySelector('#hud-toast'),
    wheel: root.querySelector('#hud-wheel'),
    shop: root.querySelector('#hud-shop'),
    garage: root.querySelector('#hud-garage'),
  };
}

function starRow(level) {
  let s = '';
  for (let i = 0; i < 5; i += 1) s += i < level ? '★' : '☆';
  return s;
}

export function updateHud(h, world, police, traffic) {
  h.money.textContent = '$' + Math.floor(world.money).toLocaleString('en-US');
  h.stars.textContent = starRow(world.wanted.level);
  h.stars.style.color = world.wanted.level >= 4 ? '#ff4444' : '#ffd76a';
  const r = rankFor(world.rp);
  h.rank.textContent = 'RANK ' + r.code + ' ' + r.name + '  •  DAY ' + world.day + '  •  ' + phaseFor(world.hour).toUpperCase();
  const d = districtById(world.districtId);
  h.districtName.textContent = d.name;
  const st = world.standing[world.districtId] || 0;
  h.standingFill.style.width = st + '%';
  h.standingText.textContent = 'STANDING ' + st + '/100' + (st >= 50 ? '  •  10% SHOP DISCOUNT' : '');
  const cv = coverLevel(world.cover);
  h.cover.textContent = 'COVER ' + cv + (witnessCount(world.cover) > 0 ? '  •  WITNESS! ' + witnessCount(world.cover) : '');
  h.cover.style.color = cv < 40 ? '#ff6666' : '#fff';
  h.tapes.textContent = 'AURORA TAPES ' + tapesFound(world.tapes) + '/20';
  const w = currentWeapon(world.combat);
  h.speed.textContent = world.boat.boarded
    ? String(Math.round(Math.abs(world.boat.speed) * 2.2))
    : String(Math.round(Math.abs(world.car.speed) * 2.2));
  h.weapon.textContent = w.name + '  •  TIER ' + w.tier + '  •  COND ' + Math.round(world.car.condition) + '%';
  const curMission = missionById(world.missions.current);
  const curObj = currentObjective(world.missions);
  if (curMission) {
    const stage = (world.missions.objective || 0) + 1;
    const total = curMission.points ? curMission.points.length : 1;
    h.mission.textContent = 'M' + curMission.id + ' ' + curMission.title + ' · TAHAP ' + stage + '/' + total + ' — ' + (curObj ? curObj.label : 'DONE');
    const next = curMission.points && world.missions.objective + 1 < curMission.points.length
      ? curMission.points[world.missions.objective + 1].label : 'Finish the job';
    h.missionNext.textContent = 'NEXT: ' + next;
  } else {
    h.mission.textContent = 'FREE ROAM — NEON DELTA';
    h.missionNext.textContent = '';
  }
  // Minimap: circular, player centre, police red, mission gold.
  const ctx = h.minimap.getContext('2d');
  const S = 180; const C = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(C, C, C - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(20,40,50,0.9)';
  ctx.fillRect(0, 0, S, S);
  const scale = S / 900;
  const px = world.player.x; const pz = world.player.z;
  const toMap = (x, z) => [C + (x - px) * scale, C + (z - pz) * scale];
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  for (let x = -560; x <= 560; x += 120) {
    const [ax] = toMap(x, 0);
    ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, S); ctx.stroke();
  }
  for (let z = -560; z <= 560; z += 120) {
    const [, az] = toMap(0, z);
    ctx.beginPath(); ctx.moveTo(0, az); ctx.lineTo(S, az); ctx.stroke();
  }
  ctx.fillStyle = '#ffd76a';
  const mobj = currentObjective(world.missions);
  if (mobj) {
    const [mx, mz] = toMap(mobj.x, mobj.z);
    ctx.beginPath(); ctx.arc(mx, mz, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff4444';
  for (const c of police.cars) {
    const [cx, cz] = toMap(c.x, c.z);
    ctx.fillRect(cx - 2, cz - 2, 4, 4);
  }
  if (police.heli) {
    const [hx, hz] = toMap(police.heli.x, police.heli.z);
    ctx.beginPath(); ctx.arc(hx, hz, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#1abc9c';
  ctx.beginPath(); ctx.arc(C, C, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(d.name.toUpperCase(), C, S - 20);
  // Dispatch panel (hidden while the shop or garage panel is open, so
  // the panels never stack over each other on the right side).
  const panelOpen = h.shop.style.display === 'block' || h.garage.style.display === 'block';
  h.dispatch.style.display = panelOpen ? 'none' : 'block';
  const rows = buildDispatch(police.cars, police.heli, world.player.x, world.player.z, world.wanted, police.swat).slice(0, 5);
  h.dispatch.innerHTML = '<b>NDPD DISPATCH</b><br>' + (rows.length ? rows.map((x) => x.callsign + ' • ' + x.role + ' • ' + x.distance + 'm').join('<br>') : 'NO UNITS');
  // Crew panel with portraits.
  h.crew.innerHTML = '<b>CREW</b><br>' + world.crewList.map((c) => '<span style="display:inline-flex;align-items:center;gap:6px"><canvas class="crew-face" data-crew="' + c.id + '" width="28" height="28"></canvas>' + c.ability + ' [' + c.key + '] ' + c.text + (c.ready ? '' : ' (' + Math.ceil(c.left) + 's)') + '</span>').join('<br>');
  h.crew.querySelectorAll('.crew-face').forEach((cv) => {
    const face = CREW_FACES[cv.getAttribute('data-crew')];
    if (face) drawPortrait(cv, face, 28);
  });
  // Toast.
  h.toast.textContent = world.toast || '';
  // Weapon wheel (small, off-centre, so it never covers the hero car).
  if (world.combat.wheelOpen) {
    h.wheel.style.display = 'block';
    const items = wheelItems(world.shop.owned);
    h.wheel.innerHTML = '<div style="text-align:center;padding-top:10px;font-weight:900;font-size:13px">WEAPON WHEEL</div>' +
      items.map((it) => '<div style="text-align:center;padding:3px;font-size:12px;color:' + (it.owned ? '#fff' : '#888') + '">' + (it.owned ? '●' : '○') + ' TIER ' + it.tier + ' — ' + it.name + '</div>').join('');
  } else {
    h.wheel.style.display = 'none';
  }
}

export function showShop(h, html) {
  h.shop.innerHTML = html;
  h.shop.style.display = 'block';
}

export function hideShop(h) {
  h.shop.style.display = 'none';
}

export function showGarage(h, html) {
  h.garage.innerHTML = html;
  h.garage.style.display = 'block';
}

export function hideGarage(h) {
  h.garage.style.display = 'none';
}
