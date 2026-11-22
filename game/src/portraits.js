// portraits.js — stylised bust portraits drawn on canvas, one per contact.
const SKIN = { mara: '#e8b48c', inez: '#d9a06b', orin: '#c98f5f', harlan: '#b98a5e', eden: '#e8b48c', default: '#d9a06b' };
const HAIR = { mara: '#1a1a1a', inez: '#2b1a12', orin: '#3a2a1a', harlan: '#111111', eden: '#6b3a1a', default: '#222222' };
const JACKET = { mara: '#e74c3c', inez: '#8e44ad', orin: '#2e6fb0', harlan: '#27ae60', eden: '#f39c12', default: '#555555' };

export function drawPortrait(canvas, name) {
  const key = (name || 'default').toLowerCase();
  const c = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  c.clearRect(0, 0, w, h);
  // Backdrop.
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2c1a3a');
  g.addColorStop(1, '#12081f');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // Shoulders / jacket.
  c.fillStyle = JACKET[key] || JACKET.default;
  c.beginPath();
  c.moveTo(w * 0.08, h);
  c.quadraticCurveTo(w * 0.2, h * 0.62, w * 0.5, h * 0.62);
  c.quadraticCurveTo(w * 0.8, h * 0.62, w * 0.92, h);
  c.closePath();
  c.fill();
  // Neck.
  c.fillStyle = SKIN[key] || SKIN.default;
  c.fillRect(w * 0.44, h * 0.5, w * 0.12, h * 0.18);
  // Head.
  c.beginPath();
  c.ellipse(w * 0.5, h * 0.36, w * 0.19, h * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  // Hair.
  c.fillStyle = HAIR[key] || HAIR.default;
  c.beginPath();
  c.ellipse(w * 0.5, h * 0.2, w * 0.2, h * 0.14, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.fillRect(w * 0.3, h * 0.18, w * 0.05, h * 0.22);
  c.fillRect(w * 0.65, h * 0.18, w * 0.05, h * 0.22);
  // Eyes.
  c.fillStyle = '#111111';
  c.beginPath();
  c.arc(w * 0.43, h * 0.35, w * 0.018, 0, Math.PI * 2);
  c.arc(w * 0.57, h * 0.35, w * 0.018, 0, Math.PI * 2);
  c.fill();
  // Mouth.
  c.strokeStyle = '#7a3a2a';
  c.lineWidth = Math.max(1, w * 0.012);
  c.beginPath();
  c.moveTo(w * 0.45, h * 0.47);
  c.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.55, h * 0.47);
  c.stroke();
  return canvas;
}
