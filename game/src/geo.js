// Geometry helpers + procedural canvas textures. No external assets: every
// texture is drawn at runtime. Merged static geometry = few draw calls.
import * as THREE from '../vendor/three.module.min.js';
import { WORLD } from './config.js';

// One merged BufferGeometry from items [{geo, matrix, color}].
// Adds a per-vertex color attribute; materials use vertexColors: true.
export function mergeItems(items) {
  const pos = [], nor = [], uv = [], col = [];
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (const it of items) {
    const g = it.geo.index ? it.geo.toNonIndexed() : it.geo;
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    const m = it.matrix || new THREE.Matrix4();
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    c.set(it.color === undefined ? 0xffffff : it.color);
    const us = it.uvScale || [1, 1];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
      pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      nor.push(v.x, v.y, v.z);
      uv.push(u ? u.getX(i) * us[0] : 0, u ? u.getY(i) * us[1] : 0);
      col.push(c.r, c.g, c.b);
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

// A box item for merging: position + optional rotation + color.
export function boxItem(w, h, d, x, y, z, color, ry = 0, rx = 0, rz = 0) {
  const m = new THREE.Matrix4();
  const e = new THREE.Euler(rx, ry, rz);
  m.makeRotationFromEuler(e);
  m.setPosition(x, y, z);
  return { geo: new THREE.BoxGeometry(w, h, d), matrix: m, color };
}
export function cylItem(rt, rb, h, x, y, z, color, seg = 10, ry = 0) {
  const m = new THREE.Matrix4().makeRotationY(ry);
  m.setPosition(x, y, z);
  return { geo: new THREE.CylinderGeometry(rt, rb, h, seg), matrix: m, color };
}

function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8; // sharpens textures seen at grazing angles (roads from the chase cam)
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Window-grid facade: light gray walls, dark windows, some lit warm.
export function windowTexture(tint) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = tint; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 16) {
      for (let x = 8; x < w - 8; x += 16) {
        const lit = Math.random() < 0.22;
        g.fillStyle = lit ? '#ffd98a' : '#1d2733';
        g.fillRect(x, y, 10, 11);
      }
    }
  });
}

// The whole ground as one painted canvas: grass, beach, water edge, roads with
// markings, sidewalks, crosswalks, canal water, port concrete.
export function groundTexture() {
  const S = 4096, W = WORLD.HALF * 2; // 4096px over the 1600-unit map keeps road markings sharp at close range
  const px = (x) => ((x + WORLD.HALF) / W) * S;
  const pz = (z) => ((z + WORLD.HALF) / W) * S;
  return canvasTex(S, S, (g) => {
    g.fillStyle = '#8aa86b'; g.fillRect(0, 0, S, S); // grass base
    // port concrete
    g.fillStyle = '#9a9a92'; g.fillRect(px(340), pz(340), px(720) - px(340), pz(720) - pz(340));
    // port yard detail: concrete panel seams every 40u, oil stains, and
    // painted yellow container-slot outlines in the yard lanes, so the
    // terminal floor reads as worked ground instead of flat gray.
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 2;
    for (let x = 340; x <= 720; x += 40) { g.beginPath(); g.moveTo(px(x), pz(340)); g.lineTo(px(x), pz(720)); g.stroke(); }
    for (let z = 340; z <= 720; z += 40) { g.beginPath(); g.moveTo(px(340), pz(z)); g.lineTo(px(720), pz(z)); g.stroke(); }
    g.fillStyle = 'rgba(52,52,46,0.28)';
    for (const [sx, sz, sw, sh] of [[380, 420, 70, 26], [520, 640, 90, 30], [640, 380, 50, 22], [430, 560, 60, 24], [660, 600, 46, 20]]) {
      g.fillRect(px(sx), pz(sz), px(sx + sw) - px(sx), pz(sz + sh) - pz(sz));
    }
    g.strokeStyle = 'rgba(247,201,72,0.85)'; g.lineWidth = 3;
    for (const [sx, sz] of [[654, 438.7], [654, 478.7], [654, 518.7], [654, 558.7], [434, 658.7], [474, 658.7], [514, 658.7], [554, 658.7]]) {
      g.strokeRect(px(sx), pz(sz), px(sx + 12) - px(sx), pz(sz + 2.6) - pz(sz));
    }
    // canal water (Venice Canals district)
    g.fillStyle = '#2f7fa8';
    g.fillRect(px(-660), pz(420), px(-120) - px(-660), 26);
    g.fillRect(px(-660), pz(560), px(-120) - px(-660), 26);
    // ocean + beach (west edge)
    g.fillStyle = '#1e6f9e'; g.fillRect(0, 0, px(-720), S);
    g.fillStyle = '#e8cf9a'; g.fillRect(px(-720), 0, px(-660) - px(-720), S);
    // sidewalk base around every road
    const rw = WORLD.ROAD_W + WORLD.WALK_W * 2;
    g.fillStyle = '#b8a88f';
    for (const x of WORLD.AVENUES) g.fillRect(px(x - rw / 2), 0, px(x + rw / 2) - px(x - rw / 2), S);
    for (const z of WORLD.STREETS) g.fillRect(0, pz(z - rw / 2), S, pz(z + rw / 2) - pz(z - rw / 2));
    // asphalt
    g.fillStyle = '#3a3a40';
    for (const x of WORLD.AVENUES) g.fillRect(px(x - WORLD.ROAD_W / 2), 0, px(x + WORLD.ROAD_W / 2) - px(x - WORLD.ROAD_W / 2), S);
    for (const z of WORLD.STREETS) g.fillRect(0, pz(z - WORLD.ROAD_W / 2), S, pz(z + WORLD.ROAD_W / 2) - pz(z - WORLD.ROAD_W / 2));
    // center dashes (yellow) + edge lines (white)
    g.fillStyle = '#f7c948';
    for (const x of WORLD.AVENUES) for (let z = -800; z < 800; z += 24) g.fillRect(px(x) - 2, pz(z), 4, 12);
    for (const z of WORLD.STREETS) for (let x = -800; x < 800; x += 24) g.fillRect(px(x), pz(z) - 2, 12, 4);
    g.fillStyle = '#e8e8e8';
    for (const x of WORLD.AVENUES) {
      g.fillRect(px(x - WORLD.ROAD_W / 2 + 2), 0, 3, S);
      g.fillRect(px(x + WORLD.ROAD_W / 2 - 5), 0, 3, S);
    }
    for (const z of WORLD.STREETS) {
      g.fillRect(0, pz(z - WORLD.ROAD_W / 2 + 2), S, 3);
      g.fillRect(0, pz(z + WORLD.ROAD_W / 2 - 5), S, 3);
    }
    // crosswalks at every intersection
    g.fillStyle = '#f2f2f2';
    for (const x of WORLD.AVENUES) for (const z of WORLD.STREETS) {
      for (let i = -4; i <= 4; i++) {
        g.fillRect(px(x + i * 4) - 2, pz(z - WORLD.ROAD_W / 2 - 4), 4, 8);
        g.fillRect(px(x + i * 4) - 2, pz(z + WORLD.ROAD_W / 2 - 4), 4, 8);
        g.fillRect(px(x - WORLD.ROAD_W / 2 - 4), pz(z + i * 4) - 2, 8, 4);
        g.fillRect(px(x + WORLD.ROAD_W / 2 - 4), pz(z + i * 4) - 2, 8, 4);
      }
    }
  });
}

// Text sign texture: lines of text on a colored panel.
export function signTexture(lines, opt = {}) {
  const bg = opt.bg || '#12233d', fg = opt.fg || '#ffd98a', sub = opt.sub || '#ffffff';
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = fg; g.font = 'bold 64px Arial';
    g.fillText(lines[0] || '', w / 2, lines.length > 1 ? h * 0.34 : h / 2);
    if (lines[1]) { g.fillStyle = sub; g.font = 'bold 34px Arial'; g.fillText(lines[1], w / 2, h * 0.68); }
    if (lines[2]) { g.fillStyle = sub; g.font = '28px Arial'; g.fillText(lines[2], w / 2, h * 0.86); }
  });
}

// Police door: white panel, star + "NDPD" + "NEON DELTA POLICE".
export function policeDoorTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#12233d'; g.font = 'bold 52px Arial'; g.textAlign = 'center';
    g.fillText('NDPD', w / 2, h * 0.42);
    g.font = 'bold 20px Arial'; g.fillText('NEON DELTA POLICE', w / 2, h * 0.74);
    g.fillStyle = '#c8a028';
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      const x = 26 + Math.cos(a) * 14, y = 26 + Math.sin(a) * 14;
      g[i === 0 ? 'moveTo' : 'lineTo'](x, y);
    }
    g.closePath(); g.fill();
  });
}
