// Sound: a tiny WebAudio synth for engine hum, gunshots, pickup
// blips and the radio sting. No audio files, no network. The radio
// display reads "RADIO: NEON 88". Safe to construct without a
// window (every method no-ops until the context exists).
import { RADIO } from './config.js';

export function createAudio() {
  const a = {
    ctx: null, station: RADIO, muted: false,
    ensure() {
      if (a.ctx) return a.ctx;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        a.ctx = new AC();
      } catch (e) {
        a.ctx = null;
      }
      return a.ctx;
    },
    blip(freq, dur, type) {
      if (a.muted) return;
      const ctx = a.ensure();
      if (!ctx) return;
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type || 'square';
        o.frequency.value = freq || 440;
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.12));
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + (dur || 0.12));
      } catch (e) { /* audio is best-effort */ }
    },
    shot() { a.blip(180, 0.09, 'sawtooth'); },
    pickup() { a.blip(880, 0.12, 'sine'); a.blip(1320, 0.1, 'sine'); },
    cash() { a.blip(660, 0.1, 'triangle'); a.blip(990, 0.14, 'triangle'); },
    siren() { a.blip(700, 0.3, 'sine'); },
    radioSting() { a.blip(523, 0.1, 'triangle'); a.blip(659, 0.1, 'triangle'); a.blip(784, 0.18, 'triangle'); },
    stationName() { return a.station; },
  };
  return a;
}
