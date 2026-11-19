// Screenshot staging: ?shot=1..4 presets the game state for a render.
// v11: 1 = police chase (golden hour + heli + dispatch), 2 = car steal +
// witness report, 3 = Coral Pier at dusk + rank, 4 = mission stage tracker
// (replaces the title screen — the title showed no gameplay system).
function stageChase(game) {
  game.setState('playing');
  game.setHour(17.2); // golden hour: warm light rakes the avenue
  const car = game.spawnCar('sport', 200, 140, Math.PI, 0xff2e4d);
  game.enterCar(car);
  car.speed = 22;
  car.vx = Math.sin(car.heading) * 22;
  car.vz = Math.cos(car.heading) * 22;
  // Mission 5 (LAST BRIDGE) gives the stage tracker + the escape context;
  // wanted is pinned to 3 so the helicopter deploys and dispatch lists
  // 3 units + AIR-1.
  game.startMission(4);
  game.setWanted(3);
  // Scripted cruisers hold a fixed offset ahead of the player, so the chase
  // camera always has a cruiser in frame (plain A* flanking turns them off
  // the road ahead within seconds). Travel direction is north (0,-1);
  // lane +5.5 is the player's lane, -5.5 the oncoming lane. Both cruisers
  // sit close (26/36) and the second one is angled 0.55 rad so its NDPD
  // door faces the camera — head-on it only showed its front.
  const lead = game.spawnPolice(200, 85, Math.PI);
  lead.script = { dirX: 0, dirZ: -1, ahead: 26, lane: 5.5 }; // same lane, close ahead — livery + light bar readable
  const headOn = game.spawnPolice(200, 60, 0.55);
  headOn.script = { dirX: 0, dirZ: -1, ahead: 36, lane: -5.5 }; // oncoming lane, angled so the door reads
  // Traffic ahead on the same avenue, so the road ahead reads busy: an
  // oncoming sedan in the right lane, a tall pickup further up the left
  // lane, and an SUV closing in on the right (each lane keeps its own
  // depth line, nothing hides a cruiser).
  game.spawnTraffic('sedan', 'z', 200, 60, 1, 11); // southbound, ends ~21 ahead on the right
  game.spawnTraffic('pickup', 'z', 200, 60, -1, 10); // northbound, ends ~60 ahead on the left
  game.spawnTraffic('suv', 'z', 200, 30, 1, 12); // southbound SUV, closes in on the right
  game.setMoney(8450);
  game.setDay(3);
  game.setCamera(Math.PI, 0.24); // tighter pitch — more road and cars in frame
  game.hud.setDialog('Midtown cruisers on my tail. Lose them!', 6000);
}

function stageSteal(game) {
  game.setState('playing');
  game.setHour(13.5);
  game.teleport(606, 556, -Math.PI / 4);
  game.setWanted(0);
  // Pinned cruiser ahead-left in the frame (fully visible, not clipped at
  // the edge like the random patrol in v8b): same facing as the player, so
  // the camera sees its rear + NDPD door.
  const pc = game.spawnPolice(0, 0, -Math.PI / 4);
  pc.script = { dirX: -0.7071, dirZ: 0.7071, ahead: 26, lane: 5 };
  game.setMoney(250);
  game.setDay(1);
  game.setCamera(-Math.PI / 4, 0.22);
  // Start mission 1 so the stage tracker shows TAHAP 1/2 (GET WHEELS, 1/2
  // after the steal). The mission text is set by startMission itself.
  game.startMission(0);
  game.hud.setDialog('A sedan, just sitting there. Perfect.', 6000);
  game.hud.setPrompt('F — STEAL MERIDIAN S');
  // The shoot script drives the steal: placePedNear + enterCar on the
  // mission-1 sedan, then the 3s witness timer fires and dispatch responds.
}

function stagePier(game) {
  game.setState('playing');
  game.setHour(18.4); // dusk: neon + string lights read, sky purple-orange
  // Close on the deck between the stall rows, looking west-northwest: the
  // north-row signs read at an oblique angle, wheel in frame left.
  game.teleport(-716, 296, -2.09);
  game.setWanted(0);
  game.setMoney(4800);
  game.setRp(320); // RANK B · NIGHTHAWK, 320 / 600 RP
  game.setDay(9);
  game.setCamera(-2.09, 0.20);
  game.startMission(2);
  game.hud.setDialog('Festival of Lights. The pier is lit up like a birthday cake.', 6000,
    { name: 'LUCIA MARLOW', img: game.portrait('LUCIA MARLOW') });
}

function stageTracker(game) {
  game.setState('playing');
  game.setHour(17.2); // golden hour over the Downtown towers
  // Mission 6 (THE BURNING CITY), stage 1/2: the player starts ON the first
  // proof point, so the visit registers during the settle frames and the
  // tracker reads "1/3" with a real progress bar + NEXT step.
  game.teleport(100, -500, 0.6);
  game.setMoney(7250);
  game.setRp(610); // RANK A · OUTLAW, 610 / 1000 RP
  game.setDay(12);
  game.setCamera(0.6, 0.14); // low pitch — skyline dominates, less empty lawn in frame
  game.startMission(5);
  // M6 starts at wanted 3 — pin back to 0 AFTER startMission so the tracker
  // shot stays clean (no dispatch/heli in frame).
  game.setWanted(0);
  game.hud.setDialog('The proof is in three places. Get it all, then vanish.', 6000,
    { name: 'VERA LINDQVIST', img: game.portrait('VERA LINDQVIST') });
}

export function applyShot(game, n) {
  if (n === 1) stageChase(game);
  else if (n === 2) stageSteal(game);
  else if (n === 3) stagePier(game);
  else if (n === 4) stageTracker(game);
  return true;
}
