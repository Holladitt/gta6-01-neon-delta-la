# Neon Delta LA

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun)
[![rank](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/reward.svg)](https://make.fun)

An original open-world crime game set on a fictional LA coast — Downtown,
Venice canals, Santa Monica-style pier, Long Beach port, Marina, Hollywood
Hills, and the freeways between them. You are **Mara Solano**, an ex-getaway
driver hunting the truth about her vanished sister, who held proof of
corruption reaching the mayor, the port, and the NDPD.

## Play

```sh
node serve.ts
# open http://localhost:8080/
```

## The game

- **10 missions** across 11 days, $13,750 in payouts, from a $400 first gear
  run to a $3,000 last witness. Contacts: Eden Voss, Harlan Dray, Lucia
  Marlow, Dante Kovac, Sable Okonkwo, Vera Lindqvist, Inez Vargas, Orin Beck,
  Lena Marsh, Elias Frost.
- **Wanted 1–5** with NDPD patrol cars that flank with A* pathfinding and a
  helicopter from level 3, its beam landing exactly on your car.
- **Crew abilities**: Juno's CLEAN PLATES [C] drops a wanted star, Petra's
  FIELD REPAIR [V] restores the car for $150, Cassia's OVERWATCH [X] watches
  the roofs for 20 seconds.
- **DELTA ARMS shop** [TAB]: Pistol, SMG and Shotgun come with the kit;
  Delta Carbine $900, Longshot $1,800, Marauder $2,500 — all six fireable.
- **Arcade driving** with drift, collision damage, day/night cycle, traffic
  lights, 104 pedestrians and 22 traffic cars.
- **Ranks** from D GREENHORN to S DELTA LEGEND (1,000 RP). Progress saves
  locally (`neon-delta-la.save.v3`).

## Controls

WASD drive · E enter/exit car · F interact · Space handbrake / fire ·
R reload · C clean plates · V field repair · X overwatch · 1–6 weapons ·
Tab shop · M radio · Enter start mission

## Tech

Three.js (vendored) for the 3D city, plain ES modules, no build step.
`main.ts` copies `game/` and `screenshots/` into the output directory and
writes `dossier.json` via the kit's `buildDossier`.
