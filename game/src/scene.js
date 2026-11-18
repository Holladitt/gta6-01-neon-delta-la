// Scene: renderer, sky gradient, sun cycle (day -> golden hour -> dusk),
// third-person camera rig with building collision + FOV kick.
import * as THREE from '../vendor/three.module.min.js';
import { groundY } from './world.js';

function skyColors(hour) {
  if (hour < 16) return { top: '#3f7fd0', mid: '#7fb8e8', hor: '#cfe8f5', fog: 0xcfe0ea, sun: 0xfff2d8, sunI: 1.9, hemiI: 0.9 };
  if (hour < 17.5) return { top: '#3a5a9a', mid: '#e88a4a', hor: '#ffc53d', fog: 0xf0b070, sun: 0xffb060, sunI: 1.7, hemiI: 0.7 };
  if (hour < 19) return { top: '#2a2a4a', mid: '#c65a6a', hor: '#ff7e5f', fog: 0xd07060, sun: 0xff7e5f, sunI: 1.2, hemiI: 0.5 };
  return { top: '#0a0a1a', mid: '#1a1a3a', hor: '#2a2a4a', fog: 0x1a1a2a, sun: 0x8090ff, sunI: 0.7, hemiI: 0.35 };
}

export class SceneRig {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcfe0ea, 320, 1500);
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
    this.lastBand = -1;
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    // camera rig state
    this.yaw = 0; this.pitch = 0.32; this.dist = 9; this.fov = 62;
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
    // sun position: arcs east -> west through the day
    const a = ((hour - 6) / 12) * Math.PI;
    this.sun.position.set(Math.cos(a) * 600, Math.sin(a) * 500 + 80, 300);
    this.sun.target.position.set(0, 0, 0);
  }
  // Third-person camera: mouse orbit, collision pulls the camera in.
  updateCamera(dt, tx, ty, tz, heading, speed01, inCar, colliders) {
    const targetDist = inCar ? 9.5 : 8;
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
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
