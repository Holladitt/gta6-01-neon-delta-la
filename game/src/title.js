// Title screen: NEON DELTA LA: DISTRICT WARS, with NEW GAME,
// CONTINUE, and LOAD. LOAD offers 3 save slots; each slot shows
// its money, day, and rank, or EMPTY when unused. Saving writes
// to the chosen slot; the save key is per-slot. The title screen
// is a real screen the player sees before free roam, not a splash
// that skips itself.
import { TITLE, SAVE_SLOTS } from './config.js';
import { slotSummary, saveGame, loadGame, serializeWorld } from './save.js';
import { rankName } from './rank.js';

export function createTitle(world, onStart) {
  const root = document.createElement('div');
  root.id = 'title-screen';
  root.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#0d2b3e 0%,#123f5c 45%,#c24a3a 100%);color:#fff;font-family:Arial,sans-serif;';
  root.innerHTML = `
    <div style="font-size:13px;letter-spacing:6px;color:#f7d154">LOS ANGELES • COASTAL OPEN WORLD</div>
    <div style="font-size:64px;font-weight:900;font-style:italic;line-height:1;margin:10px 0 0">NEON DELTA LA</div>
    <div style="font-size:30px;font-weight:900;letter-spacing:8px;color:#1abc9c">DISTRICT WARS</div>
    <div style="margin-top:10px;font-size:15px;opacity:0.9">6 districts • 10 story jobs • SWAT roadblocks • 4 weapon tiers • 3 save slots • street races</div>
    <div style="margin-top:26px;display:flex;gap:14px">
      <button id="title-new" style="font-size:18px;font-weight:900;padding:12px 26px;background:#1abc9c;border:none;color:#04222a;cursor:pointer">NEW GAME</button>
      <button id="title-continue" style="font-size:18px;font-weight:900;padding:12px 26px;background:#f7d154;border:none;color:#3a2a00;cursor:pointer">CONTINUE</button>
      <button id="title-load" style="font-size:18px;font-weight:900;padding:12px 26px;background:#ecf0f1;border:none;color:#222;cursor:pointer">LOAD</button>
    </div>
    <div id="title-slots" style="margin-top:22px;display:none;gap:12px"></div>
    <div style="margin-top:26px;font-size:13px;opacity:0.75">Mara Solano • ex-getaway driver • her vanished sister held proof of corruption</div>
    <div style="font-size:13px;opacity:0.75">WASD drive • E enter/exit car • F steal car • SPACE fire • Q weapon wheel • C/V/X crew • SHIFT nitro</div>
  `;
  document.body.appendChild(root);
  const slotsEl = root.querySelector('#title-slots');
  function renderSlots() {
    slotsEl.style.display = 'flex';
    slotsEl.innerHTML = '';
    for (let s = 1; s <= SAVE_SLOTS; s += 1) {
      const sum = slotSummary(s);
      const b = document.createElement('button');
      b.style.cssText = 'padding:12px 18px;font-size:14px;background:rgba(0,0,0,0.5);color:#fff;border:2px solid #fff;cursor:pointer;text-align:left;min-width:170px';
      b.innerHTML = sum
        ? '<b>SLOT ' + s + '</b><br>$' + sum.money + ' • DAY ' + sum.day + '<br>RANK ' + sum.rank + ' • ' + sum.district
        : '<b>SLOT ' + s + '</b><br>EMPTY';
      b.addEventListener('click', () => {
        const data = loadGame(s);
        if (data) onStart('load', s, data);
      });
      slotsEl.appendChild(b);
    }
  }
  root.querySelector('#title-new').addEventListener('click', () => onStart('new', 1, null));
  root.querySelector('#title-continue').addEventListener('click', () => {
    for (let s = 1; s <= SAVE_SLOTS; s += 1) {
      const data = loadGame(s);
      if (data) { onStart('load', s, data); return; }
    }
    onStart('new', 1, null);
  });
  root.querySelector('#title-load').addEventListener('click', renderSlots);
  return {
    root,
    show() { root.style.display = 'flex'; },
    hide() { root.style.display = 'none'; },
    renderSlots,
    save(slot) {
      const data = serializeWorld(world);
      data.rank = world.rankCode;
      return saveGame(slot, data);
    },
  };
}

export function titleText() {
  return TITLE;
}

export function rankLabel(rp) {
  return rankName(rp);
}
