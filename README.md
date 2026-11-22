# Neon Delta LA: District Wars

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Holladitt/gta6-01-neon-delta-la/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game built for the make.fun **gta6-01 "Make GTA 6"** bounty: https://make.fun/bounty/gta6-01

## The game

You are Mara Solano, an ex-getaway driver back on the streets of a sun-soaked Los Angeles that never sleeps. Your sister vanished holding proof of a corruption ring, and the only way to find her is to work the city — job by job, district by district — until the people who took her run out of places to hide.

Neon Delta LA is a coastal open world: Downtown towers, the Venice canals, Coral Pier, the Long Beach port, the Marina, and the Hollywood Hills, all connected by freeways under a sodium-yellow sky. Ten story jobs carry Mara from a small-time wheelman to the figure the whole city whispers about, while the NDPD closes in with every wanted star you earn.

## What is in it

- **6 districts** with their own standing (0–100). Raise standing with missions, races, and jobs; at 50+ a district gives you a 10% shop discount and unlocks a crew ability there.
- **10 story jobs** across six contacts, paying out $13,750 in total, from a $400 first run to a $3,000 finale.
- **Wanted levels 1–5**: patrol cars flank and pursue, a helicopter joins at 3+, roadblocks appear at 4, and a black SWAT van plus spike strips come for you at 5.
- **4 weapon tiers** (pistol/SMG/shotgun, Delta Carbine, Longshot, Marauder) with a weapon wheel and a shop where every purchase is a real click.
- **Crew abilities**: clean plates to shed heat, field repair to fix your car, and overwatch to watch your back.
- **Street races** (5 checkpoints each), taxi and courier jobs, 20 collectible Aurora tapes, a cover meter that turns witnesses into heat, a garage for engine, armour, and nitro tuning, and a drivable boat at the Marina.
- **3 save slots** on the title screen, a corner GPS minimap, a pause menu, and a radio station that never stops playing.

## How to run it

Neon Delta LA is a static browser game — no build step, no backend, no network needed while you play. Serve the folder with the included dev server and open it in your browser:

```sh
node serve.ts
```

Then open http://localhost:8080 in your browser. Keyboard and mouse only: drive, shoot, and run jobs with the on-screen controls and the key hints in the pause menu.

## Built with

Plain JavaScript and Three.js, rendered on a single canvas. The whole game lives under `game/`, and `main.ts` (Node 22) packages it for the make.fun dossier.

## License

MIT — see `LICENSE` for the full text.
