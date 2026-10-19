// 시대의 일상: 그 해·그 나라에서만 자연스러운 작은 순간들. 인생 기록의 flavor 줄로 섞인다.
// 연도는 제도·풍경이 실제로 있던 기간의 근사값이다 [근사].
//   야간 통행금지 1945~1982.1 · 버스 안내양 ~1989 · 장발 단속 1970년대 · 교복 자율화 1983~1985
//   연탄 난방 1960~1990년대 · 삐삐 1990년대 · 외환위기 1997.12~ · 공중전화 카드 1986~

import type { CountryId } from '../countries';
import lifeJson from '../../../data/era/life.json';

export interface EraLine {
  from: number;
  to: number;
  c?: CountryId[];
  /** 이 나이 사이에만 */
  age?: [number, number];
  /** 밴드가 있을 때만 */
  band?: boolean;
  text: string;
}

export const ERA_LINES: EraLine[] = lifeJson.data as never;

export function eraLines(year: number, age: number, country: CountryId, hasBand: boolean): string[] {
  return ERA_LINES.filter(
    (l) => year >= l.from && year <= l.to && (!l.c || l.c.includes(country)) && (!l.age || (age >= l.age[0] && age < l.age[1])) && (!l.band || hasBand),
  ).map((l) => l.text);
}
