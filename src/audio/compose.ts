// 절차적 작곡기. 같은 (seed, genre, mood, quality) → 항상 같은 곡.
// 순수 함수라 테스트 가능하고, 실시간 재생과 오프라인 렌더(WAV 저장)가 같은 악보를 쓴다.
//
// 품질이 실제로 들리게 만든다:
//   - 높은 품질: 강박에 코드톤, 순차 진행, 후렴 훅(모티프) 반복, 후렴에서 음역 상승
//   - 낮은 품질: 랜덤 도약, 코드 밖 음, 모티프 붕괴

import type { Genre, Mood } from '../sim/types';
import { Rng } from '../sim/rng';

export type NoteKind = 'kick' | 'snare' | 'hat' | 'ohat' | 'clap' | 'crash' | 'bass' | 'chord' | 'lead';

export interface Note {
  t: number; // 박 단위 시작
  kind: NoteKind;
  midi?: number[];
  dur: number; // 박
  vel: number; // 0~1
}

export type HarmStyle = 'power' | 'pad' | 'pluck' | 'keys' | 'chug';

export interface Score {
  bpm: number;
  bars: number;
  notes: Note[];
  harm: HarmStyle;
  reverb: number; // 0~1
  drive: number; // 디스토션 0~1
  leadTone: 'voice' | 'bright' | 'soft';
  sections: { name: string; bar: number }[];
  key: string;
}

interface Style {
  bpm: [number, number];
  drum: 'rock' | 'punk' | 'half' | 'folk' | 'metal' | 'pop';
  bass: 'eighth' | 'root' | 'pulse' | 'gallop';
  harm: HarmStyle;
  reverb: number;
  drive: number;
  leadTone: Score['leadTone'];
}

const STYLES: Record<Genre, Style> = {
  indierock: { bpm: [118, 138], drum: 'rock', bass: 'eighth', harm: 'power', reverb: 0.25, drive: 0.45, leadTone: 'voice' },
  punk: { bpm: [168, 192], drum: 'punk', bass: 'eighth', harm: 'power', reverb: 0.12, drive: 0.75, leadTone: 'bright' },
  shoegaze: { bpm: [86, 104], drum: 'half', bass: 'root', harm: 'pad', reverb: 0.75, drive: 0.35, leadTone: 'soft' },
  folk: { bpm: [78, 98], drum: 'folk', bass: 'root', harm: 'pluck', reverb: 0.3, drive: 0, leadTone: 'voice' },
  metal: { bpm: [140, 176], drum: 'metal', bass: 'gallop', harm: 'chug', reverb: 0.18, drive: 0.95, leadTone: 'bright' },
  indiepop: { bpm: [100, 118], drum: 'pop', bass: 'pulse', harm: 'keys', reverb: 0.35, drive: 0.05, leadTone: 'voice' },
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

const MAJOR_PROGS = [
  [0, 4, 5, 3], // I V vi IV
  [0, 3, 5, 4], // I IV vi V
  [5, 3, 0, 4], // vi IV I V
  [0, 5, 3, 4], // I vi IV V
  [3, 4, 2, 5], // IV V iii vi (한국 발라드풍)
];
const MINOR_PROGS = [
  [0, 5, 2, 6], // i VI III VII
  [0, 3, 5, 4], // i iv VI v
  [0, 6, 5, 6], // i VII VI VII
  [0, 5, 3, 4],
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function scaleFor(mood: Mood): { scale: number[]; minor: boolean } {
  if (mood === 'dreamy') return { scale: LYDIAN, minor: false };
  if (mood === 'wistful' || mood === 'angry') return { scale: MINOR, minor: true };
  return { scale: MAJOR, minor: false };
}

/** 스케일 디그리 → midi (옥타브 넘김 처리) */
function deg(root: number, scale: number[], d: number): number {
  const o = Math.floor(d / 7);
  const i = ((d % 7) + 7) % 7;
  return root + o * 12 + scale[i];
}

function triad(root: number, scale: number[], d: number): number[] {
  return [deg(root, scale, d), deg(root, scale, d + 2), deg(root, scale, d + 4)];
}

export function compose(seed: number, genre: Genre, mood: Mood, quality: number, opts: { bars?: number } = {}): Score {
  const rng = new Rng(seed);
  const st = STYLES[genre];
  const { scale, minor } = scaleFor(mood);
  const q = Math.max(0, Math.min(100, quality)) / 100;
  const moodBpm = mood === 'calm' || mood === 'dreamy' ? -8 : mood === 'angry' || mood === 'epic' ? 6 : 0;
  const bpm = Math.round(rng.range(st.bpm[0], st.bpm[1]) + moodBpm);
  const rootPc = rng.int(0, 11);
  const root = 48 + rootPc; // C3 근처 (화성)
  const progs = minor ? MINOR_PROGS : MAJOR_PROGS;
  const verseProg = rng.pick(progs);
  const chorusProg = rng.chance(0.6) ? rng.pick(progs) : verseProg;

  // 구조: 인트로2 · 벌스8 · 프리2 · 후렴8 · 벌스4 · 후렴8 · 아웃트로2 = 34마디
  const plan: { name: string; bars: number; prog: number[]; energy: number }[] = [
    { name: 'intro', bars: 2, prog: chorusProg, energy: 0.5 },
    { name: 'verse', bars: 8, prog: verseProg, energy: 0.65 },
    { name: 'pre', bars: 2, prog: [3, 4], energy: 0.75 },
    { name: 'chorus', bars: 8, prog: chorusProg, energy: 1 },
    { name: 'verse', bars: 4, prog: verseProg, energy: 0.7 },
    { name: 'chorus', bars: 8, prog: chorusProg, energy: 1 },
    { name: 'outro', bars: 2, prog: [chorusProg[0]], energy: 0.6 },
  ];
  const maxBars = opts.bars ?? 99;

  const notes: Note[] = [];
  const sections: Score['sections'] = [];

  // 모티프: 2마디 리듬+윤곽. 품질이 높을수록 반복이 일관된다.
  const makeMotif = (density: number) => {
    const rhythm: { t: number; d: number }[] = [];
    let t = 0;
    while (t < 8) {
      const options = density > 0.6 ? [0.5, 0.5, 1, 0.5, 1.5] : [1, 1, 0.5, 2, 1.5];
      const d = rng.pick(options);
      if (rng.chance(0.82)) rhythm.push({ t, d: Math.min(d, 8 - t) });
      t += d;
    }
    const contour = rhythm.map(() => rng.int(-2, 2));
    return { rhythm, contour };
  };
  const verseMotif = makeMotif(0.5);
  const chorusMotif = makeMotif(0.75);

  let bar = 0;
  let lastLead = 7 + 7; // 스케일 디그리 (한 옥타브 위)
  for (const sec of plan) {
    if (bar >= maxBars) break;
    sections.push({ name: sec.name, bar });
    const motif = sec.name === 'chorus' ? chorusMotif : verseMotif;
    for (let b = 0; b < sec.bars && bar < maxBars; b++, bar++) {
      const t0 = bar * 4;
      const chordDeg = sec.prog[b % sec.prog.length];
      const chord = triad(root, scale, chordDeg);
      const e = sec.energy;
      const isLastBarOfSection = b === sec.bars - 1;

      // ── 드럼 ──
      if (sec.name !== 'intro' || b === 1) drums(notes, st.drum, t0, e, isLastBarOfSection, rng, sec.name === 'chorus');
      if (b === 0 && (sec.name === 'chorus' || sec.name === 'verse') && st.drum !== 'folk') notes.push({ t: t0, kind: 'crash', dur: 2, vel: 0.6 * e });

      // ── 베이스 ──
      const bassNote = chord[0] - 12;
      bassLine(notes, st.bass, t0, bassNote, chord, e);

      // ── 화성 ──
      harmony(notes, st.harm, t0, chord, e, sec.name, rng);

      // ── 리드(보컬 멜로디) ──
      if (sec.name === 'verse' || sec.name === 'chorus' || (sec.name === 'outro' && b === 0)) {
        const half = b % 2; // 2마디 모티프 중 몇 번째 마디
        const lift = sec.name === 'chorus' ? 2 : 0;
        for (const r of motif.rhythm) {
          if (r.t < half * 4 || r.t >= half * 4 + 4) continue;
          const i = motif.rhythm.indexOf(r);
          const strong = r.t % 2 === 0;
          let target: number;
          // 품질: 모티프를 따를 확률, 코드톤 착지 확률
          if (rng.chance(0.35 + q * 0.6)) target = lastLead + motif.contour[i];
          else target = lastLead + rng.int(-5, 5);
          if (strong && rng.chance(0.3 + q * 0.65)) {
            // 가장 가까운 코드톤으로 끌어당김
            const ct = [chordDeg, chordDeg + 2, chordDeg + 4].flatMap((d) => [d + 7, d + 14]);
            target = ct.reduce((a, x) => (Math.abs(x - target) < Math.abs(a - target) ? x : a), ct[0]);
          }
          target = Math.max(9 + lift, Math.min(17 + lift, target));
          lastLead = target;
          const midi = deg(root + 12, scale, target - 7);
          const wrong = rng.chance((1 - q) * 0.12) ? rng.pick([-1, 1]) : 0;
          notes.push({ t: t0 + (r.t - half * 4), kind: 'lead', midi: [midi + wrong], dur: r.d * 0.92, vel: 0.7 + (strong ? 0.15 : 0) });
        }
      }
    }
  }
  return {
    bpm,
    bars: bar,
    notes: notes.sort((a, b) => a.t - b.t),
    harm: st.harm,
    reverb: st.reverb,
    drive: st.drive,
    leadTone: st.leadTone,
    sections,
    key: `${NOTE_NAMES[rootPc]} ${minor ? 'minor' : mood === 'dreamy' ? 'lydian' : 'major'}`,
  };
}

function drums(n: Note[], kind: Style['drum'], t0: number, e: number, fill: boolean, rng: Rng, chorus: boolean) {
  const add = (t: number, k: NoteKind, v: number) => n.push({ t: t0 + t, kind: k, dur: 0.25, vel: v * (0.85 + e * 0.15) });
  switch (kind) {
    case 'rock':
      for (let i = 0; i < 8; i++) add(i * 0.5, chorus ? 'ohat' : 'hat', i % 2 ? 0.35 : 0.5);
      add(0, 'kick', 1); add(1.5, 'kick', 0.7); add(2, 'kick', 0.9);
      add(1, 'snare', 0.9); add(3, 'snare', 0.95);
      break;
    case 'punk':
      for (let i = 0; i < 8; i++) { add(i * 0.5, i % 2 ? 'snare' : 'kick', i % 2 ? 0.85 : 1); add(i * 0.5, 'hat', 0.4); }
      break;
    case 'half':
      for (let i = 0; i < 8; i++) add(i * 0.5, 'ohat', 0.22);
      add(0, 'kick', 0.85); add(2.5, 'kick', 0.5); add(2, 'snare', 0.8);
      break;
    case 'folk':
      for (let i = 0; i < 8; i++) add(i * 0.5, 'hat', i % 2 ? 0.15 : 0.25);
      add(0, 'kick', 0.5); add(2, 'kick', 0.45);
      if (chorus) { add(1, 'clap', 0.35); add(3, 'clap', 0.35); }
      break;
    case 'metal':
      for (let i = 0; i < (chorus ? 16 : 8); i++) add(i * (chorus ? 0.25 : 0.5), 'kick', 0.8);
      for (let i = 0; i < 4; i++) add(i, 'hat', 0.45);
      add(1, 'snare', 1); add(3, 'snare', 1);
      break;
    case 'pop':
      for (let i = 0; i < 4; i++) add(i, 'kick', 0.9);
      for (let i = 0; i < 4; i++) add(i + 0.5, 'hat', 0.4);
      add(1, 'clap', 0.75); add(3, 'clap', 0.8);
      break;
  }
  if (fill && kind !== 'folk') {
    for (let i = 0; i < 4; i++) add(3 + i * 0.25, 'snare', 0.5 + i * 0.12);
  } else if (rng.chance(0.1)) add(3.75, 'snare', 0.3);
}

function bassLine(n: Note[], kind: Style['bass'], t0: number, root: number, chord: number[], e: number) {
  const v = 0.75 * (0.8 + e * 0.2);
  switch (kind) {
    case 'eighth':
      for (let i = 0; i < 8; i++) n.push({ t: t0 + i * 0.5, kind: 'bass', midi: [root], dur: 0.45, vel: v });
      break;
    case 'root':
      n.push({ t: t0, kind: 'bass', midi: [root], dur: 1.9, vel: v });
      n.push({ t: t0 + 2, kind: 'bass', midi: [chord[2] - 12], dur: 1.9, vel: v * 0.9 });
      break;
    case 'pulse':
      [0, 0.75, 1.5, 2, 2.75, 3.5].forEach((t, i) => n.push({ t: t0 + t, kind: 'bass', midi: [i === 3 ? root + 12 : root], dur: 0.4, vel: v }));
      break;
    case 'gallop':
      for (let i = 0; i < 4; i++) [0, 0.5, 0.75].forEach((t) => n.push({ t: t0 + i + t, kind: 'bass', midi: [root], dur: 0.22, vel: v }));
      break;
  }
}

function harmony(n: Note[], kind: HarmStyle, t0: number, chord: number[], e: number, sec: string, rng: Rng) {
  const v = 0.55 * (0.7 + e * 0.3);
  switch (kind) {
    case 'power': {
      const pc = [chord[0], chord[0] + 7, chord[0] + 12];
      if (sec === 'verse') [0, 1.5, 2, 3].forEach((t) => n.push({ t: t0 + t, kind: 'chord', midi: pc, dur: 0.4, vel: v * 0.8 }));
      else for (let i = 0; i < 8; i++) n.push({ t: t0 + i * 0.5, kind: 'chord', midi: pc, dur: 0.48, vel: v });
      break;
    }
    case 'chug': {
      const pc = [chord[0] - 12, chord[0] - 5];
      for (let i = 0; i < 8; i++) n.push({ t: t0 + i * 0.5, kind: 'chord', midi: pc, dur: i % 4 === 0 ? 0.45 : 0.18, vel: v });
      break;
    }
    case 'pad':
      n.push({ t: t0, kind: 'chord', midi: [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12], dur: 4, vel: v * 0.8 });
      break;
    case 'pluck': {
      const arp = [chord[0], chord[1], chord[2], chord[0] + 12, chord[2], chord[1], chord[0] + 12, chord[1] + 12];
      arp.forEach((m, i) => n.push({ t: t0 + i * 0.5, kind: 'chord', midi: [m + 12], dur: 1.2, vel: v * (i % 2 ? 0.6 : 0.8) }));
      break;
    }
    case 'keys': {
      const voicing = chord.map((m) => m + 12);
      [0, 1.5, 2.5, 3].forEach((t) => n.push({ t: t0 + t, kind: 'chord', midi: voicing, dur: rng.chance(0.5) ? 0.9 : 0.45, vel: v * 0.75 }));
      break;
    }
  }
}

export const secondsPerBeat = (s: Score) => 60 / s.bpm;
export const durationSec = (s: Score) => s.bars * 4 * secondsPerBeat(s);
