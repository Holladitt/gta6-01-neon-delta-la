// Character portraits for the dialogue boxes of Neon Delta LA.
// Procedural low-poly faces drawn on a canvas: skin, hair, jacket
// and the contact's signature colour, so every dialogue box carries
// a readable face next to the speaker's name.
export const PORTRAITS = {
  mara: { skin: 0xd9a066, hair: 0x2c1a12, jacket: 0xe74c3c, accent: 0x2471a3 },
  inez: { skin: 0xc98a5a, hair: 0x1a1a1a, jacket: 0x8e44ad, accent: 0xf1c40f },
  orin: { skin: 0xe0ac69, hair: 0x6b4f2a, jacket: 0x2c3e50, accent: 0x1abc9c },
  eden: { skin: 0xd9a066, hair: 0x3a3a3a, jacket: 0x16a085, accent: 0xf39c12 },
  harlan: { skin: 0xc98a5a, hair: 0x2c1a12, jacket: 0x7f8c8d, accent: 0xe74c3c },
};

export function portraitColors(name) {
  const key = String(name || 'mara').toLowerCase();
  return PORTRAITS[key] || PORTRAITS.mara;
}

export function drawPortrait(ctx, name, x, y, size) {
  const c = portraitColors(name);
  const css = (n) => '#' + n.toString(16).padStart(6, '0');
  ctx.fillStyle = css(c.accent);
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = css(c.skin);
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size * 0.42, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(c.hair);
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size * 0.36, size * 0.28, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = css(c.jacket);
  ctx.fillRect(x + size * 0.18, y + size * 0.72, size * 0.64, size * 0.28);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + size * 0.42, y + size * 0.42, size * 0.05, size * 0.05);
  ctx.fillRect(x + size * 0.56, y + size * 0.42, size * 0.05, size * 0.05);
}
