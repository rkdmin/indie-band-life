// 나라별 대표 밴드와 활동 기간. ‘같이 공연’(오프닝 무대)과 ‘라디오에서 흘러나온 노래’ 사건이 쓴다.
// 해체·멤버의 죽음·장기 휴지기 뒤로는 나오지 않는다 (예: 너바나 1994년 3월, 조이 디비전 1980년 5월까지).
// 기간은 공개 음악사 자료의 활동 연표를 반올림한 근사값이다 [근사].
// 실존 밴드는 이름만 쓴다 — 말이나 행동을 지어내지 않고, 초상·로고·음원을 쓰지 않는다.

import type { Genre } from '../../types';
import type { CountryId } from '../countries';
import bandsJson from '../../../data/era/bands.json';

export interface Band {
  name: string;
  c: CountryId;
  from: number;
  to: number;
  genres: Genre[];
}

export const BANDS: Band[] = bandsJson.data as never;

/** 그 해 그 나라에서 활동 중이던 밴드 */
export function bandsAt(country: CountryId, year: number, genre?: Genre): Band[] {
  return BANDS.filter((b) => b.c === country && year >= b.from && year <= b.to && (!genre || b.genres.includes(genre)));
}
