// Canvas portraits for the dialogue box. Browser only.
// A stylised face: skin, hair, eyes, jacket — palette per person.
const PALETTES = {
  'Mara Solano': { skin: '#e8b48c', hair: '#2b1a12', jacket: '#e74c3c', bg: '#3a1f2b' },
  'Eden Voss': { skin: '#d9a06b', hair: '#111111', jacket: '#2e86c1', bg: '#16283a' },
  'Inez Vargas': { skin: '#c98d5f', hair: '#3a2a1a', jacket: '#7d3c98', bg: '#241a33' },
  'Orin Beck': { skin: '#e0aa7e', hair: '#6b6b6b', jacket: '#1e8449', bg: '#12291c' },
  'Harlan Dray': { skin: '#d9a06b', hair: '#4a2c14', jacket: '#b7950b', bg: '#2e2a12' },
  'Lucia Marlow': { skin: '#e8b48c', hair: '#8a5a2b', jacket: '#17a589', bg: '#0f2a26' },
  'Dante Kovac': { skin: '#e0aa7e', hair: '#1a1a1a', jacket: '#5d6d7e', bg: '#1c2430' },
  'Sable Okonkwo': { skin: '#8a5a33', hair: '#111111', jacket: '#c0392b', bg: '#2b1410' },
  'Vera Lindqvist': { skin: '#f0c8a0', hair: '#d4a017', jacket: '#6c3483', bg: '#221631' },
  'Lena Marsh': { skin: '#e8b48c', hair: '#2e4053', jacket: '#148f77', bg: '#0e2a26' },
  'Elias Frost': { skin: '#e0aa7e', hair: '#7f8c8d', jacket: '#2c3e50', bg: '#141c26' },
};
function paletteFor(name) {
  return PALETTES[name] || { skin: '#e8b48c', hair: '#2b1a12', jacket: '#e74c3c', bg: '#232a35' };
}
export function drawPortrait(canvas, name) {
  const c = canvas.getContext('2d');
  if (!c) return;
  const w = canvas.width;
  const h = canvas.height;
  const p = paletteFor(name);
  c.clearRect(0, 0, w, h);
  c.fillStyle = p.bg;
  c.fillRect(0, 0, w, h);
  // rim light
  c.fillStyle = 'rgba(255, 170, 80, 0.25)';
  c.fillRect(0, 0, w, h * 0.12);
  // jacket / shoulders
  c.fillStyle = p.jacket;
  c.beginPath();
  c.moveTo(w * 0.08, h);
  c.quadraticCurveTo(w * 0.2, h * 0.62, w * 0.5, h * 0.6);
  c.quadraticCurveTo(w * 0.8, h * 0.62, w * 0.92, h);
  c.closePath();
  c.fill();
  // collar
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.moveTo(w * 0.42, h * 0.62);
  c.lineTo(w * 0.5, h * 0.78);
  c.lineTo(w * 0.58, h * 0.62);
  c.closePath();
  c.fill();
  // neck + head
  c.fillStyle = p.skin;
  c.fillRect(w * 0.44, h * 0.5, w * 0.12, h * 0.16);
  c.beginPath();
  c.ellipse(w * 0.5, h * 0.34, w * 0.2, h * 0.24, 0, 0, Math.PI * 2);
  c.fill();
  // hair
  c.fillStyle = p.hair;
  c.beginPath();
  c.ellipse(w * 0.5, h * 0.2, w * 0.21, h * 0.16, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(w * 0.32, h * 0.32, w * 0.05, h * 0.14, 0.2, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(w * 0.68, h * 0.32, w * 0.05, h * 0.14, -0.2, 0, Math.PI * 2);
  c.fill();
  // eyes
  c.fillStyle = '#1a1a1a';
  c.beginPath();
  c.ellipse(w * 0.42, h * 0.33, w * 0.028, h * 0.018, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(w * 0.58, h * 0.33, w * 0.028, h * 0.018, 0, 0, Math.PI * 2);
  c.fill();
  // mouth
  c.strokeStyle = 'rgba(120, 40, 30, 0.8)';
  c.lineWidth = Math.max(1, w * 0.012);
  c.beginPath();
  c.moveTo(w * 0.44, h * 0.46);
  c.quadraticCurveTo(w * 0.5, h * 0.48, w * 0.56, h * 0.46);
  c.stroke();
}
