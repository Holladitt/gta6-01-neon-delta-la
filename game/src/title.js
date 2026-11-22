// Title screen: NEON DELTA LA: DISTRICT WARS, NEW GAME / CONTINUE / LOAD + 3 slots.
import { slotCount, slotSummary, loadGame } from './save.js';

export function createTitle(world, game) {
  const el = document.getElementById('title-screen');
  const slotsEl = document.getElementById('title-slots');
  function show() {
    el.classList.remove('hidden');
    world.state = 'TITLE';
    renderSlots();
  }
  function hide() { el.classList.add('hidden'); }
  function renderSlots() {
    let html = '';
    for (let s = 1; s <= slotCount(); s++) {
      const sum = slotSummary(s);
      html += '<button class="slot" data-slot="' + s + '">' + (sum ? ('SLOT ' + s + ' · $' + sum.money + ' · DAY ' + sum.day + ' · RANK ' + sum.rank) : ('SLOT ' + s + ' · EMPTY')) + '</button>';
    }
    slotsEl.innerHTML = html;
    slotsEl.querySelectorAll('.slot').forEach((b) => {
      b.addEventListener('click', () => loadSlot(+b.dataset.slot));
    });
  }
  function loadSlot(s) {
    const data = loadGame(s);
    if (data) applySave(world, data);
    start();
  }
  function applySave(w, data) {
    w.money = data.money; w.day = data.day; w.rp = data.rp; w.rank = data.rank;
    if (data.standing) w.standing = data.standing;
    if (data.missionsDone) w.missionsDone = data.missionsDone;
  }
  function start() {
    hide();
    world.state = 'FREE_ROAM';
    world.frozen = false;
  }
  const ng = document.getElementById('btn-new');
  if (ng) ng.addEventListener('click', () => start());
  const ct = document.getElementById('btn-continue');
  if (ct) ct.addEventListener('click', () => loadSlot(1));
  return { show, hide, start, renderSlots };
}
