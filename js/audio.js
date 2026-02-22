/**
 * audio.js
 * AudioManager — procedurally generated sounds using Web Audio API.
 * No audio files required. All sounds are synthesized in real-time.
 */
class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;

    /** @type {OscillatorNode|null} Engine oscillator */
    this._engineOsc = null;
    /** @type {GainNode|null} Engine gain */
    this._engineGain = null;
    /** @type {boolean} */
    this._engineRunning = false;
    /** @type {boolean} */
    this._initialized = false;
    /** @type {boolean} */
    this._muted = false;
  }

  /**
   * Initialize AudioContext on first user gesture (browser autoplay policy).
   */
  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  /**
   * Start the continuous engine hum.
   * @param {number} speedPercent - 0.0 to 1.0
   */
  startEngine(speedPercent) {
    if (!this._initialized || !this.ctx || this._muted) return;
    if (this._engineRunning) return;

    const ctx = this.ctx;
    this._engineOsc = ctx.createOscillator();
    this._engineOsc.type = 'sawtooth';

    // Secondary harmonic oscillator for richer engine sound
    this._engineOsc2 = ctx.createOscillator();
    this._engineOsc2.type = 'square';

    this._engineGain = ctx.createGain();
    this._engineGain.gain.value = 0.08;

    // Low-pass filter to soften sawtooth
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

  /**
   * Update engine pitch based on current speed.
   * @param {number} speedPercent - 0.0 to 1.0
   */
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

  /**
   * Stop the engine hum.
   */
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

  /**
   * Play crash/collision sound — distorted noise burst.
   */
  playCrash() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // White noise via buffer
    const bufLen = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.8;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Distortion via wave shaper
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

  /**
   * Play level complete jingle.
   */
  playLevelComplete() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const ctx = this.ctx;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      this._playNote('square', freq, now + i * 0.15, 0.15, 0.12);
    });
  }

  /**
   * Play countdown beep.
   */
  playCountdownBeep() {
    if (!this._initialized || !this.ctx || this._muted) return;
    this._playNote('square', 880, this.ctx.currentTime, 0.1, 0.15);
  }

  /**
   * Play celebration fanfare (win screen).
   */
  playCelebrationFanfare() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // C major arpeggio then chord
    const melody = [523, 659, 784, 1047, 784, 659, 523];
    melody.forEach((freq, i) => {
      this._playNote('square', freq, now + i * 0.12, 0.12, 0.15);
    });
    // Final chord
    [523, 659, 784].forEach(freq => {
      this._playNote('sawtooth', freq, now + melody.length * 0.12, 0.4, 0.08);
    });
  }

  /**
   * Play a game-over descending sound.
   */
  playGameOver() {
    if (!this._initialized || !this.ctx || this._muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [440, 370, 311, 261];
    notes.forEach((freq, i) => {
      this._playNote('sawtooth', freq, now + i * 0.2, 0.2, 0.1);
    });
  }

  // ---- Private helpers ----

  /**
   * Map speed (0–1) to engine frequency.
   * @param {number} t
   * @returns {number}
   */
  _speedToFreq(t) {
    return CONSTANTS.ENGINE_FREQ_MIN + (CONSTANTS.ENGINE_FREQ_MAX - CONSTANTS.ENGINE_FREQ_MIN) * Math.pow(Math.max(0, t), 0.6);
  }

  /**
   * Play a single note.
   * @param {string} type - Oscillator type
   * @param {number} freq - Frequency in Hz
   * @param {number} startTime - AudioContext time
   * @param {number} duration - Duration in seconds
   * @param {number} volume - Gain (0–1)
   */
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

  /**
   * Generate a distortion curve for WaveShaper.
   * @param {number} amount
   * @returns {Float32Array}
   */
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
