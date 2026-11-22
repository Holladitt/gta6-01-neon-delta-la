// Rank points and rank ladder. Ten rank points per hundred dollars earned.

import { RANKS } from './config.js';

export function rpForReward(reward) {
  return reward / 10;
}

export function rankFor(rp) {
  let best = RANKS[0];
  for (const r of RANKS) {
    if (rp >= r.minRp) best = r;
  }
  return best;
}
