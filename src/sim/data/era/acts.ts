// 실존 밴드와 같은 무대 — ‘같이 공연’ 사건의 데이터.
//
// 규칙 (README ‘원칙’ 참고)
//  1. 텍스트로만. 실존 인물의 초상·로고·음원은 쓰지 않는다.
//  2. 실존 인물의 말이나 행동을 지어내지 않는다. 문장은 언제나 ‘내가’ 겪은 일이다
//     (“포스터에 우리 이름이 나란히 적혔다”, “오프닝 무대에 섰다”, “맨 앞에서 그들의 무대를 봤다”).
//  3. 그 밴드가 그 해·그 나라·그 무대에서 실제로 활동했다는 사실에만 기대어 배치한다.
//  4. 홍보(스토어·광고)에는 실존 이름을 쓰지 않는다.

import type { Genre } from '../../types';
import type { CountryId } from '../countries';
import { BANDS } from './bands';
import scenesJson from '../../../data/era/scenes.json';
import billsJson from '../../../data/era/bills.json';

const PUB = '공개 음악사 자료(위키백과 등)';

/** 클럽 씬: 이 기간 이 도시의 작은 무대에서 실제로 공연하던 밴드들 */
export interface Scene {
  id: string;
  c: CountryId;
  from: number;
  to: number;
  place: string;
  acts: string[];
  genres: Genre[];
  src: string;
}

const HAND_SCENES: Scene[] = scenesJson.data as never;

/** 무명 시절의 작은 무대: 모든 대표 밴드는 데뷔 전후 몇 년 동안 작은 클럽에서 공연했다 — 그 무대에 함께 선다 */
function clubPlace(c: CountryId, y: number): string {
  if (c === 'KR') return y < 1980 ? '음악다방 무대' : y < 1995 ? '소극장 무대' : '홍대 앞 클럽';
  return { JP: '라이브하우스', US: '동네 클럽', UK: '펍 뒷방 무대', DE: '클럽', BR: '라이브 바' }[c] ?? '클럽';
}

export const SCENES: Scene[] = [
  ...HAND_SCENES,
  ...BANDS.filter((b) => !HAND_SCENES.some((h) => h.acts.includes(b.name))).map((b) => ({
    id: `${b.c}_${b.name}_club`,
    c: b.c,
    from: b.from,
    to: Math.min(b.to, b.from + 2.5),
    place: clubPlace(b.c, b.from),
    acts: [b.name],
    genres: b.genres,
    src: PUB,
  })),
];

/** 투어: 이 기간 이 나라를 돌던 밴드 — 오프닝 무대 자리 */
export interface Tour {
  id: string;
  c: CountryId;
  from: number;
  to: number;
  act: string;
  genres: Genre[];
  src: string;
}

// 오프닝 무대 자리는 bands.ts 의 활동 기간에서 만든다
export const TOURS: Tour[] = BANDS.map((b) => ({ id: `${b.c}_${b.name}`, c: b.c, from: b.from, to: b.to, act: b.name, genres: b.genres, src: PUB }));

/** 페스티벌 라인업: 실제 그 회차에 섰던 밴드 (보도·공식 기록으로 확인) */
export interface Bill {
  id: string;
  c: CountryId;
  y: number;
  m: number;
  event: string;
  top: string[];
  /** 실제 상황 — 악천후 등 */
  note?: string;
  src: string;
}

export const BILLS: Bill[] = billsJson.data as never;

const fits = (genres: Genre[], g?: Genre) => !g || genres.includes(g);

export function scenesAt(country: CountryId, year: number, genre?: Genre): Scene[] {
  return SCENES.filter((x) => x.c === country && year >= x.from && year <= x.to && fits(x.genres, genre));
}

export function toursAt(country: CountryId, year: number, genre?: Genre): Tour[] {
  return TOURS.filter((x) => x.c === country && year >= x.from && year <= x.to && fits(x.genres, genre));
}

export function billAt(country: CountryId, year: number): Bill | undefined {
  return BILLS.find((b) => b.c === country && Math.floor(year) === b.y);
}
