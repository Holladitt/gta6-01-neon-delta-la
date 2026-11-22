// Scene: renderer, sky gradient, sun cycle (day -> golden hour -> dusk),
// third-person camera rig with building collision + FOV kick.
import * as THREE from '../vendor/three.module.min.js';
import { groundY } from './world.js';

function skyColors(hour) {
  if (hour < 16) return { top: '#3f7fd0', mid: '#7fb8e8', hor: '#cfe8f5', fog: 0xcfe0ea, sun: 0xfff2d8, sunI: 1.9, hemiI: 0.9 };
  if (hour < 17.5) return { top: '#4a4a8a', mid: '#ff9a3d', hor: '#ffb347', fog: 0xf0a060, sun: 0xffa040, sunI: 1.9, hemiI: 0.65 };
  if (hour < 19) return { top: '#1e1e40', mid: '#c2453a', hor: '#ff7a3d', fog: 0xd07060, sun: 0xff7e5f, sunI: 1.3, hemiI: 0.5 }; // v15: deeper dusk (was #2a2a4a/#d65a4a/#ff8a5f — flat salmon band in shot 4)
  return { top: '#0a0a1a', mid: '#1a1a3a', hor: '#2a2a4a', fog: 0x1a1a2a, sun: 0x8090ff, sunI: 0.7, hemiI: 0.35 };
}

export class SceneRig {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcfe0ea, 280, 1150); // thin distance haze for depth
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3000);
    // sky dome with painted gradient
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4; this.skyCanvas.height = 256;
    this.skyTex = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(2200, 16, 12),
      new THREE.MeshBasicMaterial({ map: this.skyTex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);
    this.skyMesh = sky;
    // sun + hemisphere
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.9);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 0.9);
    this.scene.add(this.hemi);
    // visible sun disc + warm halo (golden hour / dusk only) — the sun sets
    // over the ocean, so it sits in the pier shot's frame
    this.sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(55, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, fog: false, transparent: true, opacity: 0 })
    );
    this.sunHalo = new THREE.Mesh(
      new THREE.CircleGeometry(130, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb347, fog: false, transparent: true, opacity: 0 })
    );
    this.scene.add(this.sunDisc);
    this.scene.add(this.sunHalo);
    // moon disc + halo (night band only; opacity set in setTimeOfDay)
    this.moonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(34, 24),
      new THREE.MeshBasicMaterial({ color: 0xe8ecf5, fog: false, transparent: true, opacity: 0 })
    );
    this.moonHalo = new THREE.Mesh(
      new THREE.CircleGeometry(80, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fb4d8, fog: false, transparent: true, opacity: 0 })
    );
    this.scene.add(this.moonDisc);
    this.scene.add(this.moonHalo);
    // v15: sparse clouds — three puffy groups of flattened discs that follow
    // the camera like the sun/moon, so they sit in the sky band of every shot
    // (day/golden/dusk); hidden at night. Breaks up the flat gradient sky,
    // most visibly in the port shot where the top of frame was empty salmon.
    this.clouds = [];
    const cloudDirs = [
      new THREE.Vector3(1, 0.36, 0.2).normalize(),   // east — in frame in the port shot
      new THREE.Vector3(0.7, 0.42, 0.7).normalize(), // south-east — near centre in the port shot
      new THREE.Vector3(0.1, 0.38, 1).normalize(),   // south — right side in the port shot
    ];
    const cloudRadii = [70, 55, 45];
    const cloudPuffs = [[0, 0, 0, 1.6], [-55, -8, 0, 1.2], [55, -10, 0, 1.1]];
    for (const dir of cloudDirs) {
      const g = new THREE.Group();
      const mats = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.CircleGeometry(cloudRadii[i], 20), m);
        mesh.position.set(cloudPuffs[i][0], cloudPuffs[i][1], cloudPuffs[i][2]);
        mesh.scale.set(cloudPuffs[i][3], cloudPuffs[i][3] * 0.5, 1);
        g.add(mesh);
        mats.push(m);
      }
      g.userData.dir = dir;
      this.scene.add(g);
      this.clouds.push({ group: g, mats });
    }
    this.moonDir = null;
    this.lastBand = -1;
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    // camera rig state: low chase angle so cars read as cars, not roof boxes,
    // with the road ahead in frame instead of empty foreground asphalt.
    this.yaw = 0; this.pitch = 0.20; this.dist = 8; this.fov = 62;
  }
  setTimeOfDay(hour) {
    const band = hour < 16 ? 0 : hour < 17.5 ? 1 : hour < 19 ? 2 : 3;
    if (band === this.lastBand) return;
    this.lastBand = band;
    const c = skyColors(hour);
    const ctx = this.skyCanvas.getContext('2d');
    const gr = ctx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, c.top); gr.addColorStop(0.55, c.mid); gr.addColorStop(0.8, c.hor); gr.addColorStop(1, c.hor);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 4, 256);
    this.skyTex.needsUpdate = true;
    this.scene.fog.color.set(c.fog);
    this.sun.color.set(c.sun); this.sun.intensity = c.sunI;
    this.hemi.intensity = c.hemiI;
    // sun position: arcs east -> west through the day, lower at golden hour
    // so the light rakes long across the streets
    const a = ((hour - 6) / 12) * Math.PI;
    this.sun.position.set(Math.cos(a) * 600, Math.sin(a) * 420 + 40, 300);
    this.sun.target.position.set(0, 0, 0);
    // sun disc + halo track the light direction, far out over the ocean
    const discOp = band === 1 ? 0.95 : band === 2 ? 0.7 : 0;
    const dir = this.sun.position.clone().normalize();
    this.sunDir = dir.clone();
    const discPos = dir.multiplyScalar(1900);
    discPos.y = Math.max(discPos.y, 60);
    this.sunDisc.position.copy(discPos);
    this.sunDisc.lookAt(this.camera.position);
    this.sunDisc.material.opacity = discOp;
    this.sunHalo.position.copy(discPos);
    this.sunHalo.lookAt(this.camera.position);
    this.sunHalo.material.opacity = discOp * 0.3;
    // moon: only at night (band 3), high in the east — the night sky needs
    // its own light in the frame, not just a darker sun.
    const moonOn = band === 3;
    this.moonDisc.material.opacity = moonOn ? 0.95 : 0;
    this.moonHalo.material.opacity = moonOn ? 0.25 : 0;
    if (moonOn) {
      // fixed east-high direction; updateCamera re-anchors it to the camera
      this.moonDir = new THREE.Vector3(0.55, 0.62, -0.55).normalize();
    }
    // v15 clouds: white by day, warm cream at golden hour, pink-orange at
    // dusk, hidden at night — tinted per band like the sun disc.
    const cloudStyle = band === 0 ? [0xffffff, 0.45] : band === 1 ? [0xffd9a0, 0.5] : band === 2 ? [0xff9a7a, 0.55] : [0xffffff, 0];
    for (const c of this.clouds) for (const m of c.mats) { m.color.setHex(cloudStyle[0]); m.opacity = cloudStyle[1]; }
  }
  // Third-person camera: mouse orbit, collision pulls the camera in.
  updateCamera(dt, tx, ty, tz, heading, speed01, inCar, colliders) {
    const targetDist = inCar ? 8.2 : 7.2;
    const targetFov = 62 + speed01 * 10;
    this.dist += (targetDist - this.dist) * Math.min(1, 5 * dt);
    this.fov += (targetFov - this.fov) * Math.min(1, 4 * dt);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    let dist = this.dist;
    // pull in while inside a building AABB
    for (let attempt = 0; attempt < 8; attempt++) {
      const cx = tx - sy * cp * dist;
      const cz = tz - cy * cp * dist;
      const cyv = ty + sp * dist;
      let inside = false;
      for (const c of colliders) {
        if (cx > c.x0 - 0.5 && cx < c.x1 + 0.5 && cz > c.z0 - 0.5 && cz < c.z1 + 0.5 && cyv < (c.h || 30) + 1) { inside = true; break; }
      }
      if (!inside || dist < 2.5) { break; }
      dist *= 0.75;
    }
    const cx = tx - sy * cp * dist;
    const cz = tz - cy * cp * dist;
    const cyv = Math.max(ty + sp * dist, groundY(cx, cz) + 0.8);
    this.camera.position.set(cx, cyv, cz);
    this.camera.lookAt(tx, ty + 1.2, tz);
    this.skyMesh.position.set(cx, 0, cz);
    // sun disc follows the camera so it stays on the horizon in the right
    // direction wherever the player drives
    if (this.sunDir) {
      const dp = this.camera.position.clone().addScaledVector(this.sunDir, 1900);
      dp.y = Math.max(dp.y, 60);
      this.sunDisc.position.copy(dp);
      this.sunHalo.position.copy(dp);
      this.sunDisc.lookAt(this.camera.position);
      this.sunHalo.lookAt(this.camera.position);
    }
    // moon disc follows the camera the same way (night only)
    if (this.moonDir) {
      const mp = this.camera.position.clone().addScaledVector(this.moonDir, 1900);
      mp.y = Math.max(mp.y, 120);
      this.moonDisc.position.copy(mp);
      this.moonHalo.position.copy(mp);
      this.moonDisc.lookAt(this.camera.position);
      this.moonHalo.lookAt(this.camera.position);
    }
    // v15 clouds follow the camera the same way (1900 out, inside the sky dome)
    for (const c of this.clouds) {
      const cp = this.camera.position.clone().addScaledVector(c.group.userData.dir, 1800);
      cp.y = Math.max(cp.y, 120);
      c.group.position.copy(cp);
      c.group.lookAt(this.camera.position);
    }
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
