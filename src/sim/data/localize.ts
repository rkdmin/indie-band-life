// 나라 맞춤 문장 — 한국이 아닌 나라에서 태어났을 때 한국 고유의 말(학원·노래방·소주·명절·반지하·홍대…)을
// 그 나라 말로 바꾼다. 데이터는 data/world/localize.json, 동네 이름은 data/world/title_copy.json 과 같다.

import json from '../../data/world/localize.json';
import titleCopy from '../../data/world/title_copy.json';
import { josa } from '../korean';

type ByCountry = string | Record<string, string>;
interface Data {
  city: Record<string, string>;
  lang: Record<string, string>;
  regionDesc: Record<string, Record<string, string>>;
  draft: Record<string, [number, number, number, number][]>;
  terms: [string, ByCountry][];
}
const D = json.data as unknown as Data;
const HUB = titleCopy.data as unknown as Record<string, { hub: string }>;

const PAIR: Record<string, Parameters<typeof josa>[1]> = { 을: '을/를', 를: '을/를', 이: '이/가', 가: '이/가', 은: '은/는', 는: '은/는', 과: '과/와', 와: '과/와', 으로: '으로/로', 로: '으로/로' };
/** 말 뒤에 붙은 조사 — 뒤에 한글이 더 이어지면(‘가게’·‘로봇’) 조사가 아니다 */
const PART = '(?:(을|를|이|가|은|는|과|와|으로|로)(?![가-힣]))?';

/**
 * re 에 맞는 말을 rep 로 바꾸고, 바로 뒤 조사를 바뀐 말에 맞춘다 (카세트테이프를 → 카세트를).
 * 조사가 없는 자리(‘카세트에’)는 그대로 둔다.
 */
export function replaceWithJosa(text: string, re: RegExp, rep: string): string {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const one = new RegExp(re.source, flags.replace('g', ''));
  const withPart = new RegExp(`(?:${re.source})${PART}`, flags);
  return text.replace(withPart, (m: string, ...args: unknown[]) => {
    const groups = args.slice(0, -2);
    const part = groups[groups.length - 1] as string | undefined;
    // 조사를 붙인 채로 바꾼다 — 말 뒤를 내다보는 규칙(문자(?=가|를))이 조사를 봐야 하므로
    const done = m.replace(one, rep);
    const word = part ? done.slice(0, -part.length) : done;
    return part && word ? josa(word, PAIR[part]) : word + (part ?? '');
  });
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// ‘re:’로 시작하면 정규식 (대학원의 ‘학원’은 건드리지 않게)
const TERMS = D.terms.map(([from, to]) => ({ re: new RegExp(from.startsWith('re:') ? from.slice(3) : esc(from), 'g'), to }));

function fill(s: string, ct: string): string {
  return s.replace('{city}', D.city[ct] ?? '').replace('{lang}', D.lang[ct] ?? '').replace('{hub}', HUB[ct]?.hub ?? '');
}

/** 한국 밖이면 한국 고유의 말을 그 나라 말로. 〈밴드·곡 이름〉 안은 그대로 둔다 */
export function localize(text: string, country?: string): string {
  const ct = country ?? 'KR';
  if (!text || ct === 'KR') return text;
  return text
    .split(/(〈[^〉]*〉)/)
    .map((seg) => {
      if (seg.startsWith('〈')) return seg;
      let out = seg;
      for (const t of TERMS) {
        t.re.lastIndex = 0;
        if (!t.re.test(out)) continue;
        const to = typeof t.to === 'string' ? t.to : t.to[ct] ?? t.to.default;
        out = replaceWithJosa(out, t.re, fill(to, ct));
      }
      return out;
    })
    .join('');
}

/** 태어난 곳 한 줄 — 한국은 regions.json 의 설명을 그대로 쓴다 */
export function regionDesc(country: string | undefined, region: string): string | undefined {
  return D.regionDesc[country ?? 'KR']?.[region];
}

/** 그 해 그 나라의 징병 — 없으면 null. rate: 해당 나이 남자가 실제로 끌려가는 비율 [근사] */
export function draftFor(country: string | undefined, year: number): { months: number; rate: number } | null {
  const row = (D.draft[country ?? 'KR'] ?? []).find(([a, b]) => year >= a && year < b);
  return row ? { months: row[2], rate: row[3] } : null;
}

/** 18 → ‘1년 반’, 24 → ‘2년’, 9 → ‘9개월’ */
export function monthsWord(m: number): string {
  if (m % 12 === 0) return `${m / 12}년`;
  if (m > 12 && m % 12 === 6) return `${Math.floor(m / 12)}년 반`;
  return m > 12 ? `${Math.floor(m / 12)}년 ${m % 12}개월` : `${m}개월`;
}
