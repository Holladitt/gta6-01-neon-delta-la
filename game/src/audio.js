// Procedural sound only — no audio files, no network. A tiny WebAudio synth:
// engine hum whose pitch follows speed, a two-tone police siren, gunshot noise,
// and three radio stations that play different looping note patterns.
// Everything is created lazily on the first user gesture; silent when off.
const STATIONS = [
  { name: 'NEON 88 — Sunset Drive', notes: [220, 277, 330, 392, 330, 277], step: 0.24 },
  { name: 'CANAL FM — Night Market', notes: [196, 247, 294, 370, 294, 247], step: 0.2 },
  { name: 'PORT RADIO — Dock Beats', notes: [165, 220, 262, 330, 262, 220], step: 0.16 },
];

export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null;
  let radioOn = false, station = 0, noteTimer = 0, noteIndex = 0;
  let sirenOn = false, sirenTimer = 0, sirenHigh = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.16; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
      return true;
    } catch { return false; }
  }
  function beep(freq, dur, type, vol) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    get stations() { return STATIONS.map((s) => s.name); },
    get station() { return station; },
    setStation(i) { station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length; noteIndex = 0; },
    toggleRadio() { radioOn = !radioOn; return radioOn; },
    get radioOn() { return radioOn; },
    shot() { if (!ctx) return; beep(880, 0.08, 'square', 0.25); beep(140, 0.12, 'sawtooth', 0.3); },
    horn() { beep(370, 0.18, 'square', 0.18); },
    coin() { beep(660, 0.07, 'sine', 0.2); beep(990, 0.12, 'sine', 0.2); },
    bust() { beep(220, 0.4, 'sawtooth', 0.25); beep(165, 0.5, 'sawtooth', 0.25); },
    setSiren(on) { sirenOn = on; },
    update(dt, speedRatio, wanted) {
      if (!ctx) return;
      if (engineOsc) {
        engineOsc.frequency.value = 50 + speedRatio * 140;
        engineGain.gain.value = speedRatio > 0.02 ? 0.05 + speedRatio * 0.05 : 0.0;
      }
      if (sirenOn && wanted > 0) {
        sirenTimer -= dt;
        if (sirenTimer <= 0) { sirenTimer = 0.42; sirenHigh = !sirenHigh; beep(sirenHigh ? 720 : 540, 0.38, 'sine', 0.07); }
      }
      if (radioOn) {
        noteTimer -= dt;
        if (noteTimer <= 0) {
          const st = STATIONS[station];
          noteTimer = st.step;
          beep(st.notes[noteIndex % st.notes.length], st.step * 0.9, 'triangle', 0.08);
          noteIndex += 1;
        }
      }
    },
  };
}
