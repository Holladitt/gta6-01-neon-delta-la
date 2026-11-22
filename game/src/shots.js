// The four submit shots. Each one pins the mission, the hour, the wanted
// level, the money, and where Mara (and her car) stand, so the frame the
// shoot captures is the frame the brief describes.

export function stageForShot(shot) {
  const n = parseInt(shot, 10);
  if (n === 1) {
    return {
      shot: 1,
      mission: 4,
      stage: 0,
      hour: 17.0,
      money: 8450,
      wanted: 3,
      inCar: true,
      car: { x: 320, z: -280, heading: 0 },
      player: { x: 320, z: -280, heading: 0 },
      camera: null,
      shopOpen: false,
    };
  }
  if (n === 2) {
    return {
      shot: 2,
      mission: null,
      stage: 0,
      hour: 12.0,
      money: 5200,
      wanted: 0,
      inCar: false,
      car: { x: 140, z: 158, heading: 0 },
      player: { x: 140, z: 150, heading: 0 },
      camera: { pos: [140, 12, 118], target: [140, 3, 185] },
      shopOpen: true,
    };
  }
  if (n === 3) {
    return {
      shot: 3,
      mission: 6,
      stage: 0,
      hour: 21.5,
      money: 5200,
      wanted: 0,
      inCar: false,
      car: { x: 500, z: 430, heading: Math.PI },
      player: { x: 615, z: 430, heading: Math.PI },
      camera: { pos: [615, 10, 448], target: [615, 2, 405] },
      shopOpen: false,
    };
  }
  if (n === 4) {
    return {
      shot: 4,
      mission: 7,
      stage: 1,
      hour: 18.0,
      money: 8450,
      wanted: 2,
      inCar: true,
      car: { x: 600, z: 300, heading: Math.PI * 0.75 },
      player: { x: 600, z: 300, heading: Math.PI * 0.75 },
      camera: { pos: [590, 10, 330], target: [650, 12, 240] },
      shopOpen: false,
    };
  }
  return null;
}
