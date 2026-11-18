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

  // ---- facade materials (window-grid textures, repeated per building size) ----
  const fac = {
    blue: new THREE.MeshLambertMaterial({ map: windowTexture('#8fb8d8') }),
    tan: new THREE.MeshLambertMaterial({ map: windowTexture('#c9a876') }),
    white: new THREE.MeshLambertMaterial({ map: windowTexture('#e8e4da') }),
    dark: new THREE.MeshLambertMaterial({ map: windowTexture('#5a6a7a') }),
    pink: new THREE.MeshLambertMaterial({ map: windowTexture('#e8a0a8') }),
    gray: new THREE.MeshLambertMaterial({ map: windowTexture('#9a9a92') }),
    teal: new THREE.MeshLambertMaterial({ map: windowTexture('#7fc4bd') }),
  };
  const plain = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glassCurved = new THREE.MeshLambertMaterial({ map: windowTexture('#6fa8c8'), transparent: true, opacity: 0.92 });

  const byMat = { blue: [], tan: [], white: [], dark: [], pink: [], gray: [], teal: [] };
  const plainItems = [];
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
    if (opts.canopy) {
      plainItems.push(boxItem(w * 0.6, 0.5, 6, x, 4.2, z + d / 2 + 2.5, opts.canopyColor || 0xff2e4d));
      plainItems.push(boxItem(0.4, 4, 0.4, x - w * 0.28, 2, z + d / 2 + 5, 0x333333));
      plainItems.push(boxItem(0.4, 4, 0.4, x + w * 0.28, 2, z + d / 2 + 5, 0x333333));
    }
    if (opts.antenna) {
      plainItems.push(cylItem(0.3, 0.3, 18, x, h + 9, z, 0x666666, 6));
      plainItems.push(boxItem(4, 0.3, 4, x, h + 16, z, 0x888888));
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
  const matCycle = ['blue', 'tan', 'white', 'dark', 'teal', 'gray'];
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
        addBuilding(bx + range(rng, -50, 50), bz + range(rng, -50, 50), w, h, d, pick(rng, matCycle), { canopy: chance(rng, 0.5), canopyColor: pick(rng, [0xff2e4d, 0x2ec4b6, 0xffc53d, 0xff7e5f]) });
      }
    } else if (kind === 'low' || kind === 'canal') {
      const n = rangeInt(rng, 3, 5);
      for (let i = 0; i < n; i++) {
        const w = range(rng, 14, 22), d = range(rng, 14, 22), h = range(rng, 8, 16);
        addBuilding(bx + range(rng, -55, 55), bz + range(rng, -55, 55), w, h, d, pick(rng, ['tan', 'white', 'pink', 'teal']));
      }
    } else if (kind === 'port') {
      addBuilding(bx, bz, range(rng, 50, 70), range(rng, 12, 18), range(rng, 30, 44), 'gray');
      for (let i = 0; i < 6; i++) {
        plainItems.push(boxItem(12, 2.6, 2.6, bx + range(rng, -60, 60), 1.3 + (i % 3) * 2.7, bz + range(rng, -50, 50), pick(rng, [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98])));
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
  // Shophouses: bright colors, ground-floor stores with awnings + signs.
  const shopColors = ['pink', 'teal', 'tan', 'blue', 'white', 'pink'];
  const shopNames = ['CORAL TACOS', 'NEON DONUTS', 'PIER GIFTS', 'SUNSET CAFE', 'VINYL & CO', 'TIDE BOOKS'];
  const shopSigns = [];
  shopColors.forEach((m, i) => {
    const x = -80 + i * 34;
    addBuilding(x, 100, 26, range(rng, 12, 18), 16, m, { canopy: true, canopyColor: pick(rng, [0xff2e4d, 0xffc53d, 0x2ec4b6]) });
    shopSigns.push({ x, z: 100, text: shopNames[i] });
  });
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

  // ---- signs (billboards with original names) ----
  const signDefs = [
    { x: 200, z: -460, ry: 0, lines: ['DELTA GENERAL', 'HOSPITAL', 'EMERGENCY 24H'] },
    { x: -120, z: -448, ry: 0, lines: ['NEON DELTA', 'CITY HALL'] },
    { x: -700, z: 220, ry: 0, lines: ['CORAL PIER', 'AMUSEMENT PIER', 'GAMES • RIDES • CAFES'] },
    ...shopSigns.map((s) => ({ x: s.x, z: s.z + 10, ry: 0, lines: [s.text] })),
  ];
  for (const s of signDefs) {
    const tex = signTexture(s.lines, { bg: '#12233d' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshLambertMaterial({ map: tex }));
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
    new THREE.MeshLambertMaterial({ map: signTexture(['NEON DELTA LA'], { bg: '#e8e4da', fg: '#ff2e4d' }) })
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
  // beachfront drive palms + pier palms + boulevard palms
  for (let z = -380; z <= 500; z += 44) addPalm(-640, z, range(rng, 0.9, 1.2));
  for (const z of [272, 328]) { addPalm(-680, z, 1); addPalm(-760, z, 1); } // off the center line: nothing blocks the wheel
  for (let x = -560; x <= 560; x += 88) addPalm(x, -188, range(rng, 0.9, 1.15));
  for (let i = 0; i < 40; i++) {
    const x = range(rng, -640, 640), z = range(rng, -640, 640);
    if (Math.abs(x % 200) < 30 || Math.abs(z % 200) < 30) continue;
    treeItems.push(cylItem(0.4, 0.5, 3, x, 1.5, z, 0x6a4a2a, 6));
    treeItems.push({ geo: new THREE.SphereGeometry(range(rng, 2.5, 4), 8, 6), matrix: new THREE.Matrix4().makeTranslation(x, 5.5, z), color: 0x4a8a3a });
  }
  for (const x of WORLD.AVENUES) for (let z = -700; z <= 700; z += 100) {
    lampPosts.push(cylItem(0.18, 0.22, 8, x + 13, 4, z, 0x2a2a2e, 6));
    lampPosts.push(boxItem(3, 0.3, 0.3, x + 11.5, 8, z, 0x2a2a2e));
    lampHeads.push(boxItem(1.2, 0.5, 0.6, x + 10, 7.8, z, 0xfff2c0));
  }
  scene.add(new THREE.Mesh(mergeItems(palmTrunks), plain));
  scene.add(new THREE.Mesh(mergeItems(palmFronds), plain));
  scene.add(new THREE.Mesh(mergeItems(lampPosts), plain));
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffdf80, emissiveIntensity: 0.15 });
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
  // deck: wood planks (alternating strips) + side skirts
  for (let i = 0; i < 26; i++) {
    pierItems.push(boxItem(5, 0.6, 86, -792 + i * 5.2, 2.2, 300, i % 2 ? 0x9c7a4a : 0xa8875a));
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
    new THREE.MeshLambertMaterial({ map: signTexture(['CORAL PIER', 'AMUSEMENT PIER', 'GAMES • RIDES • CAFES'], { bg: '#12233d', fg: '#ff5a6e' }) })
  );
  gateSign.position.set(-656, 12, 300);
  scene.add(gateSign);
  // pier shops / stalls (colorful, awnings, signs)
  const stallNames = ['RING TOSS', 'CORAL DOGS', 'POPCORN', 'CANDY', 'BALLOONS', 'FISHING', 'ARCADE', 'LEMONADE'];
  const stallColors = [0xff2e4d, 0x2ec4b6, 0xffc53d, 0xff7e5f, 0x7d3c98, 0x2471a3, 0x229954, 0xd4ac0d];
  const stallItems = [];
  stallNames.forEach((name, i) => {
    const side = i % 2 === 0 ? 268 : 332;
    const x = -680 - Math.floor(i / 2) * 22;
    stallItems.push(boxItem(10, 4.5, 8, x, 4.75, side, stallColors[i]));
    stallItems.push(boxItem(11, 0.4, 9, x, 7.2, side, 0xf4f4f0));
    stallItems.push(boxItem(11, 0.4, 3, x, 6.4, side + (side < 300 ? 4.5 : -4.5), stallColors[i]));
    addCollider(x - 5, side - 4, x + 5, side + 4, 8);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshLambertMaterial({ map: signTexture([name], { bg: '#12233d' }) }));
    s.position.set(x, 5.6, side + (side < 300 ? -4.2 : 4.2));
    s.rotation.y = side < 300 ? 0 : Math.PI;
    scene.add(s);
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
  for (const [cx, cz] of [[420, 480], [520, 620], [640, 480]]) {
    craneItems.push(boxItem(3, 40, 3, cx - 8, 20, cz, 0xc0392b));
    craneItems.push(boxItem(3, 40, 3, cx + 8, 20, cz, 0xc0392b));
    craneItems.push(boxItem(30, 3, 3, cx, 40, cz, 0xc0392b));
    craneItems.push(boxItem(3, 3, 22, cx + 14, 40, cz, 0xc0392b));
    craneItems.push(cylItem(0.2, 0.2, 14, cx + 22, 32, cz, 0x333333, 6));
    craneItems.push(boxItem(4, 3, 4, cx + 22, 24, cz, 0x333333));
    addCollider(cx - 10, cz - 4, cx + 10, cz + 4, 42);
  }
  scene.add(new THREE.Mesh(mergeItems(craneItems), plain));

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
      const idx = Math.floor(pier.trainT * 48);
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
    lampHeadMat.emissiveIntensity = 0.15;
  }

  return { graph, colliders, trafficLights: lightGroups, groundY, parkedSpots, update, pier };
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
