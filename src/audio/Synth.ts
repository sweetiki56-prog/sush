// All sound is synthesized with WebAudio: no audio files, no licensing questions.
import { settings, updateSettings } from '../core/Settings';

export class Synth {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private fireGain: GainNode | null = null;
  get muted(): boolean {
    return settings().muted;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.applyVolume();
    this.master.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.wind();
    this.fire();
    this.onStart?.();
  }

  /** Called once sound starts (the music waits for it). */
  onStart: (() => void) | null = null;

  /** The audio graph for the music (null until the first user gesture starts sound). */
  get audio(): { ctx: AudioContext; out: GainNode; noise: AudioBuffer } | null {
    return this.ctx ? { ctx: this.ctx, out: this.master, noise: this.noise } : null;
  }

  toggleMute(): boolean {
    updateSettings({ muted: !this.muted });
    this.applyVolume();
    return this.muted;
  }

  /** Re-read mute and volume from settings. */
  applyVolume(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : settings().volume;
  }

  private src(loop = false): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = loop;
    return s;
  }

  private wind(): void {
    const ctx = this.ctx!;
    const s = this.src(true);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 0.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(f.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.07;
    const gl = ctx.createOscillator();
    gl.frequency.value = 0.13;
    const glg = ctx.createGain();
    glg.gain.value = 0.035;
    gl.connect(glg).connect(g.gain);
    s.connect(f).connect(g).connect(this.master);
    s.start();
    lfo.start();
    gl.start();
  }

  private fire(): void {
    const ctx = this.ctx!;
    const s = this.src(true);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    s.connect(f).connect(this.fireGain).connect(this.master);
    s.start();
  }

  /** 0 = far from the campfire, 1 = standing next to it. */
  setFire(level: number): void {
    if (!this.ctx || !this.fireGain) return;
    const crackle = level * (0.02 + Math.random() * 0.05 * (Math.random() < 0.15 ? 3 : 1));
    this.fireGain.gain.setTargetAtTime(crackle, this.ctx.currentTime, 0.03);
  }

  private burst(freq: number, dur: number, vol: number, type: BiquadFilterType = 'lowpass'): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const s = this.src();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 1.5, dur + 0.05);
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'square', delay = 0, slideTo?: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    const t = ctx.currentTime + delay;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  step(onHard: boolean): void {
    this.burst(onHard ? 1400 : 700 + Math.random() * 200, 0.07, onHard ? 0.12 : 0.16);
  }
  click(): void {
    this.tone(1300, 0.03, 0.05);
  }
  success(): void {
    this.tone(660, 0.12, 0.06, 'square');
    this.tone(990, 0.18, 0.06, 'square', 0.1);
  }
  fail(): void {
    this.tone(160, 0.3, 0.08, 'sawtooth', 0, 90);
  }
  quest(): void {
    this.tone(523, 0.1, 0.05, 'triangle');
    this.tone(784, 0.1, 0.05, 'triangle', 0.1);
    this.tone(1046, 0.25, 0.05, 'triangle', 0.2);
  }
  pickup(): void {
    this.tone(880, 0.06, 0.05, 'square');
    this.tone(1320, 0.08, 0.04, 'square', 0.05);
  }
  creak(): void {
    this.tone(90, 0.8, 0.06, 'sawtooth', 0, 140);
    this.burst(3000, 0.5, 0.05, 'bandpass');
  }
  water(): void {
    for (let i = 0; i < 6; i++) setTimeout(() => this.burst(2500 + Math.random() * 2000, 0.25, 0.08, 'bandpass'), i * 120);
  }
  // ---------- combat ----------
  shot(): void {
    this.burst(900, 0.18, 0.35);
    this.burst(4000, 0.06, 0.15, 'highpass');
    this.tone(70, 0.2, 0.12, 'sine', 0, 40);
  }
  /** Gun sound by weapon: a nail gun clacks, a shotgun booms low, the sparker crackles. */
  gun(weapon: string): void {
    if (weapon === 'shotgun') {
      this.burst(500, 0.3, 0.45);
      this.tone(55, 0.3, 0.16, 'sine', 0, 30);
    } else if (weapon === 'nailgun') {
      this.burst(2600, 0.07, 0.25, 'highpass');
      this.tone(420, 0.05, 0.06, 'square', 0, 200);
    } else if (weapon === 'sparker') {
      this.tone(1600, 0.18, 0.08, 'sawtooth', 0, 300);
      this.burst(6000, 0.12, 0.12, 'highpass');
    } else if (weapon === 'longsight') {
      this.burst(700, 0.26, 0.4);
      this.tone(60, 0.35, 0.14, 'sine', 0, 35);
    } else this.shot();
  }

  swing(): void {
    this.burst(1800, 0.12, 0.08, 'bandpass');
  }
  hiss(): void {
    this.burst(5200, 0.25, 0.06, 'bandpass');
    for (let i = 0; i < 3; i++) this.tone(2400 + i * 300, 0.03, 0.02, 'square', i * 0.05);
  }
  hit(): void {
    this.burst(300, 0.12, 0.25);
  }
  miss(): void {
    this.burst(2600, 0.1, 0.05, 'bandpass');
  }
  boom(): void {
    this.burst(180, 1.2, 0.6);
    this.tone(55, 0.9, 0.2, 'sine', 0, 30);
  }
  death(): void {
    this.tone(220, 0.5, 0.06, 'sawtooth', 0, 60);
  }
  combatStart(): void {
    this.tone(196, 0.18, 0.07, 'sawtooth');
    this.tone(185, 0.18, 0.07, 'sawtooth', 0.16);
    this.tone(147, 0.4, 0.07, 'sawtooth', 0.32);
  }
  turn(): void {
    this.tone(740, 0.05, 0.04, 'square');
  }
}

export const synth = new Synth();
