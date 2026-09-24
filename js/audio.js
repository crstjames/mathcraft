// Tiny synth sound effects with the Web Audio API. No audio files needed.
window.BQ = window.BQ || {};

BQ.Audio = (() => {
  let ctx = null;
  let muted = BQ.Storage.getSettings().muted;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'square', vol = 0.06, delay = 0, slideTo = null } = {}) {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, { vol = 0.1, delay = 0, lowpass = 1200 } = {}) {
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  const sounds = {
    click: () => tone(700, 0.05, { vol: 0.04 }),
    jump: () => tone(260, 0.12, { vol: 0.03, slideTo: 420 }),
    correct: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { delay: i * 0.08 })),
    wrong: () => tone(220, 0.35, { type: 'sawtooth', vol: 0.05, slideTo: 110 }),
    hurt: () => { tone(180, 0.15, { type: 'square', vol: 0.06, slideTo: 90 }); noise(0.1, { vol: 0.05 }); },
    break: () => noise(0.18, { vol: 0.15, lowpass: 900 }),
    place: () => noise(0.08, { vol: 0.12, lowpass: 600 }),
    door: () => { tone(140, 0.2, { type: 'triangle', vol: 0.1 }); noise(0.2, { vol: 0.08, lowpass: 500 }); },
    hiss: () => noise(0.9, { vol: 0.07, lowpass: 5000 }),
    boom: () => { noise(0.8, { vol: 0.3, lowpass: 400 }); tone(80, 0.5, { type: 'sine', vol: 0.2, slideTo: 30 }); },
    villager: () => { tone(320, 0.12, { type: 'triangle', vol: 0.08, slideTo: 240 }); tone(260, 0.15, { type: 'triangle', vol: 0.08, delay: 0.12, slideTo: 200 }); },
    portal: () => { for (let i = 0; i < 6; i++) tone(200 + i * 60, 0.4, { type: 'sine', vol: 0.04, delay: i * 0.1, slideTo: 600 + i * 80 }); },
    levelup: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { delay: i * 0.1, vol: 0.05 })),
    pop: () => tone(900, 0.06, { vol: 0.05, slideTo: 1400 }),
    zombie: () => { tone(120, 0.7, { type: 'sawtooth', vol: 0.05, slideTo: 80 }); tone(95, 0.6, { type: 'sawtooth', vol: 0.04, delay: 0.3, slideTo: 70 }); },
    skeleton: () => { for (let i = 0; i < 5; i++) noise(0.04, { vol: 0.12, delay: i * 0.07, lowpass: 3000 }); },
    lava: () => { noise(0.5, { vol: 0.15, lowpass: 700 }); tone(300, 0.3, { type: 'square', vol: 0.04, slideTo: 150 }); },
  };

  function play(name) {
    if (muted || !sounds[name]) return;
    if (!ensure()) return;
    try { sounds[name](); } catch (e) { /* audio is best-effort */ }
  }

  function setMuted(value) {
    muted = value;
    const s = BQ.Storage.getSettings();
    s.muted = value;
    BQ.Storage.saveSettings(s);
  }

  return { play, setMuted, isMuted: () => muted, unlock: ensure };
})();
