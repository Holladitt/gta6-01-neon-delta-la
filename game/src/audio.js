// WebAudio synth: radio jingle, engine hum, sirens. Browser only.
// Nothing plays until the first user gesture (browser policy); every
// call is guarded so a headless run never throws.
let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenNodes = null;
function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
  return ctx;
}
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}
export function playBlip(freq) {
  const c = ensureCtx();
  if (!c || !master) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq || 660;
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + 0.15);
  } catch (e) { /* ignore */ }
}
export function setEngine(on, speed) {
  const c = ensureCtx();
  if (!c || !master) return;
  try {
    if (on && !engineOsc) {
      engineOsc = c.createOscillator();
      engineOsc.type = 'sawtooth';
      engineGain = c.createGain();
      engineGain.gain.value = 0.02;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    }
    if (engineOsc) {
      engineOsc.frequency.value = 50 + (speed || 0) * 3;
      engineGain.gain.value = on ? 0.02 + Math.min(0.05, (speed || 0) * 0.001) : 0;
    }
  } catch (e) { /* ignore */ }
}
export function setSiren(on) {
  const c = ensureCtx();
  if (!c || !master) return;
  try {
    if (on && !sirenNodes) {
      const o = c.createOscillator();
      o.type = 'sine';
      const g = c.createGain();
      g.gain.value = 0.03;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.8;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 300;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      o.frequency.value = 800;
      o.connect(g);
      g.connect(master);
      o.start();
      lfo.start();
      sirenNodes = { o, lfo, g };
    } else if (!on && sirenNodes) {
      try { sirenNodes.o.stop(); sirenNodes.lfo.stop(); } catch (e) { /* ignore */ }
      sirenNodes = null;
    }
  } catch (e) { /* ignore */ }
}
export function playRadioJingle() {
  const c = ensureCtx();
  if (!c || !master) return;
  try {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const t0 = c.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.35);
    });
  } catch (e) { /* ignore */ }
}
