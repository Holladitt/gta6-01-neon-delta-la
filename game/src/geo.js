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
    // port concrete: darker asphalt so the yard reads from the avenue
    g.fillStyle = '#6f6f68'; g.fillRect(px(340), pz(340), px(720) - px(340), pz(720) - pz(340));
    // Wide dark border band around the whole yard.
    g.strokeStyle = 'rgba(20,20,16,0.55)'; g.lineWidth = 14;
    g.strokeRect(px(340) + 7, pz(340) + 7, px(720) - px(340) - 14, pz(720) - pz(340) - 14);
    // Thick white yard lanes every 20u + a painted coral center block.
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6;
    for (let x = 360; x <= 700; x += 20) { g.beginPath(); g.moveTo(px(x), pz(340)); g.lineTo(px(x), pz(720)); g.stroke(); }
    for (let z = 360; z <= 700; z += 20) { g.beginPath(); g.moveTo(px(340), pz(z)); g.lineTo(px(720), pz(z)); g.stroke(); }
    g.fillStyle = 'rgba(255,46,77,0.20)';
    g.fillRect(px(460), pz(460), px(620) - px(460), pz(620) - pz(460));
    g.strokeStyle = 'rgba(255,46,77,0.75)'; g.lineWidth = 6;
    g.strokeRect(px(460), pz(460), px(620) - px(460), pz(620) - pz(460));
    // Painted container bays across the central apron: thick yellow outline
    // with a dark interior, so each bay reads from the avenue.
    g.strokeStyle = '#f7c948'; g.lineWidth = 9;
    for (let x = 400; x <= 600; x += 40) {
      for (let z = 400; z <= 600; z += 40) {
        g.fillStyle = 'rgba(0,0,0,0.14)';
        g.fillRect(px(x), pz(z), px(x + 32) - px(x), pz(z + 28) - pz(z));
        g.strokeRect(px(x), pz(z), px(x + 32) - px(x), pz(z + 28) - pz(z));
      }
    }
    // Yellow underlay under each real stack bay (12 x 2.6 footprint) with a
    // dark top, so a yellow painted border frames every stack.
    for (const [sx, sz] of [[654, 438.7], [654, 478.7], [654, 518.7], [654, 558.7], [434, 658.7], [474, 658.7], [514, 658.7], [554, 658.7]]) {
      g.fillStyle = '#f7c948';
      g.fillRect(px(sx - 0.8), pz(sz - 0.8), px(sx + 12.8) - px(sx - 0.8), pz(sz + 3.4) - pz(sz - 0.8));
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(px(sx), pz(sz), px(sx + 12) - px(sx), pz(sz + 2.6) - pz(sz));
    }
    // Big oil stains + a hazard chevron band along the yard entrance.
    g.fillStyle = 'rgba(52,52,46,0.42)';
    for (const [sx, sz, sw, sh] of [[380, 420, 70, 26], [520, 640, 90, 30], [640, 380, 50, 22], [430, 560, 60, 24], [660, 600, 46, 20], [400, 660, 80, 28], [580, 420, 60, 26]]) {
      g.fillRect(px(sx), pz(sz), px(sx + sw) - px(sx), pz(sz + sh) - pz(sz));
    }
    for (let i = 0; i < 24; i++) {
      g.fillStyle = i % 2 ? '#f7c948' : '#22221e';
      g.save(); g.translate(px(340 + i * 16), pz(706)); g.rotate(Math.PI / 4);
      g.fillRect(0, 0, px(11) - px(0), px(11) - px(0)); g.restore();
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
