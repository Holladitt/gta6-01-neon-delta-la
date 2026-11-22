// Three.js scene: ember-dusk city, pier, port, cars, crowd. Browser only.
// Performance rules: one canvas ground texture, Lambert materials, no
// shadows, no antialiasing, fixed 1280x720 buffer, few point lights.
import * as THREE from '../vendor/three.module.min.js';
import { buildings, AVENUES, STREETS } from './geo.js';
import { BOAT, CRANE, SHOP, PIER_DECK, GARAGE_POS, DISTRICTS } from './config.js';
import { phaseFor, daylightFactor } from './lights.js';

const WORLD = 1560;
const HALF = 780;
function wx(x) { return ((x + HALF) / WORLD); }
function wz(z) { return ((z + HALF) / WORLD); }

// --- Canvas texture helpers ---
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function canvasTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

// Ground: ocean base, land, port yard asphalt, roads + sidewalks,
// lane dashes, zebra crossings, plaza tiles, wet-sand band.
function buildGroundTexture() {
  const S = 2048;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d');
  const px = (x) => wx(x) * S;
  const py = (z) => wz(z) * S;
  const sx = (m) => (m / WORLD) * S;
  // Ocean base.
  g.fillStyle = '#0d3a4a';
  g.fillRect(0, 0, S, S);
  // Subtle wave streaks in the water.
  g.strokeStyle = 'rgba(120, 200, 220, 0.12)';
  g.lineWidth = 2;
  for (let i = 0; i < 120; i += 1) {
    const y = Math.random() * S;
    const x = Math.random() * S;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 40 + Math.random() * 80, y);
    g.stroke();
  }
  // Main landmass.
  g.fillStyle = '#5a6b46';
  g.fillRect(px(-620), py(-780), sx(1400), sx(1400));
  // Dock strip (port, x>=600, z<=660).
  g.fillStyle = '#5a6b46';
  g.fillRect(px(600), py(620), sx(180), sx(40));
  // City blocks: warm pavement inside each block.
  g.fillStyle = '#7a6f52';
  const BLOCKS = [-440, -200, 40, 280, 520];
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      g.fillRect(px(bx - 110), py(bz - 110), sx(220), sx(220));
    }
  }
  // Port yard asphalt (dark) — drawn after the blocks so the yard stays dark.
  g.fillStyle = '#33343a';
  g.fillRect(px(360), py(260), sx(420), sx(400));
  // Wet-sand band along the coasts.
  g.fillStyle = '#8a7a52';
  g.fillRect(px(-640), py(-780), sx(20), sx(1400));
  g.fillRect(px(-620), py(600), sx(1400), sx(20));
  // Roads: sidewalk first (light), then asphalt.
  function roadRect(x0, z0, x1, z1) {
    g.fillStyle = '#9a8f74';
    g.fillRect(px(x0 - 4), py(z0 - 4), sx(x1 - x0 + 8), sx(z1 - z0 + 8));
    g.fillStyle = '#2c2d31';
    g.fillRect(px(x0), py(z0), sx(x1 - x0), sx(z1 - z0));
  }
  for (const ax of AVENUES) roadRect(ax - 12, -780, ax + 12, 660);
  for (const sz of STREETS) roadRect(-620, sz - 12, 780, sz + 12);
  // Lane dashes (centre lines).
  g.strokeStyle = 'rgba(255, 210, 90, 0.85)';
  g.lineWidth = sx(1.2);
  g.setLineDash([sx(8), sx(10)]);
  for (const ax of AVENUES) {
    g.beginPath(); g.moveTo(px(ax), py(-780)); g.lineTo(px(ax), py(620)); g.stroke();
  }
  for (const sz of STREETS) {
    g.beginPath(); g.moveTo(px(-620), py(sz)); g.lineTo(px(780), py(sz)); g.stroke();
  }
  g.setLineDash([]);
  // Zebra crossings at every intersection.
  g.fillStyle = 'rgba(245, 245, 240, 0.9)';
  for (const ax of AVENUES) {
    for (const sz of STREETS) {
      for (let i = -2; i <= 2; i += 1) {
        g.fillRect(px(ax + i * 4.5 - 1.2), py(sz - 18), sx(2.4), sx(5));
        g.fillRect(px(ax + i * 4.5 - 1.2), py(sz + 13), sx(2.4), sx(5));
        g.fillRect(px(ax - 18), py(sz + i * 4.5 - 1.2), sx(5), sx(2.4));
        g.fillRect(px(ax + 13), py(sz + i * 4.5 - 1.2), sx(5), sx(2.4));
      }
    }
  }
  // Plaza tiles (checkerboard) at the pier entrance + port gate.
  function plaza(x0, z0, x1, z1) {
    const T = 16;
    for (let x = x0; x < x1; x += T) {
      for (let z = z0; z < z1; z += T) {
        const even = (Math.round((x - x0) / T) + Math.round((z - z0) / T)) % 2 === 0;
        g.fillStyle = even ? '#8a7f66' : '#6b6250';
        g.fillRect(px(x), py(z), sx(T), sx(T));
      }
    }
  }
  plaza(-620, 280, -540, 360);
  plaza(360, 260, 440, 340);
  // Warm terracotta plaza tiles on the DELTA ARMS forecourt so the
  // shop foreground reads warm, not flat tan.
  for (let x = -380; x < -260; x += 16) {
    for (let z = -230; z < -140; z += 16) {
      const even = (Math.round((x + 380) / 16) + Math.round((z + 230) / 16)) % 2 === 0;
      g.fillStyle = even ? '#a8763e' : '#8a5a30';
      g.fillRect(px(x), py(z), sx(16), sx(16));
    }
  }
  // Re-paint the ocean over anything that spilled into the water.
  g.fillStyle = '#0d3a4a';
  g.fillRect(px(-780), py(-780), sx(160), sx(1560));
  g.fillRect(px(-620), py(620), sx(1220), sx(160));
  g.fillRect(px(600), py(660), sx(180), sx(120));
  return canvasTexture(c);
}

// Sky gradient (ember horizon -> purple -> deep blue).
function buildSkyTexture() {
  const c = makeCanvas(16, 512);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1a2340');
  grad.addColorStop(0.35, '#4a2a55');
  grad.addColorStop(0.55, '#a34a3a');
  grad.addColorStop(0.72, '#e8703a');
  grad.addColorStop(0.85, '#f5a03c');
  grad.addColorStop(1, '#ffd34d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 512);
  return canvasTexture(c);
}
// Building facade: storeys of windows, some lit warm.
function buildFacadeTexture(rows, litRatio) {
  const c = makeCanvas(128, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#3a3f4a';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, 128, 10);
  const cols = 4;
  const rh = 256 / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let col = 0; col < cols; col += 1) {
      const lit = ((r * 7 + col * 3) % 10) < Math.round(litRatio * 10);
      g.fillStyle = lit ? '#ffd34d' : '#1c2230';
      if (lit) {
        g.shadowColor = '#ff9a3c';
        g.shadowBlur = 8;
      } else {
        g.shadowBlur = 0;
      }
      g.fillRect(10 + col * 30, 14 + r * rh, 18, Math.min(18, rh - 8));
      g.shadowBlur = 0;
    }
  }
  return canvasTexture(c);
}
// Text sign (billboard / stall / shop).
function buildSignTexture(text, sub, bg, fg, w, h) {
  const c = makeCanvas(w || 512, h || 128);
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(6, 6, c.width - 12, c.height - 12);
  g.fillStyle = fg;
  g.font = 'bold ' + Math.floor(c.height * 0.42) + 'px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, sub ? c.height * 0.38 : c.height * 0.5);
  if (sub) {
    g.font = 'bold ' + Math.floor(c.height * 0.2) + 'px Arial, sans-serif';
    g.fillText(sub, c.width / 2, c.height * 0.74);
  }
  return canvasTexture(c);
}

// --- Static world ---
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(1280, 720, false);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a1a2e, 400, 1700);
  const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.1, 4200);

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x2a1a2e, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff9a3c, 1.4);
  sun.position.set(-500, 200, -300);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x4a6a9a, 0.35);
  fill.position.set(400, 300, 400);
  scene.add(fill);

  // Sky dome + low sun disc in the west.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1900, 24, 16),
    new THREE.MeshBasicMaterial({ map: buildSkyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(70, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, fog: false }),
  );
  sunDisc.position.set(-1500, 130, 250);
  sunDisc.lookAt(0, 60, 0);
  scene.add(sunDisc);

  // Ground (one canvas texture).
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshLambertMaterial({ map: buildGroundTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // --- Buildings (per-storey facades, lit windows baked in) ---
  const facadeShort = buildFacadeTexture(4, 0.45);
  const facadeMid = buildFacadeTexture(8, 0.5);
  const facadeTall = buildFacadeTexture(14, 0.55);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x2a2d33 });
  const blds = buildings();
  for (const b of blds) {
    const tex = b.h > 55 ? facadeTall : b.h > 25 ? facadeMid : facadeShort;
    const side = new THREE.MeshLambertMaterial({ map: tex });
    const mats = [side, side, roofMat, roofMat, side, side];
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mats);
    m.position.set(b.x, b.h / 2, b.z);
    scene.add(m);
    // Rooftop beacon on the tallest towers.
    if (b.h > 60) {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff5a4e }),
      );
      beacon.position.set(b.x, b.h + 2, b.z);
      scene.add(beacon);
    }
  }

  // --- Coral Pier: wooden deck, stalls, string lights, ferris wheel ---
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x9a7a50 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(160, 1.2, 140), deckMat);
  deck.position.set(-700, 0.6, 430);
  scene.add(deck);
  // Deck plank lines (thin dark strips).
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x6b4f2e });
  for (let i = 0; i < 9; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(160, 0.2, 1), plankMat);
    plank.position.set(-700, 1.25, 368 + i * 16);
    scene.add(plank);
  }
  // Stalls with readable signs. All four sit close to the pier's
  // centre line (z 408-450) so every sign reads whole from the
  // shot-3 camera — nothing cut at a frame edge.
  const stallDefs = [
    { x: -668, z: 408, name: 'BALLOONS', color: 0xe74c3c },
    { x: -668, z: 424, name: 'ARCADE', color: 0x2e86c1 },
    { x: -668, z: 448, name: 'SNO-CONES', color: 0x17a589 },
    { x: -728, z: 412, name: 'COTTON CANDY', color: 0xe91e63 },
    { x: -730, z: 450, name: 'RING TOSS', color: 0xf39c12 },
  ];
  const stallGroup = new THREE.Group();
  for (const s of stallDefs) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), new THREE.MeshLambertMaterial({ color: s.color }));
    base.position.set(s.x, 3.7, s.z);
    stallGroup.add(base);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 9), new THREE.MeshLambertMaterial({ color: 0xf5f0e0 }));
    awn.position.set(s.x, 6.6, s.z);
    stallGroup.add(awn);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 3),
      new THREE.MeshBasicMaterial({ map: buildSignTexture(s.name, '', '#1a1a22', '#ffd34d', 512, 128) }),
    );
    sign.position.set(s.x, 8.6, s.z);
    sign.rotation.y = Math.PI / 2;
    stallGroup.add(sign);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd34d }),
    );
    lamp.position.set(s.x, 7.4, s.z);
    stallGroup.add(lamp);
  }
  scene.add(stallGroup);
  // String lights over the deck (catenary of glowing bulbs). Three
  // rows — the middle row crosses the shot-3 camera's view line so
  // the lights read clearly overhead — with a dark wire above them.
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const bulbGeo = new THREE.SphereGeometry(0.7, 6, 5);
  const wireMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  for (let row = 0; row < 3; row += 1) {
    const z0 = 408 + row * 20;
    const wire = new THREE.Mesh(new THREE.BoxGeometry(162, 0.25, 0.25), wireMat);
    wire.position.set(-695, 12.6, z0);
    scene.add(wire);
    for (let i = 0; i <= 16; i += 1) {
      const x = -775 + i * 10;
      const sag = Math.sin((i / 16) * Math.PI) * -2.5;
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(x, 11 + sag, z0);
      scene.add(bulb);
    }
  }
  // Warm light pools on the deck (the pier reads bright at night).
  // Spread across the whole deck so there is no dark deck between
  // the pools.
  const deckPoolGeo = new THREE.CircleGeometry(7, 20);
  const deckPoolMat = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.38, depthWrite: false });
  for (const [dx, dz] of [[-660, 415], [-660, 440], [-655, 420], [-655, 438], [-648, 425], [-648, 435], [-700, 415], [-700, 445], [-680, 430], [-720, 415], [-720, 445], [-740, 430], [-640, 415], [-640, 445], [-680, 405], [-680, 455], [-700, 395], [-700, 465], [-660, 400], [-660, 460]]) {
    const pool = new THREE.Mesh(deckPoolGeo, deckPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(dx, 1.35, dz);
    scene.add(pool);
  }
  // Ferris wheel (landmark, west end of the pier). The wheel faces east
  // so it reads face-on from the pier; it spins about its axle (X).
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(-730, 0, 430);
  const wheelSpin = new THREE.Group();
  wheelSpin.position.y = 42;
  wheelGroup.add(wheelSpin);
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(34, 1.6, 8, 48),
    new THREE.MeshLambertMaterial({ color: 0xd35400 }),
  );
  wheelRim.rotation.y = Math.PI / 2;
  wheelSpin.add(wheelRim);
  // Glowing rim so the wheel reads at dusk/night.
  const wheelGlow = new THREE.Mesh(
    new THREE.TorusGeometry(34, 0.7, 6, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd34d }),
  );
  wheelGlow.rotation.y = Math.PI / 2;
  wheelSpin.add(wheelGlow);
  const wheelInner = new THREE.Mesh(
    new THREE.TorusGeometry(20, 1, 8, 40),
    new THREE.MeshLambertMaterial({ color: 0xe67e22 }),
  );
  wheelInner.rotation.y = Math.PI / 2;
  wheelSpin.add(wheelInner);
  const spokeMat = new THREE.MeshLambertMaterial({ color: 0x7e5109 });
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(1, 68, 1), spokeMat);
    spoke.rotation.x = a;
    wheelSpin.add(spoke);
  }
  const gondolaMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
  const gondolaLight = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const g = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 4), gondolaMat);
    g.position.set(0, Math.sin(a) * 34, Math.cos(a) * 34);
    wheelSpin.add(g);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), gondolaLight);
    gl.position.set(0, Math.sin(a) * 34 + 2.5, Math.cos(a) * 34);
    wheelSpin.add(gl);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  wheelSpin.add(hub);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 46, 2), legMat);
    leg.position.set(0, 21, s * 12);
    leg.rotation.x = s * 0.28;
    wheelGroup.add(leg);
  }
  scene.add(wheelGroup);
  // Confetti burst near the wheel.
  const confettiCount = 260;
  const confettiPos = new Float32Array(confettiCount * 3);
  const confettiCol = new Float32Array(confettiCount * 3);
  const confettiPalette = [[1, 0.3, 0.3], [1, 0.8, 0.2], [0.2, 0.7, 1], [0.4, 1, 0.5], [1, 0.4, 0.8]];
  for (let i = 0; i < confettiCount; i += 1) {
    confettiPos[i * 3] = -760 + Math.random() * 70;
    confettiPos[i * 3 + 1] = 4 + Math.random() * 46;
    confettiPos[i * 3 + 2] = 395 + Math.random() * 70;
    const p = confettiPalette[i % confettiPalette.length];
    confettiCol[i * 3] = p[0];
    confettiCol[i * 3 + 1] = p[1];
    confettiCol[i * 3 + 2] = p[2];
  }
  const confettiGeo = new THREE.BufferGeometry();
  confettiGeo.setAttribute('position', new THREE.BufferAttribute(confettiPos, 3));
  confettiGeo.setAttribute('color', new THREE.BufferAttribute(confettiCol, 3));
  const confetti = new THREE.Points(confettiGeo, new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.95 }));
  scene.add(confetti);

  // --- Long Beach Port: crane, containers, freeway bridge, boat ---
  const craneGroup = new THREE.Group();
  craneGroup.position.set(CRANE.x, 0, CRANE.z);
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
  const craneDark = new THREE.MeshLambertMaterial({ color: 0x7e5109 });
  for (const sx of [-14, 14]) {
    for (const sz of [-10, 10]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3, 38, 3), craneMat);
      leg.position.set(sx, 19, sz);
      craneGroup.add(leg);
    }
  }
  const craneTop = new THREE.Mesh(new THREE.BoxGeometry(34, 4, 26), craneMat);
  craneTop.position.set(0, 40, 0);
  craneGroup.add(craneTop);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(70, 3, 3), craneDark);
  jib.position.set(30, 44, 0);
  craneGroup.add(jib);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 16, 6), craneDark);
  cable.position.set(58, 36, 0);
  craneGroup.add(cable);
  const load = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 8), new THREE.MeshLambertMaterial({ color: 0x2e86c1 }));
  load.position.set(58, 24, 0);
  craneGroup.add(load);
  const craneLight = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  craneLight.position.set(58, 44, 0);
  craneGroup.add(craneLight);
  scene.add(craneGroup);
  // Containers (stacks, varied colours).
  const containerCols = [0xc0392b, 0x2e86c1, 0x17a589, 0xf39c12, 0x7d3c98, 0x1e8449];
  const rngC = (function () { let s = 777; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();
  for (let i = 0; i < 26; i += 1) {
    const cx = 420 + rngC() * 220;
    const cz = 300 + rngC() * 260;
    if (Math.abs(cx - 620) < 30 && Math.abs(cz - 596) < 30) continue;
    const stack = 1 + Math.floor(rngC() * 3);
    for (let s = 0; s < stack; s += 1) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(14, 5, 6),
        new THREE.MeshLambertMaterial({ color: containerCols[Math.floor(rngC() * containerCols.length)] }),
      );
      box.position.set(cx, 2.5 + s * 5, cz);
      box.rotation.y = (rngC() - 0.5) * 0.2;
      scene.add(box);
    }
  }
  // Freeway bridge (elevated, on pillars) across the port.
  const bridgeMat = new THREE.MeshLambertMaterial({ color: 0x4a4d55 });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(420, 2.5, 18), bridgeMat);
  bridge.position.set(480, 16, 300);
  scene.add(bridge);
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x3a3d44 });
  for (let i = 0; i < 7; i += 1) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(4, 16, 4), pillarMat);
    pillar.position.set(300 + i * 60, 8, 300);
    scene.add(pillar);
  }
  // Apron dressing near the dock edge (crates, barrels, a light pool)
  // so the port foreground is never empty asphalt.
  const apronMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  for (const [ax, az, s] of [[608, 620, 2.4], [600, 624, 2], [598, 610, 1.8], [628, 624, 2.2], [620, 628, 2]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), apronMat);
    crate.position.set(ax, s / 2, az);
    crate.rotation.y = 0.4;
    scene.add(crate);
  }
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0x2e86c1 });
  for (const [bx, bz] of [[612, 616], [604, 628], [624, 612]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 8), barrelMat);
    barrel.position.set(bx, 1.1, bz);
    scene.add(barrel);
  }
  const apronPool = new THREE.Mesh(new THREE.CircleGeometry(8, 20), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.25, depthWrite: false }));
  apronPool.rotation.x = -Math.PI / 2;
  apronPool.position.set(614, 0.15, 620);
  scene.add(apronPool);
  // Drivable boat (amber hull, teal cabin, wooden mast). The hull is
  // tapered at both ends; the sails are big white triangles in the
  // fore-aft plane (face east/west) so the boat reads unmistakably
  // as a sailboat from the port camera.
  const boatGroup = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 2.5, 16), new THREE.MeshLambertMaterial({ color: 0xd35400 }));
  hull.position.y = 1;
  boatGroup.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(3.5, 6, 4), new THREE.MeshLambertMaterial({ color: 0xd35400 }));
  bow.rotation.x = Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 1, 10);
  boatGroup.add(bow);
  const stern = new THREE.Mesh(new THREE.ConeGeometry(3.5, 5, 4), new THREE.MeshLambertMaterial({ color: 0xd35400 }));
  stern.rotation.x = -Math.PI / 2;
  stern.rotation.y = Math.PI / 4;
  stern.position.set(0, 1, -9.5);
  boatGroup.add(stern);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 6), new THREE.MeshLambertMaterial({ color: 0x17a589 }));
  cabin.position.set(0, 3.5, -1);
  boatGroup.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 12, 6), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
  mast.position.set(0, 8, 1);
  boatGroup.add(mast);
  const sailMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e0, side: THREE.DoubleSide });
  function triSail(v0, v1, v2) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]], 3));
    g.computeVertexNormals();
    return new THREE.Mesh(g, sailMat);
  }
  // Mainsail: mast luff, boom foot to the stern.
  boatGroup.add(triSail([0, 2, 1], [0, 14, 1], [0, 2, -7]));
  // Jib: masthead down to the bow.
  boatGroup.add(triSail([0, 13, 1], [0, 2, 1], [0, 2, 8]));
  boatGroup.position.set(BOAT.x, 0.4, BOAT.z);
  scene.add(boatGroup);

  // --- DELTA ARMS shop + TIDE BOOKS billboard ---
  const shopGroup = new THREE.Group();
  shopGroup.position.set(SHOP.x, 0, SHOP.z);
  const shopBase = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 16), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  shopBase.position.y = 6;
  shopGroup.add(shopBase);
  // Shop front: warm stone wall (not a black slab) with two lit
  // display windows, a framed door, pilasters, a cornice band and a
  // red awning — real depth, not a flat box.
  const shopFront = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 1), new THREE.MeshLambertMaterial({ color: 0x6b5a44 }));
  shopFront.position.set(0, 4, 8.5);
  shopGroup.add(shopFront);
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x2a2118 });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  for (const wx of [-9, 9]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(7.6, 5.1, 0.3), frameMat);
    frame.position.set(wx, 3.5, 9);
    shopGroup.add(frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.5), glassMat);
    glass.position.set(wx, 3.5, 9.2);
    shopGroup.add(glass);
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 0.15), frameMat);
    mullion.position.set(wx, 3.5, 9.3);
    shopGroup.add(mullion);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 0.4), frameMat);
    shelf.position.set(wx, 2.2, 9.3);
    shopGroup.add(shelf);
  }
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 7.6, 0.3), frameMat);
  doorFrame.position.set(0, 3.8, 9);
  shopGroup.add(doorFrame);
  const step = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.4, 2), new THREE.MeshLambertMaterial({ color: 0x8a7f66 }));
  step.position.set(0, 0.2, 9.6);
  shopGroup.add(step);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(32, 0.5, 3.4), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  awning.position.set(0, 7.6, 10);
  awning.rotation.x = -0.28;
  shopGroup.add(awning);
  const awningEdge = new THREE.Mesh(new THREE.BoxGeometry(32, 0.4, 0.3), new THREE.MeshLambertMaterial({ color: 0xf5f0e0 }));
  awningEdge.position.set(0, 7.1, 11.6);
  shopGroup.add(awningEdge);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(30, 0.8, 1.4), new THREE.MeshLambertMaterial({ color: 0xf5f0e0 }));
  cornice.position.set(0, 8.4, 8.9);
  shopGroup.add(cornice);
  for (const px of [-14.5, 14.5]) {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 1.2), new THREE.MeshLambertMaterial({ color: 0xf5f0e0 }));
    pilaster.position.set(px, 4, 8.9);
    shopGroup.add(pilaster);
  }
  const shopSign = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 4.5),
    new THREE.MeshBasicMaterial({ map: buildSignTexture('DELTA ARMS', 'GUNS • AMMO • GEAR', '#1a1a22', '#ffd34d', 1024, 176) }),
  );
  shopSign.position.set(0, 10.5, 9);
  shopGroup.add(shopSign);
  const doorLight = new THREE.Mesh(new THREE.PlaneGeometry(4, 7), new THREE.MeshBasicMaterial({ color: 0xffd34d }));
  doorLight.position.set(0, 3.5, 9.1);
  shopGroup.add(doorLight);
  scene.add(shopGroup);
  // TIDE BOOKS billboard on the building behind the shop.
  const billboard = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 16),
    new THREE.MeshBasicMaterial({ map: buildSignTexture('TIDE BOOKS', 'READ THE CITY', '#0e2a3a', '#7fd4ff', 1024, 384) }),
  );
  billboard.position.set(SHOP.x, 26, SHOP.z - 24);
  scene.add(billboard);
  const billboardPole = new THREE.Mesh(new THREE.BoxGeometry(2, 18, 2), new THREE.MeshLambertMaterial({ color: 0x3a3d44 }));
  billboardPole.position.set(SHOP.x, 9, SHOP.z - 24);
  scene.add(billboardPole);

  // --- Street props: lamps, palms, benches, crates, bins ---
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2c2d31 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const poolGeo = new THREE.CircleGeometry(7, 20);
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.22, depthWrite: false });
  const lampPositions = [];
  for (const ax of AVENUES) {
    for (let z = -700; z <= 600; z += 280) lampPositions.push([ax + 14, z]);
  }
  for (const sz of STREETS) {
    for (let x = -560; x <= 640; x += 280) lampPositions.push([x, sz + 14]);
  }
  let lampIdx = 0;
  for (const [lx, lz] of lampPositions) {
    if (lx < -620 || lz > 620) continue;
    lampIdx += 1;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 9, 6), lampMat);
    pole.position.set(lx, 4.5, lz);
    scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), lampGlowMat);
    bulb.position.set(lx, 9.2, lz);
    scene.add(bulb);
    if (lampIdx % 3 === 0) {
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(lx, 0.15, lz);
      scene.add(pool);
    }
  }
  // Palms along the marina + pier approach (kept clear of the shot
  // cameras: the western avenue, the shop forecourt, the pier deck).
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4f2e });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x1e8449 });
  const palmSpots = [
    [-120, -140], [100, -140], [320, -140], [540, -140],
    [-120, 260], [100, 260], [320, 260], [540, 260],
    [-440, 260], [-440, -140], [160, 620], [400, 620],
  ];
  for (let i = 0; i < palmSpots.length; i += 1) {
    const pxm = palmSpots[i][0];
    const pzm = palmSpots[i][1];
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 12, 6), trunkMat);
    trunk.position.set(pxm, 6, pzm);
    trunk.rotation.z = (i % 3 - 1) * 0.08;
    scene.add(trunk);
    for (let f = 0; f < 4; f += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 4), frondMat);
      const a = (f / 4) * Math.PI * 2;
      frond.position.set(pxm + Math.cos(a) * 2.4, 12.5, pzm + Math.sin(a) * 2.4);
      frond.rotation.z = Math.cos(a) * 0.9;
      frond.rotation.x = -Math.sin(a) * 0.9;
      scene.add(frond);
    }
  }
  // Forecourt props at the shop (bench, crates, newspaper box, bin).
  const propGroup = new THREE.Group();
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x7e5109 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 1.6), benchMat);
  bench.position.set(-335, 1, -168);
  propGroup.add(bench);
  for (const bx of [-337.5, -332.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 1.4), benchMat);
    leg.position.set(bx, 0.5, -168);
    propGroup.add(leg);
  }
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  for (const [cx, cz, s] of [[-348, -175, 2.4], [-345, -172, 2], [-348, -172, 1.6], [-306, -175, 2.2]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(cx, s / 2, cz);
    crate.rotation.y = 0.3;
    propGroup.add(crate);
  }
  const newsMat = new THREE.MeshLambertMaterial({ color: 0x2e86c1 });
  const news = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 1.2), newsMat);
  news.position.set(-312, 1.3, -176);
  propGroup.add(news);
  const binMat = new THREE.MeshLambertMaterial({ color: 0x3a3d44 });
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 8), binMat);
  bin.position.set(-340, 1.1, -150);
  propGroup.add(bin);
  // Vendor stall + flower cart in the mid-foreground, flanking Mara,
  // so the ground between the camera and the shop is never empty tan.
  const stallBase = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 3), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  stallBase.position.set(-344, 1.2, -168);
  propGroup.add(stallBase);
  const stallAwn = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 3.6), new THREE.MeshLambertMaterial({ color: 0xf5f0e0 }));
  stallAwn.position.set(-344, 2.8, -168);
  stallAwn.rotation.x = -0.15;
  propGroup.add(stallAwn);
  const cartBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.6), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
  cartBase.position.set(-314, 0.8, -170);
  propGroup.add(cartBase);
  const cartTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.8), new THREE.MeshLambertMaterial({ color: 0xe91e63 }));
  cartTop.position.set(-314, 1.8, -170);
  propGroup.add(cartTop);
  scene.add(propGroup);
  // Garage sign (GARAGE_POS).
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshBasicMaterial({ map: buildSignTexture('GARAGE', 'TUNING • REPAIR', '#1a1a22', '#ffd34d', 512, 128) }),
  );
  garageSign.position.set(GARAGE_POS.x, 8, GARAGE_POS.z);
  garageSign.rotation.y = Math.PI;
  scene.add(garageSign);

  // --- Clouds (one shared material, unlit so they stay warm at dusk) ---
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffc490 });
  const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
  const clouds = [];
  for (let i = 0; i < 18; i += 1) {
    const cl = new THREE.Mesh(cloudGeo, cloudMat);
    const s = 30 + (i % 5) * 18;
    cl.scale.set(s, s * 0.22, s * 0.6);
    cl.position.set(-1200 + (i * 137) % 2400, 180 + (i % 4) * 40, -900 + (i * 211) % 1800);
    scene.add(cl);
    clouds.push(cl);
  }
  const emberCount = 320;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i += 1) {
    emberPos[i * 3] = -700 + Math.random() * 1400;
    emberPos[i * 3 + 1] = Math.random() * 60;
    emberPos[i * 3 + 2] = -700 + Math.random() * 1400;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({ color: 0xff9a3c, size: 1.8, transparent: true, opacity: 0.8 });
  const embers = new THREE.Points(emberGeo, emberMat);
  scene.add(embers);

  return { renderer, scene, camera, sky, sunDisc, clouds, cloudMat, embers, confetti, wheelGroup, wheelSpin, boatGroup, hemi, sun };
}

// --- Dynamic objects + per-frame update ---
const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf39c12, 0x7d3c98, 0x1e8449, 0x95a5a6];
const PED_JACKETS = [0xc0392b, 0x2e86c1, 0xf39c12, 0x7d3c98, 0x1e8449, 0x8a6a42, 0x5d6d7e, 0xe67e22];
function buildCarMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4.6), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.6;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.4), new THREE.MeshLambertMaterial({ color: 0x1a2233 }));
  cabin.position.set(0, 1.3, -0.3);
  g.add(cabin);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const s of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), hlMat);
    hl.position.set(s, 0.6, 2.35);
    g.add(hl);
  }
  return g;
}
function buildPoliceMesh() {
  const g = buildCarMesh(0x1a1a1a);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.3, 4.62), new THREE.MeshLambertMaterial({ color: 0xf5f0e0 }));
  stripe.position.y = 0.75;
  g.add(stripe);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
  bar.position.set(0, 1.85, -0.3);
  g.add(bar);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.26, 0.52), new THREE.MeshBasicMaterial({ color: 0x2a5aff }));
  bar2.position.set(0.45, 1.85, -0.3);
  g.add(bar2);
  return g;
}
function buildSwatMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 6.5), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  body.position.y = 1.5;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 1.6), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  cab.position.set(0, 1.1, 3.6);
  g.add(cab);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.8),
    new THREE.MeshBasicMaterial({ map: buildSignTexture('SWAT', '', '#1a1a1a', '#f5f0e0', 256, 80) }),
  );
  sign.position.set(0, 1.8, 3.28);
  sign.rotation.y = Math.PI;
  g.add(sign);
  return g;
}
function buildPedMesh(jacketColor, scale, job) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4), new THREE.MeshLambertMaterial({ color: jacketColor }));
  body.position.y = 1.1;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe8b48c }));
  head.position.y = 1.95;
  g.add(head);
  if (job === 'vendor') {
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    cart.position.set(0.9, 0.45, 0);
    g.add(cart);
  } else if (job === 'fisherman') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 5), new THREE.MeshLambertMaterial({ color: 0x6b4f2e }));
    rod.position.set(0.5, 1.6, 0.4);
    rod.rotation.z = -0.5;
    g.add(rod);
  } else if (job === 'dockworker') {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshLambertMaterial({ color: 0x8a6a42 }));
    crate.position.set(0, 1.4, 0.5);
    g.add(crate);
  } else if (job === 'tourist') {
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cam.position.set(0, 1.5, 0.3);
    g.add(cam);
  }
  g.scale.setScalar(scale);
  return g;
}
function buildMaraMesh(scale) {
  const g = buildPedMesh(0xe74c3c, scale, null);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  legs.position.y = 0.45;
  g.add(legs);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.25), new THREE.MeshLambertMaterial({ color: 0x2e86c1 }));
  pack.position.set(0, 1.25, -0.32);
  g.add(pack);
  return g;
}
function buildHeliMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 6.5), new THREE.MeshLambertMaterial({ color: 0x1a3a5a }));
  body.position.y = 0;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 4), new THREE.MeshLambertMaterial({ color: 0x1a3a5a }));
  tail.position.set(0, 0.3, -5);
  g.add(tail);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1, 2), new THREE.MeshLambertMaterial({ color: 0x7fb3d5 }));
  glass.position.set(0, 0.4, 2.4);
  g.add(glass);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(13, 0.18, 0.9), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.4;
  g.add(rotor);
  const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 13), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor2.position.y = 1.4;
  g.add(rotor2);
  const skidMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const s of [-1.2, 1.2]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5), skidMat);
    skid.position.set(s, -1.2, 0);
    g.add(skid);
  }
  return { group: g, rotor, rotor2 };
}
function buildRoadblockMesh() {
  const g = new THREE.Group();
  const stripeTex = buildSignTexture('||||', '', '#e74c3c', '#f5f0e0', 256, 64);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 0.5), new THREE.MeshLambertMaterial({ map: stripeTex }));
  bar.position.y = 1;
  g.add(bar);
  for (const s of [-3, 3]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    leg.position.set(s, 0.5, 0);
    g.add(leg);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0xe67e22 }));
    cone.position.set(s + 1.5, 0.6, 1.5);
    g.add(cone);
  }
  return g;
}
function buildSpikeMesh() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 1.2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  base.position.y = 0.15;
  g.add(base);
  for (let i = -2; i <= 2; i += 1) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 6), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    spike.position.set(i * 1.2, 0.6, 0);
    g.add(spike);
  }
  return g;
}

export function createDynamic(scene) {
  const dyn = {
    playerCar: buildCarMesh(0xe74c3c),
    mara: buildMaraMesh(1),
    trafficMeshes: [],
    policeMeshes: [],
    swat: buildSwatMesh(),
    heli: buildHeliMesh(),
    beam: null,
    roadblocks: [buildRoadblockMesh(), buildRoadblockMesh()],
    spikes: [buildSpikeMesh(), buildSpikeMesh()],
    pedMeshes: [],
  };
  scene.add(dyn.playerCar);
  scene.add(dyn.mara);
  scene.add(dyn.swat);
  scene.add(dyn.heli.group);
  for (const rb of dyn.roadblocks) scene.add(rb);
  for (const sp of dyn.spikes) scene.add(sp);
  const beamGeo = new THREE.ConeGeometry(1, 1, 18, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
  dyn.beam = new THREE.Mesh(beamGeo, beamMat);
  dyn.beam.visible = false;
  scene.add(dyn.beam);
  return dyn;
}

export function updateScene(ctx, dyn, w, dt, t, camOverride) {
  const { scene, camera, renderer } = ctx;
  // Lighting follows the time of day (ember dusk is the signature).
  const df = daylightFactor(w.hour);
  ctx.hemi.intensity = 0.45 + df * 0.6;
  ctx.sun.intensity = 0.4 + df * 1.1;
  const phase = phaseFor(w.hour);
  if (phase === 'day') {
    ctx.sky.material.color.setHex(0xffc490);
    ctx.sunDisc.visible = true;
    ctx.sunDisc.material.color.setHex(0xfff2b0);
    ctx.sunDisc.position.set(-900, 500, 200);
  } else if (phase === 'dusk') {
    ctx.sky.material.color.setHex(0xffffff);
    ctx.sunDisc.visible = true;
    ctx.sunDisc.material.color.setHex(0xffd34d);
    ctx.sunDisc.position.set(-1500, 130, 250);
  } else {
    ctx.sky.material.color.setHex(0x4a4a6a);
    ctx.sunDisc.visible = false;
  }
  // Clouds drift; embers rise; confetti falls; wheel turns; boat bobs.
  for (const cl of ctx.clouds) {
    cl.position.x += dt * 2.5;
    if (cl.position.x > 1300) cl.position.x = -1300;
  }
  const ep = ctx.embers.geometry.attributes.position;
  const ea = ep.array;
  for (let i = 0; i < ep.count; i += 1) {
    let y = ea[i * 3 + 1] + dt * 2.2;
    if (y > 70) y = 0;
    ea[i * 3 + 1] = y;
    ea[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.4;
  }
  ep.needsUpdate = true;
  const cp = ctx.confetti.geometry.attributes.position;
  const ca = cp.array;
  for (let i = 0; i < cp.count; i += 1) {
    let y = ca[i * 3 + 1] - dt * 1.4;
    if (y < 2) y = 40 + (i % 10);
    ca[i * 3 + 1] = y;
  }
  cp.needsUpdate = true;
  ctx.wheelSpin.rotation.x += dt * 0.05;
  ctx.boatGroup.position.y = 0.4 + Math.sin(t * 0.8) * 0.25;
  ctx.boatGroup.rotation.z = Math.sin(t * 0.6) * 0.03;

  // Player car + Mara.
  const car = dyn.playerCar;
  car.position.set(w.car.x, 0, w.car.z);
  car.rotation.y = w.car.angle + Math.PI;
  car.visible = !w.player.onFoot;
  const mara = dyn.mara;
  mara.visible = w.player.onFoot;
  if (w.player.onFoot) {
    mara.position.set(w.player.x, 0, w.player.z);
    mara.rotation.y = w.player.angle + Math.PI;
    const s = w.playerScale || 1;
    mara.scale.setScalar(s);
  }

  // Traffic cars (reuse a pool).
  while (dyn.trafficMeshes.length < w.traffic.cars.length) {
    const m = buildCarMesh(CAR_COLORS[dyn.trafficMeshes.length % CAR_COLORS.length]);
    scene.add(m);
    dyn.trafficMeshes.push(m);
  }
  w.traffic.cars.forEach((c, i) => {
    const m = dyn.trafficMeshes[i];
    m.position.set(c.x, 0, c.z);
    m.rotation.y = c.angle + Math.PI / 2;
    m.visible = true;
  });
  for (let i = w.traffic.cars.length; i < dyn.trafficMeshes.length; i += 1) dyn.trafficMeshes[i].visible = false;

  // Police cars.
  while (dyn.policeMeshes.length < w.police.cars.length) {
    const m = buildPoliceMesh();
    scene.add(m);
    dyn.policeMeshes.push(m);
  }
  w.police.cars.forEach((c, i) => {
    const m = dyn.policeMeshes[i];
    m.position.set(c.x, 0, c.z);
    m.rotation.y = Math.atan2(c.x - w.car.x, c.z - w.car.z) + Math.PI;
    m.visible = true;
  });
  for (let i = w.police.cars.length; i < dyn.policeMeshes.length; i += 1) dyn.policeMeshes[i].visible = false;

  // SWAT van.
  dyn.swat.visible = !!w.police.swat;
  if (w.police.swat) {
    dyn.swat.position.set(w.police.swat.x, 0, w.police.swat.z);
    dyn.swat.rotation.y = Math.atan2(w.car.x - w.police.swat.x, w.car.z - w.police.swat.z);
  }

  // Heli + spotlight beam (narrow at the heli, widening to the car).
  const heli = w.police.heli;
  dyn.heli.group.visible = !!heli;
  if (heli) {
    const hy = heli.y || 45;
    dyn.heli.group.position.set(heli.x, hy, heli.z);
    dyn.heli.group.rotation.y = t * 0.4;
    dyn.heli.rotor.rotation.y = t * 18;
    dyn.heli.rotor2.rotation.y = t * 18;
    const beam = dyn.beam;
    beam.visible = true;
    beam.position.set(w.car.x, hy / 2, w.car.z);
    beam.scale.set(3.5, hy, 3.5);
  } else {
    dyn.beam.visible = false;
  }

  // Roadblocks + spike strips.
  w.police.roadblocks.forEach((rb, i) => {
    const m = dyn.roadblocks[i];
    if (!m) return;
    m.position.set(rb.x, 0, rb.z);
    m.rotation.y = rb.angle || 0;
    m.visible = true;
  });
  for (let i = w.police.roadblocks.length; i < dyn.roadblocks.length; i += 1) dyn.roadblocks[i].visible = false;
  const spikes = w.wanted.spikes || [];
  spikes.slice(0, 2).forEach((s, i) => {
    const m = dyn.spikes[i];
    if (!m) return;
    m.position.set(s.x, 0, s.z);
    m.visible = true;
  });
  for (let i = spikes.length; i < dyn.spikes.length; i += 1) dyn.spikes[i].visible = false;

  // Crowd peds (reuse a pool; colour by job).
  while (dyn.pedMeshes.length < w.traffic.peds.length) {
    const idx = dyn.pedMeshes.length;
    const ped = w.traffic.peds[idx];
    const m = buildPedMesh(PED_JACKETS[idx % PED_JACKETS.length], 1, ped ? ped.job : null);
    scene.add(m);
    dyn.pedMeshes.push(m);
  }
  w.traffic.peds.forEach((p, i) => {
    const m = dyn.pedMeshes[i];
    m.position.set(p.x, 0, p.z);
    m.rotation.y = p.angle + Math.PI / 2;
    m.visible = true;
  });
  for (let i = w.traffic.peds.length; i < dyn.pedMeshes.length; i += 1) dyn.pedMeshes[i].visible = false;

  // Camera: fixed for a shot, chase cam in free play.
  if (camOverride) {
    camera.position.set(camOverride.pos[0], camOverride.pos[1], camOverride.pos[2]);
    camera.lookAt(camOverride.target[0], camOverride.target[1], camOverride.target[2]);
  } else {
    const cx = w.car.x - Math.sin(w.car.angle) * 14;
    const cz = w.car.z - Math.cos(w.car.angle) * 14;
    camera.position.set(cx, 7, cz);
    camera.lookAt(w.car.x + Math.sin(w.car.angle) * 10, 2, w.car.z + Math.cos(w.car.angle) * 10);
  }
  renderer.render(scene, camera);
}
