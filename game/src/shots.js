// Shot staging grids: open ground for the crowd, clear of buildings
// and water. Pure.
import { inBuilding, inOcean } from './geo.js';
export function shot4YardSpots() {
  const spots = [];
  for (let x = 360; x <= 660; x += 8) {
    for (let z = 500; z <= 640; z += 8) {
      if (!inBuilding(x, z) && !inOcean(x, z)) spots.push({ x, z });
    }
  }
  return spots;
}
export function shot2ForecourtSpots() {
  const spots = [];
  for (let x = -380; x <= -260; x += 6) {
    for (let z = -230; z <= -140; z += 6) {
      if (!inBuilding(x, z) && !inOcean(x, z)) spots.push({ x, z });
    }
  }
  return spots;
}
