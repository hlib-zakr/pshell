export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  tick() {
    this._beep(800, 0.03, 'sine', 0.04);
  }

  success() {
    this._beep(523, 0.1, 'square', 0.07);
    setTimeout(() => this._beep(659, 0.1, 'square', 0.07), 80);
  }

  danger() {
    this._beep(200, 0.15, 'sawtooth', 0.1);
    setTimeout(() => this._beep(250, 0.12, 'sawtooth', 0.08), 100);
  }

  achievement() {
    this._beep(523, 0.08, 'sine', 0.06);
    setTimeout(() => this._beep(659, 0.08, 'sine', 0.06), 60);
    setTimeout(() => this._beep(784, 0.12, 'sine', 0.06), 120);
    setTimeout(() => this._beep(1047, 0.15, 'sine', 0.05), 200);
  }

  gameOver() {
    this._beep(440, 0.15, 'square', 0.08);
    setTimeout(() => this._beep(330, 0.15, 'square', 0.08), 150);
    setTimeout(() => this._beep(220, 0.3, 'square', 0.08), 300);
  }

  _beep(frequency, duration, type, volume) {
    if (!this.ctx || !this.enabled) return;
    try {
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(this.ctx.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      oscillator.stop(this.ctx.currentTime + duration + 0.01);
    } catch (e) {
      // Audio might fail in some browsers, that's fine
    }
  }
}
