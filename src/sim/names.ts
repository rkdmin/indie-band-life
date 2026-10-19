import type { Gender } from './types';
import type { Rng } from './rng';
import koreanNames from '../data/names/korean.json';
import bandWords from '../data/names/bands.json';
import givenJson from '../data/names/given.json';

// 성씨 상위 빈도 (통계청 인구주택총조사 2015 성씨 순위 상위권을 참고한 가중치 — 게임용 근사)
const SURNAMES: [string, number][] = koreanNames.data.surnames as never;

// 출생 연대별로 실제로 흔했던 이름 (data/names/given.json)
const GIVEN = givenJson.data as unknown as Record<string, Record<Gender, [number, string[]][]>>;

/** 그 나라에서 그 해에 태어난 아이에게 흔했던 이름들 */
export function givenNamesFor(country: string | undefined, gender: Gender, birthYear: number): string[] | null {
  const table = GIVEN[country ?? 'KR']?.[gender];
  if (!table) return null;
  let pick = table[0][1];
  for (const [from, names] of table) if (birthYear >= from) pick = names;
  return pick;
}

export function randomName(rng: Rng, gender: Gender, birthYear: number, avoid: Set<string> = new Set()): string {
  for (let i = 0; i < 20; i++) {
    const sur = rng.weighted(SURNAMES, (s) => s[1])![0];
    const g = rng.pick(givenNamesFor('KR', gender, birthYear)!);
    const name = sur + g;
    if (!avoid.has(g)) return name;
  }
  return rng.pick(SURNAMES)[0] + rng.pick(givenNamesFor('KR', gender, birthYear)!);
}

const BAND_A = bandWords.data.a;
const BAND_B = bandWords.data.b;
const BAND_EN = bandWords.data.en;

export function randomBandName(rng: Rng): string {
  const r = rng.next();
  if (r < 0.62) return `${rng.pick(BAND_A)} ${rng.pick(BAND_B)}`;
  if (r < 0.82) return rng.pick(BAND_EN);
  return `${rng.pick(BAND_B)}${rng.pick(['들', '클럽', '연구소', '단', ' 공장', ' 다방'])}`;
}
