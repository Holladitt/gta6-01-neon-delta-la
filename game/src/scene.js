// scene.js — the 3D world: ground, sky, buildings, cars, Mara, heli, pier, boat.
// Lambert materials, no shadows, no antialiasing, fixed 1280x720 buffer.
import * as THREE from '../vendor/three.module.min.js';
import { SHOP, CRANE, BOAT, PIER_DECK, DISTRICTS, MISSIONS } from './config.js';
import { SHOTS } from './shots.js';
import { BUILDINGS, inOcean } from './geo.js';
import { phaseFor } from './lights.js';
import { makeRng, range } from './rng.js';
import { showDialogue, setMissionBar } from './hud.js';

const WORLD = 780;
const TEX = 1024;
function px(x) { return ((x + WORLD) / (WORLD * 2)) * TEX; }
function pz(z) { return ((z + WORLD) / (WORLD * 2)) * TEX; }

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = TEX;
  c.height = TEX;
  const g = c.getContext('2d');
  // Grass base.
  g.fillStyle = '#3f7a3d';
  g.fillRect(0, 0, TEX, TEX);
  const rng = makeRng(7);
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    const s = 4 + rng() * 14;
    g.fillRect(rng() * TEX, rng() * TEX, s, s);
  }
  // Ocean (piecewise, same rule as geo.inOcean).
  g.fillStyle = '#1d5f8a';
  // West strip x <= -700, except the pier deck.
  g.fillRect(0, 0, px(-700), TEX);
  // South strip z > 640.
  g.fillRect(0, pz(640), TEX, TEX - pz(640));
  // South-east corner z > 620 and x < 600.
  g.fillRect(0, pz(620), px(600), TEX - pz(620));
  // Waves.
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i < 40; i += 1) {
    const y = rng() * TEX;
    const x = rng() * TEX * 0.4;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 20, y - 6, x + 44, y);
    g.stroke();
  }
  // Port apron (tan concrete).
  g.fillStyle = '#a08b62';
  g.fillRect(px(350), pz(250), px(780) - px(350), pz(640) - pz(250));
  // Port road (asphalt with yellow dashes).
  g.fillStyle = '#2b2b31';
  g.beginPath();
  g.moveTo(px(600), pz(560));
  g.lineTo(px(660), pz(560));
  g.lineTo(px(660), pz(650));
  g.lineTo(px(600), pz(650));
  g.closePath();
  g.fill();
  g.fillStyle = '#f2c14e';
  for (let z = 570; z < 650; z += 16) {
    g.fillRect(px(628) - 1.5, pz(z), 3, 8);
  }
  // Roads: dark asphalt with yellow centre dashes.
  const roads = [-560, -320, -80, 160, 400];
  for (const ax of roads) {
    g.fillStyle = '#2b2b31';
    g.fillRect(px(ax - 12), 0, px(ax + 12) - px(ax - 12), TEX);
  }
  for (const sz of roads) {
    g.fillStyle = '#2b2b31';
    g.fillRect(0, pz(sz - 12), TEX, pz(sz + 12) - pz(sz - 12));
  }
  g.fillStyle = '#f2c14e';
  for (const ax of roads) {
    for (let z = -780; z < 780; z += 24) {
      g.fillRect(px(ax) - 1.5, pz(z), 3, 12);
    }
  }
  for (const sz of roads) {
    for (let x = -780; x < 780; x += 24) {
      g.fillRect(px(x), pz(sz) - 1.5, 12, 3);
    }
  }
  // Pier deck planks: alternating plank bands + strong seams so the wood reads.
  g.fillStyle = '#8a6d4b';
  g.fillRect(px(PIER_DECK.x0), pz(PIER_DECK.z0), px(PIER_DECK.x1) - px(PIER_DECK.x0), pz(PIER_DECK.z1) - pz(PIER_DECK.z0));
  for (let z = PIER_DECK.z0; z < PIER_DECK.z1; z += 24) {
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.fillRect(px(PIER_DECK.x0), pz(z), px(PIER_DECK.x1) - px(PIER_DECK.x0), pz(z + 12) - pz(z));
  }
  g.strokeStyle = 'rgba(0,0,0,0.8)';
  g.lineWidth = 3;
  for (let x = PIER_DECK.x0; x <= PIER_DECK.x1; x += 8) {
    g.beginPath();
    g.moveTo(px(x), pz(PIER_DECK.z0));
    g.lineTo(px(x), pz(PIER_DECK.z1));
    g.stroke();
  }
  for (let z = PIER_DECK.z0; z <= PIER_DECK.z1; z += 12) {
    g.beginPath();
    g.moveTo(px(PIER_DECK.x0), pz(z));
    g.lineTo(px(PIER_DECK.x1), pz(z));
    g.stroke();
  }
  // Shop forecourt (concrete) — hugs the shop so the foreground is grass.
  g.fillStyle = '#9a9a92';
  g.fillRect(px(-400), pz(-240), px(-308) - px(-400), pz(-200) - pz(-240));
  // Sidewalk edges flanking the shop avenue (never over the road itself).
  g.fillStyle = '#7a7a72';
  g.fillRect(px(-344), pz(-260), px(-332) - px(-344), pz(-140) - pz(-260));
  g.fillRect(px(-308), pz(-260), px(-296) - px(-308), pz(-140) - pz(-260));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeWindowTextures() {
  // Facade: concrete + dark windows. Emissive: only the lit windows glow.
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const e = document.createElement('canvas');
  e.width = 128;
  e.height = 256;
  const ge = e.getContext('2d');
  g.fillStyle = '#5a5a66';
  g.fillRect(0, 0, 128, 256);
  ge.fillStyle = '#000000';
  ge.fillRect(0, 0, 128, 256);
  const rng = makeRng(21);
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const x = 10 + col * 23;
      const y = 12 + row * 24;
      const lit = rng() < 0.62;
      g.fillStyle = lit ? '#ffd27a' : '#1a2436';
      g.fillRect(x, y, 15, 16);
      if (lit) {
        ge.fillStyle = '#ffcf6e';
        ge.fillRect(x, y, 15, 16);
      }
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(e);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function makeSkyTexture(phase) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  if (phase === 'day') {
    grad.addColorStop(0, '#5ea9dd');
    grad.addColorStop(0.55, '#9fd0ee');
    grad.addColorStop(1, '#e8f2f8');
  } else if (phase === 'dusk') {
    // v29: saturated golden hour — deep red zenith, red-orange mid-sky, bright orange horizon.
    grad.addColorStop(0, '#1e0a38');
    grad.addColorStop(0.38, '#7a1e30');
    grad.addColorStop(0.62, '#d23a18');
    grad.addColorStop(0.82, '#ff6a1f');
    grad.addColorStop(1, '#ffb347');
  } else {
    grad.addColorStop(0, '#0d0620');
    grad.addColorStop(0.55, '#1c0b33');
    grad.addColorStop(0.8, '#3a1530');
    grad.addColorStop(1, '#5e2418');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSignTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = fg;
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeBillboardTexture() {
  // Two-line rooftop billboard: NEON DELTA LA / DISTRICT WARS.
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e74c3c';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#ffffff';
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('NEON DELTA LA', 256, 44);
  g.font = 'bold 40px sans-serif';
  g.fillStyle = '#ffd27a';
  g.fillText('DISTRICT WARS', 256, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeStripedTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle = i % 2 === 0 ? '#f2c14e' : '#111111';
    g.fillRect(i * 16, 0, 16, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- Figure builders -------------------------------------------------------
function makeMara(scale) {
  const g = new THREE.Group();
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), mat(0x2c3e50));
  legL.position.set(-0.11, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.11;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.3), mat(0xe74c3c));
  torso.position.y = 1.06;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.62, 0.13), mat(0xe74c3c));
  armL.position.set(-0.33, 1.05, 0);
  const armR = armL.clone();
  armR.position.x = 0.33;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), mat(0xe8b48c));
  head.position.y = 1.62;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0x1a1a1a));
  hair.position.y = 1.66;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.16), mat(0x2e6fb0));
  pack.position.set(0, 1.1, 0.24);
  g.add(legL, legR, torso, armL, armR, head, hair, pack);
  g.scale.setScalar(scale);
  return g;
}
function makePed(color, scale) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.26), mat(color));
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xd9a06b));
  head.position.y = 1.5;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.22), mat(0x2c3e50));
  legs.position.y = 0.2;
  g.add(body, head, legs);
  g.scale.setScalar(scale || 1);
  return g;
}
function makeCar(color, roofColor, opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.4), mat(color));
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.9), mat(roofColor || 0x1a2436));
  cabin.position.set(0, 1.1, 0.25);
  g.add(body, cabin);
  if (o.wheels !== false) {
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10);
    const wheelMat = mat(0x111111);
    for (const [wx, wz] of [[-0.85, -1.45], [0.85, -1.45], [-0.85, 1.45], [0.85, 1.45]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.36, wz);
      g.add(w);
    }
  }
  if (o.lights) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
    hl.position.set(-0.6, 0.6, -2.21);
    const hr = hl.clone();
    hr.position.x = 0.6;
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    tl.position.set(-0.6, 0.6, 2.21);
    const tr = tl.clone();
    tr.position.x = 0.6;
    g.add(hl, hr, tl, tr);
  }
  return g;
}
function makePoliceCar() {
  const g = makeCar(0x1a1a2e, 0xe8e8e8, { lights: true });
  const doorMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.4, 1.2), doorMat);
  door.position.set(0, 0.62, 0.1);
  g.add(door);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  bar.position.set(0, 1.42, 0.25);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0x2266ff }));
  bar2.position.set(0.55, 1.42, 0.25);
  g.add(bar, bar2);
  return g;
}
function makeSwatVan() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 5.2), mat(0x111111));
  body.position.y = 1.35;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.0, 1.2), mat(0x1a1a1a));
  cab.position.set(0, 0.9, -2.9);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  bar.position.set(0, 2.5, -2.9);
  g.add(body, cab, bar);
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.26, 10);
  const wheelMat = mat(0x000000);
  for (const [wx, wz] of [[-1.0, -1.8], [1.0, -1.8], [-1.0, 1.8], [1.0, 1.8]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.4, wz);
    g.add(w);
  }
  return g;
}
function makeHeli() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 3.4), mat(0x1a1a2e));
  body.position.y = 0;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), mat(0x2c3e50));
  nose.position.set(0, -0.1, -1.9);
  nose.scale.set(1, 0.8, 1);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.2), mat(0x1a1a2e));
  tail.position.set(0, 0.2, 3.0);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.4), mat(0x111111));
  rotor.position.y = 1.0;
  const rotor2 = rotor.clone();
  rotor2.rotation.y = Math.PI / 2;
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.6), mat(0x111111));
  skidL.position.set(-0.8, -1.0, 0);
  const skidR = skidL.clone();
  skidR.position.x = 0.8;
  g.add(body, nose, tail, rotor, rotor2, skidL, skidR);
  g.userData.rotor = rotor;
  g.userData.rotor2 = rotor2;
  return g;
}
// v29: the boat hull is a CURVED leaf/lens shape, not a box.
// Pointed bow and stern, wide midsection, bevelled bottom, deck line, teal
// cabin, tall mast, big white triangular sail, wake and reflection.
function makeBoat() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(3.2, 0);
  shape.bezierCurveTo(2.6, 0.85, 1.2, 1.15, 0, 1.15);
  shape.bezierCurveTo(-1.2, 1.15, -2.6, 0.7, -3.2, 0);
  shape.bezierCurveTo(-2.6, -0.7, -1.2, -1.15, 0, -1.15);
  shape.bezierCurveTo(1.2, -1.15, 2.6, -0.85, 3.2, 0);
  const hullGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.9, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.35, bevelSegments: 3, steps: 1,
  });
  hullGeo.rotateX(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshLambertMaterial({ color: 0xd88f2e }));
  hull.position.y = 0.4;
  // Deck line: a thinner leaf on top, pale wood.
  const deckGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, steps: 1 });
  deckGeo.rotateX(-Math.PI / 2);
  deckGeo.scale(0.94, 1, 0.94);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshLambertMaterial({ color: 0xe8d9a8 }));
  deck.position.y = 1.35;
  // Teal cabin.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.4), new THREE.MeshLambertMaterial({ color: 0x1f7a6e }));
  cabin.position.set(-0.4, 1.75, 0);
  // Tall mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 8.5, 8), new THREE.MeshLambertMaterial({ color: 0x4a3220 }));
  mast.position.set(0.4, 5.6, 0);
  // Boom.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 8), new THREE.MeshLambertMaterial({ color: 0x4a3220 }));
  boom.rotation.x = Math.PI / 2;
  boom.position.set(-1.4, 1.9, 0);
  // Big white triangular sail.
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 7.2);
  sailShape.lineTo(4.2, 0);
  sailShape.closePath();
  const sailGeo = new THREE.ShapeGeometry(sailShape);
  // Unlit white: Lambert renders grey-tan under dusk light.
  const sail = new THREE.Mesh(sailGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  sail.position.set(0.4, 2.0, 0);
  sail.rotation.y = 0;
  // Wake: white foam ellipse behind the stern + a V trail.
  const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  const wake = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), wakeMat);
  wake.rotation.x = -Math.PI / 2;
  wake.scale.set(1.8, 1, 1);
  wake.position.set(-4.6, 0.06, 0);
  const wake2 = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), wakeMat);
  wake2.rotation.x = -Math.PI / 2;
  wake2.position.set(-2.4, 0.06, 1.1);
  const wake3 = wake2.clone();
  wake3.position.set(-2.4, 0.06, -1.1);
  // Reflection: a flattened, dark, semi-transparent mirrored hull.
  const reflGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, steps: 1 });
  reflGeo.rotateX(-Math.PI / 2);
  const refl = new THREE.Mesh(reflGeo, new THREE.MeshBasicMaterial({ color: 0x1a4a6e, transparent: true, opacity: 0.38 }));
  refl.scale.set(1, -0.5, 1);
  refl.position.y = -0.02;
  g.add(hull, deck, cabin, mast, boom, sail, wake, wake2, wake3, refl);
  return g;
}

export function createScene(world, hud) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setSize(1280, 720, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.1, 3000);
  camera.position.set(-320, 6, -220);
  camera.lookAt(-320, 2, -280);

  const hemi = new THREE.HemisphereLight(0xffe0b3, 0x2a1a3a, 0.9);
  const sun = new THREE.DirectionalLight(0xffc27a, 1.1);
  sun.position.set(200, 300, -100);
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(hemi, sun, amb);

  // Sky dome.
  let skyMat = new THREE.MeshBasicMaterial({ map: makeSkyTexture('dusk'), side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 16), skyMat);
  scene.add(sky);
  scene.fog = new THREE.Fog(0xc25a2e, 250, 1100);

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1560, 1560),
    new THREE.MeshLambertMaterial({ map: makeGroundTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Buildings with lit windows (emissive 0.6 — v29, brighter than v28).
  const winTex = makeWindowTextures();
  const bldgGroup = new THREE.Group();
  const rngB = makeRng(31);
  for (const b of BUILDINGS) {
    const w = b.x1 - b.x0;
    const d = b.z1 - b.z0;
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const downtown = cx > -500 && cx < 0 && cz > -600 && cz < -150;
    const h = downtown ? 30 + rngB() * 55 : 12 + rngB() * 22;
    const mat = new THREE.MeshLambertMaterial({
      map: winTex.map, emissiveMap: winTex.emissive, emissive: 0xffffff, emissiveIntensity: 0.6,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(cx, h / 2, cz);
    bldgGroup.add(m);
  }
  scene.add(bldgGroup);

  // Shop building + sign.
  const shopMat = new THREE.MeshLambertMaterial({ color: 0x8a4a3a });
  const shopB = new THREE.Mesh(new THREE.BoxGeometry(44, 10, 30), shopMat);
  shopB.position.set(-354, 5, -220);
  scene.add(shopB);
  const signTex = makeSignTexture('DELTA ARMS', '#1a1a2e', '#ffd27a');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(-354, 9, -204.5);
  scene.add(sign);
  // Billboard above the shop block (depth landmark for shot 2). Kept east of
  // the shop's tall building block (x -376..-332) so it is not swallowed by it.
  const bbTex = makeBillboardTexture();
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(34, 8.5), new THREE.MeshBasicMaterial({ map: bbTex }));
  bb.position.set(-312, 22, -230);
  scene.add(bb);
  const bbPole = new THREE.Mesh(new THREE.BoxGeometry(1.5, 22, 1.5), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  bbPole.position.set(-312, 11, -232);
  scene.add(bbPole);

  // Garage sign prop.
  const garTex = makeSignTexture('GARAGE', '#222222', '#f2c14e');
  const gar = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: garTex }));
  gar.position.set(-360, 5, -318);
  scene.add(gar);

  // Trees.
  const treeGroup = new THREE.Group();
  const rngT = makeRng(55);
  for (let i = 0; i < 22; i += 1) {
    const x = -700 + rngT() * 1400;
    const z = -700 + rngT() * 1200;
    if (inOcean(x, z)) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), new THREE.MeshLambertMaterial({ color: 0x5a3a22 }));
    trunk.position.set(x, 1.5, z);
    const top = new THREE.Mesh(new THREE.SphereGeometry(2.2 + rngT(), 8, 6), new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));
    top.position.set(x, 4.2, z);
    treeGroup.add(trunk, top);
  }
  // Deliberate street trees flanking the shot-1 avenue (the random ones
  // never land near the road).
  for (const [tx, tz] of [[-336, -275], [-304, -275], [-336, -310], [-304, -310]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), new THREE.MeshLambertMaterial({ color: 0x5a3a22 }));
    trunk.position.set(tx, 1.5, tz);
    const top = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));
    top.position.set(tx, 4.4, tz);
    treeGroup.add(trunk, top);
  }
  scene.add(treeGroup);

  // Lamps + 28 warm glow discs (subtle — the pools must not read as slabs).
  const lampGroup = new THREE.Group();
  const poolGroup = new THREE.Group();
  const rngL = makeRng(77);
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let i = 0; i < 28; i += 1) {
    const x = -700 + rngL() * 1400;
    const z = -650 + rngL() * 1200;
    if (inOcean(x, z)) continue;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    pole.position.set(x, 3, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.set(x, 6.2, z);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 16), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.08, z);
    lampGroup.add(pole, bulb);
    poolGroup.add(pool);
  }
  scene.add(lampGroup, poolGroup);

  // Clouds — one shared material, faded via the material only.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffd9c2, transparent: true, opacity: 0.85 });
  const cloudGroup = new THREE.Group();
  const rngC = makeRng(99);
  for (let i = 0; i < 9; i += 1) {
    const cl = new THREE.Group();
    for (let j = 0; j < 3; j += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(8 + rngC() * 10, 8, 6), cloudMat);
      s.position.set(j * 10 - 10, rngC() * 3, rngC() * 6 - 3);
      s.scale.y = 0.45;
      cl.add(s);
    }
    cl.position.set(-700 + rngC() * 1400, 70 + rngC() * 50, -700 + rngC() * 1200);
    cloudGroup.add(cl);
  }
  scene.add(cloudGroup);

  // Ferris wheel on the pier. Only the rim/spokes/gondolas spin (wheelSpin);
  // the support legs stay fixed.
  const wheelGroup = new THREE.Group();
  const wheelSpin = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(20, 0.7, 8, 40), new THREE.MeshLambertMaterial({ color: 0xe74c3c }));
  rim.position.y = 24;
  wheelSpin.add(rim);
  const spokeMat = new THREE.MeshLambertMaterial({ color: 0xf2c14e });
  for (let i = 0; i < 8; i += 1) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 40, 0.5), spokeMat);
    sp.position.y = 24;
    sp.rotation.z = (i / 8) * Math.PI;
    wheelSpin.add(sp);
  }
  const gondolaMat = new THREE.MeshLambertMaterial({ color: 0x1abc9c });
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const gond = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), gondolaMat);
    gond.position.set(Math.cos(a) * 20, 24 + Math.sin(a) * 20, 0);
    wheelSpin.add(gond);
  }
  wheelGroup.add(wheelSpin);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 26, 0.8), legMat);
    leg.position.set(s * 8, 12, 0);
    leg.rotation.z = -s * 0.25;
    wheelGroup.add(leg);
  }
  wheelGroup.position.set(-712, 0, 424);
  // Face the shot-3 camera (east) so the wheel reads as a full circle.
  wheelGroup.rotation.y = Math.PI / 2;
  scene.add(wheelGroup);

  // Stalls on the pier with signs.
  const stallDefs = [
    { x: -690, z: 470, text: 'BALLOONS', bg: '#e74c3c' },
    { x: -700, z: 400, text: 'ARCADE', bg: '#1abc9c' },
    { x: -715, z: 445, text: 'SNO-CONES', bg: '#f2c14e' },
  ];
  for (const sd of stallDefs) {
    const st = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 4), new THREE.MeshLambertMaterial({ color: 0x8a6d4b }));
    box.position.y = 1.7;
    const awn = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 4.6), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    awn.position.y = 3.6;
    const stTex = makeSignTexture(sd.text, sd.bg, '#ffffff');
    const stSign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: stTex }));
    stSign.position.set(0, 4.4, 2.1);
    st.add(box, awn, stSign);
    st.position.set(sd.x, 0, sd.z);
    // Signs face east, toward the shot-3 camera.
    st.rotation.y = Math.PI / 2;
    scene.add(st);
  }
  // Palm on the pier.
  const palm = new THREE.Group();
  const pTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 9, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
  pTrunk.position.y = 4.5;
  palm.add(pTrunk);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
  for (let i = 0; i < 7; i += 1) {
    const fr = new THREE.Mesh(new THREE.ConeGeometry(0.7, 5, 4), frondMat);
    const a = (i / 7) * Math.PI * 2;
    fr.position.set(Math.cos(a) * 1.8, 9.2, Math.sin(a) * 1.8);
    fr.rotation.z = Math.cos(a) * 1.1;
    fr.rotation.x = -Math.sin(a) * 1.1;
    palm.add(fr);
  }
  palm.position.set(-700, 0, 395);
  scene.add(palm);

  // String lights across the pier deck.
  const stringGroup = new THREE.Group();
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (const [x0, z0, x1, z1] of [[-770, 380, -640, 380], [-770, 440, -640, 440], [-770, 490, -640, 490]]) {
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const bx = x0 + (x1 - x0) * t;
      const bz = z0 + (z1 - z0) * t;
      const sag = Math.sin(t * Math.PI) * 1.2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), bulbMat);
      bulb.position.set(bx, 7 - sag, bz);
      stringGroup.add(bulb);
    }
  }
  scene.add(stringGroup);

  // Confetti + fireworks above the pier (v29: one dense burst over the wheel,
  // not noise scattered across the whole sky).
  const confCount = 420;
  const confPos = new Float32Array(confCount * 3);
  const confCol = new Float32Array(confCount * 3);
  const rngF = makeRng(123);
  const palette = [[1, 0.3, 0.3], [1, 0.8, 0.2], [0.2, 0.9, 0.6], [0.3, 0.6, 1], [1, 0.5, 0.9], [1, 1, 1]];
  for (let i = 0; i < confCount; i += 1) {
    const th = rngF() * Math.PI * 2;
    const ph = Math.acos(2 * rngF() - 1);
    const r = 6 + rngF() * 22;
    confPos[i * 3] = -712 + r * Math.sin(ph) * Math.cos(th);
    confPos[i * 3 + 1] = 32 + r * Math.cos(ph) * 0.7;
    confPos[i * 3 + 2] = 424 + r * Math.sin(ph) * Math.sin(th);
    const col = palette[Math.floor(rngF() * palette.length)];
    confCol[i * 3] = col[0];
    confCol[i * 3 + 1] = col[1];
    confCol[i * 3 + 2] = col[2];
  }
  const confGeo = new THREE.BufferGeometry();
  confGeo.setAttribute('position', new THREE.Float32BufferAttribute(confPos, 3));
  confGeo.setAttribute('color', new THREE.Float32BufferAttribute(confCol, 3));
  const confetti = new THREE.Points(confGeo, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95 }));
  scene.add(confetti);

  // Crane + hanging load.
  const craneGroup = new THREE.Group();
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 42, 4), craneMat);
  tower.position.y = 21;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 2), craneMat);
  jib.position.set(-12, 42, 0);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 10, 4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  cable.position.set(-24, 37, 0);
  const load = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3), new THREE.MeshLambertMaterial({ color: 0x2e6fb0 }));
  load.position.set(-24, 31, 0);
  craneGroup.add(tower, jib, cable, load);
  craneGroup.position.set(CRANE.x, 0, CRANE.z);
  scene.add(craneGroup);

  // Freeway bridge across the port background.
  const bridge = new THREE.Group();
  const bDeck = new THREE.Mesh(new THREE.BoxGeometry(560, 3, 16), new THREE.MeshLambertMaterial({ color: 0x3a3a44 }));
  bDeck.position.y = 14;
  bridge.add(bDeck);
  for (let x = -240; x <= 760; x += 125) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 4), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
    pillar.position.set(x, 7, 0);
    bridge.add(pillar);
  }
  bridge.position.set(300, 0, 470);
  scene.add(bridge);

  // Containers in the port yard.
  const contGroup = new THREE.Group();
  const contColors = [0xe74c3c, 0x2e6fb0, 0x27ae60, 0xf2c14e, 0x9b59b6];
  const contDefs = [[400, 540, 2], [520, 540, 1], [560, 580, 2], [400, 600, 1], [520, 600, 3], [600, 540, 1]];
  contDefs.forEach(([cx, cz, n], i) => {
    for (let k = 0; k < n; k += 1) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(10, 3.4, 4), new THREE.MeshLambertMaterial({ color: contColors[(i + k) % contColors.length] }));
      box.position.set(cx, 1.7 + k * 3.4, cz);
      contGroup.add(box);
    }
  });
  scene.add(contGroup);

  // Hero car, Mara, police, heli, boat, roadblock.
  const heroCar = makeCar(0xe74c3c, 0x1abc9c, { lights: true });
  scene.add(heroCar);
  const mara = makeMara(1.8);
  scene.add(mara);
  const heli = makeHeli();
  scene.add(heli);
  // Beam cone: narrow at the heli, widening down, landing on the car.
  // Kept slim (radius 3 at the car) so it reads as a spotlight, not a curtain.
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 0.35, 1, 16, 1, true), beamMat);
  scene.add(beam);
  const beamPool = new THREE.Mesh(new THREE.CircleGeometry(3.5, 20), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  beamPool.rotation.x = -Math.PI / 2;
  beamPool.position.y = 0.1;
  scene.add(beamPool);
  const boat = makeBoat();
  boat.position.set(BOAT.x, 0, BOAT.z);
  // Side-on to the shot-4 camera: full hull profile, sail facing the camera.
  boat.rotation.y = 1.84;
  boat.scale.setScalar(4.5);
  scene.add(boat);
  const roadblock = new THREE.Group();
  const stripeTex = makeStripedTexture();
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 0.4), new THREE.MeshBasicMaterial({ map: stripeTex }));
  barrier.position.y = 1.2;
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.7, 0.4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  postL.position.set(-5.5, 0.85, 0);
  const postR = postL.clone();
  postR.position.x = 5.5;
  roadblock.add(barrier, postL, postR);
  scene.add(roadblock);
  const swat = makeSwatVan();
  scene.add(swat);
  const policeCars = [];
  for (let i = 0; i < 4; i += 1) {
    const pc = makePoliceCar();
    scene.add(pc);
    policeCars.push(pc);
  }

  // Traffic cars + peds (from the world state, cheap single meshes).
  const trafficGroup = new THREE.Group();
  scene.add(trafficGroup);
  const pedGroup = new THREE.Group();
  scene.add(pedGroup);
  const pedMeshes = [];
  const trafficMeshes = [];
  const rngP = makeRng(90210);
  const pedColors = [0x8a8f98, 0xf2c14e, 0xe67e22, 0x9b59b6, 0x1abc9c, 0x3498db];
  for (let i = 0; i < 104; i += 1) {
    const p = makePed(pedColors[i % pedColors.length], 1);
    pedGroup.add(p);
    pedMeshes.push(p);
  }
  for (let i = 0; i < 22; i += 1) {
    const c = makeCar(pedColors[i % pedColors.length], 0x1a2436, { wheels: false });
    trafficGroup.add(c);
    trafficMeshes.push(c);
  }

  let shotNum = 0;
  let time = 0;

  function setSky(phase) {
    skyMat.map = makeSkyTexture(phase);
    skyMat.needsUpdate = true;
    if (phase === 'day') {
      scene.fog.color.set(0x9fd0ee);
      scene.background = new THREE.Color(0x9fd0ee);
      hemi.intensity = 1.1;
      sun.intensity = 1.3;
      sun.color.set(0xfff2cc);
      amb.intensity = 0.5;
      cloudMat.opacity = 0.9;
    } else if (phase === 'dusk') {
      scene.fog.color.set(0xc25a2e);
      scene.background = new THREE.Color(0xc25a2e);
      hemi.intensity = 1.05;
      sun.intensity = 1.0;
      sun.color.set(0xff8c2e);
      amb.intensity = 0.5;
      cloudMat.opacity = 0.9;
    } else {
      scene.fog.color.set(0x1c0b33);
      scene.background = new THREE.Color(0x1c0b33);
      hemi.intensity = 0.5;
      sun.intensity = 0.25;
      sun.color.set(0x8a9aff);
      amb.intensity = 0.22;
      cloudMat.opacity = 0.55;
    }
  }

  function placePeds(list, startIdx) {
    for (let i = 0; i < list.length; i += 1) {
      const m = pedMeshes[(startIdx + i) % pedMeshes.length];
      m.visible = true;
      m.position.set(list[i].x, 0, list[i].z);
      m.rotation.y = range(rngP, 0, Math.PI * 2);
      m.scale.setScalar(1.05);
    }
  }

  function applyShot(n) {
    shotNum = n;
    const s = SHOTS[n];
    if (!s) return;
    world.frozen = true;
    world.state = 'MISSION';
    world.hour = s.hour;
    world.money = s.money;
    world.day = 1;
    world.missions.current = s.mission;
    world.missions.objective = 0;
    if (s.wanted !== undefined) world.wanted.level = s.wanted;
    if (s.cover !== undefined) world.cover.value = s.cover;
    if (s.tapes !== undefined) world.tapes.tapesFound = s.tapes;
    if (s.standing !== undefined) {
      for (const d of DISTRICTS) world.standing[d.id] = s.standing;
    }
    setSky(phaseFor(s.hour));
    document.body.classList.add('shot' + n);
    // Hide the extra peds/cars first; staged ones are placed below.
    for (const m of pedMeshes) m.visible = false;
    for (const m of trafficMeshes) m.visible = false;

    if (n === 1) {
      heroCar.visible = true;
      heroCar.position.set(s.car.x, 0, s.car.z);
      heroCar.rotation.y = 0.5;
      heroCar.scale.setScalar(2.0);
      mara.visible = false;
      roadblock.visible = true;
      roadblock.position.set(s.roadblock.x, 0, s.roadblock.z);
      // Angled across the road so its ends peek past the hero car.
      roadblock.rotation.y = 0.3;
      swat.visible = true;
      swat.position.set(s.swat.x, 0, s.swat.z);
      swat.rotation.y = 0.35;
      swat.scale.setScalar(1.3);
      heli.visible = true;
      heli.position.set(s.heli.x, s.heli.y, s.heli.z);
      heli.scale.setScalar(1.6);
      beam.visible = true;
      beamPool.visible = true;
      boat.visible = false;
      // Police cars flanking the roadblock + traffic on the avenue.
      const pcs = [[-332, -288, 0.15], [-308, -302, -0.1], [-332, -330, 0.2], [-308, -260, 0]];
      for (let i = 0; i < 4; i += 1) {
        policeCars[i].visible = true;
        policeCars[i].position.set(pcs[i][0], 0, pcs[i][1]);
        policeCars[i].rotation.y = pcs[i][2];
      }
      const tcs = [[-320, -230, 0], [-320, -360, 0], [-308, -400, 0.1], [-332, -200, -0.1]];
      for (let i = 0; i < 4; i += 1) {
        trafficMeshes[i].visible = true;
        trafficMeshes[i].position.set(tcs[i][0], 0, tcs[i][1]);
        trafficMeshes[i].rotation.y = tcs[i][2];
      }
      placePeds(s.peds, 0);
      camera.position.set(s.camera.x, s.camera.y, s.camera.z);
      camera.lookAt(s.look.x, s.look.y, s.look.z);
    } else if (n === 2) {
      heroCar.visible = false;
      mara.visible = true;
      mara.position.set(s.mara.x, 0, s.mara.z);
      // Back to the camera: blue backpack visible.
      mara.rotation.y = 0;
      mara.scale.setScalar(2.0);
      roadblock.visible = false;
      swat.visible = false;
      heli.visible = false;
      beam.visible = false;
      beamPool.visible = false;
      boat.visible = false;
      const pc = null;
      void pc;
      // Parked car near the shop (re-use a traffic mesh).
      trafficMeshes[0].visible = true;
      trafficMeshes[0].position.set(s.parkedCar.x, 0, s.parkedCar.z);
      trafficMeshes[0].rotation.y = 0.6;
      trafficMeshes[0].scale.setScalar(1.1);
      placePeds(s.peds, 0);
      placePeds(s.foregroundPeds, 5);
      // A few more peds down the avenue for depth.
      const extra = [{ x: -320, z: -120 }, { x: -320, z: -260 }, { x: -320, z: -300 }];
      placePeds(extra, 9);
      camera.position.set(s.camera.x, s.camera.y, s.camera.z);
      camera.lookAt(s.look.x, s.look.y, s.look.z);
    } else if (n === 3) {
      heroCar.visible = false;
      mara.visible = true;
      mara.position.set(s.mara.x, 0, s.mara.z);
      mara.rotation.y = Math.PI / 2;
      mara.scale.setScalar(1.8);
      roadblock.visible = false;
      swat.visible = false;
      heli.visible = false;
      beam.visible = false;
      beamPool.visible = false;
      boat.visible = false;
      placePeds(s.peds, 0);
      placePeds(s.foregroundPeds, 10);
      // Extra foreground peds at the bottom corners (v29: fill the deck).
      const extra = [
        { x: -640, z: 470 }, { x: -636, z: 452 }, { x: -646, z: 486 },
        { x: -676, z: 492 }, { x: -684, z: 474 }, { x: -690, z: 492 },
      ];
      placePeds(extra, 18);
      // Foreground props: crates + barrels near the camera.
      const propMat = new THREE.MeshLambertMaterial({ color: 0x8a6d4b });
      const barrelMat = new THREE.MeshLambertMaterial({ color: 0x2e6fb0 });
      for (const p of s.foregroundProps) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), propMat);
        crate.position.set(p.x, 0.8, p.z);
        scene.add(crate);
      }
      for (const [bx, bz] of [[-642, 466], [-638, 480], [-680, 488]]) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.8, 10), barrelMat);
        barrel.position.set(bx, 0.9, bz);
        scene.add(barrel);
      }
      // Near-camera foreground: a row of crates + a barrel across the bottom
      // of the frame (15-17 units out, hugging the camera axis — further to
      // either side lands off-frame, closer reads as giant slabs).
      for (const [cx, cz] of [[-654, 420], [-654, 436]]) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), propMat);
        crate.position.set(cx, 0.8, cz);
        scene.add(crate);
      }
      const nBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.8, 10), barrelMat);
      nBarrel.position.set(-656, 0.9, 428);
      scene.add(nBarrel);
      camera.position.set(s.camera.x, s.camera.y, s.camera.z);
      camera.lookAt(s.look.x, s.look.y, s.look.z);
    } else if (n === 4) {
      heroCar.visible = true;
      heroCar.position.set(s.car.x, 0, s.car.z);
      heroCar.rotation.y = Math.PI / 2;
      heroCar.scale.setScalar(1.6);
      mara.visible = true;
      mara.position.set(s.mara.x, 0, s.mara.z);
      // Back to the camera (east): blue backpack visible, facing the boat.
      mara.rotation.y = Math.PI / 2;
      mara.scale.setScalar(2.0);
      roadblock.visible = false;
      swat.visible = false;
      heli.visible = false;
      beam.visible = false;
      beamPool.visible = false;
      boat.visible = true;
      // Crates on the apron.
      const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6d4b });
      for (const p of s.apron) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), crateMat);
        crate.position.set(p.x, 0.9, p.z);
        scene.add(crate);
      }
      placePeds(s.peds, 0);
      camera.position.set(s.camera.x, s.camera.y, s.camera.z);
      camera.lookAt(s.look.x, s.look.y, s.look.z);
    }
    // HUD: district label + minimap dot follow the shot's hero.
    const hero = s.mara || s.car;
    if (hero) {
      world.player.x = hero.x;
      world.player.z = hero.z;
    }
    world.district = ({ 1: 'downtown', 2: 'venice', 3: 'pier', 4: 'port' })[n] || world.district;
    // HUD for the shot.
    if (hud) {
      showDialogue(hud, s.dialogue.name, s.dialogue.text);
      setMissionBar(hud, s.title, s.objective, s.next);
    }
  }

  function animate(dt) {
    time += dt;
    // Heli bob + rotor.
    if (heli.visible) {
      heli.position.y += Math.sin(time * 1.4) * 0.008;
      if (heli.userData.rotor) {
        heli.userData.rotor.rotation.y += dt * 18;
        heli.userData.rotor2.rotation.y += dt * 18;
      }
      // Beam: narrow at the heli, widening down, landing on the car.
      const top = new THREE.Vector3(heli.position.x, heli.position.y - 1, heli.position.z);
      const bottom = new THREE.Vector3(heroCar.position.x, 0.4, heroCar.position.z);
      const len = top.distanceTo(bottom);
      beam.visible = true;
      beam.scale.set(1, len, 1);
      beam.position.copy(top).lerp(bottom, 0.5);
      beam.lookAt(bottom.x, bottom.y, bottom.z);
      beam.rotateX(Math.PI / 2);
      beamPool.visible = true;
      beamPool.position.set(heroCar.position.x, 0.1, heroCar.position.z);
    } else {
      beam.visible = false;
      beamPool.visible = false;
    }
    // Ferris wheel turns (rim only — legs stay fixed).
    wheelSpin.rotation.z += dt * 0.12;
    // Confetti falls and respawns.
    const pos = confGeo.attributes.position;
    for (let i = 0; i < confCount; i += 1) {
      let y = pos.getY(i) - dt * 1.6;
      if (y < 0.5) y = 34;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(time * 2 + i) * dt * 0.4);
    }
    pos.needsUpdate = true;
    // Clouds drift.
    for (const cl of cloudGroup.children) {
      cl.position.x += dt * 1.2;
      if (cl.position.x > 800) cl.position.x = -800;
    }
    // Boat rocks gently on the water.
    if (boat.visible) {
      boat.rotation.z = Math.sin(time * 0.8) * 0.02;
      boat.position.y = Math.sin(time * 1.1) * 0.15;
    }
    // Free-roam camera follows the player when not in a shot.
    if (shotNum === 0) {
      const px2 = world.player.x;
      const pz2 = world.player.z;
      camera.position.set(px2 + 10, 8, pz2 + 14);
      camera.lookAt(px2, 2, pz2);
    }
  }

  return { renderer, scene, camera, applyShot, animate, setSky };
}
