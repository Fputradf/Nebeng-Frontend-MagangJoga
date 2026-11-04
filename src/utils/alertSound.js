/**
 * Emergency Alarm Sound Generator menggunakan browser Web Audio API.
 * Tidak membutuhkan file MP3 eksternal, bebas error 404, dan bekerja di semua browser modern.
 */

class AlertSoundPlayer {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playBeep(freq = 880, duration = 0.25, type = 'sawtooth') {
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Volume envelope untuk suara alarm tajam
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('[AlertSoundPlayer] Failed playing tone:', err);
    }
  }

  startEmergencySiren() {
    if (this.isPlaying) return;
    this.initContext();
    if (!this.audioCtx) return;

    this.isPlaying = true;
    let high = true;

    // Pola nada sirine darurat dua nada (880Hz & 659Hz)
    const playTone = () => {
      if (!this.isPlaying) return;
      this.playBeep(high ? 920 : 660, 0.22, 'square');
      high = !high;
    };

    playTone();
    this.intervalId = setInterval(playTone, 320);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const alertSoundPlayer = new AlertSoundPlayer();
export default alertSoundPlayer;

