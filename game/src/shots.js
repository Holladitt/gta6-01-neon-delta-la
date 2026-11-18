// Screenshot scenes behind ?shot=chase|steal|sunset|title. Each stages a
// real game state — live actors, HUD, wanted stars, minimap, mission text —
// and the caller paints it for many frames so the 3D chase camera settles,
// then sets window.__shotReady, so a headless screenshot is a genuine render
// of the game, never a mockup. The same seed always stages the same frame.
import { startMission } from './missions.js';
import { makeVehicle } from './vehicles.js';

// Staged police for screenshots: fill inactive police slots with cruisers
// at the given spots, so the frame shows a real pursuit, not an empty road.
function stagePolice(state, spots) {
  let i = 0;
  for (const pol of state.police) {
    if (i >= spots.length) break;
    const v = makeVehicle('police', spots[i][0], spots[i][1], spots[i][2] || 0, '#e8ecf5');
    Object.assign(pol, v, {
      active: true, driver: 'police', path: [], pathIndex: 0, repath: 2, role: i === 0 ? 'chase' : 'flank',
      stuck: 0, reverseT: 0, bustHold: 0, sight: 1,
    });
    i += 1;
  }
}

export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  state.time = 12;
  if (name === 'title') {
    return { screen: 'title', save: { money: 3820 } };
  }
  if (name === 'steal') {
    // Downtown, on foot, pistol out, a teal sedan to steal just ahead, the
    // waypoint marker and a traffic light in frame.
    state.player.x = 700; state.player.y = 730; state.player.angle = -Math.PI / 2;
    state.player.aim = -Math.PI / 2;
    state.player.money = 3820; state.player.ammo = [8, 30, 6]; state.player.reserve = [72, 120, 36];
    state.wanted = 1; state.wantedPhase = 'pursuit';
    startMission(state, 0);
    // The reset-spawned sedan sits under the waypoint marker; shift it onto
    // the street and paint it teal so the steal target reads in the shot —
    // close enough that the F prompt shows.
    const target = state.vehicles.find((v) => v.active && v.kind === 'sedan' && Math.abs(v.x - 700) < 5 && Math.abs(v.y - 650) < 5);
    if (target) { target.x = 745; target.y = 690; target.color = '#2ee6d6'; target.roof = '#0f766e'; }
    state.dialogue = { who: 'MARA', text: 'See the teal sedan? Take it. Press F next to it.', t: 99 };
    state.banner = { title: 'DOWNTOWN', sub: 'Glassline Towers', t: 99 };
    return { screen: 'play', save: null };
  }
  if (name === 'sunset') {
    // Coral Pier at sunset: pink sedan fleeing east toward the sea and the
    // setting sun, police cutting in ahead, 3 stars, heli overhead. Staged
    // on street y=1000 (not 650) so the Coral Pier boardwalk, ferris wheel
    // and roller coaster read in the right of the frame — the pier is the
    // beach's landmark and must be visible in this shot. The avenue-1900 /
    // street-1000 traffic-light pole stands behind the chase camera.
    const car = state.vehicles.find((v) => v.active && v.kind === 'sedan');
    state.player.x = 2200; state.player.y = 1000; state.player.angle = 0; state.player.speed = 560;
    state.player.money = 14250; state.player.ammo = [12, 30, 6]; state.player.reserve = [72, 120, 36];
    state.wanted = 3; state.wantedPhase = 'pursuit';
    state.dayNight = 'dusk';
    startMission(state, 4);
    state.missionStep = 0;
    state.dialogue = { who: 'MARA', text: 'Lose the police, then cross Sunset Bridge. One clean run.', t: 99 };
    state.banner = { title: 'CORAL PIER', sub: 'Amusement Pier & Boardwalk', t: 99 };
    if (car) {
      car.driver = 'player'; state.player.vehicle = car; state.player.onFoot = false;
      car.color = '#ff4d6d'; car.roof = '#ffd23e';
      car.x = 2200; car.y = 1000; car.angle = 0; car.vx = 560; car.vy = 0; car.speed = 560;
    }
    state.heli.active = true; state.heli.x = 2450; state.heli.y = 800;
    stagePolice(state, [[2330, 980, 0], [2260, 1022, 0]]);
    // Keep the hero frame clear: a pedestrian wandering onto the road
    // between the chase camera and the player's car blocks the car.
    // Staging only — gameplay untouched.
    for (const ped of state.peds) {
      if (ped.active && Math.hypot(ped.x - state.player.x, ped.y - state.player.y) < 220) ped.active = false;
    }
    return { screen: 'play', save: null };
  }
  // Default: 'chase' — beach chase up the Coral Strip avenue, helicopter
  // overhead, a cruiser cutting in ahead and one closing from behind.
  state.player.x = 1900; state.player.y = 1200; state.player.angle = -Math.PI / 2; state.player.speed = 483;
  state.player.money = 4820; state.player.ammo = [12, 30, 6];
  state.wanted = 3; state.wantedPhase = 'pursuit';
  startMission(state, 4);
  state.missionStep = 0;
  const car = state.vehicles.find((v) => v.active && v.kind === 'sedan');
  if (car) {
    car.driver = 'player'; state.player.vehicle = car; state.player.onFoot = false;
    car.color = '#ff4d6d'; car.roof = '#ffd23e';
    car.x = 1900; car.y = 1200; car.angle = -Math.PI / 2; car.vx = 0; car.vy = -483; car.speed = 483;
  }
  // The heli is staged 350 units ahead of the car (not 200): the chase
  // camera sits ~112 units behind the car, and at 200 the heli's centre
  // sits at ~18° elevation — right on the top edge of the 55° frame, so
  // only its belly shows. At 350 it sits at ~13° and reads whole.
  state.heli.active = true; state.heli.x = 1900; state.heli.y = 850;
  stagePolice(state, [[1900, 1000, -Math.PI / 2], [1900, 1380, -Math.PI / 2]]);
  state.dialogue = { who: 'MARA', text: 'Shake them: break line of sight, swap cars, or change clothes.', t: 99 };
  state.banner = { title: 'CORAL STRIP', sub: 'Beachfront Hotels', t: 99 };
  return { screen: 'play', save: null };
}
