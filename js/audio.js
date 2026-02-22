/**
 * audio.js
 * AudioManager — procedurally generated sounds using Web Audio API.
 * No audio files required. All sounds are synthesized in real-time.
 */
class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this._engineOsc = null;
    this._engineOsc2 = null;
    this._engineGain = null;
    this._engineRunning = false;
    this._initialized = false;
    this._muted = false;
  }

  /** Initialize AudioContext on first user gesture. */
  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  /** @param {number} speedPercent */
  startEngine(speedPercent) {
    if (!this._initialized || !this.ctx || this._muted) return;
    if (this._engineRunning) return;

    const ctx = this.ctx;
    this._engineOsc = ctx.createOscillator();
    this._engineOsc.type = 'sawtooth';

    this._engineOsc2 = ctx.createOscillator();
    this._engineOsc2.type = 'square';

    this._engineGain = ctx.createGain();
    this._engineGain.gain.value = 0.08;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    this._engineOsc.connect(filter);
    this._engineOsc2.connect(filter);
    filter.connect(this._engineGain);
    this._engineGain.connect(ctx.destination);

    const freq = this._speedToFreq(speedPercent);
    this._engineOsc.frequency.value = freq;
    this._engineOsc2.frequency.value = freq * 1.5;

    this._engineOsc.start();
    this._engineOsc2.start();
    this._engineRunning = true;
  }

  /** @param {number} speedPercent */
  updateEngine(speedPercent) {
    if (!this._initialized || !this.ctx || !this._engineRunning || this._muted) return;
    const freq = Math.max(0.001, this._speedToFreq(speedPercent));
    const now = this.ctx.currentTime;
    this._engineOsc.frequency.cancelScheduledValues(now);
    this._engineOsc.frequency.setValueAtTime(this._engineOsc.frequency.value, now);
    this._engineOsc.frequency.exponentialRampToValueAtTime(Math.max(0.001, freq), now + 0.1);
    this._engineOsc2.frequency.cancelScheduledValues(now);
    this._engineOsc2.frequency.setValueAtTime(this._engineOsc2.frequency.value, now);
    this._engineOsc2.frequency.exponentialRampToValueAtTime(Math.max(0.001, freq * 1.5), now + 0.1);
  }

  stopEngine() {
    if (!this._engineRunning) return;
    try {
      this._engineOsc.stop();
      this._engineOsc2.stop();
    } catch (_) {}
    this._engineRunning = false;
    this._engineOsc = null;
    this._engineOsc2 = null;
    this._engineGain = null;
  }

  /** Crash noise burst. */
  playCrash() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufLen = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.8;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const distort = ctx.createWaveShaper();
    distort.curve = this._makeDistortionCurve(400);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    src.connect(distort);
    distort.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.4);
  }

  /** Tire screech on crash. */
  playCrashScreech() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  /** Level complete jingle. */
  playLevelComplete() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const notes = [523, 659, 784, 1047];
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      this._playNote('square', freq, now + i * 0.15, 0.15, 0.12);
    });
  }

  /** Countdown beep. */
  playCountdownBeep() {
    if (!this._initialized || !this.ctx || this._muted) return;
    this._playNote('square', 880, this.ctx.currentTime, 0.1, 0.15);
  }

  /** Checkpoint reached — two ascending notes. */
  playCheckpointBeep() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const now = this.ctx.currentTime;
    this._playNote('square', 660, now, 0.1, 0.15);
    this._playNote('square', 880, now + 0.12, 0.15, 0.15);
  }

  /** Celebration fanfare. */
  playCelebrationFanfare() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const now = this.ctx.currentTime;
    const melody = [523, 659, 784, 1047, 784, 659, 523];
    melody.forEach((freq, i) => {
      this._playNote('square', freq, now + i * 0.12, 0.12, 0.15);
    });
    [523, 659, 784].forEach(freq => {
      this._playNote('sawtooth', freq, now + melody.length * 0.12, 0.4, 0.08);
    });
  }

  /** Game over descending sound. */
  playGameOver() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 370, 311, 261];
    notes.forEach((freq, i) => {
      this._playNote('sawtooth', freq, now + i * 0.2, 0.2, 0.1);
    });
  }

  // ── Private ──

  _speedToFreq(t) {
    return CONSTANTS.ENGINE_FREQ_MIN + (CONSTANTS.ENGINE_FREQ_MAX - CONSTANTS.ENGINE_FREQ_MIN) * Math.pow(Math.max(0, t), 0.6);
  }

  _playNote(type, freq, startTime, duration, volume) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = Math.max(0.001, freq);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  _makeDistortionCurve(amount) {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
}
