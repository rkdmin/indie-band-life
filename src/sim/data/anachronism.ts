// 시대착오 필터 — 데이터는 data/era/ 에 있고, 여기는 적용만 한다.
//  1) eventMinYear: 사건의 전제(제목·본문·선택지)에 그 시대에 없던 말이 있으면 그 해 전엔 뽑지 않는다
//  2) periodText:  문장에 섞인 말은 그 시대의 말로 바꾸고, 바꿀 말이 없으면 그 문장을 뺀다
//  3) textMinYear: 작은 순간(flavor) 줄이 자연스러운 가장 이른 해

import type { CountryId } from './countries';
import { TERMS, applies, termYear, type Term } from './era/terms';
import ageJson from '../../data/era/age_rules.json';
import { localize, replaceWithJosa } from './localize';

export { TERMS };

const asCountry = (c?: string): CountryId => (c ?? 'KR') as CountryId;

function hits(t: Term, text: string): boolean {
  t.re.lastIndex = 0;
  return t.re.test(text);
}

/** 이 문장이 자연스러운 가장 이른 해 */
export function textMinYear(text: string, country?: string): number {
  const ct = asCountry(country);
  let y = 0;
  for (const t of TERMS) if (applies(t, ct) && hits(t, text)) y = Math.max(y, termYear(t, ct));
  return y;
}

const cache = new Map<string, number>();

/** 사건이 나올 수 있는 가장 이른 해 — 전제에 쓰인 말과 사건이 직접 정한 minYear 중 늦은 쪽 */
export function eventMinYear(def: { id: string; title: unknown; text: unknown; minYear?: number; priority?: number }, country?: string): number {
  const ct = asCountry(country);
  const key = `${def.id}:${ct}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let y = def.minYear ?? 0;
  // 인생의 뼈대가 되는 이야기 사건(priority 100 이상)은 어느 시대에나 있어야 한다 — 막지 않고 문장만 그 시대에 맞춘다.
  // 그 밖의 사건은 제목·본문(전제)에 그 시대에 없던 것이 있으면 그 해 전엔 뽑지 않는다. 선택지는 materialize 가 따로 숨긴다.
  if ((def.priority ?? 0) < 100) {
    const src = [def.title, def.text].map((x) => String(x)).join('\n');
    for (const t of TERMS) if (t.premise && applies(t, ct) && hits(t, src)) y = Math.max(y, termYear(t, ct));
  }
  cache.set(key, y);
  return y;
}

/** 문장 단위로 쪼갠다 */
function sentences(line: string): string[] {
  return line.match(/[^.!?…]+[.!?…]+[”’"]?\s*|[^.!?…]+$/g) ?? [line];
}

/** 그 해에 없던 말을 그 시대의 말로 바꾸고, 바꿀 말이 없으면 그 문장을 뺀다 */
/**
 * 숫자와 단위 사이는 줄이 바뀌지 않는 띄어쓰기로 — ‘세 / 장’, ‘두 / 시간’처럼 갈라져 보이지 않게.
 * 앞: 아라비아 숫자(만·천 포함) 또는 한 ~ 아흔 같은 수 관형사. 뒤: 장·명·곡·시간… 같은 단위 뒤에 조사·문장부호·띄어쓰기.
 */
const NUM_WORD = '(?:\\d[\\d,.]*[만천백]?|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|스무|서른|마흔|쉰|예순|일흔|여든|아흔|몇|수십|수백|수천|수만)';
const UNIT = '(?:장|명|곡|개|번|년|살|세|원|시간|분|초|달|주|일|회|팀|곳|석|권|대|마리|잔|그릇|통|줄|층|평|미터|만원|천원|억|위|점|표|채|벌|켤레|송이|쪽|주년|개월)';
const TIE = new RegExp(`(^|[\\s(“‘〈])(${NUM_WORD}) (${UNIT})(?=$|[\\s,.!?…)”’〉이가을를은는의에도만째짜쯤씩과와로으])`, 'g');
export function tieNumbers(text: string): string {
  if (!text.includes(' ')) return text;
  // 〈밴드 이름〉·〈곡 제목〉 안은 그대로 둔다 — 이름이 바뀌면 기록 속 이름과 실제 이름이 어긋난다
  return text
    .split(/(〈[^〉]*〉)/)
    .map((part) => (part.startsWith('〈') ? part : part.replace(TIE, '$1$2\u00a0$3')))
    .join('');
}

export function periodText(text: string, year: number, country?: string): string {
  return tieNumbers(periodTextRaw(localize(text, country), year, country));
}

function periodTextRaw(text: string, year: number, country?: string): string {
  if (!text || year >= 2023) return text;
  const ct = asCountry(country);
  const drops: RegExp[] = [];
  let out = text;
  for (const t of TERMS) {
    if (!applies(t, ct) || year >= termYear(t, ct)) continue;
    const table = ct !== 'KR' && t.intl ? t.intl : t.old;
    const rep = table.find(([from]) => year >= from)?.[1];
    if (rep === undefined || rep === null) {
      drops.push(t.re);
      continue;
    }
    t.re.lastIndex = 0;
    // 조사도 바뀐 말에 맞춘다 (카세트테이프를 → 카세트를)
    out = replaceWithJosa(out, t.re, rep);
  }
  if (!drops.length) return out;
  const bad = (s: string) => drops.some((re) => ((re.lastIndex = 0), re.test(s)));
  if (!bad(out)) return out;
  return out
    .split('\n')
    .map((line) => sentences(line).filter((s) => !bad(s)).join('').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

// ── 나이 규칙 (data/era/age_rules.json) ──
interface AgeRule { re: RegExp; minAge: Record<string, number>; why: string }
const AGE_RULES: AgeRule[] = (ageJson.data as { pattern: string; minAge: Record<string, number>; why: string }[]).map((r) => ({ re: new RegExp(r.pattern), minAge: r.minAge, why: r.why }));

/** 이 문장이 자연스러운 가장 어린 나이 (술·담배·출입 제한·계약·결혼) */
export function textMinAge(text: string, country?: string): number {
  const ct = asCountry(country);
  let a = 0;
  for (const r of AGE_RULES) if (r.re.test(text)) a = Math.max(a, r.minAge[ct] ?? 19);
  return a;
}

const ageCache = new Map<string, number>();
/** 사건이 나올 수 있는 가장 어린 나이 — 제목·본문에 술·담배·계약 같은 말이 있으면 */
export function eventMinAge(def: { id: string; title: unknown; text: unknown }, country?: string): number {
  const key = `${def.id}:${asCountry(country)}`;
  const hit = ageCache.get(key);
  if (hit !== undefined) return hit;
  const a = textMinAge([def.title, def.text].map((x) => String(x)).join('\n'), country);
  ageCache.set(key, a);
  return a;
}

/** 미성년자에게 어울리지 않는 장면은 바꾼다 */
export function ageScene<T extends string>(scene: T, age: number): T {
  if (age < 19 && scene === 'pub') return 'street' as T;
  return scene;
}
