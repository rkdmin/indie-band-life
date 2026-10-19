// 태어날 나라. 몇몇 나라만 고르고, 각 나라의 실제 수치로 음악 인생의 조건을 바꾼다.
// 금액은 모두 원화로 환산해 보여 준다 (환율은 반올림한 근사).
//   [통계] IFPI Global Music Report 2025 (2024년 매출) 시장 순위: 미국·일본·영국·독일·중국·프랑스·한국·캐나다·브라질·멕시코
//   [근사] 연간 출생아 수(2023 전후), 기대수명, 합계출산율, 최저임금은 각국 공식 통계를 반올림

import type { Gender, Region } from '../types';
import type { Rng } from '../rng';
import countriesJson from '../../data/world/countries.json';
import { givenNamesFor } from '../names';

export type CountryId = 'KR' | 'JP' | 'US' | 'UK' | 'DE' | 'BR';

export interface Country {
  id: CountryId;
  name: string;
  flag: string;
  births: number; // 연간 출생아 수 [근사]
  lifeExp: number; // 기대수명 [근사]
  tfr: number; // 합계출산율 [근사]
  twinRate: number; // 다태아 비중 [근사]
  immigrantRate: number; // 이민 가정 출생 비중 [근사]
  origins: string[]; // 이민 가정 출신국 예시
  marketRank: number; // IFPI 녹음 음악 시장 순위 (2024)
  /** 자동 플레이 120회 시뮬레이션에서 팬 1만 명에 도달한 비율 (tests/country.test.ts) */
  simReach10k: number;
  marketMul: number; // 팬·음원 도달 배율 [가정, 시장 규모 순위 기반]
  wageMul: number; // 최저임금(원화 환산) / 한국 [근사]
  costMul: number; // 생활비 / 한국 [근사]
  military: boolean; // 남성 의무 병역
  scene: string; // 라이브 씬 한 줄
  quirk: string; // 이 나라 음악 생활의 특징
  regions: Record<Region, string>;
  surnames: string[];
  given: Record<Gender, string[]>;
  westernOrder: boolean; // 이름 순서: 이름 성
  /** 전국 최저임금제가 생긴 해 — 그 전 시급은 추정치로 표시 */
  minWageSince: number;
  /** [출생 연도, 기대수명] — 연도 사이는 선형 보간 [근사] */
  lifeExpTable: [number, number][];
}

export const COUNTRIES: Record<CountryId, Country> = countriesJson.data as never;

export const COUNTRY_IDS = Object.keys(COUNTRIES) as CountryId[];
export const countryOf = (id?: string): Country => COUNTRIES[(id as CountryId) ?? 'KR'] ?? COUNTRIES.KR;

/** 실제 연간 출생아 수에 비례해 태어날 나라를 뽑는다 */
export function rollCountry(rng: Rng): CountryId {
  return rng.weighted(COUNTRY_IDS, (c) => COUNTRIES[c].births)!;
}

export function countryBirthShare(id: CountryId): number {
  const total = COUNTRY_IDS.reduce((a, c) => a + COUNTRIES[c].births, 0);
  return COUNTRIES[id].births / total;
}

export function foreignName(rng: Rng, c: Country, gender: Gender, birthYear?: number): string {
  // 그 해에 태어난 아이에게 흔했던 이름 — 1955년생 미국인은 ‘리암’이 아니라 ‘제임스’
  const g = rng.pick((birthYear !== undefined ? givenNamesFor(c.id, gender, birthYear) : null) ?? c.given[gender]);
  const s = rng.pick(c.surnames);
  return c.westernOrder ? `${g} ${s}` : `${s} ${g}`;
}

/** 음악으로 성공하기 좋은 정도 (별 1~5) — 시뮬레이션에서 팬 1만 명에 도달한 비율로 매긴다 */
export function successStars(c: Country): number {
  return Math.max(1, Math.min(5, Math.round(c.simReach10k / 11)));
}

/** 그 해에 태어난 사람의 기대수명 (data/world/countries.json 의 lifeExpTable) */
export function lifeExpAt(c: Country, year: number): number {
  const t = c.lifeExpTable;
  if (year <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [y1, v1] = t[i];
    const [y0, v0] = t[i - 1];
    if (year <= y1) return Math.round((v0 + ((year - y0) / (y1 - y0)) * (v1 - v0)) * 10) / 10;
  }
  return t[t.length - 1][1];
}

/** 그 해에 그 나라에 전국 최저임금이 있었나 */
export const hasMinWage = (c: Country, year: number) => year >= c.minWageSince;
