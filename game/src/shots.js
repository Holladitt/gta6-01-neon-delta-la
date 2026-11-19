// Screenshot staging: ?shot=1..4 presets the game state for a render.
// 1 = police chase, 2 = car steal, 3 = Coral Pier at golden hour, 4 = title.
function stageChase(game) {
  game.setState('playing');
  game.setHour(13.5);
  const car = game.spawnCar('sport', 200, 140, Math.PI, 0xff2e4d);
  game.enterCar(car);
  car.speed = 22;
  car.vx = Math.sin(car.heading) * 22;
  car.vz = Math.cos(car.heading) * 22;
  game.setWanted(2); // Midtown cruisers with flashing light bars close ahead
  // Scripted cruisers hold a fixed offset ahead of the player, so the chase
  // camera always has a cruiser in frame (plain A* flanking turns them off
  // the road ahead within seconds). Travel direction is north (0,-1);
  // lane +5.5 is the player's lane, -5.5 the oncoming lane.
  const lead = game.spawnPolice(200, 85, Math.PI);
  lead.script = { dirX: 0, dirZ: -1, ahead: 32, lane: 5.5 }; // same lane, close ahead — livery + light bar readable
  const headOn = game.spawnPolice(200, 60, 0);
  headOn.script = { dirX: 0, dirZ: -1, ahead: 50, lane: -5.5 }; // oncoming lane, head-on to the camera
  // Traffic ahead on the same avenue, so the road ahead reads busy: an
  // oncoming sedan in the right lane, a tall pickup further up the left
  // lane (each lane keeps its own depth line, nothing hides a cruiser).
  game.spawnTraffic('sedan', 'z', 200, 60, 1, 11); // southbound, ends ~21 ahead on the right
  game.spawnTraffic('pickup', 'z', 200, 60, -1, 10); // northbound, ends ~60 ahead on the left
  game.setMoney(1250);
  game.setCamera(Math.PI, 0.20);
  game.hud.setDialog('MARA: Midtown cruisers on my tail. Lose them!', 6000);
  game.hud.setMission('MISSION 5 — LAST BRIDGE: Escape the police, then cross the bridge.');
}

function stageSteal(game) {
  game.setState('playing');
  game.setHour(13.5);
  game.teleport(606, 556, -Math.PI / 4);
  game.setWanted(1);
  game.setMoney(250);
  game.setCamera(-Math.PI / 4, 0.22);
  game.hud.setDialog('MARA: That teal sedan. First wheels of the day.', 6000);
  game.hud.setMission('MISSION 1 — RETURN TO LA: Steal a sedan.');
  game.hud.setPrompt('F — STEAL SEDAN');
}

function stagePier(game) {
  game.setState('playing');
  game.setHour(17.4);
  // Close on the deck between the stall rows, looking west-northwest: the
  // north-row signs read at an oblique angle, wheel in frame left.
  game.teleport(-716, 296, -2.09);
  game.setWanted(0);
  game.setMoney(4800);
  game.setCamera(-2.09, 0.20);
  game.startMission(2);
  game.hud.setDialog('MARA: Festival of Lights. The pier is lit up like a birthday cake.', 6000);
}

function stageTitle(game) {
  game.setState('title');
  game.setHour(17.4);
  game.setCamera(0, 0.5);
}

export function applyShot(game, n) {
  if (n === 1) stageChase(game);
  else if (n === 2) stageSteal(game);
  else if (n === 3) stagePier(game);
  else if (n === 4) stageTitle(game);
  return true;
}
