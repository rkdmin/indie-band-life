// 외모 — data/fate/appearance.json 의 나라·성별·출생 연도별 분포에서 뽑는다.
// NPC 의 외모는 고유 시드(look)에서 결정적으로 계산한다 (저장할 필요가 없고, 게임 난수도 건드리지 않는다).
// 플레이어만 태어날 때 부모님에게서 유전된다 (키는 부모 평균으로 회귀, 머리 색·결·피부는 둘 중 하나를 닮는다).

import { Rng, clamp } from './rng';
import type { Gender } from './types';
import type { CountryId } from './data/countries';
import appJson from '../data/fate/appearance.json';

export type HairColor = 'black' | 'darkbrown' | 'brown' | 'blond' | 'red';
export type HairTex = 'straight' | 'wavy' | 'curly';

export interface Appearance {
  height: number; // 성인 키 cm
  build: 'slim' | 'avg' | 'broad';
  hairColor: HairColor;
  hairTex: HairTex;
  hairStyle: number; // 0~9 — 그리기용
  skin: number; // 0~5
  doubleEyelid: boolean;
  freckles: boolean;
  face: 'round' | 'oval' | 'long' | 'square';
  /** 매력(무대 비주얼) 0~100 — 키·인상과 무관하게 정규분포. 팬 증가에 아주 조금 영향 */
  charm: number;
}

const A = appJson.data;
const C = (c?: string): CountryId => ((c && c in A.doubleEyelid ? c : 'KR') as CountryId);

function lerp(t: number[][], y: number): number {
  if (y <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (y <= t[i][0]) return t[i - 1][1] + ((y - t[i - 1][0]) / (t[i][0] - t[i - 1][0])) * (t[i][1] - t[i - 1][1]);
  return t[t.length - 1][1];
}
function pickW<T extends string>(r: Rng, w: Record<T, number>): T {
  return r.weighted(Object.keys(w) as T[], (k) => w[k])!;
}

export function meanHeight(country: string | undefined, gender: Gender, birthYear: number): number {
  return lerp((A.height.mean as Record<string, Record<Gender, number[][]>>)[C(country)][gender], birthYear);
}

export function rollAppearance(seed: number, gender: Gender, birthYear: number, country?: string): Appearance {
  const r = new Rng(seed ^ 0x9e3779b9);
  const ct = C(country);
  const mean = meanHeight(ct, gender, birthYear);
  const height = Math.round(r.normal(mean, A.height.sd[gender]));
  return {
    height,
    build: r.weighted(['slim', 'avg', 'broad'] as const, (b) => ({ slim: 3, avg: 5, broad: 2 })[b])!,
    hairColor: pickW(r, (A.hairColor.weights as unknown as Record<string, Record<HairColor, number>>)[ct]),
    hairTex: pickW(r, (A.hairTexture.weights as unknown as Record<string, Record<HairTex, number>>)[ct]),
    hairStyle: r.int(0, 9),
    skin: r.weighted([0, 1, 2, 3, 4, 5], (i) => (A.skin.weights as Record<string, number[]>)[ct][i])!,
    doubleEyelid: r.chance((A.doubleEyelid as Record<string, number>)[ct]),
    freckles: r.chance((A.freckles as Record<string, number>)[ct]),
    face: r.pick(['round', 'oval', 'long', 'square'] as const),
    charm: clamp(Math.round(r.normal(50, 15)), 5, 98),
  };
}

/** 부모에게서 물려받는다 — 키는 부모 평균(성별 보정)으로 80% 회귀, 나머지는 둘 중 한 명을 닮는다 */
export function inheritAppearance(seed: number, gender: Gender, birthYear: number, country: string | undefined, mom: Appearance, dad: Appearance): Appearance {
  const base = rollAppearance(seed, gender, birthYear, country);
  const r = new Rng(seed ^ 0x51ed27);
  const mean = meanHeight(country, gender, birthYear);
  const momZ = (mom.height - meanHeight(country, 'f', birthYear - 30)) / A.height.sd.f;
  const dadZ = (dad.height - meanHeight(country, 'm', birthYear - 32)) / A.height.sd.m;
  const z = ((momZ + dadZ) / 2) * 0.8;
  const pick = <K extends keyof Appearance>(k: K) => (r.chance(0.5) ? mom[k] : dad[k]);
  return {
    ...base,
    height: Math.round(mean + z * A.height.sd[gender] + r.normal(0, 4.5)),
    hairColor: r.chance(0.85) ? pick('hairColor') : base.hairColor,
    hairTex: r.chance(0.75) ? pick('hairTex') : base.hairTex,
    skin: r.chance(0.8) ? Math.round((mom.skin + dad.skin) / 2 + r.int(-1, 1) * 0.5) : base.skin,
    doubleEyelid: mom.doubleEyelid && dad.doubleEyelid ? r.chance(0.85) : mom.doubleEyelid || dad.doubleEyelid ? r.chance(0.6) : r.chance(0.2),
    freckles: mom.freckles || dad.freckles ? r.chance(0.5) : base.freckles,
    face: pick('face'),
  };
}

export const HAIR_LABEL = A.hairColor.labels as Record<HairColor, string>;
export const TEX_LABEL = A.hairTexture.labels as Record<HairTex, string>;
const BUILD_LABEL = { slim: '마른 체형', avg: '보통 체형', broad: '다부진 체형' };
const FACE_LABEL = { round: '동그란 얼굴', oval: '갸름한 얼굴', long: '긴 얼굴', square: '각진 얼굴' };

/**
 * 나이별 키 중앙값 (0~18세, cm) — 2017 소아청소년 성장도표(질병관리청) 50백분위수를 반올림 [근사].
 * 성인 키에 대한 비율로만 쓴다 — 다 크면 172cm 인 아이는 아홉 살에 약 132cm.
 * (예전 식은 직선에 가까워 아홉 살이 120cm 대로 작게 나왔다)
 */
const GROWTH: Record<Gender, number[]> = {
  m: [50, 76, 87, 96, 103, 110, 116, 122, 128, 133, 139, 145, 151, 158, 165, 169, 171, 172.5, 173],
  f: [49, 74.5, 86, 95, 102, 109, 115, 121, 127, 132, 138, 145, 151, 155, 158, 159, 160, 160.5, 161],
};

/** 그 나이(태어난 뒤 햇수)의 키 — 어릴 땐 자라는 중 */
export function heightAt(app: Appearance, age: number, gender: Gender): number {
  if (age >= 18) return app.height;
  const g = GROWTH[gender] ?? GROWTH.m;
  const a = Math.max(0, age);
  const i = Math.floor(a);
  const v = g[i] + (g[i + 1] - g[i]) * (a - i);
  if (a < 1) return Math.round(v); // 갓난아기는 부모 키와 상관없이 비슷하다
  return Math.round(Math.min(app.height, (v / g[18]) * app.height));
}

export function describe(app: Appearance, age: number, gender: Gender): string {
  const parts = [`${heightAt(app, age, gender)}cm`, BUILD_LABEL[app.build], FACE_LABEL[app.face], `${HAIR_LABEL[app.hairColor]} ${TEX_LABEL[app.hairTex]}`];
  if (app.freckles) parts.push('주근깨');
  if (!app.doubleEyelid) parts.push('외꺼풀');
  return parts.join(' · ');
}

/** 인상 한 마디 (매력) */
export const charmWord = (c: number) => (c >= 80 ? '무대에서 눈길을 끈다' : c >= 62 ? '인상이 좋다' : c >= 38 ? '평범한 인상' : '수수한 인상');

/** NPC 의 외모 — 시드에서 결정적으로 */
export function npcAppearance(n: { look: number; gender: Gender; birthYear: number }, country?: string): Appearance {
  return rollAppearance(n.look, n.gender, n.birthYear, country);
}

/** 플레이어 외모 — 태어날 때 물려받은 것, 옛 저장이면 시드에서 */
export function playerAppearance(p: { look: number; gender: Gender; birthYear: number; country?: string; app?: Appearance }): Appearance {
  return p.app ?? rollAppearance(p.look, p.gender, p.birthYear, p.country);
}
