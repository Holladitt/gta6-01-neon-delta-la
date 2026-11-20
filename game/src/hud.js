// HUD: DOM overlay, circular minimap, city map, title + pause screens.
// v11: NDPD dispatch panel, rank panel, crew bar, weapon slots, DAY counter,
// WANTED banner, stage tracker, district standing, vehicle identity, dialog
// portraits. v12: 6 weapon slots (3 shop-locked with real prices), 3 crew
// abilities, DELTA ARMS shop overlay, minimap OVERWATCH labels.
// Every panel shows only state the game actually tracks.
// Matches the element ids in index.html.
import { WORLD, DISTRICTS, WEAPONS } from './config.js';

export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      clock: $('clock'), day: $('day'), radio: $('radio'),
      weaponStrip: $('weapon-strip'), money: $('money'),
      stars: $('stars'), healthFill: $('health-fill'), armorFill: $('armor-fill'),
      healthNum: $('health-num'), armorNum: $('armor-num'),
      district: $('district-name'), districtSub: $('district-sub'), standing: $('standing'),
      speedNum: $('speed-num'), vehName: $('veh-name'), vehCond: $('veh-cond'),
      mission: $('mission-text'), missionStage: $('mission-stage'), stageFill: $('stage-fill'),
      missionNext: $('mission-next'),
      dialog: $('dialog'), dialogPortrait: $('dialog-portrait'), dialogName: $('dialog-name'),
      dialogText: $('dialog-text'),
      prompt: $('prompt'),
      crosshair: $('crosshair'), vignette: $('vignette'),
      title: $('title-screen'), titleContinue: $('btn-continue'), titleContinueLabel: $('continue-label'),
      pause: $('pause-menu'), map: $('map-screen'), toast: $('toast'),
      wantedBanner: $('wanted-banner'), wantedBannerText: $('wanted-banner-text'),
      wantedBannerSub: $('wanted-banner-sub'),
      dispatch: $('dispatch'), dispatchBody: $('dispatch-body'), dispatchHead: $('dispatch-head'),
      rankPanel: $('rank-panel'), rankTitle: $('rank-title'), rankBar: $('rank-bar'), rankRp: $('rank-rp'),
      crewBar: $('crew-bar'),
      shop: $('shop-screen'), shopRows: $('shop-rows'), shopMoney: $('shop-money'),
      stats: $('stats-screen'), statsRows: $('stats-rows'),
    };
    this.minimap = $('minimap').getContext('2d');
    this.citymap = $('citymap').getContext('2d');
    this.dialogTimer = null;
    this.portraits = null;
    // stars: 5 slots
    this.el.stars.innerHTML = '<span>★</span>'.repeat(5);
  }
  setPortraits(map) {
    this.portraits = map;
    // crew bar is built once portraits exist
    if (this.el.crewBar && map) {
      const crew = [
        { id: 'juno', name: 'JUNO REYES', role: 'DRIVER' },
        { id: 'petra', name: 'PETRA HALE', role: 'MECHANIC' },
        { id: 'cassia', name: 'CASSIA WREN', role: 'LOOKOUT' },
      ];
      this.el.crewBar.innerHTML = '<div class="crew-head">CREW</div>' + crew.map((c) => `
        <div class="crew-row"><img src="${map[c.id]}" alt="">
        <div><div class="crew-name">${c.name}</div><div class="crew-role">${c.role}</div></div></div>`).join('')
        + '<div class="crew-ability" id="crew-ability">CLEAN PLATES [C] — READY</div>'
        + '<div class="crew-ability" id="crew-ability-repair">FIELD REPAIR [V] — READY</div>'
        + '<div class="crew-ability" id="crew-ability-watch">OVERWATCH [X] — READY</div>';
      this.el.crewAbility = document.getElementById('crew-ability');
      this.el.crewAbilityRepair = document.getElementById('crew-ability-repair');
      this.el.crewAbilityWatch = document.getElementById('crew-ability-watch');
    }
  }
  setMoney(n) { this.el.money.textContent = '$' + n.toLocaleString('en-US'); }
  setWanted(level) {
    const spans = this.el.stars.children;
    for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('on', i < level);
    // Big WANTED banner at wanted 3+: the "you are being hunted" read.
    if (this.el.wantedBanner) {
      this.el.wantedBanner.style.display = level >= 3 ? 'block' : 'none';
      if (level >= 3) this.el.wantedBannerText.textContent = 'WANTED ' + '★'.repeat(level);
    }
  }
  setWantedStatus(text) {
    if (this.el.wantedBannerSub) this.el.wantedBannerSub.textContent = text;
  }
  setHealth(h, a) {
    this.el.healthFill.style.width = Math.max(0, h) + '%';
    this.el.armorFill.style.width = Math.max(0, a) + '%';
    if (this.el.healthNum) this.el.healthNum.textContent = Math.round(Math.max(0, h));
    if (this.el.armorNum) this.el.armorNum.textContent = Math.round(Math.max(0, a));
  }
  // 6 weapon slots with live ammo. Locked shop weapons show their REAL
  // price (never a fake LOCKED label) — the price is the buy path.
  setWeaponSlots(combat) {
    if (!this.el.weaponStrip) return;
    let html = '';
    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const active = combat.current === i;
      const owned = combat.owned.includes(i);
      const label = owned ? `${i + 1} ${w.name} ${combat.ammo[i]}/${combat.reserves[i]}` : `${i + 1} ${w.name} $${w.price.toLocaleString('en-US')}`;
      html += `<span class="wslot${active ? ' active' : ''}${owned ? '' : ' locked'}">${label}</span>`;
    }
    this.el.weaponStrip.innerHTML = html;
  }
  setWeapon(text) {
    // legacy shim: single-line fallback (main.js now uses setWeaponSlots)
    if (this.el.weaponStrip) this.el.weaponStrip.textContent = text;
  }
  setClock(hour, day) {
    // Round total minutes first: (hour % 1) * 60 floors 18.4 to 23
    // (0.3999… * 60) — the clock must show the staged hour, not one less.
    const tm = Math.round(hour * 60);
    const h = Math.floor(tm / 60) % 24, m = tm % 60;
    this.el.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (day != null && this.el.day) this.el.day.textContent = 'DAY ' + day;
  }
  setRadio(name) { this.el.radio.textContent = name; }
  setDistrict(name, sub, standingText) {
    if (this.el.district.textContent !== name) {
      this.el.district.textContent = name;
      this.el.districtSub.textContent = sub;
      this.el.district.parentElement.classList.remove('pop');
      void this.el.district.parentElement.offsetWidth;
      this.el.district.parentElement.classList.add('pop');
    }
    if (standingText != null && this.el.standing) this.el.standing.textContent = standingText;
  }
  // veh: model name; cond: "62% DENTED" (health); gear: "G2" / "N".
  setSpeed(kmh, veh, cond, gear) {
    this.el.speedNum.textContent = Math.round(kmh);
    this.el.vehName.textContent = veh || '';
    if (this.el.vehCond) this.el.vehCond.textContent = cond && gear ? `${cond} · ${gear}` : (cond || '');
  }
  setMission(text) { this.el.mission.textContent = text; }
  // Stage tracker: label + "TAHAP s/S: title", progress bar (done/total
  // inside the stage), NEXT step text. stage comes from stageOf().
  setMissionStage(label, stage) {
    if (!this.el.missionStage) return;
    if (!stage) {
      this.el.missionStage.textContent = '';
      this.el.stageFill.style.width = '0%';
      this.el.missionNext.textContent = '';
      return;
    }
    this.el.missionStage.textContent =
      `${label} · TAHAP ${stage.index + 1}/${stage.total}: ${stage.title}`;
    const pct = stage.totalSteps > 0 ? Math.min(1, stage.done / stage.totalSteps) * 100 : 0;
    this.el.stageFill.style.width = pct + '%';
    this.el.missionNext.textContent = stage.next ? 'NEXT: ' + stage.next : '';
  }
  // speaker: {name, img} or null (defaults to Mara). Portrait is a
  // procedural canvas bust drawn at boot from the speaker's own colors.
  setDialog(text, ms = 5000, speaker) {
    const sp = speaker || { name: 'MARA', img: this.portraits ? this.portraits.mara : null };
    if (this.el.dialogPortrait) {
      if (sp.img) { this.el.dialogPortrait.src = sp.img; this.el.dialogPortrait.style.display = 'block'; }
      else this.el.dialogPortrait.style.display = 'none';
    }
    if (this.el.dialogName) this.el.dialogName.textContent = sp.name;
    if (this.el.dialogText) this.el.dialogText.textContent = text;
    else this.el.dialog.textContent = text;
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
  // Dispatch panel: null hides it. Rows come from buildDispatch() — real
  // units, real distances, real roles.
  setDispatch(d) {
    if (!this.el.dispatch) return;
    if (!d) { this.el.dispatch.style.display = 'none'; return; }
    this.el.dispatch.style.display = 'block';
    this.el.dispatchHead.textContent = `NDPD DISPATCH · CODE ${d.code} — ${d.crime}`;
    let html = '';
    for (const u of d.units) {
      html += `<div class="disp-row"><span class="disp-call">${u.callsign}</span><span class="disp-role">${u.role}</span><span class="disp-dist">${u.dist} m</span></div>`;
    }
    if (d.more > 0) html += `<div class="disp-more">+${d.more} more</div>`;
    html += `<div class="disp-status">STATUS: ${d.status}</div>`;
    this.el.dispatchBody.innerHTML = html;
  }
  setRank(r) {
    if (!this.el.rankPanel) return;
    this.el.rankTitle.textContent = `RANK ${r.letter} · ${r.title}`;
    const pct = r.nextMin ? Math.min(1, r.rp / r.nextMin) * 100 : 100;
    this.el.rankBar.style.width = pct + '%';
    this.el.rankRp.textContent = r.nextMin ? `${r.rp.toLocaleString('en-US')} / ${r.nextMin.toLocaleString('en-US')} RP` : `${r.rp.toLocaleString('en-US')} RP · MAX`;
  }
  // Crew ability rows: cooldown seconds or READY. All three are real.
  // state = crew state {cooldownT, repairT, watchT, watchCd}; ctx = the
  // live context the repair ability needs {inCar, condition, money}.
  setCrewAbility(state, wanted, ctx = {}) {
    const cs = state || {};
    if (this.el.crewAbility) {
      if (wanted <= 0) this.el.crewAbility.textContent = 'CLEAN PLATES [C] — NO HEAT';
      else if (cs.cooldownT > 0) this.el.crewAbility.textContent = `CLEAN PLATES [C] — ${Math.ceil(cs.cooldownT)}s`;
      else this.el.crewAbility.textContent = 'CLEAN PLATES [C] — READY';
      this.el.crewAbility.classList.toggle('ready', wanted > 0 && cs.cooldownT <= 0);
    }
    if (this.el.crewAbilityRepair) {
      const cond = ctx.condition;
      let text, ready = false;
      if (!ctx.inCar) text = 'FIELD REPAIR [V] — NEED A CAR';
      else if (cond != null && cond >= 100) text = 'FIELD REPAIR [V] — CAR OK';
      else if (cs.repairT > 0) text = `FIELD REPAIR [V] — ${Math.ceil(cs.repairT)}s`;
      else if ((ctx.money ?? 0) < 150) text = 'FIELD REPAIR [V] — NEED $150';
      else { text = 'FIELD REPAIR [V] — READY ($150)'; ready = true; }
      this.el.crewAbilityRepair.textContent = text;
      this.el.crewAbilityRepair.classList.toggle('ready', ready);
    }
    if (this.el.crewAbilityWatch) {
      let text, ready = false;
      if (cs.watchT > 0) text = `OVERWATCH [X] — ${Math.ceil(cs.watchT)}s LEFT`;
      else if (cs.watchCd > 0) text = `OVERWATCH [X] — ${Math.ceil(cs.watchCd)}s`;
      else { text = 'OVERWATCH [X] — READY'; ready = true; }
      this.el.crewAbilityWatch.textContent = text;
      this.el.crewAbilityWatch.classList.toggle('ready', ready);
    }
  }

  // ---- DELTA ARMS shop overlay ----
  // state = {money, owned, ammo, reserves}. Every row shows the real state:
  // owned weapons show live ammo, locked ones show the real price + a BUY
  // button that is only enabled when the player can actually afford it.
  showShop(state) {
    if (!this.el.shop) return;
    this.renderShop(state);
    this.el.shop.style.display = 'flex';
  }
  hideShop() { if (this.el.shop) this.el.shop.style.display = 'none'; }
  renderShop(state) {
    if (!this.el.shopRows) return;
    if (this.el.shopMoney) this.el.shopMoney.textContent = 'YOUR CASH: $' + (state.money || 0).toLocaleString('en-US');
    let html = '';
    for (const w of WEAPONS) {
      const owned = state.owned.includes(w.id);
      const afford = (state.money || 0) >= w.price;
      const status = owned
        ? `<span class="shop-owned">OWNED · ${state.ammo[w.id]}/${state.reserves[w.id]} ammo</span>`
        : `<button class="shop-buy" data-buy="${w.id}" ${afford ? '' : 'disabled'}>BUY $${w.price.toLocaleString('en-US')}</button>`;
      html += `<div class="shop-row">
        <div class="shop-num">${w.id + 1}</div>
        <div class="shop-info"><div class="shop-name">${w.name}</div>
        <div class="shop-stats">DMG ${w.dmg} · MAG ${w.mag} · RANGE ${w.range}m${w.auto ? ' · AUTO' : ''}${w.pellets ? ` · ${w.pellets} PELLETS` : ''}</div></div>
        ${status}</div>`;
    }
    this.el.shopRows.innerHTML = html;
  }
  showTitle(save) {
    this.el.title.style.display = 'flex';
    if (save) {
      this.el.titleContinue.style.display = 'block';
      this.el.titleContinueLabel.textContent = `$${save.money.toLocaleString('en-US')}`;
    } else {
      this.el.titleContinue.style.display = 'none';
    }
  }
  hideTitle() { this.el.title.style.display = 'none'; }
  showPause(on) { this.el.pause.style.display = on ? 'flex' : 'none'; }
  showMap(on) { this.el.map.style.display = on ? 'flex' : 'none'; }

  // ---- v13 career-stats modal ----
  // state = { missionsDone, missionsTotal, totalEarned, carsStolen, days,
  // rank, rp, nextRp, weaponsOwned, weaponsTotal } — every number is real
  // tracked game state; nothing here is invented or decorative.
  showStats(state) {
    if (!this.el.stats) return;
    const row = (label, value) => `<div class="stats-row"><span>${label}</span><b>${value}</b></div>`;
    const next = state.nextRp ? ` · NEXT ${state.nextRp} RP` : ' · MAX RANK';
    this.el.statsRows.innerHTML =
      row('MISSIONS COMPLETED', `${state.missionsDone} / ${state.missionsTotal}`) +
      row('TOTAL EARNED', `$${state.totalEarned.toLocaleString('en-US')}`) +
      row('CARS STOLEN', `${state.carsStolen}`) +
      row('DAYS PLAYED', `${state.days}`) +
      row('RANK', `${state.rank}${next}`) +
      row('RESPECT (RP)', `${state.rp}`) +
      row('WEAPONS OWNED', `${state.weaponsOwned} / ${state.weaponsTotal}`);
    this.el.stats.style.display = 'flex';
  }
  hideStats() { if (this.el.stats) this.el.stats.style.display = 'none'; }

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
    // landmark icons: pier (wheel), port (crates), hospital (cross)
    g.font = 'bold 10px Arial'; g.textAlign = 'center';
    g.fillStyle = '#ffd23d';
    g.fillText('◉', sc(-725), sc(300) + 3); // Coral Pier
    g.fillStyle = '#ff7e5f';
    g.fillText('▦', sc(530), sc(530) + 3); // Long Beach Port
    g.fillStyle = '#ff5a5a';
    g.fillText('+', sc(200), sc(-440) + 3); // Delta General Hospital
    // route guide line: dashed from player to waypoint (direction aid)
    if (d.waypoint) {
      const wx = sc(d.waypoint.x), wz = sc(d.waypoint.z);
      g.strokeStyle = '#ffd23d'; g.lineWidth = 2; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(sc(d.px), sc(d.pz)); g.lineTo(wx, wz); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ffd23d';
      g.beginPath(); g.moveTo(wx, wz - 7); g.lineTo(wx + 6, wz); g.lineTo(wx, wz + 7); g.lineTo(wx - 6, wz); g.closePath(); g.fill();
    }
    // traffic
    g.fillStyle = '#9aa5b1';
    for (const t of d.traffic || []) { g.fillRect(sc(t.x) - 1.5, sc(t.z) - 1.5, 3, 3); }
    // police (red dots). OVERWATCH (Cassia, 20s): each unit also shows its
    // real callsign + real distance in meters, with a gold tracking ring.
    for (const p of d.police || []) {
      g.fillStyle = '#ff4444';
      g.beginPath(); g.arc(sc(p.x), sc(p.z), d.overwatch ? 5 : 3.5, 0, Math.PI * 2); g.fill();
      if (d.overwatch) {
        g.strokeStyle = '#ffd23d'; g.lineWidth = 2;
        g.beginPath(); g.arc(sc(p.x), sc(p.z), 8, 0, Math.PI * 2); g.stroke();
        if (p.call) {
          const dist = Math.round(Math.hypot(p.x - d.px, p.z - d.pz));
          g.fillStyle = '#ffd23d'; g.font = 'bold 9px Arial'; g.textAlign = 'left';
          g.fillText(`${p.call} ${dist}m`, sc(p.x) + 9, sc(p.z) + 3);
        }
      }
    }
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
