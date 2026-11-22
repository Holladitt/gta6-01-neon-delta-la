# Neon Delta LA: District Wars

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/reward.svg)](https://make.fun/c/gta6-01)

An original open-world crime game in a Los Angeles coastal city — 6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers, 3 save slots, street races. Played in a desktop browser from static files, keyboard + mouse. Made for the [make.fun gta6-01 bounty](https://make.fun/c/gta6-01).

## The story

Mara Solano, ex-getaway driver. Her vanished sister held proof of corruption — a mayor, a port businessman, the police. Mara drives the Neon Delta to find her.

## The city — 6 districts across a 1,400 by 1,400 coastal map

Downtown, Hollywood Hills, Venice, Coral Pier, Long Beach Port, Marina. Each district holds a standing (0–100) that rises when you work there: story missions +10, street races +5, side jobs +3. At standing 50 a district gives a 10% shop discount and unlocks its crew ability.

## Systems

- **Wanted 1–5 + tactical police**: NDPD pursuit with A-star flanking, helicopter AIR-1 from wanted 3, roadblocks from wanted 4, a black SWAT van at wanted 5, spike strips, and AIR-1 takedowns when its spotlight holds the car for 5 seconds.
- **4 weapon tiers + weapon wheel**: Tier 1 PISTOL/SMG/SHOTGUN owned from the start, Tier 2 DELTA CARBINE $900, Tier 3 LONGSHOT $1,800, Tier 4 MARAUDER $2,500. Hold Q for the wheel, pick a tier with 1–4.
- **Title screen + 3 save slots**: NEW GAME, CONTINUE, LOAD — each slot shows money, day and rank.
- **Street races + side jobs + collectibles**: 5-checkpoint races, taxi and courier jobs, and 20 Aurora tapes hidden around the city (HUD counter, $50 each).
- **COVER meter (witness stealth)**: commit a crime in view of a pedestrian and they become a witness — leave their sight within 3 seconds or wanted rises.
- **DELTA GARAGE + drivable boat**: ENGINE, ARMOUR and NITRO tuning, and the DELTA SKIFF at the Marina's south dock.
- **10 story missions** ($400–$3,000, total $13,750), crew of three (CLEAN PLATES [C], FIELD REPAIR [V] $150, OVERWATCH [X]), ranks D→S, day/night cycle, radio NEON 88, circular minimap, NDPD dispatch panel.

## Controls

WASD/arrows drive · E enter/exit car (board the boat at the dock) · F steal a car · SPACE fire · Q weapon wheel · 1–4 weapon tier · C/V/X crew · SHIFT nitro · M mission · R race · J side job · B shop · G garage · T save · P pause.

## Play it

```
node serve.ts
# open http://localhost:8080
```

## License

MIT — see LICENSE.
