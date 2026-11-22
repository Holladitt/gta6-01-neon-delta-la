# Neon Delta LA: District Wars

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/rank.svg)](https://make.fun/competitions/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/reward.svg)](https://make.fun/competitions/gta6-01)

**6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers, 3 save slots, street races.**

An original open-world crime game set in a fictional Los Angeles coastline — Downtown, Venice, Coral Pier, Long Beach Port, Marina and Hollywood Hills. Mara Solano, ex-getaway driver, is back to finish what her vanished sister started: ten story jobs, $13,750 in payouts, and the rank of DELTA LEGEND waiting at the end.

## Play

Open `game/index.html` in a desktop browser, or run `node serve.ts` and visit http://localhost:8080.

- **WASD / arrows** — drive or walk
- **E** — enter / exit car
- **Q** — weapon wheel (hold), **1-4** — weapon tier
- **F** / click — fire
- **C** — Clean Plates (Juno, −1 wanted), **V** — Field Repair (Petra, $150), **X** — Overwatch (Cassia, 20 s)
- **Shift** — nitro, **P** — pause

## Systems

- **6 districts with standing** — missions +10, races +5, jobs +3; standing 50+ unlocks a 10% DELTA ARMS discount and crew abilities in that district.
- **Wanted 1–5** — NDPD pursuit with A* flanking, heli spotlight at 3+, roadblocks at 4, black SWAT van at 5, spike strips, and the AIR-1 takedown (5 unbroken seconds in the beam).
- **10 story missions** — $13,750 total, RP ladder D → S DELTA LEGEND, day +1 per mission.
- **4 weapon tiers** — PISTOL / SMG / SHOTGUN owned, DELTA CARBINE $900, LONGSHOT $1,800, MARAUDER $2,500.
- **Crew** — Juno (driver), Petra (mechanic), Cassia (lookout), each with a real cooldown ability.
- **Street races** — 5 checkpoints per district, money + standing. **Side jobs** — taxi and courier. **20 Aurora tapes** to collect. **COVER meter** — commit a crime in a ped's view and they become a witness; 3 seconds in view raises your wanted level.
- **Garage tuning** — Engine (+25% top speed), Armour (less damage), Nitro (boost) — plus a drivable boat at the Marina.
- **3 save slots** — localStorage, each showing money / day / rank or EMPTY.

## Tech

Static files only, no build step. Three.js (vendored) for the 3D city, plain ES modules for the game logic. Every system above is implemented in `game/src/` and covered by the simulation driver in the QA folder.
