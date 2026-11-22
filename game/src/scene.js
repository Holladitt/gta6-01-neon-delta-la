// scene.js — Three.js scene: renderer, city, props, sky, camera (browser).
import * as THREE from 'three';
import { paintGroundTexture, buildColliders } from './world.js';
import { buildBuildings, buildProps, glowDiscs, SHOP, PIER, CRANE } from './geo.js';
import { nightLevel, lightState } from './lights.js';
import { ROAD_SPACING } from './config.js';

function textTexture(text, bg, fg, w = 256, h = 80, font = 44) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `bold ${font}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f2ede4';
  g.fillRect(0, 0, 128, 128);
  for (let y = 10; y < 118; y += 22) {
    for (let x = 10; x < 118; x += 22) {
      g.fillStyle = (x + y) % 44 === 0 ? '#ffd27a' : '#2a3440';
      g.fillRect(x, y, 13, 14);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setSize(1280, 720, false);
  renderer.setPixelRatio(1);
  renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d6);
  scene.fog = new THREE.Fog(0x87b5d6, 420, 1700);
  const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.5, 3200);

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.25);
  sun.position.set(300, 500, 200);
  scene.add(sun);

  // Ground: one canvas-texture plane.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    new THREE.MeshLambertMaterial({ map: paintGroundTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Sea water (south), slightly above the ground.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 150),
    new THREE.MeshLambertMaterial({ color: 0x2f7fae, transparent: true, opacity: 0.85 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.4, 830);
  scene.add(water);

  // Buildings: one InstancedMesh, window texture, per-instance tint.
  const buildings = buildBuildings();
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const bMat = new THREE.MeshLambertMaterial({ map: windowTexture() });
  const bMesh = new THREE.InstancedMesh(bGeo, bMat, buildings.length);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  buildings.forEach((b, i) => {
    dummy.position.set(b.x, b.h / 2, b.z);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    bMesh.setMatrixAt(i, dummy.matrix);
    bMesh.setColorAt(i, col.setHex(b.color));
  });
  bMesh.instanceMatrix.needsUpdate = true;
  if (bMesh.instanceColor) bMesh.instanceColor.needsUpdate = true;
  scene.add(bMesh);

  // Shared materials / geometries for props.
  const M = {
    wood: new THREE.MeshLambertMaterial({ color: 0x8a6a45 }),
    darkWood: new THREE.MeshLambertMaterial({ color: 0x5a4028 }),
    gray: new THREE.MeshLambertMaterial({ color: 0x8a8a86 }),
    dark: new THREE.MeshLambertMaterial({ color: 0x22262b }),
    green: new THREE.MeshLambertMaterial({ color: 0x2f6b2f }),
    leaf: new THREE.MeshLambertMaterial({ color: 0x3f8a3f }),
    trunk: new THREE.MeshLambertMaterial({ color: 0x5a4028 }),
    rust: new THREE.MeshLambertMaterial({ color: 0xb06a2f }),
    blue: new THREE.MeshLambertMaterial({ color: 0x2e6db4 }),
    red: new THREE.MeshLambertMaterial({ color: 0xc0392b }),
    yellow: new THREE.MeshLambertMaterial({ color: 0xf1c40f }),
    white: new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
    lampWarm: new THREE.MeshLambertMaterial({ color: 0xffd27a, emissive: 0xaa7733 }),
    crate: new THREE.MeshLambertMaterial({ color: 0x9a7a4a }),
  };
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    sph: new THREE.SphereGeometry(0.5, 8, 6),
  };
  function box(mat, w, h, d, x, y, z, ry = 0) {
    const m = new THREE.Mesh(G.box, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  }
  function cyl(mat, r, h, x, y, z) {
    const m = new THREE.Mesh(G.cyl, mat);
    m.scale.set(r * 2, h, r * 2);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // DELTA ARMS shop: low storefront + sign on its north face.
  box(M.gray, 24, 9, 14, SHOP.x, 4.5, SHOP.z);
  box(M.dark, 26, 0.8, 16, SHOP.x, 9.2, SHOP.z);
  const shopSign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 4.5),
    new THREE.MeshBasicMaterial({ map: textTexture('DELTA ARMS', '#1a2a33', '#ffd27a', 512, 128, 64) })
  );
  shopSign.position.set(SHOP.x, 6.5, SHOP.z - 7.1);
  shopSign.rotation.y = Math.PI;
  scene.add(shopSign);
  const openSign = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.2),
    new THREE.MeshBasicMaterial({ map: textTexture('OPEN • GUNS • AMMO', '#c0392b', '#ffffff', 512, 112, 38) })
  );
  openSign.position.set(SHOP.x, 3.2, SHOP.z - 7.1);
  openSign.rotation.y = Math.PI;
  scene.add(openSign);

  // Coral Pier: deck, entrance arch, stalls with signs, lamp posts.
  box(M.wood, 90, 1.2, 180, 0, 0.6, 790);
  const pierSign = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 5),
    new THREE.MeshBasicMaterial({ map: textTexture('CORAL PIER', '#123f3a', '#ff6b5e', 512, 96, 56) })
  );
  pierSign.position.set(0, 10, 702);
  pierSign.rotation.y = Math.PI;
  scene.add(pierSign);
  box(M.darkWood, 2, 10, 2, -46, 5, 702);
  box(M.darkWood, 2, 10, 2, 46, 5, 702);
  const stallSigns = { '-25,800': 'BALLOONS', '0,820': 'ARCADE', '25,800': 'SNO-CONES' };
  const stallDefs = [
    { x: -25, z: 800, c: 0xff6b5e }, { x: 0, z: 820, c: 0x2fb8a6 }, { x: 25, z: 800, c: 0xf1c40f },
    { x: -25, z: 845, c: 0x8a4fd9 }, { x: 25, z: 845, c: 0x3d7dd9 },
  ];
  for (const s of stallDefs) {
    const mat = new THREE.MeshLambertMaterial({ color: s.c });
    box(mat, 8, 5, 6, s.x, 3.7, s.z);
    box(M.darkWood, 9, 0.6, 7, s.x, 6.5, s.z);
    const label = stallSigns[`${s.x},${s.z}`];
    if (label) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 2),
        new THREE.MeshBasicMaterial({ map: textTexture(label, '#1a1a1a', '#ffffff', 256, 72, 40) })
      );
      sign.position.set(s.x, 5.2, s.z - 3.1);
      sign.rotation.y = Math.PI;
      scene.add(sign);
    }
  }

  // Port crane (orange) with a hanging load.
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xff7a1a });
  box(craneMat, 4, 42, 4, CRANE.x - 14, 21, CRANE.z);
  box(craneMat, 4, 42, 4, CRANE.x + 14, 21, CRANE.z);
  box(craneMat, 40, 4, 4, CRANE.x, 42, CRANE.z);
  box(craneMat, 3, 10, 3, CRANE.x + 18, 36, CRANE.z);
  const load = box(new THREE.MeshLambertMaterial({ color: 0xe67e22 }), 8, 3.4, 3.4, CRANE.x + 8, 18, CRANE.z);
  box(M.dark, 0.3, 24, 0.3, CRANE.x + 8, 30, CRANE.z);
  const portSign = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 4.5),
    new THREE.MeshBasicMaterial({ map: textTexture('LONG BEACH PORT', '#1a2a33', '#ff9a3c', 512, 96, 52) })
  );
  portSign.position.set(700, 8, 302);
  portSign.rotation.y = Math.PI;
  scene.add(portSign);

  // Props from geo.
  const contCols = [0xc0392b, 0x2e86c1, 0xe67e22, 0x7d3c98, 0x1abc9c];
  let ci = 0;
  for (const p of buildProps()) {
    switch (p.type) {
      case 'tree': {
        cyl(M.trunk, 0.5, 3, p.x, 1.5, p.z);
        const f = new THREE.Mesh(G.sph, M.leaf);
        f.scale.set(3.4, 3.4, 3.4);
        f.position.set(p.x, 4.4, p.z);
        scene.add(f);
        break;
      }
      case 'planter': box(M.gray, 2.4, 1, 2.4, p.x, 0.5, p.z); {
        const f = new THREE.Mesh(G.sph, M.leaf);
        f.scale.set(1.6, 1.2, 1.6);
        f.position.set(p.x, 1.4, p.z);
        scene.add(f);
        break;
      }
      case 'crate': box(M.crate, 1.8, 1.8, 1.8, p.x, 0.9, p.z, p.rot); break;
      case 'barrel': cyl(p.rot ? M.blue : M.rust, 0.7, 1.6, p.x, 0.8, p.z); break;
      case 'lamp': {
        cyl(M.dark, 0.18, 6, p.x, 3, p.z);
        const head = new THREE.Mesh(G.sph, M.lampWarm);
        head.scale.set(0.9, 0.9, 0.9);
        head.position.set(p.x, 6.2, p.z);
        scene.add(head);
        break;
      }
      case 'container': {
        const mat = new THREE.MeshLambertMaterial({ color: contCols[ci++ % contCols.length] });
        box(mat, 12, 3, 3, p.x, 1.5, p.z, p.rot);
        break;
      }
      case 'boat': {
        box(M.white, 7, 1.6, 2.6, p.x, 0.8, p.z, p.rot);
        box(M.blue, 3, 1.4, 2, p.x, 2.2, p.z, p.rot);
        break;
      }
      case 'forklift': {
        box(M.yellow, 2.4, 1.6, 1.4, p.x, 0.8, p.z, p.rot);
        box(M.dark, 0.2, 3.4, 1.2, p.x + 1.1, 1.7, p.z, p.rot);
        break;
      }
      case 'pallet': box(M.wood, 2, 0.3, 2, p.x, 0.15, p.z, p.rot); break;
      case 'bikerack': {
        for (let k = -1; k <= 1; k++) box(M.dark, 0.15, 1.1, 0.15, p.x + k * 0.8, 0.55, p.z);
        box(M.dark, 2.4, 0.15, 0.15, p.x, 1.05, p.z);
        break;
      }
      case 'bike': {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 14), M.dark);
        wheel.position.set(p.x - 0.7, 0.55, p.z);
        scene.add(wheel);
        const wheel2 = wheel.clone();
        wheel2.position.set(p.x + 0.7, 0.55, p.z);
        scene.add(wheel2);
        box(M.red, 1.5, 0.12, 0.12, p.x, 0.9, p.z);
        break;
      }
      case 'newsbox': box(M.blue, 1.2, 1.4, 0.8, p.x, 0.7, p.z); break;
      case 'bin': cyl(M.green, 0.6, 1.2, p.x, 0.6, p.z); break;
      case 'board': {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ map: textTexture('OPEN', '#f1c40f', '#1a1a1a', 128, 176, 56), side: THREE.DoubleSide }));
        b.position.set(p.x, 1.1, p.z);
        b.rotation.y = Math.PI + p.rot;
        scene.add(b);
        break;
      }
      case 'hedge': box(M.green, 3, 1, 1.2, p.x, 0.5, p.z); break;
      case 'flower': {
        const f = new THREE.Mesh(G.sph, new THREE.MeshLambertMaterial({ color: 0xff6b9a }));
        f.scale.set(0.5, 0.5, 0.5);
        f.position.set(p.x, 0.5, p.z);
        scene.add(f);
        break;
      }
      case 'bench': {
        box(M.wood, 2.4, 0.15, 0.8, p.x, 0.6, p.z);
        box(M.wood, 2.4, 0.9, 0.15, p.x, 1.0, p.z + 0.4);
        break;
      }
      case 'hydrant': cyl(M.red, 0.35, 0.9, p.x, 0.45, p.z); break;
      case 'puddle': {
        const pd = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), new THREE.MeshLambertMaterial({ color: 0x2a3a4a, transparent: true, opacity: 0.55 }));
        pd.rotation.x = -Math.PI / 2;
        pd.position.set(p.x, 0.06, p.z);
        scene.add(pd);
        break;
      }
      case 'glowpool': break; // handled by the glow discs below
      case 'parked': break; // parked cars are spawned by main.js
      default: break;
    }
  }

  // Traffic lights at 4 downtown intersections (NS + EW heads).
  const tlMats = {
    nsRed: new THREE.MeshLambertMaterial({ color: 0x550000, emissive: 0xff0000 }),
    nsYellow: new THREE.MeshLambertMaterial({ color: 0x554400, emissive: 0xffcc00 }),
    nsGreen: new THREE.MeshLambertMaterial({ color: 0x003300, emissive: 0x00ff44 }),
    ewRed: new THREE.MeshLambertMaterial({ color: 0x550000, emissive: 0xff0000 }),
    ewYellow: new THREE.MeshLambertMaterial({ color: 0x554400, emissive: 0xffcc00 }),
    ewGreen: new THREE.MeshLambertMaterial({ color: 0x003300, emissive: 0x00ff44 }),
  };
  const tlDots = [];
  for (const [ix, iz] of [[-150, -150], [150, -150], [-150, 150], [150, 150]]) {
    cyl(M.dark, 0.16, 5.4, ix + 11, 2.7, iz + 11);
    const headNS = box(M.dark, 0.9, 2.2, 0.6, ix + 11, 5.6, iz + 11);
    headNS.visible = true;
    const dotsNS = [
      new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), tlMats.nsRed),
      new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), tlMats.nsYellow),
      new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), tlMats.nsGreen),
    ];
    dotsNS.forEach((d, k) => {
      d.position.set(ix + 11, 6.3 - k * 0.7, iz + 11.4);
      scene.add(d);
    });
    tlDots.push({ axis: 'ns', dots: dotsNS });
    const dotsEW = [
      new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), tlMats.ewRed),
      new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), tlMats.ewYellow),
      new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), tlMats.ewGreen),
    ];
    dotsEW.forEach((d, k) => {
      d.position.set(ix + 11.4, 6.3 - k * 0.7, iz + 11);
      scene.add(d);
    });
    tlDots.push({ axis: 'ew', dots: dotsEW });
  }

  // Clouds: one shared material (opacity set on the material, never a Group).
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const clouds = [];
  const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 7; i++) {
    const cl = new THREE.Mesh(cloudGeo, cloudMat);
    cl.scale.set(46 + (i % 3) * 18, 7, 20 + (i % 2) * 8);
    cl.position.set(-700 + i * 240, 150 + (i % 3) * 22, -600 + (i % 4) * 320);
    scene.add(cl);
    clouds.push(cl);
  }

  // Warm glow discs at night (28), one InstancedMesh, additive.
  const discs = glowDiscs();
  const discGeo = new THREE.CircleGeometry(5, 20);
  const discMat = new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const discMesh = new THREE.InstancedMesh(discGeo, discMat, discs.length);
  discs.forEach((d, i) => {
    dummy.position.set(d[0], 0.22, d[1]);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    discMesh.setMatrixAt(i, dummy.matrix);
  });
  discMesh.instanceMatrix.needsUpdate = true;
  scene.add(discMesh);

  // Pier point lights (warm, 3 of them).
  const pierLights = [];
  for (const [lx, lz] of [[-25, 800], [0, 820], [25, 800]]) {
    const pl = new THREE.PointLight(0xffb45e, 0, 60, 1.6);
    pl.position.set(lx, 7, lz);
    scene.add(pl);
    pierLights.push(pl);
  }

  const colliders = buildColliders();
  const camState = { x: 0, y: 8, z: 0, lx: 0, ly: 0, lz: 0 };

  return {
    renderer, scene, camera, ambient, sun, water, clouds, cloudMat,
    discMat, pierLights, tlMats, tlDots, colliders, camState, load,
  };
}

const DAY_SKY = new THREE.Color(0x87b5d6);
const DUSK_SKY = new THREE.Color(0xc44a12);
const NIGHT_SKY = new THREE.Color(0x0e1a2e);

export function updateScene(S, G, dt) {
  const night = nightLevel(G.hour);
  // Sky + fog + lights.
  const sky = new THREE.Color();
  if (night <= 0) sky.copy(DAY_SKY);
  else if (night < 0.5) sky.copy(DAY_SKY).lerp(DUSK_SKY, Math.min(1, night * 2.5));
  else sky.copy(DUSK_SKY).lerp(NIGHT_SKY, (night - 0.5) * 2);
  S.scene.background = sky;
  S.scene.fog.color.copy(sky);
  S.ambient.intensity = 0.75 - night * 0.42;
  S.sun.intensity = 1.25 - night * 1.05;
  S.sun.color.setHex(night > 0.6 ? 0x5a7aaa : night > 0.25 ? 0xff9a5c : 0xfff2d0);
  S.sun.position.set(300 - night * 500, 500 - night * 320, 200);
  // Glow discs + pier lights fade in at night.
  S.discMat.opacity = night * 0.6;
  for (const pl of S.pierLights) pl.intensity = night * 30;
  // Clouds fade at night; drift slowly.
  S.cloudMat.opacity = 0.85 * (1 - night * 0.7);
  for (const cl of S.clouds) {
    cl.position.x += dt * 1.5;
    if (cl.position.x > 950) cl.position.x = -950;
  }
  // Water shimmer.
  S.water.material.opacity = 0.85 - night * 0.25;
  // Traffic lights.
  const ls = lightState(G.time);
  const setAxis = (axis, state) => {
    const mats = axis === 'ns' ? { r: S.tlMats.nsRed, y: S.tlMats.nsYellow, g: S.tlMats.nsGreen } : { r: S.tlMats.ewRed, y: S.tlMats.ewYellow, g: S.tlMats.ewGreen };
    mats.r.emissiveIntensity = state === 'red' ? 1.6 : 0.08;
    mats.y.emissiveIntensity = state === 'yellow' ? 1.6 : 0.08;
    mats.g.emissiveIntensity = state === 'green' ? 1.6 : 0.08;
  };
  setAxis('ns', ls.ns);
  setAxis('ew', ls.ew);
  // Camera.
  const cam = S.camState;
  if (G.cameraOverride) {
    cam.x += (G.cameraOverride.pos[0] - cam.x) * Math.min(1, 5 * dt);
    cam.y += (G.cameraOverride.pos[1] - cam.y) * Math.min(1, 5 * dt);
    cam.z += (G.cameraOverride.pos[2] - cam.z) * Math.min(1, 5 * dt);
    cam.lx = G.cameraOverride.look[0];
    cam.ly = G.cameraOverride.look[1];
    cam.lz = G.cameraOverride.look[2];
  } else {
    const px = G.player.x, pz = G.player.z;
    const fx = Math.sin(G.player.heading), fz = -Math.cos(G.player.heading);
    const tx = px - fx * 13, tz = pz - fz * 13, ty = 6.5;
    cam.x += (tx - cam.x) * Math.min(1, 4 * dt);
    cam.y += (ty - cam.y) * Math.min(1, 4 * dt);
    cam.z += (tz - cam.z) * Math.min(1, 4 * dt);
    cam.lx = px + fx * 10;
    cam.ly = 1.5;
    cam.lz = pz + fz * 10;
  }
  S.camera.position.set(cam.x, cam.y, cam.z);
  S.camera.lookAt(cam.lx, cam.ly, cam.lz);
}
