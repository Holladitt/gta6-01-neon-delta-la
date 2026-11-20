// Neon Delta LA — world: city layout, landmarks, Coral Pier, roads, props.
// All original content. Landmark names are invented for this game.
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, DISTRICTS, PALETTE } from './config.js';
import { mulberry32, pick, range, rangeInt, chance } from './rng.js';
import { mergeItems, boxItem, cylItem, groundTexture, windowTexture, signTexture } from './geo.js';
import { lightState } from './lights.js';

const rng = mulberry32(20261118);

export function groundY(x, z) {
  if (x >= -795 && x <= -650 && z >= 255 && z <= 345) {
    if (x > -665) return 2.5 * ((-650 - x) / 15); // entrance ramp
    return 2.5;
  }
  if (z < -720) return Math.min(12, (-720 - z) * 0.3);
  return 0;
}

// Water boundary: the ocean west of the beach (x < OCEAN_X + 2) is not
// walkable on foot; the only way west is the Coral Pier deck corridor
// (z 252..348, deck y 2.5). Pure — unit-tested in sim.test.mjs.
export function inWater(x, z) {
  return x < WORLD.OCEAN_X + 2 && (z < 252 || z > 348);
}

export function buildWorld(scene) {
  const colliders = [];
  const addCollider = (x0, z0, x1, z1, h = 30) => { colliders.push({ x0, z0, x1, z1, h }); };

  // ---- ground + ocean ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.HALF * 2, WORLD.HALF * 2),
    new THREE.MeshLambertMaterial({ map: groundTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 1800),
    new THREE.MeshLambertMaterial({ color: PALETTE.water })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-1020, -0.4, 0);
  scene.add(ocean);

  // ---- facade materials (varied window fields per style, not flat grids) ----
  // v12 night glow: every facade material carries its own texture as an
  // emissive map (warm, dim). At night the lit windows in the texture glow
  // and the walls pick up a faint warm wash; by day the intensity is 0.
  // Sign planes get the same treatment via glowMat() below.
  const facMats = [];
  const signMats = [];
  // v13: ground glow spots under neon signs — cheap light pools on the
  // pavement (same idea as the helicopter's ground light disc, which
  // already works). Collected at each sign site, built once below.
  const glowSpots = []; // {x, y, z, color} — shophouse row, DELTA ARMS, pier
  const storeSpots = []; // {x, y, z, color} — scattered storefronts (capped)
  const glowDiscs = []; // meshes; opacity driven by setNight
  const GLOW_COLORS = [0xff2e4d, 0xffc53d, 0x2ec4b6];
  function glowMat(tex) {
    const m = new THREE.MeshLambertMaterial({ map: tex });
    m.emissive = new THREE.Color(0xffd98a);
    m.emissiveMap = tex;
    m.emissiveIntensity = 0;
    signMats.push(m);
    return m;
  }
  const fac = {
    blue: new THREE.MeshLambertMaterial({ map: windowTexture('#8fb8d8', 'tower') }),
    tan: new THREE.MeshLambertMaterial({ map: windowTexture('#c9a876', 'block') }),
    white: new THREE.MeshLambertMaterial({ map: windowTexture('#e8e4da', 'block') }),
    dark: new THREE.MeshLambertMaterial({ map: windowTexture('#5a6a7a', 'tower') }),
    pink: new THREE.MeshLambertMaterial({ map: windowTexture('#e8a0a8', 'block') }),
    gray: new THREE.MeshLambertMaterial({ map: windowTexture('#9a9a92', 'block') }),
    teal: new THREE.MeshLambertMaterial({ map: windowTexture('#7fc4bd', 'tower') }),
    brick: new THREE.MeshLambertMaterial({ map: windowTexture('#a85a44', 'brick') }),
  };
  for (const m of Object.values(fac)) {
    m.emissive = new THREE.Color(0x8a6a3a);
    m.emissiveMap = m.map;
    m.emissiveIntensity = 0;
    facMats.push(m);
  }
  // Night level 0..1 (set by setNight): drives lamp heads, facade glow and
  // sign glow in update(). Stored in the closure, applied every frame.
  let night = 0;
  const plain = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glassCurved = new THREE.MeshLambertMaterial({ map: windowTexture('#6fa8c8', 'tower'), transparent: true, opacity: 0.92 });

  const byMat = { blue: [], tan: [], white: [], dark: [], pink: [], gray: [], teal: [], brick: [] };
  const plainItems = [];
  // Detail rng: separate stream from the layout rng, so new roof/storefront
  // props never shift existing building positions or sizes.
  const drng = mulberry32(20261119);
  const tallTowers = []; // {x,z,w,h,d} with h > 140, for sun-glint planes
  const storefrontSigns = []; // {x,z,text} ground-floor shop signs, added after the merge
  const SHOP_NAMES = ['DELTA TACOS', 'NEON LAUNDRY', 'SUNSET RECORDS', 'CORAL COFFEE', 'TIDE SURF SHOP', 'MARINA BAIT', 'VENICE GELATO', 'HARBOR DINER', 'SKYLINE GYM', 'DELTA PHARMACY', 'NEON MOTEL', 'PALM MARKET', 'GOLDEN HOUR BAR', 'DELTA BURGERS', 'CORAL FLORIST', 'NEON ARCADE'];
  const addBuilding = (x, z, w, h, d, mat, opts = {}) => {
    const it = boxItem(w, h, d, x, h / 2 + (opts.y || 0), z, 0xffffff, opts.ry || 0);
    it.uvScale = [Math.max(w, d) / 16, h / 30];
    byMat[mat].push(it);
    addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2, h + (opts.y || 0));
    // roof AC boxes + parapet
    const n = rangeInt(rng, 1, 3);
    for (let i = 0; i < n; i++) {
      plainItems.push(boxItem(3, 1.6, 3, x + range(rng, -w / 4, w / 4), h + 0.8 + (opts.y || 0), z + range(rng, -d / 4, d / 4), 0x8a8a82));
    }
    // parapet rim around the roof edge
    plainItems.push(boxItem(w, 1.0, 0.8, x, h + 0.5 + (opts.y || 0), z + d / 2 - 0.4, 0x6a6a62));
    plainItems.push(boxItem(w, 1.0, 0.8, x, h + 0.5 + (opts.y || 0), z - d / 2 + 0.4, 0x6a6a62));
    plainItems.push(boxItem(0.8, 1.0, d, x + w / 2 - 0.4, h + 0.5 + (opts.y || 0), z, 0x6a6a62));
    plainItems.push(boxItem(0.8, 1.0, d, x - w / 2 + 0.4, h + 0.5 + (opts.y || 0), z, 0x6a6a62));
    // tall towers: stepped setback crown + helipad on the very tallest
    if (h >= 120 && !opts.y) {
      const cw = w * 0.68, cd = d * 0.68, ch = 8 + drng() * 8;
      const crown = boxItem(cw, ch, cd, x, h + ch / 2, z, 0xffffff);
      crown.uvScale = [Math.max(cw, cd) / 16, ch / 30];
      byMat[mat].push(crown);
      addCollider(x - cw / 2, z - cd / 2, x + cw / 2, z + cd / 2, h + ch);
      if (h >= 170) {
        plainItems.push(boxItem(12, 0.4, 12, x, h + ch + 0.2, z, 0x2a2a2e)); // helipad slab
        plainItems.push(boxItem(12, 0.3, 0.8, x, h + ch + 0.45, z - 5.5, 0xf7c948));
        plainItems.push(boxItem(12, 0.3, 0.8, x, h + ch + 0.45, z + 5.5, 0xf7c948));
        tallTowers.push({ x, z, w, h: h + ch, d });
      }
    }
    // low blocks: wooden water tower on some roofs
    if (h <= 20 && drng() < 0.25) {
      const wx = x + (drng() - 0.5) * w * 0.5, wz = z + (drng() - 0.5) * d * 0.5;
      plainItems.push(cylItem(1.6, 1.9, 3.2, wx, h + 2.4 + (opts.y || 0), wz, 0x8a6a42, 8));
      plainItems.push({ geo: new THREE.ConeGeometry(2.0, 1.6, 8), matrix: new THREE.Matrix4().makeTranslation(wx, h + 4.8 + (opts.y || 0), wz), color: 0x6a4a2a });
      for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
        plainItems.push(boxItem(0.25, 1.6, 0.25, wx + lx, h + 0.8 + (opts.y || 0), wz + lz, 0x6a4a2a));
      }
    }
    if (opts.canopy) {
      plainItems.push(boxItem(w * 0.6, 0.5, 6, x, 4.2, z + d / 2 + 2.5, opts.canopyColor || 0xff2e4d));
      plainItems.push(boxItem(0.4, 4, 0.4, x - w * 0.28, 2, z + d / 2 + 5, 0x333333));
      plainItems.push(boxItem(0.4, 4, 0.4, x + w * 0.28, 2, z + d / 2 + 5, 0x333333));
    }
    if (opts.antenna) {
      plainItems.push(cylItem(0.3, 0.3, 18, x, h + 9, z, 0x666666, 6));
      plainItems.push(boxItem(4, 0.3, 4, x, h + 16, z, 0x888888));
    }
    // ground-floor storefront: neon name sign on the street face + awning
    if (opts.storefront) {
      storefrontSigns.push({ x, z: z + d / 2 + 0.4, text: opts.storefront });
      plainItems.push(boxItem(w * 0.55, 0.4, 4.5, x, 3.6, z + d / 2 + 2, opts.canopyColor || 0xff2e4d));
    }
    return { x, z, w, h, d };
  };

  // ---- district fill: blocks between roads ----
  const keepClear = [
    [600, 700, 30], [600, 560, 24], [100, -500, 30], [-480, -560, 30], [520, 560, 30],
    [-700, 300, 60], [0, 700, 30], [700, -300, 30], [-400, 500, 30],
  ];
  const isClear = (x, z) => keepClear.some(([cx, cz, r]) => Math.abs(x - cx) < r && Math.abs(z - cz) < r);
  const blockCenters = [];
  for (let i = 0; i < WORLD.AVENUES.length - 1; i++) {
    for (let j = 0; j < WORLD.STREETS.length - 1; j++) {
      blockCenters.push([(WORLD.AVENUES[i] + WORLD.AVENUES[i + 1]) / 2, (WORLD.STREETS[j] + WORLD.STREETS[j + 1]) / 2]);
    }
  }
  const kindAt = (x, z) => {
    for (const d of DISTRICTS) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.kind;
    return 'mid';
  };
  const matCycle = ['blue', 'tan', 'white', 'dark', 'teal', 'gray', 'brick'];
  const portStats = { containers: 0, pallets: 0, trailers: 0, cranes: 0 };
  for (const [bx, bz] of blockCenters) {
    if (isClear(bx, bz)) continue;
    const kind = kindAt(bx, bz);
    if (kind === 'pier' || kind === 'freeway' || kind === 'hills') continue;
    if (kind === 'towers') {
      const n = chance(rng, 0.5) ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const w = range(rng, 34, 52), d = range(rng, 34, 52), h = range(rng, 90, 240);
        addBuilding(bx + (i === 0 ? -18 : 22), bz + (i === 0 ? 10 : -14), w, h, d, pick(rng, ['blue', 'dark', 'teal']), { antenna: chance(rng, 0.4) });
      }
    } else if (kind === 'mid') {
      const n = rangeInt(rng, 2, 4);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 22, 34), d = range(rng, 22, 34), h = range(rng, 22, 58);
        addBuilding(bx + range(rng, -50, 50), bz + range(rng, -50, 50), w, h, d, pick(rng, matCycle), { canopy: chance(rng, 0.5), canopyColor: pick(rng, [0xff2e4d, 0x2ec4b6, 0xffc53d, 0xff7e5f]), storefront: drng() < 0.5 ? pick(drng, SHOP_NAMES) : undefined });
      }
    } else if (kind === 'low' || kind === 'canal') {
      const n = rangeInt(rng, 3, 5);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 14, 22), d = range(rng, 14, 22), h = range(rng, 8, 16);
        addBuilding(bx + range(rng, -55, 55), bz + range(rng, -55, 55), w, h, d, pick(rng, ['tan', 'white', 'pink', 'teal', 'brick']), { storefront: drng() < 0.3 ? pick(drng, SHOP_NAMES) : undefined, canopyColor: pick(drng, [0xff2e4d, 0x2ec4b6, 0xffc53d]) });
      }
    } else if (kind === 'port') {
      addBuilding(bx, bz, range(rng, 50, 70), range(rng, 12, 18), range(rng, 30, 44), 'gray');
      // container yard: two rows of stacked containers with a gap in the middle
      // so the terminal stays walkable; nothing blocks a keep-clear point.
      // Extra edge rows sit right beside the roads so the yard reads as dense
      // from the avenue (the block's inner rows are 48u+ from the road).
      const nearClear = (x, z, r) => keepClear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + r);
      const contColors = [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98, 0xe67e22];
      const stackAt = (cx, cz) => {
        if (nearClear(cx, cz, 10)) return;
        const stack = chance(rng, 0.45) ? 3 : chance(rng, 0.6) ? 2 : 1;
        for (let s = 0; s < stack; s++) {
          plainItems.push(boxItem(12, 2.6, 2.6, cx, 1.3 + s * 2.7, cz, pick(rng, contColors)));
        }
        addCollider(cx - 6, cz - 1.3, cx + 6, cz + 1.3, 2.7 * stack);
        portStats.containers += stack;
      };
      for (const rz of [-42, 42]) {
        for (const ox of [-78, -52, -39, -26, 26, 39, 52, 78]) stackAt(bx + ox, bz + rz);
      }
      for (const rz of [-78, 78]) {
        for (const ox of [-52, -39, -26, 26, 39, 52]) stackAt(bx + ox, bz + rz);
      }
      // wooden pallet stacks near the warehouse corners
      for (const [px, pz] of [[-58, -58], [58, -58], [-58, 58], [58, 58]]) {
        const cx = bx + px, cz = bz + pz;
        if (nearClear(cx, cz, 6)) continue;
        const h = rangeInt(rng, 1, 2);
        for (let s = 0; s < h; s++) {
          plainItems.push(boxItem(2.4, 1.0, 2.4, cx, 0.5 + s * 1.05, cz, 0xb08a5a));
          plainItems.push(boxItem(2.2, 0.2, 2.2, cx, 1.05 + s * 1.05, cz, 0x8a6a42));
        }
        portStats.pallets += h;
      }
    }
  }

  // ---- landmarks with identity (original names) ----
  // Delta General Hospital: white slab + blue-glass tower + canopy + ambulance.
  addBuilding(200, -480, 64, 26, 34, 'white', { canopy: true, canopyColor: 0x2ec4b6 });
  addBuilding(200, -520, 34, 64, 26, 'blue', { antenna: true });
  plainItems.push(boxItem(10, 3.4, 4, 236, 1.7, -440, 0xf4f4f0)); // ambulance body
  plainItems.push(boxItem(3, 3.4, 3.8, 228, 1.7, -440, 0xf4f4f0));
  plainItems.push(boxItem(0.4, 2.2, 0.4, 236, 1.7, -438, 0xc0392b));
  plainItems.push(boxItem(2.2, 0.4, 0.4, 236, 1.7, -438, 0xc0392b));
  // Neon Delta City Hall: brown stepped mass + central tower + antenna + walled plaza.
  addBuilding(-120, -480, 84, 18, 52, 'tan');
  addBuilding(-120, -480, 52, 32, 40, 'tan', { y: 18 });
  addBuilding(-120, -480, 22, 74, 22, 'tan', { y: 50, antenna: true });
  plainItems.push(boxItem(90, 3, 1, -120, 1.5, -448, 0xb09a7a));
  plainItems.push(boxItem(90, 3, 1, -120, 1.5, -512, 0xb09a7a));
  // Civic Center (gray + tower) beside the freeway.
  addBuilding(560, -480, 52, 24, 38, 'gray');
  addBuilding(560, -520, 18, 62, 18, 'gray', { antenna: true });
  // v10: water towers on three landmark roofs (the towers already carry
  // antennas) — hospital slab, city-hall base, civic-center base.
  plainItems.push(cylItem(2.2, 2.2, 4, 220, 26 + 2.4, -490, 0xa8875a, 10));
  plainItems.push({ geo: new THREE.ConeGeometry(2.4, 2, 10), matrix: new THREE.Matrix4().makeTranslation(220, 26 + 5.4, -490), color: 0x8f6f42 });
  for (const [lx, lz] of [[218.5, -491.5], [221.5, -491.5], [218.5, -488.5], [221.5, -488.5]]) {
    plainItems.push(cylItem(0.18, 0.18, 2.4, lx, 26 + 1.2, lz, 0x555555, 6));
  }
  plainItems.push(cylItem(2.2, 2.2, 4, -155, 18 + 2.4, -490, 0xa8875a, 10));
  plainItems.push({ geo: new THREE.ConeGeometry(2.4, 2, 10), matrix: new THREE.Matrix4().makeTranslation(-155, 18 + 5.4, -490), color: 0x8f6f42 });
  for (const [lx, lz] of [[-156.5, -491.5], [-153.5, -491.5], [-156.5, -488.5], [-153.5, -488.5]]) {
    plainItems.push(cylItem(0.18, 0.18, 2.4, lx, 18 + 1.2, lz, 0x555555, 6));
  }
  plainItems.push(cylItem(2.2, 2.2, 4, 580, 24 + 2.4, -470, 0xa8875a, 10));
  plainItems.push({ geo: new THREE.ConeGeometry(2.4, 2, 10), matrix: new THREE.Matrix4().makeTranslation(580, 24 + 5.4, -470), color: 0x8f6f42 });
  for (const [lx, lz] of [[578.5, -471.5], [581.5, -471.5], [578.5, -468.5], [581.5, -468.5]]) {
    plainItems.push(cylItem(0.18, 0.18, 2.4, lx, 24 + 1.2, lz, 0x555555, 6));
  }
  // Shophouses: bright colors, ground-floor stores with awnings + signs.
  const shopColors = ['pink', 'teal', 'tan', 'blue', 'white', 'pink'];
  const shopNames = ['CORAL TACOS', 'NEON DONUTS', 'PIER GIFTS', 'SUNSET CAFE', 'VINYL & CO', 'TIDE BOOKS'];
  const shopSigns = [];
  shopColors.forEach((m, i) => {
    const x = -80 + i * 34;
    const cc = pick(rng, [0xff2e4d, 0xffc53d, 0x2ec4b6]);
    addBuilding(x, 100, 26, range(rng, 12, 18), 16, m, { canopy: true, canopyColor: cc });
    shopSigns.push({ x, z: 100, text: shopNames[i] });
    // v10 shopfront detail: flower window box + striped awning valance +
    // a display shelf with colorful goods on the street face.
    plainItems.push(boxItem(2.2, 0.4, 0.5, x, 2.6, 108.5, 0x8a6a42));
    for (let f = 0; f < 3; f++) {
      plainItems.push({ geo: new THREE.SphereGeometry(0.25, 8, 6), matrix: new THREE.Matrix4().makeTranslation(x - 0.7 + f * 0.7, 2.95, 108.5), color: [0xff2e4d, 0xffc53d, 0x2ec4b6][f] });
    }
    for (let s = 0; s < 5; s++) {
      plainItems.push(boxItem(1.1, 0.4, 0.2, x - 2.2 + s * 1.1, 3.9, 108.2, s % 2 ? 0xf4f4f0 : cc));
    }
    plainItems.push(boxItem(4.5, 0.25, 0.8, x, 3.0, 108.6, 0x6a4a2a));
    for (let gIdx = 0; gIdx < 3; gIdx++) {
      plainItems.push(boxItem(0.9, 0.7, 0.7, x - 1.5 + gIdx * 1.5, 3.45, 108.6, [0xff2e4d, 0xffc53d, 0x2ec4b6][(i + gIdx) % 3]));
    }
  });
  // v12: DELTA ARMS gun shop — the last shophouse on the row (x=90, z=100)
  // carries the shop sign on its street face; the door the player walks up
  // to is at (90, 112). The sign glows at night like every other sign.
  const armsSign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 5),
    glowMat(signTexture(['DELTA ARMS', 'GUNS & AMMO'], { bg: '#1a1a1a', fg: '#ffc53d' }))
  );
  armsSign.position.set(90, 8.5, 108.6);
  scene.add(armsSign);
  // v13: sodium glow pool on the street in front of the gun shop.
  glowSpots.push({ x: 90, y: 0.12, z: 118, color: 0xffc53d });
  // v13: one glow pool per shophouse on the row (the x=90 shophouse is
  // DELTA ARMS, already covered above with its sodium pool).
  for (const s of shopSigns) {
    if (s.x === 90) continue;
    glowSpots.push({ x: s.x, y: 0.12, z: s.z + 16, color: GLOW_COLORS[glowSpots.length % 3] });
  }
  // Curved-glass corner towers (Downtown landmarks).
  const curved = [];
  for (const [cx, cz] of [[-100, -300], [140, -260]]) {
    const bh = range(rng, 120, 180);
    addBuilding(cx, cz, 44, bh, 44, 'blue');
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, bh, 12, 1, false, 0, Math.PI / 2),
      glassCurved
    );
    seg.position.set(cx + 22, bh / 2, cz + 22);
    scene.add(seg);
    curved.push(seg);
    addCollider(cx + 10, cz + 10, cx + 34, cz + 34, 180);
  }

  // ---- merge buildings into a few meshes ----
  for (const [key, items] of Object.entries(byMat)) {
    if (!items.length) continue;
    const mesh = new THREE.Mesh(mergeItems(items), fac[key]);
    scene.add(mesh);
  }
  scene.add(new THREE.Mesh(mergeItems(plainItems), plain));
  plainItems.length = 0; // merged; reuse the array for sign posts below

  // ---- sunset glint on the tallest west faces (the sun sets over the ocean)
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const t of tallTowers.slice(0, 10)) {
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(t.d * 0.8, t.h * 0.45), glintMat);
    glint.position.set(t.x - t.w / 2 - 0.15, t.h * 0.58, t.z);
    glint.rotation.y = -Math.PI / 2;
    scene.add(glint);
  }
  // ---- ground-floor storefront signs (neon names on the street face)
  for (const s of storefrontSigns) {
    const tex = signTexture([s.text], { bg: '#12233d' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.5), glowMat(tex));
    m.position.set(s.x, 5.4, s.z);
    scene.add(m);
    // glow pool on the pavement in front of the sign (street side, +z out
    // from the face — storefront z already sits on the building face).
    storeSpots.push({ x: s.x, y: 0.12, z: s.z + 6, color: GLOW_COLORS[storeSpots.length % 3] });
  }

  // ---- signs (billboards with original names) ----
  const signDefs = [
    { x: 200, z: -460, ry: 0, lines: ['DELTA GENERAL', 'HOSPITAL', 'EMERGENCY 24H'] },
    { x: -120, z: -448, ry: 0, lines: ['NEON DELTA', 'CITY HALL'] },
    { x: -700, z: 220, ry: 0, lines: ['CORAL PIER', 'AMUSEMENT PIER', 'GAMES • RIDES • CAFES'] },
    ...shopSigns.map((s) => ({ x: s.x, z: s.z + 10, ry: 0, lines: [s.text] })),
  ];
  for (const s of signDefs) {
    const tex = signTexture(s.lines, { bg: '#12233d' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), glowMat(tex));
    m.position.set(s.x, 10, s.z);
    m.rotation.y = s.ry;
    scene.add(m);
    plainItems.push(boxItem(0.6, 10, 0.6, s.x - 7, 5, s.z, 0x333333));
    plainItems.push(boxItem(0.6, 10, 0.6, s.x + 7, 5, s.z, 0x333333));
  }
  if (plainItems.length) scene.add(new THREE.Mesh(mergeItems(plainItems), plain));
  plainItems.length = 0;

  // Hillside sign: NEON DELTA LA letters on the north hills.
  const hillSign = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 18),
    glowMat(signTexture(['NEON DELTA LA'], { bg: '#e8e4da', fg: '#ff2e4d' }))
  );
  hillSign.position.set(0, 14, -755);
  hillSign.rotation.x = -0.25;
  scene.add(hillSign);
  for (const [hx, hz] of [[-300, -760], [-100, -770], [200, -760], [420, -770]]) {
    const mound = new THREE.Mesh(new THREE.SphereGeometry(60, 12, 8), new THREE.MeshLambertMaterial({ color: 0x6a8a52 }));
    mound.scale.set(1, 0.28, 0.7);
    mound.position.set(hx, 0, hz);
    scene.add(mound);
  }
  for (const [hx, hz] of [[-320, -740], [120, -740], [380, -740]]) {
    addBuilding(hx, hz, 20, 10, 16, 'tan');
  }

  // ---- palms, lamps, trees (merged) ----
  const palmTrunks = [], palmFronds = [], lampPosts = [], lampHeads = [], treeItems = [];
  const addPalm = (x, z, s = 1) => {
    const h = 11 * s;
    palmTrunks.push(cylItem(0.35, 0.55, h, x, h / 2, z, 0x8a6a42, 7));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      palmFronds.push(boxItem(5.5, 0.25, 1.6, x + Math.cos(a) * 2.4, h + 0.4, z + Math.sin(a) * 2.4, 0x2f8f4e, a, 0, 0.5));
    }
  };
  // beachfront drive palms + pier palms + boulevard palms. The boulevard
  // palm at x=-208 stood right in front of the VISIT CORAL PIER billboard
  // at (-200,-200) and hid its left half from the south, so that one palm
  // grows 32u west instead (same rng draw order, layout unchanged).
  for (let z = -380; z <= 500; z += 44) addPalm(-640, z, range(rng, 0.9, 1.2));
  for (const z of [272, 328]) { addPalm(-680, z, 1); addPalm(-760, z, 1); } // off the center line: nothing blocks the wheel
  for (let x = -560; x <= 560; x += 88) addPalm(x === -208 ? -240 : x, -188, range(rng, 0.9, 1.15));
  for (let i = 0; i < 40; i++) {
    const x = range(rng, -640, 640), z = range(rng, -640, 640);
    if (Math.abs(x % 200) < 30 || Math.abs(z % 200) < 30) continue;
    treeItems.push(cylItem(0.4, 0.5, 3, x, 1.5, z, 0x6a4a2a, 6));
    treeItems.push({ geo: new THREE.SphereGeometry(range(rng, 2.5, 4), 8, 6), matrix: new THREE.Matrix4().makeTranslation(x, 5.5, z), color: 0x4a8a3a });
  }
  for (const x of WORLD.AVENUES) for (let z = -700; z <= 700; z += 100) {
    lampPosts.push(cylItem(0.18, 0.22, 8, x + 13, 4, z, 0x2a2a2e, 6));
    lampPosts.push(boxItem(3, 0.3, 0.3, x + 11.5, 8, z, 0x2a2a2e));
    lampHeads.push(boxItem(1.6, 0.55, 0.7, x + 10, 7.8, z, 0xfff2c0));
  }
  scene.add(new THREE.Mesh(mergeItems(palmTrunks), plain));
  scene.add(new THREE.Mesh(mergeItems(palmFronds), plain));
  scene.add(new THREE.Mesh(mergeItems(lampPosts), plain));
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffdf80, emissiveIntensity: 0.5 });
  scene.add(new THREE.Mesh(mergeItems(lampHeads), lampHeadMat));
  scene.add(new THREE.Mesh(mergeItems(treeItems), plain));

  // ---- traffic lights (working, cycling) ----
  const lightGroups = [];
  const lampMats = {
    red: new THREE.MeshLambertMaterial({ color: 0x330000, emissive: 0xff2222, emissiveIntensity: 0 }),
    yellow: new THREE.MeshLambertMaterial({ color: 0x332200, emissive: 0xffcc22, emissiveIntensity: 0 }),
    green: new THREE.MeshLambertMaterial({ color: 0x002200, emissive: 0x22ff66, emissiveIntensity: 0 }),
  };
  const lightPosts = [];
  const lightDefs = [];
  for (const x of [-400, 0, 400]) for (const z of [-400, 0, 400]) lightDefs.push([x, z]);
  lightDefs.push([-600, 200], [200, 600], [-200, -200]);
  lightDefs.forEach(([x, z], i) => {
    const off = (i % 4) * 3.75;
    // NS light (faces traffic along z) on the east side, EW light on the north side
    const mk = (lx, lz, axis, ry) => {
      lightPosts.push(cylItem(0.22, 0.26, 7, lx, 3.5, lz, 0x222222, 6));
      lightPosts.push(boxItem(7, 0.35, 0.35, lx + (axis === 'ns' ? 0 : -3.5), 7, lz + (axis === 'ns' ? -3.5 : 0), 0x222222));
      const head = new THREE.Group();
      head.position.set(lx + (axis === 'ns' ? 0 : -6.5), 6.2, lz + (axis === 'ns' ? -6.5 : 0));
      head.rotation.y = ry;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 0.9), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
      head.add(box);
      const lamps = {};
      [['red', 0.75], ['yellow', 0], ['green', -0.75]].forEach(([name, dy]) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), lampMats[name]);
        s.position.set(0, dy, 0.48);
        head.add(s);
        lamps[name] = s;
      });
      scene.add(head);
      lightGroups.push({ axis, offset: off, lamps, x: lx, z: lz });
    };
    mk(x + 14, z + 14, 'ns', Math.PI);
    mk(x - 14, z - 14, 'ew', Math.PI / 2);
  });
  scene.add(new THREE.Mesh(mergeItems(lightPosts), plain));

  // ---- Coral Pier (landmark): arch gate, boardwalk, shops, bunting, wheel, coaster ----
  const pier = { wheel: null, cabins: [], train: null, trainT: 0 };
  const pierItems = [];
  // deck: narrow planks in three wood tones with a darker seam every fourth
  // plank, so the boardwalk reads as boards, not one flat brown slab.
  const plankTones = [0x9c7a4a, 0xa8875a, 0x8f6f42];
  for (let i = 0; i < 52; i++) {
    pierItems.push(boxItem(2.6, 0.6, 86, -792 + i * 2.6, 2.2, 300, i % 4 === 3 ? 0x7a5c34 : plankTones[i % 3]));
  }
  pierItems.push(boxItem(140, 1.2, 1, -725, 1.8, 258, 0x7a5c34));
  pierItems.push(boxItem(140, 1.2, 1, -725, 1.8, 342, 0x7a5c34));
  // support pillars under the deck
  for (let x = -790; x <= -665; x += 18) for (const z of [262, 300, 338]) {
    pierItems.push(cylItem(0.9, 1.1, 8, x, -1.5, z, 0x6a5a44, 8));
  }
  // double-yellow center line down the boardwalk (per the pier reference)
  pierItems.push(boxItem(130, 0.15, 0.5, -725, 2.55, 297, 0xf7c948));
  pierItems.push(boxItem(130, 0.15, 0.5, -725, 2.55, 303, 0xf7c948));
  // railings
  for (let x = -790; x <= -660; x += 10) {
    pierItems.push(boxItem(0.3, 1.1, 0.3, x, 3.1, 258.5, 0xf4f4f0));
    pierItems.push(boxItem(0.3, 1.1, 0.3, x, 3.1, 341.5, 0xf4f4f0));
  }
  pierItems.push(boxItem(132, 0.25, 0.25, -725, 3.6, 258.5, 0xf4f4f0));
  pierItems.push(boxItem(132, 0.25, 0.25, -725, 3.6, 341.5, 0xf4f4f0));
  scene.add(new THREE.Mesh(mergeItems(pierItems), plain));
  // arch gate at the beach end: striped pillars + arch + CORAL PIER sign
  const gateItems = [];
  for (let i = 0; i < 6; i++) {
    gateItems.push(boxItem(2.4, 2.2, 2.4, -656, 2.5 + i * 2.2 + 1.1, 282, i % 2 ? 0xf4f4f0 : 0xc0392b));
    gateItems.push(boxItem(2.4, 2.2, 2.4, -656, 2.5 + i * 2.2 + 1.1, 318, i % 2 ? 0xf4f4f0 : 0xc0392b));
  }
  scene.add(new THREE.Mesh(mergeItems(gateItems), plain));
  const arch = new THREE.Mesh(new THREE.TorusGeometry(18, 1.4, 8, 24, Math.PI), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  arch.position.set(-656, 15.5, 300);
  scene.add(arch);
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 10),
    glowMat(signTexture(['CORAL PIER', 'AMUSEMENT PIER', 'GAMES • RIDES • CAFES'], { bg: '#12233d', fg: '#ff5a6e' }))
  );
  gateSign.position.set(-656, 12, 300);
  scene.add(gateSign);
  // pier shops / stalls: two-tone body, striped canopy, counter with goods,
  // and a big name sign on the deck-facing side (the old sign sat on the
  // back face, hidden behind the stall, so stalls read as plain color blocks).
  const stallNames = ['RING TOSS', 'CORAL DOGS', 'POPCORN', 'CANDY', 'BALLOONS', 'FISHING', 'ARCADE', 'LEMONADE', 'SNO-CONES', 'CORAL POP'];
  const stallColors = [0xff2e4d, 0x2ec4b6, 0xffc53d, 0xff7e5f, 0x7d3c98, 0x2471a3, 0x229954, 0xd4ac0d, 0x2ec4b6, 0xff7e5f];
  const goodsColors = [0xff2e4d, 0xffc53d, 0x2ec4b6, 0x7d3c98, 0xff7e5f, 0xf4f4f0];
  const stallItems = [];
  stallNames.forEach((name, i) => {
    const side = i % 2 === 0 ? 268 : 332;
    const x = -680 - Math.floor(i / 2) * 22;
    const front = side + (side < 300 ? 4.5 : -4.5); // deck-facing side
    // two-tone body: dark wood base, bright upper
    stallItems.push(boxItem(10, 2.2, 8, x, 3.6, side, 0x8a6a42));
    stallItems.push(boxItem(10, 2.6, 8, x, 5.8, side, stallColors[i]));
    stallItems.push(boxItem(11, 0.4, 9, x, 7.2, side, 0xf4f4f0));
    // striped canopy above the sign, over the stall front
    for (let s = 0; s < 5; s++) {
      stallItems.push(boxItem(2.2, 0.3, 3.5, x - 4.4 + s * 2.2, 7.35, front + (side < 300 ? 0.3 : -0.3), s % 2 ? 0xf4f4f0 : stallColors[i]));
    }
    // wooden counter + colorful goods (jars, boxes, toys) on it
    stallItems.push(boxItem(8, 1.0, 2.2, x, 3.0, front, 0x6a4a2a));
    for (let gIdx = 0; gIdx < 5; gIdx++) {
      const gx = x - 3 + gIdx * 1.5;
      stallItems.push(boxItem(0.9, 0.7 + (gIdx % 2) * 0.5, 0.9, gx, 3.85 + (gIdx % 2) * 0.25, front, goodsColors[(i + gIdx) % 6]));
    }
    addCollider(x - 5, side - 4, x + 5, side + 4, 8);
    // big name sign on the front face, facing the boardwalk
    const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), glowMat(signTexture([name], { bg: '#12233d' })));
    s.position.set(x, 5.6, side + (side < 300 ? 4.15 : -4.15));
    s.rotation.y = side < 300 ? 0 : Math.PI;
    scene.add(s);
    // v13: glow pool on the deck in front of the stall (deck y ≈ 2.5).
    glowSpots.push({ x, y: 2.62, z: side + (side < 300 ? 6 : -6), color: GLOW_COLORS[glowSpots.length % 3] });
  });
  scene.add(new THREE.Mesh(mergeItems(stallItems), plain));
  // bunting strings across the deck
  const buntItems = [];
  const buntColors = [0xff2e4d, 0xffc53d, 0x2ec4b6, 0x7d3c98, 0xff7e5f];
  for (const bx of [-672, -720, -768]) {
    for (let i = 0; i < 12; i++) {
      const z = 262 + i * 6.8;
      const sag = Math.sin((i / 11) * Math.PI) * 1.2;
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([bx, 8.4 - sag, z, bx + 1.6, 8.4 - sag, z, bx + 0.8, 7.2 - sag, z], 3));
      tri.computeVertexNormals();
      buntItems.push({ geo: tri, matrix: new THREE.Matrix4(), color: buntColors[i % 5] });
    }
  }
  scene.add(new THREE.Mesh(mergeItems(buntItems), plain));
  // festival string lights (lower + closer so they hang into the frame),
  // benches, and trash bins along the boardwalk
  const festPoleItems = [];
  const bulbItems = [];
  const bulbColors = [0xffd98a, 0xff5a6e, 0x2ec4b6, 0xffc53d];
  for (const bz of [263, 337]) {
    for (let x = -786; x <= -664; x += 13.5) {
      festPoleItems.push(cylItem(0.2, 0.24, 5, x, 5.0, bz, 0x333333, 6));
    }
    for (let x = -786; x < -664; x += 13.5) {
      for (let i = 0; i <= 4; i++) {
        const fx = x + (i / 4) * 13.5;
        const sag = Math.sin((i / 4) * Math.PI) * 1.4;
        bulbItems.push({
          geo: new THREE.BoxGeometry(0.55, 0.55, 0.55),
          matrix: new THREE.Matrix4().makeTranslation(fx, 7.0 - sag, bz),
          color: bulbColors[(Math.floor(x) + i) % 4],
        });
      }
    }
  }
  scene.add(new THREE.Mesh(mergeItems(festPoleItems), plain));
  const bulbMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  scene.add(new THREE.Mesh(mergeItems(bulbItems), bulbMat));
  const benchItems = [];
  for (const bx of [-776, -750, -724, -698, -672]) {
    for (const bz of [268, 332]) {
      benchItems.push(boxItem(3.4, 0.2, 0.9, bx, 3.05, bz, 0x8a6a42));
      benchItems.push(boxItem(3.4, 1.1, 0.15, bx, 3.6, bz + (bz < 300 ? -0.4 : 0.4), 0x8a6a42));
      benchItems.push(boxItem(0.2, 0.5, 0.7, bx - 1.4, 2.75, bz, 0x333333));
      benchItems.push(boxItem(0.2, 0.5, 0.7, bx + 1.4, 2.75, bz, 0x333333));
    }
  }
  // center-line benches facing the wheel, so the front deck is not empty
  for (const bx of [-780, -750, -720, -690]) {
    benchItems.push(boxItem(3.4, 0.2, 0.9, bx, 3.05, 300, 0x8a6a42));
    benchItems.push(boxItem(3.4, 1.1, 0.15, bx, 3.6, 299.5, 0x8a6a42));
    benchItems.push(boxItem(0.2, 0.5, 0.7, bx - 1.4, 2.75, 300, 0x333333));
    benchItems.push(boxItem(0.2, 0.5, 0.7, bx + 1.4, 2.75, 300, 0x333333));
  }
  for (const [tx, tz] of [[-760, 266], [-712, 334], [-688, 266], [-740, 266], [-700, 334], [-676, 266]]) {
    benchItems.push(cylItem(0.8, 0.75, 1.5, tx, 3.25, tz, 0x2f7a3a, 10));
    benchItems.push(cylItem(0.9, 0.9, 0.18, tx, 4.05, tz, 0x444444, 10));
  }
  scene.add(new THREE.Mesh(mergeItems(benchItems), plain));
  const pierStats = { stringLights: bulbItems.length, benches: 14, bins: 6 };
  // foreground carnival props near the deck center (in the pier shot's frame):
  // popcorn cart, balloon bunch, ring-toss table, cotton-candy cart
  const carnivalItems = [];
  // popcorn cart: red cart + striped canopy + popcorn boxes
  carnivalItems.push(boxItem(2.6, 1.4, 1.6, -706, 3.2, 288, 0xc0392b));
  carnivalItems.push(boxItem(2.8, 0.3, 1.8, -706, 4.0, 288, 0xf4f4f0));
  for (let s = 0; s < 4; s++) carnivalItems.push(boxItem(0.7, 0.25, 1.9, -707.2 + s * 0.8, 4.6, 288, s % 2 ? 0xf4f4f0 : 0xc0392b));
  carnivalItems.push(boxItem(1.0, 0.8, 0.8, -706.8, 4.5, 288, 0xffc53d));
  carnivalItems.push(boxItem(1.0, 0.8, 0.8, -705.2, 4.5, 288, 0xf4f4f0));
  carnivalItems.push(cylItem(0.5, 0.5, 0.25, -706.8, 2.6, 289.2, 0x141414, 10));
  carnivalItems.push(cylItem(0.5, 0.5, 0.25, -705.2, 2.6, 289.2, 0x141414, 10));
  // balloon bunch: pole + 6 colored balloons
  carnivalItems.push(cylItem(0.12, 0.12, 4.5, -724, 4.7, 306, 0x333333, 6));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    carnivalItems.push({ geo: new THREE.SphereGeometry(0.85, 10, 8), matrix: new THREE.Matrix4().makeTranslation(-724 + Math.cos(a) * 1.1, 7.4 + (i % 2) * 0.5, 306 + Math.sin(a) * 1.1), color: [0xff2e4d, 0xffc53d, 0x2ec4b6, 0x7d3c98, 0xff7e5f, 0x2471a3][i] });
  }
  // ring-toss table: table + pegs + rings
  carnivalItems.push(boxItem(3.0, 0.25, 1.4, -700, 3.4, 304, 0x8a6a42));
  carnivalItems.push(boxItem(0.2, 1.0, 0.2, -701.2, 2.9, 304, 0x333333));
  carnivalItems.push(boxItem(0.2, 1.0, 0.2, -698.8, 2.9, 304, 0x333333));
  for (let i = 0; i < 4; i++) {
    carnivalItems.push(cylItem(0.1, 0.1, 0.9, -701.1 + i * 0.75, 3.9, 304, 0xffc53d, 6));
    carnivalItems.push({ geo: new THREE.TorusGeometry(0.35, 0.08, 6, 12), matrix: new THREE.Matrix4().makeTranslation(-701.1 + i * 0.75, 4.35, 304), color: i % 2 ? 0xff2e4d : 0x2ec4b6 });
  }
  // cotton-candy cart: teal cart + pink fluff dome
  carnivalItems.push(boxItem(2.4, 1.3, 1.5, -730, 3.15, 290, 0x2ec4b6));
  carnivalItems.push(boxItem(2.6, 0.25, 1.7, -730, 3.85, 290, 0xf4f4f0));
  carnivalItems.push({ geo: new THREE.SphereGeometry(0.9, 10, 8), matrix: new THREE.Matrix4().makeTranslation(-730, 4.4, 290), color: 0xff7eb6 });
  carnivalItems.push(cylItem(0.45, 0.45, 0.25, -730.8, 2.55, 291.2, 0x141414, 10));
  carnivalItems.push(cylItem(0.45, 0.45, 0.25, -729.2, 2.55, 291.2, 0x141414, 10));
  scene.add(new THREE.Mesh(mergeItems(carnivalItems), plain));
  // v10: more pier life — two extra stalls (SNO-CONES, CORAL POP), three
  // center benches + four more bins, a second balloon bunch by the wheel,
  // eight flag poles along the deck edges, two more bunting strings, and
  // the cotton-candy cart now reads as cotton candy (serving cone under
  // the pink fluff + a COTTON CANDY sign on the camera-facing side).
  const pierExtraItems = [];
  for (const bx of [-766, -736, -706]) {
    pierExtraItems.push(boxItem(3.4, 0.2, 0.9, bx, 3.05, 300, 0x8a6a42));
    pierExtraItems.push(boxItem(3.4, 1.1, 0.15, bx, 3.6, 299.5, 0x8a6a42));
    pierExtraItems.push(boxItem(0.2, 0.5, 0.7, bx - 1.4, 2.75, 300, 0x333333));
    pierExtraItems.push(boxItem(0.2, 0.5, 0.7, bx + 1.4, 2.75, 300, 0x333333));
  }
  for (const [tx, tz] of [[-780, 334], [-730, 334], [-756, 266], [-690, 334]]) {
    pierExtraItems.push(cylItem(0.8, 0.75, 1.5, tx, 3.25, tz, 0x2f7a3a, 10));
    pierExtraItems.push(cylItem(0.9, 0.9, 0.18, tx, 4.05, tz, 0x444444, 10));
  }
  pierExtraItems.push(cylItem(0.12, 0.12, 4.5, -760, 4.7, 316, 0x333333, 6));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pierExtraItems.push({ geo: new THREE.SphereGeometry(0.85, 10, 8), matrix: new THREE.Matrix4().makeTranslation(-760 + Math.cos(a) * 1.1, 7.4 + (i % 2) * 0.5, 316 + Math.sin(a) * 1.1), color: [0xff2e4d, 0xffc53d, 0x2ec4b6, 0x7d3c98, 0xff7e5f, 0x2471a3][i] });
  }
  const flagColors = [0xff2e4d, 0xffc53d, 0x2ec4b6, 0x7d3c98];
  for (let i = 0; i < 8; i++) {
    const fx = [-780, -752, -724, -696, -668, -766, -738, -710][i];
    const fz = i < 5 ? 262 : 338;
    pierExtraItems.push(cylItem(0.15, 0.18, 4.5, fx, 4.75, fz, 0x333333, 6));
    pierExtraItems.push(boxItem(1.2, 0.7, 0.1, fx + 0.6, 6.6, fz, flagColors[i % 4]));
  }
  pierExtraItems.push({ geo: new THREE.ConeGeometry(0.7, 1.6, 8), matrix: new THREE.Matrix4().makeRotationX(Math.PI).setPosition(-730, 4.0, 290), color: 0xd4ac0d });
  pierExtraItems.push({ geo: new THREE.SphereGeometry(0.45, 8, 6), matrix: new THREE.Matrix4().makeTranslation(-730.6, 4.2, 289.2), color: 0xff7eb6 });
  pierExtraItems.push({ geo: new THREE.SphereGeometry(0.45, 8, 6), matrix: new THREE.Matrix4().makeTranslation(-729.4, 4.2, 290.8), color: 0xff9ec7 });
  scene.add(new THREE.Mesh(mergeItems(pierExtraItems), plain));
  const candySign = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.2), glowMat(signTexture(['COTTON CANDY'], { bg: '#7d3c98', fg: '#ffffff' })));
  candySign.position.set(-728.6, 3.4, 290);
  candySign.rotation.y = Math.PI / 2;
  scene.add(candySign);
  const bunt2Items = [];
  for (const bx of [-688, -760]) {
    for (let i = 0; i < 12; i++) {
      const z = 262 + i * 6.8;
      const sag = Math.sin((i / 11) * Math.PI) * 1.2;
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([bx, 8.4 - sag, z, bx + 1.6, 8.4 - sag, z, bx + 0.8, 7.2 - sag, z], 3));
      tri.computeVertexNormals();
      bunt2Items.push({ geo: tri, matrix: new THREE.Matrix4(), color: buntColors[i % 5] });
    }
  }
  scene.add(new THREE.Mesh(mergeItems(bunt2Items), plain));
  // soft light particles drifting around the ferris wheel
  const glowCount = 140;
  const glowBase = new Float32Array(glowCount * 3);
  const glowPhase = new Float32Array(glowCount);
  const glowPos = new Float32Array(glowCount * 3);
  const glowCol = new Float32Array(glowCount * 3);
  const glowPalette = [[1, 0.85, 0.5], [1, 0.35, 0.45], [0.18, 0.77, 0.71], [1, 0.77, 0.24]];
  for (let i = 0; i < glowCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = 12 + rng() * 7;
    glowBase[i * 3] = -778 + Math.cos(a) * r;
    glowBase[i * 3 + 1] = 16 + Math.sin(a) * r * 0.9;
    glowBase[i * 3 + 2] = 300 + (rng() - 0.5) * 6;
    glowPhase[i] = rng() * Math.PI * 2;
    const c = glowPalette[i % 4];
    glowCol[i * 3] = c[0]; glowCol[i * 3 + 1] = c[1]; glowCol[i * 3 + 2] = c[2];
  }
  glowPos.set(glowBase);
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(glowCol, 3));
  const glowPts = new THREE.Points(glowGeo, new THREE.PointsMaterial({
    size: 0.9, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  glowPts.frustumCulled = false;
  scene.add(glowPts);
  pier.glowPts = glowPts;
  pier.glowBase = glowBase;
  pier.glowPhase = glowPhase;
  pier.glowCount = glowCount;
  pier.stats = pierStats;
  // ferris wheel at the far end
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(-778, 16, 300);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.7, 8, 32), new THREE.MeshLambertMaterial({ color: 0xf4f4f0 }));
  wheelGroup.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.5, 26, 0.5), new THREE.MeshLambertMaterial({ color: 0xffc53d }));
    spoke.position.set(0, 0, 0);
    spoke.rotation.z = a + Math.PI / 2; // bar through the hub
    wheelGroup.add(spoke);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), new THREE.MeshLambertMaterial({ color: [0xff2e4d, 0x2ec4b6, 0xffc53d, 0x7d3c98][i % 4] }));
    cab.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0);
    wheelGroup.add(cab);
    pier.cabins.push(cab);
  }
  wheelGroup.rotation.y = Math.PI / 2;
  scene.add(wheelGroup);
  pier.wheel = wheelGroup;
  const legItems = [];
  legItems.push(boxItem(1.2, 18, 1.2, -778, 9, 294, 0xdddddd));
  legItems.push(boxItem(1.2, 18, 1.2, -778, 9, 306, 0xdddddd));
  legItems.push(boxItem(1.2, 16, 1.2, -772, 8, 300, 0xdddddd));
  legItems.push(boxItem(1.2, 16, 1.2, -784, 8, 300, 0xdddddd));
  scene.add(new THREE.Mesh(mergeItems(legItems), plain));
  // roller coaster loop beside the wheel
  const coasterPath = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    coasterPath.push([-742 + Math.cos(a) * 22, 9 + Math.sin(a * 2) * 2.5, 322 + Math.sin(a) * 12]);
  }
  const trackItems = [];
  for (let i = 0; i < coasterPath.length; i++) {
    const p = coasterPath[i], q = coasterPath[(i + 1) % coasterPath.length];
    const mx = (p[0] + q[0]) / 2, mz = (p[2] + q[2]) / 2;
    const dx = q[0] - p[0], dz = q[2] - p[2];
    const len = Math.hypot(dx, dz) + 0.4;
    trackItems.push(boxItem(len, 0.5, 1.2, mx, (p[1] + q[1]) / 2, mz, i % 2 ? 0xff2e4d : 0xffc53d, -Math.atan2(dz, dx)));
  }
  for (let i = 0; i < 12; i++) {
    const p = coasterPath[(i * 4) % 48];
    trackItems.push(cylItem(0.3, 0.3, p[1] - 2.5, p[0], (p[1] - 2.5) / 2 + 2.5, p[2], 0x888888, 6));
  }
  scene.add(new THREE.Mesh(mergeItems(trackItems), plain));
  const train = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 1.8), new THREE.MeshLambertMaterial({ color: [0xff2e4d, 0xffc53d, 0x2ec4b6][i] }));
    car.position.x = -i * 3;
    train.add(car);
  }
  scene.add(train);
  pier.train = train;
  pier.coasterPath = coasterPath;
  // beach umbrellas
  const umbItems = [];
  for (const [ux, uz, uc] of [[-700, 180, 0xff2e4d], [-690, 220, 0xffc53d], [-705, 420, 0x2ec4b6], [-695, 460, 0xff7e5f]]) {
    umbItems.push(cylItem(0.15, 0.15, 3, ux, 1.5, uz, 0xdddddd, 6));
    umbItems.push({ geo: new THREE.ConeGeometry(3, 1.6, 8), matrix: new THREE.Matrix4().makeTranslation(ux, 3.6, uz), color: uc });
  }
  scene.add(new THREE.Mesh(mergeItems(umbItems), plain));

  // ---- Long Beach Port cranes ----
  const craneItems = [];
  const addCrane = (cx, cz) => {
    craneItems.push(boxItem(3, 40, 3, cx - 8, 20, cz, 0xc0392b));
    craneItems.push(boxItem(3, 40, 3, cx + 8, 20, cz, 0xc0392b));
    craneItems.push(boxItem(30, 3, 3, cx, 40, cz, 0xc0392b));
    craneItems.push(boxItem(3, 3, 22, cx + 14, 40, cz, 0xc0392b));
    craneItems.push(cylItem(0.2, 0.2, 14, cx + 22, 32, cz, 0x333333, 6));
    craneItems.push(boxItem(4, 3, 4, cx + 22, 24, cz, 0x333333));
    addCollider(cx - 10, cz - 4, cx + 10, cz + 4, 42);
    portStats.cranes++;
  };
  for (const [cx, cz] of [[420, 480], [520, 620], [640, 480], [440, 660], [640, 660]]) addCrane(cx, cz);
  scene.add(new THREE.Mesh(mergeItems(craneItems), plain));

  // ---- parked cargo trailer trucks along the dock roads ----
  const trailerItems = [];
  const addTrailer = (x, z, ry, color) => {
    const m = new THREE.Matrix4().makeRotationY(ry);
    const put = (w, h, d, ox, oy, oz, c) => {
      const mm = m.clone();
      mm.setPosition(x + ox * Math.cos(ry) - oz * Math.sin(ry), oy, z + ox * Math.sin(ry) + oz * Math.cos(ry));
      trailerItems.push({ geo: new THREE.BoxGeometry(w, h, d), matrix: mm, color: c });
    };
    put(2.6, 2.6, 2.4, 5.6, 1.5, 0, color); // cab
    put(2.2, 1.0, 2.2, 5.6, 3.2, 0, 0xf4f4f0); // cab roof
    put(8.5, 3.0, 2.6, -1.2, 1.7, 0, 0xd8d8d0); // trailer box
    put(8.5, 0.3, 2.6, -1.2, 3.3, 0, color); // trailer stripe
    for (const [wx, wz] of [[5.6, 1.1], [5.6, -1.1], [-3.5, 1.1], [-3.5, -1.1], [1.2, 1.1], [1.2, -1.1]]) {
      put(1.0, 1.0, 0.4, wx, 0.5, wz, 0x141414);
    }
    const hx = ry === 0 ? 0 : 1;
    addCollider(x - (hx ? 1.5 : 7), z - (hx ? 7 : 1.5), x + (hx ? 1.5 : 7), z + (hx ? 7 : 1.5), 4);
    portStats.trailers++;
  };
  addTrailer(628, 450, Math.PI / 2, 0xc0392b);
  addTrailer(628, 550, Math.PI / 2, 0x2471a3);
  addTrailer(628, 650, Math.PI / 2, 0xd4ac0d);
  addTrailer(450, 628, 0, 0x229954);
  scene.add(new THREE.Mesh(mergeItems(trailerItems), plain));

  // ---- port yard overflow: container stacks in the east + south yard strips
  // (on the painted slots), barrels, cones, and crates along the dock roads,
  // so the concrete between the terminal block and the avenues is not empty.
  const yardItems = [];
  const yardStack = (cx, cz, n) => {
    if (nearClearYard(cx, cz, 10)) return;
    for (let s = 0; s < n; s++) {
      yardItems.push(boxItem(12, 2.6, 2.6, cx, 1.3 + s * 2.7, cz, pick(rng, [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98, 0xe67e22])));
    }
    addCollider(cx - 6, cz - 1.3, cx + 6, cz + 1.3, 2.7 * n);
    portStats.containers += n;
  };
  const nearClearYard = (x, z, r) => keepClear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + r);
  for (const [cz, n] of [[440, 3], [480, 2], [520, 3], [560, 2]]) yardStack(660, cz, n);
  for (const [cx, n] of [[440, 2], [480, 3], [520, 2], [560, 3]]) yardStack(cx, 660, n);
  // barrel clusters (rust red / blue / yellow) in the yard strips
  const barrelColors = [0xb03a2e, 0x2471a3, 0xd4ac0d];
  for (const [bx, bz] of [[640, 440], [640, 560], [450, 690], [550, 690]]) {
    for (let i = 0; i < 3; i++) {
      const ox = (i % 2) * 2.2, oz = Math.floor(i / 2) * 2.2;
      yardItems.push(cylItem(0.9, 0.9, 2.2, bx + ox, 1.1, bz + oz, barrelColors[i % 3], 10));
    }
    addCollider(bx - 1, bz - 1, bx + 3.2, bz + 3.2, 2.5);
  }
  // traffic cones along the dock road edge
  for (const cz of [440, 470, 500, 530, 560]) {
    yardItems.push({ geo: new THREE.ConeGeometry(0.7, 1.6, 8), matrix: new THREE.Matrix4().makeTranslation(584, 0.8, cz), color: 0xe67e22 });
  }
  // wooden crates near the yard strips
  for (const [cx, cz] of [[700, 450], [700, 540], [450, 640], [540, 640]]) {
    yardItems.push(boxItem(2.2, 2.2, 2.2, cx, 1.1, cz, 0xa8875a));
    yardItems.push(boxItem(2.0, 2.0, 2.0, cx + 0.4, 3.2, cz - 0.3, 0x8f6f42));
    addCollider(cx - 1.2, cz - 1.2, cx + 1.6, cz + 1.2, 4.5);
  }
  // v10: two more cargo trailers, two forklifts, four more container
  // stacks on the painted slots, four more pallet stacks, three more
  // barrel clusters, a second cone line on the east dock road, and four
  // more crates — the yard strips read dense from the dock roads.
  addTrailer(700, 500, 0, 0xe67e22);
  addTrailer(500, 700, Math.PI / 2, 0xc0392b);
  const addForklift = (x, z, ry, color) => {
    const m = new THREE.Matrix4().makeRotationY(ry);
    const put = (w, h, d, ox, oy, oz, c) => {
      const mm = m.clone();
      mm.setPosition(x + ox * Math.cos(ry) - oz * Math.sin(ry), oy, z + ox * Math.sin(ry) + oz * Math.cos(ry));
      yardItems.push({ geo: new THREE.BoxGeometry(w, h, d), matrix: mm, color: c });
    };
    put(2.2, 1.2, 1.4, 0, 0.9, 0, color); // body
    put(2.0, 0.15, 1.3, 0, 1.6, 0, 0x333333); // overhead guard roof
    put(0.15, 1.4, 0.15, -0.8, 1.0, 0.6, 0x333333);
    put(0.15, 1.4, 0.15, -0.8, 1.0, -0.6, 0x333333);
    put(0.15, 1.4, 0.15, 0.8, 1.0, 0.6, 0x333333);
    put(0.15, 1.4, 0.15, 0.8, 1.0, -0.6, 0x333333);
    put(0.25, 2.6, 0.25, 1.2, 1.5, 0.55, 0x555555); // mast uprights
    put(0.25, 2.6, 0.25, 1.2, 1.5, -0.55, 0x555555);
    put(0.25, 0.3, 1.35, 1.2, 2.7, 0, 0x555555); // mast crossbar
    put(1.5, 0.12, 0.25, 2.0, 0.3, 0.4, 0x888888); // forks
    put(1.5, 0.12, 0.25, 2.0, 0.3, -0.4, 0x888888);
    put(0.5, 0.5, 0.3, 0.6, 0.4, 0.65, 0x141414); // wheels
    put(0.5, 0.5, 0.3, 0.6, 0.4, -0.65, 0x141414);
    put(0.5, 0.5, 0.3, -0.7, 0.4, 0.65, 0x141414);
    put(0.5, 0.5, 0.3, -0.7, 0.4, -0.65, 0x141414);
    const hx = ry === 0 ? 0 : 1;
    addCollider(x - (hx ? 1.0 : 2.8), z - (hx ? 2.8 : 1.0), x + (hx ? 1.0 : 2.8), z + (hx ? 2.8 : 1.0), 3);
  };
  addForklift(470, 470, 0, 0xffc53d);
  addForklift(600, 620, Math.PI / 2, 0x2ec4b6);
  for (const [cx, cz, n] of [[690, 460, 2], [690, 540, 3], [460, 690, 2], [540, 690, 3]]) yardStack(cx, cz, n);
  for (const [px, pz] of [[660, 420], [660, 580], [420, 660], [580, 660]]) {
    const h = rangeInt(rng, 1, 2);
    for (let s = 0; s < h; s++) {
      yardItems.push(boxItem(2.4, 1.0, 2.4, px, 0.5 + s * 1.05, pz, 0xb08a5a));
      yardItems.push(boxItem(2.2, 0.2, 2.2, px, 1.05 + s * 1.05, pz, 0x8a6a42));
    }
    portStats.pallets += h;
  }
  for (const [bx, bz] of [[660, 470], [470, 660], [670, 620]]) {
    for (let i = 0; i < 3; i++) {
      const ox = (i % 2) * 2.2, oz = Math.floor(i / 2) * 2.2;
      yardItems.push(cylItem(0.9, 0.9, 2.2, bx + ox, 1.1, bz + oz, barrelColors[i % 3], 10));
    }
    addCollider(bx - 1, bz - 1, bx + 3.2, bz + 3.2, 2.5);
  }
  for (const cz of [440, 470, 500, 530, 560]) {
    yardItems.push({ geo: new THREE.ConeGeometry(0.7, 1.6, 8), matrix: new THREE.Matrix4().makeTranslation(624, 0.8, cz), color: 0xe67e22 });
  }
  for (const [cx, cz] of [[690, 470], [690, 570], [470, 690], [570, 690]]) {
    yardItems.push(boxItem(2.2, 2.2, 2.2, cx, 1.1, cz, 0xa8875a));
    yardItems.push(boxItem(2.0, 2.0, 2.0, cx + 0.4, 3.2, cz - 0.3, 0x8f6f42));
    addCollider(cx - 1.2, cz - 1.2, cx + 1.6, cz + 1.2, 4.5);
  }
  scene.add(new THREE.Mesh(mergeItems(yardItems), plain));

  // ---- Midtown street props: fire hydrants at intersections + crates by the shops
  const streetItems = [];
  for (const [hx, hz] of [[216, 216], [-184, 16], [16, -184], [416, 216], [-216, -216], [16, 416], [616, -184], [-584, 416]]) {
    streetItems.push(cylItem(0.5, 0.55, 1.4, hx, 0.7, hz, 0xc0392b, 8));
    streetItems.push({ geo: new THREE.SphereGeometry(0.45, 8, 6), matrix: new THREE.Matrix4().makeTranslation(hx, 1.6, hz), color: 0xc0392b });
  }
  for (const [cx, cz] of [[-96, 118], [104, 118]]) {
    streetItems.push(boxItem(2.0, 2.0, 2.0, cx, 1.0, cz, 0xa8875a));
    streetItems.push(boxItem(1.6, 1.6, 1.6, cx + 0.3, 2.8, cz, 0x8f6f42));
    addCollider(cx - 1.1, cz - 1.1, cx + 1.4, cz + 1.1, 3.8);
  }
  // bus shelters (bench + roof + posts) at six avenue stops
  const busSignDefs = [];
  for (const [bx, bz] of [[-186, 200], [214, -200], [14, 400], [-414, -200], [-186, -400], [214, 200]]) {
    streetItems.push(boxItem(4.5, 0.25, 1.1, bx, 0.65, bz, 0x8a6a42));
    streetItems.push(boxItem(4.5, 1.0, 0.18, bx, 1.2, bz - 0.5, 0x8a6a42));
    streetItems.push(boxItem(5.2, 0.25, 2.2, bx, 2.9, bz, 0x2ec4b6));
    streetItems.push(boxItem(0.25, 2.9, 0.25, bx - 2.4, 1.45, bz - 0.9, 0x333333));
    streetItems.push(boxItem(0.25, 2.9, 0.25, bx + 2.4, 1.45, bz - 0.9, 0x333333));
    addCollider(bx - 2.6, bz - 1.1, bx + 2.6, bz + 1.1, 3.2);
    busSignDefs.push({ x: bx, z: bz + 0.2 });
  }
  // benches along the avenues + extra street trees
  for (const [bx, bz] of [[-186, -200], [14, 200], [214, 400], [414, -200], [-414, 200], [614, 200], [-586, -200], [14, -400], [414, 400], [-214, 400]]) {
    streetItems.push(boxItem(3.4, 0.2, 0.9, bx, 0.55, bz, 0x8a6a42));
    streetItems.push(boxItem(3.4, 1.0, 0.15, bx, 1.05, bz - 0.4, 0x8a6a42));
    streetItems.push(boxItem(0.2, 0.5, 0.7, bx - 1.4, 0.25, bz, 0x333333));
    streetItems.push(boxItem(0.2, 0.5, 0.7, bx + 1.4, 0.25, bz, 0x333333));
  }
  for (let i = 0; i < 20; i++) {
    const x = pick(drng, WORLD.AVENUES) + (drng() < 0.5 ? 16 : -16);
    const z = -680 + drng() * 1360;
    streetItems.push(cylItem(0.4, 0.5, 3, x, 1.5, z, 0x6a4a2a, 6));
    streetItems.push({ geo: new THREE.SphereGeometry(2.5 + drng() * 1.5, 8, 6), matrix: new THREE.Matrix4().makeTranslation(x, 5.5, z), color: 0x4a8a3a });
  }
  // traffic cones at roadwork spots
  for (const [cx, cz] of [[184, 184], [-216, 216], [216, -216], [-16, -216], [416, 16], [-416, -16]]) {
    for (let i = 0; i < 2; i++) {
      streetItems.push({ geo: new THREE.ConeGeometry(0.7, 1.6, 8), matrix: new THREE.Matrix4().makeTranslation(cx + i * 2.4, 0.8, cz), color: 0xe67e22 });
    }
  }
  scene.add(new THREE.Mesh(mergeItems(streetItems), plain));
  // ---- v10: street clutter — mailboxes, newspaper boxes, bike racks
  // (with parked bikes), planters, street bins, dumpsters, street-name
  // signs, barriers, extra benches / hydrants / cones, and infill trees
  // in the central blocks, so no sidewalk or lawn reads empty. Small
  // props sit at mid-block z (-500..500, never on intersection corners)
  // where no bench, hydrant, shelter or crate stands; benches, hydrants
  // and cones take free intersection corners. All merged (one draw call);
  // colliders only for chunky pieces. A separate vrng stream keeps every
  // earlier layout draw untouched.
  const vrng = mulberry32(20261120);
  const clutterItems = [];
  for (const av of WORLD.AVENUES) {
    // mailboxes (blue, avenue-15) + newspaper boxes (avenue+15)
    for (const z of [-300, 100]) {
      clutterItems.push(boxItem(0.15, 0.5, 0.15, av - 15, 0.25, z, 0x333333));
      clutterItems.push(boxItem(1.0, 1.0, 0.7, av - 15, 1.0, z, 0x2471a3));
      clutterItems.push(boxItem(1.05, 0.2, 0.75, av - 15, 1.55, z, 0x1a5a8a));
    }
    for (const z of [-100, 300]) {
      clutterItems.push(boxItem(0.15, 0.5, 0.15, av + 15, 0.25, z, 0x333333));
      clutterItems.push(boxItem(0.8, 0.7, 0.5, av + 15, 0.85, z, [0xc0392b, 0xffc53d, 0x2ec4b6][Math.floor(vrng() * 3)]));
    }
    // street bins (green) at three more mid-block spots
    for (const z of [500, -500, 300]) {
      clutterItems.push(cylItem(0.7, 0.65, 1.3, av - 15, 0.65, z, 0x2f7a3a, 10));
      clutterItems.push(cylItem(0.75, 0.75, 0.15, av - 15, 1.35, z, 0x444444, 10));
    }
    // wooden planters with a bush
    for (const z of [-500, 500]) {
      clutterItems.push(boxItem(1.6, 0.7, 1.6, av + 15, 0.35, z, 0x8a6a42));
      clutterItems.push({ geo: new THREE.SphereGeometry(0.9, 8, 6), matrix: new THREE.Matrix4().makeTranslation(av + 15, 1.1, z), color: 0x4a8a3a });
      addCollider(av + 15 - 0.8, z - 0.8, av + 15 + 0.8, z + 0.8, 1.6);
    }
    // bike rack + one parked bike leaning on it
    const rz = -100;
    clutterItems.push(boxItem(0.12, 0.9, 0.12, av - 15 - 0.7, 0.45, rz, 0x888888));
    clutterItems.push(boxItem(0.12, 0.9, 0.12, av - 15 + 0.7, 0.45, rz, 0x888888));
    clutterItems.push(boxItem(1.5, 0.12, 0.12, av - 15, 0.85, rz, 0x888888));
    for (const wx of [av - 15 - 0.55, av - 15 + 0.55]) {
      clutterItems.push({ geo: new THREE.CylinderGeometry(0.35, 0.35, 0.08, 10), matrix: new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(wx, 0.35, rz + 0.3), color: 0x141414 });
    }
    clutterItems.push(boxItem(1.3, 0.1, 0.1, av - 15, 0.7, rz + 0.3, 0xdddddd));
    addCollider(av - 15 - 0.9, rz - 0.5, av - 15 + 0.9, rz + 0.5, 1);
  }
  // planters at the corners of the central blocks (shot 4's empty mid-city)
  for (const [px, pz] of [[30, 30], [170, 170], [30, 270], [170, 330], [230, 30], [370, 170], [-170, 30], [-30, 170]]) {
    clutterItems.push(boxItem(1.6, 0.7, 1.6, px, 0.35, pz, 0x8a6a42));
    clutterItems.push({ geo: new THREE.SphereGeometry(0.9, 8, 6), matrix: new THREE.Matrix4().makeTranslation(px, 1.1, pz), color: 0x4a8a3a });
    addCollider(px - 0.8, pz - 0.8, px + 0.8, pz + 0.8, 1.6);
  }
  // dumpsters behind the shophouses and near the landmarks
  for (const [dx, dz] of [[-60, 120], [40, 120], [200, -440], [-140, -440], [500, -440]]) {
    clutterItems.push(boxItem(2.6, 1.6, 1.4, dx, 0.8, dz, 0x2f5a3a));
    clutterItems.push(boxItem(2.7, 0.15, 1.5, dx, 1.65, dz, 0x444444));
    addCollider(dx - 1.3, dz - 0.7, dx + 1.3, dz + 0.7, 1.8);
  }
  // street-name signs at eight intersections (posts merged, faces added below)
  const streetSignDefs = [];
  for (const [sx, sz, name] of [[-186, -186, 'CORAL AVE'], [14, 214, 'DELTA BLVD'], [214, -186, 'SUNSET ROW'], [-386, 414, 'PIER ST'], [414, 14, 'NEON AVE'], [14, -386, 'HARBOR RD'], [-186, -386, 'VENICE WAY'], [214, 414, 'MARINA DR']]) {
    clutterItems.push(boxItem(0.15, 3.2, 0.15, sx, 1.6, sz, 0x333333));
    streetSignDefs.push({ x: sx, y: 3.4, z: sz, text: name });
  }
  // orange/white striped barriers on sidewalk corners
  for (const [bx, bz] of [[100, -186], [-100, 186], [300, -186], [-300, 186], [500, 186], [-500, -186], [100, 386], [-100, -386]]) {
    clutterItems.push(boxItem(0.2, 0.9, 0.2, bx - 1.7, 0.45, bz, 0x333333));
    clutterItems.push(boxItem(0.2, 0.9, 0.2, bx + 1.7, 0.45, bz, 0x333333));
    for (let s = 0; s < 4; s++) {
      clutterItems.push(boxItem(0.9, 0.5, 0.15, bx - 1.35 + s * 0.9, 0.9, bz, s % 2 ? 0xf4f4f0 : 0xe67e22));
    }
  }
  // ten more benches on free intersection corners
  for (const [bx, bz] of [[-186, 400], [14, -200], [214, -400], [414, 200], [-414, -400], [614, -200], [-586, 400], [14, 0], [414, -400], [-214, -200]]) {
    clutterItems.push(boxItem(3.4, 0.2, 0.9, bx, 0.55, bz, 0x8a6a42));
    clutterItems.push(boxItem(3.4, 1.1, 0.15, bx, 1.1, bz - 0.45, 0x8a6a42));
    clutterItems.push(boxItem(0.2, 0.5, 0.7, bx - 1.4, 0.25, bz, 0x333333));
    clutterItems.push(boxItem(0.2, 0.5, 0.7, bx + 1.4, 0.25, bz, 0x333333));
  }
  // eight more hydrants on free corners
  for (const [hx, hz] of [[216, -216], [-184, 416], [16, 16], [416, -216], [-216, 216], [16, -416], [616, 216], [-584, -216]]) {
    clutterItems.push(cylItem(0.5, 0.55, 1.2, hx, 0.6, hz, 0xd4ac0d, 10));
    clutterItems.push({ geo: new THREE.SphereGeometry(0.35, 8, 6), matrix: new THREE.Matrix4().makeTranslation(hx, 1.3, hz), color: 0xd4ac0d });
  }
  // twelve more cones on free sidewalk corners
  for (const [cx, cz] of [[184, -184], [-184, 384], [384, 184], [-384, -184], [584, 384], [-584, 384]]) {
    clutterItems.push({ geo: new THREE.ConeGeometry(0.7, 1.6, 8), matrix: new THREE.Matrix4().makeTranslation(cx, 0.8, cz), color: 0xe67e22 });
    clutterItems.push({ geo: new THREE.ConeGeometry(0.7, 1.6, 8), matrix: new THREE.Matrix4().makeTranslation(cx + 3, 0.8, cz + 2), color: 0xe67e22 });
  }
  // twenty-four infill trees at the corners of the six central blocks
  for (const [bcx, bcz] of [[100, 100], [100, 300], [300, 100], [-100, 100], [100, -100], [-100, -100]]) {
    for (const [ox, oz] of [[-75, -75], [75, -75], [-75, 75], [75, 75]]) {
      const tx = bcx + ox, tz = bcz + oz;
      const ts = 0.8 + vrng() * 0.5;
      clutterItems.push(cylItem(0.5 * ts, 0.7 * ts, 3 * ts, tx, 1.5 * ts, tz, 0x6a4a2a, 8));
      clutterItems.push({ geo: new THREE.SphereGeometry(3.2 * ts, 8, 6), matrix: new THREE.Matrix4().makeTranslation(tx, 4.5 * ts, tz), color: 0x4a8a3a });
    }
  }
  scene.add(new THREE.Mesh(mergeItems(clutterItems), plain));
  // street-name sign faces (created after the merge like the other signs)
  for (const def of streetSignDefs) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), glowMat(signTexture([def.text], { bg: '#2ec4b6', fg: '#ffffff' })));
    s.position.set(def.x, def.y, def.z);
    scene.add(s);
  }
  // billboards (original art + text) on tall posts at three junctions + BUS signs
  const billboardDefs = [
    { x: -200, z: -200, lines: ['VISIT CORAL PIER', 'GAMES • RIDES • CAFES'], bg: '#c0392b' },
    { x: 400, z: 200, lines: ['DELTA COLA', 'TASTE THE NEON'], bg: '#2471a3' },
    { x: -400, z: 400, lines: ['NEON DELTA LA', 'GOLDEN HOUR CITY'], bg: '#7d3c98' },
  ];
  for (const b of billboardDefs) {
    const tex = signTexture(b.lines, { bg: b.bg, fg: '#ffffff', sub: '#ffd98a' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), glowMat(tex));
    m.position.set(b.x, 14, b.z);
    scene.add(m);
    const postItems = [boxItem(0.8, 12, 0.8, b.x - 8, 6, b.z, 0x333333), boxItem(0.8, 12, 0.8, b.x + 8, 6, b.z, 0x333333)];
    scene.add(new THREE.Mesh(mergeItems(postItems), plain));
    addCollider(b.x - 9, b.z - 1, b.x + 9, b.z + 1, 14);
  }
  for (const b of busSignDefs) {
    const tex = signTexture(['BUS'], { bg: '#2ec4b6', fg: '#ffffff' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), glowMat(tex));
    m.position.set(b.x, 3.4, b.z);
    scene.add(m);
  }

  // ---- canal bridges ----
  const bridgeItems = [];
  for (const [bx, bz] of [[-400, 433], [-200, 573], [-500, 573]]) {
    bridgeItems.push(boxItem(26, 1.5, 12, bx, 1.2, bz, 0xb8a88f));
    bridgeItems.push(boxItem(0.5, 1.2, 12, bx - 13, 2.4, bz, 0x8a7a5a));
    bridgeItems.push(boxItem(0.5, 1.2, 12, bx + 13, 2.4, bz, 0x8a7a5a));
  }
  scene.add(new THREE.Mesh(mergeItems(bridgeItems), plain));

  // ---- freeway overpass (east edge) with truss railing + looping cars ----
  const fwItems = [];
  fwItems.push(boxItem(26, 2, 1440, 730, 11, 0, 0x555550));
  for (let z = -680; z <= 680; z += 80) {
    fwItems.push(boxItem(4, 11, 4, 722, 5.5, z, 0x777770));
    fwItems.push(boxItem(4, 11, 4, 738, 5.5, z, 0x777770));
  }
  for (let z = -700; z <= 700; z += 20) {
    fwItems.push(boxItem(0.4, 2.2, 0.4, 717, 13, z, 0xf4f4f0));
    fwItems.push(boxItem(0.4, 2.2, 0.4, 743, 13, z, 0xf4f4f0));
    fwItems.push(boxItem(0.4, 0.4, 20, 717, 14, z + 10, 0xf4f4f0));
  }
  scene.add(new THREE.Mesh(mergeItems(fwItems), plain));
  addCollider(716, -720, 744, 720, 13);
  const freewayCars = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 2), new THREE.MeshLambertMaterial({ color: [0xff2e4d, 0x2ec4b6, 0xffc53d, 0xdddddd][i] }));
    c.position.set(726 + (i % 2) * 8, 12.6, -600 + i * 300);
    scene.add(c);
    freewayCars.push({ mesh: c, z: -600 + i * 300, speed: 22 + i * 3, dir: i % 2 ? -1 : 1 });
  }

  // ---- curved coastal road (beachfront drive) ----
  const curvePts = [];
  for (let z = -400; z <= 500; z += 20) curvePts.push([-640 + Math.sin(z * 0.004) * 26, z]);
  const ribbon = buildRibbon(curvePts, 16, 0.06);
  scene.add(ribbon);

  // ---- road graph (A* nodes at intersections) ----
  const graph = {};
  for (const x of WORLD.AVENUES) for (const z of WORLD.STREETS) {
    const id = `${x},${z}`;
    graph[id] = { x, z, links: [] };
  }
  for (const x of WORLD.AVENUES) for (const z of WORLD.STREETS) {
    const id = `${x},${z}`;
    for (const [dx, dz] of [[200, 0], [-200, 0], [0, 200], [0, -200]]) {
      const nid = `${x + dx},${z + dz}`;
      if (graph[nid]) graph[id].links.push({ id: nid, cost: 200 });
    }
  }

  // ---- parked cars (stealable) ----
  const parkedSpots = [
    { x: 600, z: 560, heading: 0, kind: 'sedan', color: 0x2ec4b6 }, // mission 1 target
    { x: 640, z: 620, heading: 0, kind: 'suv', color: 0xc0392b }, // kept clear of the mission-1 steal framing
    { x: -388, z: -200, heading: Math.PI / 2, kind: 'pickup', color: 0xffc53d },
    { x: 212, z: 400, heading: 0, kind: 'sport', color: 0xff2e4d },
    { x: -200, z: -388, heading: Math.PI / 2, kind: 'sedan', color: 0xff7e5f },
    { x: 400, z: -212, heading: 0, kind: 'bike', color: 0x7d3c98 },
    { x: -612, z: 100, heading: Math.PI / 2, kind: 'sedan', color: 0x2471a3 },
    { x: 100, z: 612, heading: 0, kind: 'pickup', color: 0x229954 },
    { x: -100, z: 200, heading: Math.PI, kind: 'sport', color: 0xd4ac0d },
    { x: 600, z: -600, heading: Math.PI / 2, kind: 'suv', color: 0xdddddd },
    { x: 200, z: -612, heading: 0, kind: 'sedan', color: 0x2ec4b6 },
    { x: -388, z: 612, heading: Math.PI, kind: 'bike', color: 0xff2e4d },
    // v10: twelve more parked cars/trucks/bikes along the avenues, so the
    // streets read lived-in instead of empty (all clear of keep-clear
    // points, mission framing, billboard posts and bus shelters).
    { x: 416, z: 50, heading: Math.PI / 2, kind: 'sedan', color: 0x2ec4b6 },
    { x: -216, z: 250, heading: 0, kind: 'pickup', color: 0xc0392b },
    { x: 216, z: -50, heading: Math.PI, kind: 'sport', color: 0xffc53d },
    { x: -16, z: 450, heading: Math.PI / 2, kind: 'sedan', color: 0xdddddd },
    { x: 616, z: 250, heading: 0, kind: 'suv', color: 0x2471a3 },
    { x: -616, z: -250, heading: Math.PI, kind: 'sedan', color: 0x7d3c98 },
    { x: 16, z: -250, heading: Math.PI / 2, kind: 'bike', color: 0xff2e4d },
    { x: 416, z: -250, heading: 0, kind: 'pickup', color: 0x229954 },
    { x: -416, z: 150, heading: Math.PI, kind: 'sport', color: 0xd4ac0d },
    { x: 216, z: 550, heading: Math.PI / 2, kind: 'sedan', color: 0xff7e5f },
    { x: -216, z: -450, heading: 0, kind: 'suv', color: 0x2ec4b6 },
    { x: 616, z: -150, heading: Math.PI, kind: 'bike', color: 0x2471a3 },
  ];

  // ---- per-frame animation ----
  function update(dt, t) {
    // traffic lights
    for (const lg of lightGroups) {
      const st = lightState(t, lg.offset);
      const on = st[lg.axis];
      lg.lamps.red.material.emissiveIntensity = on === 'red' ? 1.6 : 0;
      lg.lamps.yellow.material.emissiveIntensity = on === 'yellow' ? 1.6 : 0;
      lg.lamps.green.material.emissiveIntensity = on === 'green' ? 1.6 : 0;
    }
    // ferris wheel (slow) + cabins stay upright
    if (pier.wheel) {
      pier.wheel.rotation.z += dt * 0.12;
      pier.cabins.forEach((c, i) => { c.rotation.z = -pier.wheel.rotation.z; });
    }
    // coaster train
    if (pier.train) {
      pier.trainT = (pier.trainT + dt * 0.02) % 1;
      // Defensive clamp: a negative trainT (see tick's dt clamp) would make
      // idx -1 and coasterPath[-1] undefined — the v11 shoot's first-tick
      // "reading '0'" throw. Belt and suspenders with the dt clamp above.
      const idx = Math.min(47, Math.max(0, Math.floor(pier.trainT * 48)));
      const p = coasterPath[idx], q = coasterPath[(idx + 1) % 48];
      pier.train.position.set(p[0], p[1] + 1.2, p[2]);
      pier.train.rotation.y = -Math.atan2(q[2] - p[2], q[0] - p[0]);
    }
    // freeway cars loop
    for (const c of freewayCars) {
      c.z += c.speed * c.dir * dt;
      if (c.z > 700) c.z = -700;
      if (c.z < -700) c.z = 700;
      c.mesh.position.z = c.z;
    }
    // ferris wheel glow particles: gentle drift around the wheel (in-place, no allocation)
    if (pier.glowPts) {
      const arr = pier.glowPts.geometry.attributes.position.array;
      for (let i = 0; i < pier.glowCount; i++) {
        arr[i * 3] = pier.glowBase[i * 3] + Math.sin(t * 0.6 + pier.glowPhase[i]) * 0.8;
        arr[i * 3 + 1] = pier.glowBase[i * 3 + 1] + Math.sin(t * 0.9 + pier.glowPhase[i] * 1.7) * 0.7;
        arr[i * 3 + 2] = pier.glowBase[i * 3 + 2] + Math.cos(t * 0.5 + pier.glowPhase[i]) * 0.8;
      }
      pier.glowPts.geometry.attributes.position.needsUpdate = true;
    }
    lampHeadMat.emissiveIntensity = 0.5 + night * 1.8;
  }

  // v13: neon ground glow — one flat additive disc per collected spot
  // (shophouse row + DELTA ARMS + pier stalls first, then up to 11
  // scattered storefronts; 28 total max). No new textures, a few meshes
  // only; the helicopter's ground light disc already proved the look.
  const allSpots = [...glowSpots, ...storeSpots.slice(0, 11)].slice(0, 28);
  for (const sp of allSpots) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(5, 20),
      new THREE.MeshBasicMaterial({ color: sp.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(sp.x, sp.y, sp.z);
    disc.visible = false;
    scene.add(disc);
    glowDiscs.push(disc);
  }

  // v12 night level (0..1): street lamps brighten, facade windows glow warm,
  // neon signs glow. Called every frame from the main loop with the real
  // clock's night level — 0 by day, 1 at full night.
  function setNight(n) {
    night = Math.max(0, Math.min(1, n));
    for (const m of facMats) m.emissiveIntensity = night * 0.9;
    for (const m of signMats) m.emissiveIntensity = night * 0.7;
    // v13: glow pools fade in with the night, off by day.
    for (const d of glowDiscs) { d.material.opacity = night * 0.22; d.visible = night > 0.05; }
  }

  return { graph, colliders, trafficLights: lightGroups, groundY, parkedSpots, update, pier, port: portStats, setNight, shop: { x: 90, z: 112 }, glowDiscs: glowDiscs.length };
}

// Curved road ribbon: flat strip following (x,z) points, with asphalt + dashes.
function buildRibbon(pts, width, y) {
  const pos = [], uvA = [], idx = [];
  let dist = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const [nx, nz] = pts[Math.min(i + 1, pts.length - 1)];
    const [px, pz] = pts[Math.max(i - 1, 0)];
    let dx = nx - px, dz = nz - pz;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const ox = -dz * width / 2, oz = dx * width / 2;
    if (i > 0) dist += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    pos.push(x + ox, y, z + oz, x - ox, y, z - oz);
    uvA.push(0, dist / 12, 1, dist / 12);
    if (i > 0) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const c2 = cv.getContext('2d');
  c2.fillStyle = '#3a3a40'; c2.fillRect(0, 0, 128, 128);
  c2.fillStyle = '#f7c948'; c2.fillRect(62, 0, 4, 128);
  c2.fillStyle = '#e8e8e8'; c2.fillRect(2, 0, 3, 128); c2.fillRect(123, 0, 3, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }));
}
