// HUD: DOM overlay over the 3D canvas. Browser only.
import { districtById, WEAPONS, tierName, CREW } from './config.js';
import { rankFor } from './rank.js';
import { drawPortrait } from './portraits.js';
import { phaseFor } from './lights.js';
import { buildDispatch } from './dispatch.js';
import { currentObjective } from './missions.js';
import { AVENUES, STREETS } from './geo.js';

function $(id) {
  return document.getElementById(id);
}
function fmtTime(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
export function createHUD() {
  const minimap = $('hud-minimap');
  const mm = minimap ? minimap.getContext('2d') : null;
  let lastDispatchHtml = '';
  let lastCrewHtml = '';
  const hud = {
    update(w, t) {
      const timeEl = $('hud-time');
      if (timeEl) timeEl.textContent = fmtTime(w.hour) + ' · ' + phaseFor(w.hour).toUpperCase();
      const dayEl = $('hud-day');
      if (dayEl) dayEl.textContent = 'DAY ' + w.day;
      const moneyEl = $('hud-money');
      if (moneyEl) moneyEl.textContent = '$' + Math.floor(w.money).toLocaleString('en-US');
      const wantedEl = $('hud-wanted');
      if (wantedEl) {
        wantedEl.textContent = '★'.repeat(w.wanted.level) + '☆'.repeat(Math.max(0, 5 - w.wanted.level));
        wantedEl.style.color = w.wanted.level >= 3 ? '#ff5a4e' : '#ffd34d';
      }
      const rankEl = $('hud-rank');
      if (rankEl) {
        const r = rankFor(w.rp);
        rankEl.textContent = 'RANK ' + r.code + ' · ' + r.name + ' · ' + w.rp + ' RP';
      }
      const d = districtById(w.district);
      const distEl = $('hud-district');
      if (distEl) distEl.textContent = d.name.toUpperCase();
      const subEl = $('hud-district-sub');
      if (subEl) subEl.textContent = d.sub;
      const standEl = $('hud-standing');
      if (standEl) standEl.textContent = 'STANDING ' + (w.standing[w.district] || 0) + '/100';
      const speedEl = $('hud-speed');
      if (speedEl) speedEl.textContent = Math.round(Math.abs(w.car.speed) * 3.6) + ' KM/H';
      const carEl = $('hud-car');
      if (carEl) carEl.textContent = w.car.name || 'SOLSTICE GT';
      const condEl = $('hud-condition');
      if (condEl) condEl.textContent = 'CONDITION ' + Math.round(w.car.condition) + '%';
      const coverEl = $('hud-cover');
      if (coverEl) coverEl.textContent = 'COVER ' + Math.round(w.cover.value) + '%';
      // Dispatch panel.
      const dispEl = $('hud-dispatch');
      if (dispEl) {
        const rows = buildDispatch(w.police.cars.slice(0, 3), w.player, w.player.x, w.player.z, w.wanted);
        const html = rows.map((r) => '<div class="disp-row"><span>' + r.callsign + '</span><span>' + r.role + '</span><span>' + r.distance + 'm</span></div>').join('');
        if (html !== lastDispatchHtml) { dispEl.innerHTML = html; lastDispatchHtml = html; }
      }
      // Crew panel.
      const crewEl = $('hud-crew');
      if (crewEl) {
        const html = CREW.map((c) => {
          const last = w.crew.lastUsed[c.id];
          const cd = last === undefined ? 0 : Math.max(0, c.cooldown - (t - last));
          return '<div class="crew-row"><span>' + c.name.toUpperCase() + '</span><span>' + c.ability + ' [' + c.key + ']</span><span>' + (cd > 0 ? Math.ceil(cd) + 's' : 'READY') + '</span></div>';
        }).join('');
        if (html !== lastCrewHtml) { crewEl.innerHTML = html; lastCrewHtml = html; }
      }
      // Mission bar.
      const mEl = $('hud-mission');
      if (mEl) {
        const m = w.missions.current <= 10 ? w.missions : null;
        if (w.state === 'MISSION' && m) {
          const mm2 = w.missions;
          const cur = mm2.current;
          mEl.style.display = 'block';
          const mt = $('hud-mission-text');
          if (mt) mt.textContent = 'MISSION ' + cur + ' — ' + (w.missionLabel || '');
        } else {
          mEl.style.display = 'none';
        }
      }
      // Wanted banner.
      const ban = $('hud-wanted-banner');
      if (ban) ban.style.display = w.wanted.level >= 3 ? 'block' : 'none';
      // Minimap.
      if (mm && minimap) drawMinimap(mm, minimap.width, minimap.height, w);
    },
    showDialogue(name, text) {
      const box = $('hud-dialogue');
      if (!box) return;
      const n = $('hud-dlg-name');
      const tx = $('hud-dlg-text');
      const cv = $('hud-dlg-portrait');
      if (n) n.textContent = name;
      if (tx) tx.textContent = text;
      if (cv) drawPortrait(cv, name);
      box.style.display = 'flex';
    },
    hideDialogue() {
      const box = $('hud-dialogue');
      if (box) box.style.display = 'none';
    },
    showWheel(items, current) {
      const wheel = $('hud-wheel');
      if (!wheel) return;
      wheel.innerHTML = items.map((it) => {
        const cls = it.id === current ? 'wheel-item sel' : 'wheel-item';
        return '<div class="' + cls + '"><b>' + it.name + '</b><span>TIER ' + it.tier + ' · ' + tierName(it.tier) + '</span><span>DMG ' + it.damage + (it.owned ? '' : ' · $' + it.price) + '</span></div>';
      }).join('');
      wheel.style.display = 'grid';
    },
    hideWheel() {
      const wheel = $('hud-wheel');
      if (wheel) wheel.style.display = 'none';
    },
    showShop(shop, money, standing, district, onBuy) {
      const panel = $('hud-shop');
      if (!panel) return;
      const crewEl = $('hud-crew');
      if (crewEl) crewEl.style.display = 'none';
      const rows = WEAPONS.map((wpn) => {
        const owned = shop.owned.indexOf(wpn.id) >= 0;
        const disc = standing && standing[district] >= 50 ? 0.1 : 0;
        const price = Math.round(wpn.price * (1 - disc));
        const btn = owned ? '<span class="owned">OWNED</span>' : '<button data-buy="' + wpn.id + '">BUY $' + price + '</button>';
        return '<div class="shop-row"><span>' + wpn.name + '</span><span>TIER ' + wpn.tier + ' · ' + tierName(wpn.tier) + '</span><span>DMG ' + wpn.damage + '</span>' + btn + '</div>';
      }).join('');
      panel.innerHTML = '<h3>DELTA ARMS</h3><div class="shop-money">MONEY $' + Math.floor(money) + '</div>' + rows + '<button id="shop-close">CLOSE [E]</button>';
      panel.style.display = 'block';
      const close = $('shop-close');
      if (close) close.onclick = () => { panel.style.display = 'none'; };
      panel.querySelectorAll('[data-buy]').forEach((b) => {
        b.onclick = () => { if (onBuy) onBuy(b.getAttribute('data-buy')); };
      });
    },
    hideShop() {
      const panel = $('hud-shop');
      if (panel) panel.style.display = 'none';
      const crewEl = $('hud-crew');
      if (crewEl) crewEl.style.display = 'block';
    },
  };
  return hud;
}
function drawMinimap(c, w, h, world) {
  const S = 1560;
  const px = (x) => ((x + 780) / S) * w;
  const py = (z) => ((z + 780) / S) * h;
  c.clearRect(0, 0, w, h);
  // sea
  c.fillStyle = '#0e3a4d';
  c.fillRect(0, 0, w, h);
  // land
  c.fillStyle = '#2a2f2a';
  c.fillRect(px(-620), py(-780), px(780) - px(-620), py(780) - py(-780));
  // roads
  c.strokeStyle = 'rgba(255, 220, 120, 0.5)';
  c.lineWidth = 1.5;
  for (const ax of AVENUES) {
    c.beginPath(); c.moveTo(px(ax), 0); c.lineTo(px(ax), h); c.stroke();
  }
  for (const sz of STREETS) {
    c.beginPath(); c.moveTo(0, py(sz)); c.lineTo(w, py(sz)); c.stroke();
  }
  // mission objective
  if (world.state === 'MISSION') {
    const obj = currentObjective(world.missions);
    if (obj) {
      c.fillStyle = '#ffd34d';
      const ox = px(obj.x);
      const oy = py(obj.z);
      c.beginPath();
      c.moveTo(ox, oy - 6); c.lineTo(ox + 6, oy); c.lineTo(ox, oy + 6); c.lineTo(ox - 6, oy);
      c.closePath();
      c.fill();
    }
  }
  // police
  c.fillStyle = '#ff5a4e';
  for (const car of world.police.cars) {
    c.fillRect(px(car.x) - 2, py(car.z) - 2, 4, 4);
  }
  // player
  c.fillStyle = '#ffd34d';
  c.beginPath();
  c.arc(px(world.player.x), py(world.player.z), 4, 0, Math.PI * 2);
  c.fill();
  // ring
  c.strokeStyle = 'rgba(255, 211, 77, 0.8)';
  c.beginPath();
  c.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
  c.stroke();
}
