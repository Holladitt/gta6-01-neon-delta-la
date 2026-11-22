// Radio and sound effects, synthesized with WebAudio so the game needs no
// audio files. The radio is a label plus a soft synth pad; effects are short
// blips for shots, sirens, cash, and clicks.

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioOn = false;
  let radioOsc = null;
  let radioGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.25;
        master.connect(ctx.destination);
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type = 'sine', vol = 0.4) {
    if (!ensure()) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  return {
    unlock() {
      ensure();
    },
    toggleRadio() {
      radioOn = !radioOn;
      if (!ensure()) return radioOn;
      if (radioOn) {
        radioOsc = ctx.createOscillator();
        radioGain = ctx.createGain();
        radioOsc.type = 'triangle';
        radioOsc.frequency.value = 220;
        radioGain.gain.value = 0.05;
        radioOsc.connect(radioGain);
        radioGain.connect(master);
        radioOsc.start();
      } else if (radioOsc) {
        radioOsc.stop();
        radioOsc = null;
      }
      return radioOn;
    },
    radioOn() {
      return radioOn;
    },
    shot() {
      blip(180, 0.12, 'square', 0.3);
    },
    cash() {
      blip(880, 0.15, 'sine', 0.35);
      setTimeout(() => blip(1320, 0.2, 'sine', 0.3), 90);
    },
    click() {
      blip(660, 0.06, 'sine', 0.25);
    },
    crash() {
      blip(90, 0.25, 'sawtooth', 0.5);
    },
    siren(on) {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = 0.04;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        sirenTimer = 0;
      } else if (!on && sirenOsc) {
        sirenOsc.stop();
        sirenOsc = null;
      }
    },
    update(dt, wanted) {
      if (sirenOsc) {
        sirenTimer += dt;
        sirenOsc.frequency.value = 650 + Math.sin(sirenTimer * 4) * 250;
        if (wanted <= 0) this.siren(false);
      }
    },
  };
}
