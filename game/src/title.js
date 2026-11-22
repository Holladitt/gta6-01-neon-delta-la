// Title screen + save slots. Browser only (DOM).
import { slotCount, loadGame, slotSummary, clearSlot } from './save.js';

export function createTitle(callbacks) {
  const screen = document.getElementById('title-screen');
  const slotsEl = document.getElementById('title-slots');
  const btnNew = document.getElementById('btn-new');
  const btnContinue = document.getElementById('btn-continue');
  function renderSlots() {
    if (!slotsEl) return;
    slotsEl.innerHTML = '';
    for (let i = 1; i <= slotCount(); i += 1) {
      const s = slotSummary(i);
      const b = document.createElement('button');
      b.className = 'slot-btn';
      if (s) {
        b.textContent = 'SLOT ' + i + ' — DAY ' + (s.day || 1) + ' · $' + (s.money || 0) + ' · ' + (s.rank || 'D');
        b.onclick = () => { if (callbacks.onLoad) callbacks.onLoad(i, s); };
      } else {
        b.textContent = 'SLOT ' + i + ' — EMPTY';
        b.onclick = () => { if (callbacks.onNew) callbacks.onNew(i); };
      }
      slotsEl.appendChild(b);
    }
  }
  if (btnNew) btnNew.onclick = () => { if (callbacks.onNew) callbacks.onNew(1); };
  if (btnContinue) {
    btnContinue.onclick = () => {
      for (let i = 1; i <= slotCount(); i += 1) {
        const s = loadGame(i);
        if (s) { if (callbacks.onLoad) callbacks.onLoad(i, s); return; }
      }
      if (callbacks.onNew) callbacks.onNew(1);
    };
  }
  renderSlots();
  return {
    show() { if (screen) screen.style.display = 'flex'; renderSlots(); },
    hide() { if (screen) screen.style.display = 'none'; },
    renderSlots,
    clearSlot(i) { clearSlot(i); renderSlots(); },
  };
}
