// Web Audio 신시사이저. 실시간(AudioContext)과 오프라인(OfflineAudioContext) 모두에서 같은 코드로 동작한다.

import type { Note, Score } from './compose';

type AC = BaseAudioContext;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const noiseCache = new WeakMap<AC, AudioBuffer>();
function noise(ctx: AC): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = (seed / 2147483647) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

function impulse(ctx: AC, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let seed = 99 + ch * 7;
    for (let i = 0; i < len; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return b;
}

function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const k = amount * 300 + 1;
  const n = 1024;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return c;
}

export interface Bus {
  ctx: AC;
  out: GainNode;
  drums: GainNode;
  bass: GainNode;
  harm: AudioNode;
  lead: GainNode;
  verb: GainNode;
  analyser?: AnalyserNode;
}

export function makeBus(ctx: AC, score: Score, dest: AudioNode, volume = 0.8): Bus {
  const out = ctx.createGain();
  out.gain.value = volume;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  out.connect(comp).connect(dest);

  const convolver = ctx.createConvolver();
  convolver.buffer = impulse(ctx, 2.6, 2.8);
  const verb = ctx.createGain();
  verb.gain.value = 0.25 + score.reverb * 0.9;
  verb.connect(convolver).connect(out);

  const mk = (v: number, send: number) => {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(out);
    const s = ctx.createGain();
    s.gain.value = send;
    g.connect(s).connect(verb);
    return g;
  };
  const drums = mk(0.8, 0.08);
  const bass = mk(0.6, 0.02);
  const lead = mk(0.5, 0.35 + score.reverb * 0.3);
  const harmIn = mk(score.harm === 'pad' ? 0.32 : 0.36, 0.2 + score.reverb * 0.6);
  let harm: AudioNode = harmIn;
  if (score.drive > 0.2) {
    const ws = ctx.createWaveShaper();
    ws.curve = driveCurve(score.drive);
    ws.oversample = '2x';
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;
    ws.connect(lp).connect(harmIn);
    harm = ws;
  }
  return { ctx, out, drums, bass, harm, lead, verb };
}

function env(g: GainNode, t: number, peak: number, attack: number, hold: number, release: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

export function playNote(bus: Bus, score: Score, n: Note, t: number, spb: number) {
  const ctx = bus.ctx;
  const dur = n.dur * spb;
  switch (n.kind) {
    case 'kick': {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(g, t, n.vel, 0.002, 0.02, 0.3);
      o.connect(g).connect(bus.drums);
      o.start(t);
      o.stop(t + 0.4);
      break;
    }
    case 'snare':
    case 'clap': {
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      const f = ctx.createBiquadFilter();
      f.type = n.kind === 'clap' ? 'bandpass' : 'highpass';
      f.frequency.value = n.kind === 'clap' ? 1500 : 1200;
      const g = ctx.createGain();
      env(g, t, n.vel * 0.7, 0.001, 0.01, n.kind === 'clap' ? 0.14 : 0.18);
      src.connect(f).connect(g).connect(bus.drums);
      src.start(t, Math.random() * 0.5);
      src.stop(t + 0.3);
      if (n.kind === 'snare') {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 190;
        const g2 = ctx.createGain();
        env(g2, t, n.vel * 0.4, 0.001, 0.01, 0.08);
        o.connect(g2).connect(bus.drums);
        o.start(t);
        o.stop(t + 0.15);
      }
      break;
    }
    case 'hat':
    case 'ohat':
    case 'crash': {
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = n.kind === 'crash' ? 5000 : 7500;
      const g = ctx.createGain();
      const rel = n.kind === 'hat' ? 0.04 : n.kind === 'ohat' ? 0.2 : 1.4;
      env(g, t, n.vel * (n.kind === 'crash' ? 0.35 : 0.25), 0.001, 0.005, rel);
      src.connect(f).connect(g).connect(bus.drums);
      src.start(t, Math.random() * 0.3);
      src.stop(t + rel + 0.05);
      break;
    }
    case 'bass': {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(n.midi![0]);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(300, t + Math.max(0.1, dur));
      const g = ctx.createGain();
      env(g, t, n.vel * 0.6, 0.005, Math.max(0.01, dur - 0.06), 0.06);
      o.connect(f).connect(g).connect(bus.bass);
      o.start(t);
      o.stop(t + dur + 0.1);
      break;
    }
    case 'chord': {
      const style = score.harm;
      for (const m of n.midi!) {
        const detunes = style === 'pad' ? [-9, 9] : style === 'power' || style === 'chug' ? [-6, 6] : [0];
        for (const dt of detunes) {
          const o = ctx.createOscillator();
          o.type = style === 'pluck' ? 'triangle' : style === 'keys' ? 'square' : 'sawtooth';
          o.frequency.value = mtof(m);
          o.detune.value = dt;
          const g = ctx.createGain();
          const peak = (n.vel / n.midi!.length / detunes.length) * (style === 'keys' ? 0.5 : 1);
          if (style === 'pad') env(g, t, peak, 0.6, Math.max(0.01, dur - 0.8), 1.2);
          else if (style === 'pluck') env(g, t, peak * 1.6, 0.003, 0.02, Math.min(1.4, dur + 0.5));
          else env(g, t, peak, 0.005, Math.max(0.01, dur - 0.05), 0.08);
          let node: AudioNode = o;
          if (style === 'keys' || style === 'pluck') {
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = style === 'keys' ? 1800 : 2600;
            node = o.connect(f);
          }
          node.connect(g).connect(bus.harm);
          o.start(t);
          o.stop(t + dur + (style === 'pad' ? 1.4 : style === 'pluck' ? 1.6 : 0.15));
        }
      }
      break;
    }
    case 'lead': {
      const m = n.midi![0];
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o.type = score.leadTone === 'bright' ? 'sawtooth' : 'triangle';
      o2.type = score.leadTone === 'soft' ? 'sine' : 'sawtooth';
      o.frequency.value = mtof(m);
      o2.frequency.value = mtof(m);
      o2.detune.value = 5;
      // 비브라토 — 사람 목소리 같은 떨림
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0, t);
      lfoGain.gain.linearRampToValueAtTime(dur > 0.4 ? 9 : 2, t + Math.min(0.35, dur));
      lfo.connect(lfoGain);
      lfoGain.connect(o.detune);
      lfoGain.connect(o2.detune);
      // 포먼트 느낌의 필터
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = score.leadTone === 'soft' ? 1400 : score.leadTone === 'bright' ? 3200 : 2200;
      f.Q.value = 4;
      const mix2 = ctx.createGain();
      mix2.gain.value = score.leadTone === 'voice' ? 0.25 : 0.5;
      const g = ctx.createGain();
      env(g, t, n.vel * 0.42, 0.03, Math.max(0.01, dur - 0.1), 0.12);
      o.connect(f);
      o2.connect(mix2).connect(f);
      f.connect(g).connect(bus.lead);
      for (const x of [o, o2, lfo]) {
        x.start(t);
        x.stop(t + dur + 0.2);
      }
      break;
    }
  }
}
