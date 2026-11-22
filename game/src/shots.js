// Screenshot staging: ?shot=1..4 presets the game state for a render.
// v13-fix: 1 = DUSK chase at 17:00 golden hour (heli spotlight + dispatch),
// 2 = DELTA ARMS weapon shop (real money, real prices),
// 3 = Coral Pier at night, M7 THE NIGHT LEDGER + rank,
// 4 = M8 THE LAST SIGNAL stage tracker + Orin Beck portrait dialogue.
function stageDuskChase(game) {
  game.setState('playing');
  // v13-fix: DUSK at 17:00, not full night — the owner asked for an
  // afternoon chase (golden hour: warm sky, everything readable). The hour
  // is set AFTER startMission: M5 has no startHour so startMission does not
  // pin the clock, but the M8 pattern proves startMission CAN pin it, so
  // setHour goes after, like stageM8Tracker does.
  // SOUTHBOUND chase: at the 60-tick staging mark the helicopter's orbit
  // (a function of game time) puts it southeast of the player — in front of
  // a south-facing chase camera, near the view centre. A northbound chase
  // leaves it behind the camera. The whole v11 chase geometry is mirrored
  // 180 degrees about the player's start (200, 140): cruisers + traffic
  // flip direction and lane, the camera azimuth mirrors sign.
  const car = game.spawnCar('sport', 200, 140, 0, 0xff2e4d);
  game.enterCar(car);
  car.speed = 22;
  car.vx = Math.sin(car.heading) * 22;
  car.vz = Math.cos(car.heading) * 22;
  // Mission 5 (LAST BRIDGE) gives the stage tracker + the escape context;
  // wanted is pinned to 3 so the helicopter deploys and dispatch lists
  // 3 units + AIR-1.
  game.startMission(4);
  game.setHour(17.0); // golden hour: sky #ff9a3d/#ffb347, nightLevel 0 — bright + warm
  game.setWanted(3);
  // Scripted cruisers hold a fixed offset ahead of the player, so the chase
  // camera always has a cruiser in frame. Travel direction is south (0,+1);
  // lane +5.5 is the player's lane, -5.5 the oncoming lane. Both cruisers
  // sit close (26/36) and the second one is angled 0.55 rad off south so
  // its NDPD door faces the camera — head-on it only showed its front.
  const lead = game.spawnPolice(200, 195, 0);
  lead.script = { dirX: 0, dirZ: 1, ahead: 26, lane: 5.5 }; // same lane, close ahead — livery + light bar readable
  const headOn = game.spawnPolice(200, 220, Math.PI + 0.55);
  headOn.script = { dirX: 0, dirZ: 1, ahead: 36, lane: -5.5 }; // oncoming lane, angled so the door reads
  // Traffic ahead on the same avenue, so the road ahead reads busy: an
  // oncoming sedan in the right lane, a tall pickup further up the left
  // lane, and an SUV closing in on the right (each lane keeps its own
  // depth line, nothing hides a cruiser).
  game.spawnTraffic('sedan', 'z', 200, 220, -1, 11); // northbound, ends ~21 ahead on the right
  game.spawnTraffic('pickup', 'z', 200, 220, 1, 10); // southbound, ends ~60 ahead on the left
  game.spawnTraffic('suv', 'z', 200, 250, -1, 12); // northbound SUV, closes in on the right
  game.setMoney(8450);
  game.setDay(3);
  // 3/4 rear-side angle, mirrored (proven v11-fix framing): the chase cam
  // cannot hold an angle on its own in headless, so the staging-only
  // camHold pins it.
  game.setCamHold(0.539, 0.08);
  // Staged dialogue lasts 10 minutes of REAL time: setDialog's timer is
  // real-time, and the headless wait for 60 ticks takes ~70 real seconds,
  // so a 6-second dialog would be gone before the screenshot.
  game.hud.setDialog('Dusk run. The heli is on us — stay in the golden lanes.', 600000);
  // The shoot script holds KeyW during the settle so the speed reads > 0.
}

function stageShop(game) {
  game.setState('playing');
  game.setHour(13.5); // bright day: the shop overlay and prices read crisp
  // Stand at the DELTA ARMS door (90, 112), facing it from the sidewalk.
  // v14: yaw 2.94 (not PI) — at PI the "VINYL & CO" sign's east end was
  // cut at the left frame edge ("CO"); rotating 0.2 rad right shifts the
  // row right so TIDE BOOKS is fully in frame and no sign text is cut at
  // the edge (VINYL & CO itself leaves the frame to the left).
  game.teleport(90, 132, 2.94);
  game.setWanted(0);
  // Exactly the sum of all three shop prices (900 + 1800 + 2500) — the
  // overlay proves every gun is affordable from real earned money.
  game.setMoney(5200);
  game.setRp(555); // RANK B · NIGHTHAWK, 555 / 1000 RP — M1–M6 complete
  game.setDay(7);
  // v13: pitch back to 0.16 — the shop panel now hugs the top of the
  // screen (CSS, below), so Mara reads fully beneath it without a steep
  // tilt; the shophouse row + towers keep their natural framing.
  // v14: yaw 2.94 matches the teleport heading (see above); the shop
  // panel is right-docked in CSS now, so Mara stands clear of it.
  game.setCamera(2.94, 0.16);
  game.openShop();
  // The overlay shows: 3 owned guns with live ammo, 3 locked guns with
  // real prices + BUY buttons, and the real cash balance in the header.
}

function stageNightPier(game) {
  game.setState('playing');
  game.setHour(21.5); // full night on the pier: neon + string lights + crowd
  // Close on the deck between the stall rows, looking west-northwest: the
  // north-row signs read at an oblique angle, wheel in frame left.
  game.teleport(-716, 296, -2.09);
  game.setWanted(0);
  game.setMoney(4800);
  game.setRp(320); // RANK B · NIGHTHAWK, 320 / 600 RP
  game.setDay(9);
  game.setCamera(-2.09, 0.20);
  // M7 THE NIGHT LEDGER (startHour 21.5 keeps the clock at night): the
  // tracker reads MISSION 7, TAHAP 1/3, MEET INEZ AT THE PIER.
  game.startMission(6);
  // Staged dialogue lasts 10 minutes of REAL time (see stageNightChase).
  game.hud.setDialog('The pier never sleeps. Two pages, and nobody sees me take them.', 600000,
    { name: 'INEZ VARGAS', img: game.portrait('INEZ VARGAS') });
}

function stageM8Tracker(game) {
  game.setState('playing');
  // v14 re-stage: DUSK in the port (hour 18.0), not deep night. The v13
  // full-night shot was a dark yard with a small crane load and a wide
  // empty foreground. At 18.0 the sky is dusk band 2 (orange horizon,
  // nightLevel 0.33), the enlarged crane load reads bright orange against
  // it, and the new foreground props (container stack, lamp, barrels,
  // pallets) fill the yard. Close to M8's own startHour 18.5, so the
  // staging stays honest to the mission.
  // Mission 8 (THE LAST SIGNAL), stage 2/3: the player starts ON the first
  // pickup point (520, 560), so it registers during the settle frames and
  // the tracker reads "1/4" with a real progress bar + NEXT step.
  game.teleport(520, 560, Math.PI / 4);
  game.setMoney(9200);
  game.setRp(675); // RANK A · OUTLAW, 675 / 1000 RP — M1–M7 complete
  game.setDay(12);
  game.startMission(7); // startHour 18.5, startWanted 2 — dispatch shows 2 units
  game.setHour(18.0); // dusk override AFTER startMission pinned 18.5
  // East-southeast into the yard, yaw 0.96 centres the (640,660) crane
  // load and puts the big near (520,620) load clear of the dialog at the
  // right edge: trailer (628,550) + container row (660,560) frame the
  // left, foreground props (575,605) sit on the crane sightline.
  // v15: pitch 0.12 (was 0.20) — a CDP pitch/yaw sweep proved 0.20 cuts the
  // (520,620) crane load off at the frame top, while 0.12 brings the whole
  // load into frame at the top-right with the (640,660) crane still centred.
  // Yaw 0.86 was rejected: it drags the (520,620) crane leg into the right
  // edge. Pitch 0.06 was rejected: the load sits too low and the crane leg
  // dominates the right edge. Port ground stays in frame at 0.12.
  game.setCamera(0.96, 0.12);
  // Staged dialogue lasts 10 minutes of REAL time (see stageNightChase).
  game.hud.setDialog('The drive is in my hand. Two dead drops, then the whole city hears it.', 600000,
    { name: 'ORIN BECK', img: game.portrait('ORIN BECK') });
}

export function applyShot(game, n) {
  if (n === 1) stageDuskChase(game);
  else if (n === 2) stageShop(game);
  else if (n === 3) stageNightPier(game);
  else if (n === 4) stageM8Tracker(game);
  return true;
}
