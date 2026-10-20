// 셋리스트 — 공연에서 곡을 어떤 순서로 할지. 곡의 분위기마다 ‘에너지’가 있고,
// 센 곡으로 열고, 가운데서 한 번 숨을 고르고, 가장 좋은 곡으로 닫으면 관객이 끝까지 따라온다 [가정].

import type { GameState, Mood, Song } from './types';
import { josa } from './korean';

/** 분위기별 에너지 0~1 */
export const ENERGY: Record<Mood, number> = { angry: 0.95, epic: 0.9, bright: 0.75, dreamy: 0.45, wistful: 0.4, calm: 0.25 };
export const SET_SIZE = 5;

/** 셋리스트에 넣을 수 있는 곡 — 완성도 높은 순, 최근 곡 우선으로 최대 8곡 */
export function repertoire(s: GameState): Song[] {
  const mine = s.songs.filter((x) => !s.band || x.bandName === null || x.bandName === s.band.name);
  return [...(mine.length >= SET_SIZE ? mine : s.songs)]
    .sort((a, b) => b.quality + (b.hit ? 15 : 0) + b.writtenYear * 0.5 - (a.quality + (a.hit ? 15 : 0) + a.writtenYear * 0.5))
    .slice(0, 8);
}

export interface SetScore {
  score: number;
  /** 화면에 보여 줄 짧은 평 */
  notes: { ok: boolean; text: string }[];
}

/** 셋리스트 점수 0~100 — 곡 완성도 40 + 흐름 60 */
export function scoreSetlist(set: Song[], all: Song[] = set): SetScore {
  const notes: SetScore['notes'] = [];
  if (!set.length) return { score: 0, notes };
  const q = set.reduce((a, x) => a + x.quality, 0) / set.length;
  let score = q * 0.4;
  const e = set.map((x) => ENERGY[x.mood]);
  const first = e[0];
  const last = e[e.length - 1];
  if (first >= 0.7) { score += 12; notes.push({ ok: true, text: '센 곡으로 연다' }); }
  else notes.push({ ok: false, text: '첫 곡이 조용하다 — 객석이 늦게 깬다' });
  const bestQ = Math.max(...set.map((x) => x.quality));
  if (last >= Math.max(...e) - 0.05 || set[set.length - 1].quality >= bestQ) { score += 14; notes.push({ ok: true, text: '마지막 곡이 가장 크다' }); }
  else notes.push({ ok: false, text: '끝이 약하다 — 가장 센 곡이나 좋은 곡을 마지막에' });
  let same = 0;
  for (let i = 1; i < set.length; i++) if (set[i].mood === set[i - 1].mood) same++;
  score += (set.length - 1 - same) * 4;
  if (same) notes.push({ ok: false, text: `같은 분위기가 ${same}번 이어진다` });
  const mid = e.slice(1, -1);
  if (set.length >= 4 && mid.some((x) => x <= 0.45)) { score += 8; notes.push({ ok: true, text: '가운데서 한 번 숨을 고른다' }); }
  else if (set.length >= 4) notes.push({ ok: false, text: '쉬어 가는 곡이 없다 — 관객도 숨이 찬다' });
  const top = [...all].sort((a, b) => b.quality + (b.hit ? 20 : 0) - (a.quality + (a.hit ? 20 : 0)))[0];
  if (top && set.some((x) => x.id === top.id)) { score += 10; notes.push({ ok: true, text: `대표곡 〈${top.title}〉${josa(top.title, '이/가').slice(top.title.length)} 들어 있다` }); }
  if (set.length < SET_SIZE) score *= set.length / SET_SIZE;
  return { score: Math.max(0, Math.min(100, Math.round(score))), notes };
}

/** ‘늘 하던 순서’ — 쓴 순서대로 다섯 곡 */
export function habitSetlist(s: GameState): Song[] {
  return [...repertoire(s)].sort((a, b) => a.writtenYear - b.writtenYear || a.id.localeCompare(b.id)).slice(0, SET_SIZE);
}

/** 화면에서 고른 셋리스트 (곡 id 목록) — 없으면 null */
export function chosenSetlist(s: GameState): Song[] | null {
  const raw = s.flags.setlist;
  if (typeof raw !== 'string' || !raw) return null;
  const set = raw.split(',').map((id) => s.songs.find((x) => x.id === id)).filter(Boolean) as Song[];
  return set.length ? set : null;
}

/** 점수 → 공연 결과 배율 (0.6~1.8) */
export const setMul = (score: number) => 0.6 + (score / 100) * 1.2;
