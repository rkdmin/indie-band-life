// 로컬 저장. 사파리 사생활 보호 모드 등에서 localStorage 가 막혀도 게임은 돌아가야 한다.

import type { GameState } from '../sim/types';
import { SAVE_VERSION } from '../sim/engine';

const SAVE_KEY = 'ibl.save.v1';
const META_KEY = 'ibl.meta.v1';

export interface PastLife {
  id: string;
  name: string;
  born: number;
  died: number;
  endingId: string;
  endingTitle: string;
  rank: string;
  bestSong: string | null;
  fans: number;
  at: number;
}

export interface Meta {
  endings: Record<string, number>; // 엔딩 id → 달성 횟수
  lives: PastLife[];
  seenIntro: boolean;
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.version !== SAVE_VERSION) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveGame(s: GameState | null) {
  try {
    if (!s) localStorage.removeItem(SAVE_KEY);
    else localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* 저장 불가 — 세션 동안만 진행 */
  }
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return { endings: {}, lives: [], seenIntro: false, ...JSON.parse(raw) };
  } catch {
    /* 무시 */
  }
  return { endings: {}, lives: [], seenIntro: false };
}

export function saveMeta(m: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* 무시 */
  }
}

export function recordLife(meta: Meta, s: GameState): Meta {
  if (!s.ending || meta.lives.some((l) => l.id === s.id)) return meta;
  const best = s.songs.find((x) => x.id === s.ending!.bestSongId);
  const life: PastLife = {
    id: s.id,
    name: s.player.name,
    born: s.player.birthYear,
    died: s.player.birthYear + (s.player.deathAge ?? 0),
    endingId: s.ending.id,
    endingTitle: s.ending.title,
    rank: s.ending.rank,
    bestSong: best?.title ?? null,
    fans: s.peakFans,
    at: Date.now(),
  };
  const next: Meta = {
    ...meta,
    endings: { ...meta.endings, [s.ending.id]: (meta.endings[s.ending.id] ?? 0) + 1 },
    lives: [life, ...meta.lives].slice(0, 30),
  };
  saveMeta(next);
  return next;
}
