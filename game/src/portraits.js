// Canvas-drawn cartoon portraits for the dialogue box.
const FACES = {
  'Mara Solano': { skin: '#d9a066', hair: '#2c1a12', shirt: '#e74c3c', style: 'long' },
  'Inez Vargas': { skin: '#c98a5a', hair: '#3a2a1a', shirt: '#8e44ad', style: 'bun' },
  'Orin Beck': { skin: '#d9a066', hair: '#888888', shirt: '#2e6fb0', style: 'short' },
  'Harlan Dray': { skin: '#b08050', hair: '#1a1a1a', shirt: '#27ae60', style: 'short' },
  'Eden Voss': { skin: '#e8b88a', hair: '#f1c40f', shirt: '#1abc9c', style: 'long' },
  'Juno Reyes': { skin: '#c98a5a', hair: '#2c1a12', shirt: '#3498db', style: 'short' },
  'Petra Hale': { skin: '#e8b88a', hair: '#e74c3c', shirt: '#27ae60', style: 'bun' },
  'Cassia Wren': { skin: '#d9a066', hair: '#5a3a1a', shirt: '#9b59b6', style: 'long' },
};
export function portraitDataURL(name) {
  const f = FACES[name] || FACES['Mara Solano'];
  const c = document.createElement('canvas');
  c.width = 96; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#1a2a3a'; g.fillRect(0, 0, 96, 96);
  g.fillStyle = f.shirt;
  g.beginPath(); g.moveTo(18, 96); g.quadraticCurveTo(48, 62, 78, 96); g.closePath(); g.fill();
  g.fillStyle = f.skin;
  g.beginPath(); g.arc(48, 42, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = f.hair;
  if (f.style === 'long') {
    g.beginPath(); g.arc(48, 34, 25, Math.PI, 0); g.fill();
    g.fillRect(22, 30, 8, 40); g.fillRect(66, 30, 8, 40);
  } else if (f.style === 'bun') {
    g.beginPath(); g.arc(48, 30, 22, Math.PI, 0); g.fill();
    g.beginPath(); g.arc(48, 14, 9, 0, Math.PI * 2); g.fill();
  } else {
    g.beginPath(); g.arc(48, 32, 23, Math.PI, 0); g.fill();
  }
  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.arc(39, 42, 2.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(57, 42, 2.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7a3a2a'; g.lineWidth = 2;
  g.beginPath(); g.arc(48, 54, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  return c.toDataURL('image/png');
}
