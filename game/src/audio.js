// audio.js — tiny WebAudio bleeps: engine hum, radio stabs, gunshots.
// Silent until the player interacts; muted flag is honoured everywhere.
let ctx = null;
let muted = false;
let engineOsc = null;
let engineGain = null;

export function setMuted(m) {
  muted = !!m;
  if (engineGain) engineGain.gain.value = muted ? 0 : 0.05;
}
export function isMuted() {
  return muted;
}
export function ensureAudio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (e) {
    ctx = null;
  }
  return ctx;
}
function blip(freq, dur, type, vol) {
  if (muted) return;
  const c = ensureAudio();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch (e) { /* audio is best-effort */ }
}
export function playShot() {
  blip(220, 0.08, 'square', 0.12);
  blip(90, 0.12, 'sawtooth', 0.1);
}
export function playPickup() {
  blip(660, 0.12, 'sine', 0.1);
  setTimeout(() => blip(880, 0.15, 'sine', 0.1), 90);
}
export function playSiren() {
  blip(700, 0.3, 'sine', 0.05);
  setTimeout(() => blip(520, 0.3, 'sine', 0.05), 300);
}
export function startEngine() {
  if (muted) return;
  const c = ensureAudio();
  if (!c || engineOsc) return;
  try {
    engineOsc = c.createOscillator();
    engineGain = c.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0.05;
    engineOsc.connect(engineGain);
    engineGain.connect(c.destination);
    engineOsc.start();
  } catch (e) { /* best-effort */ }
}
export function stopEngine() {
  if (engineOsc) {
    try { engineOsc.stop(); } catch (e) { /* already stopped */ }
    engineOsc = null;
    engineGain = null;
  }
}
export function setEngineSpeed(rpm) {
  if (engineOsc && !muted) {
    engineOsc.frequency.value = 55 + Math.min(120, Math.abs(rpm) * 2);
  }
}
