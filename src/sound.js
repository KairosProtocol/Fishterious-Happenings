// Sound effects synthesised with Web Audio, so there are no sound files to load (adapted from the Notion fish tank).
// Browsers only allow audio after the first key press or click; the context is created on the first sound.

const SOUND_KEY = 'fishing-sound';
const PENTATONIC = [0, 2, 4, 7, 9]; // any mix of these notes sounds in tune
const noteHz = (step) => 440 * 2 ** ((72 + PENTATONIC[step % 5] + 12 * Math.floor(step / 5) - 69) / 12); // step 0 = C5
const rand = (a, b) => a + Math.random() * (b - a);

function makeSound() {
  let actx = null, master = null, noiseBuf = null, lastNote = 0, rainGain = null, rainVol = 0;
  let on = true;
  try { on = localStorage.getItem(SOUND_KEY) !== 'off'; } catch {}

  const ctx = () => {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.8;
      master.connect(actx.destination);
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  };
  const out = (a, vol, dur, delay = 0) => {
    const g = a.createGain(), t0 = a.currentTime + delay;
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    g.connect(master);
    return g;
  };
  const tone = (f0, f1, dur, type, vol, delay = 0) => {
    const a = on && ctx(); if (!a) return;
    const o = a.createOscillator(), t0 = a.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    o.connect(out(a, vol, dur, delay)); o.start(t0); o.stop(t0 + dur);
  };
  const noise = (dur, f0, f1, vol, delay = 0) => {
    const a = on && ctx(); if (!a) return;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), t0 = a.currentTime + delay;
    s.buffer = noiseBuf;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    s.connect(f); f.connect(out(a, vol, dur, delay));
    s.start(t0); s.stop(t0 + dur);
  };
  // One piano-ish note: a few harmonics, quick attack, long fade
  const piano = (f, vol = 1, delay = 0) => {
    const a = on && ctx(); if (!a) return;
    const t0 = a.currentTime + delay;
    [[1, 0.16, 1.4], [2, 0.06, 0.8], [3, 0.025, 0.5]].forEach(([h, v, dur]) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f * h;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(v * vol, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur);
    });
  };

  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch {} return on; },
    // A fish landing back in the water after a jump
    note() {
      const now = performance.now();
      if (now - lastNote < 45) return;
      lastNote = now;
      piano(noteHz(Math.floor(Math.random() * 10)), 0.7);
    },
    bloop() { tone(rand(450, 750), 1100, 0.07, 'sine', 0.05); },
    plop() { tone(900, 260, 0.12, 'sine', 0.25); noise(0.08, 1800, 400, 0.12); },
    splash(big = 1) { noise(0.3 * big, 3500, 300, 0.12 * big); tone(700, 220, 0.1, 'sine', 0.06); },
    whoosh() { noise(0.28, 700, 3500, 0.1); },
    nibble() { tone(1500, 1100, 0.04, 'sine', 0.12); },
    bite() { tone(880, 1320, 0.1, 'triangle', 0.22); tone(1320, 1760, 0.12, 'triangle', 0.2, 0.09); },
    hooked() { tone(300, 900, 0.15, 'triangle', 0.25); },
    miss() { tone(500, 220, 0.3, 'sine', 0.15); },
    tick() { tone(2400, 2000, 0.015, 'square', 0.025); },
    // Rising arpeggio when a fish is landed; a new species gets one more note
    jingle(isNew) { [0, 2, 4, 5, ...(isNew ? [7] : [])].forEach((step, i) => piano(noteHz(step), 1.2, i * 0.09)); },
    chomp() { tone(260, 70, 0.12, 'square', 0.08); noise(0.08, 1200, 200, 0.15); tone(500, 900, 0.06, 'sine', 0.05, 0.12); },
    dolphin() { for (let i = 0; i < 4; i++) tone(rand(1700, 2200), rand(2800, 3600), 0.07, 'sine', 0.05, i * 0.11); },
    whale() { tone(160, 110, 2.2, 'sine', 0.2); tone(220, 330, 1.6, 'triangle', 0.05, 0.4); tone(330, 240, 1.4, 'sine', 0.06, 1.6); },
    blow() { noise(0.9, 2500, 600, 0.12); },
    thunder() { noise(0.12, 7000, 1200, 0.35); noise(0.9, 500, 60, 0.6, 0.04); noise(0.6, 900, 150, 0.25, 0.18); tone(70, 32, 0.85, 'sine', 0.4, 0.03); },
    // Rain: one looping filtered noise whose volume follows the weather (0..1). Called every frame.
    rain(level) {
      if (!rainGain) {
        if (level < 0.02 || !on || !actx) return; // wait for a sound triggered by a key press to create the context
        const s = actx.createBufferSource(), f = actx.createBiquadFilter();
        s.buffer = noiseBuf; s.loop = true;
        f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.5;
        rainGain = actx.createGain(); rainGain.gain.value = 0;
        s.connect(f); f.connect(rainGain); rainGain.connect(master); s.start();
      }
      const v = on ? level * 0.14 : 0;
      if (Math.abs(v - rainVol) > 0.005) { rainVol = v; rainGain.gain.setTargetAtTime(v, actx.currentTime, 0.4); }
    },
  };
}

export const sound = makeSound();
