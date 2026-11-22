// combat.js — shooting: owned weapons, ammo, cooldown, reload (pure).
import { WEAPONS } from './config.js';

export class Combat {
  constructor() {
    this.owned = [0, 1, 2];
    this.current = 0;
    this.ammo = WEAPONS.map((w) => w.mag);
    this.reserves = WEAPONS.map((w) => w.reserve);
    this.cooldown = 0;
  }

  switchTo(index) {
    if (!this.owned.includes(index)) return false;
    this.current = index;
    return true;
  }

  fire() {
    if (this.cooldown > 0) return null;
    if (this.ammo[this.current] <= 0) return null;
    const w = WEAPONS[this.current];
    this.ammo[this.current] -= 1;
    this.cooldown = w.rate;
    return { weapon: this.current, damage: w.damage, range: w.range };
  }

  reload() {
    const w = WEAPONS[this.current];
    const need = w.mag - this.ammo[this.current];
    if (need <= 0) return false;
    const take = Math.min(need, this.reserves[this.current]);
    if (take <= 0) return false;
    this.ammo[this.current] += take;
    this.reserves[this.current] -= take;
    return true;
  }

  tick(dt) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }
}
