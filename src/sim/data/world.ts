// 세계 데이터. 각 값 옆에 출처 성격을 표기한다:
//   [통계] 공식 통계에서 가져온 관측값 / [근사] 통계를 단순화한 근사식 / [가정] 게임 설계값
// 상세 출처와 기준연도는 docs/probability-sources.md 참조.

import type { Genre, Inst, Mood, Region, Skill } from '../types';
import minWageJson from '../../data/world/min_wage.json';
import birthsJson from '../../data/world/births.json';
import lifeExpJson from '../../data/world/life_expectancy.json';
import erasJson from '../../data/world/eras.json';
import regionsJson from '../../data/world/regions.json';
import venuesJson from '../../data/world/venues.json';
import genresJson from '../../data/world/genres.json';

// [통계] 최저임금위원회 고시 시간급 (원). 2027년 이후는 연 3% 인상 [가정]
const MIN_WAGE: Record<number, number> = minWageJson.data as never;

export function minWage(year: number): number {
  const y = Math.floor(year);
  if (MIN_WAGE[y]) return MIN_WAGE[y];
  if (y < 2000) return Math.round(1600 * Math.pow(0.93, 2000 - y));
  return Math.round(10320 * Math.pow(1.03, y - 2026));
}

/** 2026년 = 1.0 기준 물가 지수 (최저임금 비율로 근사) [근사] */
export const priceIndex = (year: number) => minWage(year) / 10320;

// [통계] 시도별 인구 비중 (KOSIS 주민등록인구, 2020년대 초 기준을 반올림)
export const REGIONS: { id: Region; label: string; weight: number; desc: string }[] = regionsJson.data as never;

/**
 * [근사] 연간 사망확률 q(x) — 통계청 생명표(2023, 남녀 전체) 를 Gompertz 곡선으로 근사.
 *   q(30)≈0.0004, q(50)≈0.0023, q(70)≈0.015, q(80)≈0.04, q(90)≈0.12
 * 건강 점수(0~100, 기준 60)와 흡연 기간이 위험비로 곱해진다.
 * 위험비는 [가정]: 흡연 장기 위험비 ~1.8 은 일반적인 역학 연구 범위를 단순화한 값.
 */
export function annualDeathProb(age: number, health: number, smokeYears: number): number {
  const base = Math.min(0.6, 0.000021 * Math.exp(0.0945 * age));
  const healthHR = Math.exp((60 - health) / 22);
  const smokeHR = smokeYears >= 20 ? 1.8 : smokeYears >= 10 ? 1.35 : 1;
  return Math.min(0.9, base * healthHR * smokeHR);
}

// [가정] 시대별 음악 시장 분위기. 사건과 공연 수익 배율에 쓰인다.
export interface Era {
  from: number;
  to: number;
  name: string;
  gigMul: number;
  streamMul: number;
  desc: string;
}

/** 한국 인생의 시대 구분 */
export const ERAS: Era[] = erasJson.data.kr as never;
/** 그 밖의 나라 인생의 시대 구분 */
export const ERAS_GLOBAL: Era[] = erasJson.data.global as never;

/** [근사] 육군 복무 기간(년). 1970년대 36개월에서 단계적으로 줄어 2020년 이후 18개월 */
export function serviceYears(year: number): number {
  if (year < 1977) return 3;
  if (year < 1984) return 2.75;
  if (year < 1990) return 2.5;
  if (year < 2003) return 26 / 12;
  if (year < 2011) return 2;
  if (year < 2018) return 21 / 12;
  return 1.5;
}

export const eraOf = (year: number, country?: string): Era => {
  const list = !country || country === 'KR' ? ERAS : ERAS_GLOBAL;
  return list.find((e) => year >= e.from && year <= e.to) ?? list[list.length - 1];
};

export interface GenreInfo {
  id: Genre;
  label: string;
  color: string;
  color2: string;
  path: string;
  reach: number; // 대중 도달 배율 [가정]
  loyalty: number; // 팬 충성도 배율 [가정]
  keySkill: Skill[];
  moods: Mood[];
  desc: string;
}

export const GENRE_INFO: Record<Genre, GenreInfo> = genresJson.data as never;

export const INST_LABEL: Record<Inst, string> = {
  vocal: '보컬',
  guitar: '기타',
  bass: '베이스',
  drums: '드럼',
  keys: '키보드',
};

export const SKILL_LABEL: Record<Skill, string> = {
  vocal: '보컬',
  guitar: '기타',
  bass: '베이스',
  drums: '드럼',
  keys: '건반',
  compose: '작곡',
  stage: '무대',
};

export const MOOD_LABEL: Record<Mood, string> = {
  bright: '밝은',
  wistful: '아련한',
  angry: '분노한',
  dreamy: '몽환적인',
  calm: '잔잔한',
  epic: '웅장한',
};

export interface Venue {
  id: string;
  label: string;
  capacity: number;
  minFans: number;
  cost: number; // 대관·운영비 (2026 기준 원) [가정]
  ticket: number; // 티켓 단가 [가정]
  scene: 'street' | 'club' | 'festival' | 'arena';
  energy: number;
}

// [가정] 공연장 사다리. 실제 공연장 이름은 쓰지 않는다.
export const VENUES: Venue[] = venuesJson.data as never;

// [가정] 페스티벌 출연료 (팬 규모 기반)
export const festivalFee = (fans: number) => Math.round(Math.min(150_000_000, 300_000 + fans * 180));

// [통계] 연간 출생아 수 (천 명, 통계청 인구동향조사 — 반올림). 2025년 이후는 24.5만 명 유지 [가정]
// 1950~1959 는 통계청 추계, 1960~ 는 인구동향조사 출생아 수 (천 명, 반올림) [근사]
const BIRTHS: Record<number, number> = birthsJson.data as never;
export const birthsIn = (y: number) => (BIRTHS[y] ?? (y < 1985 ? 650 : 245)) * 1000;

// [근사] 출생 시 기대수명 (통계청 생명표, 남녀 전체) 연도 사이는 선형 보간
const LIFE_EXP: [number, number][] = lifeExpJson.data as never;
export function lifeExpectancy(y: number): number {
  for (let i = 1; i < LIFE_EXP.length; i++) {
    const [y1, v1] = LIFE_EXP[i];
    const [y0, v0] = LIFE_EXP[i - 1];
    if (y <= y1) return Math.round((v0 + ((Math.max(y, y0) - y0) / (y1 - y0)) * (v1 - v0)) * 10) / 10;
  }
  return 86;
}
