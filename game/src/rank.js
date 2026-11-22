// Rank ladder: RP thresholds -> rank code + name.
import { RANKS } from './config.js';

export function rankFor(rp) {
  let out = RANKS[0];
  for (const r of RANKS) if (rp >= r.rp) out = r;
  return out;
}
export function rankCode(rp) { return rankFor(rp).code; }
export function rpForPayout(payout) { return Math.round(payout / 10); }
export function nextRank(rp) {
  for (const r of RANKS) if (rp < r.rp) return r;
  return null;
}
