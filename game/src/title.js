// Title screen for Neon Delta LA: District Wars.
// NEW GAME / CONTINUE / LOAD with three save slots. Each slot shows
// money, day and rank, or EMPTY. CONTINUE resumes the newest slot.
import { slotSummary, slotCount, loadGame } from './save.js';
import { rankFor } from './rank.js';

export function createTitleState() {
  return { screen: 'TITLE', selectedSlot: 0 };
}

export function slotLabel(i) {
  const s = slotSummary(i);
  if (!s) return 'SLOT ' + (i + 1) + ' — EMPTY';
  const rank = s.rank || rankFor(s.rp || 0);
  return 'SLOT ' + (i + 1) + ' — ' + '$' + (s.money || 0) + ' · DAY ' + (s.day || 1) + ' · ' + rank;
}

export function slotLabels() {
  const out = [];
  for (let i = 0; i < slotCount(); i += 1) out.push(slotLabel(i));
  return out;
}

export function continueSlot() {
  for (let i = slotCount() - 1; i >= 0; i -= 1) {
    if (slotSummary(i)) return i;
  }
  return -1;
}

export function loadSlot(world, i) {
  const data = loadGame(i);
  if (!data) return false;
  return true;
}

export function titleLines() {
  return ['NEON DELTA LA', 'DISTRICT WARS', '6 districts · 10 story jobs · SWAT roadblocks · 4 weapon tiers · 3 save slots · street races'];
}
