// Three.js scene for Neon Delta LA: District Wars.
// One canvas-texture ground (world -780..780 mapped straight onto the
// plane centred on the origin), Lambert materials, no shadows, no
// antialiasing, a fixed 1280x720 render buffer and only a handful of
// lights, so the game runs in headless SwiftShader. The sky, the
// clouds, the sun and the light change with the hour: bright day for
// the shop, golden hour for the chase, deep red dusk for the port,
// night for the pier.
import * as THREE from '../vendor/three.module.min.js';
import { DISTRICTS, MISSIONS, SHOP, BOAT, CRANE, PIER_DECK, GARAGE_POS, OCEAN_WEST, OCEAN_SOUTH, NIGHT_DISCS } from './config.js';
import { BUILDINGS, AVENUES, STREETS, inOcean } from './geo.js';
import { SHOTS, SHOT2_CAMERA, SHOT4_CAMERA, shot2ForecourtSpots, shot4YardSpots } from './shots.js';
import { MARA } from './characters.js';

const WORLD = 1560;
const HALF = 780;
const TEX = 2048;

function w2c(x, z) {
  return { x: ((x + HALF) / WORLD) * TEX, y: ((z + HALF) / WORLD) * TEX };
}

function css(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

function makeTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function groundTexture() {
  return makeTexture(TEX, TEX, (ctx) => {
    ctx.fillStyle = '#7a9b58';
    ctx.fillRect(0, 0, TEX, TEX);
    const tints = {
      downtown: '#8a8f96', venice: '#5f9ea0', marina: '#6a9bb5',
      hills: '#6f9e5f', pier: '#8a7a5a', port: '#9a8f7a',
    };
    for (const d of DISTRICTS) {
      const a = w2c(d.x0, d.z0);
      const b = w2c(d.x1, d.z1);
      ctx.fillStyle = tints[d.id] || '#7a9b58';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.globalAlpha = 1;
    }
    // Port yard concrete with panel seams and worn patches.
    const y0 = w2c(300, 300);
    const y1 = w2c(700, 635);
    ctx.fillStyle = '#a89a80';
    ctx.fillRect(y0.x, y0.y, y1.x - y0.x, y1.y - y0.y);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (const [px, pz, pw, pd] of [[350, 380, 90, 60], [520, 340, 110, 70], [420, 520, 80, 55], [600, 420, 70, 90], [380, 600, 120, 30]]) {
      const q0 = w2c(px, pz);
      const q1 = w2c(px + pw, pz + pd);
      ctx.fillRect(q0.x, q0.y, q1.x - q0.x, q1.y - q0.y);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    for (let x = 300; x <= 700; x += 50) {
      const p = w2c(x, 300);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, w2c(x, 635).y);
      ctx.stroke();
    }
    for (let z = 300; z <= 635; z += 50) {
      const p = w2c(300, z);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(w2c(700, z).x, p.y);
      ctx.stroke();
    }
    // Shop forecourt grass.
    const f0 = w2c(-460, -300);
    const f1 = w2c(-160, -40);
    ctx.fillStyle = '#69a84f';
    ctx.fillRect(f0.x, f0.y, f1.x - f0.x, f1.y - f0.y);
    // Ocean: west of x=-660 and south of z=635.
    ctx.fillStyle = '#1f6fb2';
    const o = w2c(OCEAN_WEST, -HALF);
    ctx.fillRect(0, 0, o.x, TEX);
    const s = w2c(-HALF, OCEAN_SOUTH);
    ctx.fillRect(0, s.y, TEX, TEX - s.y);
    // Beach strip along the shore.
    ctx.fillStyle = '#d9c08a';
    const b0 = w2c(-660, -HALF);
    ctx.fillRect(b0.x, 0, w2c(-640, 0).x - b0.x, TEX);
    const b1 = w2c(-HALF, 615);
    ctx.fillRect(0, b1.y, TEX, w2c(0, 635).y - b1.y);
    // Pier deck planks over the water: alternating plank shades so the
    // wood reads even at a grazing angle, plus dark seams.
    const d0 = w2c(PIER_DECK.x0, PIER_DECK.z0);
    const d1 = w2c(PIER_DECK.x1, PIER_DECK.z1);
    ctx.fillStyle = '#8a6d3b';
    ctx.fillRect(d0.x, d0.y, d1.x - d0.x, d1.y - d0.y);
    ctx.fillStyle = 'rgba(255,220,150,0.32)';
    for (let z = PIER_DECK.z0; z <= PIER_DECK.z1; z += 16) {
      const p = w2c(PIER_DECK.x0, z);
      ctx.fillRect(p.x, p.y, d1.x - d0.x, w2c(0, z + 8).y - p.y);
    }
    // Plank seams: strong long seams, weak staggered end joints.
    ctx.strokeStyle = 'rgba(40,25,10,0.8)';
    ctx.lineWidth = 4;
    for (let z = PIER_DECK.z0; z <= PIER_DECK.z1; z += 8) {
      const p = w2c(PIER_DECK.x0, z);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(w2c(PIER_DECK.x1, z).x, p.y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(40,25,10,0.35)';
    ctx.lineWidth = 2;
    for (let x = PIER_DECK.x0; x <= PIER_DECK.x1; x += 12) {
      const p = w2c(x, PIER_DECK.z0);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, w2c(x, PIER_DECK.z1).y);
      ctx.stroke();
    }
    // Roads: asphalt strips with dashed yellow centre lines.
    ctx.fillStyle = '#3a3a3d';
    for (const a of AVENUES) {
      const p = w2c(a - 8, -HALF);
      const q = w2c(a + 8, HALF);
      ctx.fillRect(p.x, 0, q.x - p.x, TEX);
    }
    for (const s of STREETS) {
      const p = w2c(-HALF, s - 8);
      const q = w2c(HALF, s + 8);
      ctx.fillRect(0, p.y, TEX, q.y - p.y);
    }
    ctx.fillStyle = '#f1c40f';
    for (const a of AVENUES) {
      const p = w2c(a, -HALF);
      for (let z = -HALF; z < HALF; z += 40) {
        const q = w2c(a, z);
        ctx.fillRect(p.x - 2, q.y, 4, 20);
      }
    }
    for (const s of STREETS) {
      const p = w2c(-HALF, s);
      for (let x = -HALF; x < HALF; x += 40) {
        const q = w2c(x, s);
        ctx.fillRect(q.x, p.y - 2, 20, 4);
      }
    }
    // Freeway bridge over the water.
    const br0 = w2c(300, 690);
    const br1 = w2c(700, 710);
    ctx.fillStyle = '#555';
    ctx.fillRect(br0.x, br0.y, br1.x - br0.x, br1.y - br0.y);
  });
}

function windowTexture() {
  return makeTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 8; y < 128; y += 22) {
      for (let x = 8; x < 128; x += 18) {
        ctx.fillStyle = (x + y) % 3 === 0 ? '#ffd76a' : '#9fc3e8';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, 10, 12);
        ctx.globalAlpha = 1;
      }
    }
  });
}

function signTexture(text, sub, bg, fg) {
  return makeTexture(512, 160, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 148);
    ctx.fillStyle = fg;
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, sub ? 62 : 80);
    if (sub) {
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(sub, 256, 122);
    }
  });
}

function box(w, h, d, color, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

export function makeHumanoid(shirt, scale, backpack) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const shirtM = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsM = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const hairM = new THREE.MeshLambertMaterial({ color: 0x2c1a12 });
  const legL = box(0.22, 0.8, 0.22, 0, -0.14, 0.4, 0, pantsM);
  const legR = box(0.22, 0.8, 0.22, 0, 0.14, 0.4, 0, pantsM);
  const torso = box(0.62, 0.75, 0.34, 0, 0, 1.15, 0, shirtM);
  const armL = box(0.18, 0.7, 0.18, 0, -0.42, 1.15, 0, shirtM);
  const armR = box(0.18, 0.7, 0.18, 0, 0.42, 1.15, 0, shirtM);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.set(0, 1.75, 0);
  const hair = box(0.46, 0.16, 0.46, 0, 0, 1.98, 0, hairM);
  g.add(legL, legR, torso, armL, armR, head, hair);
  if (backpack) {
    const pack = box(0.5, 0.6, 0.18, 0, 0, 1.2, -0.26, new THREE.MeshLambertMaterial({ color: backpack }));
    g.add(pack);
  }
  g.scale.setScalar(scale || 1);
  return g;
}

export function makeCar(color, roofColor) {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshLambertMaterial({ color });
  const glassM = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const wheelM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const body = box(2.0, 0.7, 4.4, 0, 0, 0.55, 0, bodyM);
  const cabin = box(1.7, 0.6, 2.2, 0, 0, 1.15, -0.2, glassM);
  if (roofColor) {
    const roof = box(1.75, 0.08, 2.25, 0, 0, 1.48, -0.2, new THREE.MeshLambertMaterial({ color: roofColor }));
    g.add(roof);
  }
  g.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelM);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    g.add(w);
  }
  return g;
}

export function makePoliceCar() {
  const g = makeCar(0xecf0f1, 0x1a5276);
  const stripe = box(2.02, 0.18, 4.42, 0, 0, 0.62, 0, new THREE.MeshLambertMaterial({ color: 0x1a5276 }));
  g.add(stripe);
  const bar = box(1.2, 0.18, 0.5, 0, 0, 1.5, -0.2, new THREE.MeshLambertMaterial({ color: 0xe74c3c, emissive: 0x881111 }));
  g.add(bar);
  return g;
}

export function makeSwatVan() {
  const g = new THREE.Group();
  const body = box(2.4, 2.2, 5.6, 0, 0, 1.5, 0, new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  const stripe = box(2.42, 0.3, 5.62, 0, 0, 1.1, 0, new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
  g.add(body, stripe);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 10);
  const wheelM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1.1, 1.8], [1.1, 1.8], [-1.1, -1.8], [1.1, -1.8]]) {
    const w = new THREE.Mesh(wheelGeo, wheelM);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.45, wz);
    g.add(w);
  }
  return g;
}

export function makeHelicopter() {
  const g = new THREE.Group();
  const bodyM = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 4.5), bodyM);
  body.position.set(0, 0, 0);
  const tail = box(0.5, 0.5, 4.0, 0, 0, 0.4, -4.0, bodyM);
  const rotor = new THREE.Group();
  const bladeM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const b1 = box(12, 0.08, 0.4, 0, 0, 1.0, 0, bladeM);
  const b2 = box(0.4, 0.08, 12, 0, 0, 1.0, 0, bladeM);
  rotor.add(b1, b2);
  g.add(body, tail, rotor);
  g.userData.rotor = rotor;
  const beamGeo = new THREE.ConeGeometry(4, 60, 24, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, -30, 0);
  beam.rotation.x = Math.PI;
  g.add(beam);
  g.userData.beam = beam;
  return g;
}

export function makeBoat(scale) {
  const g = new THREE.Group();
  const hullM = new THREE.MeshLambertMaterial({ color: 0xffd76a });
  const cabinM = new THREE.MeshLambertMaterial({ color: 0x1abc9c });
  const woodM = new THREE.MeshLambertMaterial({ color: 0x8a6d3b });
  const hull = box(3.2, 1.2, 7.5, 0, 0, 0.8, 0, hullM);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 4), hullM);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0.8, 4.8);
  const cabin = box(2.4, 1.4, 3.0, 0, 0, 2.0, -0.5, cabinM);
  const mast = box(0.18, 5.0, 0.18, 0, 0, 4.0, 0.5, woodM);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshLambertMaterial({ color: 0xecf0f1, side: THREE.DoubleSide }));
  sail.position.set(0, 3.6, 1.2);
  sail.rotation.y = Math.PI / 2;
  g.add(hull, bow, cabin, mast, sail);
  g.scale.setScalar(scale || 1);
  return g;
}

export function makeCrane() {
  const g = new THREE.Group();
  const steel = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const tower = box(4, 60, 4, 0, 0, 30, 0, steel);
  const jib = box(40, 3.5, 3, 0, 18, 58, 0, steel);
  const counter = box(8, 3, 3, 0, -16, 58, 0, dark);
  const cab = box(4, 3, 4, 0, 0, 55, 2, dark);
  const cable = box(0.15, 20, 0.15, 0, 18, 48, 0, dark);
  const hook = box(3, 2.5, 3, 0, 18, 38, 0, new THREE.MeshLambertMaterial({ color: 0x3498db }));
  g.add(tower, jib, counter, cab, cable, hook);
  return g;
}

export function makeFerrisWheel() {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(22, 1.1, 8, 32), new THREE.MeshLambertMaterial({ color: 0xe74c3c }));
  rim.rotation.y = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3, 12), new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
  hub.rotation.x = Math.PI / 2;
  const legL = box(1.5, 24, 1.5, 0, -10, 12, 0, new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  const legR = box(1.5, 24, 1.5, 0, 10, 12, 0, new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  const gondolaM = new THREE.MeshLambertMaterial({ color: 0x1abc9c });
  const gondolas = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const cab = box(2.2, 2.2, 2.2, 0, Math.cos(a) * 22, Math.sin(a) * 22, 0, gondolaM);
    gondolas.add(cab);
  }
  const wheel = new THREE.Group();
  wheel.add(rim, hub, gondolas);
  wheel.position.set(0, 24, 0);
  g.add(wheel, legL, legR);
  g.userData.wheel = wheel;
  return g;
}

function makeStall(name, color, signBg) {
  const g = new THREE.Group();
  const base = box(10, 4, 6, 0, 0, 2, 0, new THREE.MeshLambertMaterial({ color }));
  const roof = box(11, 0.6, 7, 0, 0, 4.3, 0, new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map: signTexture(name, '', signBg || '#e74c3c', '#ffffff') }));
  sign.position.set(0, 6.2, 3.1);
  g.add(base, roof, sign);
  return g;
}

function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 12, 8), new THREE.MeshLambertMaterial({ color: 0x8a6d3b }));
  trunk.position.set(0, 6, 0);
  const leafM = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = box(0.4, 0.2, 7, 0, Math.sin(a) * 3, 12.5, Math.cos(a) * 3, leafM);
    leaf.rotation.x = a;
    leaf.rotation.z = 0.5;
    g.add(leaf);
  }
  g.add(trunk);
  return g;
}

function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 4, 8), new THREE.MeshLambertMaterial({ color: 0x6b4f2a }));
  trunk.position.set(0, 2, 0);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8), new THREE.MeshLambertMaterial({ color: 0x27ae60 }));
  canopy.position.set(0, 5.5, 0);
  g.add(trunk, canopy);
  return g;
}

function skyColors(hour) {
  if (hour >= 6 && hour < 17.5) return { sky: 0x87ceeb, sun: 0xffffff, sunI: 0.9, amb: 0.55, fog: 0x9fc3e8 };
  if (hour >= 17.5 && hour < 19) return { sky: 0xff9a3c, sun: 0xffd76a, sunI: 0.7, amb: 0.45, fog: 0xe8956a };
  if (hour >= 19 || hour < 5) return { sky: 0x1a2340, sun: 0x9fb4ff, sunI: 0.35, amb: 0.3, fog: 0x2a3550 };
  return { sky: 0xff6b5e, sun: 0xffd76a, sunI: 0.6, amb: 0.4, fog: 0xd95f4e };
}

// Sky gradient: zenith-to-horizon colours per hour bucket, baked once
// into a small canvas texture and cached (the sphere's v axis runs
// pole-to-pole, so the canvas top is the zenith).
function skyGradColors(hour) {
  if (hour >= 6 && hour < 17.5) return ['#3d7ac2', '#bfe3f0'];
  if (hour >= 17.5 && hour < 19) return ['#5a2340', '#ff9a3c'];
  if (hour >= 19 || hour < 5) return ['#05070f', '#2a3550'];
  return ['#7a3a5a', '#ff6b5e'];
}
let skyTexCache = null;
function updateSkyMat(skyMat, hour) {
  const bucket = hour >= 6 && hour < 17.5 ? 'day' : hour >= 17.5 && hour < 19 ? 'dusk' : hour >= 19 || hour < 5 ? 'night' : 'dawn';
  if (!skyTexCache || skyTexCache.bucket !== bucket) {
    const [top, bottom] = skyGradColors(hour);
    const cv = document.createElement('canvas');
    cv.width = 16;
    cv.height = 256;
    const cx = cv.getContext('2d');
    const grad = cx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 16, 256);
    skyTexCache = { bucket, tex: new THREE.CanvasTexture(cv) };
  }
  skyMat.map = skyTexCache.tex;
  skyMat.color.setHex(0xffffff);
  skyMat.needsUpdate = true;
}

export function createScene(container, world) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setSize(1280, 720, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.1, 5000);
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(300, 500, 200);
  scene.add(ambient, sun);
  scene.fog = new THREE.Fog(0x9fc3e8, 400, 2200);
  // Ground.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), new THREE.MeshLambertMaterial({ map: groundTexture() }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);
  // Sky dome: a big gradient sphere that follows the hour.
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 16, 12), skyMat);
  scene.add(sky);
  // Sun disc + clouds.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false }));
  sunDisc.position.set(900, 500, -1400);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const cloudM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
  const clouds = [];
  const cloudSeed = [ [-600, 420, -900, 1.6], [200, 480, -1100, 2.2], [700, 380, 800, 1.4], [-900, 460, 500, 1.8], [100, 520, 1200, 2.0] ];
  for (const [cx, cy, cz, s] of cloudSeed) {
    const cl = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(28 * s, 8, 6), cloudM);
      puff.position.set(i * 30 * s - 30 * s, i % 2 === 0 ? 0 : 8, 0);
      puff.scale.y = 0.45;
      cl.add(puff);
    }
    cl.position.set(cx, cy, cz);
    scene.add(cl);
    clouds.push(cl);
  }
  // Buildings with lit windows.
  const winTex = windowTexture();
  const bColors = [0x9b8a7a, 0x7a8a9b, 0x8a7a6b, 0x6b7a8a, 0xa08a7a, 0x7a9b8a];
  for (let i = 0; i < BUILDINGS.length; i += 1) {
    const b = BUILDINGS[i];
    const mat = new THREE.MeshLambertMaterial({ color: bColors[i % bColors.length], map: winTex });
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    m.position.set(b.x, b.h / 2, b.z);
    scene.add(m);
  }
  // DELTA ARMS shop: building, billboard, yellow door, bench, crates, tree.
  const shopG = new THREE.Group();
  const shopBase = box(60, 26, 30, 0, 0, 13, 0, new THREE.MeshLambertMaterial({ color: 0x2c3e50, map: winTex }));
  const billboard = new THREE.Mesh(new THREE.PlaneGeometry(32, 10), new THREE.MeshBasicMaterial({ map: signTexture('NEON DELTA LA', 'DISTRICT WARS', '#c0392b', '#ffffff') }));
  billboard.position.set(0, 25, 15.2);
  const frontSign = new THREE.Mesh(new THREE.PlaneGeometry(18, 5), new THREE.MeshBasicMaterial({ map: signTexture('DELTA ARMS', 'GUNS · AMMO · 4 TIERS', '#1a5276', '#ffffff') }));
  frontSign.position.set(-20, 10, 15.5);
  const door = box(6, 12, 1, 0, 8, 6, 15.2, new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
  const bench = box(8, 1, 2, 0, 12, 1, 22, new THREE.MeshLambertMaterial({ color: 0x8a6d3b }));
  const benchLeg1 = box(0.6, 1, 1.8, 0, 9, 0.5, 22, new THREE.MeshLambertMaterial({ color: 0x333333 }));
  const benchLeg2 = box(0.6, 1, 1.8, 0, 15, 0.5, 22, new THREE.MeshLambertMaterial({ color: 0x333333 }));
  const crate1 = box(4, 4, 4, 0, 14, 2, 24, new THREE.MeshLambertMaterial({ color: 0x8a6d3b }));
  const crate2 = box(3, 3, 3, 0, 17, 1.5, 25, new THREE.MeshLambertMaterial({ color: 0xa08a5a }));
  const newsbox = box(3, 4, 2, 0, -16, 2, 20, new THREE.MeshLambertMaterial({ color: 0x1a5276 }));
  shopG.add(shopBase, billboard, frontSign, door, bench, benchLeg1, benchLeg2, crate1, crate2, newsbox);
  shopG.position.set(SHOP.x, 0, SHOP.z);
  scene.add(shopG);
  const tree = makeTree();
  tree.position.set(SHOP.x + 28, 0, SHOP.z + 18);
  scene.add(tree);
  // Street trees lining the downtown avenue (shot 1 foreground).
  for (const [tx, tz] of [[-336, -275], [-304, -295], [-336, -320], [-304, -350]]) {
    const st = makeTree();
    st.position.set(tx, 0, tz);
    scene.add(st);
  }
  // Garage sign.
  const garageSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), new THREE.MeshBasicMaterial({ map: signTexture('GARAGE', 'TUNING · NITRO', '#1a5276', '#ffffff') }));
  garageSign.position.set(GARAGE_POS.x, 10, GARAGE_POS.z - 14);
  scene.add(garageSign);
  // Pier: stalls, ferris wheel, palms, string lights, fireworks.
  const stall1 = makeStall('SNO-CONES', 0x1abc9c, '#1abc9c');
  stall1.position.set(-700, 0, 410);
  stall1.rotation.y = Math.PI / 2;
  const stall2 = makeStall('ARCADE', 0x9b59b6, '#9b59b6');
  stall2.position.set(-700, 0, 440);
  stall2.rotation.y = Math.PI / 2;
  const stall3 = makeStall('BALLOONS', 0xe67e22, '#e67e22');
  stall3.position.set(-700, 0, 470);
  stall3.rotation.y = Math.PI / 2;
  scene.add(stall1, stall2, stall3);
  const wheel = makeFerrisWheel();
  wheel.position.set(-760, 0, 470);
  scene.add(wheel);
  for (const [px, pz] of [[-640, 380], [-700, 395], [-770, 380], [-770, 480]]) {
    const palm = makePalm();
    palm.position.set(px, 0, pz);
    scene.add(palm);
  }
  const lightM = new THREE.MeshBasicMaterial({ color: 0xffd76a });
  const stringLights = new THREE.Group();
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), lightM);
    bulb.position.set(-640 - t * 120, 9 + Math.sin(t * Math.PI) * 1.5, 380 + t * 100);
    stringLights.add(bulb);
  }
  scene.add(stringLights);
  const pierLights = [];
  for (const [lx, lz] of [[-700, 400], [-700, 460], [-760, 470]]) {
    const pl = new THREE.PointLight(0xffd76a, 60, 120);
    pl.position.set(lx, 12, lz);
    scene.add(pl);
    pierLights.push(pl);
  }
  const fireworkM = new THREE.PointsMaterial({ color: 0xffd76a, size: 5, transparent: true, opacity: 0.9 });
  const fwGeo = new THREE.BufferGeometry();
  const fwPos = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 12;
    fwPos[i * 3] = -760 + Math.cos(a) * r;
    fwPos[i * 3 + 1] = 45 + Math.random() * 15;
    fwPos[i * 3 + 2] = 470 + Math.sin(a) * r;
  }
  fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3));
  const fireworks = new THREE.Points(fwGeo, fireworkM);
  scene.add(fireworks);
  // Port: containers, crane, boat, bridge.
  const containerColors = [0x27ae60, 0xe74c3c, 0x3498db, 0xf39c12, 0x9b59b6, 0x1abc9c];
  const containerSpots = [[600, 520, 0x27ae60], [560, 540, 0xe74c3c], [640, 560, 0x3498db], [480, 520, 0xf39c12], [520, 580, 0x9b59b6], [660, 600, 0x1abc9c], [440, 580, 0x27ae60], [380, 600, 0xe74c3c], [600, 600, 0xe74c3c], [560, 595, 0x27ae60], [520, 610, 0xf39c12]];
  for (const [cx, cz, cc] of containerSpots) {
    const cont = box(14, 6, 6, 0, cx, 3, cz, new THREE.MeshLambertMaterial({ color: cc }));
    scene.add(cont);
  }
  // Foreground dressing for the shot-4 camera: crates and a small
  // container on the dock apron, breaking up the flat concrete in the
  // lower frame. All on land, clear of the hero car, Mara and the boat.
  const apronCrate1 = box(2.5, 2.5, 2.5, 0, 608, 1.25, 620, new THREE.MeshLambertMaterial({ color: 0x8a6d3b }));
  const apronCrate2 = box(3, 3, 3, 0, 600, 1.5, 624, new THREE.MeshLambertMaterial({ color: 0xa08a5a }));
  const apronBox = box(8, 4, 4, 0, 598, 2, 610, new THREE.MeshLambertMaterial({ color: 0x27ae60 }));
  // Two small crates low in the frame, on the apron right in front of
  // the camera, so the bottom third is not one flat surface.
  const apronCrate3 = box(2, 2, 2, 0, 628, 1, 624, new THREE.MeshLambertMaterial({ color: 0xa08a5a }));
  const apronCrate4 = box(2.5, 2.5, 2.5, 0, 620, 1.25, 628, new THREE.MeshLambertMaterial({ color: 0x8a6d3b }));
  scene.add(apronCrate1, apronCrate2, apronBox, apronCrate3, apronCrate4);
  const crane = makeCrane();
  crane.position.set(CRANE.x, 0, CRANE.z);
  scene.add(crane);
  const boat = makeBoat(2.2);
  boat.position.set(BOAT.x, 0.4, BOAT.z);
  boat.rotation.y = 0.4;
  scene.add(boat);
  const bridge = box(420, 8, 22, 0, 500, 24, 700, new THREE.MeshLambertMaterial({ color: 0x555a60 }));
  scene.add(bridge);
  for (const bx of [350, 450, 550, 650]) {
    const pillar = box(6, 24, 6, 0, bx, 12, 700, new THREE.MeshLambertMaterial({ color: 0x44484d }));
    scene.add(pillar);
  }
  // Night glow discs (street lights) — small emissive spheres.
  const nightDiscs = new THREE.Group();
  const discM = new THREE.MeshBasicMaterial({ color: 0xffd76a });
  const discRng = [ [-560, -280], [-280, 0], [0, 280], [280, 560], [-320, -560], [560, -280], [-560, 280], [0, -560], [280, 0], [-280, 560], [560, 280], [-560, 560], [0, 0], [-320, 280], [280, -560], [-560, 0], [560, 560], [-280, -280], [0, 560], [280, 280], [-560, -560], [560, 0], [-320, 0], [0, -280], [280, -280], [-280, 280], [560, -560], [-320, 560] ];
  for (const [dx, dz] of discRng.slice(0, NIGHT_DISCS)) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 5), discM);
    d.position.set(dx, 8, dz);
    nightDiscs.add(d);
  }
  nightDiscs.visible = false;
  scene.add(nightDiscs);
  // Actors.
  const mara = makeHumanoid(MARA.jacket, 1.8, MARA.backpack);
  scene.add(mara);
  const heroCar = makeCar(0xc0392b, 0x1abc9c);
  scene.add(heroCar);
  const heli = makeHelicopter();
  scene.add(heli);
  const swat = makeSwatVan();
  scene.add(swat);
  const policeCars = [makePoliceCar(), makePoliceCar()];
  for (const pc of policeCars) scene.add(pc);
  const trafficCars = [];
  const trafficColors = [0x95a5a6, 0xe74c3c, 0x7f8c8d, 0x3498db, 0xf1c40f];
  for (let i = 0; i < 6; i += 1) {
    const tc = makeCar(trafficColors[i % trafficColors.length]);
    scene.add(tc);
    trafficCars.push(tc);
  }
  const peds = [];
  const pedShirts = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1, 0x34495e, 0xd35400];
  for (let i = 0; i < 104; i += 1) {
    const p = makeHumanoid(pedShirts[i % pedShirts.length], 1, false);
    scene.add(p);
    peds.push(p);
  }
  // Roadblock barrier.
  const barrier = new THREE.Group();
  const b1 = box(14, 1.5, 1, 0, -4, 0.75, 0, new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
  const b2 = box(14, 1.5, 1, 0, 4, 0.75, 0, new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
  const post1 = box(1, 3, 1, 0, -6.5, 1.5, 0, new THREE.MeshLambertMaterial({ color: 0x333333 }));
  const post2 = box(1, 3, 1, 0, 6.5, 1.5, 0, new THREE.MeshLambertMaterial({ color: 0x333333 }));
  barrier.add(b1, b2, post1, post2);
  scene.add(barrier);

  const api = {
    scene, camera, renderer, world,
    ticks: 0,
    shot: null,
    applyShot(n) {
      const s = SHOTS.find((x) => x.n === n) || SHOTS[0];
      api.shot = s;
      world.frozen = true;
      world.hour = s.hour;
      world.money = s.money;
      world.day = s.day;
      world.wanted.level = s.wanted;
      world.missions.current = s.mission;
      const cols = skyColors(s.hour);
      updateSkyMat(skyMat, s.hour);
      scene.fog.color.setHex(cols.fog);
      ambient.intensity = cols.amb;
      sun.intensity = cols.sunI;
      sun.color.setHex(cols.sun);
      nightDiscs.visible = s.hour >= 19 || s.hour < 5;
      fireworks.visible = s.hour >= 19 || s.hour < 5;
      // Mara.
      if (s.mara) {
        mara.visible = true;
        mara.position.set(s.mara.x, 0, s.mara.z);
        mara.rotation.y = s.mara.angle || 0;
        mara.scale.setScalar(s.mara.scale || 1.8);
      } else {
        mara.visible = false;
      }
      // Hero car.
      if (s.car) {
        heroCar.visible = true;
        heroCar.position.set(s.car.x, 0, s.car.z);
        heroCar.rotation.y = s.car.angle || 0;
        heroCar.scale.setScalar(s.car.scale || 1);
      } else {
        heroCar.visible = false;
      }
      // Helicopter + beam on the car.
      if (s.heli) {
        heli.visible = true;
        heli.position.set(s.heli.x, s.heli.y || 60, s.heli.z);
      } else {
        heli.visible = false;
      }
      // Roadblock + SWAT + police.
      if (s.roadblock) {
        barrier.visible = true;
        barrier.position.set(s.roadblock.x, 0, s.roadblock.z);
      } else barrier.visible = false;
      if (s.swat) {
        swat.visible = true;
        swat.position.set(s.swat.x, 0, s.swat.z);
        swat.rotation.y = 0.3;
      } else swat.visible = false;
      if (s.police) {
        policeCars.forEach((pc, i) => {
          const p = s.police[i % s.police.length];
          pc.visible = true;
          pc.position.set(p.x, 0, p.z);
          pc.rotation.y = 0.2;
        });
      } else {
        policeCars.forEach((pc) => { pc.visible = false; });
      }
      // Traffic cars.
      if (s.traffic) {
        trafficCars.forEach((tc, i) => {
          const t = s.traffic[i % s.traffic.length];
          tc.visible = true;
          tc.position.set(t.x, 0, t.z);
          tc.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
        });
      } else {
        trafficCars.forEach((tc) => { tc.visible = false; });
      }
      // Parked car by the shop.
      if (s.parkedCar) {
        const pc = trafficCars[0];
        pc.visible = true;
        pc.position.set(s.parkedCar.x, 0, s.parkedCar.z);
        pc.rotation.y = s.parkedCar.angle || 0;
      }
      // Boat.
      if (s.boat) {
        boat.visible = true;
        boat.position.set(s.boat.x, 0.4, s.boat.z);
        boat.rotation.y = s.boat.angle || 0;
        boat.scale.setScalar(s.boat.scale || 2.2);
      } else {
        boat.visible = true;
        boat.position.set(BOAT.x, 0.4, BOAT.z);
        boat.rotation.y = 0.4;
        boat.scale.setScalar(2.2);
      }
      // Pedestrians: staged ones first, the rest on the validated grid.
      const staged = (s.peds || []).concat(s.foregroundPeds || []);
      const grid = s.n === 4 ? shot4YardSpots() : (s.n === 2 ? shot2ForecourtSpots() : []);
      peds.forEach((p, i) => {
        if (i < staged.length) {
          p.visible = true;
          p.position.set(staged[i].x, 0, staged[i].z);
          p.rotation.y = Math.PI;
        } else if (grid.length > 0) {
          const spot = grid[(i - staged.length) % grid.length];
          p.visible = true;
          p.position.set(spot.x, 0, spot.z);
          p.rotation.y = (i * 0.7) % (Math.PI * 2);
        } else if (s.n === 3) {
          // Pier shot: extra peds stay on the deck.
          p.visible = true;
          p.position.set(-640 - (i % 8) * 12, 0, 380 + ((i * 7) % 110));
          p.rotation.y = (i * 0.5) % (Math.PI * 2);
        } else {
          p.visible = i < 20;
          if (p.visible) {
            p.position.set(-560 + (i % 10) * 40, 0, -200 + Math.floor(i / 10) * 60);
            p.rotation.y = (i * 0.9) % (Math.PI * 2);
          }
        }
      });
      // Camera.
      camera.position.set(s.camera.x, s.camera.y, s.camera.z);
      camera.lookAt(s.look.x, s.look.y, s.look.z);
      camera.updateProjectionMatrix();
    },
    update(dt, now) {
      const cols = skyColors(world.hour);
      updateSkyMat(skyMat, world.hour);
      scene.fog.color.setHex(cols.fog);
      ambient.intensity = cols.amb;
      sun.intensity = cols.sunI;
      if (api.shot) {
        // Frozen diorama: only the wheel, the rotors and the fireworks move.
        if (wheel.userData.wheel) wheel.userData.wheel.rotation.z += dt * 0.15;
        if (heli.userData.rotor) heli.userData.rotor.rotation.y += dt * 12;
        fireworks.material.opacity = 0.5 + 0.5 * Math.sin(now * 0.004);
      } else {
        // Free-roam follow camera.
        const car = world.car;
        const behind = 14;
        const cx = car.x - Math.sin(car.angle) * behind;
        const cz = car.z - Math.cos(car.angle) * behind;
        camera.position.set(cx, 7, cz);
        camera.lookAt(car.x + Math.sin(car.angle) * 20, 1.5, car.z + Math.cos(car.angle) * 20);
        heroCar.position.set(car.x, 0, car.z);
        heroCar.rotation.y = car.angle;
        mara.visible = world.player.onFoot;
        if (world.player.onFoot) {
          mara.position.set(world.player.x, 0, world.player.z);
          mara.rotation.y = world.player.angle;
        }
        heli.visible = !!world.police.heli;
        if (world.police.heli) {
          heli.position.set(world.police.heli.x, 60, world.police.heli.z);
          heli.userData.rotor.rotation.y += dt * 12;
        }
        swat.visible = !!world.police.swat;
        if (world.police.swat) swat.position.set(world.police.swat.x, 0, world.police.swat.z);
        world.police.cars.forEach((c, i) => {
          if (policeCars[i]) {
            policeCars[i].visible = true;
            policeCars[i].position.set(c.x, 0, c.z);
            policeCars[i].rotation.y = c.angle;
          }
        });
        world.traffic.cars.forEach((c, i) => {
          if (trafficCars[i]) {
            trafficCars[i].visible = true;
            trafficCars[i].position.set(c.x, 0, c.z);
            trafficCars[i].rotation.y = c.angle;
          }
        });
        world.traffic.peds.forEach((p, i) => {
          if (peds[i]) {
            peds[i].visible = true;
            peds[i].position.set(p.x, 0, p.z);
            peds[i].rotation.y = p.angle;
          }
        });
        nightDiscs.visible = world.hour >= 19 || world.hour < 5;
        fireworks.visible = world.hour >= 19 || world.hour < 5;
        if (wheel.userData.wheel) wheel.userData.wheel.rotation.z += dt * 0.15;
      }
      for (const cl of clouds) cl.position.x += dt * 2;
      renderer.render(scene, camera);
      api.ticks += 1;
    },
  };
  return api;
}
