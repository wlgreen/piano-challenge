// audio.js — Web Audio API piano tone synthesis + sound effects
'use strict';

const Audio = (() => {
  let ctx = null;
  let initialized = false;

  // Note frequencies (A4 = 440 Hz, equal temperament)
  const NOTE_FREQ = {};
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let oct = 0; oct <= 8; oct++) {
    for (let i = 0; i < 12; i++) {
      const midi = oct * 12 + i + 12;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      NOTE_FREQ[NOTE_NAMES[i] + oct] = freq;
    }
  }

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    initialized = true;
  }

  function ensureResumed() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // First user interaction handler
  function handleFirstTouch() {
    init();
    ensureResumed();
  }

  // ─── Piano tone synthesis ───────────────────────────────
  // Triangle + sine blend with ADSR envelope
  function playNote(noteName, duration) {
    if (!ctx) init();
    ensureResumed();
    const freq = NOTE_FREQ[noteName];
    if (!freq) return;

    duration = duration || 0.8;
    const now = ctx.currentTime;

    // ADSR parameters
    const attack = 0.02;
    const decay = 0.1;
    const sustainLevel = 0.6;
    const release = 0.3;

    // Master gain for this note
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.35, now + attack);
    master.gain.linearRampToValueAtTime(0.35 * sustainLevel, now + attack + decay);
    master.gain.setValueAtTime(0.35 * sustainLevel, now + duration - release);
    master.gain.linearRampToValueAtTime(0, now + duration);
    master.connect(ctx.destination);

    // Triangle wave (main body)
    const tri = ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.setValueAtTime(freq, now);
    const triGain = ctx.createGain();
    triGain.gain.value = 0.7;
    tri.connect(triGain);
    triGain.connect(master);
    tri.start(now);
    tri.stop(now + duration + 0.05);

    // Sine wave (warmth)
    const sine = ctx.createOscillator();
    sine.type = 'sine';
    sine.frequency.setValueAtTime(freq, now);
    const sineGain = ctx.createGain();
    sineGain.gain.value = 0.3;
    sine.connect(sineGain);
    sineGain.connect(master);
    sine.start(now);
    sine.stop(now + duration + 0.05);

    // Slight overtone for brightness
    const over = ctx.createOscillator();
    over.type = 'sine';
    over.frequency.setValueAtTime(freq * 2, now);
    const overGain = ctx.createGain();
    overGain.gain.value = 0.08;
    over.connect(overGain);
    overGain.connect(master);
    over.start(now);
    over.stop(now + duration + 0.05);

    return { stop: () => master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05) };
  }

  // ─── Sound Effects ──────────────────────────────────────

  function playSFX(type) {
    if (!ctx) init();
    ensureResumed();
    switch (type) {
      case 'coin': _playCoinDing(); break;
      case 'success': _playSuccessArpeggio(); break;
      case 'star': _playStarSparkle(); break;
      case 'error': _playGentleError(); break;
      case 'fanfare': _playFanfare(); break;
      case 'click': _playClick(); break;
      case 'levelup': _playLevelUp(); break;
    }
  }

  function _playCoinDing() {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  function _playSuccessArpeggio() {
    const notes = ['C5', 'E5', 'G5', 'C6'];
    notes.forEach((n, i) => {
      setTimeout(() => playNote(n, 0.3), i * 100);
    });
  }

  function _playStarSparkle() {
    const now = ctx.currentTime;
    [1600, 2000, 2400].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }

  function _playGentleError() {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.linearRampToValueAtTime(0, now + 0.25);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  function _playFanfare() {
    const notes = ['C5', 'C5', 'C5', 'E5', 'G5', 'E5', 'G5', 'C6'];
    const times = [0, 120, 240, 360, 480, 600, 720, 850];
    notes.forEach((n, i) => {
      setTimeout(() => playNote(n, 0.25), times[i]);
    });
  }

  function _playClick() {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function _playLevelUp() {
    const notes = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'];
    notes.forEach((n, i) => {
      setTimeout(() => playNote(n, 0.2), i * 80);
    });
  }

  // Play a sequence of notes with timing
  function playMelody(noteNames, interval) {
    interval = interval || 500;
    noteNames.forEach((n, i) => {
      setTimeout(() => playNote(n, interval / 1000 * 0.9), i * interval);
    });
  }

  function getFrequency(noteName) {
    return NOTE_FREQ[noteName] || 0;
  }

  return {
    init,
    handleFirstTouch,
    playNote,
    playSFX,
    playMelody,
    getFrequency,
    get noteNames() { return NOTE_NAMES; },
  };
})();
