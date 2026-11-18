// HUD: DOM overlay, circular minimap, city map, title + pause screens.
// Matches the element ids in index.html.
import { WORLD, DISTRICTS } from './config.js';

export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      clock: $('clock'), radio: $('radio'), weapon: $('weapon'), money: $('money'),
      stars: $('stars'), healthFill: $('health-fill'), armorFill: $('armor-fill'),
      district: $('district-name'), districtSub: $('district-sub'),
      speedNum: $('speed-num'), vehName: $('veh-name'),
      mission: $('mission-text'), dialog: $('dialog'), prompt: $('prompt'),
      crosshair: $('crosshair'), vignette: $('vignette'),
      title: $('title-screen'), titleContinue: $('btn-continue'), titleContinueLabel: $('continue-label'),
      pause: $('pause-menu'), map: $('map-screen'), toast: $('toast'),
    };
    this.minimap = $('minimap').getContext('2d');
    this.citymap = $('citymap').getContext('2d');
    this.dialogTimer = null;
    // stars: 5 slots
    this.el.stars.innerHTML = '<span>★</span>'.repeat(5);
  }
  setMoney(n) { this.el.money.textContent = '$' + n.toLocaleString('en-US'); }
  setWanted(level) {
    const spans = this.el.stars.children;
    for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('on', i < level);
  }
  setHealth(h, a) {
    this.el.healthFill.style.width = Math.max(0, h) + '%';
    this.el.armorFill.style.width = Math.max(0, a) + '%';
  }
  setWeapon(text) { this.el.weapon.textContent = text; }
  setClock(hour) {
    const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60);
    this.el.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  setRadio(name) { this.el.radio.textContent = name; }
  setDistrict(name, sub) {
    if (this.el.district.textContent !== name) {
      this.el.district.textContent = name;
      this.el.districtSub.textContent = sub;
      this.el.district.parentElement.classList.remove('pop');
      void this.el.district.parentElement.offsetWidth;
      this.el.district.parentElement.classList.add('pop');
    }
  }
  setSpeed(kmh, veh) {
    this.el.speedNum.textContent = Math.round(kmh);
    this.el.vehName.textContent = veh || '';
  }
  setMission(text) { this.el.mission.textContent = text; }
  setDialog(text, ms = 5000) {
    this.el.dialog.textContent = text;
    this.el.dialog.style.opacity = '1';
    clearTimeout(this.dialogTimer);
    this.dialogTimer = setTimeout(() => { this.el.dialog.style.opacity = '0'; }, ms);
  }
  setPrompt(text) {
    this.el.prompt.textContent = text || '';
    this.el.prompt.style.display = text ? 'block' : 'none';
  }
  showCrosshair(on) { this.el.crosshair.style.display = on ? 'block' : 'none'; }
  setVisible(on) { document.getElementById('hud').style.display = on ? 'block' : 'none'; }
  flashDamage() {
    this.el.vignette.style.opacity = '0.55';
    setTimeout(() => { this.el.vignette.style.opacity = '0'; }, 180);
  }
  toast(text, ms = 3500) {
    this.el.toast.textContent = text;
    this.el.toast.style.opacity = '1';
    setTimeout(() => { this.el.toast.style.opacity = '0'; }, ms);
  }
  showTitle(save) {
    this.el.title.style.display = 'flex';
    if (save) {
      this.el.titleContinue.style.display = 'block';
      this.el.titleContinueLabel.textContent = `CONTINUE — $${save.money.toLocaleString('en-US')}`;
    } else {
      this.el.titleContinue.style.display = 'none';
    }
  }
  hideTitle() { this.el.title.style.display = 'none'; }
  showPause(on) { this.el.pause.style.display = on ? 'flex' : 'none'; }
  showMap(on) { this.el.map.style.display = on ? 'flex' : 'none'; }

  // ---- minimap (circular, 180px) ----
  drawMinimap(d) {
    const g = this.minimap, S = 180, C = S / 2;
    const sc = (x) => ((x + WORLD.HALF) / (WORLD.HALF * 2)) * S;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, S, S);
    // water + beach
    g.fillStyle = '#1e6f9e'; g.fillRect(0, 0, sc(-720), S);
    g.fillStyle = '#e8cf9a'; g.fillRect(sc(-720), 0, sc(-660) - sc(-720), S);
    // roads
    g.strokeStyle = '#5a6a7a'; g.lineWidth = 3;
    for (const x of WORLD.AVENUES) { g.beginPath(); g.moveTo(sc(x), 0); g.lineTo(sc(x), S); g.stroke(); }
    for (const z of WORLD.STREETS) { g.beginPath(); g.moveTo(0, sc(z)); g.lineTo(S, sc(z)); g.stroke(); }
    // waypoint
    if (d.waypoint) {
      const wx = sc(d.waypoint.x), wz = sc(d.waypoint.z);
      g.fillStyle = '#ffd23d';
      g.beginPath(); g.moveTo(wx, wz - 7); g.lineTo(wx + 6, wz); g.lineTo(wx, wz + 7); g.lineTo(wx - 6, wz); g.closePath(); g.fill();
    }
    // traffic
    g.fillStyle = '#9aa5b1';
    for (const t of d.traffic || []) { g.fillRect(sc(t.x) - 1.5, sc(t.z) - 1.5, 3, 3); }
    // police
    g.fillStyle = '#ff4444';
    for (const p of d.police || []) { g.beginPath(); g.arc(sc(p.x), sc(p.z), 3.5, 0, Math.PI * 2); g.fill(); }
    // player arrow
    const px = sc(d.px), pz = sc(d.pz);
    g.save();
    g.translate(px, pz); g.rotate(-d.heading);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
    g.restore();
    // north tick
    g.fillStyle = '#ffffff'; g.font = 'bold 11px Arial'; g.textAlign = 'center';
    g.fillText('N', C, 14);
    g.restore();
    g.strokeStyle = '#2ec4b6'; g.lineWidth = 3;
    g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.stroke();
  }

  // ---- full city map (800x600) ----
  drawCityMap(d) {
    const g = this.citymap, W = 800, H = 600;
    const sc = (x) => ((x + WORLD.HALF) / (WORLD.HALF * 2)) * W;
    const sz = (z) => ((z + WORLD.HALF) / (WORLD.HALF * 2)) * H;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#12233d'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1e6f9e'; g.fillRect(0, 0, sc(-720), H);
    g.fillStyle = '#e8cf9a'; g.fillRect(sc(-720), 0, sc(-660) - sc(-720), H);
    // districts
    g.font = 'bold 13px Arial'; g.textAlign = 'center';
    for (const dist of DISTRICTS) {
      g.fillStyle = 'rgba(46,196,182,0.14)';
      g.fillRect(sc(dist.x0), sz(dist.z0), sc(dist.x1) - sc(dist.x0), sz(dist.z1) - sz(dist.z0));
      g.fillStyle = '#2ec4b6';
      g.fillText(dist.name, (sc(dist.x0) + sc(dist.x1)) / 2, (sz(dist.z0) + sz(dist.z1)) / 2);
    }
    // roads
    g.strokeStyle = '#8a9ab0'; g.lineWidth = 4;
    for (const x of WORLD.AVENUES) { g.beginPath(); g.moveTo(sc(x), 0); g.lineTo(sc(x), H); g.stroke(); }
    for (const z of WORLD.STREETS) { g.beginPath(); g.moveTo(0, sz(z)); g.lineTo(W, sz(z)); g.stroke(); }
    if (d.waypoint) {
      g.fillStyle = '#ffd23d';
      const wx = sc(d.waypoint.x), wz = sz(d.waypoint.z);
      g.beginPath(); g.moveTo(wx, wz - 10); g.lineTo(wx + 9, wz); g.lineTo(wx, wz + 10); g.lineTo(wx - 9, wz); g.closePath(); g.fill();
    }
    g.save();
    g.translate(sc(d.px), sz(d.pz)); g.rotate(-d.heading);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -10); g.lineTo(8, 9); g.lineTo(-8, 9); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = '#ff4444';
    for (const p of d.police || []) { g.beginPath(); g.arc(sc(p.x), sz(p.z), 5, 0, Math.PI * 2); g.fill(); }
  }
}
