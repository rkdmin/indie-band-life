// 오디오 매니저: 곡 재생(룩어헤드 스케줄러), 배경음, 효과음, WAV 렌더.
// 브라우저 자동재생 정책 때문에 첫 사용자 입력 뒤에만 소리가 난다 (unlock()).

import { compose, durationSec, type Score } from './compose';
import { makeBus, playNote, type Bus } from './synth';
import type { Genre, Mood } from '../sim/types';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let muted = false;
let bgmOn = true;

function readPref(k: string, d: boolean) {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : v === '1';
  } catch {
    return d;
  }
}
muted = readPref('ibl.muted', false);
bgmOn = readPref('ibl.bgm', true);

export function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    master.connect(analyser).connect(ctx.destination);
  }
  return ctx;
}

export function unlock() {
  const c = audioCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export const getAnalyser = () => analyser;
export const isMuted = () => muted;
export const isBgmOn = () => bgmOn;

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('ibl.muted', m ? '1' : '0');
  } catch {
    /* 저장 불가 환경 */
  }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
}

export function setBgm(on: boolean) {
  bgmOn = on;
  try {
    localStorage.setItem('ibl.bgm', on ? '1' : '0');
  } catch {
    /* 저장 불가 환경 */
  }
  if (!on) stopBgm();
}

export interface Playback {
  stop: () => void;
  score: Score;
  startedAt: number;
  duration: number;
  progress: () => number;
  ended: () => boolean;
}

function schedule(score: Score, volume: number, loop: boolean, onEnd?: () => void): Playback | null {
  const c = audioCtx();
  if (!c || !master) return null;
  unlock();
  const bus: Bus = makeBus(c, score, master, volume);
  const spb = 60 / score.bpm;
  const totalBeats = score.bars * 4;
  const start = c.currentTime + 0.08;
  let idx = 0;
  let cycle = 0;
  let stopped = false;
  const lookahead = 0.35;
  const timer = window.setInterval(() => {
    if (stopped) return;
    const now = c.currentTime;
    while (true) {
      if (idx >= score.notes.length) {
        if (!loop) break;
        idx = 0;
        cycle++;
      }
      const n = score.notes[idx];
      const t = start + (cycle * totalBeats + n.t) * spb;
      if (t > now + lookahead) break;
      if (t >= now - 0.05) playNote(bus, score, n, t, spb);
      idx++;
    }
    if (!loop && now > start + totalBeats * spb + 1.5) {
      finish();
      onEnd?.();
    }
  }, 60);
  const finish = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    const t = c.currentTime;
    bus.out.gain.setTargetAtTime(0, t, 0.15);
    window.setTimeout(() => bus.out.disconnect(), 900);
  };
  const duration = totalBeats * spb;
  return {
    stop: finish,
    score,
    startedAt: start,
    duration,
    progress: () => Math.max(0, Math.min(1, (c.currentTime - start) / duration)),
    ended: () => stopped,
  };
}

// ───────── 곡 재생 ─────────
let current: Playback | null = null;
let currentId: string | null = null;
const listeners = new Set<() => void>();
export const onPlaybackChange = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const emit = () => listeners.forEach((f) => f());

export interface SongLike {
  id: string;
  seed: number;
  genre: Genre;
  mood: Mood;
  quality: number;
}

export function playSong(song: SongLike, opts: { bars?: number } = {}) {
  stopSong();
  stopBgm();
  const score = compose(song.seed, song.genre, song.mood, song.quality, opts);
  current = schedule(score, 0.85, false, () => {
    current = null;
    currentId = null;
    emit();
    resumeBgm();
  });
  currentId = current ? song.id : null;
  emit();
  return current;
}

export function stopSong() {
  if (current) {
    current.stop();
    current = null;
    currentId = null;
    emit();
    resumeBgm();
  }
}

export const nowPlaying = () => ({ id: currentId, pb: current });

// ───────── 배경음 ─────────
let bgm: Playback | null = null;
let bgmKey: string | null = null;
let wantedBgm: { key: string; genre: Genre; mood: Mood; seed: number } | null = null;

export function playBgm(key: string, genre: Genre, mood: Mood, seed: number) {
  wantedBgm = { key, genre, mood, seed };
  if (!bgmOn || current) return;
  if (bgmKey === key && bgm && !bgm.ended()) return;
  stopBgm(false);
  const score = compose(seed, genre, mood, 85, {});
  // 배경음은 멜로디를 빼고 조용히
  score.notes = score.notes.filter((n) => n.kind !== 'lead' && n.kind !== 'crash').map((n) => ({ ...n, vel: n.vel * (n.kind === 'chord' ? 0.9 : 0.5) }));
  bgm = schedule(score, 0.22, true);
  bgmKey = key;
}

export function stopBgm(forget = true) {
  if (bgm) bgm.stop();
  bgm = null;
  bgmKey = null;
  if (forget) wantedBgm = null;
}

function resumeBgm() {
  if (wantedBgm && bgmOn) {
    const w = wantedBgm;
    window.setTimeout(() => !current && playBgm(w.key, w.genre, w.mood, w.seed), 600);
  }
}

// ───────── 효과음 ─────────
export type Sfx = 'tap' | 'good' | 'bad' | 'big' | 'cheer' | 'page' | 'coin';

export function sfx(kind: Sfx) {
  const c = audioCtx();
  if (!c || !master || muted) return;
  unlock();
  const t = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.value = 0.35;
  out.connect(master);
  const tone = (f: number, at: number, d: number, type: OscillatorType = 'triangle', v = 0.5) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t + at);
    g.gain.exponentialRampToValueAtTime(v, t + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + d);
    o.connect(g).connect(out);
    o.start(t + at);
    o.stop(t + at + d + 0.05);
  };
  switch (kind) {
    case 'tap':
      tone(880, 0, 0.06, 'sine', 0.25);
      break;
    case 'page':
      tone(520, 0, 0.08, 'sine', 0.2);
      tone(780, 0.04, 0.08, 'sine', 0.15);
      break;
    case 'good':
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.25));
      break;
    case 'bad':
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.09, 0.3, 'sawtooth', 0.12));
      break;
    case 'coin':
      tone(988, 0, 0.08, 'square', 0.12);
      tone(1319, 0.07, 0.25, 'square', 0.12);
      break;
    case 'big':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.9, 'triangle', 0.3));
      [262, 392].forEach((f) => tone(f, 0, 1.2, 'sawtooth', 0.08));
      break;
    case 'cheer': {
      const src = c.createBufferSource();
      const len = c.sampleRate * 2.2;
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const env = Math.sin((Math.PI * i) / len);
        const clap = Math.random() < 0.002 ? 1 : 0;
        d[i] = (Math.random() * 2 - 1) * env * 0.5 + clap * (Math.random() * 2 - 1);
      }
      src.buffer = b;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1400;
      f.Q.value = 0.6;
      src.connect(f).connect(out);
      src.start(t);
      break;
    }
  }
}

// ───────── WAV 렌더 (대표곡 저장) ─────────
export async function renderWav(song: SongLike): Promise<Blob> {
  const score = compose(song.seed, song.genre, song.mood, song.quality);
  const sr = 32000;
  const len = Math.ceil((durationSec(score) + 2.5) * sr);
  const off = new OfflineAudioContext(2, len, sr);
  const bus = makeBus(off, score, off.destination, 0.9);
  const spb = 60 / score.bpm;
  for (const n of score.notes) playNote(bus, score, n, 0.05 + n.t * spb, spb);
  const buf = await off.startRendering();
  return toWav(buf);
}

function toWav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels;
  const len = buf.length * ch * 2 + 44;
  const view = new DataView(new ArrayBuffer(len));
  const w = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  view.setUint32(4, len - 8, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, buf.sampleRate, true);
  view.setUint32(28, buf.sampleRate * ch * 2, true);
  view.setUint16(32, ch * 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, len - 44, true);
  const data = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < buf.length; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
}
