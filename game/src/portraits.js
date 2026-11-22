// Procedural bust portraits (canvas 2D, no external assets). Used for the
// dialog speaker, the crew bar, and named mission contacts. Every portrait
// is drawn from the person's own colors — Mara keeps her coral jacket,
// ponytail and yellow shoes identity in the bust (coral shoulders + tie).
const css = (n) => '#' + n.toString(16).padStart(6, '0');

function drawBust(g, o) {
  const W = 96;
  const H = 96;
  // background: role-color gradient
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, o.bg || '#1a2a4a');
  bg.addColorStop(1, '#0a1220');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // shoulders / jacket
  g.fillStyle = css(o.shirt);
  g.beginPath();
  g.moveTo(8, H);
  g.quadraticCurveTo(14, 74, 30, 70);
  g.lineTo(66, 70);
  g.quadraticCurveTo(82, 74, 88, H);
  g.closePath();
  g.fill();
  // collar
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(40, 70, 16, 6);
  // neck
  g.fillStyle = css(o.skin);
  g.fillRect(42, 58, 12, 16);
  // head
  g.fillStyle = css(o.skin);
  g.beginPath();
  g.ellipse(48, 40, 21, 23, 0, 0, Math.PI * 2);
  g.fill();
  // ears
  g.fillRect(26, 38, 4, 8);
  g.fillRect(66, 38, 4, 8);
  // hair
  const hair = css(o.hair ?? 0x1a1a1a);
  g.fillStyle = hair;
  if (o.hairStyle === 'cap') {
    // short hair + cap
    g.beginPath();
    g.ellipse(48, 26, 21, 10, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = css(o.cap ?? 0x2471a3);
    g.fillRect(26, 14, 44, 10);
    g.fillRect(26, 22, 44, 4);
    g.fillRect(44, 24, 26, 4); // brim
  } else if (o.hairStyle === 'bandana') {
    g.beginPath();
    g.ellipse(48, 26, 21, 10, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = css(o.bandana ?? 0x2ec4b6);
    g.fillRect(27, 20, 42, 8);
    g.fillRect(64, 24, 10, 8); // knot tail
  } else if (o.hairStyle === 'bun') {
    g.beginPath();
    g.ellipse(48, 26, 21, 10, 0, Math.PI, 0);
    g.fill();
    g.beginPath();
    g.arc(48, 12, 8, 0, Math.PI * 2);
    g.fill();
  } else if (o.hairStyle === 'ponytail') {
    // fringe + long ponytail down the back, coral tie
    g.beginPath();
    g.ellipse(48, 25, 21, 11, 0, Math.PI, 0);
    g.fill();
    g.fillRect(70, 22, 8, 42);
    g.fillStyle = '#ff2e4d';
    g.fillRect(69, 30, 10, 5);
  } else {
    // short hair
    g.beginPath();
    g.ellipse(48, 25, 21, 11, 0, Math.PI, 0);
    g.fill();
  }
  // face: brows, eyes, nose, mouth
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(33, 35, 9, 2);
  g.fillRect(54, 35, 9, 2);
  g.fillStyle = '#14100c';
  g.beginPath();
  g.ellipse(37, 41, 2.6, 3.4, 0, 0, Math.PI * 2);
  g.ellipse(59, 41, 2.6, 3.4, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(38, 40, 0.9, 0, Math.PI * 2);
  g.arc(60, 40, 0.9, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(48, 43);
  g.lineTo(48, 49);
  g.stroke();
  g.strokeStyle = 'rgba(60,10,10,0.8)';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(42, 55);
  g.quadraticCurveTo(48, 58, 54, 55);
  g.stroke();
}

function portrait(o) {
  const cv = document.createElement('canvas');
  cv.width = 96;
  cv.height = 96;
  drawBust(cv.getContext('2d'), o);
  return cv.toDataURL('image/png');
}

const MARA = { skin: 0xe0ac69, hair: 0x4a2c0a, hairStyle: 'ponytail', shirt: 0xff2e4d, bg: '#5a1020' };
const CREW_LOOKS = {
  juno: { skin: 0xc68642, hair: 0x1a1a1a, hairStyle: 'short', shirt: 0x2471a3, bg: '#0f2a4a' },
  petra: { skin: 0xf1c27d, hair: 0x8a6a42, hairStyle: 'bun', shirt: 0x229954, bg: '#0f3a26' },
  cassia: { skin: 0xffdbac, hair: 0x4a2c0a, hairStyle: 'short', shirt: 0x7d3c98, bg: '#2a1040' },
};

// Returns { mara, juno, petra, cassia, <contactName>: dataURL, ... }.
// Contacts come from MISSIONS config (name + look fields).
export function makePortraits(contacts) {
  const out = { mara: portrait(MARA) };
  for (const [id, look] of Object.entries(CREW_LOOKS)) out[id] = portrait(look);
  for (const c of contacts || []) {
    out[c.name] = portrait({
      skin: c.skin,
      hair: c.hair,
      hairStyle: c.hairStyle,
      cap: c.cap,
      bandana: c.bandana,
      shirt: c.shirt,
      bg: '#1a2a4a',
    });
  }
  return out;
}

export const MARA_LOOK = MARA;
