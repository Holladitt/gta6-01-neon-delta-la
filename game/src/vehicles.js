// Arcade vehicle physics, one shared implementation, parameters per type.
// Each step splits velocity into a forward part and a lateral part: throttle
// drives the forward part, tyre grip damps the lateral part, so cutting grip
// with the handbrake lets the tail slide into a drift instead of snapping.
// Sedan is balanced, SUV heavy and planted, the bike quick and loose, the
// truck slow and wide, the boat slides on water.
import { VEHICLES } from './config.js';

// A vehicle record. `kind` names its VEHICLES entry; `x,y,angle` are its
// pose in sim units; `vx,vy` its world velocity; `speed` its signed forward
// speed. Extra fields (driver, path, role, ...) are filled in by the world.
export function makeVehicle(kind, x, y, angle, color) {
  const def = VEHICLES[kind] || VEHICLES.sedan;
  return {
    kind, def, x, y, angle, vx: 0, vy: 0, speed: 0,
    color: color || def.color, roof: def.roof, damaged: 0, smoke: 0,
    driver: null, // 'player' | 'traffic' | 'police' | null (parked)
    path: [], pathIndex: 0, repath: 0, role: 'chase', stuck: 0,
    reverseT: 0, bustHold: 0, sight: 0, cruise: 0, turnAt: 0, everDriven: false,
  };
}

// Drive one fixed step. `throttle` -1..1, `steer` -1..1, `handbrake` boolean.
// Returns the forward speed, for the HUD and the engine sound.
export function stepVehicle(v, throttle, steer, handbrake, dt) {
  const d = v.def;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const forward = v.vx * fx + v.vy * fy;
  let lateral = -v.vx * fy + v.vy * fx;
  const grip = handbrake ? d.grip * 0.22 : d.grip;
  lateral *= Math.exp(-grip * dt);
  let next = forward + throttle * d.accel * dt;
  if (throttle === 0) next *= Math.exp(-0.9 * dt); // rolling drag
  if (handbrake && Math.abs(forward) > 40) next *= Math.exp(-0.7 * dt);
  next = Math.max(-d.maxSpeed * 0.45, Math.min(d.maxSpeed, next));
  // Steering bites harder with speed, but never at a standstill.
  const authority = Math.min(1, Math.abs(next) / 120);
  v.angle += steer * d.turn * authority * dt * (next >= 0 ? 1 : -1);
  const nx = Math.cos(v.angle), ny = Math.sin(v.angle);
  v.vx = nx * next - ny * lateral;
  v.vy = ny * next + nx * lateral;
  v.x += v.vx * dt;
  v.y += v.vy * dt;
  v.speed = next;
  return next;
}

// Steering toward a target point: returns -1..1, with a little look-ahead.
export function steerToward(v, tx, ty) {
  const want = Math.atan2(ty - v.y, tx - v.x);
  let diff = want - v.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.max(-1, Math.min(1, diff * 2.2));
}

export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
