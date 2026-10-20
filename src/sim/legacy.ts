// 지난 인생이 이번 인생에 남는 것 — 도감만 쌓이면 다음 인생을 할 이유가 약하다.
//  1) 지난 인생의 대표곡이 그 해가 오면 라디오에서 흘러나온다
//  2) 같은 나라·같은 시대라면 지난 인생의 밴드가 ‘전설의 선배 밴드’로, 그 주인공이 선배로 나타난다
//  3) 지난 인생의 아이가 나와 비슷한 나이·같은 나라라면 이번 인생의 라이벌 밴드 리더가 된다
// 이번 인생의 출생(운명 코드)은 바꾸지 않는다 — 지난 인생은 사건으로만 끼어든다.

import type { GameState, Genre, LegacyLife } from './types';

/** 끝난 인생에서 다음 인생으로 넘길 것을 뽑는다 */
export function legacyOf(s: GameState): LegacyLife | null {
  if (!s.ending) return null;
  const best = s.songs.find((x) => x.id === s.ending!.bestSongId) ?? null;
  const band = s.band ?? s.pastBands[s.pastBands.length - 1] ?? null;
  const child = s.npcs[s.flags.childId as string];
  return {
    id: s.id,
    name: s.player.name,
    born: s.player.birthYear,
    died: s.player.birthYear + (s.player.deathAge ?? Math.floor(s.time - s.player.birthYear)),
    country: s.player.country ?? 'KR',
    bandName: band?.name ?? null,
    genre: (band?.genre ?? null) as Genre | null,
    bestSong: best?.released ? best.title : null,
    songYear: best?.released ? best.releasedYear ?? best.writtenYear : null,
    fans: s.peakFans,
    childName: child?.name ?? null,
    childBorn: child?.birthYear ?? null,
  };
}

/** 이번 인생에 넘길 지난 인생들 — 최근 것부터 몇 개만 (오래된 인생까지 다 끼어들면 산만하다) */
export function pickLegacy(lives: (LegacyLife | null | undefined)[], selfId?: string): LegacyLife[] {
  return lives.filter((l): l is LegacyLife => !!l && l.id !== selfId).slice(0, 6);
}

/** 라디오에 나올 만한 지난 인생 — 대표곡을 냈고, 그 해가 지났고, 알려졌거나 같은 나라 */
export function radioCandidates(s: GameState): LegacyLife[] {
  const y = Math.floor(s.time);
  const ct = s.player.country ?? 'KR';
  return (s.legacy ?? []).filter((l) => l.bestSong && l.songYear !== null && l.songYear <= y && (l.country === ct ? l.fans >= 50 : l.fans >= 3000) && !s.flags[`legacyRadio:${l.id}`]);
}

/** 선배 밴드로 나올 만한 지난 인생 — 같은 나라, 그 밴드가 활동하던 시대, 이름이 좀 알려진 밴드 */
export function seniorCandidates(s: GameState): LegacyLife[] {
  const y = Math.floor(s.time);
  const ct = s.player.country ?? 'KR';
  return (s.legacy ?? []).filter((l) => l.bandName && l.country === ct && l.fans >= 500 && y >= l.born + 18 && y <= l.died - 1 && l.born < s.player.birthYear - 8);
}

/** 라이벌 리더가 될 지난 인생의 아이 — 같은 나라, 나와 다섯 살 안쪽 */
export function childRival(s: GameState): LegacyLife | null {
  const ct = s.player.country ?? 'KR';
  return (s.legacy ?? []).find((l) => l.childName && l.childBorn !== null && l.country === ct && Math.abs(l.childBorn - s.player.birthYear) <= 5) ?? null;
}

/** 화면에 붙이는 표시 */
export const legacyTag = (l: LegacyLife) => `지난 인생 — ${l.name} (${l.born}–${l.died})`;
