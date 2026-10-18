// 시대착오 필터. 1960년대에 ‘숏폼’이 나오면 안 된다.
//  1) 사건의 전제(제목·본문·선택지)에 그 시대에 없던 말이 있으면 사건 자체를 뽑지 않는다 (eventMinYear)
//  2) 결과 문장처럼 부수적인 곳에 섞인 말은 그 시대의 말로 바꾼다 (periodText)
// 연도는 한국에서 널리 쓰이기 시작한 시점의 근사값이다. 대체어는 받침 유무를 맞춰 조사가 어색해지지 않게 골랐다.

interface Term {
  re: RegExp;
  y: number;
  /** y 이전에 쓸 말. [이 연도 이상이면, 이 말] 을 최신 순으로 */
  old: [number, string][];
  /** 한국 밖 인생에서 쓸 말 (없으면 old) */
  intl?: [number, string][];
}

export const TERMS: Term[] = [
  { re: /숏폼/g, y: 2018, old: [[2006, '동영상'], [0, '라디오 방송']] },
  { re: /유튜브/g, y: 2006, old: [[0, '라디오']] },
  { re: /SNS/g, y: 2008, old: [[1999, '미니홈피'], [1990, 'PC통신 동호회'], [0, '라디오']], intl: [[1996, '개인 홈페이지'], [1985, '전자 게시판'], [0, '라디오']] },
  { re: /단톡방|단톡/g, y: 2010, old: [[0, '연락망']] },
  { re: /스트리밍/g, y: 2009, old: [[0, '음반']] },
  { re: /플레이리스트/g, y: 2010, old: [[0, '라디오']] },
  { re: /알고리즘/g, y: 2015, old: [[0, '입소문']] },
  { re: /크라우드 ?펀딩|펀딩/g, y: 2011, old: [[0, '후원 모금']] },
  { re: /오디션 프로그램/g, y: 2009, old: [[0, '가요 경연']] },
  { re: /\bDM\b|DM(?=[으로을이가])/g, y: 2010, old: [[0, '전화 연락']] },
  { re: /스마트폰/g, y: 2009, old: [[1997, '휴대폰'], [0, '전화통']] },
  { re: /휴대폰/g, y: 1997, old: [[0, '전화통']] },
  { re: /통장 앱/g, y: 2010, old: [[0, '통장']] },
  { re: /녹음 앱/g, y: 2010, old: [[0, '카세트']] },
  { re: /발매 버튼을 누르고, 새로고침만 백 번 했다/g, y: 2005, old: [[0, '레코드 가게 앞을 몇 번이고 지나갔다']] },
  { re: /새로고침/g, y: 2000, old: [[0, '라디오 주파수 돌리기']] },
  { re: /이어폰/g, y: 1980, old: [[0, '헤드폰']] },
  { re: /CD/g, y: 1985, old: [[0, 'LP']] },
  { re: /지하철/g, y: 1975, old: [[0, '시내버스']] },
  { re: /마이너스 ?통장/g, y: 1990, old: [[0, '은행 빚']] },
  { re: /바이럴/g, y: 2010, old: [[0, '입소문']] },
  { re: /코인노래방/g, y: 2012, old: [[1991, '노래방'], [0, '음악다방']] },
  { re: /노래방/g, y: 1991, old: [[0, '음악다방']] },
  { re: /PC방/g, y: 1998, old: [[0, '오락실']] },
  { re: /찜질방/g, y: 1997, old: [[0, '목욕탕']] },
  { re: /편의점/g, y: 1989, old: [[0, '구멍가게']] },
  { re: /댓글창|댓글/g, y: 2000, old: [[0, '엽서 사연']] },
  { re: /이메일|메일/g, y: 1997, old: [[0, '우편']] },
  { re: /인터넷/g, y: 1995, old: [[0, '신문']] },
  { re: /온라인/g, y: 1997, old: [[0, '우편']] },
  { re: /MP3/g, y: 1999, old: [[0, '테이프']] },
  { re: /굿즈/g, y: 2010, old: [[0, '티셔츠']] },
  { re: /배달앱/g, y: 2010, old: [[0, '전단지']] },
  { re: /홍대 앞|홍대|합정/g, y: 1993, old: [[0, '종로']] },
  { re: /수능/g, y: 1993, old: [[0, '대입 시험']] },
  { re: /문자(?=가|를|로|가 왔|메시지)/g, y: 1998, old: [[1990, '삐삐'], [0, '편지']] },
];

/** 사건의 전제에 있으면 사건을 통째로 빼는 말 (결과 문장이 아니라 상황 자체가 그 시대에 없던 것) */
const PREMISE = /숏폼|유튜브|SNS|스트리밍|플레이리스트|알고리즘|펀딩|오디션 프로그램|DM|코인노래방|PC방|스마트폰|단톡|댓글|조회수|인터넷|온라인|이메일|굿즈|MP3|찜질방|휴대폰|노래방|편의점|영상/;

function termYear(text: string): number {
  let y = 0;
  for (const t of TERMS) {
    t.re.lastIndex = 0;
    if (t.re.test(text)) y = Math.max(y, t.y);
  }
  // 영상·조회수는 대체어가 없어 문장째 뺀다
  if (/조회수|영상(?!화)/.test(text)) y = Math.max(y, 2006);
  return y;
}

/** 이 문장이 자연스러운 가장 이른 해 */
export function textMinYear(text: string): number {
  return termYear(text);
}

const cache = new Map<string, number>();

/** 사건의 전제(제목·본문·선택지 문구)로 정한, 이 사건이 나올 수 있는 가장 이른 해 */
export function eventMinYear(def: { id: string; title: unknown; text: unknown; choices: { label: unknown }[]; minYear?: number }): number {
  const hit = cache.get(def.id);
  if (hit !== undefined) return hit;
  const src = [def.title, def.text, ...def.choices.map((c) => c.label)].map((x) => String(x)).join('\n');
  let y = def.minYear ?? 0;
  if (PREMISE.test(src)) y = Math.max(y, termYear(src));
  cache.set(def.id, y);
  return y;
}

/** 그 해에 없던 말을 그 시대의 말로 바꾼다 */
export function periodText(text: string, year: number, country = 'KR'): string {
  if (!text || year >= 2018) return text;
  let out = text;
  for (const t of TERMS) {
    if (year >= t.y) continue;
    const table = country !== 'KR' && t.intl ? t.intl : t.old;
    const rep = table.find(([from]) => year >= from)?.[1] ?? table[table.length - 1][1];
    t.re.lastIndex = 0;
    out = out.replace(t.re, rep);
  }
  return out;
}
