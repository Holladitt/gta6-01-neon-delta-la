// Characters: Mara Solano + varied pedestrians. Chunky low-poly humans with
// articulated limbs and walk cycles, readable from behind at chase-cam distance.
import * as THREE from '../vendor/three.module.min.js';
import { pick, range } from './rng.js';

const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa06a3a];
const SHIRTS = [0x2ec4b6, 0xffc53d, 0xff7e5f, 0x7d3c98, 0x2471a3, 0x229954, 0xe8e8e8, 0x333333, 0xd4ac0d];
const PANTS = [0x2c3e50, 0x5d6d7e, 0x7b7b7b, 0x4a3728, 0x1a1a2e];
const HAIRS = [0x1a1a1a, 0x4a2c0a, 0x8a6a42, 0xd4a017, 0x777777, 0x5d4037, 0x2c2c2c, 0xb5651d];

// A limb: group pivoted at its top, box child hanging below.
function limb(w, h, d, color, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.y = -h / 2;
  g.add(m);
  return g;
}

export function buildHuman(opt = {}) {
  const rng = opt.rng || Math.random;
  const skin = opt.skin ?? pick(rng, SKINS);
  const shirt = opt.shirt ?? pick(rng, SHIRTS);
  const pants = opt.pants ?? pick(rng, PANTS);
  const hair = opt.hair ?? pick(rng, HAIRS);
  const bulk = opt.bulk ?? range(rng, 0.85, 1.15);
  const wide = opt.wide ?? range(rng, 0.9, 1.25); // shoulder/hip width — silhouette variety
  const h = (opt.height ?? 1.8) * bulk;
  const s = h / 1.8;
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  // legs (hip pivots)
  const legL = limb(0.24 * s, 0.82 * s, 0.26 * s, pants, -0.15 * s * wide, 0.84 * s, 0);
  const legR = limb(0.24 * s, 0.82 * s, 0.26 * s, pants, 0.15 * s * wide, 0.84 * s, 0);
  // shoes
  for (const [leg, c] of [[legL, opt.shoes ?? 0xdddddd], [legR, opt.shoes ?? 0xdddddd]]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.12 * s, 0.42 * s), mat(c));
    shoe.position.set(0, -0.82 * s, 0.06 * s);
    leg.add(shoe);
  }
  g.add(legL, legR);
  // torso (width scales with build)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66 * s * wide, 0.68 * s, 0.38 * s), mat(shirt));
  torso.position.y = 1.18 * s;
  g.add(torso);
  // chest stripe: a bright band across the jacket, readable from behind
  if (opt.stripe) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s * wide, 0.1 * s, 0.06 * s), mat(opt.stripe));
    stripe.position.set(0, 1.32 * s, 0.2 * s);
    g.add(stripe);
    const stripeBack = stripe.clone();
    stripeBack.position.z = -0.2 * s;
    g.add(stripeBack);
  }
  // arms (shoulder pivots)
  const armL = limb(0.2 * s, 0.66 * s, 0.22 * s, opt.sleeves === false ? skin : shirt, -0.44 * s * wide, 1.46 * s, 0);
  const armR = limb(0.2 * s, 0.66 * s, 0.22 * s, opt.sleeves === false ? skin : shirt, 0.44 * s * wide, 1.46 * s, 0);
  // hands
  for (const arm of [armL, armR]) {
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.16 * s, 0.2 * s), mat(skin));
    hand.position.y = -0.68 * s;
    arm.add(hand);
  }
  g.add(armL, armR);
  // head + hair
  const head = new THREE.Group();
  head.position.y = 1.68 * s;
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36 * s, 0.36 * s, 0.34 * s), mat(skin));
  head.add(skull);
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38 * s, 0.14 * s, 0.36 * s), mat(hair));
  hairTop.position.y = 0.18 * s;
  head.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.38 * s, 0.3 * s, 0.1 * s), mat(hair));
  hairBack.position.set(0, 0.06 * s, -0.18 * s);
  head.add(hairBack);
  g.add(head);
  // accessories
  if (opt.ponytail) {
    const pony = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.55 * s, 0.12 * s), mat(hair));
    pony.position.set(0, -0.1 * s, -0.26 * s);
    head.add(pony);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.08 * s, 0.14 * s), mat(0xff2e4d));
    tie.position.set(0, 0.14 * s, -0.26 * s);
    head.add(tie);
  }
  if (opt.backpack) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.44 * s, 0.5 * s, 0.2 * s), mat(opt.backpack));
    pack.position.set(0, 1.2 * s, -0.3 * s);
    g.add(pack);
  }
  if (opt.cap) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.12 * s, 0.38 * s), mat(opt.cap));
    cap.position.y = 1.9 * s;
    g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.05 * s, 0.2 * s), mat(opt.cap));
    brim.position.set(0, 1.86 * s, 0.26 * s);
    g.add(brim);
  }
  if (opt.bandana) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.38 * s, 0.12 * s, 0.36 * s), mat(opt.bandana));
    band.position.y = 1.82 * s;
    g.add(band);
  }
  if (opt.hood) {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.44 * s, 0.3 * s, 0.42 * s), mat(shirt));
    hood.position.y = 1.78 * s;
    g.add(hood);
  }
  g.scale.setScalar(opt.scale ?? 1);
  return { group: g, parts: { legL, legR, armL, armR, head, torso }, height: h };
}

// Mara Solano: coral jacket (no NPC wears it), white chest stripe, blue
// backpack, ponytail, yellow shoes, tallest in the crowd. Instantly
// recognizable from behind.
export function buildMara() {
  return buildHuman({
    skin: 0xe0ac69, shirt: 0xff2e4d, pants: 0x2c3e50, hair: 0x2c1a0a,
    shoes: 0xffc53d, ponytail: true, backpack: 0x2471a3, scale: 1.12, height: 1.8,
    stripe: 0xf4f4f0, wide: 1.05,
  });
}

export function buildNPC(rng) {
  const acc = rng();
  const opt = {
    rng, bulk: range(rng, 0.85, 1.15), height: range(rng, 1.68, 1.88),
    sleeves: rng() < 0.5 ? false : true,
  };
  if (acc < 0.22) opt.cap = pick(rng, [0xc0392b, 0x2471a3, 0x229954, 0xdddddd]);
  else if (acc < 0.4) opt.bandana = pick(rng, [0xff2e4d, 0x2ec4b6, 0xffc53d]);
  else if (acc < 0.55) opt.hood = true;
  if (rng() < 0.3) opt.backpack = pick(rng, [0x7d3c98, 0x2471a3, 0xd4ac0d, 0x333333]);
  return buildHuman(opt);
}

// Walk / run cycle: big readable limb swings, slight forward lean, bob.
export function animateWalk(parts, phase, amp = 0.85, speed = 1) {
  const sw = Math.sin(phase) * amp;
  parts.legL.rotation.x = sw * speed;
  parts.legR.rotation.x = -sw * speed;
  parts.armL.rotation.x = -sw * 0.8 * speed;
  parts.armR.rotation.x = sw * 0.8 * speed;
  parts.armL.rotation.z = 0.18;
  parts.armR.rotation.z = -0.18;
  parts.torso.rotation.x = 0.08 * speed; // lean into the stride
}
export function animateIdle(parts, t) {
  parts.armL.rotation.x = Math.sin(t * 1.4) * 0.05;
  parts.armR.rotation.x = -Math.sin(t * 1.4) * 0.05;
  parts.legL.rotation.x = 0;
  parts.legR.rotation.x = 0;
}
