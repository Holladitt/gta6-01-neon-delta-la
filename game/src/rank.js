// rank.js — rank points and rank titles (pure).
import { RANKS } from './config.js';

export function rpForReward(reward) {
  return Math.round(reward / 10);
}

export function rankFor(rp) {
  let best = RANKS[0];
  for (const r of RANKS) {
    if (rp >= r.minRp) best = r;
  }
  return best;
}
