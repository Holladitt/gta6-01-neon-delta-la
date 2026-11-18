// Screenshot staging: ?shot=1..4 presets the game state for a render.
// 1 = police chase, 2 = car steal, 3 = Coral Pier at golden hour, 4 = title.
export function applyShot(game, n) {
  if (n === 1) {
    game.setState('playing');
    game.setHour(13.5);
    const car = game.spawnCar('sport', 200, 140, Math.PI, 0xff2e4d);
    game.enterCar(car);
    car.speed = 22; car.vx = Math.sin(car.heading) * 22; car.vz = Math.cos(car.heading) * 22;
    game.setWanted(2); // Midtown cruisers with flashing light bars close ahead
    game.spawnPolice(200, 96, 0); // dead ahead in the same lane, head-on to the camera
    game.spawnPolice(176, 108, 0); // second cruiser in the oncoming lane
    game.setMoney(1250);
    game.setCamera(Math.PI, 0.32);
    game.hud.setDialog('MARA: Midtown cruisers on my tail. Lose them!', 6000);
    game.hud.setMission('MISSION 5 — LAST BRIDGE: Escape the police, then cross the bridge.');
  } else if (n === 2) {
    game.setState('playing');
    game.setHour(13.5);
    game.teleport(606, 556, -Math.PI / 4);
    game.setWanted(1);
    game.setMoney(250);
    game.setCamera(-Math.PI / 4, 0.35);
    game.hud.setDialog('MARA: That teal sedan. First wheels of the day.', 6000);
    game.hud.setMission('MISSION 1 — RETURN TO LA: Steal a sedan.');
    game.hud.setPrompt('F — STEAL SEDAN');
  } else if (n === 3) {
    game.setState('playing');
    game.setHour(17.4);
    game.teleport(-735, 300, -Math.PI / 2); // stall rows at the frame edges, wheel ahead
    game.setWanted(0);
    game.setMoney(4800);
    game.setCamera(-Math.PI / 2, 0.3);
    game.startMission(2);
    game.hud.setDialog('MARA: Festival of Lights. The pier is lit up like a birthday cake.', 6000);
  } else if (n === 4) {
    game.setState('title');
    game.setHour(17.4);
    game.setCamera(0, 0.5);
  }
  return true;
}
