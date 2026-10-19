import type { Gender } from './types';
import type { Rng } from './rng';
import koreanNames from '../data/names/korean.json';
import bandWords from '../data/names/bands.json';

// 성씨 상위 빈도 (통계청 인구주택총조사 2015 성씨 순위 상위권을 참고한 가중치 — 게임용 근사)
const SURNAMES: [string, number][] = koreanNames.data.surnames as never;

// 출생 연대별로 흔한 이름의 분위기를 다르게 (게임용 근사)
const GIVEN: Record<Gender, Record<'60s' | '80s' | '90s' | '00s' | '10s', string[]>> = koreanNames.data.given as never;

function era(birthYear: number): '60s' | '80s' | '90s' | '00s' | '10s' {
  if (birthYear < 1975) return '60s';
  if (birthYear < 1988) return '80s';
  if (birthYear < 1998) return '90s';
  if (birthYear < 2010) return '00s';
  return '10s';
}

export function randomName(rng: Rng, gender: Gender, birthYear: number, avoid: Set<string> = new Set()): string {
  for (let i = 0; i < 20; i++) {
    const sur = rng.weighted(SURNAMES, (s) => s[1])![0];
    const g = rng.pick(GIVEN[gender][era(birthYear)]);
    const name = sur + g;
    if (!avoid.has(g)) return name;
  }
  return rng.pick(SURNAMES)[0] + rng.pick(GIVEN[gender][era(birthYear)]);
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
