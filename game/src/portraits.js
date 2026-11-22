// Character portraits drawn on a canvas: Mara, the three crew
// members, and the six contacts. Chunky low-poly faces in the
// game's palette, used by the HUD crew panel and the mission bar.
// Browser only; every function guards for a missing document.
import { MARA, CONTACTS } from './characters.js';
import { CREW } from './config.js';

function hex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

export function drawPortrait(canvas, person, size) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const s = size || 64;
  canvas.width = s; canvas.height = s;
  ctx.fillStyle = '#0d1b2e';
  ctx.fillRect(0, 0, s, s);
  // Face block.
  ctx.fillStyle = hex(person.skin || 0xe0ac69);
  ctx.fillRect(s * 0.28, s * 0.22, s * 0.44, s * 0.42);
  // Hair.
  ctx.fillStyle = hex(person.hair || 0x1a1a1a);
  ctx.fillRect(s * 0.26, s * 0.14, s * 0.48, s * 0.16);
  // Jacket shoulders.
  ctx.fillStyle = hex(person.shirt || person.jacket || 0x1abc9c);
  ctx.fillRect(s * 0.16, s * 0.64, s * 0.68, s * 0.36);
  // Eyes.
  ctx.fillStyle = '#111';
  ctx.fillRect(s * 0.36, s * 0.4, s * 0.07, s * 0.05);
  ctx.fillRect(s * 0.57, s * 0.4, s * 0.07, s * 0.05);
  // Name bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, s * 0.86, s, s * 0.14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + Math.max(8, s * 0.09) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((person.name || 'MARA').split(' ')[0].toUpperCase(), s / 2, s * 0.96);
}

export function maraPortrait(canvas, size) {
  drawPortrait(canvas, { name: MARA.name, skin: 0xe0ac69, hair: MARA.hair, shirt: MARA.jacket }, size);
}

export function crewPortraits() {
  return CREW.map((c) => ({ id: c.id, name: c.name, ability: c.ability, key: c.key }));
}

export function contactPortrait(canvas, name, size) {
  const c = CONTACTS.find((x) => x.name === name);
  drawPortrait(canvas, { name, skin: 0xc68642, hair: 0x2c3e50, shirt: c ? c.shirt : 0x3498db }, size);
}
