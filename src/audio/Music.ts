// The score of «Сушь», synthesized with WebAudio like every other sound: no audio files, all melodies our own.
// An adventure-orchestra palette (brass, strings, timpani, snare, a plucked desert guitar) on a lookahead
// scheduler; tracks crossfade when the scene changes. Themes: the road (a march), a town, a fight, the menu.
import { settings } from '../core/Settings';
import { synth } from './Synth';

type Voice = 'brass' | 'strings' | 'tuba' | 'pluck' | 'timpani' | 'snare' | 'shaker';

/** A note: pitch name (or MIDI), first 16th, length in 16ths, volume. */
type Note = [string | number, number, number, number?];

interface Track {
  bpm: number;
  bars: number;
  /** Everything that sounds in one bar (16 steps), by bar number within the loop. */
  bar: (i: number) => { voice: Voice; notes: Note[] }[];
}

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n: string | number): number {
  if (typeof n === 'number') return n;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n)!;
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = (n: string | number) => 440 * 2 ** ((midi(n) - 69) / 12);

// ---- the road: a march in D minor that lifts to its own dominant (our tune, not anyone else's) ----
const ROAD_CHORDS = [['D3', 'F3', 'A3'], ['D3', 'F3', 'A3'], ['Bb2', 'D3', 'F3'], ['C3', 'E3', 'G3'], ['D3', 'F3', 'A3'], ['F2', 'A2', 'C3'], ['G2', 'Bb2', 'D3'], ['A2', 'C#3', 'E3']];
const ROAD_BASS = ['D2', 'D2', 'Bb1', 'C2', 'D2', 'F1', 'G1', 'A1'];
const ROAD_FIFTH = ['A1', 'A1', 'F1', 'G1', 'A1', 'C2', 'D2', 'E2'];
const ROAD_TUNE: Note[][] = [
  [['D4', 0, 6], ['A4', 6, 2], ['A4', 8, 4], ['G4', 12, 2], ['F4', 14, 2]],
  [['E4', 0, 4], ['F4', 4, 4], ['D4', 8, 8]],
  [['D5', 0, 6], ['C5', 6, 2], ['Bb4', 8, 4], ['A4', 12, 4]],
  [['G4', 0, 4], ['A4', 4, 2], ['G4', 6, 2], ['E4', 8, 8]],
  [['D4', 0, 2], ['F4', 2, 2], ['A4', 4, 4], ['D5', 8, 6], ['C5', 14, 2]],
  [['C5', 0, 4], ['A4', 4, 4], ['F4', 8, 4], ['A4', 12, 4]],
  [['Bb4', 0, 6], ['A4', 6, 2], ['G4', 8, 4], ['F4', 12, 2], ['G4', 14, 2]],
  [['A4', 0, 12], ['E4', 12, 2], ['C#5', 14, 2]],
];
const up = (notes: Note[], semis: number): Note[] => notes.map(([n, s, l, v]) => [midi(n) + semis, s, l, v]);
const chord = (c: (string | number)[], at: number[], len: number, vol: number): Note[] => at.flatMap((s) => c.map((n): Note => [n, s, len, vol]));

const ROAD: Track = {
  bpm: 100,
  bars: 16,
  bar: (i) => {
    const b = i % 8;
    const second = i >= 8; // the second pass: strings take the tune, brass answers with fanfare hits
    const roll = b === 3 || b === 7;
    return [
      { voice: 'tuba', notes: [[ROAD_BASS[b], 0, 6, 0.9], [ROAD_FIFTH[b], 8, 6, 0.8]] },
      { voice: 'timpani', notes: [[ROAD_BASS[b], 0, 8, 1], [ROAD_FIFTH[b], 8, 8, 0.7], ...(roll ? [[ROAD_FIFTH[b], 14, 2, 0.6] as Note] : [])] },
      { voice: 'snare', notes: roll ? [[0, 4, 1, 0.8], [0, 12, 1, 0.5], [0, 13, 1, 0.55], [0, 14, 1, 0.6], [0, 15, 1, 0.7]] : [[0, 4, 1, 0.8], [0, 10, 1, 0.3], [0, 12, 1, 0.8]] },
      { voice: 'shaker', notes: [0, 2, 4, 6, 8, 10, 12, 14].map((s): Note => [0, s, 1, s % 4 ? 0.3 : 0.5]) },
      { voice: 'strings', notes: second ? up(ROAD_TUNE[b], 12) : chord(ROAD_CHORDS[b], [0], 16, 0.35) },
      { voice: 'brass', notes: second ? chord(ROAD_CHORDS[b].map((n) => midi(n) + 12), [0, 6], 3, 0.45) : ROAD_TUNE[b] },
    ];
  },
};

// ---- a town: a plucked guitar over a drone, a hint of the Phrygian heat ----
const TOWN_CHORDS = [['A3', 'C4', 'E4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['A3', 'C4', 'E4'], ['D3', 'F3', 'A3'], ['E3', 'G#3', 'B3'], ['E3', 'G#3', 'B3']];
const TOWN_TUNE: Note[][] = [[['E5', 0, 8], ['D5', 8, 4], ['C5', 12, 4]], [['B4', 0, 12]], [['C5', 0, 4], ['A4', 4, 12]], [['B4', 0, 6], ['D5', 6, 10]], [['E5', 0, 6], ['G5', 6, 2], ['F5', 8, 8]], [['E5', 0, 4], ['D5', 4, 12]], [['C5', 0, 4], ['B4', 4, 4], ['G#4', 8, 8]], [['A4', 0, 16]]];
const TOWN: Track = {
  bpm: 72,
  bars: 16,
  bar: (i) => {
    const b = i % 8;
    const c = TOWN_CHORDS[b];
    const arp = [0, 1, 2, 1, 0, 1, 2, 1].map((k, j): Note => [c[k], j * 2, 3, j % 4 === 0 ? 0.7 : 0.45]);
    return [
      { voice: 'pluck', notes: arp },
      { voice: 'strings', notes: [[midi(c[0]) - 12, 0, 16, 0.25]] },
      { voice: 'shaker', notes: [4, 12].map((s): Note => [0, s, 1, 0.25]) },
      ...(i >= 8 ? [{ voice: 'pluck' as Voice, notes: TOWN_TUNE[b].map(([n, s, l]): Note => [n, s, l, 0.55]) }] : []),
    ];
  },
};

// ---- a fight: a restless ostinato in E minor, brass stabs, the Neapolitan chord for the turn of the screw ----
const FIGHT_BASS = ['E2', 'E2', 'G2', 'E2', 'A2', 'E2', 'Bb2', 'A2'];
const FIGHT: Track = {
  bpm: 132,
  bars: 4,
  bar: (i) => {
    const stab = i === 3 ? ['F3', 'A3', 'C4'] : ['E3', 'G3', 'B3'];
    return [
      { voice: 'tuba', notes: FIGHT_BASS.map((n, k): Note => [n, k * 2, 1, 0.8]) },
      { voice: 'timpani', notes: [0, 3, 6, 8, 11, 14].map((s): Note => ['E2', s, 2, s === 0 ? 1 : 0.6]) },
      { voice: 'snare', notes: [[0, 4, 1, 0.8], [0, 12, 1, 0.8], ...(i === 3 ? [[0, 14, 1, 0.6], [0, 15, 1, 0.8]] as Note[] : [])] },
      { voice: 'brass', notes: chord(stab, i === 3 ? [0, 8] : [0, 10], 2, 0.5) },
      { voice: 'strings', notes: [[i === 3 ? 'F4' : 'E4', 0, 16, 0.3], [i === 3 ? 'C5' : 'B4', 0, 16, 0.25]] },
    ];
  },
};

// ---- the menu: the road's tune, slow, on strings ----
const MENU: Track = {
  bpm: 66,
  bars: 8,
  bar: (i) => [
    { voice: 'strings', notes: [...chord(ROAD_CHORDS[i], [0], 16, 0.5), ...ROAD_TUNE[i].map(([n, s, l]): Note => [n, s, l, 1.2])] },
    { voice: 'timpani', notes: i % 4 === 0 ? [[ROAD_BASS[i], 0, 8, 0.8]] : [] },
  ],
};

export const TRACKS = { road: ROAD, town: TOWN, fight: FIGHT, menu: MENU };
export type TrackName = keyof typeof TRACKS;

const LOOKAHEAD = 0.15; // s of notes scheduled ahead
const FADE = 1.6;

class Music {
  private bus: GainNode | null = null;
  private send: GainNode | null = null;
  private now: { name: TrackName; gain: GainNode; bar: number; step: number; next: number } | null = null;
  private want: TrackName | null = null;

  constructor() {
    synth.onStart = () => this.want && this.play(this.want);
  }

  /** Switch to a track (crossfade); before sound is allowed, remember it for later. */
  play(name: TrackName): void {
    this.want = name;
    const a = synth.audio;
    if (!a) return;
    this.setup();
    if (this.now?.name === name) return;
    const t = a.ctx.currentTime;
    if (this.now) {
      const old = this.now.gain;
      old.gain.setTargetAtTime(0, t, FADE / 4);
      setTimeout(() => old.disconnect(), FADE * 2000);
    }
    const gain = a.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.setTargetAtTime(1, t, FADE / 4);
    gain.connect(this.bus!);
    gain.connect(this.send!);
    this.now = { name, gain, bar: 0, step: 0, next: t + 0.05 };
  }

  stop(): void {
    this.want = null;
    if (!this.now || !synth.audio) return;
    this.now.gain.gain.setTargetAtTime(0, synth.audio.ctx.currentTime, FADE / 4);
    this.now = null;
  }

  applyVolume(): void {
    if (this.bus && synth.audio) this.bus.gain.setTargetAtTime(settings().music * 0.55, synth.audio.ctx.currentTime, 0.1);
  }

  private setup(): void {
    const a = synth.audio!;
    if (this.bus) return;
    this.bus = a.ctx.createGain();
    // a limiter on the way out: whatever the score does, it never clips or blasts
    const limit = a.ctx.createDynamicsCompressor();
    limit.threshold.value = -10;
    limit.knee.value = 6;
    limit.ratio.value = 12;
    limit.attack.value = 0.003;
    limit.release.value = 0.25;
    this.bus.connect(limit).connect(a.out);
    this.applyVolume();
    // a hall: a decaying noise impulse gives the orchestra a room
    const rev = a.ctx.createConvolver();
    const len = Math.floor(a.ctx.sampleRate * 2.4);
    const ir = a.ctx.createBuffer(2, len, a.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    rev.buffer = ir;
    this.send = a.ctx.createGain();
    this.send.gain.value = 0.35;
    this.send.connect(rev).connect(this.bus);
    setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const a = synth.audio;
    const cur = this.now;
    if (!a || !cur) return;
    const track = TRACKS[cur.name];
    const sixteenth = 60 / track.bpm / 4;
    while (cur.next < a.ctx.currentTime + LOOKAHEAD) {
      for (const part of track.bar(cur.bar)) for (const n of part.notes) if (n[1] === cur.step) this.note(part.voice, n, cur.next, sixteenth, cur.gain);
      cur.next += sixteenth;
      if (++cur.step === 16) {
        cur.step = 0;
        cur.bar = (cur.bar + 1) % track.bars;
      }
    }
  }

  private note(voice: Voice, [pitch, , len, vol = 0.7]: Note, t: number, sixteenth: number, out: AudioNode): void {
    const a = synth.audio!;
    const dur = len * sixteenth;
    const human = (Math.random() - 0.5) * 0.012; // a player, not a clock
    INSTRUMENTS[voice](a.ctx, out, a.noise, typeof pitch === 'number' && pitch === 0 ? 0 : hz(pitch), t + human, dur, vol);
  }
}

type Instrument = (ctx: AudioContext, out: AudioNode, noise: AudioBuffer, f: number, t: number, dur: number, vol: number) => void;

function env(ctx: AudioContext, t: number, attack: number, hold: number, release: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}

function oscs(ctx: AudioContext, type: OscillatorType, f: number, detunes: number[], t: number, end: number, into: AudioNode): OscillatorNode[] {
  return detunes.map((d) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = d;
    o.connect(into);
    o.start(t);
    o.stop(end);
    return o;
  });
}

function noiseHit(ctx: AudioContext, noise: AudioBuffer, t: number, dur: number, filter: BiquadFilterType, freq: number, vol: number, out: AudioNode): void {
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = env(ctx, t, 0.002, 0, dur, vol);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 1.5, dur + 0.05);
}

const INSTRUMENTS: Record<Voice, Instrument> = {
  // two detuned saws through a filter that opens on the attack: a brass section
  brass(ctx, out, _n, f, t, dur, vol) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(2600, t + 0.06);
    lp.frequency.setTargetAtTime(1500, t + 0.08, 0.2);
    const g = env(ctx, t, 0.04, Math.max(0, dur - 0.08), 0.18, 0.09 * vol);
    lp.connect(g).connect(out);
    const os = oscs(ctx, 'sawtooth', f, [-7, 6], t, t + dur + 0.25, lp);
    // vibrato on long notes
    if (dur > 0.5) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.2;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(9, t + 0.4);
      lfo.connect(depth);
      for (const o of os) depth.connect(o.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.25);
    }
  },
  // three soft saws, slow bow: strings
  strings(ctx, out, _n, f, t, dur, vol) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1700;
    const g = env(ctx, t, Math.min(0.3, dur / 3), Math.max(0, dur - 0.3), 0.45, 0.05 * vol);
    lp.connect(g).connect(out);
    oscs(ctx, 'sawtooth', f, [-9, 0, 8], t, t + dur + 0.5, lp);
  },
  // a low brass bass with a sine under it
  tuba(ctx, out, _n, f, t, dur, vol) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = env(ctx, t, 0.02, Math.max(0, dur * 0.6), 0.12, 0.16 * vol);
    lp.connect(g).connect(out);
    oscs(ctx, 'sawtooth', f, [0], t, t + dur + 0.15, lp);
    oscs(ctx, 'sine', f, [0], t, t + dur + 0.15, lp);
  },
  // Karplus–Strong: a noise burst ringing in a short delay line: a plucked string
  pluck(ctx, out, noise, f, t, dur, vol) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const burst = env(ctx, t, 0.001, 0.004, 0.004, 0.9 * vol);
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = 1 / f;
    const fb = ctx.createGain();
    fb.gain.value = 0.96; // below one with the filter's own gain: the string rings and dies away
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.Q.value = -12; // no resonant peak: a peak above unity would make the loop howl
    const tail = env(ctx, t, 0.001, 0, Math.min(2.5, dur + 1), 2.2);
    s.connect(burst).connect(delay);
    delay.connect(lp).connect(fb).connect(delay);
    lp.connect(tail).connect(out);
    s.start(t, Math.random(), 0.02);
    setTimeout(() => fb.disconnect(), (t - ctx.currentTime + Math.min(2.5, dur + 1) + 0.2) * 1000);
  },
  // a sine that sags in pitch, with a felt thump: timpani
  timpani(ctx, out, noise, f, t, _dur, vol) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.02, t + 0.08);
    const g = env(ctx, t, 0.004, 0, 0.9, 0.28 * vol);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 1);
    noiseHit(ctx, noise, t, 0.08, 'lowpass', 180, 0.25 * vol, out);
  },
  snare(ctx, out, noise, _f, t, _dur, vol) {
    noiseHit(ctx, noise, t, 0.14, 'bandpass', 2400, 0.32 * vol, out);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
    const g = env(ctx, t, 0.002, 0, 0.06, 0.12 * vol);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.1);
  },
  shaker(ctx, out, noise, _f, t, _dur, vol) {
    noiseHit(ctx, noise, t, 0.05, 'highpass', 6500, 0.09 * vol, out);
  },
};

export const music = new Music();
