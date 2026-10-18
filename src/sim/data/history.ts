// 나라별 음악사 데이터셋. 게임 속 시간이 흐르면 그해의 실제 음악 뉴스가 인생 기록에 흘러나오고,
// 같은 시대·같은 장르의 ‘물결’에 올라타면 내 밴드가 그 시대의 주인공이 될 기회가 온다.
//
// 원칙
//  - 실제 아티스트 이름은 ‘사실’로만 쓴다 (발매·결성·공연·사건). 그들의 말이나 행동을 지어내지 않는다.
//  - 연도는 잘 알려진 공개 자료로 확인한 것만 넣는다. 확인 경로는 src 에 적는다.
//  - 한국 항목은 기사로 교차 확인했다 (docs/probability-sources.md 참고).

import type { Genre } from '../types';
import type { CountryId } from './countries';

export interface HistoryItem {
  y: number;
  m?: number;
  c: CountryId | 'GLOBAL';
  kind: 'release' | 'scene' | 'festival' | 'industry' | 'policy';
  genre?: Genre;
  text: string;
  src: string;
  /** 발매·결성 사건의 주인공 (사실로만 언급) */
  who?: string;
  /** 페스티벌 이름 */
  name?: string;
  /** 실제로 악천후로 중단된 회차 */
  storm?: boolean;
}

export interface Wave {
  id: string;
  c: CountryId;
  from: number;
  to: number;
  genres: Genre[];
  name: string;
  /** 언론이 비교할 실제 선배 — 사실로만 언급 */
  ref: string;
  text: string;
}

const PUB = '공개 음악사 자료(위키백과 등)';

export const HISTORY: HistoryItem[] = [
  // ───────── 세계 ─────────
  { y: 1964, m: 2, c: 'US', kind: 'scene', genre: 'indierock', text: '비틀스가 미국 TV에 출연했다. 영국 밴드들의 미국 진출, ‘브리티시 인베이전’이 시작됐다.', who: '비틀스', src: PUB },
  { y: 1966, m: 6, c: 'JP', kind: 'festival', genre: 'indierock', text: '비틀스가 도쿄 부도칸에서 공연했다. 일본 록의 판이 바뀌었다.', who: '비틀스', src: PUB },
  { y: 1969, m: 8, c: 'US', kind: 'festival', text: '우드스톡 페스티벌. 수십만 명이 사흘 동안 진흙 속에서 음악을 들었다.', name: '우드스톡', src: PUB },
  { y: 1970, m: 9, c: 'UK', kind: 'festival', text: '훗날 글래스턴베리가 되는 첫 페스티벌이 영국 시골 농장에서 열렸다.', name: '글래스턴베리', src: PUB },
  { y: 1976, m: 4, c: 'US', kind: 'release', genre: 'punk', text: '라몬스가 데뷔 앨범을 냈다. 세 코드와 2분짜리 노래 — 펑크가 태어났다.', who: '라몬스', src: PUB },
  { y: 1977, m: 10, c: 'UK', kind: 'release', genre: 'punk', text: '섹스 피스톨스가 《Never Mind the Bollocks》를 냈다. 영국 펑크가 폭발했다.', who: '섹스 피스톨스', src: PUB },
  { y: 1979, m: 12, c: 'UK', kind: 'release', genre: 'punk', text: '클래시가 《London Calling》을 냈다. 펑크가 더 넓은 세상을 노래했다.', who: '클래시', src: PUB },
  { y: 1981, m: 8, c: 'US', kind: 'industry', text: 'MTV가 개국했다. 이제 음악은 ‘보는 것’이 됐다.', src: PUB },
  { y: 1985, m: 1, c: 'BR', kind: 'festival', genre: 'metal', text: '리우데자네이루에서 첫 록 인 리우가 열렸다. 남미 최대의 록 페스티벌이 시작됐다.', name: '록 인 리우', src: PUB },
  { y: 1985, c: 'DE', kind: 'festival', text: '뉘르부르크링에서 첫 록 암 링이 열렸다.', name: '록 암 링', src: PUB },
  { y: 1986, m: 3, c: 'US', kind: 'release', genre: 'metal', text: '메탈리카가 《Master of Puppets》를 냈다. 스래시 메탈이 정점에 섰다.', who: '메탈리카', src: PUB },
  { y: 1988, m: 10, c: 'US', kind: 'release', genre: 'shoegaze', text: '소닉 유스가 《Daydream Nation》을 냈다. 노이즈와 멜로디가 함께 갈 수 있다는 걸 보여 줬다.', who: '소닉 유스', src: PUB },
  { y: 1989, m: 4, c: 'JP', kind: 'release', genre: 'metal', text: 'X JAPAN이 《BLUE BLOOD》를 냈다. 화려한 비주얼과 빠른 메탈이 일본을 휩쓸었다.', who: 'X JAPAN', src: PUB },
  { y: 1990, c: 'DE', kind: 'festival', genre: 'metal', text: '작은 마을 바켄에서 첫 바켄 오픈 에어가 열렸다. 훗날 세계 최대의 메탈 페스티벌이 된다.', name: '바켄 오픈 에어', src: PUB },
  { y: 1991, m: 9, c: 'US', kind: 'release', genre: 'indierock', text: '시애틀 밴드 너바나가 《Nevermind》를 냈다. 그런지가 순식간에 주류가 됐다.', who: '너바나', src: PUB },
  { y: 1991, m: 11, c: 'UK', kind: 'release', genre: 'shoegaze', text: '마이 블러디 밸런타인이 《Loveless》를 냈다. 슈게이즈의 교과서가 됐다.', who: '마이 블러디 밸런타인', src: PUB },
  { y: 1993, m: 10, c: 'BR', kind: 'release', genre: 'metal', text: '세풀투라가 《Chaos A.D.》를 냈다. 브라질 메탈이 세계로 나갔다.', who: '세풀투라', src: PUB },
  { y: 1994, m: 8, c: 'UK', kind: 'release', genre: 'indierock', text: '오아시스가 《Definitely Maybe》를 냈다. 브릿팝의 여름이 시작됐다.', who: '오아시스', src: PUB },
  { y: 1995, m: 9, c: 'DE', kind: 'release', genre: 'metal', text: '람슈타인이 데뷔 앨범을 냈다. 독일어 인더스트리얼 메탈이 세계에 알려지기 시작했다.', who: '람슈타인', src: PUB },
  { y: 1997, m: 6, c: 'UK', kind: 'release', genre: 'indierock', text: '라디오헤드가 《OK Computer》를 냈다. 록이 어디까지 갈 수 있는지 다시 정했다.', who: '라디오헤드', src: PUB },
  { y: 1997, m: 7, c: 'JP', kind: 'festival', text: '첫 후지 록 페스티벌이 열렸다. 태풍이 덮쳐 둘째 날이 취소됐다.', name: '후지 록 페스티벌', storm: true, src: PUB },
  { y: 1999, m: 6, c: 'GLOBAL', kind: 'industry', text: '음악 파일 공유 서비스가 등장했다. 음반 산업이 흔들리기 시작했다.', src: PUB },
  { y: 2000, m: 7, c: 'UK', kind: 'release', genre: 'indiepop', text: '콜드플레이가 데뷔 앨범 《Parachutes》를 냈다.', who: '콜드플레이', src: PUB },
  { y: 2000, m: 8, c: 'JP', kind: 'festival', text: '도시형 록 페스티벌 서머소닉이 처음 열렸다.', name: '서머소닉', src: PUB },
  { y: 2001, c: 'US', kind: 'release', genre: 'indierock', text: '스트록스가 《Is This It》을 냈다. 개러지 록 리바이벌이 시작됐다.', who: '스트록스', src: PUB },
  { y: 2005, c: 'GLOBAL', kind: 'industry', text: '동영상 공유 사이트가 문을 열었다. 누구나 자기 공연을 세상에 올릴 수 있게 됐다.', src: PUB },
  { y: 2006, m: 1, c: 'UK', kind: 'release', genre: 'indierock', text: '인터넷 입소문으로 먼저 유명해진 아크틱 몽키스가 데뷔 앨범을 냈다.', who: '아크틱 몽키스', src: PUB },
  { y: 2008, m: 10, c: 'GLOBAL', kind: 'industry', text: '음악 스트리밍 서비스가 유럽에서 시작됐다. 곧 ‘소유’가 ‘재생’으로 바뀐다.', src: PUB },
  { y: 2020, m: 3, c: 'GLOBAL', kind: 'industry', text: '감염병 유행으로 전 세계 공연장이 문을 닫았다.', src: PUB },
  { y: 2024, c: 'BR', kind: 'industry', text: '브라질 녹음 음악 매출이 21.7% 늘었다. 상위 10개 시장 중 가장 빠른 성장.', src: 'IFPI Global Music Report 2025' },
  // ───────── 한국 (기사로 교차 확인) ─────────
  { y: 1964, c: 'KR', kind: 'scene', genre: 'indierock', text: '미8군 무대의 밴드들이 한국 그룹사운드의 뿌리가 되고 있다.', src: PUB },
  { y: 1975, m: 6, c: 'KR', kind: 'policy', text: '정부의 ‘공연활동 정화대책’ 발표. 그해 6~10월에만 가요 223곡이 금지곡이 됐고, 대마초 파동으로 많은 음악가가 무대를 잃었다.', src: '경향신문·서울신문 보도' },
  { y: 1977, c: 'KR', kind: 'festival', genre: 'folk', text: '제1회 MBC 대학가요제가 열렸다. 대학생 밴드들의 꿈의 무대가 생겼다.', name: '대학가요제', src: '대학가요제(1977~2013) 보도' },
  { y: 1985, c: 'KR', kind: 'release', genre: 'indierock', text: '들국화가 1집을 냈다. 훗날 한국 대중음악 100대 명반 1위로 꼽힌다.', who: '들국화', src: '경향신문 2007 한국 대중음악 100대 명반' },
  { y: 1992, m: 3, c: 'KR', kind: 'release', text: '서태지와 아이들이 데뷔했다. 가요계의 판도가 통째로 바뀌었다.', who: '서태지와 아이들', src: PUB },
  { y: 1995, m: 4, c: 'KR', kind: 'scene', genre: 'punk', text: '홍대 앞 클럽 ‘드럭’에서 커트 코베인 1주기 추모공연이 열렸다. 한국 인디 신의 출발점으로 꼽히는 날.', src: '뉴시스 인디 30주년 보도' },
  { y: 1996, m: 5, c: 'KR', kind: 'scene', genre: 'punk', text: '홍대와 명동 한복판에서 거리 공연 ‘스트리트 펑크쇼’가 열렸다. 조선 펑크가 거리로 나왔다.', src: '뉴시스 인디 30주년 보도' },
  { y: 1998, c: 'KR', kind: 'release', genre: 'punk', text: '크라잉넛이 1집을 냈다. ‘말달리자’가 전국구 노래가 됐다.', who: '크라잉넛', src: '서울신문·뉴스토마토 보도' },
  { y: 1999, c: 'KR', kind: 'festival', text: '트라이포트 록 페스티벌이 열렸지만 폭우로 중단됐다. 한국 야외 록 페스티벌의 효시.', name: '트라이포트 록 페스티벌', storm: true, src: '아주경제·뉴스토마토 보도' },
  { y: 2005, m: 7, c: 'KR', kind: 'policy', text: '음악 방송 생방송 사고 이후 인디 밴드의 방송 출연이 막히고 1세대 인디 신이 침체에 빠졌다.', src: '주간경향 2005 대중음악 8대 사건' },
  { y: 2006, m: 7, c: 'KR', kind: 'festival', text: '인천 송도에서 제1회 펜타포트 록 페스티벌이 열렸다. 7년 만에 돌아온 대형 록 페스티벌.', name: '펜타포트 록 페스티벌', src: '아주경제·국민일보 보도' },
  { y: 2008, c: 'KR', kind: 'release', genre: 'folk', text: '장기하와 얼굴들의 ‘싸구려 커피’가 인디 음반으로는 드물게 1만 장 넘게 팔렸다. 인디 2세대의 시작.', who: '장기하와 얼굴들', src: '헤럴드경제·더위키' },
  { y: 2024, c: 'KR', kind: 'industry', text: '한국 인디 음악 스트리밍이 1년 새 68% 늘었다. 밴드 붐이 숫자로 확인됐다.', src: 'Spotify 2025 결산 보도 (코리아중앙데일리)' },
];

export const WAVES: Wave[] = [
  { id: 'grunge', c: 'US', from: 1990, to: 1993, genres: ['indierock', 'punk'], name: '그런지 붐', ref: '너바나', text: '시애틀에서 시작된 거친 기타 소리가 미국을 뒤집고 있다. 레이블들이 비슷한 소리를 내는 밴드를 찾아 클럽을 뒤진다.' },
  { id: 'shoegaze', c: 'UK', from: 1989, to: 1992, genres: ['shoegaze'], name: '슈게이즈의 물결', ref: '마이 블러디 밸런타인', text: '발밑의 이펙터만 보며 노이즈의 벽을 쌓는 밴드들이 영국 음악 언론을 사로잡았다.' },
  { id: 'britpop', c: 'UK', from: 1993, to: 1997, genres: ['indierock', 'indiepop'], name: '브릿팝', ref: '오아시스', text: '영국 기타 팝이 차트를 점령했다. 언론은 매주 ‘다음 대형 밴드’를 찾는다.' },
  { id: 'garage', c: 'US', from: 2001, to: 2004, genres: ['indierock', 'punk'], name: '개러지 록 리바이벌', ref: '스트록스', text: '청바지와 낡은 기타, 3분짜리 노래. 뉴욕발 개러지 록이 다시 유행이다.' },
  { id: 'netbuzz', c: 'UK', from: 2005, to: 2007, genres: ['indierock', 'indiepop'], name: '인터넷 입소문 밴드', ref: '아크틱 몽키스', text: '레이블보다 인터넷이 먼저 밴드를 알아보는 시대가 왔다.' },
  { id: 'xjapan', c: 'JP', from: 1989, to: 1993, genres: ['metal'], name: '비주얼 메탈 열풍', ref: 'X JAPAN', text: '화려한 무대와 빠른 메탈이 일본 음악 시장을 휩쓸고 있다.' },
  { id: 'ndh', c: 'DE', from: 1995, to: 1999, genres: ['metal'], name: '독일어 인더스트리얼 메탈', ref: '람슈타인', text: '독일어로 부르는 육중한 메탈이 국경을 넘고 있다.' },
  { id: 'brmetal', c: 'BR', from: 1991, to: 1996, genres: ['metal'], name: '브라질 메탈의 세계 진출', ref: '세풀투라', text: '브라질 메탈 밴드들이 유럽 페스티벌 무대에 서기 시작했다.' },
  { id: 'chosunpunk', c: 'KR', from: 1995, to: 1999, genres: ['punk', 'indierock'], name: '조선 펑크', ref: '크라잉넛', text: '홍대 앞 클럽에서 펑크 밴드들이 쏟아져 나온다. 거리 공연과 몸싸움 같은 슬램.' },
  { id: 'indie2', c: 'KR', from: 2008, to: 2011, genres: ['folk', 'indierock', 'indiepop'], name: '인디 2세대', ref: '장기하와 얼굴들', text: '인디 음반이 1만 장을 넘게 팔렸다. 방송국이 다시 인디 밴드를 찾는다.' },
];

/** (from, to] 사이에 일어난 사건 — 내 나라 + 세계적 사건 + 영미권 대형 사건(전 세계가 들었다) */
export function historyBetween(from: number, to: number, country: CountryId): HistoryItem[] {
  return HISTORY.filter((h) => {
    const t = h.y + ((h.m ?? 6) - 1) / 12;
    if (t <= from || t > to) return false;
    if (h.c === country || h.c === 'GLOBAL') return true;
    // 영미권 대형 발매는 어느 나라에서든 소식으로 들린다
    return (h.c === 'US' || h.c === 'UK') && h.kind === 'release';
  });
}

export function activeWave(country: CountryId, year: number, genre: Genre | undefined): Wave | undefined {
  return WAVES.find((w) => w.c === country && year >= w.from && year <= w.to && (!genre || w.genres.includes(genre)));
}
