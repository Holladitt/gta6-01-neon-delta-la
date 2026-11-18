[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/reward.svg)](https://make.fun/bounty/gta6-01)

# Neon Delta LA

An open-world crime game set in a sun-soaked coastal Los Angeles, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Explore the city on
foot and by car, steal vehicles, outrun the police, and work through a story of
corruption that runs from City Hall to the port.

## Story

Mara Solano used to drive getaway cars. She is back in Neon Delta because her
sister vanished — and her sister was holding proof of corruption linking the
mayor, a port businessman, and the police. Six main missions follow Mara from
her return to the city to the final confrontation, plus four side jobs around
town.

## Features

- **A living city** — Downtown glass towers, Venice canals, a Santa
  Monica-style pier, Long Beach container port, Marina, Hollywood Hills, and
  freeways.
- **Drive anything** — sedans, SUVs, pickups, sports cars, and bikes, each with
  its own arcade handling, drift, and handbrake. Parked cars can be stolen.
- **Wanted system (1–5 stars)** — police cruisers pursue with A* pathfinding
  and flanking; at wanted 3+ a helicopter joins the hunt. At wanted 2, officers
  step out of their cruisers and open fire.
- **Traffic and pedestrians** — moving traffic, working traffic lights, and
  crowds on the sidewalks and the pier boardwalk.
- **Combat** — pistol, SMG, and shotgun with reload, tracers, and muzzle flash.
- **Missions and story** — a mission scripting engine with GPS waypoints, HUD
  dialogue, and win/fail conditions.
- **HUD and save** — circular minimap, wanted stars, big speed readout,
  district names, pause menu, city map, and localStorage save/load.
- **Coral Pier** — boardwalk amusement pier with a ferris wheel, roller
  coaster, festival lights, stalls, and crowds.
- **Radio** — three procedural WebAudio stations while driving.

Everything in the game — the city, characters, vehicles, names, story, art,
and music — is original. Nothing is taken from any commercial game.

## How to play

Serve the `game/` folder with any static HTTP server and open `index.html` in
desktop Chrome:

```sh
node serve.ts
# or: python3 -m http.server --directory game 8080
```

No build step, no network requests: the game runs offline from static files.

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| Mouse | Look / aim |
| Click | Shoot |
| F | Enter / steal car |
| Space | Handbrake / drift |
| Shift | Sprint |
| 1 / 2 / 3 | Pistol / SMG / Shotgun |
| R | Reload |
| E | Interact |
| Q | Radio station |
| H | Horn |
| M | Next mission |
| J | Side job |
| N | Save |
| Tab | City map |
| Esc | Pause |

## Technology

- [Three.js](https://threejs.org/) (vendored, `game/vendor/`) — low-poly 3D
  rendering with merged static geometry for performance.
- Plain JavaScript modules, no build step, no external assets: every texture
  is painted procedurally at runtime.
- `main.ts` at the repository root hands the game in with the make.fun kit
  (`vendor/makefun-game.ts`).

## License

MIT — see [LICENSE](LICENSE).
