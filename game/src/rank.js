// Rank ladder for Neon Delta LA: rank points (RP) earned from mission
// payouts (1 RP per $10) move Mara up five ranks to DELTA LEGEND.
import { RANKS } from './config.js';

export function rankFor(rp) {
  let best = RANKS[0];
  for (const r of RANKS) {
    if (rp >= r.rp) best = r;
  }
  return best;
}

export function rankCode(rp) {
  return rankFor(rp).code;
}

export function rpForPayout(payout) {
  return Math.floor(payout / 10);
}

export function nextRank(rp) {
  for (const r of RANKS) {
    if (r.rp > rp) return r;
  }
  return null;
}
