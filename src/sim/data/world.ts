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
  { from: 1900, to: 1969.99, name: '미8군 무대와 그룹사운드', gigMul: 0.7, streamMul: 0.5, desc: '미군 클럽 무대에서 밴드 음악을 배우고, 라디오와 LP로 노래가 퍼지던 시절' },
  { from: 1970, to: 1979.99, name: '통기타와 금지곡', gigMul: 0.6, streamMul: 0.55, desc: '청바지와 통기타의 시절. 1975년 공연활동 정화대책으로 금지곡이 쏟아졌다' },
  { from: 1980, to: 1989.99, name: '대학가요제와 언더그라운드', gigMul: 0.85, streamMul: 0.6, desc: '대학가요제가 스타를 만들고, 소극장 공연이 언더그라운드를 키우던 시절' },
  { from: 1990, to: 2009.99, name: 'CD에서 MP3로', gigMul: 0.9, streamMul: 0.5, desc: '음반 시장이 무너지고, 홍대 클럽데이가 씬을 지탱하던 시절' },
  { from: 2010, to: 2016.99, name: '오디션의 시대', gigMul: 1.0, streamMul: 0.8, desc: 'TV 오디션 프로그램이 스타를 만들던 시절' },
  { from: 2017, to: 2019.99, name: '스트리밍 정착', gigMul: 1.05, streamMul: 1.0, desc: '플레이리스트가 새 라디오가 된 시절' },
  { from: 2020, to: 2021.99, name: '멈춰 선 무대', gigMul: 0.25, streamMul: 1.1, desc: '감염병 유행으로 공연장 문이 닫힌 시절' },
  { from: 2022, to: 2027.99, name: '밴드 붐', gigMul: 1.4, streamMul: 1.3, desc: '페스티벌이 늘고, 숏폼에서 밴드 라이브가 퍼지던 시절' },
  { from: 2028, to: 2200, name: '다음 세대의 무대', gigMul: 1.15, streamMul: 1.2, desc: 'AI 음악이 넘쳐날수록 사람의 라이브가 귀해진 시절' },
];

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

// [통계] 연간 출생아 수 (천 명, 통계청 인구동향조사 — 반올림). 2025년 이후는 24.5만 명 유지 [가정]
// 1950~1959 는 통계청 추계, 1960~ 는 인구동향조사 출생아 수 (천 명, 반올림) [근사]
const BIRTHS: Record<number, number> = {
  1950: 633, 1951: 675, 1952: 722, 1953: 777, 1954: 839, 1955: 908, 1956: 945, 1957: 963, 1958: 993, 1959: 1016,
  1960: 1081, 1961: 1046, 1962: 1037, 1963: 1033, 1964: 1002, 1965: 996, 1966: 1030, 1967: 1005, 1968: 1043, 1969: 1045,
  1970: 1007, 1971: 1025, 1972: 953, 1973: 966, 1974: 923, 1975: 874, 1976: 796, 1977: 825, 1978: 751, 1979: 863,
  1980: 863, 1981: 867, 1982: 848, 1983: 769, 1984: 675,
  1985: 655, 1986: 636, 1987: 624, 1988: 633, 1989: 639, 1990: 650, 1991: 709, 1992: 731, 1993: 716,
  1994: 721, 1995: 715, 1996: 691, 1997: 675, 1998: 642, 1999: 621, 2000: 640, 2001: 560, 2002: 497,
  2003: 495, 2004: 476, 2005: 435, 2006: 448, 2007: 493, 2008: 466, 2009: 445, 2010: 470, 2011: 471,
  2012: 485, 2013: 437, 2014: 435, 2015: 438, 2016: 406, 2017: 358, 2018: 327, 2019: 303, 2020: 272,
  2021: 261, 2022: 249, 2023: 230, 2024: 238,
};
export const birthsIn = (y: number) => (BIRTHS[y] ?? (y < 1985 ? 650 : 245)) * 1000;

// [근사] 출생 시 기대수명 (통계청 생명표, 남녀 전체) 연도 사이는 선형 보간
const LIFE_EXP: [number, number][] = [[1950, 47.5], [1960, 52.4], [1970, 62.3], [1980, 66.1], [1985, 68.9], [1990, 71.7], [1995, 73.8], [2000, 76.0], [2005, 78.2], [2010, 80.2], [2015, 82.1], [2020, 83.5], [2023, 83.5], [2040, 86]];
export function lifeExpectancy(y: number): number {
  for (let i = 1; i < LIFE_EXP.length; i++) {
    const [y1, v1] = LIFE_EXP[i];
    const [y0, v0] = LIFE_EXP[i - 1];
    if (y <= y1) return Math.round((v0 + ((Math.max(y, y0) - y0) / (y1 - y0)) * (v1 - v0)) * 10) / 10;
  }
  return 86;
}
