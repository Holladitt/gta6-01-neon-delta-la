// Screenshot scenes behind ?shot=chase|steal|sunset|title. Each stages a real
// game state — live actors, HUD, wanted stars, minimap, mission text — then
// paints it twice and sets window.__shotReady, so a headless screenshot is a
// genuine render of the game, never a mockup. The same seed always stages
// the same frame.
import { SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { startMission } from './missions.js';
import { makeVehicle } from './vehicles.js';

// Staged police for screenshots: fill inactive police slots with cruisers at
// the given spots, so the frame shows a real pursuit, not an empty road.
function stagePolice(state, spots) {
  let i = 0;
  for (const pol of state.police) {
    if (i >= spots.length) break;
    const v = makeVehicle('police', spots[i][0], spots[i][1], spots[i][2] || 0, '#e8ecf5');
    Object.assign(pol, v, { active: true, driver: 'police', path: [], pathIndex: 0, repath: 2, role: i === 0 ? 'chase' : 'flank', stuck: 0, bustHold: 0, sight: 1 });
    i += 1;
  }
}

export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  state.time = 12;
  if (name === 'title') {
    return { screen: SCREEN_TITLE, save: { money: 3820 } };
  }
  if (name === 'steal') {
    // Downtown, on foot, pistol out, a teal sedan to steal just ahead, waypoint shown.
    state.player.x = 700; state.player.y = 730; state.player.angle = -Math.PI / 2;
    state.player.money = 3820; state.player.ammo = [8, 30, 6]; state.player.reserve = [72, 120, 36];
    state.wanted = 1; state.wantedPhase = 'pursuit';
    state.camera.x = 700; state.camera.y = 650; state.camera.zoom = 0.8;
    startMission(state, 0);
    // The reset-spawned sedan sits under the waypoint marker; shift it east
    // onto the street and paint it teal so the steal target reads in the shot.
    const target = state.vehicles.find((v) => v.active && v.kind === 'sedan' && Math.abs(v.x - 700) < 5 && Math.abs(v.y - 650) < 5);
    if (target) { target.x = 760; target.y = 650; target.color = '#2ee6d6'; target.roof = '#0f766e'; }
    state.dialogue = { who: 'MARA', text: 'See the teal sedan? Take it. Press F next to it.', t: 99 };
    state.banner = { title: 'HOLLYWOOD HILLS', sub: 'Sunset Foothills', t: 99 };
    return { screen: SCREEN_PLAY, save: null };
  }
  if (name === 'sunset') {
    // Coral Strip at sunset: red sedan fleeing east on the street, police behind, 3 stars, heli.
    const car = state.vehicles.find((v) => v.active && v.kind === 'sedan' && v.color === '#ff4d6d');
    state.player.x = 2100; state.player.y = 650; state.player.angle = 0; state.player.speed = 420;
    state.player.money = 14250; state.player.ammo = [12, 30, 6]; state.player.reserve = [72, 120, 36];
    state.wanted = 3; state.wantedPhase = 'pursuit';
    state.dayNight = 'dusk';
    startMission(state, 4);
    state.missionStep = 0;
    state.dialogue = { who: 'MARA', text: 'Lose the police, then cross Sunset Bridge. One clean run.', t: 99 };
    state.banner = { title: 'CORAL STRIP', sub: 'Beachfront Hotels', t: 99 };
    if (car) { car.driver = 'player'; state.player.vehicle = car; state.player.onFoot = false; car.x = 2100; car.y = 650; car.angle = 0; car.vx = 420; car.vy = 0; car.speed = 420; }
    world.addWanted(0);
    state.wanted = 3;
    state.heli.active = true; state.heli.x = 2100; state.heli.y = 520;
    stagePolice(state, [[1900, 650, 0], [1780, 650, 0]]);
    state.camera.x = 2050; state.camera.y = 650; state.camera.zoom = 0.62;
    return { screen: SCREEN_PLAY, save: null };
  }
  // Default: 'chase' — beach chase on the avenue, helicopter overhead.
  state.player.x = 1900; state.player.y = 1200; state.player.angle = -Math.PI / 2; state.player.speed = 380;
  state.player.money = 4820; state.player.ammo = [12, 30, 6];
  state.wanted = 3; state.wantedPhase = 'pursuit';
  startMission(state, 4);
  state.missionStep = 0;
  const car = state.vehicles.find((v) => v.active && v.kind === 'sedan');
  if (car) { car.driver = 'player'; state.player.vehicle = car; state.player.onFoot = false; car.x = 1900; car.y = 1200; car.angle = -Math.PI / 2; car.vx = 0; car.vy = -380; car.speed = 380; }
  state.heli.active = true; state.heli.x = 1900; state.heli.y = 1000;
  stagePolice(state, [[1900, 1420, -Math.PI / 2], [1760, 1300, -Math.PI / 2]]);
  state.dialogue = { who: 'MARA', text: 'Shake them: break line of sight, swap cars, or change clothes.', t: 99 };
  state.banner = { title: 'CORAL STRIP', sub: 'Beachfront Hotels', t: 99 };
  state.camera.x = 1900; state.camera.y = 1200; state.camera.zoom = 0.62;
  return { screen: SCREEN_PLAY, save: null };
}

export { SCREEN_BUSTED, SCREEN_PAUSED };
