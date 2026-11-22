// Combat: six weapon slots, switching (keys 1-6 all work), reload,
// ray hit tests. Switching is a direct index assignment — no mapping
// table to get wrong. Slots 0-2 are owned from the start; 3-5 are
// bought at DELTA ARMS.
import { WEAPONS } from './config.js';

export class Combat {
  constructor() {
    this.owned = [0, 1, 2];
    this.current = 0;
    this.ammo = WEAPONS.map((w) => w.mag);
    this.reserves = WEAPONS.map((w) => w.reserve);
    this.cooldown = 0;
  }

  get weapon() {
    return WEAPONS[this.current];
  }

  // Direct index switch: keys 1-6 map to weapon slots 0-5. Locked
  // weapons (not in owned) refuse the switch — no fake slot ever fires.
  switchTo(i) {
    if (i < 0 || i >= WEAPONS.length || !this.owned.includes(i)) return false;
    if (i === this.current) return true;
    this.current = i;
    this.cooldown = Math.max(this.cooldown, 0.18);
    return true;
  }

  canFire() {
    return this.cooldown <= 0 && this.ammo[this.current] > 0;
  }

  fire() {
    if (!this.canFire()) return null;
    this.cooldown = this.weapon.rate;
    this.ammo[this.current] -= 1;
    return { weapon: this.weapon, pellets: this.weapon.pellets || 1 };
  }

  reload() {
    const w = this.weapon;
    const need = w.mag - this.ammo[this.current];
    if (need <= 0 || this.reserves[this.current] <= 0) return false;
    const take = Math.min(need, this.reserves[this.current]);
    this.ammo[this.current] += take;
    this.reserves[this.current] -= take;
    return true;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  hudText() {
    const w = this.weapon;
    return `${w.name}  ${this.ammo[this.current]} / ${this.reserves[this.current]}`;
  }
}

// Ray vs spheres: returns the closest hit {t, target} within range, or null.
export function rayHit(ox, oy, oz, dx, dy, dz, targets, range) {
  let best = null;
  let bestT = range;
  for (const t of targets) {
    const cx = t.x - ox;
    const cy = t.y - oy;
    const cz = t.z - oz;
    const proj = cx * dx + cy * dy + cz * dz;
    if (proj < 0 || proj > range) continue;
    const d2 = cx * cx + cy * cy + cz * cz - proj * proj;
    const r = t.r;
    if (d2 > r * r) continue;
    const tt = proj - Math.sqrt(r * r - d2);
    if (tt < bestT) {
      bestT = tt;
      best = { t: tt, target: t };
    }
  }
  return best;
}
