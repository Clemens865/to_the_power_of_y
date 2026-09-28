// Web Audio synthesis for xʸ: every universe gets its own press sound, hover tick and (sometimes) an ambient bed.
// Self-contained on purpose: the export kit ships this file as-is.

export interface SoundGene {
  voice: 'blip' | 'pluck' | 'chord' | 'noise' | 'drop' | 'chip' | 'bell';
  ambient: 'none' | 'drone' | 'pulse' | 'shimmer';
  root: number; // Hz
  scale: number[]; // semitone offsets
  hoverTick: boolean;
}

interface RngLike {
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
  int(min: number, max: number): number;
}

const VOICES: SoundGene['voice'][] = ['blip', 'pluck', 'chord', 'noise', 'drop', 'chip', 'bell'];
const AMBIENTS: SoundGene['ambient'][] = ['none', 'none', 'none', 'drone', 'pulse', 'shimmer'];
const SCALES = [[0, 4, 7, 11], [0, 3, 7, 10], [0, 2, 7, 9], [0, 5, 7, 12], [0, 1, 6, 7]];

export const rollSound = (rng: RngLike, hue: number): SoundGene => ({
  voice: rng.pick(VOICES),
  ambient: rng.pick(AMBIENTS),
  root: Math.round(110 * 2 ** (Math.round((hue / 360) * 12) / 12) * 100) / 100, // hue picks the key
  scale: rng.pick(SCALES),
  hoverTick: rng.chance(0.5)
});

const note = (root: number, semis: number) => root * 2 ** (semis / 12);

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientStop: (() => void) | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, type: OscillatorType, start: number, dur: number, peak: number, endFreq?: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env).connect(this.master!);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private noise(start: number, dur: number, peak: number, cutoff: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    src.buffer = buf;
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    env.gain.setValueAtTime(peak, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(env).connect(this.master!);
    src.start(start);
  }

  press(g: SoundGene) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const r = g.root * 2;
    switch (g.voice) {
      case 'blip':
        this.tone(note(r, 12), 'sine', t, 0.18, 0.5, note(r, 0));
        break;
      case 'pluck':
        this.tone(note(r, g.scale[1]), 'triangle', t, 0.45, 0.45);
        this.tone(note(r, g.scale[1] + 12), 'sine', t, 0.2, 0.15);
        break;
      case 'chord':
        g.scale.slice(0, 3).forEach((s, i) => this.tone(note(r, s), 'triangle', t + i * 0.012, 0.9, 0.18));
        break;
      case 'noise':
        this.noise(t, 0.25, 0.6, note(r, 24));
        break;
      case 'drop':
        this.tone(note(g.root, 12), 'sine', t, 0.5, 0.7, 38);
        break;
      case 'chip':
        g.scale.forEach((s, i) => this.tone(note(r, s + 12), 'square', t + i * 0.045, 0.07, 0.12));
        break;
      case 'bell':
        this.tone(note(r, 12), 'sine', t, 1.4, 0.3);
        this.tone(note(r, 12) * 2.76, 'sine', t, 0.6, 0.1);
        this.tone(note(r, 12) * 5.4, 'sine', t, 0.25, 0.05);
        break;
    }
  }

  hover(g: SoundGene) {
    if (!g.hoverTick || !this.ctx || this.muted) return;
    this.tone(note(g.root * 4, g.scale[2]), 'sine', this.ctx.currentTime, 0.05, 0.06);
  }

  ambient(g: SoundGene) {
    this.stopAmbient();
    const ctx = this.ensure();
    if (!ctx || g.ambient === 'none') return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2);
    out.connect(this.master!);
    const nodes: AudioScheduledSourceNode[] = [];
    let timer = 0;

    if (g.ambient === 'drone') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      lp.connect(out);
      [0, 7, 12.07].forEach(s => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = note(g.root / 2, s);
        o.connect(lp);
        o.start();
        nodes.push(o);
      });
    } else {
      const step = g.ambient === 'pulse' ? 800 : 380;
      timer = window.setInterval(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const f = g.ambient === 'pulse' ? note(g.root / 2, 0) : note(g.root * 4, g.scale[Math.floor(Math.random() * g.scale.length)]);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        if (g.ambient === 'pulse') osc.frequency.exponentialRampToValueAtTime(f / 2, t + 0.3);
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(g.ambient === 'pulse' ? 0.9 : 0.25, t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, t + (g.ambient === 'pulse' ? 0.4 : 1.2));
        osc.connect(env).connect(out);
        osc.start(t);
        osc.stop(t + 1.3);
      }, step);
    }

    this.ambientStop = () => {
      clearInterval(timer);
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      nodes.forEach(n => n.stop(now + 0.45));
    };
  }

  stopAmbient() {
    this.ambientStop?.();
    this.ambientStop = null;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stopAmbient();
  }
}
