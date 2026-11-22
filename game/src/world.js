// The city itself: ground, roads and lane paint, the building blocks, the
// Coral Pier with its stalls and wheel, the Long Beach Port with its cranes
// and containers, the DELTA ARMS shop forecourt, and the street furniture.
// At night, 28 warm glow discs lift the dark streets.

import * as THREE from '../vendor/three.module.min.js';
import { BUILDINGS, PIER_DECK, PORT_RECT, SHOP_POS, SHORE_X, MAP_HALF, ROAD_SPACING, isWater } from './geo.js';
import { makeRng } from './rng.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowTexture(base, lit) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const cols = 4;
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = ((r * cols + c) % 3) === 0;
        g.fillStyle = on ? lit : 'rgba(20,28,38,0.9)';
        g.fillRect(10 + c * 30, 12 + r * 30, 18, 20);
      }
    }
  });
}

function signTexture(text, bg, fg, sub) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = 'bold 64px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, sub ? h * 0.38 : h * 0.5);
    if (sub) {
      g.font = 'bold 30px Arial, sans-serif';
      g.fillText(sub, w / 2, h * 0.78);
    }
  });
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const rng = makeRng(99);
  const glowDiscs = [];
  const trafficLights = [];
  const lampLights = [];

  // --- ground: one big canvas texture holds the grass, the sea, the beach,
  // the whole road grid and its lane paint, so the floor is a single mesh.
  const groundTex = canvasTexture(1024, 1024, (g) => {
    const K = 1024 / 1600;
    const X = (x) => (x + 800) * K;
    const Y = (z) => (z + 800) * K;
    const W = (w) => w * K;
    g.fillStyle = '#4a7c59';
    g.fillRect(0, 0, 1024, 1024);
    // sea on the east
    g.fillStyle = '#1b6ca8';
    g.fillRect(X(SHORE_X), 0, 1024 - X(SHORE_X), 1024);
    // beach sand along the shore
    g.fillStyle = '#d9c08a';
    g.fillRect(X(SHORE_X - 36), 0, W(36), 1024);
    // roads
    for (let k = -8; k <= 8; k++) {
      const pos = k * ROAD_SPACING;
      g.fillStyle = '#2b2f36';
      g.fillRect(X(pos - 6), 0, W(12), 1024);
      g.fillRect(0, Y(pos - 6), 1024, W(12));
      // yellow dashed centre lines
      g.fillStyle = '#ffc300';
      for (let d = -780; d <= 780; d += 24) {
        g.fillRect(X(pos - 0.4), Y(d + 4), W(0.8), W(8));
        g.fillRect(X(d - 4), Y(pos - 0.4), W(8), W(0.8));
      }
      // white edge lines
      g.fillStyle = '#d8d8d8';
      g.fillRect(X(pos - 5.6), 0, W(0.5), 1024);
      g.fillRect(X(pos + 5.1), 0, W(0.5), 1024);
      g.fillRect(0, Y(pos - 5.6), 1024, W(0.5));
      g.fillRect(0, Y(pos + 5.1), 1024, W(0.5));
    }
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_HALF * 2 + 200, MAP_HALF * 2 + 200),
    new THREE.MeshLambertMaterial({ map: groundTex, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // --- buildings with window grids ---
  const litWindows = ['#ffd166', '#9fd4e8', '#ffb3a7'];
  for (const b of BUILDINGS) {
    const tex = windowTexture('#' + new THREE.Color(b.color).getHexString(), litWindows[Math.floor(rng.next() * 3)]);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, Math.round(b.w / 26)), Math.max(1, Math.round(b.h / 22)));
    const mat = new THREE.MeshLambertMaterial({ map: tex, roughness: 0.85 });
    const m = box(b.w, b.h, b.d, mat);
    m.position.set(b.x, b.h / 2, b.z);
    group.add(m);
    if (b.shop) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 7),
        new THREE.MeshBasicMaterial({ map: signTexture('DELTA ARMS', '#ff5a5f', '#ffffff', 'GUNS • AMMO • GEAR') }),
      );
      sign.position.set(b.x, b.h + 1.2, b.z - b.d / 2 - 0.2);
      sign.rotation.y = Math.PI;
      group.add(sign);
    }
  }

  // --- street lamps, traffic lights, palms ---
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x2a2f36, roughness: 0.7, metalness: 0.5 });
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffc300, emissiveIntensity: 0.4 });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffc300, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  function addLamp(x, z, withLight = false) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 8), lampPoleMat);
    pole.position.set(x, 3.5, z);
    pole.castShadow = true;
    group.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), lampHeadMat);
    head.position.set(x, 7.1, z);
    group.add(head);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), glowMat.clone());
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, 0.12, z);
    group.add(disc);
    glowDiscs.push(disc);
    if (!withLight) return;
    const light = new THREE.PointLight(0xffc300, 0, 24, 1.8);
    light.position.set(x, 7, z);
    scene.add(light);
    lampLights.push(light);
  }
  for (const k of [-8, -4, 0, 4, 8]) {
    for (const j of [-4, 4]) {
      addLamp(k * ROAD_SPACING + 7, j * ROAD_SPACING + 7);
    }
  }
  // traffic lights at a few intersections
  const lightPoleMat = new THREE.MeshLambertMaterial({ color: 0x222222, roughness: 0.6 });
  for (const [ix, iz] of [[0, 0], [160, 80], [-160, 160], [80, -160], [-80, -80]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 8), lightPoleMat);
    pole.position.set(ix + 6.5, 3, iz + 6.5);
    group.add(pole);
    const housing = box(0.7, 2.0, 0.7, lightPoleMat);
    housing.position.set(ix + 6.5, 6.6, iz + 6.5);
    group.add(housing);
    const lampGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const nsLamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0x00ff44 }));
    nsLamp.position.set(ix + 6.5, 7.1, iz + 6.5);
    group.add(nsLamp);
    const ewLamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    ewLamp.position.set(ix + 6.5, 6.4, iz + 6.5);
    group.add(ewLamp);
    trafficLights.push({ nsLamp, ewLamp, x: ix, z: iz });
  }
  // palms along the shore and the pier road
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a, roughness: 1 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3a8a4a, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 24; i++) {
    const px = SHORE_X - 30;
    const pz = -620 + i * 54;
    if (isWater(px, pz)) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 7, 7), trunkMat);
    trunk.position.set(px, 3.5, pz);
    trunk.castShadow = true;
    group.add(trunk);
    for (let f = 0; f < 3; f++) {
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), frondMat);
      const a = (f / 3) * Math.PI * 2;
      frond.position.set(px + Math.cos(a) * 1.4, 7.2, pz + Math.sin(a) * 1.4);
      frond.rotation.set(-0.5, -a, 0);
      group.add(frond);
    }
  }

  // --- Coral Pier ---
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a, roughness: 0.9 });
  const deck = box(PIER_DECK.x1 - PIER_DECK.x0, 1.2, PIER_DECK.z1 - PIER_DECK.z0, deckMat);
  deck.position.set((PIER_DECK.x0 + PIER_DECK.x1) / 2, 0.6, (PIER_DECK.z0 + PIER_DECK.z1) / 2);
  group.add(deck);
  // plank lines
  for (let x = PIER_DECK.x0 + 8; x < PIER_DECK.x1; x += 10) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.3, PIER_DECK.z1 - PIER_DECK.z0), new THREE.MeshBasicMaterial({ color: 0x6a4a30 }));
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(x, 1.22, (PIER_DECK.z0 + PIER_DECK.z1) / 2);
    group.add(seam);
  }
  // pier stalls with striped awnings and readable signs
  const stallDefs = [
    { name: 'BALLOONS', sub: 'POP • WIN • FLY', color: '#ff5a5f', x: 610, z: 408 },
    { name: 'ARCADE', sub: 'TOKENS • PRIZES', color: '#2ec4b6', x: 628, z: 408 },
    { name: 'SNO-CONES', sub: 'ICE • SYRUP • RAINBOW', color: '#ffc300', x: 646, z: 408 },
  ];
  for (const s of stallDefs) {
    const base = box(9, 4.5, 7, new THREE.MeshLambertMaterial({ color: 0xf2e8d8, roughness: 0.8 }));
    base.position.set(s.x, 3.4, s.z);
    group.add(base);
    const awn = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 4),
      new THREE.MeshLambertMaterial({ color: s.color, roughness: 0.7, side: THREE.DoubleSide }),
    );
    awn.rotation.x = 0.5;
    awn.position.set(s.x, 6.2, s.z + 2);
    group.add(awn);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.4),
      new THREE.MeshBasicMaterial({ map: signTexture(s.name, s.color, '#ffffff', s.sub) }),
    );
    sign.position.set(s.x, 5.6, s.z + 3.6);
    group.add(sign);
    addLamp(s.x - 6, s.z + 6, true);
    addLamp(s.x + 6, s.z + 6);
  }
  // Ferris wheel at the pier end
  const wheelGroup = new THREE.Group();
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0xff5a5f, roughness: 0.5, metalness: 0.3, emissive: 0x330000 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(14, 0.5, 10, 32), wheelMat);
  wheelGroup.add(rim);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 28, 6), wheelMat);
    spoke.rotation.z = (i / 8) * Math.PI;
    wheelGroup.add(spoke);
  }
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x2ec4b6, roughness: 0.5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cabin = box(2.2, 2.2, 2.2, cabinMat);
    cabin.position.set(Math.cos(a) * 14, Math.sin(a) * 14, 0);
    wheelGroup.add(cabin);
  }
  const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 18, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  legA.position.set(-6, -9, 0);
  legA.rotation.z = 0.35;
  wheelGroup.add(legA);
  const legB = legA.clone();
  legB.position.x = 6;
  legB.rotation.z = -0.35;
  wheelGroup.add(legB);
  wheelGroup.position.set(676, 20, 422);
  group.add(wheelGroup);
  // boats with lights in the water beside the pier
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2, roughness: 0.6 });
  for (const [bx, bz, bc] of [[560, 470, 0xff5a5f], [600, 470, 0x2ec4b6], [640, 470, 0xffc300], [580, 380, 0xffffff]]) {
    const hull = box(8, 1.6, 3, new THREE.MeshLambertMaterial({ color: bc, roughness: 0.6 }));
    hull.position.set(bx, 0.8, bz);
    group.add(hull);
    const cabin = box(3, 1.6, 2.4, boatMat);
    cabin.position.set(bx, 2.2, bz);
    group.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), lampPoleMat);
    mast.position.set(bx, 4.5, bz);
    group.add(mast);
    const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
    mastLight.position.set(bx, 7.2, bz);
    group.add(mastLight);
    const bdisc = new THREE.Mesh(new THREE.CircleGeometry(3, 16), glowMat.clone());
    bdisc.rotation.x = -Math.PI / 2;
    bdisc.position.set(bx, 0.15, bz);
    group.add(bdisc);
    glowDiscs.push(bdisc);
  }

  // --- Long Beach Port ---
  const concreteMat = new THREE.MeshLambertMaterial({ color: 0x6a6f76, roughness: 0.95 });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(PORT_RECT.x1 - PORT_RECT.x0, PORT_RECT.z1 - PORT_RECT.z0), concreteMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set((PORT_RECT.x0 + PORT_RECT.x1) / 2, 0.09, (PORT_RECT.z0 + PORT_RECT.z1) / 2);
  pad.receiveShadow = true;
  group.add(pad);
  // container stacks
  const containerColors = [0xff5a5f, 0x2ec4b6, 0xffc300, 0x3a7bd5, 0x7a4a9a, 0x4a9a6a];
  for (let i = 0; i < 14; i++) {
    const cx = PORT_RECT.x0 + 14 + (i % 5) * 26;
    const cz = PORT_RECT.z0 + 16 + Math.floor(i / 5) * 34;
    const stack = 1 + (i % 3);
    for (let s = 0; s < stack; s++) {
      const c = box(20, 2.6, 8, new THREE.MeshLambertMaterial({ color: containerColors[(i + s) % containerColors.length], roughness: 0.8, metalness: 0.2 }));
      c.position.set(cx, 1.4 + s * 2.7, cz);
      group.add(c);
    }
  }
  // two gantry cranes, one the orange hero at dusk
  function crane(x, z, color) {
    const g = new THREE.Group();
    const legMat = new THREE.MeshLambertMaterial({ color, roughness: 0.6, metalness: 0.4 });
    for (const [lx, lz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 34, 1.4), legMat);
      leg.position.set(lx, 17, lz);
      leg.castShadow = true;
      g.add(leg);
    }
    const beamH = new THREE.Mesh(new THREE.BoxGeometry(52, 2.2, 2.2), legMat);
    beamH.position.set(8, 34, 0);
    beamH.castShadow = true;
    g.add(beamH);
    const cab = box(6, 4, 5, new THREE.MeshLambertMaterial({ color: 0x222222, roughness: 0.7 }));
    cab.position.set(0, 32, 0);
    g.add(cab);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 18, 6), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    cable.position.set(26, 24, 0);
    g.add(cable);
    const load = box(12, 3, 7, new THREE.MeshLambertMaterial({ color: 0xff5a5f, roughness: 0.8 }));
    load.position.set(26, 14, 0);
    load.castShadow = true;
    g.add(load);
    g.position.set(x, 0, z);
    group.add(g);
    return { group: g, load };
  }
  const craneA = crane(640, 250, 0xff7a1a);
  crane(580, 300, 0x2a4a6a);
  // port lamps + light pools + puddles
  for (const [lx, lz] of [[560, 200], [620, 200], [680, 200], [560, 320], [620, 320], [680, 320], [590, 250], [650, 280]]) {
    addLamp(lx, lz);
  }
  const puddleMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a, roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.8 });
  for (const [px, pz, pr] of [[600, 240, 5], [650, 210, 4], [575, 290, 6], [665, 260, 4.5], [610, 300, 5]]) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(pr, 18), puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(px, 0.13, pz);
    group.add(puddle);
  }

  // --- DELTA ARMS forecourt props (shot 2) ---
  const crateMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a, roughness: 0.9 });
  for (const [cx, cz, s] of [[SHOP_POS.x - 14, SHOP_POS.z - 6, 2.2], [SHOP_POS.x - 11.5, SHOP_POS.z - 6, 1.6], [SHOP_POS.x - 13, SHOP_POS.z - 3.5, 1.4], [SHOP_POS.x - 14, SHOP_POS.z - 6, 1.8]]) {
    const crate = box(s, s, s, crateMat);
    crate.position.set(cx, s / 2, cz);
    group.add(crate);
  }
  // bike rack with two bikes
  const rackMat = new THREE.MeshLambertMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 6, 14, Math.PI), rackMat);
    bar.position.set(SHOP_POS.x + 12 + i * 1.6, 0.7, SHOP_POS.z - 8);
    bar.rotation.y = Math.PI / 2;
    group.add(bar);
  }
  const bikeMat = new THREE.MeshLambertMaterial({ color: 0x2ec4b6, roughness: 0.5 });
  for (const bx of [SHOP_POS.x + 12, SHOP_POS.x + 15.2]) {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 16), bikeMat);
    frame.position.set(bx, 0.55, SHOP_POS.z - 8);
    frame.rotation.y = Math.PI / 2;
    group.add(frame);
    const frame2 = frame.clone();
    frame2.position.z = SHOP_POS.z - 6.6;
    group.add(frame2);
  }
  // newspaper box + street bin
  const newsBox = box(1.4, 1.6, 1.0, new THREE.MeshLambertMaterial({ color: 0x2a6db0, roughness: 0.6 }));
  newsBox.position.set(SHOP_POS.x - 8, 0.8, SHOP_POS.z - 9);
  group.add(newsBox);
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 1.4, 10), new THREE.MeshLambertMaterial({ color: 0x3a4a3a, roughness: 0.9 }));
  bin.position.set(SHOP_POS.x + 20, 0.7, SHOP_POS.z - 9);
  bin.castShadow = true;
  group.add(bin);
  // barriers and benches scattered through the city
  const barrierMat = new THREE.MeshLambertMaterial({ color: 0xff7a1a, roughness: 0.7 });
  for (const [bx, bz] of [[-40, 80], [120, -40], [200, 120], [-200, -120], [300, 200]]) {
    const bar = box(3, 0.9, 0.4, barrierMat);
    bar.position.set(bx, 0.45, bz);
    group.add(bar);
  }
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a, roughness: 0.9 });
  for (const [bx, bz] of [[-80, 40], [40, -80], [160, 200], [-240, 80]]) {
    const bench = box(3, 0.5, 1.2, benchMat);
    bench.position.set(bx, 0.6, bz);
    group.add(bench);
  }

  return { group, glowDiscs, trafficLights, lampLights, craneA, wheelGroup };
}

export function updateWorld(world, night, time) {
  for (const disc of world.glowDiscs) {
    disc.material.opacity = night * 0.5;
  }
  for (const light of world.lampLights) {
    light.intensity = night * 14;
  }
  const phase = Math.floor(time / 1.2) % 2 === 0;
  for (const tl of world.trafficLights) {
    tl.nsLamp.material.color.setHex(phase ? 0x00ff44 : 0xff2222);
    tl.ewLamp.material.color.setHex(phase ? 0xff2222 : 0x00ff44);
  }
  world.wheelGroup.rotation.z += 0.0004;
  world.craneA.load.position.y = 14 + Math.sin(time * 0.5) * 1.5;
}
