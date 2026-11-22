// Three.js scene: one canvas-texture ground (not thousands of road
// meshes), Lambert materials, no shadows, no antialiasing, a fixed
// 1280x720 render buffer, and only a few point lights on the pier.
// The clouds share one material — fade it on the MATERIAL, never
// on the Group (a Group has no opacity and setting it freezes the
// game at tick 1). The scene syncs its meshes from the pure world
// state every frame; it never owns game logic.
import * as THREE from 'three';
import { MAP, DISTRICTS, PIER_DECK, CRANE, BOAT, SHOP, GARAGE_POS } from './config.js';
import { phaseFor, skyTop, skyBottom } from './lights.js';
import { MARA } from './characters.js';
import { buildingCenters } from './geo.js';
import { missionById } from './missions.js';
import { tapeSpots } from './races.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function groundTexture() {
  return canvasTexture(2048, 2048, (g, W, H) => {
    // The ground plane is 1560 wide centred on the origin, so the
    // texture maps world -780..780 to the full canvas; roads, the
    // pier deck and the grass then land on their real coordinates
    // instead of ~100 units west of them.
    const sx = W / 1560; const sz = H / 1560;
    const X = (x) => (x + 780) * sx;
    const Z = (z) => (z + 780) * sz;
    g.fillStyle = '#8a7f6a'; g.fillRect(0, 0, W, H);
    // District ground tints.
    const tints = { downtown: '#9a8f78', hills: '#7d8a6a', venice: '#a89a7e', marina: '#8fa3a0', pier: '#b09a7a', port: '#8d8578' };
    for (const d of DISTRICTS) {
      g.fillStyle = tints[d.id] || '#8a7f6a';
      g.fillRect(X(d.x0), Z(d.z0), (d.x1 - d.x0) * sx, (d.z1 - d.z0) * sz);
    }
    // Water: west strip and south strip.
    g.fillStyle = '#1e6f8e';
    g.fillRect(0, 0, X(-620), H);
    g.fillRect(0, Z(620), W, H - Z(620));
    // Sand along the water.
    g.fillStyle = '#d9c48f';
    g.fillRect(X(-620), 0, 14, H);
    g.fillRect(0, Z(620), W, 14);
    // Port yard concrete + marina apron go down FIRST, so the road
    // grid and lane dashes draw over them (asphalt with yellow
    // lines in the port yard, not flat grey dirt).
    g.fillStyle = '#7a7268';
    g.fillRect(X(-80), Z(280), 780 * sx, 340 * sz);
    g.fillStyle = '#9fb3ad';
    g.fillRect(X(-80), Z(-120), 400 * sx, 400 * sz);
    // Roads: dark asphalt with lane dashes, every 120 units.
    g.fillStyle = '#3a3a3a';
    for (let x = -560; x <= 560; x += 120) g.fillRect(X(x) - 11 * sx, 0, 22 * sx, H);
    for (let z = -560; z <= 560; z += 120) g.fillRect(0, Z(z) - 11 * sz, W, 22 * sz);
    g.fillStyle = '#f7d154';
    for (let x = -560; x <= 560; x += 120) {
      for (let z = -560; z <= 560; z += 30) g.fillRect(X(x) - 1, Z(z), 2, 14 * sz);
    }
    for (let z = -560; z <= 560; z += 120) {
      for (let x = -560; x <= 560; x += 30) g.fillRect(X(x), Z(z) - 1, 14 * sx, 2);
    }
    // Sidewalk edges.
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 2;
    for (let x = -560; x <= 560; x += 120) {
      g.strokeRect(X(x) - 16 * sx, 0, 32 * sx, H);
    }
    // Pier deck planks.
    g.fillStyle = '#a8763e';
    g.fillRect(X(PIER_DECK.x0), Z(PIER_DECK.z0), (PIER_DECK.x1 - PIER_DECK.x0) * sx, (PIER_DECK.z1 - PIER_DECK.z0) * sz);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let z = PIER_DECK.z0; z <= PIER_DECK.z1; z += 12) {
      g.beginPath(); g.moveTo(X(PIER_DECK.x0), Z(z)); g.lineTo(X(PIER_DECK.x1), Z(z)); g.stroke();
    }
    // Green grass patch under the shop forecourt.
    g.fillStyle = '#5d8a4a';
    g.fillRect(X(-360), Z(-220), 90 * sx, 90 * sz);
  });
}

function windowTexture(base, lit) {
  return canvasTexture(128, 256, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let y = 12; y < H - 12; y += 22) {
      for (let x = 10; x < W - 10; x += 20) {
        g.fillStyle = ((x + y) % 3 === 0) ? lit : 'rgba(20,30,40,0.9)';
        g.fillRect(x, y, 12, 14);
      }
    }
  });
}

function box(w, h, d, color) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  return m;
}

export function createScene() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setSize(1280, 720, false);
  renderer.shadowMap.enabled = false;
  const scene = new THREE.Scene();
  function skyTexture(stops) {
    return canvasTexture(16, 512, (g, W, H) => {
      const grad = g.createLinearGradient(0, 0, 0, H);
      for (const [at, col] of stops) grad.addColorStop(at, col);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    });
  }
  const skyTex = {
    day: skyTexture([[0, '#2f8fc4'], [0.55, '#3fa7d6'], [1, '#bfe8f2']]),
    dusk: skyTexture([[0, '#5e2438'], [0.45, '#c24a3a'], [0.75, '#e86a3c'], [1, '#f7b267']]),
    night: skyTexture([[0, '#050a14'], [0.6, '#0d1b2e'], [1, '#1c2f4a']]),
  };
  scene.background = skyTex.day;
  scene.fog = new THREE.Fog(0x9fc8d8, 300, 900);
  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.5, 2000);
  camera.position.set(-260, 60, -260);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.1);
  sun.position.set(200, 300, 100);
  scene.add(sun);

  // Ground: one plane, one canvas texture.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1560, 1560),
    new THREE.MeshLambertMaterial({ map: groundTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // Water planes (west + south), slightly below ground level.
  // They extend past the ground plane so the ocean reaches the
  // horizon instead of ending at the edge of the map.
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x1e6f8e });
  const waterW = new THREE.Mesh(new THREE.PlaneGeometry(400, 1560), waterMat);
  waterW.rotation.x = -Math.PI / 2;
  waterW.position.set(-980, -0.4, 0);
  scene.add(waterW);
  const waterS = new THREE.Mesh(new THREE.PlaneGeometry(1560, 400), waterMat);
  waterS.rotation.x = -Math.PI / 2;
  waterS.position.set(0, -0.4, 980);
  scene.add(waterS);

  // Buildings with window grids, on blocks between roads.
  // Checkerboard-thinned so the streets open up; the port yard and
  // the low pier district stay open. Same list as geo.js.
  const winTexA = windowTexture('#5b6b7a', '#ffd76a');
  const winTexB = windowTexture('#7a5b6b', '#ffd76a');
  const winTexC = windowTexture('#4a6b5b', '#9fe8ff');
  const texes = [winTexA, winTexB, winTexC];
  buildingCenters().forEach((bc, ti) => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(70, bc.h, 70),
      new THREE.MeshLambertMaterial({ map: texes[ti % 3] })
    );
    b.position.set(bc.x, bc.h / 2, bc.z);
    scene.add(b);
  });

  // Clouds share ONE material; fade the material only.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const clouds = new THREE.Group();
  const cloudSpots = [[-400, 180, -300], [0, 200, -450], [300, 170, 100], [-100, 190, 400], [500, 180, -200], [-500, 175, 200]];
  for (const [x, y, z] of cloudSpots) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(120, 14, 50), cloudMat);
    c.position.set(x, y, z);
    clouds.add(c);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(70, 12, 40), cloudMat);
    c2.position.set(x + 40, y + 8, z + 10);
    clouds.add(c2);
  }
  scene.add(clouds);

  // --- Props ---
  const props = {};
  // DELTA ARMS shop front.
  const shop = new THREE.Group();
  const shopBase = box(46, 16, 24, 0x4a6b7a);
  shopBase.position.y = 8;
  shop.add(shopBase);
  const shopSign = box(40, 5, 2, 0x1abc9c);
  shopSign.position.set(0, 17, 12);
  shop.add(shopSign);
  const shopNameTex = canvasTexture(512, 64, (cg) => {
    cg.fillStyle = '#0d2b3e';
    cg.fillRect(0, 0, 512, 64);
    cg.fillStyle = '#ffffff';
    cg.font = '900 40px Arial, sans-serif';
    cg.textAlign = 'center';
    cg.textBaseline = 'middle';
    cg.fillText('DELTA ARMS', 256, 34);
  });
  const shopName = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 4.5),
    new THREE.MeshLambertMaterial({ map: shopNameTex })
  );
  shopName.position.set(0, 17, 13.1);
  shop.add(shopName);
  const shopDoor = box(8, 10, 1, 0xf7d154);
  shopDoor.position.set(0, 5, 12.5);
  shop.add(shopDoor);
  shop.position.set(SHOP.x, 0, SHOP.z);
  scene.add(shop);
  props.shop = shop;
  // Garage next door.
  const garage = new THREE.Group();
  const gBase = box(36, 12, 22, 0x7f8c8d);
  gBase.position.y = 6;
  garage.add(gBase);
  const gSign = box(30, 4, 2, 0xe67e22);
  gSign.position.set(0, 13, 11);
  garage.add(gSign);
  const garageNameTex = canvasTexture(512, 64, (cg) => {
    cg.fillStyle = '#3a2408';
    cg.fillRect(0, 0, 512, 64);
    cg.fillStyle = '#ffd76a';
    cg.font = '900 36px Arial, sans-serif';
    cg.textAlign = 'center';
    cg.textBaseline = 'middle';
    cg.fillText('DELTA GARAGE', 256, 34);
  });
  const garageName = new THREE.Mesh(
    new THREE.PlaneGeometry(27, 3.4),
    new THREE.MeshLambertMaterial({ map: garageNameTex })
  );
  garageName.position.set(0, 13, 12.1);
  garage.add(garageName);
  garage.position.set(GARAGE_POS.x, 0, GARAGE_POS.z);
  scene.add(garage);
  props.garage = garage;
  // Shop forecourt props: crates, a bench, a newspaper box, a bin.
  // (No bike rack — the old one read as oversized black rings.)
  const forecourt = new THREE.Group();
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa8763e });
  // Crates tucked to the west side of the forecourt and smaller,
  // so they frame the shop door instead of blocking it in the
  // shop shot.
  for (const [cx, cz, cs] of [[-20, 18, 3], [-22, 23, 2.6], [-19, 13, 2.4]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(cs, cs, cs), crateMat);
    crate.position.set(cx, cs / 2, cz);
    forecourt.add(crate);
  }
  const bench = new THREE.Group();
  const benchSeat = box(8, 1, 2.4, 0x6b4a2a);
  benchSeat.position.y = 1.6;
  bench.add(benchSeat);
  const benchBack = box(8, 2.4, 0.8, 0x6b4a2a);
  benchBack.position.set(0, 3, -1);
  bench.add(benchBack);
  bench.position.set(15, 0, 20);
  forecourt.add(bench);
  const newsBox = box(2.4, 3.4, 2, 0x2980b9);
  newsBox.position.set(12, 1.7, 10);
  forecourt.add(newsBox);
  const bin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.2, 3.4, 10),
    new THREE.MeshLambertMaterial({ color: 0x2c3e50 })
  );
  bin.position.set(-15, 1.7, 10);
  forecourt.add(bin);
  forecourt.position.set(SHOP.x, 0, SHOP.z);
  scene.add(forecourt);
  props.forecourt = forecourt;
  // Rooftop billboard above the shop: big readable sign over the front.
  const billboard = new THREE.Group();
  const bbBoard = box(34, 10, 1.5, 0x0d2b3e);
  bbBoard.position.y = 5;
  billboard.add(bbBoard);
  const bbTex = canvasTexture(512, 128, (cg) => {
    cg.fillStyle = '#0d2b3e';
    cg.fillRect(0, 0, 512, 128);
    cg.fillStyle = '#f7d154';
    cg.font = '900 52px Arial, sans-serif';
    cg.textAlign = 'center';
    cg.textBaseline = 'middle';
    cg.fillText('NEON DELTA LA', 256, 52);
    cg.fillStyle = '#1abc9c';
    cg.font = '900 28px Arial, sans-serif';
    cg.fillText('DISTRICT WARS', 256, 100);
  });
  const bbFace = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 8),
    new THREE.MeshLambertMaterial({ map: bbTex })
  );
  bbFace.position.set(0, 5, 0.9);
  billboard.add(bbFace);
  const bbPostA = box(1.5, 8, 1.5, 0x333333);
  bbPostA.position.set(-12, -4, 0);
  billboard.add(bbPostA);
  const bbPostB = box(1.5, 8, 1.5, 0x333333);
  bbPostB.position.set(12, -4, 0);
  billboard.add(bbPostB);
  billboard.position.set(SHOP.x, 24, SHOP.z - 2);
  scene.add(billboard);
  props.billboard = billboard;
  // Trees along the x=-320 road (sidewalk edges, clear of the road).
  props.trees = [];
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
  for (const [tx, tz] of [[-340, -240], [-300, -240], [-340, -300], [-300, -300], [-340, -360], [-300, -360], [-300, -160]]) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 6, 8), trunkMat);
    trunk.position.y = 3;
    tree.add(trunk);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(4.5, 10, 8), leafMat);
    canopy.position.y = 9;
    tree.add(canopy);
    tree.position.set(tx, 0, tz);
    scene.add(tree);
    props.trees.push(tree);
  }

  // Pier stalls: BALLOONS, ARCADE, SNO-CONES, with string lights.
  const stallDefs = [
    { name: 'BALLOONS', color: 0xe74c3c, x: -700, z: 400 },
    { name: 'ARCADE', color: 0x9b59b6, x: -700, z: 440 },
    { name: 'SNO-CONES', color: 0x3498db, x: -700, z: 480 },
  ];
  props.stalls = [];
  for (const s of stallDefs) {
    const g = new THREE.Group();
    const base = box(14, 8, 10, s.color);
    base.position.y = 4;
    g.add(base);
    const roof = box(16, 2, 12, 0xecf0f1);
    roof.position.y = 9;
    g.add(roof);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffd76a, emissive: 0xaa7711 })
    );
    lamp.position.set(0, 11, 0);
    g.add(lamp);
    // Name sign on the east face, readable from the pier camera.
    const signTex = canvasTexture(256, 64, (cg) => {
      cg.fillStyle = '#111111';
      cg.fillRect(0, 0, 256, 64);
      cg.fillStyle = '#ffd76a';
      cg.font = '900 34px Arial, sans-serif';
      cg.textAlign = 'center';
      cg.textBaseline = 'middle';
      cg.fillText(s.name, 128, 34);
    });
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 3.2),
      new THREE.MeshLambertMaterial({ map: signTex })
    );
    sign.rotation.y = Math.PI / 2;
    sign.position.set(7.2, 6, 0);
    g.add(sign);
    g.position.set(s.x, 0, s.z);
    g.userData.name = s.name;
    scene.add(g);
    props.stalls.push(g);
  }
  // String lights over the pier: poles + glowing bulbs.
  props.pierLights = [];
  for (let i = 0; i < 3; i += 1) {
    const z = 395 + i * 40;
    for (let x = -770; x <= -630; x += 14) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 6, 5),
        new THREE.MeshLambertMaterial({ color: 0xffd76a, emissive: 0xcc8811 })
      );
      bulb.position.set(x, 12 - Math.abs(x + 700) * 0.02, z);
      scene.add(bulb);
      props.pierLights.push(bulb);
    }
  }
  const pierLampLight = new THREE.PointLight(0xffd76a, 2.2, 120);
  pierLampLight.position.set(-700, 14, 440);
  scene.add(pierLampLight);
  const pierLampLight2 = new THREE.PointLight(0xffd76a, 1.6, 100);
  pierLampLight2.position.set(-660, 12, 400);
  scene.add(pierLampLight2);
  props.pierLampLight = pierLampLight;
  props.pierLampLight2 = pierLampLight2;
  // Ferris wheel at the west end of the pier + fireworks above it.
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(16, 1.2, 8, 28),
    new THREE.MeshLambertMaterial({ color: 0xecf0f1 })
  );
  wheel.add(rim);
  for (let i = 0; i < 6; i += 1) {
    const spoke = box(30, 0.8, 0.8, 0xf7d154);
    spoke.rotation.z = (i * Math.PI) / 6;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 3, 10),
    new THREE.MeshLambertMaterial({ color: 0xe74c3c })
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  const gondolaColors = [0xe74c3c, 0x3498db, 0xf7d154, 0x2ecc71, 0x9b59b6, 0xe67e22];
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI * 2) / 6;
    const gondola = box(3, 2.4, 2.4, gondolaColors[i % gondolaColors.length]);
    gondola.position.set(Math.cos(a) * 16, Math.sin(a) * 16, 0);
    wheel.add(gondola);
  }
  const wheelLegA = box(2, 20, 2, 0x7f8c8d);
  wheelLegA.position.set(-7, -18, 0);
  wheelLegA.rotation.z = 0.35;
  wheel.add(wheelLegA);
  const wheelLegB = box(2, 20, 2, 0x7f8c8d);
  wheelLegB.position.set(7, -18, 0);
  wheelLegB.rotation.z = -0.35;
  wheel.add(wheelLegB);
  wheel.position.set(-765, 20, 430);
  wheel.rotation.y = Math.PI / 2;
  scene.add(wheel);
  props.ferrisWheel = wheel;
  // Fireworks: bright coloured bursts frozen above the wheel.
  props.fireworks = [];
  const fwColors = [0xff6b9d, 0x7df9ff, 0xf7d154, 0xff9f43, 0xc084fc];
  for (let i = 0; i < 18; i += 1) {
    const fw = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshLambertMaterial({ color: fwColors[i % fwColors.length], emissive: 0x666666 })
    );
    const a = (i / 18) * Math.PI * 2;
    fw.position.set(-762 + Math.cos(a) * (8 + (i % 3) * 4), 44 + Math.sin(a) * 8, 428 + Math.sin(a * 2) * 6);
    scene.add(fw);
    props.fireworks.push(fw);
  }
  // Palm tree on the pier.
  const palm = new THREE.Group();
  const palmTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 9, 8), trunkMat);
  palmTrunk.position.y = 4.5;
  palm.add(palmTrunk);
  for (let i = 0; i < 5; i += 1) {
    const frond = box(7, 0.5, 1.4, 0x27ae60);
    const a = (i * Math.PI * 2) / 5;
    frond.position.set(Math.cos(a) * 3.2, 9.5, Math.sin(a) * 3.2);
    frond.rotation.y = -a;
    frond.rotation.z = 0.5;
    palm.add(frond);
  }
  palm.position.set(-730, 0, 400);
  scene.add(palm);
  props.palm = palm;
  // COTTON CANDY stand on the pier.
  const candy = new THREE.Group();
  const candyBase = box(7, 5, 6, 0xff6b9d);
  candyBase.position.y = 2.5;
  candy.add(candyBase);
  const candyRoof = box(8, 1.5, 7, 0xecf0f1);
  candyRoof.position.y = 6;
  candy.add(candyRoof);
  const candyTex = canvasTexture(256, 64, (cg) => {
    cg.fillStyle = '#7d3c98';
    cg.fillRect(0, 0, 256, 64);
    cg.fillStyle = '#ffffff';
    cg.font = '900 26px Arial, sans-serif';
    cg.textAlign = 'center';
    cg.textBaseline = 'middle';
    cg.fillText('COTTON CANDY', 128, 34);
  });
  const candySign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 1.6),
    new THREE.MeshLambertMaterial({ map: candyTex })
  );
  candySign.rotation.y = Math.PI / 2;
  candySign.position.set(3.6, 4, 0);
  candy.add(candySign);
  candy.position.set(-725, 0, 465);
  scene.add(candy);
  props.candy = candy;
  const pierLampLight4 = new THREE.PointLight(0xffd76a, 1.8, 110);
  pierLampLight4.position.set(-740, 16, 430);
  scene.add(pierLampLight4);
  props.pierLampLight4 = pierLampLight4;

  // Port crane (orange hero) + load + containers + lamps + puddles.
  const crane = new THREE.Group();
  const legA = box(6, 60, 6, 0xe67e22); legA.position.set(-8, 30, 0); crane.add(legA);
  const legB = box(6, 60, 6, 0xe67e22); legB.position.set(8, 30, 0); crane.add(legB);
  const top = box(30, 5, 8, 0xe67e22); top.position.set(0, 62, 0); crane.add(top);
  const jib = box(70, 4, 4, 0xe67e22); jib.position.set(20, 64, 0); crane.add(jib);
  const cable = box(1, 22, 1, 0x222222); cable.position.set(48, 52, 0); crane.add(cable);
  const load = box(10, 8, 8, 0x2980b9); load.position.set(48, 40, 0); crane.add(load);
  crane.position.set(CRANE.x, 0, CRANE.z);
  scene.add(crane);
  props.crane = crane;
  props.containers = [];
  const contColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad];
  const contSpots = [[300, 380], [330, 380], [360, 380], [300, 420], [520, 420], [560, 460], [240, 520], [280, 540], [620, 380], [180, 460], [400, 600], [580, 580], [600, 560]];
  contSpots.forEach(([x, z], i) => {
    const c = box(18, 8, 8, contColors[i % contColors.length]);
    c.position.set(x, 4, z);
    c.rotation.y = (i % 2) * 0.12;
    scene.add(c);
    props.containers.push(c);
  });
  props.portLamps = [];
  for (const [x, z] of [[260, 360], [420, 560], [580, 480], [200, 580]]) {
    const pole = box(1.5, 14, 1.5, 0x333333);
    pole.position.set(x, 7, z);
    scene.add(pole);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffd76a, emissive: 0xaa7711 })
    );
    head.position.set(x, 14.5, z);
    scene.add(head);
    props.portLamps.push(head);
  }
  props.puddles = [];
  for (const [x, z, r] of [[340, 500, 12], [460, 420, 9], [240, 400, 10], [540, 540, 11]]) {
    const p = new THREE.Mesh(
      new THREE.CircleGeometry(r, 20),
      new THREE.MeshLambertMaterial({ color: 0x1a2a3a, transparent: true, opacity: 0.55 })
    );
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.15, z);
    scene.add(p);
    props.puddles.push(p);
  }
  // Freeway bridge across the port background: an elevated deck with
  // pillars, high enough to clear the yard.
  const bridge = new THREE.Group();
  const deck = box(520, 4, 22, 0x5d6d7e);
  deck.position.y = 26;
  bridge.add(deck);
  const rail = box(520, 2, 1.5, 0xf7d154);
  rail.position.set(0, 29, 10);
  bridge.add(rail);
  for (let x = -240; x <= 240; x += 60) {
    const pillar = box(5, 26, 5, 0x5d6d7e);
    pillar.position.set(x, 13, 0);
    bridge.add(pillar);
  }
  bridge.position.set(300, 0, 340);
  scene.add(bridge);
  props.bridge = bridge;
  const pierLampLight3 = new THREE.PointLight(0xffd76a, 1.8, 110);
  pierLampLight3.position.set(-730, 14, 470);
  scene.add(pierLampLight3);
  props.pierLampLight3 = pierLampLight3;

  // Night light discs (28) — warm pools on the ground.
  props.discs = [];
  for (let i = 0; i < 28; i += 1) {
    const d = new THREE.Mesh(
      new THREE.CircleGeometry(7, 16),
      new THREE.MeshLambertMaterial({ color: 0xffd76a, transparent: true, opacity: 0.0 })
    );
    d.rotation.x = -Math.PI / 2;
    d.position.set(-560 + (i % 7) * 180, 0.2, -480 + Math.floor(i / 7) * 260);
    scene.add(d);
    props.discs.push(d);
  }

  // Boat at the Marina south dock.
  // Boat: warm cream hull and a wooden mast so it reads as a boat
  // at dusk instead of a grey box with a black slab.
  const boat = new THREE.Group();
  const hull = box(10, 3, 22, 0xf5e6c8);
  hull.position.y = 1.2;
  boat.add(hull);
  const cabin = box(6, 3, 8, 0x1abc9c);
  cabin.position.set(0, 4, -2);
  boat.add(cabin);
  const mast = box(0.8, 9, 0.8, 0x8b6f47);
  mast.position.set(0, 8, 4);
  boat.add(mast);
  boat.position.set(BOAT.x, 0.4, BOAT.z);
  scene.add(boat);
  props.boat = boat;

  // --- Actors ---
  // Player car (two-tone + light bar is police; player car is turquoise).
  function makeCar(color, withBar) {
    const g = new THREE.Group();
    const body = box(4.4, 1.4, 2.2, color);
    body.position.y = 0.9;
    g.add(body);
    const cab = box(2.4, 1, 2, 0x222831);
    cab.position.set(-0.2, 1.9, 0);
    g.add(cab);
    const wcol = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[-1.5, -1.1], [1.5, -1.1], [-1.5, 1.1], [1.5, 1.1]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), wcol);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.55, wz);
      g.add(wh);
    }
    if (withBar) {
      const bar = box(1.6, 0.5, 2.3, 0xcc2222);
      bar.position.set(-0.2, 2.6, 0);
      g.add(bar);
    }
    return g;
  }
  // The hero car: red with a turquoise two-tone roof and a rear
  // spoiler, so it reads as a detailed car from the chase camera
  // instead of a plain box. Local +x is the rear.
  const playerCar = makeCar(0xe74c3c, false);
  const roof = box(2.0, 0.15, 1.6, 0x1abc9c);
  roof.position.set(-0.2, 2.85, 0);
  playerCar.add(roof);
  const wing = box(0.4, 0.12, 2.5, 0x1a1a2e);
  wing.position.set(1.95, 2.05, 0);
  playerCar.add(wing);
  for (const dz of [-0.7, 0.7]) {
    const strut = box(0.15, 0.4, 0.15, 0x1a1a2e);
    strut.position.set(1.9, 1.8, dz);
    playerCar.add(strut);
  }
  scene.add(playerCar);
  // Mara on foot.
  const mara = new THREE.Group();
  const mBody = box(0.9, 1.1, 0.5, MARA.jacket);
  mBody.position.y = 1.05;
  mara.add(mBody);
  const mHead = box(0.5, 0.5, 0.5, 0xe0ac69);
  mHead.position.y = 1.9;
  mara.add(mHead);
  const mLegs = box(0.8, 0.8, 0.45, MARA.pants);
  mLegs.position.y = 0.4;
  mara.add(mLegs);
  scene.add(mara);
  // Traffic cars pool (22).
  const trafficMeshes = [];
  for (let i = 0; i < 22; i += 1) {
    const m = makeCar([0x2e86c1, 0xf4c20d, 0x7f8c8d, 0xe74c3c, 0xecf0f1][i % 5], false);
    scene.add(m);
    trafficMeshes.push(m);
  }
  // Pedestrian pool (104): body + head each.
  const pedMeshes = [];
  for (let i = 0; i < 104; i += 1) {
    const g = new THREE.Group();
    const b = box(0.7, 1, 0.4, 0x3498db);
    b.position.y = 0.9;
    g.add(b);
    const h = box(0.4, 0.4, 0.4, 0xe0ac69);
    h.position.y = 1.6;
    g.add(h);
    scene.add(g);
    pedMeshes.push(g);
  }
  // Police pool (12) + SWAT van.
  const policeMeshes = [];
  for (let i = 0; i < 12; i += 1) {
    const m = makeCar(0x1a1a2e, true);
    scene.add(m);
    policeMeshes.push(m);
  }
  const swatMesh = makeCar(0x111111, false);
  const swatBox = box(5.6, 2.6, 2.4, 0x111111);
  swatBox.position.y = 1.6;
  swatMesh.add(swatBox);
  scene.add(swatMesh);
  // Roadblock barriers (2 units, each barrier + 2 cars handled by pool).
  const roadblocks = [];
  for (let i = 0; i < 2; i += 1) {
    const g = new THREE.Group();
    const bar = box(14, 2.2, 1, 0xe74c3c);
    bar.position.y = 1.1;
    g.add(bar);
    const stripe = box(14, 0.6, 1.1, 0xecf0f1);
    stripe.position.y = 1.1;
    g.add(stripe);
    scene.add(g);
    roadblocks.push(g);
  }
  // Spike strips.
  const spikeMeshes = [];
  for (let i = 0; i < 6; i += 1) {
    const s = box(3, 0.4, 1.2, 0x888888);
    s.visible = false;
    scene.add(s);
    spikeMeshes.push(s);
  }
  // Helicopter + spotlight beam (narrow at heli, widening down).
  const heli = new THREE.Group();
  const hBody = box(6, 2.4, 2.6, 0x1a1a2e);
  heli.add(hBody);
  const hTail = box(5, 1, 1, 0x1a1a2e);
  hTail.position.set(-5, 0.4, 0);
  heli.add(hTail);
  const rotor = box(11, 0.3, 1.2, 0x222222);
  rotor.position.y = 1.8;
  heli.add(rotor);
  heli.userData.rotor = rotor;
  scene.add(heli);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 55, 16, 1, true), beamMat);
  scene.add(beam);
  // Mission marker (floating diamond).
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(3),
    new THREE.MeshLambertMaterial({ color: 0xf7d154, emissive: 0xaa8800 })
  );
  scene.add(marker);
  // Race checkpoints + tape pickups.
  const raceMarkers = [];
  for (let i = 0; i < 5; i += 1) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.5, 8, 20),
      new THREE.MeshLambertMaterial({ color: 0x2ecc71, emissive: 0x0a5518 })
    );
    r.rotation.x = Math.PI / 2;
    r.visible = false;
    scene.add(r);
    raceMarkers.push(r);
  }
  const tapeMeshes = [];
  for (let i = 0; i < 20; i += 1) {
    const t = box(1.6, 1, 0.3, 0xf39c12);
    t.visible = false;
    scene.add(t);
    tapeMeshes.push(t);
  }

  return {
    renderer, scene, camera, ambient, sun, cloudMat, clouds,
    props, playerCar, mara, trafficMeshes, pedMeshes, policeMeshes, skyTex,
    swatMesh, roadblocks, spikeMeshes, heli, beam, marker,
    raceMarkers, tapeMeshes,
  };
}

export function syncScene(s, world, traffic, police, hour) {
  const phase = phaseFor(hour);
  s.scene.background = s.skyTex[phase] || s.skyTex.day;
  // Fog follows the phase: warm haze at dusk, dark at night (the old
  // fixed pale-blue fog washed the night deck and the dusk yard grey).
  s.scene.fog.color.setHex(phase === 'day' ? 0x9fc8d8 : phase === 'dusk' ? 0xd88a5a : 0x0d1b2e);
  const dayF = phase === 'day' ? 1 : phase === 'dusk' ? 0.55 : 0.25;
  s.ambient.intensity = phase === 'night' ? 0.75 : 0.35 + dayF * 0.55;
  s.sun.intensity = phase === 'night' ? 0.3 : dayF * 1.1;
  s.cloudMat.opacity = phase === 'night' ? 0.25 : 0.9;
  for (const d of s.props.discs) d.material.opacity = phase === 'night' ? 0.5 : 0;
  s.props.pierLampLight.intensity = phase === 'night' ? 2.2 : 0.2;
  s.props.pierLampLight2.intensity = phase === 'night' ? 1.6 : 0.15;
  if (s.props.pierLampLight3) s.props.pierLampLight3.intensity = phase === 'night' ? 1.8 : 0.15;
  if (s.props.pierLampLight4) s.props.pierLampLight4.intensity = phase === 'night' ? 1.8 : 0.15;

  // Player car / Mara. In shot 4 both read at once (Mara on foot in
  // the foreground, the hero car side-on behind her), and both are
  // staged larger so they fill the frame.
  const car = world.car;
  s.playerCar.position.set(car.x, 0, car.z);
  s.playerCar.rotation.y = -car.angle + Math.PI / 2;
  s.playerCar.visible = (!world.player.onFoot || world.shotMode === 4) && !world.boat.boarded;
  s.playerCar.scale.setScalar(world.shotMode === 4 ? 1.8 : 1);
  s.mara.position.set(world.player.x, 0, world.player.z);
  s.mara.rotation.y = -world.player.angle + Math.PI / 2;
  s.mara.visible = world.player.onFoot || world.shotMode === 4;
  s.mara.scale.setScalar(world.shotMode === 4 ? 2 : 1);

  // Traffic.
  for (let i = 0; i < s.trafficMeshes.length; i += 1) {
    const m = s.trafficMeshes[i];
    const c = traffic.cars[i];
    if (!c) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(c.x, 0, c.z);
    m.rotation.y = -c.angle + Math.PI / 2;
  }
  // Pedestrians.
  for (let i = 0; i < s.pedMeshes.length; i += 1) {
    const m = s.pedMeshes[i];
    const p = traffic.peds[i];
    if (!p) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(p.x, 0, p.z);
    m.rotation.y = -p.angle + Math.PI / 2;
    m.children[0].material.color.setHex(p.shirt || 0x3498db);
    m.children[1].material.color.setHex(p.skin || 0xe0ac69);
  }
  // Police.
  for (let i = 0; i < s.policeMeshes.length; i += 1) {
    const m = s.policeMeshes[i];
    const c = police.cars[i];
    if (!c) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(c.x, 0, c.z);
    m.rotation.y = -c.angle + Math.PI / 2;
  }
  if (police.swat) {
    s.swatMesh.visible = true;
    s.swatMesh.position.set(police.swat.x, 0, police.swat.z);
    s.swatMesh.rotation.y = -police.swat.angle + Math.PI / 2;
  } else {
    s.swatMesh.visible = false;
  }
  // Roadblocks.
  for (let i = 0; i < s.roadblocks.length; i += 1) {
    const r = police.roadblocks[i];
    const m = s.roadblocks[i];
    if (!r) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(r.x, 0, r.z);
    m.rotation.y = -r.angle;
  }
  // Spikes.
  for (let i = 0; i < s.spikeMeshes.length; i += 1) {
    const sp = world.wanted.spikes[i];
    const m = s.spikeMeshes[i];
    if (!sp) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(sp.x, 0.3, sp.z);
  }
  // Heli + beam.
  if (police.heli) {
    s.heli.visible = true;
    s.heli.position.set(police.heli.x, police.heli.y, police.heli.z);
    s.heli.userData.rotor.rotation.y += 0.6;
    s.beam.visible = true;
    const hx = police.heli.x; const hy = police.heli.y; const hz = police.heli.z;
    const tx = car.x; const tz = car.z;
    const mx = (hx + tx) / 2; const mz = (hz + tz) / 2;
    const len = Math.sqrt((hx - tx) * (hx - tx) + hy * hy + (hz - tz) * (hz - tz));
    s.beam.position.set(mx, hy / 2, mz);
    s.beam.scale.set(1, len / 55, 1);
    const dir = new THREE.Vector3(tx - hx, -hy, tz - hz).normalize();
    s.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  } else {
    s.heli.visible = false;
    s.beam.visible = false;
  }
  // Boat. In shot 4 it is staged larger so it reads clearly as a
  // boat (hull + cabin + mast) instead of a small box on a dock.
  s.props.boat.position.set(world.boat.x, 0.4, world.boat.z);
  s.props.boat.rotation.y = -world.boat.angle + Math.PI / 2;
  s.props.boat.scale.setScalar(world.shotMode === 4 ? 1.2 : 1);
  // Mission marker.
  const curMission = world.missions ? missionById(world.missions.current) : null;
  const obj = curMission ? curMission.points : null;
  if (obj && world.missions.objective < obj.length) {
    const p = obj[world.missions.objective];
    s.marker.visible = true;
    s.marker.position.set(p.x, 8 + Math.sin(world.time * 2) * 1.2, p.z);
    s.marker.rotation.y += 0.05;
  } else {
    s.marker.visible = false;
  }
  // Race checkpoints.
  for (let i = 0; i < s.raceMarkers.length; i += 1) {
    const cp = world.race.checkpoints[i];
    const m = s.raceMarkers[i];
    if (!world.race.active || !cp || i < world.race.next) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(cp.x, 3, cp.z);
  }
  // Tapes.
  const spots = tapeSpots();
  for (let i = 0; i < s.tapeMeshes.length; i += 1) {
    const m = s.tapeMeshes[i];
    const sp = spots[i];
    if (!sp) { m.visible = false; continue; }
    m.position.set(sp.x, 1.2, sp.z);
    m.rotation.y += 0.03;
    m.visible = !world.tapes.found.includes(i);
  }
}
