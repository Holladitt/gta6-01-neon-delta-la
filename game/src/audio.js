// Procedural WebAudio: engine hum, siren, gunshots, radio stations, UI blips.
// No audio files — everything is synthesized. Created lazily on first gesture.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null;
    this.engineOsc = null; this.engineGain = null;
    this.sirenOsc = null; this.sirenGain = null; this.sirenLfo = null;
    this.radioTimer = null; this.station = 0; this.radioOn = false;
    this.stations = [
      { name: 'NEON 88', bpm: 96, scale: [0, 3, 5, 7, 10], base: 220 },
      { name: 'SUNSET DRIVE', bpm: 120, scale: [0, 2, 4, 7, 9], base: 196 },
      { name: 'DELTA FM', bpm: 80, scale: [0, 3, 5, 8, 10], base: 174 },
    ];
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return false; }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // engine: sawtooth + lowpass
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 400;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engineOsc.start();
    // siren: two-tone square
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenOsc.frequency.value = 750;
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.frequency.value = 1.4;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 200;
    this.sirenLfo.connect(lfoGain); lfoGain.connect(this.sirenOsc.frequency);
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
    this.sirenOsc.start(); this.sirenLfo.start();
    return true;
  }
  setEngine(speed01, inCar) {
    if (!this.ctx) return;
    this.engineOsc.frequency.value = 55 + speed01 * 160;
    this.engineGain.gain.value = inCar ? 0.05 + speed01 * 0.06 : 0;
  }
  setSiren(on, dist01) {
    if (!this.ctx) return;
    this.sirenGain.gain.value = on ? 0.05 * (1 - Math.min(1, dist01)) + 0.012 : 0;
  }
  blip(freq = 880, dur = 0.08, type = 'sine', vol = 0.15) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  shot(kind) {
    if (!this.ctx) return;
    const dur = kind === 'SHOTGUN' ? 0.3 : 0.12;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = kind === 'SHOTGUN' ? 1200 : 3000;
    const g = this.ctx.createGain();
    g.gain.value = kind === 'SHOTGUN' ? 0.5 : 0.3;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.2), i * 110)); }
  nextStation() {
    this.station = (this.station + 1) % this.stations.length;
    return this.stations[this.station].name;
  }
  setRadio(on) {
    this.radioOn = on;
    if (!this.ctx) return;
    if (on && !this.radioTimer) {
      let step = 0;
      const st = this.stations[this.station];
      const beat = 60000 / st.bpm / 2;
      this.radioTimer = setInterval(() => {
        const note = st.scale[step % st.scale.length] + (Math.floor(step / st.scale.length) % 2) * 12;
        this.blip(st.base * Math.pow(2, note / 12), 0.22, 'triangle', 0.07);
        step++;
      }, beat);
    } else if (!on && this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }
}
