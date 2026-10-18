// 인생 변수(운명 카드). 태어날 때 한 번 굴리고, 각 결과가 나올 확률을 실제 통계에서 가져온다.
// 화면에는 결과와 확률·출처가 함께 보이고, 모두 곱해 ‘이런 인생이 나올 확률’을 계산한다.
//   [통계] 공식 통계 값 / [근사] 통계를 단순화한 값 / [가정] 게임 설계값

import type { Rng } from '../rng';

export interface FateDraw {
  id: string;
  label: string; // 결과 (예: '동생 1명')
  p: number; // 이 결과가 나올 확률
  src: string;
  kind: '통계' | '근사' | '가정';
  /** 나중에 사건으로 이어지는 시점(나이) */
  at?: number;
  extra?: string;
}

/** 보간 도우미 */
function lerpTable(t: [number, number][], y: number): number {
  if (y <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (y <= t[i][0]) {
      const [y0, v0] = t[i - 1];
      const [y1, v1] = t[i];
      return v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
    }
  }
  return t[t.length - 1][1];
}

// [통계] 합계출산율 (통계청 인구동향조사). 1990·2005·2020 은 반올림 근사
export const TFR: [number, number][] = [[1985, 1.66], [1990, 1.57], [1995, 1.63], [2000, 1.48], [2005, 1.08], [2010, 1.23], [2015, 1.24], [2018, 0.98], [2020, 0.84], [2021, 0.81], [2023, 0.72], [2024, 0.75], [2025, 0.8], [2030, 0.85]];
// [근사] 다태아 출생 비중 — 2023년 5.5%(통계청). 이전 연도는 시험관 시술 확산 추세로 근사
const TWIN: [number, number][] = [[1985, 0.01], [1995, 0.012], [2000, 0.019], [2010, 0.027], [2015, 0.037], [2020, 0.054], [2023, 0.055], [2030, 0.057]];
// [근사] 다문화 가정 출생 비중 — 2023년 5.3%(통계청 다문화 인구동태). 이전 연도는 추세 근사
const MULTI: [number, number][] = [[1985, 0.003], [2000, 0.01], [2008, 0.029], [2012, 0.047], [2015, 0.045], [2020, 0.06], [2023, 0.053], [2030, 0.055]];

// [통계] 다문화 혼인 외국인 아내 출신국 순위(베트남·중국·태국 순)를 반영한 가중치
const ORIGINS: [string, number, string][] = [
  ['베트남', 30, '베트남 민요'],
  ['중국', 20, '중국 전통 가요'],
  ['태국', 8, '태국 룩퉁'],
  ['필리핀', 7, '필리핀 OPM 발라드'],
  ['일본', 7, '일본 시티팝'],
  ['미국', 6, '미국 컨트리'],
  ['캄보디아', 4, '캄보디아 전통 음악'],
  ['몽골', 3, '몽골 흐미'],
  ['우즈베키스탄', 3, '우즈베크 전통 음악'],
];

function poisson(rng: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return k - 1;
}
const poissonP = (k: number, l: number) => (Math.exp(-l) * Math.pow(l, k)) / [1, 1, 2, 6, 24, 120][Math.min(k, 5)];

export type ParentJob = 'office' | 'pro' | 'shop' | 'factory' | 'farm' | 'driver';

// [근사] 직업별 취업자 비중(통계청 경제활동인구조사)을 여섯 묶음으로 단순화
export const PARENT_JOBS: [ParentJob, number, string][] = [
  ['office', 0.2, '회사원'],
  ['pro', 0.2, '전문직·기술직'],
  ['shop', 0.22, '자영업·서비스직'],
  ['factory', 0.22, '공장·현장 기술자'],
  ['driver', 0.1, '운전·물류'],
  ['farm', 0.06, '농어업'],
];

export interface FateResult {
  draws: FateDraw[];
  parentJob: ParentJob;
  older: number;
  younger: number;
  twin: boolean;
  origin: { country: string; music: string; parent: 'mom' | 'dad' } | null;
  divorceAge: number | null;
  jobLossAge: number | null;
  grandparents: boolean;
  pet: boolean;
  perfectPitch: boolean;
  lefty: boolean;
  cancerAge: number | null;
  /** log10(1/확률) 합 — 희귀도 */
  rarityLog: number;
}

export function rollFate(rng: Rng, birthYear: number, gender: 'm' | 'f', country: import('./countries').Country | null = null): FateResult {
  const draws: FateDraw[] = [];
  const add = (d: FateDraw) => draws.push(d);

  // 형제 — 합계출산율로 형제 수 분포를 근사 (자녀 수 = 1 + 포아송)
  const tfr = country && country.id !== 'KR' ? country.tfr : lerpTable(TFR, birthYear);
  const lambda = Math.max(0.15, tfr * 1.2 - 0.6);
  const sib = Math.min(3, poisson(rng, lambda)); // 다섯 남매 이상은 실제로 매우 드물어 3명에서 자른다
  const older = sib ? rng.int(0, sib) : 0;
  const younger = sib - older;
  const pSib = poissonP(sib, lambda) * (1 / (sib + 1));
  add({
    id: 'siblings',
    label: sib === 0 ? '외동' : [older ? `손위 형제 ${older}명` : '', younger ? `동생 ${younger}명` : ''].filter(Boolean).join(' · '),
    p: pSib,
    src: country && country.id !== 'KR' ? `${country.name} 합계출산율 ${tfr.toFixed(2)}명으로 근사` : `${birthYear}년 합계출산율 ${tfr.toFixed(2)}명으로 형제 수 분포를 근사`,
    kind: '근사',
  });

  // 부모님 직업 (집안의 주 수입원)
  const job = rng.weighted(PARENT_JOBS, (x) => x[1])!;
  add({ id: 'parentjob', label: `부모님: ${job[2]}`, p: job[1], src: '직업별 취업자 비중 (통계청 경제활동인구조사)을 여섯 묶음으로 근사', kind: '근사' });

  // 쌍둥이
  const twinRate = country && country.id !== 'KR' ? country.twinRate : lerpTable(TWIN, birthYear);
  const twin = rng.chance(twinRate);
  if (twin) add({ id: 'twin', label: '쌍둥이로 태어남', p: twinRate, src: '다태아 출생 비중 (2023년 5.5%, 통계청 출생통계)', kind: birthYear >= 2023 ? '통계' : '근사' });

  // 다문화 가정
  const multiRate = country && country.id !== 'KR' ? country.immigrantRate : lerpTable(MULTI, birthYear);
  let origin: FateResult['origin'] = null;
  if (rng.chance(multiRate)) {
    const o: [string, number, string] = country && country.id !== 'KR' ? [rng.pick(country.origins), 1, `${'고향'} 노래`] : rng.weighted(ORIGINS, (x) => x[1])!;
    if (country && country.id !== 'KR') o[2] = `${o[0]}의 옛 노래`;
    origin = { country: o[0], music: o[2], parent: rng.chance(0.75) ? 'mom' : 'dad' };
    const label = country && country.id !== 'KR' ? '이민 가정' : '다문화 가정';
    add({ id: 'multi', label: `${label} — ${origin.parent === 'mom' ? '엄마' : '아빠'}의 나라 ${o[0]}`, p: country && country.id !== 'KR' ? multiRate / country.origins.length : multiRate * (o[1] / 88), src: country && country.id !== 'KR' ? `${country.name} 이민 가정 출생 비중 약 ${Math.round(multiRate * 100)}%` : '다문화 가정 출생 비중 (2023년 5.3%, 통계청 다문화 인구동태)', kind: '근사' });
  }

  // 부모님 이혼 (18세 전) — [근사] 연간 이혼 9만여 건 규모로 근사
  const divorceAge = rng.chance(0.1) ? rng.int(4, 17) : null;
  if (divorceAge !== null) add({ id: 'divorce', label: `${divorceAge}살 무렵 부모님이 갈라선다`, p: 0.1 / 14, src: '연간 이혼 약 9.2만 건 (2023 혼인·이혼 통계) 규모로 근사', kind: '근사', at: divorceAge });

  // 부모님 실직·폐업 — [가정]
  const jobLossAge = rng.chance(0.15) ? rng.int(6, 18) : null;
  if (jobLossAge !== null) add({ id: 'jobloss', label: `${jobLossAge}살 무렵 집안 가세가 기운다`, p: 0.15 / 13, src: '게임 가정', kind: '가정', at: jobLossAge });

  // 조부모와 함께 사는 3대 가구 — [근사]
  const grandparents = rng.chance(0.06);
  if (grandparents) add({ id: 'grand', label: '할머니·할아버지와 함께 산다', p: 0.06, src: '3세대 가구 비중 근사', kind: '근사' });

  // 반려동물 — [통계] 반려동물 양육 가구 약 28%
  const pet = rng.chance(0.28);
  if (pet) add({ id: 'pet', label: rng.chance(0.7) ? '집에 강아지가 있다' : '집에 고양이가 있다', p: 0.28, src: '반려동물 양육 가구 비율 약 28%', kind: '근사' });

  // 절대음감 — [근사] 일반 인구 1만 명 중 1명꼴로 알려짐 (조기 음악교육 시 더 높다는 연구도)
  const perfectPitch = rng.chance(0.0004);
  if (perfectPitch) add({ id: 'pitch', label: '절대음감을 타고났다', p: 0.0004, src: '일반 인구 1만 명 중 1명꼴 추정 (조기 음악교육 효과 포함해 상향)', kind: '근사' });

  // 왼손잡이 — [근사] 한국 성인 약 5%
  const lefty = rng.chance(0.05);
  if (lefty) add({ id: 'lefty', label: '왼손잡이', p: 0.05, src: '한국 성인 왼손잡이 약 5% 추정', kind: '근사' });

  // 평생 암 발생 — [통계] 기대수명까지 생존 시 남 37.7%·여 34.8% (2022 국가암등록통계)
  const cancerRisk = gender === 'm' ? 0.377 : 0.348;
  let cancerAge: number | null = null;
  if (rng.chance(cancerRisk)) {
    // 발생 나이는 50~80대에 몰린다 [근사]
    cancerAge = Math.round(Math.max(35, Math.min(88, rng.normal(66, 11))));
  }

  // 희귀도 = 드러난 결과들의 확률 곱 (드러나지 않은 ‘아님’ 결과도 포함)
  let log = 0;
  for (const d of draws) log += -Math.log10(Math.max(1e-12, d.p));
  if (!twin) log += -Math.log10(1 - twinRate);
  if (!origin) log += -Math.log10(1 - multiRate);
  if (!grandparents) log += -Math.log10(0.94);
  if (!pet) log += -Math.log10(0.72);
  if (divorceAge === null) log += -Math.log10(0.9);
  if (jobLossAge === null) log += -Math.log10(0.85);
  if (!lefty) log += -Math.log10(0.95);

  return { draws, parentJob: job[0], older, younger, twin, origin, divorceAge, jobLossAge, grandparents, pet, perfectPitch, lefty, cancerAge, rarityLog: log };
}

// ───────── 타고난 재능 ─────────
export const TALENTS = ['pitch', 'rhythm', 'lyric', 'presence', 'stamina'] as const;
export type Talent = (typeof TALENTS)[number];
export const TALENT_LABEL: Record<Talent, string> = { pitch: '음감', rhythm: '리듬감', lyric: '가사 감각', presence: '무대 존재감', stamina: '체력' };

/** 정규분포(평균 50, 표준편차 15)로 굴린다 — 별 1~5개 */
export function rollTalents(rng: Rng, perfectPitch: boolean): Record<Talent, number> {
  const t = {} as Record<Talent, number>;
  for (const k of TALENTS) t[k] = Math.round(Math.max(5, Math.min(98, rng.normal(50, 15))));
  if (perfectPitch) t.pitch = Math.max(t.pitch, 92);
  return t;
}
export const stars = (v: number) => (v >= 80 ? 5 : v >= 63 ? 4 : v >= 40 ? 3 : v >= 22 ? 2 : 1);

/** 희귀도를 사람이 읽을 숫자로 */
export function rarityText(log10: number): string {
  const n = Math.pow(10, log10);
  if (n >= 1e8) return `${Math.round(n / 1e8).toLocaleString()}억 분의 1`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만 분의 1`;
  return `${Math.round(n).toLocaleString()}분의 1`;
}
