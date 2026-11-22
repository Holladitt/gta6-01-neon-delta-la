# Neon Delta LA: District Wars

An original open-world crime game for the make.fun gta6-01 bounty: a GTA-style
Los Angeles with 6 districts, 10 story jobs, SWAT roadblocks, 4 weapon tiers,
3 save slots and street races. Runs offline in a desktop browser from static
files — no network, no build step.

## Play

Serve it locally and open http://localhost:8080:

```sh
node serve.ts
```

Or open `game/index.html` directly from a static server. `?shot=1..4` opens a
frozen diorama of one of the four submission shots.

## Controls

- **WASD / arrows** — drive (or walk on foot)
- **E** — enter / exit a car
- **Enter** — start the next story job
- **Q (hold)** — weapon wheel, **1–4** pick a weapon tier
- **C / V / X** — crew abilities: Clean Plates, Field Repair, Overwatch
- **Tab** — pause

## The game

Mara Solano, ex-getaway driver, is back in Los Angeles to find her vanished
sister — and the proof of corruption her sister held. Six districts, each with
its own standing (0–100): finish jobs, win street races and run taxi and
courier work to raise it. At 50+ standing a district's shop gives a 10%
discount and its crew ability unlocks. The NDPD escalates from patrol cars to
a helicopter at wanted 3, roadblocks at 4 and a black SWAT van at 5 — and the
AIR-1 spotlight can raise your wanted level if it holds you for five seconds.
Commit a crime in front of a pedestrian and they become a witness: break line
of sight within three seconds or your wanted level rises. Twenty Aurora tapes
are hidden across the city. The garage tunes engine, armour and nitro, and a
drivable boat waits at the Marina.

## Structure

- `game/index.html` — the page, HUD, title screen and dialogue
- `game/src/` — the game modules (world, scene, missions, police, traffic,
  shop, garage, races, cover, standing, crew, combat, wanted, save, shots)
- `game/vendor/three.module.min.js` — vendored three.js
- `main.ts` — submission entry point: stages game/ + screenshots/ and
  writes dossier.json
- `serve.ts` — local static server on port 8080

## License

MIT. Original work; nothing from Rockstar. Los Angeles is a real city.
