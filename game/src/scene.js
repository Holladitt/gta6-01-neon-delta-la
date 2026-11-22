// 3D scene builders: ground, buildings, cars, Mara, heli, boat, crane, pier.
// All meshes use Lambert materials, no shadows, no antialiasing (SwiftShader-safe).
import * as THREE from 'three';
import { BUILDINGS, SHOP, CRANE, BOAT, PIER_DECK, GARAGE_POS, DISTRICTS, districtAt } from './config.js';
import { shotDef, shot4YardSpots, shot2ForecourtSpots } from './shots.js';
import { phaseFor } from './lights.js';
import { AVENUES, STREETS } from './geo.js';
import { MARA } from './characters.js';
import { makeRng } from './rng.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function textTex(text, opts = {}) {
  const { w = 512, h = 128, bg = '#111111', fg = '#ffd76a', font = 'bold 64px Arial', sub } = opts;
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, sub ? h / 2 - 18 : h / 2);
    if (sub) { g.font = 'bold 34px Arial'; g.fillStyle = '#ffffff'; g.fillText(sub, w / 2, h / 2 + 34); }
  });
}
function stripeTex() {
  return canvasTex(256, 64, (g, W, H) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e74c3c' : '#ffffff'; g.fillRect(i * 32, 0, 32, H); }
  });
}

// Ground: one 2048 canvas texture mapping world [-780,780] to the plane.
// Canvas px maps to world x, py maps to world z (plane rotated -PI/2 about X).
function groundTexture() {
  return canvasTex(2048, 2048, (g, W, H) => {
    const px = (x) => (x + 780) / 1560 * W;
    const py = (z) => (z + 780) / 1560 * H;
    g.fillStyle = '#8f8266'; g.fillRect(0, 0, W, H);
    const rng = makeRng(42);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
      g.fillRect(rng() * W, rng() * H, 8 + rng() * 30, 8 + rng() * 30);
    }
    // ocean: west x<-620 and south z>637
    g.fillStyle = '#1c4a6e';
    g.fillRect(0, 0, px(-620), H);
    g.fillRect(0, py(637), W, H - py(637));
    g.fillStyle = '#2a6a9a';
    g.fillRect(px(-620), 0, 6, H);
    g.fillRect(0, py(637), W, 6);
    // grass: venice forecourt + downtown park
    g.fillStyle = '#5a8a4a';
    g.fillRect(px(-460), py(-260), px(-280) - px(-460), py(-140) - py(-260));
    g.fillRect(px(-260), py(-260), px(-60) - px(-260), py(-60) - py(-260));
    // port apron
    g.fillStyle = '#a08a68';
    g.fillRect(px(380), py(480), px(780) - px(380), py(637) - py(480));
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    for (let x = 400; x < 780; x += 40) { g.beginPath(); g.moveTo(px(x), py(480)); g.lineTo(px(x), py(637)); g.stroke(); }
    // pier deck planks
    g.fillStyle = '#8a6a42';
    g.fillRect(px(-780), py(360), px(-620) - px(-780), py(500) - py(360));
    g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = 2;
    for (let z = 360; z <= 500; z += 6) { g.beginPath(); g.moveTo(px(-780), py(z)); g.lineTo(px(-620), py(z)); g.stroke(); }
    g.fillStyle = '#c0392b';
    g.fillRect(px(-780), py(360), px(-620) - px(-780), 5);
    // roads: avenues + streets
    for (const a of AVENUES) { g.fillStyle = '#333338'; g.fillRect(px(a - 7), 0, px(a + 7) - px(a - 7), H); }
    for (const s of STREETS) { g.fillStyle = '#333338'; g.fillRect(0, py(s - 7), W, py(s + 7) - py(s - 7)); }
    g.fillStyle = '#f1c40f';
    for (const a of AVENUES) for (let z = -780; z < 780; z += 16) g.fillRect(px(a) - 1.5, py(z), 3, 8);
    for (const s of STREETS) for (let x = -780; x < 780; x += 16) g.fillRect(px(x), py(s) - 1.5, 8, 3);
    // chase road (shot 1): x -330..-310, z -500..-100
    g.fillStyle = '#2e2e33';
    g.fillRect(px(-330), py(-500), px(-310) - px(-330), py(-100) - py(-500));
    g.fillStyle = '#f1c40f';
    for (let z = -500; z < -100; z += 16) g.fillRect(px(-320) - 1.5, py(z), 3, 8);
    g.fillStyle = '#e8e8e8';
    g.fillRect(px(-328), py(-500), 2, py(-100) - py(-500));
    g.fillRect(px(-312), py(-500), 2, py(-100) - py(-500));
    // port road (shot 4): x 630..638, z 582..634
    g.fillStyle = '#2e2e33';
    g.fillRect(px(630), py(582), px(638) - px(630), py(634) - py(582));
    g.fillStyle = '#f1c40f';
    for (let z = 582; z < 634; z += 16) g.fillRect(px(634) - 1.5, py(z), 3, 8);
  });
}
function facadeTextures(base) {
  const win = (g, lit) => {
    for (let r = 0; r < 14; r++) for (let c = 0; c < 7; c++) {
      const isLit = ((r * 7 + c) % 5) === 0;
      if (lit && !isLit) continue;
      g.fillStyle = lit ? '#ffd76a' : (isLit ? '#ffd76a' : '#2a3a4a');
      g.fillRect(12 + c * 34, 10 + r * 17, 22, 11);
    }
  };
  const map = canvasTex(256, 256, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H); win(g, false); });
  const emi = canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#000000'; g.fillRect(0, 0, W, H); win(g, true); });
  return { map, emi };
}
function skyTexture(phase) {
  const stops = {
    day: [[0, '#2a6ab0'], [0.55, '#7ab0e0'], [1, '#cfe8f5']],
    dusk: [[0, '#3a1a4a'], [0.45, '#a03030'], [0.75, '#e86030'], [1, '#ffb060']],
    night: [[0, '#12082a'], [0.5, '#2a1a4a'], [1, '#4a2a5a']],
  }[phase];
  return canvasTex(16, 512, (g, W, H) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    for (const [t, c] of stops) grad.addColorStop(t, c);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
  });
}

// Car: front at -z (v30 convention — rotation 1.25 rad = true 45° 3/4 rear+left).
// Sync to world driving with rotation.y = car.angle + PI.
export function makeCar(bodyColor, roofColor, opts = {}) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.6), bodyMat);
  body.position.y = 0.55; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 2.2), roofMat);
  cabin.position.set(0, 1.2, 0.3); g.add(cabin);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.1), new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
  shield.position.set(0, 1.15, -0.85); g.add(shield);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(x, 0.45, z); g.add(w);
  }
  const sp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.5), bodyMat);
  sp.position.set(0, 1.05, 2.1); g.add(sp);
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), hl);
    h.position.set(x, 0.6, -2.32); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    t.position.set(x, 0.6, 2.32); g.add(t);
  }
  if (opts.police) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.5, 1.6), new THREE.MeshLambertMaterial({ color: 0xecf0f1 }));
    door.position.set(0, 0.55, 0.2); g.add(door);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.3), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(0, 1.6, 0.3); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.32), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar2.position.set(0.45, 1.6, 0.3); g.add(bar2);
  }
  return g;
}
export function makeVan() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 4.2), mat);
  box.position.y = 1.3; g.add(box);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.2), mat);
  cab.position.set(0, 0.9, -2.4); g.add(cab);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.1), new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
  shield.position.set(0, 1.0, -3.0); g.add(shield);
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const dark = new THREE.MeshLambertMaterial({ color: 0x000000 });
  for (const [x, z] of [[-1.1, 1.6], [1.1, 1.6], [-1.1, -1.6], [1.1, -1.6]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.5, z); g.add(w);
  }
  return g;
}
// Mara: faces +z at rotation 0 (backpack on her back at -z).
export function makeMara(scale) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: MARA.skin });
  const jacket = new THREE.MeshLambertMaterial({ color: MARA.jacket });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const pack = new THREE.MeshLambertMaterial({ color: MARA.backpack });
  for (const x of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.28), dark);
    leg.position.set(x, 0.45, 0); g.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.45), jacket);
  torso.position.set(0, 1.35, 0); g.add(torso);
  for (const x of [-0.55, 0.55]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), jacket);
    arm.position.set(x, 1.35, 0); g.add(arm);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.45), skin);
  head.position.set(0, 2.05, 0); g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: MARA.hair }));
  hair.position.set(0, 2.3, -0.02); g.add(hair);
  const bp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.25), pack);
  bp.position.set(0, 1.4, -0.35); g.add(bp);
  g.scale.setScalar(scale);
  return g;
}
export function makeHeli() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 5.0), bodyMat);
  g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 4.0), bodyMat);
  tail.position.set(0, 0.3, 3.8); g.add(tail);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 1.2), new THREE.MeshLambertMaterial({ color: 0x9fd8e8 }));
  glass.position.set(0, 0.3, -2.0); g.add(glass);
  const rotor = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  rotor.add(blade);
  const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; rotor.add(blade2);
  rotor.position.y = 1.1; g.add(rotor);
  g.userData.rotor = rotor;
  for (const x of [-1.2, 1.2]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 4.5), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    skid.position.set(x, -1.0, 0); g.add(skid);
  }
  return g;
}
// Slim spotlight beam: narrow at the heli, widening onto the car.
export function makeBeam() {
  const g = new THREE.Group();
  const coneGeo = new THREE.CylinderGeometry(0.4, 3, 1, 12, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  g.add(cone);
  g.userData.cone = cone;
  return g;
}
// Sailboat: leaf hull (pointed bow + stern), teal cabin, wooden mast, white sail, wake.
export function makeBoat() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-4.5, 0);
  shape.quadraticCurveTo(-2.5, 1.6, 0, 1.6);
  shape.quadraticCurveTo(2.5, 1.6, 4.5, 0);
  shape.quadraticCurveTo(2.5, -1.6, 0, -1.6);
  shape.quadraticCurveTo(-2.5, -1.6, -4.5, 0);
  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2 });
  hullGeo.rotateX(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshLambertMaterial({ color: 0xffd76a }));
  g.add(hull);
  // pointed bow + stern caps so the taper reads in profile, not just in plan
  const capMat = new THREE.MeshLambertMaterial({ color: 0xffd76a });
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.5, 8), capMat);
    cap.rotation.z = -s * Math.PI / 2;
    cap.position.set(s * 5.4, 0.7, 0);
    g.add(cap);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 2.2), new THREE.MeshLambertMaterial({ color: 0x1abc9c }));
  cabin.position.set(0, 1.4, 0.5); g.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 7, 8), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
  mast.position.set(0, 4.5, 0); g.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(0, 6.5); sailShape.lineTo(3.2, 0.6); sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  sail.position.set(0, 1.6, 0); g.add(sail);
  const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 5), wakeMat);
    arm.position.set(s * 1.8, 0.1, 4.5);
    arm.rotation.y = s * 0.35;
    g.add(arm);
  }
  return g;
}
export function makeCrane() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x8a4a12 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 42, 6), mat);
  tower.position.y = 21; g.add(tower);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(34, 2.5, 2.5), mat);
  jib.position.set(-10, 40, 0); g.add(jib);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 3), dark);
  counter.position.set(10, 40, 0); g.add(counter);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 14, 6), dark);
  cable.position.set(-24, 33, 0); g.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 3), new THREE.MeshLambertMaterial({ color: 0x2e6fb0 }));
  load.position.set(-24, 25, 0); g.add(load);
  return g;
}
export function makeBridge() {
  const g = new THREE.Group();
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x7a7a88 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(560, 5, 18), deckMat);
  deck.position.y = 20; g.add(deck);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(560, 0.6, 0.8), new THREE.MeshBasicMaterial({ color: 0xffd76a }));
  strip.position.set(0, 23, 9); g.add(strip);
  const pilMat = new THREE.MeshLambertMaterial({ color: 0x5a5a68 });
  for (let x = -250; x <= 250; x += 125) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 6), pilMat);
    p.position.set(x, 10, 0); g.add(p);
  }
  for (let x = -270; x <= 270; x += 20) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), pilMat);
    post.position.set(x, 23.5, -8); g.add(post);
  }
  return g;
}
export function makeWheel(radius) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.8, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff6a5a }));
  g.add(rim);
  const spokeMat = new THREE.MeshLambertMaterial({ color: 0xecf0f1 });
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.5, radius * 2, 0.5), spokeMat);
    sp.rotation.z = (i / 8) * Math.PI;
    g.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd76a }));
  g.add(hub);
  const cabColors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xe67e22];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), new THREE.MeshLambertMaterial({ color: cabColors[i % 6] }));
    cab.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    g.add(cab);
  }
  const legMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1, radius, 1), legMat);
    leg.position.set(s * radius * 0.5, -radius / 2, 0);
    leg.rotation.z = s * 0.5;
    g.add(leg);
  }
  return g;
}
export function makeStall(label, color) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), new THREE.MeshLambertMaterial({ color }));
  base.position.y = 1.5; g.add(base);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 4.5), new THREE.MeshLambertMaterial({ color: 0xecf0f1 }));
  roof.position.y = 3.2; g.add(roof);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.1), new THREE.MeshBasicMaterial({ map: textTex(label, { w: 512, h: 128, bg: '#111111', fg: '#ffffff', font: 'bold 56px Arial' }) }));
  sign.position.set(0, 2.6, 2.05); g.add(sign);
  return g;
}
export function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 8, 8), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
  trunk.position.y = 4; trunk.rotation.z = 0.15; g.add(trunk);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 6), frondMat);
    const a = (i / 6) * Math.PI * 2;
    f.position.set(Math.cos(a) * 1.2, 8.2, Math.sin(a) * 1.2);
    f.rotation.z = Math.cos(a) * 0.9;
    f.rotation.x = -Math.sin(a) * 0.9;
    g.add(f);
  }
  return g;
}
export function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.5, 6), new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
  trunk.position.y = 1.25; g.add(trunk);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), new THREE.MeshLambertMaterial({ color: 0x2ecc71 }));
  canopy.position.y = 3.6; g.add(canopy);
  return g;
}
export function makePed(shirtColor) {
  const g = new THREE.Group();
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  leg.position.y = 0.4; g.add(leg);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), new THREE.MeshLambertMaterial({ color: shirtColor }));
  body.position.y = 1.2; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
  head.position.y = 1.85; g.add(head);
  return g;
}
export function makeCone() {
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0xe67e22 }));
  c.position.y = 0.45;
  return c;
}
export function makeBarrier() {
  const g = new THREE.Group();
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.15), new THREE.MeshBasicMaterial({ map: stripeTex() }));
  stripe.position.y = 1.0; g.add(stripe);
  for (const x of [-2.5, 2.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.6), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    leg.position.set(x, 0.5, 0); g.add(leg);
  }
  return g;
}
export function makeBench() {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0xd9b380 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 1), wood);
  seat.position.y = 0.6; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.2), wood);
  back.position.set(0, 1.1, -0.45); g.add(back);
  for (const x of [-1.3, 1.3]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.9), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    leg.position.set(x, 0.3, 0); g.add(leg);
  }
  return g;
}
export function makeCrate(size, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshLambertMaterial({ color }));
}
export function makeBarrel() {
  return new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 10), new THREE.MeshLambertMaterial({ color: 0x7a4a2a }));
}
export function makeConfetti(x, z, count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const rng = makeRng(99);
  const colors = [0xff6a9a, 0x2ec8e8, 0xf1c40f, 0xffffff, 0x2ecc71, 0xe67e22];
  for (let i = 0; i < count; i++) {
    pos[i * 3] = x + (rng() - 0.5) * 60;
    pos[i * 3 + 1] = 2 + rng() * 25;
    pos[i * 3 + 2] = z + (rng() - 0.5) * 60;
    const c = new THREE.Color(colors[i % colors.length]);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.9 });
  return new THREE.Points(geo, mat);
}
export function makeLightPool(r, color) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.06;
  return m;
}
export function makeCloud() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe8d0, transparent: true, opacity: 0.85 });
  const parts = [[0, 0, 0, 1], [6, 0.5, 0, 0.7], [-6, 0.3, 1, 0.8], [2, 1, -1, 0.6]];
  for (const [x, y, z, s] of parts) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), mat);
    puff.position.set(x, y, z);
    puff.scale.set(s, 0.35, 0.7);
    g.add(puff);
  }
  return g;
}

// ---------- game assembly ----------
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export function createGame(canvas, world) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(1280, 720, false);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.1, 3000);
  camera.position.set(0, 6, 12);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(300, 400, 100);
  scene.add(sun);

  // ground + ocean to the horizon
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1560, 1560), new THREE.MeshLambertMaterial({ map: groundTexture() }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshBasicMaterial({ color: 0x1c4a6e }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -0.5;
  scene.add(ocean);

  // buildings with lit-window facades
  const facades = [facadeTextures('#8a7a6a'), facadeTextures('#5a6a7a'), facadeTextures('#7a4a3a')];
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i];
    const w = b.x1 - b.x0, d = b.z1 - b.z0;
    const f = facades[i % 3];
    const map = f.map.clone(); map.needsUpdate = true;
    map.repeat.set(Math.max(1, Math.round(w / 28)), Math.max(1, Math.round(b.h / 28)));
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const emi = f.emi.clone(); emi.needsUpdate = true;
    emi.repeat.copy(map.repeat);
    emi.wrapS = emi.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshLambertMaterial({ map, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, b.h, d), mat);
    mesh.position.set((b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2);
    scene.add(mesh);
  }

  // DELTA ARMS shop: low block + sign + face-mounted billboard above the roof
  const shop = new THREE.Group();
  const shopBase = new THREE.Mesh(new THREE.BoxGeometry(44, 14, 30), new THREE.MeshLambertMaterial({ color: 0x5a5a6e }));
  shopBase.position.y = 7; shop.add(shopBase);
  const shopFront = new THREE.Mesh(new THREE.BoxGeometry(44, 10, 1), new THREE.MeshLambertMaterial({ color: 0x4a4a5e }));
  shopFront.position.set(0, 5, 15.5); shop.add(shopFront);
  const shopSign = new THREE.Mesh(new THREE.PlaneGeometry(30, 4), new THREE.MeshBasicMaterial({ map: textTex('DELTA ARMS', { w: 1024, h: 128, bg: '#111111', fg: '#ffd76a', font: 'bold 72px Arial' }) }));
  shopSign.position.set(0, 8, 16.1); shop.add(shopSign);
  const bill = new THREE.Mesh(new THREE.PlaneGeometry(32, 10), new THREE.MeshBasicMaterial({ map: textTex('NEON DELTA LA', { w: 1024, h: 320, bg: '#c0392b', fg: '#ffffff', font: 'bold 96px Arial', sub: 'DISTRICT WARS' }) }));
  bill.position.set(0, 15, 16.1); shop.add(bill);
  shop.position.set(SHOP.x, 0, SHOP.z);
  scene.add(shop);

  // garage structure behind the shot-1 car, GARAGE sign facing the camera
  const garage = new THREE.Group();
  const gBase = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 14), new THREE.MeshLambertMaterial({ color: 0x4a4a58 }));
  gBase.position.y = 4; garage.add(gBase);
  const gSign = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.5), new THREE.MeshBasicMaterial({ map: textTex('GARAGE', { w: 512, h: 128, bg: '#222222', fg: '#f1c40f', font: 'bold 72px Arial' }) }));
  gSign.position.set(0, 6, 7.1); garage.add(gSign);
  garage.position.set(-360, 0, -340);
  scene.add(garage);

  // crisp foreground roads (dark asphalt planes + 3D dashes over the texture)
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e2e33 });
  const chaseRoad = new THREE.Mesh(new THREE.PlaneGeometry(20, 400), roadMat);
  chaseRoad.rotation.x = -Math.PI / 2; chaseRoad.position.set(-320, 0.05, -300);
  scene.add(chaseRoad);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
  for (let z = -480; z < -120; z += 16) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 5), dashMat);
    d.position.set(-320, 0.08, z); scene.add(d);
  }
  for (const x of [-329, -311]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 400), new THREE.MeshBasicMaterial({ color: 0xe8e8e8 }));
    edge.position.set(x, 0.08, -300); scene.add(edge);
  }
  const portRoad = new THREE.Mesh(new THREE.PlaneGeometry(8, 52), roadMat);
  portRoad.rotation.x = -Math.PI / 2; portRoad.position.set(633.9, 0.05, 608.4);
  scene.add(portRoad);
  for (const z of [592, 608, 624]) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 5), dashMat);
    d.position.set(633.9, 0.08, z); scene.add(d);
  }

  // staged hero objects
  const heroCar = makeCar(0xc0392b, 0x1abc9c);
  scene.add(heroCar);
  const mara = makeMara(1.8);
  scene.add(mara);
  const heli = makeHeli();
  scene.add(heli);
  const beam = makeBeam();
  scene.add(beam);
  const beamPool = new THREE.Mesh(new THREE.CircleGeometry(3.5, 20), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, depthWrite: false }));
  beamPool.rotation.x = -Math.PI / 2;
  beamPool.position.y = 0.06;
  scene.add(beamPool);
  const boat = makeBoat();
  scene.add(boat);
  const crane = makeCrane();
  crane.position.set(CRANE.x, 0, CRANE.z);
  scene.add(crane);
  const bridge = makeBridge();
  bridge.position.set(300, 0, 520);
  scene.add(bridge);
  const roadblock = new THREE.Group();
  roadblock.add(makeBarrier());
  const rbP1 = makeCar(0x1a2a3a, 0xecf0f1, { police: true });
  rbP1.position.set(-6, 0, 2); rbP1.rotation.y = 0.3; roadblock.add(rbP1);
  const rbP2 = makeCar(0x1a2a3a, 0xecf0f1, { police: true });
  rbP2.position.set(6, 0, 2); rbP2.rotation.y = -0.3; roadblock.add(rbP2);
  scene.add(roadblock);
  const swat = makeVan();
  scene.add(swat);
  const policeCar = makeCar(0x1a2a3a, 0xecf0f1, { police: true });
  scene.add(policeCar);
  const parkedCar = makeCar(0xf1c40f, 0x2c3e50);
  scene.add(parkedCar);
  const wheel = makeWheel(20);
  wheel.position.set(-705, 20, 428);
  wheel.rotation.y = Math.PI / 2;
  scene.add(wheel);
  const stalls = [];
  for (const s of [{ label: 'BALLOONS', x: -690, z: 410, color: 0xe74c3c }, { label: 'SNO-CONES', x: -690, z: 445, color: 0xf1c40f }, { label: 'ARCADE', x: -715, z: 410, color: 0x1abc9c }]) {
    const st = makeStall(s.label, s.color);
    st.position.set(s.x, 0, s.z);
    st.rotation.y = Math.PI / 2;
    scene.add(st);
    stalls.push(st);
  }
  const palm = makePalm();
  palm.position.set(-700, 0, 395);
  scene.add(palm);
  const confetti = makeConfetti(-700, 430, 420);
  scene.add(confetti);
  const bench1 = makeBench(); bench1.position.set(-660, 0, 415); bench1.rotation.y = Math.PI / 2; scene.add(bench1);
  const bench2 = makeBench(); bench2.position.set(-660, 0, 440); bench2.rotation.y = Math.PI / 2; scene.add(bench2);
  const shopBench = makeBench(); shopBench.position.set(-390, 0, -190); scene.add(shopBench);
  const shopCrates = [];
  for (const [x, z] of [[-350, -190], [-345, -185]]) {
    const c = makeCrate(2.5, 0xc8a06a);
    c.position.set(x, 1.25, z);
    scene.add(c);
    shopCrates.push(c);
  }
  // port containers + apron dressing
  const containerColors = [0x2e6fb0, 0xe67e22, 0x27ae60, 0xc0392b, 0x8e44ad];
  const rng = makeRng(7);
  for (let i = 0; i < 14; i++) {
    const c = makeCrate(4 + rng() * 3, containerColors[i % containerColors.length]);
    c.position.set(420 + rng() * 260, 2 + rng() * 1, 500 + rng() * 110);
    c.rotation.y = rng() * 0.4;
    scene.add(c);
  }
  const greenContainer = makeCrate(8, 0x27ae60);
  greenContainer.scale.set(1, 0.5, 0.5);
  greenContainer.position.set(600, 2, 520);
  scene.add(greenContainer);
  const apronCrates = [];
  for (const [x, z] of [[608, 620], [600, 624], [598, 610], [628, 624], [620, 628]]) {
    const c = makeCrate(2.5, 0xb08954);
    c.position.set(x, 1.25, z);
    scene.add(c);
    apronCrates.push(c);
  }
  // trees along the chase road + shop
  const trees = [];
  for (const [x, z] of [[-345, -270], [-295, -270], [-345, -330], [-295, -330], [-400, -180], [-320, -160]]) {
    const t = makeTree();
    t.position.set(x, 0, z);
    scene.add(t);
    trees.push(t);
  }
  // traffic cones + barrier at the shot-1 frame edges
  const cones = [];
  for (const [x, z] of [[-340, -255], [-300, -255]]) {
    const c = makeCone();
    c.position.set(x, 0, z);
    scene.add(c);
    cones.push(c);
  }
  const edgeBarrier = makeBarrier();
  edgeBarrier.position.set(-336, 0, -282);
  scene.add(edgeBarrier);
  // warm light pools per shot
  const pools = {
    1: [makeLightPool(6, 0xffc060), makeLightPool(5, 0xffc060)],
    3: [makeLightPool(7, 0xffb050), makeLightPool(5, 0xffb050), makeLightPool(5, 0xffb050)],
    4: [makeLightPool(8, 0xffc060)],
  };
  pools[1][0].position.set(-320, 0.06, -270);
  pools[1][1].position.set(-320, 0.06, -320);
  pools[3][0].position.set(-660, 0.06, 428);
  pools[3][1].position.set(-650, 0.06, 420);
  pools[3][2].position.set(-650, 0.06, 435);
  pools[4][0].position.set(630, 0.06, 618);
  for (const k of Object.keys(pools)) for (const p of pools[k]) scene.add(p);
  // warm point lights
  const light1 = new THREE.PointLight(0xffb050, 0, 40);
  light1.position.set(-320, 4, -270); scene.add(light1);
  const light3 = new THREE.PointLight(0xffb050, 0, 50);
  light3.position.set(-660, 10, 428); scene.add(light3);
  const light4 = new THREE.PointLight(0xffb050, 0, 40);
  light4.position.set(630, 5, 620); scene.add(light4);
  // 28 warm glow discs at night
  const discs = [];
  const discMat = new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 28; i++) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(3, 16), discMat);
    d.rotation.x = -Math.PI / 2;
    const a = AVENUES[i % 5], s = STREETS[Math.floor(i / 5) % 5];
    d.position.set(a + (i % 2 ? 12 : -12), 0.07, s + (i % 3 ? 10 : -10));
    scene.add(d);
    discs.push(d);
  }
  // hero clouds (in-frame positions computed per shot)
  const clouds = [];
  for (let i = 0; i < 6; i++) { const c = makeCloud(); scene.add(c); clouds.push(c); }
  // ambient traffic + peds
  const trafficMeshes = [];
  for (let i = 0; i < 22; i++) {
    const m = makeCar([0xc0392b, 0x2980b9, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xbdc3c7, 0x2c3e50][i % 8], 0x2c3e50);
    scene.add(m);
    trafficMeshes.push(m);
  }
  const pedMeshes = [];
  for (let i = 0; i < 104; i++) {
    const m = makePed(world.traffic.peds[i].shirt);
    scene.add(m);
    pedMeshes.push(m);
  }
  // string lights over the pier deck
  const stringMat = new THREE.MeshBasicMaterial({ color: 0xffd76a });
  for (let i = 0; i < 24; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), stringMat);
    bulb.position.set(-780 + (i % 12) * 13, 7 + Math.sin(i * 0.8) * 1.2, 380 + Math.floor(i / 12) * 60);
    scene.add(bulb);
  }

  function setPhase(phase) {
    scene.background = skyTexture(phase);
    if (phase === 'day') {
      hemi.intensity = 1.0; sun.intensity = 1.0; sun.color.set(0xffffff);
      scene.fog = new THREE.Fog(0x9ab8d8, 200, 1400);
      discMat.opacity = 0;
    } else if (phase === 'dusk') {
      hemi.intensity = 0.9; sun.intensity = 0.9; sun.color.set(0xff8844);
      scene.fog = new THREE.Fog(0x8a4a3a, 180, 1300);
      discMat.opacity = 0.35;
    } else {
      hemi.intensity = 0.55; sun.intensity = 0.4; sun.color.set(0x4455aa);
      scene.fog = new THREE.Fog(0x2a1a3a, 150, 1200);
      discMat.opacity = 0.6;
    }
  }
  function placeClouds(def) {
    const cam = new THREE.Vector3(def.camera.x, def.camera.y, def.camera.z);
    const look = new THREE.Vector3(def.look.x, def.look.y, def.look.z);
    const fwd = look.clone().sub(cam).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const crng = makeRng(1000 + def.hour);
    clouds.forEach((c, i) => {
      const d = 220 + crng() * 220;
      const lat = (crng() - 0.5) * 320;
      const h = 55 + crng() * 70;
      c.position.copy(cam).addScaledVector(fwd, d).addScaledVector(right, lat);
      c.position.y = h;
      c.visible = true;
    });
  }
  function stagePeds(list) {
    for (let i = 0; i < pedMeshes.length; i++) {
      if (i < list.length) {
        pedMeshes[i].visible = true;
        pedMeshes[i].position.set(list[i][0], 0, list[i][1]);
        pedMeshes[i].rotation.y = list[i][2] || 0;
      } else pedMeshes[i].visible = false;
    }
  }
  function applyShot(n) {
    const def = shotDef(n);
    if (!def) return;
    world.frozen = true;
    world.hour = def.hour;
    world.state = 'MISSION';
    world.missions.current = def.mission;
    world.missions.objectiveIndex = 0;
    world.wanted.level = def.wanted;
    world.money = def.money;
    world.cover.value = def.cover;
    world.tapes.found = Array.from({ length: def.tapes }, (_, i) => i);
    for (const d of DISTRICTS) world.standing[d.id] = 0;
    Object.assign(world.standing, def.standing);
    camera.position.set(def.camera.x, def.camera.y, def.camera.z);
    camera.lookAt(def.look.x, def.look.y, def.look.z);
    setPhase(def.sky || phaseFor(def.hour));
    // HUD + minimap read the player's position: park them on the staged hero.
    if (def.mara) { world.player.x = def.mara.x; world.player.z = def.mara.z; }
    else if (def.car) { world.player.x = def.car.x; world.player.z = def.car.z; }
    if (def.car) { world.car.x = def.car.x; world.car.z = def.car.z; world.car.angle = def.car.rot; }
    world.district = districtAt(world.player.x, world.player.z).id;
    placeClouds(def);
    // hero car
    if (def.car) {
      heroCar.visible = true;
      heroCar.position.set(def.car.x, 0, def.car.z);
      heroCar.rotation.y = def.car.rot;
      heroCar.scale.setScalar(def.car.scale);
    } else heroCar.visible = false;
    // Mara
    if (def.mara) {
      mara.visible = true;
      mara.position.set(def.mara.x, 0, def.mara.z);
      mara.rotation.y = def.mara.rot;
      mara.scale.setScalar(def.mara.scale);
    } else mara.visible = false;
    // heli + slim beam onto the car
    if (def.heli && def.car) {
      heli.visible = true;
      heli.position.set(def.heli.x, def.heli.y, def.heli.z);
      beam.visible = true;
      beamPool.visible = true;
      beamPool.position.set(def.car.x, 0.06, def.car.z);
      _v1.set(def.heli.x - def.car.x, def.heli.y, def.heli.z - def.car.z);
      const dist = _v1.length();
      beam.position.set(def.car.x, 0, def.car.z);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _v1.normalize());
      beam.userData.cone.scale.set(1, dist, 1);
      beam.userData.cone.position.y = dist / 2;
    } else { heli.visible = false; beam.visible = false; beamPool.visible = false; }
    // roadblock + SWAT + police car (shot 1)
    if (def.roadblock) {
      roadblock.visible = true;
      roadblock.position.set(def.roadblock.x, 0, def.roadblock.z);
    } else roadblock.visible = false;
    if (def.swat) {
      swat.visible = true;
      swat.position.set(def.swat.x, 0, def.swat.z);
      swat.scale.setScalar(def.swat.scale || 1);
    } else swat.visible = false;
    if (def.policeCar) {
      policeCar.visible = true;
      policeCar.position.set(def.policeCar.x, 0, def.policeCar.z);
      policeCar.rotation.y = 0;
    } else policeCar.visible = false;
    // parked car (shot 2)
    if (def.parkedCar) {
      parkedCar.visible = true;
      parkedCar.position.set(def.parkedCar.x, 0, def.parkedCar.z);
      parkedCar.rotation.y = def.parkedCar.rot;
      parkedCar.scale.setScalar(def.parkedCar.scale);
    } else parkedCar.visible = false;
    // boat (shot 4)
    if (def.boat) {
      boat.visible = true;
      boat.position.set(def.boat.x, 0, def.boat.z);
      boat.rotation.y = def.boat.rot;
      boat.scale.setScalar(def.boat.scale);
    } else boat.visible = false;
    // light pools + point lights per shot
    for (const k of Object.keys(pools)) for (const p of pools[k]) p.visible = (+k === n);
    light1.intensity = n === 1 ? 1.2 : 0;
    light3.intensity = n === 3 ? 1.4 : 0;
    light4.intensity = n === 4 ? 1.2 : 0;
    // peds + traffic per shot
    if (n === 1) {
      stagePeds(def.peds);
      trafficMeshes.forEach((m, i) => {
        if (i < def.trafficCars.length) {
          m.visible = true;
          m.position.set(def.trafficCars[i][0], 0, def.trafficCars[i][1]);
          m.rotation.y = 0;
        } else m.visible = false;
      });
    } else if (n === 2) {
      stagePeds([...def.peds, ...def.forecourtPeds]);
      trafficMeshes.forEach((m) => { m.visible = false; });
    } else if (n === 3) {
      stagePeds([...def.peds, ...def.nearPeds]);
      trafficMeshes.forEach((m) => { m.visible = false; });
    } else if (n === 4) {
      stagePeds(def.yardPeds);
      trafficMeshes.forEach((m) => { m.visible = false; });
    }
    // scene props that only belong to one shot
    cones.forEach((c) => { c.visible = n === 1; });
    edgeBarrier.visible = n === 1;
    shopBench.visible = n === 2;
    shopCrates.forEach((c) => { c.visible = n === 2; });
    bench1.visible = n === 3; bench2.visible = n === 3;
    confetti.visible = n === 3;
    apronCrates.forEach((c) => { c.visible = n === 4; });
    greenContainer.visible = n === 4;
  }
  function tick(dt) {
    if (heli.visible) heli.userData.rotor.rotation.y += dt * 12;
    if (world.frozen) return;
    // free-roam: sync meshes to the world
    heroCar.visible = !world.player.onFoot;
    heroCar.position.set(world.car.x, 0, world.car.z);
    heroCar.rotation.y = world.car.angle + Math.PI;
    mara.visible = world.player.onFoot;
    mara.position.set(world.player.x, 0, world.player.z);
    mara.rotation.y = world.player.angle;
    for (let i = 0; i < pedMeshes.length; i++) {
      const p = world.traffic.peds[i];
      pedMeshes[i].visible = true;
      pedMeshes[i].position.set(p.x, 0, p.z);
      pedMeshes[i].rotation.y = p.angle;
    }
    for (let i = 0; i < trafficMeshes.length; i++) {
      const c = world.traffic.cars[i];
      trafficMeshes[i].visible = true;
      trafficMeshes[i].position.set(c.x, 0, c.z);
      trafficMeshes[i].rotation.y = c.angle + Math.PI;
    }
    // heli follows the car at wanted 3+
    if (world.wanted.level >= 3 && world.police.heli) {
      heli.visible = true;
      heli.position.set(world.police.heli.x, world.police.heli.y, world.police.heli.z);
      beam.visible = true;
      beamPool.visible = true;
      beamPool.position.set(world.car.x, 0.06, world.car.z);
      _v1.set(world.police.heli.x - world.car.x, world.police.heli.y, world.police.heli.z - world.car.z);
      const dist = _v1.length();
      beam.position.set(world.car.x, 0, world.car.z);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _v1.normalize());
      beam.userData.cone.scale.set(1, dist, 1);
      beam.userData.cone.position.y = dist / 2;
    } else { heli.visible = false; beam.visible = false; beamPool.visible = false; }
    // chase camera
    const target = world.player.onFoot ? world.player : world.car;
    const fx = Math.sin(target.angle), fz = Math.cos(target.angle);
    _v2.set(target.x - fx * 11, 5.5, target.z - fz * 11);
    camera.position.lerp(_v2, 1 - Math.pow(0.001, dt));
    camera.lookAt(target.x + fx * 8, 2, target.z + fz * 8);
    setPhase(phaseFor(world.hour));
  }
  return { renderer, scene, camera, applyShot, tick, setPhase };
}
