// Character portraits, drawn on a small canvas in a flat comic style: a
// background wash, a face, hair, and a single identifying detail. Returned
// as a data URL so the HUD can drop it straight into an <img>.

export function drawPortrait(name, color, size = 120) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const s = size;
  g.fillStyle = color;
  g.fillRect(0, 0, s, s);
  // background stripes
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(0, s * 0.18, s, s * 0.06);
  g.fillRect(0, s * 0.30, s, s * 0.03);
  // shoulders
  g.fillStyle = '#1d2733';
  g.beginPath();
  g.moveTo(s * 0.12, s);
  g.quadraticCurveTo(s * 0.2, s * 0.62, s * 0.5, s * 0.62);
  g.quadraticCurveTo(s * 0.8, s * 0.62, s * 0.88, s);
  g.closePath();
  g.fill();
  // neck + face
  g.fillStyle = '#e8b98a';
  g.fillRect(s * 0.44, s * 0.5, s * 0.12, s * 0.16);
  g.beginPath();
  g.ellipse(s * 0.5, s * 0.36, s * 0.19, s * 0.21, 0, 0, Math.PI * 2);
  g.fill();
  // hair
  g.fillStyle = '#20242c';
  g.beginPath();
  g.ellipse(s * 0.5, s * 0.2, s * 0.2, s * 0.13, 0, Math.PI, 0);
  g.fill();
  g.fillRect(s * 0.3, s * 0.18, s * 0.06, s * 0.16);
  g.fillRect(s * 0.64, s * 0.18, s * 0.06, s * 0.16);
  // eyes
  g.fillStyle = '#1d2733';
  g.beginPath();
  g.arc(s * 0.42, s * 0.35, s * 0.02, 0, Math.PI * 2);
  g.arc(s * 0.58, s * 0.35, s * 0.02, 0, Math.PI * 2);
  g.fill();
  // mouth
  g.strokeStyle = '#7a3b2e';
  g.lineWidth = s * 0.015;
  g.beginPath();
  g.moveTo(s * 0.44, s * 0.48);
  g.quadraticCurveTo(s * 0.5, s * 0.51, s * 0.56, s * 0.48);
  g.stroke();
  // name bar
  g.fillStyle = 'rgba(10,14,20,0.85)';
  g.fillRect(0, s * 0.84, s, s * 0.16);
  g.fillStyle = '#ffffff';
  g.font = `bold ${Math.round(s * 0.09)}px Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name.toUpperCase(), s / 2, s * 0.92);
  return c.toDataURL('image/png');
}

export function crewPortrait(member) {
  return drawPortrait(member.name, member.color);
}
