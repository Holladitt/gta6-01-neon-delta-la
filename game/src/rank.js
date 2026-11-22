// Rank ladder. Pure.
import { RANKS } from './config.js';
export function rankFor(rp) {
  let best = RANKS[0];
  for (const r of RANKS) if (rp >= r.rp) best = r;
  return best;
}
export function rankCode(rp) {
  return rankFor(rp).code;
}
export function rpForPayout(payout) {
  return Math.round(payout / 10);
}
export function nextRank(rp) {
  for (const r of RANKS) if (rp < r.rp) return r;
  return null;
}
