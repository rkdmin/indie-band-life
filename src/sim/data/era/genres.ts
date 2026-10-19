// 장르의 시대: 장르 이름이 생기기 전에는 그 장르의 ‘조상’ 이름으로 부른다.
// 1968년에 슈게이즈 밴드는 없다 — 대신 그 소리의 조상인 사이키델릭 사운드를 한다.
//  - named: 장르 이름이 세계적으로 쓰이기 시작한 해 (명칭 기준, 모든 나라 공통)
//  - scene: 그 나라에 그 장르의 ‘씬’(클럽·밴드·관객)이 생긴 해 — 씬 사건과 물결의 조건
//  - before: named 이전의 이름 [이 해부터, 이 이름]. 받침 유무를 원래 이름과 맞춰 조사가 어긋나지 않게 했다.
// 연도는 음악사 서술의 통상적 구분을 따른 근사값이다 [근사].

import type { Genre } from '../../types';
import type { CountryId } from '../countries';
import genresJson from '../../../data/era/genres.json';

export interface GenreEra {
  id: Genre;
  label: string;
  named: number;
  scene: Record<CountryId, number>;
  before: [number, string][];
  /** 어느 시대에도 맞는 한 줄 소개 */
  pitch: string;
  note: string;
}

export const GENRE_ERAS: Record<Genre, GenreEra> = genresJson.data as never;

/** 이 나라에서 이 장르 이름이 자연스러워지는 해 — 세계적으로 이름이 생기고, 그 나라에 씬이 생긴 뒤 */
export function genreNamedIn(g: Genre, country?: CountryId | string): number {
  const e = GENRE_ERAS[g];
  const sc = country ? e.scene[country as CountryId] : undefined;
  return sc !== undefined ? Math.max(e.named, sc) : e.named;
}

/** 그 해(그 나라)에 이 장르를 부르던 이름. 1986년 한국에 ‘인디록’ 밴드는 없다 — 그냥 ‘록’ 밴드다 */
export function genreLabel(g: Genre, year: number, country?: CountryId | string): string {
  const e = GENRE_ERAS[g];
  if (year >= genreNamedIn(g, country)) return e.label;
  return e.before.find(([from]) => year >= from)?.[1] ?? e.before[e.before.length - 1][1];
}

/** 그 나라에 이 장르의 씬이 있었나 */
export function hasScene(g: Genre, year: number, country: CountryId = 'KR'): boolean {
  return year >= GENRE_ERAS[g].scene[country];
}
