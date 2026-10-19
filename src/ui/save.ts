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
  /** 특이사항 배지 id → 받은 횟수 */
  badges?: Record<string, number>;
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
    if (raw) return migrateMeta({ endings: {}, lives: [], seenIntro: false, badges: {}, ...JSON.parse(raw) });
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
    badges: (s.ending.badges ?? []).reduce((acc, b) => ({ ...acc, [b]: (acc[b] ?? 0) + 1 }), { ...(meta.badges ?? {}) } as Record<string, number>),
    lives: [life, ...meta.lives].slice(0, 30),
  };
  saveMeta(next);
  return next;
}

/** 예전 엔딩(사연별 14개)을 받은 기록은 같은 사연의 배지로 옮긴다 — 엔딩은 이제 팬 사다리 14단계 */
const OLD_TO_BADGE: Record<string, string> = {
  young_genius: 'young', global: 'global', livelihood: 'livelihood', revival: 'revival', cult: 'cult',
  reunion: 'reunion', lifelong: 'lifelong', mentor: 'mentor', bankrupt: 'bankrupt', quit: 'quit',
};
function migrateMeta(m: Meta): Meta {
  if ((m as Meta & { migrated2?: boolean }).migrated2) return m;
  const badges = { ...(m.badges ?? {}) };
  for (const [old, n] of Object.entries(m.endings)) if (OLD_TO_BADGE[old]) badges[OLD_TO_BADGE[old]] = (badges[OLD_TO_BADGE[old]] ?? 0) + n;
  return { ...m, badges, migrated2: true } as Meta;
}
