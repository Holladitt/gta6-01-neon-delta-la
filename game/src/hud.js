// HUD for Neon Delta LA: money and wanted stars top-right, the
// circular minimap bottom-left, big speed bottom-right, the mission
// bar bottom-centre, a big italic district name, the COVER meter,
// the tape counter and the standing bar. Rendered as DOM on top of
// the 3D canvas so it stays crisp at any resolution.
export function createHudState() {
  return { visible: true, minimap: true, districtFlash: '' };
}

export function moneyText(money) {
  return '$' + Number(money).toLocaleString('en-US');
}

export function wantedStars(level) {
  let s = '';
  for (let i = 0; i < 5; i += 1) s += i < level ? '★' : '☆';
  return s;
}

export function speedText(speedMps) {
  return Math.round(Math.abs(speedMps) * 3.6) + ' km/h';
}

export function districtBanner(district) {
  return district.toUpperCase();
}

export function missionBarText(mission, objective) {
  if (!mission) return '';
  return mission.title + ' · ' + objective;
}

export function renderHud(world, hud) {
  const el = document.getElementById('hud');
  if (!el) return;
  const m = world.missions ? world.missions : null;
  const mission = m && m.current >= 1 && m.current <= 10 ? null : null;
  el.innerHTML = '';
  const money = document.createElement('div');
  money.id = 'hud-money';
  money.textContent = moneyText(world.money) + '  ' + wantedStars(world.wanted.level);
  el.appendChild(money);
  const speed = document.createElement('div');
  speed.id = 'hud-speed';
  speed.textContent = speedText(world.car.speed);
  el.appendChild(speed);
  const district = document.createElement('div');
  district.id = 'hud-district';
  district.textContent = districtBanner(world.district || 'downtown');
  el.appendChild(district);
  const cover = document.createElement('div');
  cover.id = 'hud-cover';
  cover.textContent = 'COVER ' + Math.round(world.cover.value) + ' · TAPES ' + world.tapes.found.length + '/20';
  el.appendChild(cover);
}

export function renderMissionBar(world, mission, objective, next) {
  const el = document.getElementById('mission-bar');
  if (!el) return;
  el.innerHTML = '';
  if (!mission) return;
  const t = document.createElement('div');
  t.className = 'mb-title';
  t.textContent = mission.title + ' · ' + (mission.stage || '');
  el.appendChild(t);
  const o = document.createElement('div');
  o.className = 'mb-objective';
  o.textContent = objective || '';
  el.appendChild(o);
  if (next) {
    const n = document.createElement('div');
    n.className = 'mb-next';
    n.textContent = 'NEXT: ' + next;
    el.appendChild(n);
  }
}

export function renderDialogue(world, name, line) {
  const el = document.getElementById('dialogue');
  if (!el) return;
  el.innerHTML = '';
  if (!name || !line) return;
  const n = document.createElement('div');
  n.className = 'dlg-name';
  n.textContent = name;
  el.appendChild(n);
  const l = document.createElement('div');
  l.className = 'dlg-line';
  l.textContent = line;
  el.appendChild(l);
}
