// The HUD: money and wanted stars, circular minimap, speed, mission bar,
// district name, NDPD dispatch panel, crew panel, dialogue, shop, toasts.

import { WEAPONS, RANKS } from './config.js';
import { rankFor } from './rank.js';
import { districtAt } from './geo.js';
import { shopItems } from './shop.js';

export function createHud() {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div id="hud-money"></div>
    <div id="hud-dispatch"></div>
    <div id="hud-crew"></div>
    <div id="hud-district"></div>
    <div id="hud-mission"></div>
    <div id="hud-minimap-wrap"><canvas id="hud-minimap" width="220" height="220"></canvas></div>
    <div id="hud-speed"></div>
    <div id="hud-weapon"></div>
    <div id="hud-radio">RADIO: NEON 88</div>
    <div id="hud-hint">WASD DRIVE &nbsp;·&nbsp; E ENTER/EXIT &nbsp;·&nbsp; F INTERACT &nbsp;·&nbsp; R RELOAD &nbsp;·&nbsp; C PLATES &nbsp;·&nbsp; V REPAIR &nbsp;·&nbsp; X OVERWATCH &nbsp;·&nbsp; TAB SHOP &nbsp;·&nbsp; M RADIO</div>
    <div id="hud-dialogue"></div>
    <div id="hud-shop"></div>
    <div id="hud-toast"></div>
    <div id="hud-center"></div>
  `;
  const el = (id) => document.getElementById(id);
  const minimap = el('hud-minimap');
  const mctx = minimap.getContext('2d');
  let toastTimer = 0;
  let districtTimer = 0;
  let lastDistrict = '';
  let dialogueTimer = 0;

  function stars(n) {
    let out = '';
    for (let i = 0; i < 5; i++) out += i < n ? '★' : '☆';
    return out;
  }

  function drawMinimap(state) {
    const W = 220;
    const H = 220;
    const R = 104;
    const scale = R / 720;
    mctx.clearRect(0, 0, W, H);
    mctx.save();
    mctx.beginPath();
    mctx.arc(W / 2, H / 2, R, 0, Math.PI * 2);
    mctx.clip();
    mctx.fillStyle = 'rgba(10,18,26,0.82)';
    mctx.fillRect(0, 0, W, H);
    const px = state.x;
    const pz = state.z;
    const toMap = (x, z) => [W / 2 + (x - px) * scale, H / 2 + (z - pz) * scale];
    // water
    mctx.fillStyle = '#1b6ca8';
    mctx.fillRect(W / 2 + (540 - px) * scale, 0, W, H);
    // roads
    mctx.strokeStyle = 'rgba(200,200,200,0.5)';
    mctx.lineWidth = 2;
    for (let k = -8; k <= 8; k++) {
      const gx = W / 2 + (k * 80 - px) * scale;
      const gz = H / 2 + (k * 80 - pz) * scale;
      mctx.beginPath(); mctx.moveTo(gx, 0); mctx.lineTo(gx, H); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, gz); mctx.lineTo(W, gz); mctx.stroke();
    }
    // pier
    mctx.fillStyle = '#8a6a4a';
    const [pierX, pierY] = toMap(615, 422);
    mctx.fillRect(pierX - 22, pierY - 6, 44, 12);
    // mission marker
    if (state.missionTarget) {
      const [mx, my] = toMap(state.missionTarget.x, state.missionTarget.z);
      mctx.fillStyle = '#ffc300';
      mctx.beginPath();
      mctx.arc(mx, my, 7, 0, Math.PI * 2);
      mctx.fill();
      mctx.fillStyle = '#111';
      mctx.font = 'bold 10px Arial';
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      mctx.fillText('!', mx, my);
    }
    // police
    mctx.fillStyle = '#4a90ff';
    for (const car of state.policeCars || []) {
      const [cx, cy] = toMap(car.x, car.z);
      mctx.beginPath();
      mctx.arc(cx, cy, 4, 0, Math.PI * 2);
      mctx.fill();
    }
    // player arrow
    mctx.save();
    mctx.translate(W / 2, H / 2);
    mctx.rotate(state.heading || 0);
    mctx.fillStyle = '#ff5a5f';
    mctx.beginPath();
    mctx.moveTo(0, -9);
    mctx.lineTo(6, 7);
    mctx.lineTo(-6, 7);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
    mctx.restore();
    mctx.strokeStyle = 'rgba(255,255,255,0.75)';
    mctx.lineWidth = 3;
    mctx.beginPath();
    mctx.arc(W / 2, H / 2, R, 0, Math.PI * 2);
    mctx.stroke();
  }

  return {
    toast(msg) {
      el('hud-toast').textContent = msg;
      el('hud-toast').style.opacity = '1';
      toastTimer = 3;
    },
    showDialogue(name, color, line) {
      el('hud-dialogue').innerHTML = `<div class="dlg-name" style="color:${color}">${name}</div><div class="dlg-line">${line}</div>`;
      el('hud-dialogue').style.display = 'block';
      dialogueTimer = 6;
    },
    hideDialogue() {
      el('hud-dialogue').style.display = 'none';
    },
    update(state, dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) el('hud-toast').style.opacity = '0';
      }
      if (dialogueTimer > 0) {
        dialogueTimer -= dt;
        if (dialogueTimer <= 0) el('hud-dialogue').style.display = 'none';
      }
      const rank = rankFor(state.rp);
      el('hud-money').innerHTML =
        `<div class="money">$${state.money.toLocaleString('en-US')}</div>` +
        `<div class="stars">${stars(state.wanted)}</div>` +
        `<div class="rankline">${rank.title} · ${state.rp} RP · DAY ${state.day}</div>` +
        `<div class="healthline">HP ${Math.round(state.health)} &nbsp; ARMOR ${Math.round(state.armor)}</div>`;
      const d = districtAt(state.x, state.z);
      if (d.name !== lastDistrict) {
        lastDistrict = d.name;
        districtTimer = 3.5;
        el('hud-district').innerHTML = `<div class="dist-name">${d.name}</div><div class="dist-sub">${d.sub}</div>`;
        el('hud-district').style.opacity = '1';
      }
      if (districtTimer > 0) {
        districtTimer -= dt;
        if (districtTimer <= 0) el('hud-district').style.opacity = '0';
      }
      if (state.mission) {
        const m = state.mission;
        const step = m.def.steps[m.step];
        el('hud-mission').innerHTML =
          `<div class="m-title">MISSION ${m.index + 1} — ${m.def.name}</div>` +
          `<div class="m-stage">TAHAP ${m.step + 1}/${m.def.steps.length}: ${step ? step.label.toUpperCase() : 'DONE'}</div>` +
          `<div class="m-contact">${m.def.contact} · $${m.def.reward}</div>`;
        el('hud-mission').style.display = 'block';
      } else if (state.nextMission != null) {
        el('hud-mission').innerHTML =
          `<div class="m-title">FREE ROAM</div>` +
          `<div class="m-stage">PRESS ENTER TO START MISSION ${state.nextMission + 1}</div>`;
        el('hud-mission').style.display = 'block';
      } else {
        el('hud-mission').style.display = 'none';
      }
      const kmh = Math.round(Math.abs(state.speedKmh || 0));
      el('hud-speed').innerHTML = `<div class="speed-num">${kmh}</div><div class="speed-unit">KM/H</div>`;
      const w = WEAPONS[state.weapon];
      el('hud-weapon').innerHTML =
        `<div class="w-name">${w.name}</div>` +
        `<div class="w-ammo">${state.ammo} / ${state.reserve}</div>`;
      if (state.dispatch) {
        const dp = state.dispatch;
        let html = `<div class="dp-head">NDPD DISPATCH — CODE ${dp.code} · ${dp.crime}</div>`;
        html += `<div class="dp-status">${dp.status}</div>`;
        for (const u of dp.units) {
          html += `<div class="dp-unit"><span class="dp-call">${u.callsign}</span> <span class="dp-role">${u.role}</span> <span class="dp-dist">${u.dist}m</span></div>`;
        }
        if (dp.more > 0) html += `<div class="dp-more">+${dp.more} MORE UNITS</div>`;
        el('hud-dispatch').innerHTML = html;
        el('hud-dispatch').style.display = 'block';
      } else {
        el('hud-dispatch').style.display = 'none';
      }
      let crewHtml = '<div class="crew-head">CREW</div>';
      for (const member of state.crew) {
        crewHtml += `<div class="crew-row"><span class="crew-dot" style="background:${member.color}"></span><span class="crew-name">${member.name.toUpperCase()}</span><span class="crew-role">${member.role}</span></div>`;
      }
      crewHtml += `<div class="crew-keys">[C] CLEAN PLATES ${state.plateT > 0 ? Math.ceil(state.plateT) + 's' : 'READY'} &nbsp; [V] FIELD REPAIR ${state.repairT > 0 ? Math.ceil(state.repairT) + 's' : '$150'} &nbsp; [X] OVERWATCH ${state.watchT > 0 ? Math.ceil(state.watchT) + 's' : state.watchCd > 0 ? Math.ceil(state.watchCd) + 's' : 'READY'}</div>`;
      el('hud-crew').innerHTML = crewHtml;
      el('hud-radio').textContent = state.radioOn ? 'RADIO: NEON 88 ●' : 'RADIO: NEON 88';
      drawMinimap(state);
    },
    renderShop(state, onBuy) {
      const items = shopItems();
      let html = '<div class="shop-head">DELTA ARMS</div><div class="shop-sub">GUNS • AMMO • GEAR</div>';
      for (const item of items) {
        const owned = state.ownedWeapons.includes(item.index);
        html += `<div class="shop-row"><div class="shop-name">${item.name}</div>` +
          `<div class="shop-stats">DMG ${item.dmg} &nbsp; MAG ${item.mag} &nbsp; RANGE ${item.range}m${item.auto ? ' &nbsp; AUTO' : ''}${item.pellets > 1 ? ` &nbsp; ${item.pellets} PELLETS` : ''}</div>` +
          `<button class="shop-buy" data-idx="${item.index}" ${owned ? 'disabled' : ''}>${owned ? 'OWNED' : 'BUY $' + item.price}</button></div>`;
      }
      html += `<div class="shop-cash">CASH $${state.money.toLocaleString('en-US')} &nbsp;·&nbsp; PRESS TAB TO CLOSE</div>`;
      el('hud-shop').innerHTML = html;
      el('hud-shop').style.display = state.shopOpen ? 'block' : 'none';
      if (state.shopOpen) {
        el('hud-shop').querySelectorAll('.shop-buy').forEach((btn) => {
          btn.onclick = () => onBuy(parseInt(btn.dataset.idx, 10));
        });
      }
    },
    center(text) {
      el('hud-center').textContent = text;
      el('hud-center').style.opacity = text ? '1' : '0';
    },
  };
}
