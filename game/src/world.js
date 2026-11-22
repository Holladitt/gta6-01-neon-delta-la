// World: the city. Roads, buildings, beach, Coral Pier, Long Beach Port,
// the DELTA ARMS shopping plaza, streetlamps, traffic lights, parked cars,
// and the freeway ring. Pure layout + meshes; the game loop drives
// update(dt, t) and setNight(n).
import * as THREE from '../vendor/three.module.min.js';
import { mulberry32 } from './rng.js';
import { WORLD } from './config.js';
import { createVehicle } from './vehicles.js';

// ---- terrain height ----
export function groundY(x, z) {
  // Coral Pier deck: flat 2.5 across the deck, ramping down to the beach
  // at its east end (x -665..-650).
  if (x >= -795 && x <= -650 && z >= 255 && z <= 345) {
    if (x > -665) return 2.5 * ((-650 - x) / 15);
    return 2.5;
  }
  // Hollywood Hills: rise to 12 across the north strip.
  if (z < -720) return Math.min(12, (-720 - z) * 0.3);
  return 0;
}

// Open water: the ocean west of the beach is not walkable on foot; the
// only way west is the Coral Pier deck corridor (z 252..348, deck y 2.5).
export function inWater(x, z) {
  return x < WORLD.OCEAN_X + 2 && (z < 252 || z > 348);
}

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}
function basic(color, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, ...extra });
}

// Canvas sign: bold text on a solid backing, for shop and stall signs.
function makeSignTexture(text, fg = '#ffd23d', bg = '#14141e', sub = '') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = sub ? 160 : 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg;
  g.font = 'bold 64px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, sub ? 56 : 64);
  if (sub) {
    g.font = 'bold 34px Arial';
    g.fillStyle = '#ffffff';
    g.fillText(sub, 256, 122);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Wood-plank texture for the pier deck.
function makeDeckTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8a6a4a';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, y, 256, 3);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(0, y + 3, 256, 2);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(0,0,0,0.15)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 14);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Asphalt with a dashed yellow centre line and white edge lines.
function makeRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2d33';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(4, 0, 3, 256);
  g.fillRect(121, 0, 3, 256);
  g.fillStyle = '#e8c832';
  g.fillRect(61, 10, 6, 90);
  g.fillRect(61, 150, 6, 90);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 20);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene) {
  const layout = mulberry32(20261118);
  const detail = mulberry32(20261119);
  const clutter = mulberry32(20261120);
  const colliders = [];
  const facMats = [];
  const signMats = [];
  const glowSpotMats = []; // streetlamp pools (17)
  const storeSpotMats = []; // storefront pools (11)
  const pierPoolMats = []; // pier lamp pools + extra deck pools
  const portLampPoolMats = []; // port lamp pools (3)
  const stallBulbMats = []; // warm strips under stall canopies
  const streakMats = []; // boat light streaks on the water
  let washMat = null;
  let glowPtsMat = null;
  const trafficLights = [];
  const parkedSpots = [];
  let night = 0;

  const addBox = (w, h, d, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const addCollider = (x0, x1, z0, z1, h) => {
    colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h });
  };

  // ---- ground, water, beach ----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), lambert(0x5a7a52));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(880, 1600), lambert(0x1e6f9e));
  water.rotation.x = -Math.PI / 2;
  water.position.set(-1160, 0.02, 0);
  scene.add(water);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(60, 1600), lambert(0xe8cf9a));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-690, 0.03, 0);
  scene.add(beach);

  // ---- roads + sidewalks ----
  const roadTexV = makeRoadTexture();
  const roadTexH = makeRoadTexture();
  roadTexH.rotation = Math.PI / 2;
  roadTexH.center.set(0.5, 0.5);
  for (const ax of WORLD.AVENUES) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 1600), new THREE.MeshLambertMaterial({ map: roadTexV }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(ax, 0.04, 0);
    scene.add(road);
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(8, 1600), lambert(0x8a8a80));
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(ax + side * 15, 0.03, 0);
      scene.add(walk);
    }
  }
  for (const sz of WORLD.STREETS) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(1600, 22), new THREE.MeshLambertMaterial({ map: roadTexH }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.04, sz);
    scene.add(road);
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(1600, 8), lambert(0x8a8a80));
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(0, 0.03, sz + side * 15);
      scene.add(walk);
    }
  }

  // ---- buildings ----
  const facadePalette = [0x8a7f72, 0x6b7c8a, 0x9a8a7a, 0x7a6a8a, 0x8a9a7a, 0xa08a6a, 0x5a6a7a, 0x8a6a6a];
  const xGaps = [[-789, -611], [-589, -411], [-389, -211], [-189, -11], [11, 189], [211, 389], [411, 589], [611, 789]];
  const zGaps = [[-789, -611], [-589, -411], [-389, -211], [-189, -11], [11, 189], [211, 389], [411, 589], [611, 789]];
  function placeBuilding(cx, cz, w, d, h) {
    const mat = lambert(facadePalette[Math.floor(layout() * facadePalette.length)], { emissive: 0xffd9a0, emissiveIntensity: 0 });
    facMats.push(mat);
    addBox(w, h, d, mat, cx, h / 2, cz);
    addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, h);
    // rooftop plant on some buildings
    if (layout() < 0.35) addBox(w * 0.25, 2.5, d * 0.25, lambert(0x555555), cx + w * 0.2, h + 1.25, cz - d * 0.15);
  }
  for (const [x0, x1] of xGaps) {
    for (const [z0, z1] of zGaps) {
      // plaza block is the shopping plaza, built separately below
      if (x0 === 11 && z0 === 11) continue;
      // port blocks
      if (x0 >= 411 && z0 >= 411) continue;
      // west beach strip: no buildings on the sand/water
      if (x1 <= -611) continue;
      // north hills strip
      if (z1 <= -611) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const bw = x1 - x0 - 12;
      const bd = z1 - z0 - 12;
      const downtown = Math.abs(cx) < 300 && Math.abs(cz) < 300;
      // hospital block: the hospital + one office, not generic towers
      if (x0 === 211 && z0 === -589) {
        const hm = lambert(0xe8e8e8, { emissive: 0xffd9a0, emissiveIntensity: 0 });
        facMats.push(hm);
        addBox(60, 25, 60, hm, 245, 12.5, -440);
        addCollider(215, 275, -470, -410, 25);
        // red cross on the west face, facing avenue 200
        addBox(1, 16, 4, basic(0xc0392b), 214.4, 16, -440);
        addBox(1, 4, 16, basic(0xc0392b), 214.4, 16, -440);
        const hospSign = new THREE.Mesh(
          new THREE.PlaneGeometry(40, 10),
          new THREE.MeshBasicMaterial({ map: makeSignTexture('DELTA GENERAL', '#c0392b', '#f4f4f0') }),
        );
        hospSign.position.set(214.4, 22, -440);
        hospSign.rotation.y = -Math.PI / 2;
        scene.add(hospSign);
        signMats.push(hospSign.material);
        placeBuilding(340, -500, 50, 50, 20);
        continue;
      }
      if (layout() < 0.5) {
        const h = downtown ? 30 + layout() * 40 : 12 + layout() * 23;
        placeBuilding(cx, cz, bw * (0.55 + layout() * 0.25), bd * (0.55 + layout() * 0.25), h);
      } else {
        const h1 = downtown ? 30 + layout() * 35 : 12 + layout() * 20;
        const h2 = downtown ? 25 + layout() * 30 : 10 + layout() * 18;
        placeBuilding(cx - bw * 0.22, cz, bw * 0.42, bd * 0.7, h1);
        placeBuilding(cx + bw * 0.22, cz, bw * 0.42, bd * 0.7, h2);
      }
    }
  }
  // Hollywood Hills houses on the north slope
  for (let i = 0; i < 6; i++) {
    const hx = -560 + i * 220 + detail() * 40;
    const hz = -735 - detail() * 45;
    const hy = groundY(hx, hz);
    const hm = lambert(0xd8cfc0, { emissive: 0xffd9a0, emissiveIntensity: 0 });
    facMats.push(hm);
    addBox(22, 8, 16, hm, hx, hy + 4, hz);
    addCollider(hx - 11, hx + 11, hz - 8, hz + 8, hy + 8);
  }

  // ---- trees ----
  function makeTree(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * s, 0.6 * s, 3 * s, 6), lambert(0x6a4a2a));
    trunk.position.y = 1.5 * s;
    g.add(trunk);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(2.6 * s, 8, 6), lambert(0x2e7d4a));
    leaf.position.y = 4.2 * s;
    g.add(leaf);
    const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(1.8 * s, 8, 6), lambert(0x3a9a55));
    leaf2.position.set(1.2 * s, 5.6 * s, 0.6 * s);
    g.add(leaf2);
    g.position.set(x, groundY(x, z), z);
    scene.add(g);
    return g;
  }
  // scattered street trees (not on roads, not in the plaza or port)
  for (let i = 0; i < 26; i++) {
    const tx = -600 + clutter() * 1200;
    const tz = -600 + clutter() * 1200;
    if (WORLD.AVENUES.some((a) => Math.abs(tx - a) < 16)) continue;
    if (WORLD.STREETS.some((s) => Math.abs(tz - s) < 16)) continue;
    if (tx > 0 && tx < 200 && tz > 0 && tz < 200) continue; // plaza
    if (tx > 480 && tz > 480) continue; // port
    if (tx < -640) continue;
    makeTree(tx, tz, 0.8 + clutter() * 0.6);
  }

  // ---- DELTA ARMS shopping plaza (block x 11..189, z 11..189) ----
  // North shop row, fronts facing south (+z) onto the forecourt. Narrow
  // shophouses (~16 m each): at the 20 m staging distance the 94° camera
  // only covers ~43 m of storefront, so wide shops would push the outer
  // signs out of frame (or cut them at the edge). DELTA ARMS stays centred
  // on x=90, door at (90,112).
  const plazaShops = [
    { name: 'TIDE BOOKS', sub: 'BOOKS · MAPS', x0: 62, x1: 78, fg: '#7fd8ff', bg: '#14283a' },
    { name: 'DELTA ARMS', sub: 'GUNS · AMMO', x0: 82, x1: 98, fg: '#ffd23d', bg: '#14141e' },
    { name: 'VINYL & CO', sub: 'RECORDS', x0: 102, x1: 118, fg: '#ff7e5f', bg: '#241428' },
  ];
  for (const s of plazaShops) {
    const w = s.x1 - s.x0;
    const cx = (s.x0 + s.x1) / 2;
    const mat = lambert(0x9a8a7a, { emissive: 0xffd9a0, emissiveIntensity: 0 });
    facMats.push(mat);
    addBox(w, 9, 25, mat, cx, 4.5, 97.5);
    addCollider(s.x0, s.x1, 85, 110, 9);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.9, 4.5),
      new THREE.MeshBasicMaterial({ map: makeSignTexture(s.name, s.fg, s.bg, s.sub) }),
    );
    sign.position.set(cx, 6.8, 110.3);
    scene.add(sign);
    signMats.push(sign.material);
    // awning over the door
    addBox(w * 0.6, 0.4, 3, lambert(0x2471a3), cx, 4.2, 111);
    // warm pool on the forecourt in front of the shop
    const poolMat = basic(0xffd9a0, { transparent: true, opacity: 0, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 20), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, 0.1, 118);
    scene.add(pool);
    storeSpotMats.push(poolMat);
  }
  // Side shop rows (4 each, facing the plaza centre).
  const sideNames = ['TACOS EL REY', 'NEON NAILS', 'CORAL COFFEE', 'PIER BIKES', 'SURF SHOP', 'LAUNDR-O-MAT', 'DONUT HOLE', 'FLOWER CART'];
  const sideRows = [
    { x0: 12, x1: 35, face: 35, poolX: 42, rotY: Math.PI / 2 }, // west row, faces east
    { x0: 165, x1: 188, face: 165, poolX: 158, rotY: -Math.PI / 2 }, // east row, faces west
  ];
  let sideIdx = 0;
  for (const row of sideRows) {
    for (let k = 0; k < 4; k++) {
      const z0 = 20 + k * 40;
      const z1 = z0 + 35;
      const cz = (z0 + z1) / 2;
      const mat = lambert(0x8a7f72, { emissive: 0xffd9a0, emissiveIntensity: 0 });
      facMats.push(mat);
      addBox(row.x1 - row.x0, 8, 35, mat, (row.x0 + row.x1) / 2, 4, cz);
      addCollider(row.x0, row.x1, z0, z1, 8);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 4),
        new THREE.MeshBasicMaterial({ map: makeSignTexture(sideNames[sideIdx], '#ffffff', '#1e2a3a') }),
      );
      sign.position.set(row.face + (row.rotY > 0 ? 0.3 : -0.3), 6, cz);
      sign.rotation.y = row.rotY;
      scene.add(sign);
      signMats.push(sign.material);
      const poolMat = basic(0xffd9a0, { transparent: true, opacity: 0, depthWrite: false });
      const pool = new THREE.Mesh(new THREE.CircleGeometry(3.5, 20), poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(row.poolX, 0.1, cz);
      scene.add(pool);
      storeSpotMats.push(poolMat);
      sideIdx++;
    }
  }
  // Two office blocks behind the north shop row.
  placeBuilding(65, 50, 50, 55, 22);
  placeBuilding(135, 50, 50, 55, 18);
  // Forecourt furniture (v15): planters, benches, bike rack + 2 bikes,
  // newspaper box, bin, crates.
  function makePlanter(x, z) {
    addBox(3, 1.2, 1.6, lambert(0x7a5a3a), x, 0.6, z);
    addBox(2.6, 0.8, 1.2, lambert(0x2e7d4a), x, 1.5, z);
    addCollider(x - 1.5, x + 1.5, z - 0.8, z + 0.8, 1.6);
  }
  function makeBench(x, z, ry = 0) {
    const g = new THREE.Group();
    addBox(3, 0.3, 1, lambert(0x8a6a4a), 0, 0.9, 0, g);
    addBox(3, 1, 0.25, lambert(0x8a6a4a), 0, 1.5, -0.45, g);
    addBox(0.25, 0.9, 0.9, lambert(0x444444), -1.2, 0.45, 0, g);
    addBox(0.25, 0.9, 0.9, lambert(0x444444), 1.2, 0.45, 0, g);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
  }
  makePlanter(60, 140);
  makePlanter(120, 140);
  makeBench(75, 150, 0);
  makeBench(105, 150, 0);
  makeTree(55, 175, 1.1);
  makeTree(125, 175, 1.1);
  // bike rack + 2 bikes (west forecourt)
  addBox(4, 0.15, 0.4, lambert(0x888888), 68, 0.8, 140);
  for (const bx of [66.5, 69.5]) {
    const bike = new THREE.Group();
    const wheelGeo = new THREE.TorusGeometry(0.45, 0.06, 6, 12);
    const w1 = new THREE.Mesh(wheelGeo, lambert(0x222222));
    w1.position.set(-0.7, 0.45, 0);
    const w2 = new THREE.Mesh(wheelGeo, lambert(0x222222));
    w2.position.set(0.7, 0.45, 0);
    bike.add(w1, w2);
    addBox(1.4, 0.08, 0.08, lambert(0xd4ac0d), 0, 0.85, 0, bike);
    bike.position.set(bx, 0, 140);
    bike.rotation.y = Math.PI / 2;
    scene.add(bike);
  }
  // newspaper box + bin (east forecourt)
  addBox(1.2, 1.4, 0.8, lambert(0x2471a3), 100, 0.7, 128);
  addBox(1, 1.2, 1, lambert(0x2e7d4a), 112, 0.6, 135);
  // crates in frame
  addBox(2, 2, 2, lambert(0x8a6a3a), 105, 1, 125);
  addBox(1.6, 1.6, 1.6, lambert(0x6a4a2a), 107.5, 0.8, 125);
  // ---- v16 shot-2 forecourt additions ----
  // Second planter + tree fill the flat green bottom half of the frame.
  // The tree sits at (66,135), west of the sightline from the shot-2
  // staging spot (90,152) to the TIDE BOOKS sign, so it never hides the
  // sign (at (72,127) its canopy covered "TID").
  makePlanter(74, 120);
  makeTree(66, 135, 1.2);
  addCollider(66 - 0.6, 66 + 0.6, 135 - 0.6, 135 + 0.6, 4);
  // Sandwich board "OPEN" on the walkway: clear of Mara (90,152) and the
  // shop door (90,112).
  {
    const board = new THREE.Group();
    const faceMat = new THREE.MeshBasicMaterial({ map: makeSignTexture('OPEN', '#14141e', '#ffd23d') });
    signMats.push(faceMat);
    const f1 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), faceMat);
    f1.position.set(0, 0.9, 0.06);
    const f2 = f1.clone();
    f2.rotation.y = Math.PI;
    f2.position.set(0, 0.9, -0.06);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.5), lambert(0x6a4a2a));
    leg.position.y = 0.1;
    board.add(f1, f2, leg);
    board.position.set(95.5, 0, 118.5);
    board.rotation.y = -0.15;
    scene.add(board);
    addCollider(94.4, 96.6, 117.6, 119.4, 1.8);
  }
  // Low hedge row along the shop base, with flowers; no colliders (the
  // door path at x 90 stays clear — hedge blocks sit at 72/78/102/108).
  for (const hx of [72, 78, 102, 108]) {
    addBox(4, 0.7, 1, lambert(0x2e7d4a), hx, 0.35, 110.5);
    for (let f = 0; f < 3; f++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), basic([0xff5a7a, 0xffd23d, 0xff7e5f][f % 3]));
      fl.position.set(hx - 1.2 + f * 1.2, 0.85, 110.5);
      scene.add(fl);
    }
  }

  // ---- streetlamps + warm pools (17 glowSpots) ----
  const lampHeadMat = lambert(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 0.5 });
  const lampSpots = [];
  for (const z of [-400, -200, 0, 200, 400, 600]) lampSpots.push([209, z], [9, z]);
  for (const z of [-200, 0, 200, 400]) lampSpots.push([-191, z]);
  lampSpots.push([60, 150]); // plaza lamp
  for (const [lx, lz] of lampSpots) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 7, 6), lambert(0x333333));
    pole.position.set(lx, 3.5, lz);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.7), lampHeadMat);
    head.position.set(lx, 7.1, lz);
    scene.add(head);
    const poolMat = basic(0xffd9a0, { transparent: true, opacity: 0, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 20), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx, 0.1, lz);
    scene.add(pool);
    glowSpotMats.push(poolMat);
  }

  // ---- traffic lights: 12 intersections x 2 axes = 24 groups ----
  const tlDefs = [[-400, -200], [-200, -200], [0, -200], [200, -200], [400, -200], [-400, 0], [-200, 0], [0, 0], [200, 0], [400, 0], [-200, 200], [200, 200]];
  for (const [ix, iz] of tlDefs) {
    for (const axis of ['ns', 'ew']) {
      const ox = axis === 'ns' ? 11 : -11;
      const oz = axis === 'ns' ? 11 : -11;
      const px = ix + ox;
      const pz = iz + oz;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 6, 6), lambert(0x222222));
      pole.position.set(px, 3, pz);
      scene.add(pole);
      const lamps = [];
      const lampColors = [0xff2222, 0xffcc22, 0x22ff44];
      for (let k = 0; k < 3; k++) {
        const lm = lambert(0x111111, { emissive: lampColors[k], emissiveIntensity: 0.05 });
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lm);
        lamp.position.set(px, 5.6 - k * 0.9, pz);
        scene.add(lamp);
        lamps.push(lm);
      }
      trafficLights.push({ axis, offset: 11, lamps, x: px, z: pz });
    }
  }

  // ---- parked cars (24 + 3 v16 shot-1 cars = 27) ----
  const parkedDefs = [
    [186, 60, Math.PI, 'sedan', 0x2471a3], [214, 100, 0, 'pickup', 0xd4ac0d],
    [-186, -100, Math.PI, 'suv', 0x7d3c98], [-214, -60, 0, 'sedan', 0xc0392b],
    [14, -186, Math.PI / 2, 'sport', 0xff2e4d], [-14, 214, -Math.PI / 2, 'sedan', 0x2e7d9e],
    [414, 300, Math.PI, 'pickup', 0x8a7f72], [386, -300, 0, 'suv', 0x2471a3],
    [-414, 100, Math.PI, 'sedan', 0xd4ac0d], [-386, -300, 0, 'sport', 0x7d3c98],
    [614, -100, Math.PI, 'sedan', 0xc0392b], [586, 400, 0, 'pickup', 0x2e7d9e],
    [186, -400, Math.PI, 'suv', 0x8a7f72], [214, -460, 0, 'sedan', 0x2471a3],
    [-186, 400, Math.PI, 'pickup', 0xd4ac0d], [-214, 460, 0, 'sport', 0xff2e4d],
    [14, 414, Math.PI / 2, 'sedan', 0x7d3c98], [-14, -414, -Math.PI / 2, 'suv', 0xc0392b],
    [414, -100, Math.PI, 'sedan', 0x2e7d9e], [386, 100, 0, 'pickup', 0x8a7f72],
    [-414, -460, Math.PI, 'sport', 0x2471a3], [-386, 460, 0, 'sedan', 0xd4ac0d],
    [614, 300, Math.PI, 'suv', 0x7d3c98], [586, -460, 0, 'sport', 0xc0392b],
    // v16 shot 1: parked cars at the avenue edge, clear of the ±5.5 lane
    [186, 200, Math.PI, 'sedan', 0x2471a3], [214, 235, 0, 'pickup', 0xd4ac0d], [186, 268, 0, 'sport', 0x7d3c98],
  ];
  for (const [px, pz, heading, kind, color] of parkedDefs) {
    parkedSpots.push({ x: px, z: pz, heading, kind, color });
    const car = createVehicle(kind, px, pz, heading, color);
    scene.add(car.group);
  }
  // ---- v16 shot-1 lawn props (left lawn between the big tree and the
  // buildings; clear of the chase lane and of the block edges ~167/233) ----
  makeTree(172, 210, 1.4);
  addCollider(172 - 0.7, 172 + 0.7, 210 - 0.7, 210 + 0.7, 5);
  makeBench(172, 235, Math.PI / 2);
  makePlanter(172, 248);
  makeTree(228, 200, 1.2);
  addCollider(228 - 0.7, 228 + 0.7, 200 - 0.7, 200 + 0.7, 5);
  makeBench(228, 225, -Math.PI / 2);
  makePlanter(228, 245);

  // ================= CORAL PIER =================
  const deckMat = new THREE.MeshLambertMaterial({ map: makeDeckTexture() });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(145, 2.5, 90), deckMat);
  deck.position.set(-722.5, 1.25, 300);
  scene.add(deck);
  // support piles under the deck edge
  for (let x = -790; x <= -655; x += 15) {
    for (const z of [258, 342]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.5, 6), lambert(0x5a4a3a));
      pile.position.set(x, 1.25, z);
      scene.add(pile);
    }
  }
  // entrance arch + CORAL PIER sign (east end, facing the city)
  for (const dz of [-6, 6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7, 6), lambert(0x2471a3));
    post.position.set(-652, 2.5 + 3.5, 300 + dz);
    scene.add(post);
  }
  const pierSign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.5),
    new THREE.MeshBasicMaterial({ map: makeSignTexture('CORAL PIER', '#ffd23d', '#14283a') }),
  );
  pierSign.position.set(-652, 2.5 + 6.5, 300);
  pierSign.rotation.y = Math.PI / 2;
  scene.add(pierSign);
  signMats.push(pierSign.material);

  // ---- Ferris wheel ----
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(-778, 16, 300);
  scene.add(wheelGroup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.5, 8, 32), lambert(0xcccccc));
  wheelGroup.add(rim);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 13, 0.3), lambert(0xaaaaaa));
    spoke.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0);
    spoke.rotation.z = a - Math.PI / 2;
    wheelGroup.add(spoke);
  }
  // A-frame supports (static, not part of the rotating group)
  for (const dz of [-2.5, 2.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 17, 0.8), lambert(0x888888));
    leg.position.set(-778, 2.5 + 8, 300 + dz);
    leg.rotation.z = dz > 0 ? 0.12 : -0.12;
    scene.add(leg);
  }
  const cabins = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const cab = new THREE.Group();
    cab.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2), lambert([0xff2e4d, 0x2471a3, 0xd4ac0d, 0x7d3c98][k % 4]));
    body.position.y = -1.8;
    cab.add(body);
    wheelGroup.add(cab);
    cabins.push(cab);
  }
  // v16 (e): festival bulbs around the rim — children of the wheel group,
  // so they rotate with the rim (local radius 13).
  const rimBulbMat = basic(0xffd9a0);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), rimBulbMat);
    bulb.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0.6);
    wheelGroup.add(bulb);
  }
  // glow particles drifting around the wheel
  const glowCount = 40;
  const glowBase = new Float32Array(glowCount * 3);
  const glowPhase = new Float32Array(glowCount);
  const glowPos = new Float32Array(glowCount * 3);
  for (let i = 0; i < glowCount; i++) {
    const a = (i / glowCount) * Math.PI * 2;
    const r = 13 + detail() * 4;
    glowBase[i * 3] = -778 + Math.cos(a) * r;
    glowBase[i * 3 + 1] = 16 + Math.sin(a) * r * 0.8;
    glowBase[i * 3 + 2] = 300 + (detail() - 0.5) * 6;
    glowPhase[i] = detail() * Math.PI * 2;
  }
  glowPos.set(glowBase);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  glowPtsMat = new THREE.PointsMaterial({ color: 0xffd9a0, size: 1.6, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowPts = new THREE.Points(glowGeo, glowPtsMat);
  scene.add(glowPts);

  // ---- roller coaster: loop around (-742, 322), 48 track points ----
  const coasterPts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const cx = -742 + Math.cos(a) * 30;
    const cz = 322 + Math.sin(a) * 12;
    const cy = 8 + 3 * Math.sin(a * 2);
    coasterPts.push({ x: cx, y: cy, z: cz });
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 2.4), lambert(0x444444));
    tie.position.set(cx, cy, cz);
    tie.rotation.y = -a;
    scene.add(tie);
    if (i % 8 === 0) {
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, cy - 2.5, 6), lambert(0x666666));
      sup.position.set(cx, 2.5 + (cy - 2.5) / 2, cz);
      scene.add(sup);
    }
  }
  const train = [];
  for (let k = 0; k < 3; k++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 1.4), lambert([0xff2e4d, 0xffd23d, 0x2471a3][k]));
    scene.add(car);
    train.push(car);
  }
  let trainT = 0;

  // ---- stalls (north row z 268, south row z 332) ----
  const stallDefs = [
    { x: -760, z: 268, name: 'BALLOONS', fg: '#ff7e5f' },
    { x: -720, z: 268, name: 'COTTON CANDY', fg: '#ff9ecf' },
    { x: -680, z: 268, name: 'POPCORN', fg: '#ffd23d' },
    { x: -760, z: 332, name: 'HOT DOGS', fg: '#ff5a5a' },
    { x: -720, z: 332, name: 'RING TOSS', fg: '#7fd8ff' },
    { x: -680, z: 332, name: 'ICE CREAM', fg: '#ffffff' },
  ];
  for (const s of stallDefs) {
    const facesSouth = s.z < 300; // north row faces the deck centre (+z)
    const dir = facesSouth ? 1 : -1;
    addBox(8, 3, 6, lambert(0x8a5a3a), s.x, 2.5 + 1.5, s.z);
    addCollider(s.x - 4, s.x + 4, s.z - 3, s.z + 3, 5.5);
    // striped canopy
    addBox(9, 0.4, 7, lambert(0xff2e4d), s.x, 2.5 + 3.6, s.z + dir * 0.5);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 2),
      new THREE.MeshBasicMaterial({ map: makeSignTexture(s.name, s.fg, '#1a1a2e') }),
    );
    sign.position.set(s.x, 2.5 + 3.1, s.z + dir * 3.1);
    if (!facesSouth) sign.rotation.y = Math.PI;
    scene.add(sign);
    signMats.push(sign.material);
    // v16 (d): warm bulb strip under the canopy front — thin basic box,
    // night-driven like the other pier lights.
    const stripMat = basic(0xffd9a0, { transparent: true, opacity: 0.25 });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.25, 0.4), stripMat);
    strip.position.set(s.x, 2.5 + 3.35, s.z + dir * 3.6);
    scene.add(strip);
    stallBulbMats.push(stripMat);
  }

  // ---- festoon poles + string lights along both deck edges ----
  let stringLights = 0;
  const festoonNorth = [-770, -744, -718, -692, -666];
  const festoonSouth = [-758, -732, -706, -680, -654];
  for (const [zs, xs] of [[263, festoonNorth], [337, festoonSouth]]) {
    for (const fx of xs) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.5, 6), lambert(0x333333));
      pole.position.set(fx, 2.5 + 2.25, zs);
      scene.add(pole);
    }
    for (let k = 0; k < xs.length - 1; k++) {
      const x0 = xs[k];
      const x1 = xs[k + 1];
      for (let b = 1; b <= 9; b++) {
        const f = b / 10;
        const bx = x0 + (x1 - x0) * f;
        const by = 2.5 + 4.4 - Math.sin(f * Math.PI) * 0.9;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), basic(0xffe9a0));
        bulb.position.set(bx, by, zs);
        scene.add(bulb);
        stringLights++;
      }
    }
  }

  // ---- benches (14) + bins (6) ----
  const benchSpots = [];
  for (const bx of [-780, -750, -720, -690, -665]) {
    benchSpots.push([bx, 278], [bx, 322]);
  }
  benchSpots.push([-660, 280], [-660, 320], [-790, 280], [-790, 320]);
  for (const [bx, bz] of benchSpots) {
    const g = new THREE.Group();
    addBox(3, 0.3, 1, lambert(0x8a6a4a), 0, 2.5 + 0.9, 0, g);
    addBox(3, 1, 0.25, lambert(0x8a6a4a), 0, 2.5 + 1.5, bz < 300 ? -0.45 : 0.45, g);
    g.position.set(bx, 0, bz);
    scene.add(g);
  }
  for (const [bx, bz] of [[-770, 272], [-730, 272], [-690, 272], [-770, 328], [-730, 328], [-690, 328]]) {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 8), lambert(0x2e7d4a));
    bin.position.set(bx, 2.5 + 0.6, bz);
    scene.add(bin);
  }
  // corner flags
  for (const [fx, fz] of [[-790, 260], [-790, 340], [-655, 260], [-655, 340]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), lambert(0x888888));
    pole.position.set(fx, 2.5 + 2.5, fz);
    scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), basic(0xff2e4d, { side: THREE.DoubleSide }));
    flag.position.set(fx + 0.8, 2.5 + 4.4, fz);
    scene.add(flag);
  }

  // ---- v16 (a): pier lamp posts with bright heads + warm pools ----
  const pierLampSpots = [
    [-672, 263], [-700, 263], [-728, 263], [-756, 263], [-784, 263],
    [-686, 337], [-714, 337], [-742, 337], [-770, 337],
  ];
  for (const [lx, lz] of pierLampSpots) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5, 6), lambert(0x222222));
    pole.position.set(lx, 2.5 + 2.5, lz);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), basic(0xffe9a0));
    head.position.set(lx, 2.5 + 5.1, lz);
    scene.add(head);
    const poolMat = basic(0xffd9a0, { transparent: true, opacity: 0, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 20), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx, 2.56, lz);
    scene.add(pool);
    pierPoolMats.push(poolMat);
  }
  // ---- v16 (c): extra night-driven glow pools on the deck ----
  for (const [px, pz] of [[-700, 300], [-740, 290], [-760, 315], [-690, 320]]) {
    const poolMat = basic(0xffd9a0, { transparent: true, opacity: 0, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4, 20), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, 2.56, pz);
    scene.add(pool);
    pierPoolMats.push(poolMat);
  }
  // ---- v16 (f): low-opacity additive warm wash over the whole deck ----
  // A deck-specific exposure lift at night — NOT a global hemi change.
  washMat = basic(0xff9a50, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(145, 90), washMat);
  wash.rotation.x = -Math.PI / 2;
  wash.position.set(-722.5, 2.58, 300);
  scene.add(wash);

  // ---- v16 (b): boat with lit windows west of the pier + light streaks ----
  {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 5), lambert(0x2a3a4a));
    hull.position.y = 1.2;
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 4), lambert(0xf4f4f0));
    cabin.position.set(-1, 3.8, 0);
    boat.add(cabin);
    const winMat = basic(0xffe9a0);
    for (const wx of [-3, -1, 1]) {
      for (const wz of [2.05, -2.05]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), winMat);
        win.position.set(wx, 3.8, wz);
        if (wz < 0) win.rotation.y = Math.PI;
        boat.add(win);
      }
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), lambert(0x888888));
    mast.position.set(4, 6, 0);
    boat.add(mast);
    const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), basic(0xfff2b0));
    mastLight.position.set(4, 9.2, 0);
    boat.add(mastLight);
    boat.position.set(-860, 0, 280);
    scene.add(boat);
    // additive streaks on the water between the boat and the pier
    for (const [sx, sz, len, rot] of [[-835, 276, 30, 0.1], [-830, 280, 36, -0.06], [-840, 284, 26, 0.15]]) {
      const sm = basic(0xffd9a0, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.5), sm);
      streak.rotation.x = -Math.PI / 2;
      streak.rotation.z = rot;
      streak.position.set(sx, 0.1, sz);
      scene.add(streak);
      streakMats.push(sm);
    }
  }

  // ================= LONG BEACH PORT =================
  const slab = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), lambert(0x6a6a66));
  slab.rotation.x = -Math.PI / 2;
  slab.position.set(630, 0.07, 630);
  scene.add(slab);
  const containerColors = [0x2e7d9e, 0xc0392b, 0xd4ac0d, 0x2471a3, 0x7d3c98];
  const containers = [];
  const containerStacks = [
    [560, 520, 2], [600, 545, 1], [650, 560, 2], [664, 560, 1], [678, 560, 2],
    [700, 600, 3], [560, 680, 2], [620, 700, 1], [700, 680, 2], [580, 700, 1], [700, 520, 2],
  ];
  let ci = 0;
  for (const [cx, cz, levels] of containerStacks) {
    for (let l = 0; l < levels; l++) {
      const c = addBox(12, 2.6, 2.6, lambert(containerColors[ci % containerColors.length]), cx, 1.3 + l * 2.6, cz);
      containers.push(c);
      ci++;
    }
    addCollider(cx - 6, cx + 6, cz - 1.3, cz + 1.3, levels * 2.6);
  }
  // gantry cranes: legs + top beam + jib + hanging load
  const cranes = [];
  function makeCrane(cx, cz) {
    const g = new THREE.Group();
    for (const [dx, dz] of [[-8, -6], [8, -6], [-8, 6], [8, 6]]) {
      addBox(1.2, 28, 1.2, lambert(0xd4ac0d), cx + dx, 14, cz + dz, g);
    }
    addBox(20, 2, 14, lambert(0xd4ac0d), cx, 29, cz, g);
    addBox(26, 1.5, 1.5, lambert(0xc0392b), cx + 6, 31, cz, g); // jib
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 18, 4), lambert(0x222222));
    cable.position.set(cx + 14, 22, cz);
    g.add(cable);
    addBox(6, 2.5, 2.5, lambert(0x2e7d9e), cx + 14, 12, cz, g); // hanging load
    scene.add(g);
    addCollider(cx - 9, cx + 9, cz - 7, cz + 7, 30);
    cranes.push(g);
    return g;
  }
  makeCrane(520, 620);
  makeCrane(640, 660);
  // trailers
  const trailers = [];
  for (const [tx, tz, ry] of [[628, 550, 0.3], [560, 640, -0.4]]) {
    const g = new THREE.Group();
    addBox(10, 1, 3, lambert(0x888888), 0, 1, 0, g);
    addBox(6, 2.4, 2.4, lambert(0x2e7d9e), 0, 2.7, 0, g);
    for (const wx of [-3.5, 3.5]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 10), lambert(0x222222));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.7, 1.4);
      g.add(wheel);
      const wheel2 = wheel.clone();
      wheel2.position.z = -1.4;
      g.add(wheel2);
    }
    g.position.set(tx, 0, tz);
    g.rotation.y = ry;
    scene.add(g);
    trailers.push(g);
    addCollider(tx - 5, tx + 5, tz - 2, tz + 2, 4);
  }
  // pallets
  const pallets = [];
  function makePallet(px, pz, boxes) {
    const g = new THREE.Group();
    addBox(3, 0.3, 3, lambert(0x8a6a3a), 0, 0.15, 0, g);
    for (let b = 0; b < boxes; b++) {
      addBox(1.4, 1.4, 1.4, lambert(0xa08a5a), (b % 2) * 1.5 - 0.75, 1, Math.floor(b / 2) * 1.5 - 0.75, g);
    }
    g.position.set(px, 0, pz);
    scene.add(g);
    pallets.push(g);
  }
  makePallet(540, 615, 4); // v16 pallet stack by the forklift
  makePallet(575, 605, 3); // foreground, on the crane sightline
  makePallet(600, 580, 2);
  makePallet(660, 620, 3);
  makePallet(540, 700, 2);
  // ---- v16 shot-4: forklift + pallet stack near (545,600) ----
  {
    const fork = new THREE.Group();
    addBox(3, 1.6, 2, lambert(0xd4ac0d), 0, 1, 0, fork); // body
    addBox(0.4, 3.2, 1.8, lambert(0x333333), 1.5, 1.8, 0, fork); // mast
    addBox(1.6, 0.15, 0.25, lambert(0x888888), 2.2, 0.4, 0.5, fork); // forks
    addBox(1.6, 0.15, 0.25, lambert(0x888888), 2.2, 0.4, -0.5, fork);
    addBox(2, 1.2, 1.6, lambert(0x222222), -0.2, 2.2, 0, fork); // cab
    for (const [wx, wz] of [[-1, 0.9], [1, 0.9], [-1, -0.9], [1, -0.9]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10), lambert(0x111111));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.5, wz);
      fork.add(wheel);
    }
    fork.position.set(545, 0, 600);
    fork.rotation.y = 0;
    scene.add(fork);
  }
  // ---- v16 shot-4: crates + barrels in the near foreground ----
  addBox(2.2, 2.2, 2.2, lambert(0x8a6a3a), 535, 1.1, 580);
  addBox(1.8, 1.8, 1.8, lambert(0x6a4a2a), 537.5, 0.9, 580);
  addBox(2, 2, 2, lambert(0x8a6a3a), 548, 1, 592);
  for (const [bx, bz, col] of [[565, 578, 0x2471a3], [567, 579.5, 0xc0392b], [564, 580, 0x2e7d9e]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 10), lambert(col));
    barrel.position.set(bx, 1, bz);
    scene.add(barrel);
  }
  // ---- port lamps (v15: 2; v16: 3rd at (585,640)) + bigger/brighter pools ----
  // v16: ALL THREE pools radius 5 (was 4), opacity night×0.38 (was 0.30).
  for (const [lx, lz] of [[560, 590], [620, 650], [585, 640]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 9, 6), lambert(0x333333));
    pole.position.set(lx, 4.5, lz);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.8), lampHeadMat);
    head.position.set(lx, 9.1, lz);
    scene.add(head);
    const poolMat = basic(0xffd9a0, { transparent: true, opacity: 0, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 20), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx, 0.1, lz);
    scene.add(pool);
    portLampPoolMats.push(poolMat);
  }

  // ---- freeway ring: cars looping the outer rectangle ----
  const freewayCars = [];
  const ring = { x0: -640, x1: 460, z0: -680, z1: 460 };
  const ringPerim = 2 * ((ring.x1 - ring.x0) + (ring.z1 - ring.z0));
  const freewayKinds = ['sedan', 'pickup', 'suv', 'sport', 'sedan', 'pickup', 'suv', 'sedan'];
  const freewayColors = [0x2471a3, 0xd4ac0d, 0x7d3c98, 0xff2e4d, 0x2e7d9e, 0x8a7f72, 0xc0392b, 0x2471a3];
  function ringPos(s) {
    const w = ring.x1 - ring.x0;
    const h = ring.z1 - ring.z0;
    let d = ((s % ringPerim) + ringPerim) % ringPerim;
    if (d < w) return { x: ring.x0 + d, z: ring.z0, heading: Math.PI / 2 }; // east along north edge
    d -= w;
    if (d < h) return { x: ring.x1, z: ring.z0 + d, heading: 0 }; // south along east edge
    d -= h;
    if (d < w) return { x: ring.x1 - d, z: ring.z1, heading: -Math.PI / 2 }; // west along south edge
    d -= w;
    return { x: ring.x0, z: ring.z1 - d, heading: Math.PI }; // north along west edge
  }
  for (let i = 0; i < 8; i++) {
    const car = createVehicle(freewayKinds[i], 0, 0, 0, freewayColors[i]);
    car.ringS = (i / 8) * ringPerim;
    scene.add(car.group);
    freewayCars.push(car);
  }

  // ---- road graph (avenue x street intersections) ----
  const graph = {};
  for (const ax of WORLD.AVENUES) {
    for (const sz of WORLD.STREETS) {
      graph[`${ax}_${sz}`] = { x: ax, z: sz, links: [] };
    }
  }
  for (const ax of WORLD.AVENUES) {
    for (const sz of WORLD.STREETS) {
      const id = `${ax}_${sz}`;
      const ai = WORLD.AVENUES.indexOf(ax);
      const si = WORLD.STREETS.indexOf(sz);
      if (ai > 0) graph[id].links.push({ id: `${WORLD.AVENUES[ai - 1]}_${sz}`, cost: 200 });
      if (ai < WORLD.AVENUES.length - 1) graph[id].links.push({ id: `${WORLD.AVENUES[ai + 1]}_${sz}`, cost: 200 });
      if (si > 0) graph[id].links.push({ id: `${ax}_${WORLD.STREETS[si - 1]}`, cost: 200 });
      if (si < WORLD.STREETS.length - 1) graph[id].links.push({ id: `${ax}_${WORLD.STREETS[si + 1]}`, cost: 200 });
    }
  }

  const pier = {
    wheel: wheelGroup,
    cabins,
    train,
    trainT,
    glowPts,
    glowBase,
    glowPhase,
    glowCount,
    stats: { stringLights, benches: 14, bins: 6 },
  };
  // Port readout for __ndState: plain COUNTS, not meshes — the shoot driver
  // serializes the whole state through CDP returnByValue, and live THREE
  // objects break that ("Object reference chain is too long").
  const port = { containers: containers.length, pallets: pallets.length, trailers: trailers.length, cranes: cranes.length };
  const shop = { x: 90, z: 112 };
  const glowDiscs = glowSpotMats.length + storeSpotMats.length; // 17 + 11 = 28

  function setNight(n) {
    night = n;
    for (const m of facMats) m.emissiveIntensity = n * 0.9;
    for (const m of signMats) m.emissiveIntensity = n * 0.7;
    for (const m of glowSpotMats) {
      m.opacity = n * 0.22;
      m.visible = n > 0.05;
    }
    for (const m of storeSpotMats) {
      m.opacity = n * 0.22;
      m.visible = n > 0.05;
    }
    for (const m of pierPoolMats) {
      m.opacity = n * 0.22;
      m.visible = n > 0.05;
    }
    if (washMat) {
      washMat.opacity = n * 0.10;
      washMat.visible = n > 0.05;
    }
    for (const m of streakMats) {
      m.opacity = n * 0.30;
      m.visible = n > 0.05;
    }
    for (const m of stallBulbMats) m.opacity = 0.25 + n * 0.75;
    for (const m of portLampPoolMats) {
      m.opacity = n * 0.38;
      m.visible = n > 0.05;
    }
    if (glowPtsMat) glowPtsMat.opacity = 0.15 + n * 0.85;
  }

  function update(dt, t) {
    // traffic lights: 16 s cycle — ns green 0-7, yellow 7-8, red 8-16;
    // ew red 0-8, green 8-15, yellow 15-16.
    const cyc = t % 16;
    for (const g of trafficLights) {
      const phase = g.axis === 'ns'
        ? (cyc < 7 ? 2 : cyc < 8 ? 1 : 0)
        : (cyc < 8 ? 0 : cyc < 15 ? 2 : 1);
      for (let k = 0; k < 3; k++) g.lamps[k].emissiveIntensity = k === phase ? 2.5 : 0.05;
    }
    // ferris wheel: 0.12 rad/s, cabins counter-rotated to stay upright
    wheelGroup.rotation.z += dt * 0.12;
    for (const cab of cabins) cab.rotation.z = -wheelGroup.rotation.z;
    // coaster train: trainT in [0,1), one loop per 50 s
    trainT = (trainT + dt * 0.02) % 1;
    pier.trainT = trainT;
    const idx = Math.min(47, Math.floor(trainT * 48));
    for (let k = 0; k < 3; k++) {
      const p = coasterPts[(idx + k * 2) % 48];
      const p2 = coasterPts[(idx + k * 2 + 1) % 48];
      train[k].position.set(p.x, p.y + 0.8, p.z);
      train[k].rotation.y = Math.atan2(p2.x - p.x, p2.z - p.z);
    }
    // freeway ring
    for (const car of freewayCars) {
      car.ringS = (car.ringS + 25 * dt) % ringPerim;
      const p = ringPos(car.ringS);
      car.x = p.x;
      car.z = p.z;
      car.heading = p.heading;
      car.group.position.set(p.x, 0, p.z);
      car.group.rotation.y = p.heading;
    }
    // glow particles drift around the wheel
    const pos = glowGeo.attributes.position.array;
    for (let i = 0; i < glowCount; i++) {
      pos[i * 3] = glowBase[i * 3] + Math.sin(t * 0.4 + glowPhase[i]) * 1.5;
      pos[i * 3 + 1] = glowBase[i * 3 + 1] + Math.sin(t * 0.6 + glowPhase[i] * 2) * 1.2;
      pos[i * 3 + 2] = glowBase[i * 3 + 2] + Math.cos(t * 0.5 + glowPhase[i]) * 1.5;
    }
    glowGeo.attributes.position.needsUpdate = true;
    lampHeadMat.emissiveIntensity = 0.5 + night * 1.8;
  }

  return { graph, colliders, trafficLights, groundY, parkedSpots, update, pier, port, setNight, shop, glowDiscs };
}
