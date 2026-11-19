// Rank / respect + district standing (pure). RP comes only from real
// payouts: RP = floor(payout / 10), accumulated on mission / side-job
// completion. No RP is ever invented or displayed without a payout behind it.
import { RANKS } from './config.js';

export function rpForReward(reward) { return Math.floor(reward / 10); }

export function rankFor(rp) {
  let cur = RANKS[0];
  for (const r of RANKS) if (rp >= r.minRp) cur = r;
  const idx = RANKS.indexOf(cur);
  const next = RANKS[idx + 1] || null;
  return { ...cur, rp, nextMin: next ? next.minRp : null, nextTitle: next ? next.title : null };
}

export function standingLabel(v) {
  if (v < 40) return 'COLD';
  if (v < 70) return 'NEUTRAL';
  return 'FRIENDLY';
}

// standing: map districtId -> 0..100, default 50 (NEUTRAL).
export function addStanding(standing, districtId, delta) {
  const cur = standing[districtId] ?? 50;
  standing[districtId] = Math.max(0, Math.min(100, cur + delta));
  return standing[districtId];
}
export function getStanding(standing, districtId) {
  return standing[districtId] ?? 50;
}
