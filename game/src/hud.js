// hud.js — DOM HUD: money/stars, minimap, speed, mission bar, district,
// dispatch panel, crew panel, shop, dialog, toasts, title/pause/busted.
import { nightLevel } from './lights.js';
import { districtAt, RADIO_TEXT, CREW } from './config.js';
import { drawPortrait } from './portraits.js';
import { roadLines, SEA_Z } from './geo.js';
import { WEAPONS } from './config.js';

const css = `
#hud{position:fixed;inset:0;pointer-events:none;font-family:'Arial Black',Arial,sans-serif;color:#fff;z-index:5}
.panel{background:rgba(10,14,20,.72);border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:8px 12px}
#money{position:absolute;top:14px;right:16px;text-align:right;font-size:22px}
#money .stars{color:#ffd24a;font-size:20px;letter-spacing:2px;text-shadow:0 0 6px #000}
#money .cash{color:#7dff9a;text-shadow:0 0 6px #000}
#district{position:absolute;top:14px;left:16px;font-size:34px;font-style:italic;letter-spacing:2px;text-shadow:0 2px 8px #000}
#radio{position:absolute;top:56px;left:18px;font-size:13px;color:#ffd27a;text-shadow:0 1px 4px #000}
#minimap{position:absolute;left:16px;bottom:16px;width:170px;height:170px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.5);box-shadow:0 0 12px #000}
#minimap canvas{width:170px;height:170px;display:block}
#speed{position:absolute;right:18px;bottom:18px;text-align:right;font-size:44px;text-shadow:0 2px 8px #000}
#speed .unit{font-size:16px;color:#ffd27a}
#cond{font-size:13px;color:#9ad1ff}
#missionbar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);text-align:center;min-width:340px;font-size:15px}
#missionbar .mname{color:#ffd24a;font-size:17px}
#dispatch{position:absolute;top:96px;left:16px;font-size:12px;line-height:1.7}
#dispatch .u{color:#9ad1ff}
#crew{position:absolute;left:16px;bottom:200px;font-size:12px;line-height:1.8}
#crew .k{color:#ffd24a}
#shop{position:absolute;top:90px;right:16px;width:280px;pointer-events:auto;font-size:13px}
#shop h3{margin:0 0 6px;color:#ffd24a;font-size:16px}
#shop .row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.15)}
#shop button{pointer-events:auto;background:#1f8a8a;color:#fff;border:1px solid #fff;border-radius:5px;padding:3px 10px;font-family:inherit;cursor:pointer}
#shop button:disabled{background:#444;color:#999;cursor:default}
#dialog{position:absolute;top:64px;left:50%;transform:translateX(-50%);width:520px;display:flex;gap:12px;align-items:flex-start}
#dialog img{width:72px;height:72px;border:2px solid #ffd24a;border-radius:6px}
#dialog .who{color:#ffd24a;font-size:15px}
#dialog .txt{font-size:13px;font-family:Arial,sans-serif;line-height:1.45}
#toasts{position:absolute;left:50%;bottom:110px;transform:translateX(-50%);text-align:center;font-size:14px}
#toasts div{margin-top:4px;text-shadow:0 1px 4px #000}
#title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,rgba(10,40,50,.88),rgba(40,10,30,.88));pointer-events:auto}
#title h1{font-size:64px;font-style:italic;color:#2fd8c8;margin:0;text-shadow:0 4px 0 #ff5e4a,0 8px 24px #000;letter-spacing:3px}
#title h2{font-size:20px;color:#ffd24a;letter-spacing:6px;margin:8px 0 24px}
#title p{font-family:Arial,sans-serif;font-size:14px;line-height:1.7;text-align:center;color:#dfe8ef}
#title .go{color:#7dff9a;font-size:18px;margin-top:18px}
#pause,#busted{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(5,8,14,.8);pointer-events:auto}
#pause h1,#busted h1{font-size:48px;font-style:italic;margin:0}
#busted h1{color:#ff3b30}
#pause p,#busted p{font-family:Arial,sans-serif;font-size:15px}
`;

export function createHUD(G) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="district">DOWNTOWN</div>
    <div id="radio">${RADIO_TEXT}</div>
    <div id="money"><div class="stars"></div><div class="cash"></div></div>
    <div id="minimap"><canvas width="170" height="170"></canvas></div>
    <div id="speed"><span class="num">0</span><span class="unit"> km/h</span><div id="cond"></div></div>
    <div id="missionbar" class="panel"><div class="mname"></div><div class="step"></div></div>
    <div id="dispatch" class="panel" style="display:none"></div>
    <div id="crew" class="panel"></div>
    <div id="shop" class="panel" style="display:none"></div>
    <div id="dialog" class="panel" style="display:none"><img alt=""><div><div class="who"></div><div class="txt"></div></div></div>
    <div id="toasts"></div>
    <div id="title"><h1>NEON DELTA LA</h1><h2>MAKE GTA 6 • LOS ANGELES</h2>
      <p>Mara Solano is back in Los Angeles. Her sister vanished holding proof<br>
      of a corruption ring — a mayor, a port businessman, the NDPD.<br>
      Drive, steal, fight and finish all ten jobs to take the city back.</p>
      <p>WASD drive / walk &nbsp;•&nbsp; E enter car &nbsp;•&nbsp; Mouse aim + click shoot &nbsp;•&nbsp; R reload<br>
      C clean plates &nbsp;•&nbsp; V field repair ($150) &nbsp;•&nbsp; X overwatch &nbsp;•&nbsp; Esc pause</p>
      <div class="go">PRESS ENTER TO START</div></div>
    <div id="pause"><h1>PAUSED</h1><p>Esc resume &nbsp;•&nbsp; S save &nbsp;•&nbsp; L load</p></div>
    <div id="busted"><h1>BUSTED</h1><p>The NDPD took you in. You lose $200 and wake up downtown.</p></div>`;
  document.body.appendChild(root);
  const $ = (id) => root.querySelector('#' + id);
  const mapCtx = $('minimap').querySelector('canvas').getContext('2d');

  function drawMinimap() {
    const S = 170 / 1800;
    mapCtx.fillStyle = '#10161d';
    mapCtx.fillRect(0, 0, 170, 170);
    mapCtx.fillStyle = '#2f7fae';
    mapCtx.fillRect(0, (SEA_Z + 900) * S, 170, 170 - (SEA_Z + 900) * S);
    mapCtx.strokeStyle = '#5a5a5a';
    mapCtx.lineWidth = 2;
    for (const L of roadLines()) {
      if (L <= 750) {
        mapCtx.beginPath(); mapCtx.moveTo(0, (L + 900) * S); mapCtx.lineTo(170, (L + 900) * S); mapCtx.stroke();
      }
      mapCtx.beginPath(); mapCtx.moveTo((L + 900) * S, 0); mapCtx.lineTo((L + 900) * S, (750 + 900) * S); mapCtx.stroke();
    }
    // Mission marker.
    if (G.missionTarget) {
      mapCtx.fillStyle = '#ffd24a';
      const mx = (G.missionTarget.x + 900) * S, my = (G.missionTarget.z + 900) * S;
      mapCtx.beginPath();
      mapCtx.moveTo(mx, my - 6); mapCtx.lineTo(mx + 6, my); mapCtx.lineTo(mx, my + 6); mapCtx.lineTo(mx - 6, my);
      mapCtx.closePath(); mapCtx.fill();
    }
    // Police dots.
    mapCtx.fillStyle = '#ff3b30';
    for (const c of G.police.activeCars) {
      mapCtx.beginPath();
      mapCtx.arc((c.x + 900) * S, (c.z + 900) * S, 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Player arrow.
    const px = (G.player.x + 900) * S, py = (G.player.z + 900) * S;
    mapCtx.fillStyle = '#2fd8c8';
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(G.player.heading);
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7); mapCtx.lineTo(5, 5); mapCtx.lineTo(-5, 5);
    mapCtx.closePath(); mapCtx.fill();
    mapCtx.restore();
  }

  let toastTimer = 0;
  const hud = {
    toast(msg, ms = 3500) {
      const d = document.createElement('div');
      d.textContent = msg;
      $('toasts').appendChild(d);
      setTimeout(() => d.remove(), ms);
      void toastTimer;
    },
    showDialog(contact, title, text) {
      const img = $('dialog').querySelector('img');
      img.src = drawPortrait(contact).toDataURL();
      $('dialog').querySelector('.who').textContent = `${contact} — ${title}`;
      $('dialog').querySelector('.txt').textContent = text;
      $('dialog').style.display = 'flex';
      setTimeout(() => { $('dialog').style.display = 'none'; }, 9000);
    },
    openShop() {
      G.shopOpen = true;
      const el = $('shop');
      el.style.display = 'block';
      const rows = WEAPONS.map((w, i) => {
        const owned = G.combat.owned.includes(i);
        const afford = G.money >= w.price;
        const label = w.price > 0 ? `$${w.price}` : 'OWNED';
        const dis = owned || w.price <= 0 || !afford ? 'disabled' : '';
        const btn = owned || w.price <= 0 ? 'OWNED' : 'BUY';
        return `<div class="row"><span>${w.name}</span><span>${w.mag} rnd</span><span>${label}</span><button data-i="${i}" ${dis}>${btn}</button></div>`;
      }).join('');
      el.innerHTML = `<h3>DELTA ARMS</h3>${rows}<div style="margin-top:6px;font-size:12px">Cash: $${G.money.toLocaleString()} — click BUY to purchase</div>`;
      el.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => {
          const i = Number(b.dataset.i);
          const r = G.buyWeapon(i);
          if (r.ok) {
            hud.toast(`${WEAPONS[i].name} purchased — $${WEAPONS[i].price}`);
            hud.openShop();
          } else {
            hud.toast(`Cannot buy: ${r.reason}`);
          }
        });
      });
    },
    closeShop() {
      G.shopOpen = false;
      $('shop').style.display = 'none';
    },
    showTitle() { $('title').style.display = 'flex'; },
    hideTitle() { $('title').style.display = 'none'; },
    showPaused(v) { $('pause').style.display = v ? 'flex' : 'none'; },
    showBusted(v) { $('busted').style.display = v ? 'flex' : 'none'; },
    update() {
      const d = districtAt(G.player.x, G.player.z);
      $('district').textContent = d.name;
      $('district').style.color = d.color;
      const stars = '★'.repeat(G.wanted.level) + '☆'.repeat(5 - G.wanted.level);
      $('money').querySelector('.stars').textContent = stars;
      $('money').querySelector('.cash').textContent = '$' + G.money.toLocaleString();
      const kmh = G.player.inCar ? Math.round(Math.abs(G.car.speed) * 3.6) : Math.round(G.player.speed * 3.6);
      $('speed').querySelector('.num').textContent = kmh;
      $('cond').textContent = G.player.inCar ? `CONDITION ${Math.round(G.car.health)}% • ${WEAPONS[G.combat.current].name} ${G.combat.ammo[G.combat.current]}/${G.combat.reserves[G.combat.current]}` : `ON FOOT • ${WEAPONS[G.combat.current].name} ${G.combat.ammo[G.combat.current]}/${G.combat.reserves[G.combat.current]}`;
      const mb = $('missionbar');
      if (G.mission && G.mission.status === 'active') {
        const s = G.mission.def.steps[G.mission.step];
        mb.querySelector('.mname').textContent = `M${G.missionIndex + 1} • ${G.mission.def.name} — $${G.mission.def.reward}`;
        mb.querySelector('.step').textContent = s ? `${G.mission.step + 1}/${G.mission.def.steps.length} ${s.label}` : '';
      } else {
        mb.querySelector('.mname').textContent = 'FREE ROAM — press M for the next job';
        mb.querySelector('.step').textContent = `DAY ${G.day} • ${G.missionIndex}/10 jobs done`;
      }
      const disp = $('dispatch');
      if (G.wanted.level > 0 && G.dispatchUnits.length) {
        disp.style.display = 'block';
        disp.innerHTML = '<b>NDPD DISPATCH</b><br>' + G.dispatchUnits.map((u) => `<span class="u">${u.sign}</span> ${u.role} — ${u.dist}m`).join('<br>');
      } else {
        disp.style.display = 'none';
      }
      $('crew').innerHTML = CREW.map((c) => {
        const t = c.key === 'C' ? G.crew.cooldownT : c.key === 'V' ? G.crew.repairT : G.crew.watchCd;
        const cd = t > 0 ? ` (${Math.ceil(t)}s)` : '';
        return `<span class="k">[${c.key}]</span> ${c.ability}${cd} — ${c.name}`;
      }).join('<br>');
      drawMinimap();
      void nightLevel;
    },
  };
  return hud;
}
