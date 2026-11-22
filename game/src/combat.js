// Combat: the six weapons, switching, firing with a per-shot cooldown,
// and reloading from reserve stock.

import { WEAPONS } from './config.js';

export class Combat {
  constructor() {
    this.owned = [0, 1, 2];
    this.current = 0;
    this.ammo = WEAPONS.map((w) => w.mag);
    this.reserves = WEAPONS.map((w) => w.reserve);
    this.cooldown = 0;
  }

  switchTo(idx) {
    if (!this.owned.includes(idx)) return false;
    this.current = idx;
    return true;
  }

  fire() {
    if (this.cooldown > 0) return null;
    if (this.ammo[this.current] <= 0) return null;
    this.ammo[this.current] -= 1;
    const w = WEAPONS[this.current];
    this.cooldown = w.auto ? 0.12 : 0.35;
    return { weapon: this.current, dmg: w.dmg, pellets: w.pellets };
  }

  reload() {
    const w = WEAPONS[this.current];
    if (this.ammo[this.current] >= w.mag) return false;
    const need = w.mag - this.ammo[this.current];
    const take = Math.min(need, this.reserves[this.current]);
    this.ammo[this.current] += take;
    this.reserves[this.current] -= take;
    return true;
  }

  tick(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }
}
