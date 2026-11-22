// Renderer, camera, sky dome, sun and moon, and the day/night lighting.
// The sky is a gradient dome whose colours follow the hour: bright blue by
// day, deep orange at dusk, near-black at night.

import * as THREE from '../vendor/three.module.min.js';

const DAY = {
  top: new THREE.Color(0x2a6db0),
  horizon: new THREE.Color(0x9fd4e8),
  sun: new THREE.Color(0xfff2d8),
  sunI: 1.7,
  hemi: 0.9,
  fog: new THREE.Color(0xa8c8d8),
};
const DUSK = {
  top: new THREE.Color(0x3a2a5a),
  horizon: new THREE.Color(0xff7a3c),
  sun: new THREE.Color(0xff9a4d),
  sunI: 0.8,
  hemi: 0.45,
  fog: new THREE.Color(0xc47a4d),
};
const NIGHT = {
  top: new THREE.Color(0x05081a),
  horizon: new THREE.Color(0x1a2340),
  sun: new THREE.Color(0x8aa0ff),
  sunI: 0.3,
  hemi: 0.22,
  fog: new THREE.Color(0x0d1426),
};

function lerpSet(a, b, t) {
  return {
    top: a.top.clone().lerp(b.top, t),
    horizon: a.horizon.clone().lerp(b.horizon, t),
    sun: a.sun.clone().lerp(b.sun, t),
    sunI: a.sunI + (b.sunI - a.sunI) * t,
    hemi: a.hemi + (b.hemi - a.hemi) * t,
    fog: a.fog.clone().lerp(b.fog, t),
  };
}

function paletteFor(night) {
  if (night < 0.5) return lerpSet(DAY, DUSK, night * 2);
  return lerpSet(DUSK, NIGHT, (night - 0.5) * 2);
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  // Fixed 1280x720 drawing buffer: the software renderer used for
  // screenshots is fragment-bound, and this is the single biggest lever on
  // frame time. The canvas element still fills the window (CSS), so the
  // image upscales to the display size; the submits are 1280x720 anyway.
  renderer.setPixelRatio(1);
  renderer.setSize(1280, 720, false);
  // Shadows are off: the software renderer used for screenshots pays for
  // every shadow-casting mesh twice, and the city reads fine without them.
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xa8c8d8, 220, 1300);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 8, -14);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2a6db0) },
      horizonColor: { value: new THREE.Color(0x9fd4e8) },
      offset: { value: 20 },
      exponent: { value: 0.65 },
    },
    vertexShader: [
      'varying vec3 vWorldPosition;',
      'void main() {',
      '  vec4 wp = modelMatrix * vec4(position, 1.0);',
      '  vWorldPosition = wp.xyz;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 topColor;',
      'uniform vec3 horizonColor;',
      'uniform float offset;',
      'uniform float exponent;',
      'varying vec3 vWorldPosition;',
      'void main() {',
      '  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;',
      '  gl_FragColor = vec4(mix(horizonColor, topColor, pow(max(h, 0.0), exponent)), 1.0);',
      '}',
    ].join('\n'),
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), skyMat);
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a4a3a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.7);
  sun.position.set(300, 400, 100);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.far = 1200;
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  // Clouds: flat pale blobs that catch the dusk light.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 });
  const clouds = [];
  const cloudSpots = [[-300, 260, -500], [200, 300, -600], [500, 240, 300], [-500, 280, 400], [0, 320, 500], [650, 260, -200]];
  for (const [cx, cy, cz] of cloudSpots) {
    const group = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(28 + i * 8, 10, 8), cloudMat);
      puff.position.set(i * 30 - 45, (i % 2) * 6, (i % 3) * 12 - 12);
      puff.scale.y = 0.35;
      group.add(puff);
    }
    group.position.set(cx, cy, cz);
    scene.add(group);
    clouds.push(group);
  }

  return { renderer, scene, camera, skyMat, hemi, sun, ambient, clouds, cloudMat };
}

export function updateLighting(env, night, hour) {
  const p = paletteFor(night);
  env.skyMat.uniforms.topColor.value.copy(p.top);
  env.skyMat.uniforms.horizonColor.value.copy(p.horizon);
  env.sun.color.copy(p.sun);
  env.sun.intensity = p.sunI;
  env.hemi.intensity = p.hemi;
  env.scene.fog.color.copy(p.fog);
  // sun swings low at dusk and rises again at dawn
  const dayFrac = ((hour - 6 + 24) % 24) / 12;
  const sunAngle = Math.PI * Math.min(1, Math.max(0, dayFrac));
  const sunHeight = Math.sin(sunAngle) * 420 + 40;
  env.sun.position.set(Math.cos(sunAngle) * 380, sunHeight, 140);
  // all cloud puffs share one material; dim it as night falls
  env.cloudMat.opacity = 0.85 - night * 0.55;
}

export function resize(env) {
  env.camera.aspect = window.innerWidth / window.innerHeight;
  env.camera.updateProjectionMatrix();
  // the drawing buffer stays at a fixed 1280x720; only the aspect follows
  // the window, and the canvas element fills it via CSS.
}
