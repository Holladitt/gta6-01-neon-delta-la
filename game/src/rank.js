// Rank ladder: D GREENHORN 0, C RUNNER 100, B NIGHTHAWK 300,
// A OUTLAW 600, S DELTA LEGEND 1000. Rank points are payout / 10.
import { RANKS } from './config.js';

export function rankFor(rp) {
  let found = RANKS[0];
  for (const r of RANKS) {
    if (rp >= r.min) found = r;
  }
  return found;
}

export function rankCode(rp) {
  return rankFor(rp).code;
}

export function rankName(rp) {
  return rankFor(rp).name;
}

export function rpForPayout(payout) {
  return payout / 10;
}

export function nextRank(rp) {
  for (const r of RANKS) {
    if (rp < r.min) return r;
  }
  return null;
}
