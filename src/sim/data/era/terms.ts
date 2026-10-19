// 시대어 사전: 그 시대(그 나라)에 없던 말과, 그 전에 쓰던 말.
//  - old 의 값이 null 이면 ‘바꿀 말이 없다’ → 그 말이 든 문장을 통째로 뺀다
//    (예: SNS 를 ‘라디오’로 바꾸면 “친구의 라디오에서 옛날 사진을 봤다” 같은 모순이 생긴다)
//  - 대체어는 받침 유무를 원래 말과 맞춰 조사가 어긋나지 않게 골랐다
//  - 장르 이름은 genres.ts, 매체 연도는 media.ts 에서 가져와 한 곳에서만 관리한다

import type { CountryId } from '../countries';
import { GENRE_ERAS, genreNamedIn } from './genres';
import { MEDIA } from './media';

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

const m = (id: keyof typeof MEDIA) => MEDIA[id].from;

export const TERMS: Term[] = [
  // ── 매체·기술 ──
  { re: /숏폼/g, y: 2018, old: [[2006, '동영상'], [0, null]], premise: true },
  { re: /유튜브/g, y: 2006, old: [[0, null]], premise: true },
  { re: /SNS/g, y: 2008, old: [[2002, '미니홈피'], [0, null]], intl: [[1997, '개인 홈페이지'], [0, null]], premise: true },
  { re: /단톡방|단톡/g, y: 2010, old: [[0, null]], premise: true },
  { re: /스트리밍/g, y: 2009, yBy: m('streaming'), old: [[0, '음반']], premise: true },
  { re: /플레이리스트/g, y: 2010, old: [[0, '라디오']], premise: true },
  { re: /알고리즘/g, y: 2015, old: [[0, '입소문']], premise: true },
  { re: /크라우드 ?펀딩|펀딩/g, y: 2011, old: [[0, '후원 모금']], premise: true },
  { re: /오디션 프로그램/g, y: 2009, old: [[0, '가요 경연']], premise: true },
  { re: /\bDM\b|DM(?=[으로을이가])/g, y: 2010, old: [[0, null]], premise: true },
  { re: /스마트폰/g, y: 2009, yBy: m('smartphone'), old: [[0, null]], premise: true },
  { re: /휴대폰/g, y: 1997, old: [[0, null]], premise: true },
  { re: /통장 앱/g, y: 2010, old: [[0, '통장']] },
  { re: /녹음 앱/g, y: 2010, old: [[1972, '카세트'], [0, '녹음기']] },
  { re: /발매 버튼을 누르고, 새로고침만 백 번 했다/g, y: 2005, old: [[0, '레코드 가게 앞을 몇 번이고 지나갔다']] },
  { re: /새로고침/g, y: 2000, old: [[0, null]] },
  { re: /코인노래방/g, y: 2012, only: ['KR'], old: [[1991, '노래방'], [0, null]], premise: true },
  { re: /노래방/g, y: 1991, yBy: m('karaoke'), old: [[0, null]], premise: true },
  { re: /PC방/g, y: 1998, only: ['KR'], old: [[0, null]], premise: true },
  { re: /찜질방/g, y: 1997, only: ['KR'], old: [[0, '목욕탕']], premise: true },
  { re: /편의점/g, y: 1989, only: ['KR'], old: [[0, '구멍가게']] },
  { re: /댓글창|댓글/g, y: 2000, old: [[0, null]], premise: true },
  { re: /조회수/g, y: 2006, old: [[0, null]], premise: true },
  { re: /영상(?!화)/g, y: 2006, old: [[0, null]], premise: true },
  { re: /이메일|메일/g, y: 1997, old: [[0, '편지']] },
  { re: /인터넷/g, y: 1996, old: [[0, null]], premise: true },
  { re: /온라인/g, y: 1997, old: [[0, null]], premise: true },
  { re: /MP3/g, y: 1999, old: [[1972, '테이프'], [0, null]], premise: true },
  { re: /굿즈/g, y: 2010, old: [[0, '티셔츠']] },
  { re: /택배/g, y: 1993, only: ['KR'], old: [[0, '소포']] },
  { re: /배달앱/g, y: 2010, old: [[0, null]], premise: true },
  { re: /바이럴/g, y: 2010, old: [[0, '입소문']] },
  { re: /문자(?=가|를|로| 메시지)/g, y: 1998, old: [[1993, '삐삐'], [0, null]] },
  { re: /이어폰/g, y: 1980, old: [[0, '헤드폰']] },
  { re: /CD/g, y: 1986, yBy: m('cd'), old: [[0, 'LP']] },
  { re: /카세트/g, y: 1972, yBy: m('cassette'), old: [[0, 'LP']] },
  { re: /AI 음악|AI/g, y: 2023, old: [[0, null]], premise: true },
  // ── 장소·생활 (한국) ──
  { re: /홍대 앞|홍대|합정/g, y: 1993, only: ['KR'], old: [[0, '종로']] },
  { re: /지하철/g, y: 1975, only: ['KR'], old: [[0, '시내버스']] },
  { re: /마이너스 ?통장/g, y: 1990, only: ['KR'], old: [[0, '은행 빚']] },
  { re: /원룸/g, y: 1990, only: ['KR'], old: [[0, '자취방']] },
  { re: /컵라면/g, y: 1981, only: ['KR'], old: [[0, '라면']] },
  { re: /초코파이/g, y: 1974, only: ['KR'], old: [[0, '건빵']] },
  { re: /광역시/g, y: 1995, only: ['KR'], old: [[1963, '직할시'], [0, '지방 도시']] },
  { re: /수능/g, y: 1993, only: ['KR'], old: [[1982, '학력고사'], [0, '대입 시험']] },
  { re: /실용음악과/g, y: 1991, only: ['KR'], old: [[0, '음대']] },
  // ── 공연장 (한국) — 라이브클럽은 1990년대 홍대 앞, 록 페스티벌은 1999년부터 ──
  { re: /라이브클럽/g, y: 1993, only: ['KR'], old: [[1980, '라이브 카페'], [0, '음악다방']] },
  { re: /대형 페스티벌 메인 스테이지/g, y: 1999, only: ['KR'], old: [[0, '대형 야외 공연 무대']] },
  { re: /지역 록 페스티벌/g, y: 1999, only: ['KR'], old: [[0, '야외 록 공연']] },
  { re: /페스티벌/g, y: 1999, only: ['KR'], old: [[0, '야외 공연']] },
  { re: /아레나/g, y: 1988, only: ['KR'], old: [[0, '체육관']] },
  // ── 장르 이름 (genres.ts) — 이름이 생기기 전에는 조상 이름으로 ──
  ...Object.values(GENRE_ERAS).map((g) => ({
    re: new RegExp(g.label, 'g'),
    y: g.named,
    yBy: Object.fromEntries((['KR', 'JP', 'US', 'UK', 'DE', 'BR'] as CountryId[]).map((c) => [c, genreNamedIn(g.id, c)])) as Partial<Record<CountryId, number>>,
    old: g.before as [number, string | null][],
  })),
];

export function termYear(t: Term, country: CountryId): number {
  return t.yBy?.[country] ?? t.y;
}

export function applies(t: Term, country: CountryId): boolean {
  return !t.only || t.only.includes(country);
}
