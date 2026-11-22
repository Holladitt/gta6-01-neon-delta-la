// Tiny WebAudio synth: engine hum + shot blips. Created lazily on first gesture.
export function createAudio() {
  let ctx = null, eng = null, engGain = null;
  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 60;
      engGain = ctx.createGain(); engGain.gain.value = 0;
      eng.connect(engGain); engGain.connect(ctx.destination);
      eng.start();
    } catch (e) { ctx = null; }
  }
  window.addEventListener('pointerdown', ensure, { once: true });
  window.addEventListener('keydown', ensure, { once: true });
  return {
    engine(speed) {
      if (!ctx || !eng) return;
      eng.frequency.value = 50 + Math.abs(speed) * 4;
      engGain.gain.value = Math.min(0.06, Math.abs(speed) * 0.002);
    },
    blip(freq) {
      if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq || 440; o.type = 'square';
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.15);
    },
  };
}
