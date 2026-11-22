# Neon Delta LA: District Wars

An original open-world crime game for the make.fun **gta6-01 "Make GTA 6"** bounty.
A coastal Los Angeles of six districts — Downtown, Hollywood Hills, Venice, Marina,
Coral Pier, Long Beach Port — at ember dusk. You are **Mara Solano**, an ex-getaway
driver hunting the proof her vanished sister left behind. Nothing in here is from
Rockstar; the city, the people and the story are invented.

## Play

Open `game/index.html` in a desktop browser (offline, static files), or run
`node serve.ts` and open http://localhost:8080.

- **WASD / arrows** — drive / walk. **E** — enter or exit a car (or steal a parked one).
- **Q** — weapon wheel (keys **1–4** pick a tier). **C / V / X** — crew abilities
  (Juno: clean plates, Petra: field repair $150, Cassia: overwatch).
- **M** — current mission. **R** — GPS to the objective. **F** — board / leave the boat.
- **G** — buy the engine upgrade at the garage. **Shift** — nitro. **P** — pause.

## Systems

- **10 story jobs** ($13,750 total, 1,375 RP, rank S "DELTA LEGEND"), each with a
  contact, a payout and a district; one day passes per job.
- **Wanted 1–5**: patrol cars flank with A*, the AIR-1 heli spotlights you from
  level 3, roadblocks at 4, a black SWAT van at 5, spike strips, and a 5-second
  spotlight lock that calls a takedown.
- **6 districts with standing 0–100**: missions +10, races +5, jobs +3. At 50+ the
  district shop gives a 10% discount and a crew ability unlocks there.
- **DELTA ARMS**: 6 weapons in 4 tiers (Pistol / SMG / Shotgun owned; Delta Carbine
  $900, Longshot $1,800, Marauder $2,500) with real BUY clicks.
- **Street races** (5 checkpoints), **taxi + courier jobs**, **20 collectible Aurora
  tapes** ($50 each), a **COVER meter** (witnesses raise the heat after 3 s in view),
  **garage tuning** (Engine / Armour / Nitro) and a **drivable boat** at the Marina.
- **Title screen + 3 save slots** (localStorage), a corner GPS minimap, dispatch
  panel (DELTA-7, CORAL-3, CORAL-9, AIR-1), radio "NEON 88", day/dusk/night cycle.

## Tech

Three.js (vendored under `game/vendor/`), plain ES modules, no network, no build
step. The ground is a single canvas texture (roads, lane dashes, zebra crossings,
plaza tiles, wet-sand band); buildings carry per-storey facades with lit windows;
the pier has stalls, string lights and a ferris wheel; the port has a gantry crane,
containers and a freeway bridge. Lambert materials, no shadows, fixed 1280×720
render buffer.

## Screenshots

`01-chase.jpg` — the dusk chase (heli beam, roadblock, SWAT, spike strips).
`02-shop.jpg` — DELTA ARMS forecourt. `03-pier.jpg` — Coral Pier at night.
`04-tracker.jpg` — Long Beach Port at dusk.

## License

MIT. See LICENSE.
