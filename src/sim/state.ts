import { periodText } from './data/anachronism';
import type { ChronicleEntry, GameState, Genre, ResultLine, Skill, Stats } from './types';
import { clamp } from './rng';

export const age = (s: GameState) => s.time - s.player.birthYear;
export const ageInt = (s: GameState) => Math.floor(age(s));
export const year = (s: GameState) => Math.floor(s.time);
/**
 * 태어나는 순간의 나이. 나이는 ‘출생 연도 1월 = 0세’로 센다(해가 바뀌면 한 살) —
 * 출생 월이 10월이면 0.75세 무렵에 태어나고, 그 전은 태교(뱃속) 시기다.
 */
export const bornAge = (s: GameState) => {
  const m = ((s.player.birth?.month ?? 1) - 1) / 12;
  // 예전 저장(1월에 태어나던 시절)을 이어 하면 ‘응애’가 이미 지났는데 뱃속으로 돌아가지 않게
  return s.fired?.birth !== undefined && age(s) < m ? 0 : m;
};
export const isBorn = (s: GameState) => age(s) >= bornAge(s) - 1e-6;
/** 태어나는 시각 (연도 + 월) */
export const bornAt = (s: GameState) => s.player.birthYear + bornAge(s);
export const half = (s: GameState) => (s.time - Math.floor(s.time) >= 0.5 ? '하반기' : '상반기');

export type Stage = 'prenatal' | 'baby' | 'elem' | 'middle' | 'high' | 'twenties' | 'thirties' | 'middleage' | 'senior';

export function stageOf(a: number, born = 0): Stage {
  if (a < born - 1e-6) return 'prenatal';
  if (a < 7) return 'baby';
  if (a < 13) return 'elem';
  if (a < 16) return 'middle';
  if (a < 19) return 'high';
  if (a < 30) return 'twenties';
  if (a < 40) return 'thirties';
  if (a < 65) return 'middleage';
  return 'senior';
}

export const STAGE_LABEL: Record<Stage, string> = {
  prenatal: '태교',
  baby: '영유아',
  elem: '초등학생',
  middle: '중학생',
  high: '고등학생',
  twenties: '20대',
  thirties: '30대',
  middleage: '중년',
  senior: '노년',
};

/** 나이에 따라 시간 흐름이 다르다 (기획서 3장) */
export function stepSize(a: number, born = 0): number {
  // 뱃속: 태어나는 순간까지 한 시기. 태어난 뒤 첫 시기는 세 살(출생 연도 + 3) 1월까지 — 그 뒤로는 해 단위로 맞춰진다
  if (a < born - 1e-6) return born - a;
  if (a < 3) return 3 - a;
  if (a < 7) return 2;
  if (a < 13) return 1;
  if (a < 40) return 0.5;
  if (a < 65) return 1;
  return 2;
}

export function actionSlots(s: GameState): number {
  const a = age(s);
  if (a < 7) return 0;
  if (a < 13) return 1;
  if (s.player.military === 'serving') return 1;
  if (a >= 65) return 1;
  return 2;
}

export function addStat(s: GameState, k: keyof Stats, d: number) {
  s.player.stats[k] = clamp(s.player.stats[k] + d);
}

export function addSkill(s: GameState, k: Skill, d: number) {
  // 높을수록 오르기 어렵다 (수확 체감)
  const cur = s.player.skills[k];
  const eff = d > 0 ? d * Math.pow(Math.max(0, 1 - cur / 108), 1.5) * growthMul(s, k) : d;
  s.player.skills[k] = clamp(cur + eff);
}

export function addGenre(s: GameState, g: Genre, d: number) {
  s.player.genre[g] = clamp(s.player.genre[g] + d);
}

export function favoriteGenre(s: GameState): Genre {
  return (Object.entries(s.player.genre) as [Genre, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

export function chron(s: GameState, text: string, kind: ChronicleEntry['kind'] = 'life', npcId?: string) {
  s.chronicle.push({ age: Math.max(0, ageInt(s)), year: year(s), text: periodText(text, s.time, s.player.country), kind, npcId });
}

export function say(s: GameState, text: string, tone: ResultLine['tone'] = 'neutral') {
  s.lastResults.push({ text, tone });
}

export function mainSkill(s: GameState): number {
  const inst = s.player.mainInst;
  return inst ? s.player.skills[inst] : Math.max(s.player.skills.vocal, s.player.skills.guitar);
}

export const flag = (s: GameState, k: string) => s.flags[k];
export const setFlag = (s: GameState, k: string, v: number | boolean | string = true) => {
  s.flags[k] = v;
};

/** 생활비(반기) — 20세 이후. 부모님 집이면 크게 줄어든다. [가정] */
export function livingCost(s: GameState, priceIdx: number): number {
  const a = age(s);
  if (a < 20) return 0;
  const atHome = s.flags.independent !== true;
  const base = atHome ? 1_800_000 : 7_200_000;
  return Math.round(base * priceIdx);
}

const TALENT_OF: Record<Skill, ('pitch' | 'rhythm' | 'lyric' | 'presence' | 'stamina')[]> = {
  vocal: ['pitch'],
  keys: ['pitch'],
  guitar: ['pitch', 'rhythm'],
  bass: ['rhythm'],
  drums: ['rhythm'],
  compose: ['lyric', 'pitch'],
  stage: ['presence'],
};

/** 타고난 재능(0.64~1.38배)과 성격이 실력 성장 속도를 바꾼다 */
export function growthMul(s: GameState, k: Skill): number {
  const t = s.player.talents;
  if (!t) return 1;
  const ks = TALENT_OF[k];
  const v = ks.reduce((a, x) => a + t[x], 0) / ks.length;
  let m = 0.6 + (v / 100) * 0.8;
  const tr = s.player.traits ?? [];
  if (tr.includes('diligent') && k !== 'stage') m *= 1.12;
  if (tr.includes('shy') && k === 'stage') m *= 0.8;
  if ((tr.includes('shy') || tr.includes('sensitive')) && k === 'compose') m *= 1.12;
  if (tr.includes('ambitious') && k === 'stage') m *= 1.1;
  if (s.flags.perfectPitch && (k === 'vocal' || k === 'compose' || k === 'keys')) m *= 1.15;
  return m;
}

// ── 같은 인생에서 같은 문장이 되풀이되지 않게 ──
/** 문장 → 짧은 열쇠 (저장 크기를 줄인다) */
export function lineKey(t: string): string {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
/** 이 인생에서 아직 안 썼거나, 쓴 지 gap 년이 지난 문장인가 */
export function isFresh(s: GameState, t: string, gap = 12): boolean {
  const y = s.said?.[lineKey(t)];
  return y === undefined || s.time - y >= gap;
}
export function remember(s: GameState, t: string) {
  (s.said ??= {})[lineKey(t)] = Math.floor(s.time);
}
