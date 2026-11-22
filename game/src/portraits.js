// portraits.js — flat-style canvas portraits for contacts and crew.
// Each person gets a distinct skin tone, hair style/colour and outfit
// colour, drawn once to a small canvas and reused by the HUD.
const PEOPLE = {
  'Mara Solano': { skin: '#e8b48c', hair: '#2b1d16', style: 'long', outfit: '#1f8a8a', bg: '#123f3a' },
  'Eden Voss': { skin: '#f0c8a0', hair: '#c8a24a', style: 'bob', outfit: '#8a6d2f', bg: '#3a2f10' },
  'Harlan Dray': { skin: '#c98d5f', hair: '#1a1a1a', style: 'flat', outfit: '#333a45', bg: '#1c222c' },
  'Lucia Marlow': { skin: '#eab98f', hair: '#5a2d2d', style: 'bun', outfit: '#7a2d4a', bg: '#2c1220' },
  'Dante Kovac': { skin: '#d9a06b', hair: '#0f0f0f', style: 'buzz', outfit: '#4a2d1a', bg: '#241608' },
  'Sable Okonkwo': { skin: '#8a5a34', hair: '#101010', style: 'braids', outfit: '#2f5d3a', bg: '#122b18' },
  'Vera Lindqvist': { skin: '#f2cfa8', hair: '#e8e8e8', style: 'long', outfit: '#5a5a7a', bg: '#1e1e30' },
  'Inez Vargas': { skin: '#e0aa7a', hair: '#3a1a1a', style: 'bob', outfit: '#8a3a2f', bg: '#33120e' },
  'Orin Beck': { skin: '#d8b08a', hair: '#6a4a2a', style: 'flat', outfit: '#2f4a5a', bg: '#12242e' },
  'Lena Marsh': { skin: '#eec39a', hair: '#2d4a2d', style: 'long', outfit: '#3a6a4a', bg: '#142e1c' },
  'Elias Frost': { skin: '#f5d3ae', hair: '#9a9a9a', style: 'flat', outfit: '#4a4a5a', bg: '#22222e' },
  'Juno Reyes': { skin: '#e5b088', hair: '#1f1f1f', style: 'flat', outfit: '#1f8a8a', bg: '#0f3a3a' },
  'Petra Hale': { skin: '#f0c8a0', hair: '#8a5a2a', style: 'bun', outfit: '#b06a2f', bg: '#3a220e' },
  'Cassia Wren': { skin: '#d9a06b', hair: '#101010', style: 'long', outfit: '#5a3a6a', bg: '#22122e' },
};

export function drawPortrait(name, size = 96) {
  const p = PEOPLE[name] || { skin: '#e0aa7a', hair: '#222222', style: 'flat', outfit: '#445566', bg: '#1a2230' };
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const u = size / 96;
  g.fillStyle = p.bg;
  g.fillRect(0, 0, size, size);
  // Shoulders / outfit.
  g.fillStyle = p.outfit;
  g.beginPath();
  g.moveTo(18 * u, 96 * u);
  g.quadraticCurveTo(48 * u, 62 * u, 78 * u, 96 * u);
  g.closePath();
  g.fill();
  // Neck + face.
  g.fillStyle = p.skin;
  g.fillRect(42 * u, 58 * u, 12 * u, 14 * u);
  g.beginPath();
  g.ellipse(48 * u, 40 * u, 17 * u, 21 * u, 0, 0, Math.PI * 2);
  g.fill();
  // Hair.
  g.fillStyle = p.hair;
  if (p.style === 'long') {
    g.beginPath();
    g.ellipse(48 * u, 26 * u, 19 * u, 14 * u, 0, Math.PI, 0);
    g.fill();
    g.fillRect(29 * u, 24 * u, 7 * u, 34 * u);
    g.fillRect(60 * u, 24 * u, 7 * u, 34 * u);
  } else if (p.style === 'bob') {
    g.beginPath();
    g.ellipse(48 * u, 27 * u, 20 * u, 15 * u, 0, Math.PI, 0);
    g.fill();
    g.fillRect(28 * u, 26 * u, 6 * u, 22 * u);
    g.fillRect(62 * u, 26 * u, 6 * u, 22 * u);
  } else if (p.style === 'bun') {
    g.beginPath();
    g.ellipse(48 * u, 28 * u, 18 * u, 13 * u, 0, Math.PI, 0);
    g.fill();
    g.beginPath();
    g.arc(48 * u, 14 * u, 7 * u, 0, Math.PI * 2);
    g.fill();
  } else if (p.style === 'braids') {
    g.beginPath();
    g.ellipse(48 * u, 27 * u, 19 * u, 13 * u, 0, Math.PI, 0);
    g.fill();
    g.fillRect(30 * u, 26 * u, 5 * u, 30 * u);
    g.fillRect(61 * u, 26 * u, 5 * u, 30 * u);
  } else if (p.style === 'buzz') {
    g.beginPath();
    g.ellipse(48 * u, 26 * u, 17 * u, 10 * u, 0, Math.PI, 0);
    g.fill();
  } else {
    g.beginPath();
    g.ellipse(48 * u, 27 * u, 18 * u, 12 * u, 0, Math.PI, 0);
    g.fill();
  }
  // Eyes + mouth.
  g.fillStyle = '#1a1a1a';
  g.beginPath();
  g.arc(41 * u, 40 * u, 2 * u, 0, Math.PI * 2);
  g.arc(55 * u, 40 * u, 2 * u, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#7a4a30';
  g.lineWidth = 1.5 * u;
  g.beginPath();
  g.moveTo(44 * u, 52 * u);
  g.quadraticCurveTo(48 * u, 54 * u, 52 * u, 52 * u);
  g.stroke();
  return c;
}
