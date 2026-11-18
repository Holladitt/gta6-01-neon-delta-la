// The 3D scene: a low-poly voxel Los Angeles in Three.js, rendered from the
// 2D simulation. The sim stays in its (x east, y south) plane; this module
// maps it to (x, 0, y) and paints it with a third-person chase camera, a
// sunset sky, fog and flat colours. Static city geometry is merged into one
// mesh (one draw call); actors are pooled meshes updated from the state.
// No per-frame allocation in the hot path: temp vectors and matrices are
// module-level, and materials/geometries are cached by colour and kind.
import * as THREE from '../vendor/three.module.min.js';
import { AVENUES, BEACH, CANAL, PALETTE, PORT, STREETS, WORLD } from './config.js';
import { missionWaypoint } from './missions.js';

const V3 = THREE.Vector3;

// ---- scratch, reused every frame (never allocate in update) ----
const _v1 = new V3(); const _v2 = new V3(); const _v3 = new V3();
const _m4 = new THREE.Matrix4(); const _q = new THREE.Quaternion();
const _s1 = new V3(); const _euler = new THREE.Euler();
const _ray = new THREE.Raycaster(); const _ndc = new THREE.Vector2();

function hex(h) { return new THREE.Color(h); }

// ---- window atlas: a canvas texture. Left ~85% is a window grid (white
// background so the building colour shows, dark glass + many lit windows);
// right ~15% is plain white for roofs, ground quads and props. Two variants:
// dense cool glass for towers, bigger warm windows for low buildings. ----
function makeWindowAtlas(kind) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  const step = kind === 'glass' ? 22 : 30;
  const ww = kind === 'glass' ? 13 : 19;
  const wh = kind === 'glass' ? 14 : 19;
  const litChance = kind === 'glass' ? 7 : 10; // out of 23
  for (let y = 4; y < 252; y += step) {
    for (let x = 4; x < 214; x += step) {
      const r = (x * 7 + y * 13) % 23;
      const lit = r < litChance;
      if (!lit) {
        g.fillStyle = kind === 'glass' ? '#2e3a55' : '#4a4038';
      } else if (r < 2) {
        g.fillStyle = '#fff6c8'; // a few windows burn bright
      } else {
        g.fillStyle = '#ffd9a0'; // warm lit glass
      }
      g.fillRect(x, y, ww, wh);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,180,0.95)');
  grad.addColorStop(0.4, 'rgba(255,170,90,0.45)');
  grad.addColorStop(1, 'rgba(255,140,80,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBoardTexture(lines, accent) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#14102a'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = accent; g.lineWidth = 10; g.strokeRect(8, 8, 496, 240);
  g.fillStyle = accent; g.font = 'bold 64px system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText(lines[0], 256, 110);
  g.fillStyle = '#fff7ea'; g.font = 'bold 34px system-ui, sans-serif';
  g.fillText(lines[1], 256, 168);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---- merged-geometry builder: positions, normals, colours, uvs. ----
function newArrays() { return { pos: [], nor: [], col: [], uv: [], idx: [], n: 0 }; }
function shadeOf(hexStr, f) {
  const c = new THREE.Color(hexStr);
  return [Math.min(1, c.r * f), Math.min(1, c.g * f), Math.min(1, c.b * f)];
}
// One axis-aligned box. Faces get different shades (south darker, roof
// brightest) so the city reads as low-poly even before the lights run.
// Side faces sample the window region of the atlas, the roof the plain one.
function pushBox(a, cx, cy, cz, w, h, d, color, winRepeat) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const rep = winRepeat || { u: Math.max(1, Math.round(w / 30)), v: Math.max(1, Math.round(h / 30)) };
  const faces = [
    // +x east
    { n: [1, 0, 0], s: 0.78, v: [[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]], uv: [0, 0, rep.u, rep.v] },
    // -x west
    { n: [-1, 0, 0], s: 0.9, v: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], uv: [0, 0, rep.u, rep.v] },
    // +z south
    { n: [0, 0, 1], s: 0.66, v: [[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]], uv: [0, 0, rep.u, rep.v] },
    // -z north
    { n: [0, 0, -1], s: 0.86, v: [[x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]], uv: [0, 0, rep.u, rep.v] },
    // +y roof (plain region)
    { n: [0, 1, 0], s: 1.0, v: [[x0, y1, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1]], uv: [0.87, 0.02, 0.1, 0.1] },
    // -y bottom (plain region)
    { n: [0, -1, 0], s: 0.5, v: [[x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0]], uv: [0.87, 0.02, 0.1, 0.1] },
  ];
  for (const f of faces) {
    const base = a.n;
    const rgb = shadeOf(color, f.s);
    const [u0, v0, u1, v1] = f.uv;
    const uvs = [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
    for (let i = 0; i < 4; i += 1) {
      a.pos.push(f.v[i][0], f.v[i][1], f.v[i][2]);
      a.nor.push(f.n[0], f.n[1], f.n[2]);
      a.col.push(rgb[0], rgb[1], rgb[2]);
      a.uv.push(uvs[i][0], uvs[i][1]);
    }
    a.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    a.n += 4;
  }
}
// A flat quad on the ground (normal +y), plain region of the atlas.
function pushQuad(a, x0, z0, x1, z1, y, color) {
  const base = a.n;
  const rgb = shadeOf(color, 1);
  const pts = [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]];
  for (const p of pts) {
    a.pos.push(p[0], p[1], p[2]);
    a.nor.push(0, 1, 0);
    a.col.push(rgb[0], rgb[1], rgb[2]);
    a.uv.push(0.92, 0.05);
  }
  a.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  a.n += 4;
}
// Merge a Three geometry (box/cylinder/cone/torus) into the arrays, painted
// one flat colour, uvs forced to the plain region.
function pushGeom(a, geom, matrix, color) {
  const pos = geom.attributes.position;
  const nor = geom.attributes.normal;
  const idx = geom.index;
  const base = a.n;
  const rgb = shadeOf(color, 1);
  const v = new V3(); const n = new V3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    n.fromBufferAttribute(nor, i).transformDirection(matrix);
    a.pos.push(v.x, v.y, v.z);
    a.nor.push(n.x, n.y, n.z);
    a.col.push(rgb[0], rgb[1], rgb[2]);
    a.uv.push(0.92, 0.05);
  }
  if (idx) {
    for (let i = 0; i < idx.count; i += 1) a.idx.push(base + idx.getX(i));
  } else {
    for (let i = 0; i < pos.count; i += 1) a.idx.push(base + i);
  }
  a.n += pos.count;
}

function arraysToGeometry(a) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
  g.setIndex(a.idx);
  return g;
}

// ---- the static city, built once from the sim's layout. Two merged meshes:
// glass towers (dense cool window atlas) and everything else (warm atlas).
// One draw call each; street lamps, rooftop boxes and stepped crowns ride
// along for free. ----
function buildCityMesh(state, atlasGlass, atlasWarm) {
  const aT = newArrays();
  const aL = newArrays();
  const a = aL; // ground, roads and props always go to the warm mesh
  // Base land far past the edges so the camera never sees void.
  pushQuad(a, -1600, -1600, 4200, 3600, 0, PALETTE.land);
  // Sand, then ocean east of it.
  pushQuad(a, BEACH.x0, 0, BEACH.seaX, WORLD.h, 0.05, PALETTE.sand);
  pushQuad(a, BEACH.seaX, -1600, 4200, 3600, 0.02, PALETTE.sea);
  pushQuad(a, BEACH.seaX, 0, 4200, WORLD.h, 0.04, PALETTE.sea);
  // Foam strips on the waterline.
  for (let i = 0; i < 4; i += 1) pushQuad(a, BEACH.seaX + 30 + i * 40, 200 + i * 320, BEACH.seaX + 120 + i * 40, 205 + i * 320, 0.08, '#ffffff');
  // Canal water + bridges.
  pushQuad(a, CANAL.x0, CANAL.y0, CANAL.x1, CANAL.y1, 0.06, '#1fb6c9');
  for (const s of STREETS) pushQuad(a, CANAL.x0 - 26, s - 30, CANAL.x1 + 26, s + 30, 0.12, PALETTE.sidewalk);
  // Roads, sidewalks, dashes, crosswalks.
  for (const av of AVENUES) {
    pushQuad(a, av - 56, 0, av - 42, WORLD.h, 0.1, PALETTE.sidewalk);
    pushQuad(a, av + 42, 0, av + 56, WORLD.h, 0.1, PALETTE.sidewalk);
    pushQuad(a, av - 42, 0, av + 42, WORLD.h, 0.15, PALETTE.road);
  }
  for (const st of STREETS) {
    pushQuad(a, 0, st - 56, WORLD.w, st - 42, 0.1, PALETTE.sidewalk);
    pushQuad(a, 0, st + 42, WORLD.w, st + 56, 0.1, PALETTE.sidewalk);
    pushQuad(a, 0, st - 42, WORLD.w, st + 42, 0.15, PALETTE.road);
  }
  for (const av of AVENUES) {
    for (let y = 40; y < WORLD.h; y += 90) pushQuad(a, av - 3, y, av + 3, y + 44, 0.22, PALETTE.roadLine);
  }
  for (const st of STREETS) {
    for (let x = 40; x < WORLD.w; x += 90) pushQuad(a, x, st - 3, x + 44, st + 3, 0.22, PALETTE.roadLine);
  }
  for (const av of AVENUES) {
    for (const st of STREETS) {
      for (let k = -2; k <= 2; k += 1) {
        pushQuad(a, av - 34 + k * 14, st - 52, av - 26 + k * 14, st - 42, 0.22, '#e8ecf5');
        pushQuad(a, av - 34 + k * 14, st + 42, av - 26 + k * 14, st + 52, 0.22, '#e8ecf5');
      }
    }
  }
  // Buildings: glass towers to the tower mesh, everything else to the warm
  // mesh. Crowns (z0 > 0) sit on top of their base tower; low buildings get
  // a rooftop AC box so roofs are not bare slabs.
  for (const b of state.buildings) {
    const arr = b.glass ? aT : aL;
    const base = b.z0 || 0;
    pushBox(arr, b.x + b.w / 2, base + b.height / 2, b.y + b.h / 2, b.w, b.height, b.h, b.color);
    if (b.roof) pushBox(arr, b.x + b.w / 2, b.height + 4, b.y + b.h / 2, 14, 8, 12, '#5a5a6a');
  }
  // Street lamps along both sidewalks: pole + arm + warm head, all merged.
  const poleGeo = new THREE.BoxGeometry(3, 26, 3);
  const armGeo = new THREE.BoxGeometry(11, 3, 3);
  const headGeo = new THREE.BoxGeometry(7, 3, 5);
  const lampAt = (x, z, flip) => {
    if (x > CANAL.x0 - 60 && x < CANAL.x1 + 60) return;
    if (x > 2240 || z < 60 || z > WORLD.h - 60) return;
    const s = flip ? -1 : 1;
    _m4.makeTranslation(x, 13, z);
    pushGeom(a, poleGeo, _m4, '#3a3a4d');
    _m4.makeTranslation(x + s * 5, 25, z);
    pushGeom(a, armGeo, _m4, '#3a3a4d');
    _m4.makeTranslation(x + s * 10, 24, z);
    pushGeom(a, headGeo, _m4, '#ffd9a0');
  };
  for (const av of AVENUES) {
    for (let y = 180; y < WORLD.h; y += 320) { lampAt(av - 62, y, -1); lampAt(av + 62, y + 160, 1); }
  }
  for (const st of STREETS) {
    for (let x = 180; x < WORLD.w; x += 320) { lampAt(x, st - 62, -1); lampAt(x + 160, st + 62, 1); }
  }
  // Port containers + cranes.
  for (const c of state.containers) pushBox(a, c.x + c.w / 2, 16, c.y + c.h / 2, c.w, 32, c.h, c.color);
  for (const cr of state.cranes) {
    pushBox(a, cr.x, cr.h / 2, PORT.y0 + 45, 14, cr.h, 14, PALETTE.crane);
    pushBox(a, cr.x + 60, cr.h - 8, PORT.y0 + 45, 130, 12, 12, PALETTE.crane);
    pushBox(a, cr.x + 130, cr.h / 2 - 30, PORT.y0 + 45, 10, cr.h - 60, 10, PALETTE.crane);
  }
  // Santa Monica pier planks into the sea.
  pushBox(a, 2525, 4, 1093, 130, 8, 26, '#8a6a45');
  // Palm trees: chunky trunk + five flat fronds.
  for (const pl of state.palms) {
    pushBox(a, pl.x, 17, pl.y, 6, 34, 6, '#6b4a2f');
    for (let f = 0; f < 5; f += 1) {
      const ang = (f / 5) * Math.PI * 2 + 0.4;
      pushBox(a, pl.x + Math.cos(ang) * 12, 36, pl.y + Math.sin(ang) * 12, 26, 2, 7, '#3f9e4d');
    }
  }
  // Beach umbrellas: pole + cone.
  for (const u of state.umbrellas) {
    pushBox(a, u.x, 8, u.y, 3, 16, 3, '#6b4a2f');
    const cone = new THREE.ConeGeometry(16, 10, 6);
    _m4.makeTranslation(u.x, 20, u.y);
    pushGeom(a, cone, _m4, u.color);
  }
  // Mountains ringing the city, hazed by fog — low wide ridges, not peaks.
  const peaks = [
    [-900, -700, 300, 700], [-200, -1200, 340, 800], [700, -1300, 280, 650],
    [1700, -1200, 320, 750], [3000, -600, 280, 700], [3500, 400, 320, 750],
    [3500, 1400, 260, 650], [-1100, 900, 300, 700], [-1200, 2000, 260, 650],
    [800, 2700, 320, 750], [2200, 2700, 280, 700],
  ];
  for (const [px, pz, ph, pr] of peaks) {
    const cone = new THREE.ConeGeometry(pr, ph * 0.85, 8);
    _m4.makeTranslation(px, (ph * 0.85) / 2 - 10, pz);
    pushGeom(a, cone, _m4, '#9a7a6a');
  }
  const meshT = new THREE.Mesh(arraysToGeometry(aT), new THREE.MeshLambertMaterial({ map: atlasGlass, vertexColors: true }));
  const meshL = new THREE.Mesh(arraysToGeometry(aL), new THREE.MeshLambertMaterial({ map: atlasWarm, vertexColors: true }));
  meshT.matrixAutoUpdate = false;
  meshL.matrixAutoUpdate = false;
  return [meshT, meshL];
}

// ---- dynamic actors: pooled meshes, shared geometries/materials ----
const lambertCache = new Map();
function lambert(color) {
  let m = lambertCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: hex(color) }); lambertCache.set(color, m); }
  return m;
}
const basicCache = new Map();
function basic(color) {
  let m = basicCache.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: hex(color) }); basicCache.set(color, m); }
  return m;
}
const transCache = new Map();
function translucent(color, opacity) {
  const key = `${color}:${opacity}`;
  let m = transCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity, depthWrite: false });
    transCache.set(key, m);
  }
  return m;
}

const carGeoCache = new Map();
function carGeometry(kind, color) {
  const key = `${kind}:${color}`;
  let g = carGeoCache.get(key);
  if (g) return g;
  const a = newArrays();
  if (kind === 'bike') {
    pushBox(a, 0, 9, 0, 44, 12, 10, color);
    pushBox(a, 6, 16, 0, 16, 8, 8, '#1a1a2e');
    pushBox(a, -14, 5, -7, 8, 10, 3, '#111111');
    pushBox(a, -14, 5, 7, 8, 10, 3, '#111111');
    pushBox(a, 14, 5, -7, 8, 10, 3, '#111111');
    pushBox(a, 14, 5, 7, 8, 10, 3, '#111111');
  } else if (kind === 'boat') {
    pushBox(a, 0, 6, 0, 64, 10, 26, color);
    pushBox(a, -6, 14, 0, 30, 8, 20, '#ff7a1a');
    pushBox(a, 18, 12, 0, 10, 6, 18, '#1a1a2e');
    pushBox(a, -28, 8, -12, 8, 6, 3, '#111111');
    pushBox(a, -28, 8, 12, 8, 6, 3, '#111111');
  } else if (kind === 'truck') {
    pushBox(a, -14, 12, 0, 58, 20, 28, color);
    pushBox(a, 32, 12, 0, 26, 18, 26, '#dfe8ff');
    pushBox(a, 32, 24, 0, 20, 8, 24, '#1a1a2e');
    for (const [wx, wz] of [[-30, -14], [-30, 14], [30, -14], [30, 14], [6, -14], [6, 14]]) pushBox(a, wx, 5, wz, 10, 10, 5, '#111111');
  } else {
    const len = kind === 'suv' ? 58 : kind === 'police' ? 54 : 52;
    const wid = kind === 'suv' ? 30 : kind === 'police' ? 27 : 26;
    pushBox(a, 0, 8, 0, len, 11, wid, color);
    pushBox(a, -len * 0.06, 17, 0, len * 0.46, 8, wid * 0.78, kind === 'police' ? '#2e6bff' : '#1a1a2e');
    pushBox(a, len * 0.32, 10, -wid / 2 + 2, 4, 4, 3, '#fff2b0');
    pushBox(a, len * 0.32, 10, wid / 2 - 2, 4, 4, 3, '#fff2b0');
    pushBox(a, -len / 2 + 2, 10, -wid / 2 + 2, 3, 4, 3, '#ff2e4d');
    pushBox(a, -len / 2 + 2, 10, wid / 2 - 2, 3, 4, 3, '#ff2e4d');
    for (const [wx, wz] of [[-len / 2 + 9, -wid / 2], [-len / 2 + 9, wid / 2], [len / 2 - 9, -wid / 2], [len / 2 - 9, wid / 2]]) {
      pushBox(a, wx, 5, wz, 9, 10, 5, '#111111');
    }
  }
  g = arraysToGeometry(a);
  carGeoCache.set(key, g);
  return g;
}

// ---- pedestrians: articulated low-poly figures, one InstancedMesh per body
// part (6 draw calls for all 48 peds). Legs and arms swing about Z while
// walking; shirt/skin/pants/hair colours vary per instance so the crowd is
// not a row of clones. Facing is +X in local space, like the player rig. ----
const _bm = new THREE.Matrix4();
const _lm = new THREE.Matrix4();
const _q2 = new THREE.Quaternion();
const _e2 = new THREE.Euler();
const _s2 = new THREE.Vector3();
const _oneScale = new THREE.Vector3(1, 1, 1);
const _zeroScale = new THREE.Vector3(0.001, 0.001, 0.001);
const _pedColor = new THREE.Color();

function makePedParts(scene) {
  function part(geo, count) {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    const zero = new THREE.Matrix4().makeScale(0.001, 0.001, 0.001);
    for (let i = 0; i < count; i += 1) m.setMatrixAt(i, zero);
    scene.add(m);
    return m;
  }
  return {
    legs: part(new THREE.BoxGeometry(5, 12, 5).translate(0, -6, 0), 96),
    arms: part(new THREE.BoxGeometry(3.5, 12, 3.5).translate(0, -6, 0), 96),
    torso: part(new THREE.BoxGeometry(8, 13, 11), 48),
    head: part(new THREE.BoxGeometry(9, 9, 9), 48),
    hair: part(new THREE.BoxGeometry(9.5, 3.5, 9.5), 48),
    pack: part(new THREE.BoxGeometry(6, 8, 3), 48),
    wasActive: new Array(48).fill(false),
    colorKey: new Array(48).fill(''),
  };
}

function setPart(mesh, idx, base, x, y, z, rotZ) {
  _e2.set(0, 0, rotZ); _q2.setFromEuler(_e2);
  _lm.compose(_v2.set(x, y, z), _q2, _oneScale);
  _m4.multiplyMatrices(base, _lm);
  mesh.setMatrixAt(idx, _m4);
}

function hidePed(parts, i) {
  _m4.makeScale(0.001, 0.001, 0.001);
  parts.legs.setMatrixAt(2 * i, _m4);
  parts.legs.setMatrixAt(2 * i + 1, _m4);
  parts.arms.setMatrixAt(2 * i, _m4);
  parts.arms.setMatrixAt(2 * i + 1, _m4);
  parts.torso.setMatrixAt(i, _m4);
  parts.head.setMatrixAt(i, _m4);
  parts.hair.setMatrixAt(i, _m4);
  parts.pack.setMatrixAt(i, _m4);
}

function setPedColors(parts, i, ped) {
  _pedColor.set(ped.pants || '#2b2b3a');
  parts.legs.setColorAt(2 * i, _pedColor); parts.legs.setColorAt(2 * i + 1, _pedColor);
  _pedColor.set(ped.shirt || ped.color || '#ff8fab');
  parts.arms.setColorAt(2 * i, _pedColor); parts.arms.setColorAt(2 * i + 1, _pedColor);
  parts.torso.setColorAt(i, _pedColor);
  _pedColor.set(ped.skin || '#e8b48a'); parts.head.setColorAt(i, _pedColor);
  _pedColor.set(ped.hair || '#3a2a1a'); parts.hair.setColorAt(i, _pedColor);
  _pedColor.set('#7a5a3a'); parts.pack.setColorAt(i, _pedColor);
  for (const m of [parts.legs, parts.arms, parts.torso, parts.head, parts.hair, parts.pack]) {
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

function syncPeds(parts, state, camera) {
  const camX = camera.position.x, camZ = camera.position.z;
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    if (!ped.active) {
      if (parts.wasActive[i]) {
        parts.wasActive[i] = false;
        parts.colorKey[i] = '';
        hidePed(parts, i);
      }
      continue;
    }
    parts.wasActive[i] = true;
    const key = `${ped.shirt}|${ped.skin}|${ped.pants}|${ped.hair}|${ped.pack}`;
    if (parts.colorKey[i] !== key) {
      parts.colorKey[i] = key;
      setPedColors(parts, i, ped);
    }
    const moving = Math.hypot(ped.tx - ped.x, ped.ty - ped.y) > 12 || ped.flee > 0;
    const bob = moving ? Math.abs(Math.sin(ped.walkPhase)) * 2.5 : 0;
    // A ped right next to the camera is hidden instead of filling the frame.
    const nearCam = Math.hypot(ped.x - camX, ped.y - camZ) < 26;
    const swing = moving ? Math.sin(ped.walkPhase) * 0.5 : 0;
    _e2.set(0, -(ped.face || 0), 0);
    _q2.setFromEuler(_e2);
    _s2.copy(nearCam ? _zeroScale : _oneScale);
    _bm.compose(_v1.set(ped.x, bob, ped.y), _q2, _s2);
    setPart(parts.legs, 2 * i, _bm, 0, 12, -3.5, swing);
    setPart(parts.legs, 2 * i + 1, _bm, 0, 12, 3.5, -swing);
    setPart(parts.arms, 2 * i, _bm, 0, 24, -7.5, -swing * 0.8);
    setPart(parts.arms, 2 * i + 1, _bm, 0, 24, 7.5, swing * 0.8);
    setPart(parts.torso, i, _bm, 0, 18.5, 0, 0);
    setPart(parts.head, i, _bm, 0, 30, 0, 0);
    setPart(parts.hair, i, _bm, 0, 35, 0, 0);
    _e2.set(0, 0, 0); _q2.setFromEuler(_e2);
    _lm.compose(_v2.set(-5, 19, 0), _q2, ped.pack ? _oneScale : _zeroScale);
    _m4.multiplyMatrices(_bm, _lm);
    parts.pack.setMatrixAt(i, _m4);
  }
  for (const m of [parts.legs, parts.arms, parts.torso, parts.head, parts.hair, parts.pack]) {
    m.instanceMatrix.needsUpdate = true;
  }
}

// Mara's rig, built facing +X in local space (the sim's forward): legs and
// arms span the shoulder axis (Z), the gun arm points forward, and the legs
// swing about Z while walking. Shoulders, ponytail and shoes included.
function makePlayerRig() {
  const g = new THREE.Group();
  const legGeo = new THREE.BoxGeometry(5, 14, 5);
  legGeo.translate(0, -7, 0);
  const legMat = lambert('#2b3a55');
  const shoeGeo = new THREE.BoxGeometry(7, 3, 5);
  const shoeMat = lambert('#1a1a2e');
  const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(0, 15, -4);
  const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(0, 15, 4);
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat); shoeL.position.set(2, -13, 0);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat); shoeR.position.set(2, -13, 0);
  legL.add(shoeL); legR.add(shoeR);
  const jacket = lambert('#ff7a1a');
  const torso = new THREE.Mesh(new THREE.BoxGeometry(9, 15, 13), jacket);
  torso.position.set(0, 22, 0);
  const shoulderGeo = new THREE.BoxGeometry(7, 4, 4);
  const shoulderL = new THREE.Mesh(shoulderGeo, jacket); shoulderL.position.set(0, 28, -7.5);
  const shoulderR = new THREE.Mesh(shoulderGeo, jacket); shoulderR.position.set(0, 28, 7.5);
  const head = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), lambert('#e8b48a'));
  head.position.set(0, 35, 0);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(11, 4, 11), lambert('#3a2a1a'));
  hair.position.set(0, 41, 0);
  const pony = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 4), lambert('#3a2a1a'));
  pony.position.set(-6, 36, 0);
  const armGeo = new THREE.BoxGeometry(4, 13, 4);
  armGeo.translate(0, -6, 0);
  const armL = new THREE.Mesh(armGeo, jacket); armL.position.set(0, 28, -8.5);
  const armR = new THREE.Mesh(armGeo, jacket); armR.position.set(0, 28, 8.5);
  // Gun is long along the arm's own axis, so it points forward with the arm.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 3), lambert('#1a1a2e'));
  gun.position.set(0, -13, 0);
  armR.add(gun);
  g.add(legL, legR, torso, shoulderL, shoulderR, head, hair, pony, armL, armR);
  return { group: g, legL, legR, armL, armR, torso };
}

// ---- sky dome shader: golden-hour gradient. The horizon is warm orange
// on the sun side and soft cyan on the opposite horizon; above it the sky
// runs golden pink into a light rose, never a dark purple. ----
function makeSky() {
  const geo = new THREE.SphereGeometry(4200, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      topColor: { value: hex(PALETTE.skyTop) },
      midColor: { value: hex(PALETTE.skyMid) },
      botColor: { value: hex(PALETTE.skyHorizon) },
      eastColor: { value: hex(PALETTE.skyEast) },
      sunDir: { value: new V3(0.85, 0.16, 0.2).normalize() },
      sunColor: { value: hex('#ffe9a8') },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'varying vec3 vDir; uniform vec3 topColor; uniform vec3 midColor; uniform vec3 botColor;',
      'uniform vec3 eastColor; uniform vec3 sunDir; uniform vec3 sunColor;',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float h = clamp(d.y, -0.08, 1.0);',
      '  vec3 sunH = normalize(vec3(sunDir.x, 0.0, sunDir.z));',
      '  float face = clamp(dot(d, sunH), -1.0, 1.0);',
      '  float warm = smoothstep(-0.7, 0.8, face);',
      '  vec3 horizon = mix(eastColor, botColor, warm);',
      '  vec3 col = h < 0.28 ? mix(horizon, midColor, h / 0.28) : mix(midColor, topColor, (h - 0.28) / 0.72);',
      '  float s = max(dot(d, normalize(sunDir)), 0.0);',
      '  float s2 = s * s; float s4 = s2 * s2; float s6 = s4 * s2; float s8 = s4 * s4; float s24 = s8 * s8 * s8;',
      '  col += sunColor * (smoothstep(0.9992, 1.0, s) * 1.4 + s24 * 0.45 + s6 * 0.18);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return mesh;
}

// ---- the scene ----
export function createScene3D(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(hex(PALETTE.fogDusk), 800, 3400);
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 9000);

  const hemi = new THREE.HemisphereLight(hex('#ffc49a'), hex('#7a5a48'), 1.25);
  const sun = new THREE.DirectionalLight(hex('#ffc27a'), 2.1);
  sun.position.set(1700, 300, 380);
  // Cool fill from the west so faces turned away from the sunset are not black.
  const fill = new THREE.DirectionalLight(hex('#8a94c8'), 0.5);
  fill.position.set(-1200, 600, -400);
  // Warm ambient floor: shadow-side walls otherwise crush to black because
  // the dark window atlases multiply the already dim hemisphere light.
  const amb = new THREE.AmbientLight(hex('#ffb08a'), 0.5);
  scene.add(hemi, sun, fill, amb);

  const atlasGlass = makeWindowAtlas('glass');
  const atlasWarm = makeWindowAtlas('warm');
  atlasGlass.anisotropy = renderer.capabilities.getMaxAnisotropy();
  atlasWarm.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const sky = makeSky();
  scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(120, 24), basic('#ffd9a0'));
  sunDisc.position.set(3600, 700, 850);
  sunDisc.lookAt(0, 300, 950);
  scene.add(sunDisc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), transparent: true, depthWrite: false, fog: false }));
  glow.position.copy(sunDisc.position);
  glow.scale.set(950, 950, 1);
  scene.add(glow);

  // Static city is built lazily on first update (needs the state).
  let cityMesh = null;
  let wheelGroup = null;
  let billboards = [];
  let lightBulbs = [];
  let lightPoles = [];

  // Pooled dynamic meshes.
  const carPool = [];
  const pedParts = makePedParts(scene);
  const bulletPool = [];
  const playerRig = makePlayerRig();
  scene.add(playerRig.group);
  const heliGroup = new THREE.Group();
  {
    // Readable police helicopter: white body, blue stripe, glass nose,
    // red tail fin, light-grey rotors, skids, red belly lamp + white strobe.
    const white = lambert('#f2f5fa');
    const body = new THREE.Mesh(new THREE.BoxGeometry(56, 16, 24), white);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 20), lambert('#9fd8e8'));
    nose.position.set(32, -1, 0);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(58, 4, 25), lambert('#2e6bff'));
    stripe.position.set(0, -2, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(52, 7, 7), white);
    tail.position.set(-52, 5, 0);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(3, 18, 10), lambert('#ff2e4d'));
    fin.position.set(-76, 10, 0);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 3), lambert('#c8ccd4'));
    tailRotor.position.set(-76, 6, 6);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 6), lambert('#3a3a4d'));
    mast.position.set(0, 12, 0);
    const rotorGeo = new THREE.BoxGeometry(118, 2, 7);
    const rotorMat = lambert('#c8ccd4');
    const rotor1 = new THREE.Mesh(rotorGeo, rotorMat); rotor1.position.y = 17;
    const rotor2 = new THREE.Mesh(rotorGeo, rotorMat); rotor2.position.y = 17; rotor2.rotation.y = Math.PI / 2;
    const skidGeo = new THREE.BoxGeometry(46, 2, 3);
    const skidMat = lambert('#3a3a4d');
    const skidL = new THREE.Mesh(skidGeo, skidMat); skidL.position.set(0, -12, -11);
    const skidR = new THREE.Mesh(skidGeo, skidMat); skidR.position.set(0, -12, 11);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), basic('#ff2e4d'));
    lamp.position.set(0, -10, 0);
    const strobe = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), basic('#ffffff'));
    strobe.position.set(-76, -2, 0);
    heliGroup.add(body, nose, stripe, tail, fin, tailRotor, mast, rotor1, rotor2, skidL, skidR, lamp, strobe);
    heliGroup.userData.rotors = [rotor1, rotor2];
    heliGroup.userData.tailRotor = tailRotor;
    heliGroup.userData.strobe = strobe;
  }
  scene.add(heliGroup);
  const coneGeo = new THREE.CylinderGeometry(6, 42, 200, 12, 1, true);
  const searchCone = new THREE.Mesh(coneGeo, translucent('#fff2b0', 0.08));
  scene.add(searchCone);
  const spotDisc = new THREE.Mesh(new THREE.CircleGeometry(32, 20), translucent('#fff2b0', 0.07));
  spotDisc.rotation.x = -Math.PI / 2;
  scene.add(spotDisc);
  // Waypoint beacon.
  const beacon = new THREE.Group();
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(6.5), basic('#ffd23e'));
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 180, 8, 1, true), translucent('#ffd23e', 0.08));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 2.5, 8, 24), basic('#ffd23e'));
  ring.rotation.x = Math.PI / 2;
  beacon.add(diamond, pillar, ring);
  scene.add(beacon);
  // Particles as points.
  const P_MAX = 96;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(P_MAX * 3);
  const pCol = new Float32Array(P_MAX * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 7, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true }));
  points.frustumCulled = false;
  scene.add(points);
  // Blob shadows, one instanced circle per vehicle + player.
  const SHADOWS = 48;
  const shadowGeo = new THREE.CircleGeometry(1, 18);
  shadowGeo.rotateX(-Math.PI / 2); // lie flat on the ground
  const shadowMesh = new THREE.InstancedMesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
    SHADOWS,
  );
  shadowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shadowMesh.frustumCulled = false;
  scene.add(shadowMesh);
  const _shadowColor = new THREE.Color('#000000');

  // Camera rig state.
  const cam = { pos: new V3(700, 500, 1400), look: new V3(700, 0, 750), fov: 55, titleAngle: 2.4 };
  let dayNight = '';

  function buildStatics(state) {
    cityMesh = buildCityMesh(state, atlasGlass, atlasWarm);
    for (const m of cityMesh) scene.add(m);
    // Ferris wheel at the pier end.
    wheelGroup = new THREE.Group();
    const wheelGeo = new THREE.TorusGeometry(55, 4, 6, 20);
    const wheel = new THREE.Mesh(wheelGeo, lambert('#e5382e'));
    wheelGroup.add(wheel);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(4, 104, 4), lambert('#e5382e'));
      spoke.position.set(Math.cos(a) * 0, Math.sin(a) * 0, 0);
      spoke.rotation.z = a + Math.PI / 2;
      spoke.position.set(Math.cos(a + Math.PI / 2) * 0, 0, 0);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(13, 13, 13), lambert(['#ff4d6d', '#ffd23e', '#2ee6d6', '#ff7a1a'][i % 4]));
      cabin.position.set(Math.cos(a) * 55, Math.sin(a) * 55, 0);
      wheelGroup.add(spoke, cabin);
    }
    wheelGroup.position.set(2560, 78, 1093);
    scene.add(wheelGroup);
    // Billboards on poles.
    const boards = [
      { x: 700, z: 250, lines: ['NEON DELTA', 'LOS ANGELES'], accent: '#ff7a1a' },
      { x: 2050, z: 300, lines: ['CORAL STRIP', 'BEACHFRONT HOTELS'], accent: '#ff4d8d' },
    ];
    for (const b of boards) {
      const grp = new THREE.Group();
      const poleL = new THREE.Mesh(new THREE.BoxGeometry(6, 46, 6), lambert('#3a3a4d'));
      poleL.position.set(-40, 23, 0);
      const poleR = new THREE.Mesh(new THREE.BoxGeometry(6, 46, 6), lambert('#3a3a4d'));
      poleR.position.set(40, 23, 0);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 60),
        new THREE.MeshBasicMaterial({ map: makeBoardTexture(b.lines, b.accent), side: THREE.DoubleSide }),
      );
      face.position.set(0, 76, 0);
      grp.add(poleL, poleR, face);
      grp.position.set(b.x, 0, b.z);
      scene.add(grp);
      billboards.push(grp);
    }
    // Traffic-light poles + one bulb each (colour follows the phase).
    for (const l of state.lights) {
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.BoxGeometry(5, 64, 5), lambert('#22222e'));
      pole.position.set(0, 32, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(44, 5, 5), lambert('#22222e'));
      arm.position.set(20, 62, 0);
      const head = new THREE.Mesh(new THREE.BoxGeometry(8, 18, 8), lambert('#111111'));
      head.position.set(40, 52, 0);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), basic('#2eff7a'));
      bulb.position.set(40, 54, 6);
      grp.add(pole, arm, head, bulb);
      grp.position.set(l.x + 48, 0, l.y + 48);
      scene.add(grp);
      lightPoles.push(grp);
      lightBulbs.push(bulb);
    }
  }

  function setDayNight(mode) {
    dayNight = mode;
    const night = mode === 'night';
    const u = sky.material.uniforms;
    u.topColor.value.set(night ? PALETTE.nightTop : PALETTE.skyTop);
    u.midColor.value.set(night ? PALETTE.nightMid : PALETTE.skyMid);
    u.botColor.value.set(night ? PALETTE.nightHorizon : PALETTE.skyHorizon);
    u.eastColor.value.set(night ? PALETTE.nightEast : PALETTE.skyEast);
    scene.fog.color.set(night ? PALETTE.fogNight : PALETTE.fogDusk);
    hemi.intensity = night ? 0.4 : 0.95;
    sun.intensity = night ? 0.5 : 2.1;
    amb.intensity = night ? 0.15 : 0.5;
    sunDisc.material.color.set(night ? '#ffb37a' : '#ffe9a8');
    glow.material.opacity = night ? 0.5 : 1;
  }

  function clampDistance(tx, tz, dx, dz, dist, camY, buildings) {
    // Sample outward from the target; stop just before a building taller
    // than the camera line at that point.
    const steps = 12;
    for (let i = 1; i <= steps; i += 1) {
      const t = (i / steps) * dist;
      const x = tx + dx * t, z = tz + dz * t;
      const yAt = camY;
      for (const b of buildings) {
        const top = (b.z0 || 0) + b.height;
        if (x >= b.x && x <= b.x + b.w && z >= b.y && z <= b.y + b.h && top > yAt - 12) {
          return Math.max(40, t - 30);
        }
      }
    }
    return dist;
  }

  function updateCamera(state, screen, dt) {
    const p = state.player;
    if (screen === 'title') {
      cam.titleAngle += dt * 0.045;
      const cx = 800 + Math.cos(cam.titleAngle) * 720;
      const cz = 500 + Math.sin(cam.titleAngle) * 720;
      _v1.set(cx, 400, cz);
      cam.pos.lerp(_v1, Math.min(1, dt * 1.2));
      _v2.set(800, 80, 500);
      cam.look.lerp(_v2, Math.min(1, dt * 1.2));
      camera.position.copy(cam.pos);
      camera.lookAt(cam.look);
      return;
    }
    const driving = !!p.vehicle;
    const fx = Math.cos(p.angle), fz = Math.sin(p.angle);
    // On foot the camera sits behind the aim direction (over the shoulder);
    // driving it sits behind the car's motion.
    let dirX = fx, dirZ = fz;
    if (!driving) { dirX = Math.cos(p.aim); dirZ = Math.sin(p.aim); }
    const dist = driving ? 125 : 80;
    const height = driving ? 50 : 40;
    const rawDist = clampDistance(p.x, p.y, -dirX, -dirZ, dist, height, state.buildings);
    _v1.set(p.x - dirX * rawDist, height, p.y - dirZ * rawDist);
    cam.pos.lerp(_v1, Math.min(1, dt * (driving ? 4.2 : 6)));
    _v2.set(p.x + dirX * (driving ? 95 : 55), driving ? 12 : 16, p.y + dirZ * (driving ? 95 : 55));
    cam.look.lerp(_v2, Math.min(1, dt * 6));
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
    const speedRatio = driving ? Math.min(1, Math.abs(p.speed) / 600) : Math.min(1, p.speed / 340);
    const wantFov = 55 + speedRatio * 7;
    if (Math.abs(camera.fov - wantFov) > 0.1) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
  }

  function syncCar(pool, index, rec, time) {
    let entry = pool[index];
    const key = `${rec.kind}:${rec.color}`;
    if (!entry) {
      entry = { mesh: null, key: '' };
      pool[index] = entry;
    }
    if (!entry.mesh || entry.key !== key) {
      if (entry.mesh) scene.remove(entry.mesh);
      // Lambert: the warm sunset sun (2.1, #ffc27a) gives the bodies their
      // golden sheen; Phong's per-fragment specular cost the software
      // renderer several seconds per frame and is not worth it here.
      entry.mesh = new THREE.Mesh(carGeometry(rec.kind, rec.color), new THREE.MeshLambertMaterial({ vertexColors: true }));
      entry.key = key;
      scene.add(entry.mesh);
    }
    const m = entry.mesh;
    m.visible = true;
    const bob = rec.kind === 'boat' ? 2 + Math.sin(time * 2 + rec.x * 0.01) * 1.5 : 0;
    m.position.set(rec.x, bob, rec.y);
    m.rotation.y = -rec.angle;
    return m;
  }

  function update(state, dt, screen) {
    if (!cityMesh) buildStatics(state);
    if (state.dayNight !== dayNight) setDayNight(state.dayNight);
    const p = state.player;
    const time = state.time;

    // Vehicles (traffic + parked + player car) share one pool by slot.
    let si = 0;
    for (let i = 0; i < state.vehicles.length; i += 1) {
      const v = state.vehicles[i];
      if (!v.active) {
        if (carPool[i] && carPool[i].mesh) carPool[i].mesh.visible = false;
        continue;
      }
      syncCar(carPool, i, v, time);
      if (v === p.vehicle) {
        // Blob shadow under the player car is wider; handled below by index.
      }
      si += 1;
    }
    // Police cruisers + flashing light bars.
    for (let i = 0; i < state.police.length; i += 1) {
      const pol = state.police[i];
      const slot = state.vehicles.length + i;
      if (!pol.active) {
        if (carPool[slot] && carPool[slot].mesh) carPool[slot].mesh.visible = false;
        if (pol._bar) pol._bar.visible = false;
        continue;
      }
      const m = syncCar(carPool, slot, pol, time);
      if (!pol._bar) {
        const bar = new THREE.Group();
        const r = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 8), basic('#ff2e4d'));
        r.position.set(0, 0, -6);
        const b = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 8), basic('#2e6bff'));
        b.position.set(0, 0, 6);
        bar.add(r, b);
        bar.userData.red = r; bar.userData.blue = b;
        scene.add(bar);
        pol._bar = bar;
      }
      pol._bar.visible = true;
      pol._bar.position.set(pol.x, 24, pol.y);
      pol._bar.rotation.y = -pol.angle;
      const flash = Math.floor(time * 5) % 2 === 0;
      pol._bar.userData.red.visible = flash;
      pol._bar.userData.blue.visible = !flash;
      void m;
    }
    // Pedestrians: articulated instanced crowd (see syncPeds).
    syncPeds(pedParts, state, camera);
    // The player: animated rig on foot, hidden while driving.
    const rig = playerRig;
    if (p.vehicle) {
      rig.group.visible = false;
    } else {
      rig.group.visible = true;
      const bob = p.speed > 10 ? Math.abs(Math.sin(p.walkPhase)) * 2 : 0;
      rig.group.position.set(p.x, bob, p.y);
      rig.group.rotation.y = -p.aim;
      const swing = p.speed > 10 ? Math.sin(p.walkPhase) * 0.55 : 0;
      rig.legL.rotation.z = swing;
      rig.legR.rotation.z = -swing;
      rig.armL.rotation.z = -swing * 0.8;
      rig.armR.rotation.z = Math.PI / 2 - 0.1; // gun arm forward
    }
    // Helicopter + searchlight.
    const h = state.heli;
    heliGroup.visible = h.active;
    searchCone.visible = h.active;
    spotDisc.visible = h.active;
    if (h.active) {
      heliGroup.position.set(h.x, 150, h.y);
      heliGroup.rotation.y = -h.angle;
      for (const r of heliGroup.userData.rotors) r.rotation.y += dt * 22;
      heliGroup.userData.tailRotor.rotation.x += dt * 30;
      heliGroup.userData.strobe.visible = Math.floor(time * 2) % 2 === 0;
      _v1.set(h.x, 150, h.y);
      _v2.set(p.x, 0, p.y);
      _v3.subVectors(_v2, _v1);
      const len = _v3.length();
      searchCone.position.copy(_v1).addScaledVector(_v3, 0.5);
      _v3.normalize().negate(); // cylinder +Y (narrow end) points back at the heli
      _q.setFromUnitVectors(_s1.set(0, 1, 0), _v3);
      searchCone.quaternion.copy(_q);
      searchCone.scale.set(1, len / 200, 1);
      spotDisc.position.set(p.x, 0.6, p.y);
    }
    // Bullets as tracers.
    for (let i = 0; i < state.bullets.length; i += 1) {
      const b = state.bullets[i];
      let mesh = bulletPool[i];
      if (!mesh) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 2), basic('#ffe9a8'));
        scene.add(mesh);
        bulletPool[i] = mesh;
      }
      if (!b.active) { mesh.visible = false; continue; }
      mesh.visible = true;
      mesh.position.set(b.x, 16, b.y);
      mesh.rotation.y = -Math.atan2(b.vy, b.vx);
    }
    // Particles as points.
    let pi = 0;
    const col = new THREE.Color();
    for (const q of state.particles) {
      if (!q.active) continue;
      pPos[pi * 3] = q.x; pPos[pi * 3 + 1] = 12; pPos[pi * 3 + 2] = q.y;
      col.set(q.color);
      pCol[pi * 3] = col.r; pCol[pi * 3 + 1] = col.g; pCol[pi * 3 + 2] = col.b;
      pi += 1;
      if (pi >= P_MAX) break;
    }
    for (; pi < P_MAX; pi += 1) { pPos[pi * 3 + 1] = -100; }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
    // Waypoint beacon.
    const wp = missionWaypoint(state) || (state.job ? { x: state.job.def.tx, y: state.job.def.ty } : null);
    beacon.visible = !!wp;
    if (wp) {
      beacon.position.set(wp.x, 0, wp.y);
      diamond.position.y = 46 + Math.sin(time * 4) * 4;
      diamond.rotation.y = time * 2;
      pillar.position.y = 90;
      ring.position.y = 1.5;
    }
    // Blob shadows under vehicles, police and the player.
    let sh = 0;
    _euler.set(0, 0, 0);
    for (const v of state.vehicles) {
      if (!v.active || sh >= SHADOWS) continue;
      _q.setFromEuler(_euler.set(0, -v.angle, 0));
      _s1.set(v.def.len * 0.62, 1, v.def.wid * 0.62);
      _m4.compose(_v1.set(v.x, 0.3, v.y), _q, _s1);
      shadowMesh.setMatrixAt(sh, _m4);
      sh += 1;
    }
    for (const pol of state.police) {
      if (!pol.active || sh >= SHADOWS) continue;
      _q.setFromEuler(_euler.set(0, -pol.angle, 0));
      _s1.set(34, 1, 18);
      _m4.compose(_v1.set(pol.x, 0.3, pol.y), _q, _s1);
      shadowMesh.setMatrixAt(sh, _m4);
      sh += 1;
    }
    if (!p.vehicle && sh < SHADOWS) {
      _q.setFromEuler(_euler.set(0, 0, 0));
      _s1.set(16, 1, 16);
      _m4.compose(_v1.set(p.x, 0.3, p.y), _q, _s1);
      shadowMesh.setMatrixAt(sh, _m4);
      sh += 1;
    }
    for (; sh < SHADOWS; sh += 1) {
      _m4.makeScale(0, 0, 0);
      shadowMesh.setMatrixAt(sh, _m4);
    }
    shadowMesh.instanceMatrix.needsUpdate = true;
    // Ferris wheel turns slowly; traffic-light bulbs follow the phase.
    if (wheelGroup) wheelGroup.rotation.z += dt * 0.12;
    for (let i = 0; i < lightBulbs.length; i += 1) {
      const phase = (time + (state.lights[i] ? state.lights[i].phase : 0)) % 12;
      lightBulbs[i].material = basic(phase < 6 ? '#2eff7a' : '#ff2e4d');
    }
    updateCamera(state, screen, dt);
    renderer.render(scene, camera);
  }

  // Screen pixel -> sim ground point (for aiming on foot).
  function screenToGround(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    _ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    const o = _ray.ray.origin, d = _ray.ray.direction;
    if (d.y < -0.001) {
      const t = -o.y / d.y;
      return { x: o.x + d.x * t, y: o.z + d.z * t };
    }
    return { x: o.x + d.x * 800, y: o.z + d.z * 800 };
  }

  // Screen pixel -> first scene hits (debug: identify what a ray strikes).
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    _ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    const hits = _ray.intersectObjects(scene.children, true);
    return hits.slice(0, 3).map((h) => ({
      dist: Math.round(h.distance),
      point: { x: Math.round(h.point.x), y: Math.round(h.point.y), z: Math.round(h.point.z) },
      type: h.object.type,
      mat: h.object.material ? h.object.material.type : '?',
      color: h.object.material && h.object.material.color ? `#${h.object.material.color.getHexString()}` : null,
      name: h.object.name || '',
    }));
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return { update, screenToGround, pick, resize, renderer, scene, camera };
}
