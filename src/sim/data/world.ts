// 세계 데이터. 각 값 옆에 출처 성격을 표기한다:
//   [통계] 공식 통계에서 가져온 관측값 / [근사] 통계를 단순화한 근사식 / [가정] 게임 설계값
// 상세 출처와 기준연도는 docs/probability-sources.md 참조.

import type { Genre, Inst, Mood, Region, Skill } from '../types';

// [통계] 최저임금위원회 고시 시간급 (원). 2027년 이후는 연 3% 인상 [가정]
const MIN_WAGE: Record<number, number> = {
  2000: 1600, 2001: 1865, 2002: 2100, 2003: 2275, 2004: 2510, 2005: 2840, 2006: 3100,
  2007: 3480, 2008: 3770, 2009: 4000, 2010: 4110, 2011: 4320, 2012: 4580, 2013: 4860,
  2014: 5210, 2015: 5580, 2016: 6030, 2017: 6470, 2018: 7530, 2019: 8350, 2020: 8590,
  2021: 8720, 2022: 9160, 2023: 9620, 2024: 9860, 2025: 10030, 2026: 10320,
};

export function minWage(year: number): number {
  const y = Math.floor(year);
  if (MIN_WAGE[y]) return MIN_WAGE[y];
  if (y < 2000) return Math.round(1600 * Math.pow(0.93, 2000 - y));
  return Math.round(10320 * Math.pow(1.03, y - 2026));
}

/** 2026년 = 1.0 기준 물가 지수 (최저임금 비율로 근사) [근사] */
export const priceIndex = (year: number) => minWage(year) / 10320;

// [통계] 시도별 인구 비중 (KOSIS 주민등록인구, 2020년대 초 기준을 반올림)
export const REGIONS: { id: Region; label: string; weight: number; desc: string }[] = [
  { id: 'seoul', label: '서울', weight: 0.19, desc: '홍대·합정의 라이브 클럽이 지하철 몇 정거장 거리' },
  { id: 'gyeonggi', label: '경기·인천', weight: 0.31, desc: '광역버스 막차와 함께하는 밴드 생활' },
  { id: 'metro', label: '광역시', weight: 0.24, desc: '지역 씬의 터줏대감 클럽이 있는 도시' },
  { id: 'local', label: '지방 소도시', weight: 0.26, desc: '합주실은 멀지만 버스킹할 바다가 가깝다' },
];

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

export const ERAS: Era[] = [
  { from: 1990, to: 2009.99, name: 'CD에서 MP3로', gigMul: 0.9, streamMul: 0.5, desc: '음반 시장이 무너지고, 홍대 클럽데이가 씬을 지탱하던 시절' },
  { from: 2010, to: 2016.99, name: '오디션의 시대', gigMul: 1.0, streamMul: 0.8, desc: 'TV 오디션 프로그램이 스타를 만들던 시절' },
  { from: 2017, to: 2019.99, name: '스트리밍 정착', gigMul: 1.05, streamMul: 1.0, desc: '플레이리스트가 새 라디오가 된 시절' },
  { from: 2020, to: 2021.99, name: '멈춰 선 무대', gigMul: 0.25, streamMul: 1.1, desc: '감염병 유행으로 공연장 문이 닫힌 시절' },
  { from: 2022, to: 2027.99, name: '밴드 붐', gigMul: 1.4, streamMul: 1.3, desc: '페스티벌이 늘고, 숏폼에서 밴드 라이브가 퍼지던 시절' },
  { from: 2028, to: 2200, name: '다음 세대의 무대', gigMul: 1.15, streamMul: 1.2, desc: 'AI 음악이 넘쳐날수록 사람의 라이브가 귀해진 시절' },
];

export const eraOf = (year: number): Era => ERAS.find((e) => year >= e.from && year <= e.to) ?? ERAS[ERAS.length - 1];

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

export const GENRE_INFO: Record<Genre, GenreInfo> = {
  indierock: { id: 'indierock', label: '인디록', color: '#ff7a59', color2: '#ffd166', path: '클럽 → 페스티벌', reach: 1.0, loyalty: 1.0, keySkill: ['guitar', 'drums', 'stage'], moods: ['bright', 'wistful', 'epic'], desc: '라이브 입소문으로 크는 장르. 무대가 곧 명함이다.' },
  punk: { id: 'punk', label: '펑크', color: '#ff3d68', color2: '#1d1d1d', path: 'DIY 공연 → 소규모 투어', reach: 0.7, loyalty: 1.4, keySkill: ['drums', 'stage', 'vocal'], moods: ['angry', 'bright'], desc: '세 코드와 진심. 작은 공연장의 열기로 버틴다.' },
  shoegaze: { id: 'shoegaze', label: '슈게이즈', color: '#a98bff', color2: '#7de2d1', path: '음원 공유 → 마니아 팬층', reach: 0.6, loyalty: 1.5, keySkill: ['guitar', 'compose'], moods: ['dreamy', 'wistful'], desc: '노이즈의 벽 너머의 멜로디. 해외 리스너가 먼저 알아본다.' },
  folk: { id: 'folk', label: '포크', color: '#e9b872', color2: '#6b8f71', path: '버스킹 → 싱어송라이터', reach: 0.9, loyalty: 1.2, keySkill: ['vocal', 'guitar', 'compose'], moods: ['calm', 'wistful'], desc: '가사가 무기. 드라마 OST 제안이 올지도.' },
  metal: { id: 'metal', label: '메탈', color: '#c0c6d0', color2: '#8b0000', path: '기술 연습 → 전문 공연', reach: 0.45, loyalty: 1.8, keySkill: ['drums', 'guitar', 'bass'], moods: ['angry', 'epic'], desc: '좁지만 깊은 세계. 팬들은 평생 간다.' },
  indiepop: { id: 'indiepop', label: '인디팝', color: '#5ad1ff', color2: '#ff9ed2', path: 'SNS → 스트리밍', reach: 1.35, loyalty: 0.8, keySkill: ['vocal', 'keys', 'compose'], moods: ['bright', 'dreamy', 'calm'], desc: '숏폼 한 번이면 인생이 바뀐다. 대신 금방 잊힌다.' },
};

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
export const VENUES: Venue[] = [
  { id: 'openmic', label: '클럽 오픈마이크', capacity: 40, minFans: 0, cost: 0, ticket: 0, scene: 'club', energy: 15 },
  { id: 'club_group', label: '라이브클럽 합동공연', capacity: 120, minFans: 40, cost: 150_000, ticket: 20_000, scene: 'club', energy: 20 },
  { id: 'club_solo', label: '라이브클럽 단독공연', capacity: 250, minFans: 400, cost: 1_200_000, ticket: 30_000, scene: 'club', energy: 28 },
  { id: 'hall', label: '소극장 단독공연', capacity: 700, minFans: 2_000, cost: 6_000_000, ticket: 44_000, scene: 'club', energy: 32 },
  { id: 'local_fest', label: '지역 록 페스티벌', capacity: 3_000, minFans: 6_000, cost: 0, ticket: 0, scene: 'festival', energy: 30 },
  { id: 'big_fest', label: '대형 페스티벌 메인 스테이지', capacity: 25_000, minFans: 30_000, cost: 0, ticket: 0, scene: 'festival', energy: 35 },
  { id: 'arena', label: '아레나 단독 콘서트', capacity: 12_000, minFans: 90_000, cost: 400_000_000, ticket: 110_000, scene: 'arena', energy: 45 },
];

// [가정] 페스티벌 출연료 (팬 규모 기반)
export const festivalFee = (fans: number) => Math.round(Math.min(150_000_000, 300_000 + fans * 180));
