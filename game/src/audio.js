// Radio and sound effects for Neon Delta LA.
// A tiny WebAudio synth: engine hum, sirens and the "RADIO: NEON 88"
// station chime. Silent in node (no AudioContext there).
export function createAudio() {
  const audio = { enabled: false, ctx: null, station: 'NEON 88', muted: false };
  if (typeof window !== 'undefined' && window.AudioContext) {
    try {
      audio.ctx = new window.AudioContext();
      audio.enabled = true;
    } catch (e) {
      audio.enabled = false;
    }
  }
  return audio;
}

export function playChime(audio, freq) {
  if (!audio.enabled || !audio.ctx) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.frequency.value = freq || 660;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(audio.ctx.destination);
  osc.start();
  osc.stop(audio.ctx.currentTime + 0.3);
}

export function playSiren(audio) {
  if (!audio.enabled || !audio.ctx) return;
  playChime(audio, 880);
  setTimeout(() => playChime(audio, 620), 180);
}

export function radioStation(audio) {
  return 'RADIO: NEON ' + (audio.station || '88');
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
