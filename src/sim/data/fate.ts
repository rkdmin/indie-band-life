// 인생 변수(운명 카드). 태어날 때 한 번 굴리고, 각 결과가 나올 확률을 실제 통계에서 가져온다.
// 화면에는 결과와 확률·출처가 함께 보이고, 모두 곱해 ‘이런 인생이 나올 확률’을 계산한다.
//   [통계] 공식 통계 값 / [근사] 통계를 단순화한 값 / [가정] 게임 설계값

import type { Rng } from '../rng';
import tables from '../../data/fate/tables.json';
import originsJson from '../../data/fate/origins.json';
import parentJobsJson from '../../data/fate/parent_jobs.json';
import { tfrAt } from './countries';

export interface FateDraw {
  id: string;
  label: string; // 결과 (예: '동생 1명')
  p: number; // 이 결과가 나올 확률
  src: string;
  kind: '통계' | '근사' | '가정';
  /** 나중에 사건으로 이어지는 시점(나이) */
  at?: number;
  /** 태어나는 순간엔 아직 정해지지 않은 미래 (출생증명서에 보이지 않는다 — 살면서 드러난다) */
  future?: boolean;
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
export const TFR: [number, number][] = tables.data.tfr.table as never;
// [근사] 다태아 출생 비중 — 2023년 5.5%(통계청). 이전 연도는 시험관 시술 확산 추세로 근사
const GRAND: [number, number][] = tables.data.grandparents.table as never;
const TWIN: [number, number][] = tables.data.twin.table as never;
// [근사] 다문화 가정 출생 비중 — 2023년 5.3%(통계청 다문화 인구동태). 이전 연도는 추세 근사
const MULTI: [number, number][] = tables.data.multicultural.table as never;

// [통계] 다문화 혼인 외국인 아내 출신국 순위(베트남·중국·태국 순)를 반영한 가중치
const ORIGINS: [string, number, string][] = originsJson.data as never;

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
const FACT = [1, 1, 2, 6, 24, 120, 720, 5040];
const poissonP = (k: number, l: number) => (Math.exp(-l) * Math.pow(l, k)) / FACT[Math.min(k, 7)];
/** k 이상일 확률 */
const poissonTail = (k: number, l: number) => Math.max(0, 1 - Array.from({ length: k }, (_, i) => poissonP(i, l)).reduce((a, b) => a + b, 0));

export type ParentJob = 'office' | 'pro' | 'shop' | 'factory' | 'farm' | 'driver';

/** [근사] 출생 연도별 부모님 직업 분포 — data/fate/parent_jobs.json (1960년대엔 절반 넘게 농어업) */
export function parentJobsFor(birthYear: number): [ParentJob, number, string][] {
  const rows = parentJobsJson.data;
  const row = [...rows].reverse().find((r) => birthYear >= r.from) ?? rows[0];
  const labels = parentJobsJson.labels as Record<ParentJob, string>;
  return (Object.entries(row.weights) as [ParentJob, number][]).map(([id, w]) => [id, w, labels[id]]);
}

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
  const tfr = country && country.id !== 'KR' ? tfrAt(country, birthYear) : lerpTable(TFR, birthYear);
  const lambda = Math.max(0.15, tfr * 1.2 - 0.6);
  // 출산율이 높던 시절엔 대여섯 남매도 흔했다 — 형제 수 상한을 시대에 맞춘다
  const cap = tfr >= 3 ? 6 : tfr >= 2 ? 4 : 3;
  const sib = Math.min(cap, poisson(rng, lambda));
  const older = sib ? rng.int(0, sib) : 0;
  const younger = sib - older;
  const pSib = (sib === cap ? poissonTail(cap, lambda) : poissonP(sib, lambda)) * (1 / (sib + 1));
  add({
    id: 'siblings',
    label: sib === 0 ? '외동' : [older ? `손위 형제 ${older}명` : '', younger ? `동생 ${younger}명` : ''].filter(Boolean).join(' · '),
    p: pSib,
    src: country && country.id !== 'KR' ? `${birthYear}년 ${country.name} 합계출산율 ${tfr.toFixed(2)}명으로 형제 수 분포를 근사` : `${birthYear}년 합계출산율 ${tfr.toFixed(2)}명으로 형제 수 분포를 근사`,
    kind: '근사',
    // 동생은 아직 태어나지 않았다
    future: younger > 0,
  });

  // 부모님 직업 (집안의 주 수입원)
  const job = rng.weighted(parentJobsFor(birthYear), (x) => x[1])!;
  add({ id: 'parentjob', label: `부모님: ${job[2]}`, p: job[1], src: country && country.id !== 'KR' ? `${birthYear}년 무렵 산업별 취업자 비중 — 한국 추세를 빌려 여섯 묶음으로 근사 (그 나라 자료는 아직 넣지 못했다)` : `${birthYear}년 무렵 산업별 취업자 비중 (통계청 경제활동인구조사 추세)을 여섯 묶음으로 근사`, kind: '근사' });

  // 쌍둥이
  const twinRate = country && country.id !== 'KR' ? country.twinRate : lerpTable(TWIN, birthYear);
  const twin = rng.chance(twinRate);
  if (twin) add({ id: 'twin', label: '쌍둥이로 태어남', p: twinRate, src: country && country.id !== 'KR' ? `${country.name} 다태아 출생 비중 ${(twinRate * 100).toFixed(1)}% [근사]` : '다태아 출생 비중 (2023년 5.5%, 통계청 출생통계)', kind: birthYear >= 2023 && !(country && country.id !== 'KR') ? '통계' : '근사' });

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
  if (divorceAge !== null) add({ id: 'divorce', label: `${divorceAge}살 무렵 부모님이 갈라선다`, p: 0.1 / 14, src: '연간 이혼 약 9.2만 건 (2023 혼인·이혼 통계) 규모로 근사', kind: '근사', at: divorceAge, future: true });

  // 부모님 실직·폐업 — [가정]
  const jobLossAge = rng.chance(0.15) ? rng.int(6, 18) : null;
  if (jobLossAge !== null) add({ id: 'jobloss', label: `${jobLossAge}살 무렵 집안 가세가 기운다`, p: 0.15 / 13, src: '게임 가정', kind: '가정', at: jobLossAge, future: true });

  // 조부모와 함께 사는 3대 가구 — [근사]
  // 3세대 가구는 1960~70년대엔 흔했고 점점 줄었다 [근사]
  const grandRate = country && country.id !== 'KR' ? 0.06 : lerpTable(GRAND, birthYear);
  const grandparents = rng.chance(grandRate);
  if (grandparents) add({ id: 'grand', label: '할머니·할아버지와 함께 산다', p: grandRate, src: `${birthYear}년 무렵 3세대 가구 비중 근사 (인구주택총조사 추세)`, kind: '근사' });

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
  if (!grandparents) log += -Math.log10(1 - grandRate);
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
