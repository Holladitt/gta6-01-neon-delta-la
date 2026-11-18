# Neon Delta LA

[![make.fun — gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in a sun-soaked coastal Los Angeles, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) — "Make GTA 6".

You play **Mara Solano**, a former getaway driver who returns to LA after her
sister vanishes — and the proof her sister was holding links the mayor, a port
businessman, and the police. Drive, steal, fight, and outrun the law across
nine districts: Downtown, Hollywood Hills, Marina, Venice Canals, Midtown,
Coral Strip, Coral Pier, the Freeway, and the Long Beach Port container
terminal.

## Features

- **Open city, on foot and by car** — arcade driving with drift and handbrake;
  five vehicle classes (sedan, SUV, pickup, sport, bike), each with its own
  feel, plus stealable traffic cars.
- **Wanted system 1–5** — police cruisers pursue with flashing red-blue
  sirens; at wanted 2+ officers step out of their patrol cars and open fire
  (muzzle flash, tracers, gunshots); at wanted 3+ a helicopter joins the hunt.
- **Traffic and pedestrians** — cars and crowds fill the streets, the port,
  and the Coral Pier boardwalk.
- **6 story missions + 4 side jobs** — GPS waypoints, HUD dialogue, win/fail
  triggers, and cash payouts.
- **Combat** — pistol, SMG, and shotgun, with reload and weapon switching.
- **HUD + minimap** — money and wanted stars, circular minimap, speedometer,
  mission bar, district names, pause menu, and a full city map.
- **Start and save** — title screen, new game / continue, save/load via
  LocalStorage.
- **Living world** — working traffic lights, a festival pier with a ferris
  wheel and roller coaster, neon sunsets, and procedural radio stations.

Everything in the game — city, characters, vehicles, names, story, art,
sound, and music — is original. Nothing is taken from Rockstar Games or any
other commercial game.

## How to play

No build step, no network — the game runs offline from static files.

```sh
cd game
python3 -m http.server 8080
# or: npx serve .   /   node ../serve.ts
```

Then open http://localhost:8080/ in desktop Chrome and press **Enter** (or
click **New Game**).

### Controls

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| Mouse | Look / aim |
| Click | Shoot |
| F | Enter / steal car |
| Shift | Sprint |
| Space | Handbrake / drift |
| R | Reload |
| 1 / 2 / 3 | Pistol / SMG / Shotgun |
| E | Interact |
| Q | Radio station |
| H | Horn |
| Tab | City map |
| N | Save |
| M | Next mission |
| J | Side jobs |
| Esc | Pause |

## Technology

- [Three.js](https://threejs.org/) (vendored under `game/vendor/`) — low-poly
  3D city, characters, and vehicles.
- Plain static files under `game/` — no build step, no bundler, no network
  requests at runtime.
- `main.ts` hands the game in to make.fun; `vendor/makefun-game.ts` is the
  kit's file, unchanged.

## License

MIT — see [LICENSE](LICENSE).
