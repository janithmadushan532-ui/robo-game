import { MonsterPowerId, PowerId } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private noiseBuffer: AudioBuffer | null = null;

  public setSettings(sound: boolean, music: boolean) {
    this.soundEnabled = sound;
    this.musicEnabled = music;
    if (!music) {
      this.stopMusic();
    } else if (this.ctx && this.musicTimer === null) {
      this.startMusic();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.buildNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private buildNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  public unlockAndStartMusic() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.musicEnabled && this.musicTimer === null) {
      this.startMusic();
    }
  }

  public startMusic() {
    if (!this.musicEnabled || this.musicTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Cinematic dark cyber-arena synth bassline & arpeggio
    const bassNotes = [55, 55, 65.41, 73.42, 55, 55, 82.41, 73.42]; // A1, C2, D2, E2
    const arpNotes = [220, 261.63, 329.63, 440, 329.63, 261.63, 293.66, 392];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const step = this.musicStep % 8;
      this.musicStep++;

      // Bass pulse
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassNotes[step], now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 0.22);

      bassGain.gain.setValueAtTime(0.055, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      bassOsc.connect(filter);
      filter.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.25);

      // Subtle high arp on even beats
      if (step % 2 === 0) {
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'triangle';
        arpOsc.frequency.setValueAtTime(arpNotes[step], now);
        arpGain.gain.setValueAtTime(0.022, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        arpOsc.connect(arpGain);
        arpGain.connect(this.ctx.destination);
        arpOsc.start(now);
        arpOsc.stop(now + 0.22);
      }
    }, 230);
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.2,
    delay = 0,
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private playNoise(duration: number, filterFreq: number, filterType: BiquadFilterType, volume = 0.25, delay = 0) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + duration);
  }

  public playUiClick() {
    this.playTone(540, 760, 0.06, 'triangle', 0.12);
  }

  public playMcqCorrect() {
    this.playTone(523.25, 523.25, 0.12, 'triangle', 0.18, 0);
    this.playTone(659.25, 659.25, 0.12, 'triangle', 0.18, 0.09);
    this.playTone(783.99, 1046.5, 0.26, 'sine', 0.2, 0.18);
  }

  public playMcqWrong() {
    this.playTone(220, 160, 0.2, 'sawtooth', 0.15, 0);
    this.playTone(155, 95, 0.3, 'sawtooth', 0.16, 0.16);
  }

  public playHit(heavy = false, crit = false) {
    if (heavy || crit) {
      this.playTone(150, 42, 0.22, 'sawtooth', 0.32);
      this.playNoise(0.18, 700, 'lowpass', 0.32);
      if (crit) {
        this.playTone(880, 1320, 0.12, 'triangle', 0.18);
      }
    } else {
      this.playTone(210, 65, 0.12, 'square', 0.2);
      this.playNoise(0.09, 1200, 'bandpass', 0.22);
    }
  }

  public playBlock() {
    this.playTone(620, 420, 0.11, 'square', 0.18);
    this.playTone(980, 740, 0.14, 'triangle', 0.14);
  }

  public playDodge() {
    this.playNoise(0.14, 1800, 'bandpass', 0.18);
    this.playTone(300, 680, 0.12, 'sine', 0.12);
  }

  public playJump() {
    this.playTone(220, 460, 0.14, 'sine', 0.14);
  }

  public playBossRoar() {
    this.playTone(130, 52, 0.65, 'sawtooth', 0.28);
    this.playTone(95, 42, 0.7, 'square', 0.16, 0.05);
    this.playNoise(0.5, 420, 'lowpass', 0.25);
  }

  public playPowerTransferFlight(isPlayer: boolean) {
    if (isPlayer) {
      this.playTone(440, 1180, 0.35, 'sine', 0.16);
      this.playTone(660, 1480, 0.28, 'triangle', 0.12, 0.08);
    } else {
      this.playTone(320, 110, 0.38, 'sawtooth', 0.16);
      this.playTone(210, 85, 0.32, 'square', 0.12, 0.08);
    }
  }

  public playPowerUpgrade() {
    this.playTone(440, 660, 0.12, 'triangle', 0.18, 0);
    this.playTone(660, 880, 0.14, 'triangle', 0.18, 0.08);
    this.playTone(880, 1320, 0.24, 'sine', 0.22, 0.16);
  }

  public playPlayerPower(power: PowerId) {
    switch (power) {
      case 'fire':
        this.playNoise(0.35, 650, 'lowpass', 0.3);
        this.playTone(320, 90, 0.3, 'sawtooth', 0.22);
        break;
      case 'ice':
        this.playTone(1400, 880, 0.16, 'sine', 0.18);
        this.playTone(2100, 1100, 0.22, 'triangle', 0.14, 0.06);
        this.playNoise(0.18, 3200, 'highpass', 0.15);
        break;
      case 'lightning':
        this.playNoise(0.16, 2600, 'bandpass', 0.28);
        this.playTone(920, 180, 0.18, 'sawtooth', 0.24);
        break;
      case 'thunder':
        this.playTone(180, 38, 0.45, 'sawtooth', 0.34);
        this.playNoise(0.45, 500, 'lowpass', 0.35);
        break;
      case 'earth':
      case 'ground_shockwave':
        this.playTone(110, 45, 0.38, 'triangle', 0.34);
        this.playNoise(0.35, 340, 'lowpass', 0.34);
        break;
      case 'wind':
        this.playNoise(0.32, 1600, 'bandpass', 0.25);
        this.playTone(340, 720, 0.22, 'sine', 0.14);
        break;
      case 'shield':
        this.playTone(440, 880, 0.25, 'sine', 0.2);
        this.playTone(660, 1320, 0.25, 'triangle', 0.14, 0.08);
        break;
      case 'super_punch':
        this.playTone(260, 55, 0.26, 'sawtooth', 0.3);
        this.playNoise(0.2, 950, 'lowpass', 0.28, 0.06);
        break;
      case 'energy_blast':
        this.playTone(540, 1100, 0.16, 'sawtooth', 0.18);
        this.playTone(880, 220, 0.28, 'sine', 0.22, 0.12);
        break;
      case 'laser_blast':
        this.playTone(1650, 420, 0.18, 'sawtooth', 0.22);
        this.playTone(2100, 740, 0.14, 'sine', 0.14, 0.03);
        break;
      case 'rocket_attack':
        this.playNoise(0.28, 950, 'bandpass', 0.24);
        this.playTone(190, 520, 0.22, 'sawtooth', 0.2);
        this.playNoise(0.3, 450, 'lowpass', 0.3, 0.2);
        break;
      case 'speed_boost':
        this.playTone(380, 1240, 0.28, 'sine', 0.2);
        this.playTone(560, 1600, 0.24, 'triangle', 0.15, 0.07);
        break;
      case 'plasma_cannon':
        this.playTone(260, 720, 0.22, 'sawtooth', 0.22);
        this.playTone(440, 90, 0.38, 'square', 0.24, 0.1);
        this.playNoise(0.32, 600, 'lowpass', 0.28, 0.12);
        break;
      case 'meteor_strike':
        this.playTone(480, 110, 0.32, 'sawtooth', 0.24);
        this.playTone(140, 42, 0.45, 'sawtooth', 0.32, 0.18);
        this.playNoise(0.42, 480, 'lowpass', 0.34, 0.18);
        break;
      case 'healing_power':
        this.playTone(523.25, 783.99, 0.24, 'sine', 0.2);
        this.playTone(659.25, 1046.5, 0.3, 'triangle', 0.16, 0.1);
        break;
      case 'ultimate_energy_blast':
        this.playTone(320, 1280, 0.28, 'sawtooth', 0.24);
        this.playTone(180, 48, 0.45, 'square', 0.28, 0.1);
        this.playNoise(0.38, 900, 'lowpass', 0.3, 0.1);
        break;
      case 'thunder_storm':
        this.playNoise(0.55, 1200, 'bandpass', 0.34);
        this.playTone(220, 38, 0.5, 'sawtooth', 0.34);
        this.playTone(1200, 300, 0.22, 'sawtooth', 0.2, 0.12);
        break;
      case 'mega_laser':
        this.playTone(1900, 320, 0.34, 'sawtooth', 0.28);
        this.playTone(900, 160, 0.36, 'square', 0.22, 0.04);
        this.playNoise(0.28, 1600, 'bandpass', 0.24);
        break;
      case 'dragon_fire':
        this.playNoise(0.45, 580, 'lowpass', 0.34);
        this.playTone(280, 72, 0.38, 'sawtooth', 0.28);
        this.playTone(420, 110, 0.28, 'triangle', 0.18, 0.08);
        break;
      case 'ice_explosion':
        this.playTone(1700, 620, 0.24, 'sine', 0.22);
        this.playNoise(0.32, 3400, 'highpass', 0.24);
        this.playTone(240, 65, 0.3, 'triangle', 0.26, 0.06);
        break;
      case 'shadow_strike':
        this.playNoise(0.22, 2200, 'bandpass', 0.24);
        this.playTone(620, 140, 0.2, 'sawtooth', 0.26);
        this.playTone(980, 220, 0.16, 'triangle', 0.18, 0.05);
        break;
      case 'giant_energy_wave':
        this.playTone(150, 48, 0.44, 'sawtooth', 0.34);
        this.playNoise(0.4, 520, 'lowpass', 0.32);
        break;
      case 'meteor_rain':
        this.playTone(540, 95, 0.38, 'sawtooth', 0.26);
        this.playNoise(0.55, 420, 'lowpass', 0.36, 0.12);
        this.playTone(140, 36, 0.5, 'sawtooth', 0.34, 0.22);
        break;
      case 'super_shield':
        this.playTone(480, 960, 0.3, 'sine', 0.24);
        this.playTone(720, 1440, 0.32, 'triangle', 0.18, 0.08);
        break;
      case 'rage_mode':
        this.playTone(110, 340, 0.38, 'sawtooth', 0.3);
        this.playTone(165, 520, 0.32, 'square', 0.18, 0.08);
        break;
      case 'time_slow':
        this.playTone(1100, 180, 0.48, 'sine', 0.24);
        this.playTone(880, 140, 0.48, 'triangle', 0.18, 0.06);
        break;
      case 'teleport_attack':
        this.playTone(980, 240, 0.14, 'sine', 0.2);
        this.playNoise(0.14, 2400, 'highpass', 0.18);
        this.playTone(260, 75, 0.2, 'sawtooth', 0.28, 0.08);
        break;
      case 'hero_surge':
        this.playTone(360, 960, 0.16, 'triangle', 0.22);
        this.playTone(220, 75, 0.22, 'sawtooth', 0.22, 0.04);
        this.playNoise(0.16, 1400, 'bandpass', 0.18, 0.02);
        break;
      case 'ultimate':
        this.playTone(220, 880, 0.25, 'sawtooth', 0.24);
        this.playTone(160, 36, 0.65, 'sawtooth', 0.36, 0.18);
        this.playNoise(0.6, 800, 'lowpass', 0.36, 0.18);
        break;
    }
  }

  public playPhaseShift() {
    this.playTone(90, 260, 0.45, 'sawtooth', 0.3);
    this.playTone(140, 48, 0.55, 'square', 0.22, 0.1);
    this.playNoise(0.45, 500, 'lowpass', 0.3, 0.08);
  }

  public playWaveIncoming() {
    this.playTone(330, 495, 0.2, 'triangle', 0.22, 0);
    this.playTone(440, 660, 0.28, 'triangle', 0.22, 0.12);
  }

  public playMonsterPower(power: MonsterPowerId) {
    this.playTone(140, 55, 0.32, 'sawtooth', 0.26);
    if (power === 'm_ultimate' || power === 'm_special') {
      this.playNoise(0.42, 600, 'lowpass', 0.3, 0.06);
    } else {
      this.playNoise(0.2, 1100, 'bandpass', 0.22);
    }
  }

  public playVictory() {
    this.playTone(523.25, 523.25, 0.14, 'triangle', 0.22, 0);
    this.playTone(659.25, 659.25, 0.14, 'triangle', 0.22, 0.12);
    this.playTone(783.99, 783.99, 0.14, 'triangle', 0.22, 0.24);
    this.playTone(1046.5, 1046.5, 0.45, 'sine', 0.25, 0.36);
  }

  public playDefeat() {
    this.playTone(392, 349, 0.2, 'sawtooth', 0.16, 0);
    this.playTone(311, 261, 0.22, 'sawtooth', 0.16, 0.2);
    this.playTone(233, 130, 0.45, 'sawtooth', 0.18, 0.42);
  }
}

export const soundEngine = new SoundEngine();
