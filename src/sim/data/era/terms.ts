// 시대어 사전: 그 시대(그 나라)에 없던 말과, 그 전에 쓰던 말.
//  - old 의 값이 null 이면 ‘바꿀 말이 없다’ → 그 말이 든 문장을 통째로 뺀다
//    (예: SNS 를 ‘라디오’로 바꾸면 “친구의 라디오에서 옛날 사진을 봤다” 같은 모순이 생긴다)
//  - 대체어는 받침 유무를 원래 말과 맞춰 조사가 어긋나지 않게 골랐다
//  - 장르 이름은 genres.ts, 매체 연도는 media.ts 에서 가져와 한 곳에서만 관리한다

import type { CountryId } from '../countries';
import { GENRE_ERAS, genreNamedIn } from './genres';
import { MEDIA } from './media';
import termsJson from '../../../data/era/terms.json';

export interface Term {
  re: RegExp;
  /** 이 해부터 자연스럽다 (나라별로 다르면 yBy) */
  y: number;
  yBy?: Partial<Record<CountryId, number>>;
  /** 이 나라 인생에만 적용 */
  only?: CountryId[];
  /** y 이전에 쓸 말 [이 해부터, 이 말 | null(문장 삭제)] — 최신 순 */
  old: [number, string | null][];
  /** 한국 밖 인생에서 쓸 말 */
  intl?: [number, string | null][];
  /** 사건의 전제(제목·본문·선택지)에 있으면 사건 자체를 그 해 전엔 뽑지 않는다 */
  premise?: boolean;
}

interface TermJson {
  pattern: string;
  y: number;
  media?: keyof typeof MEDIA;
  only?: CountryId[];
  old: [number, string | null][];
  intl?: [number, string | null][];
  premise?: boolean;
}

const COUNTRY_IDS: CountryId[] = ['KR', 'JP', 'US', 'UK', 'DE', 'BR'];

export const TERMS: Term[] = [
  // ── 매체·생활·장소·공연장 (data/era/terms.json) — media 가 있으면 그 매체의 나라별 보급 연도를 쓴다 ──
  ...(termsJson.data as TermJson[]).map((t) => ({
    re: new RegExp(t.pattern, 'g'),
    y: t.y,
    yBy: t.media ? MEDIA[t.media].from : undefined,
    only: t.only,
    old: t.old,
    intl: t.intl,
    premise: t.premise,
  })),
  // ── 장르 이름 (data/era/genres.json) — 이름이 생기기 전·그 나라에 씬이 생기기 전에는 조상 이름으로 ──
  ...Object.values(GENRE_ERAS).map((g) => ({
    re: new RegExp(g.label, 'g'),
    y: g.named,
    yBy: Object.fromEntries(COUNTRY_IDS.map((c) => [c, genreNamedIn(g.id, c)])) as Partial<Record<CountryId, number>>,
    old: g.before as [number, string | null][],
  })),
];

export function termYear(t: Term, country: CountryId): number {
  return t.yBy?.[country] ?? t.y;
}

export function applies(t: Term, country: CountryId): boolean {
  return !t.only || t.only.includes(country);
}
