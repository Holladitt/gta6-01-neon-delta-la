// audio.js — tiny WebAudio synth: engine hum, siren, gunshots (browser).
// Everything is guarded: if AudioContext cannot start, audio stays off
// and the game plays silently.
export function createAudio() {
  let ctx = null;
  let engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
  let enabled = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(ctx.destination);
      sirenOsc.start();
      enabled = true;
      return true;
    } catch {
      return false;
    }
  }

  let sirenPhase = 0;
  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    // speed01: 0..1 throttle; onFoot: engine off.
    engine(speed01, inCar) {
      if (!enabled || !ctx) return;
      try {
        engineGain.gain.value = inCar ? 0.015 + speed01 * 0.03 : 0;
        engineOsc.frequency.value = 45 + speed01 * 130;
      } catch { /* ignore */ }
    },
    siren(dt, wanted) {
      if (!enabled || !ctx) return;
      try {
        sirenPhase += dt;
        if (wanted > 0) {
          sirenGain.gain.value = 0.012;
          sirenOsc.frequency.value = 650 + 250 * Math.sin(sirenPhase * 4);
        } else {
          sirenGain.gain.value = 0;
        }
      } catch { /* ignore */ }
    },
    shot() {
      if (!enabled || !ctx) return;
      try {
        const dur = 0.08;
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = 0.12;
        src.connect(g).connect(ctx.destination);
        src.start();
      } catch { /* ignore */ }
    },
    blip(freq = 880) {
      if (!enabled || !ctx) return;
      try {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = 0.03;
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.07);
      } catch { /* ignore */ }
    },
  };
}
