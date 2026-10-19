// 일본·독일·브라질 음악사와 세계 공통 사건.
import { PUB, type HistoryItem, type Wave } from './types';

export const JP_HISTORY: HistoryItem[] = [
  { y: 1966, m: 6, c: 'JP', kind: 'festival', genre: 'indierock', name: '부도칸 공연', text: '비틀스가 도쿄 부도칸에서 공연했다. 일본 록의 판이 바뀌었다.', src: PUB },
  { y: 1970, c: 'JP', kind: 'release', genre: 'folk', who: '핫피 엔도', text: '밴드 핫피 엔도가 첫 앨범을 냈다. ‘록을 일본어로 부를 수 있나’라는 논쟁이 시작됐다.', src: PUB },
  { y: 1982, m: 10, c: 'JP', kind: 'industry', text: '세계 최초로 CD가 일본에서 발매됐다.', src: PUB },
  { y: 1988, m: 4, c: 'JP', kind: 'scene', genre: 'indierock', who: 'BOØWY', text: '밴드 BOØWY가 도쿄돔 공연을 끝으로 해체했다. 일본은 ‘밴드 붐’ 한가운데 있다.', src: PUB },
  { y: 1989, m: 4, c: 'JP', kind: 'release', genre: 'metal', who: 'X JAPAN', text: 'X JAPAN이 《BLUE BLOOD》를 냈다. 화려한 비주얼과 빠른 메탈이 일본을 휩쓸었다.', src: PUB },
  { y: 1997, m: 7, c: 'JP', kind: 'festival', name: '후지 록 페스티벌', storm: true, text: '첫 후지 록 페스티벌. 레드 핫 칠리 페퍼스가 태풍 속에서 헤드라인 무대를 마쳤고, 둘째 날은 취소됐다.', src: 'Monocle·후지록 공식 회고' },
  { y: 2000, m: 8, c: 'JP', kind: 'festival', name: '서머소닉', text: '도시형 록 페스티벌 서머소닉이 처음 열렸다. 헤드라이너는 그린 데이.', src: '서머소닉 공식 사이트' },
  { y: 2011, m: 3, c: 'JP', kind: 'world', text: '동일본 대지진. 그해 많은 공연이 취소되거나 자선 공연으로 바뀌었다.', src: PUB },
];

export const DE_HISTORY: HistoryItem[] = [
  { y: 1974, m: 11, c: 'DE', kind: 'release', who: '크라프트베르크', text: '크라프트베르크가 《Autobahn》을 냈다. 전자음이 대중음악 안으로 들어왔다.', src: PUB },
  { y: 1983, c: 'DE', kind: 'release', genre: 'indiepop', who: '네나', text: '네나의 ‘99 Luftballons’가 세계 차트에 올랐다. 독일어 신물결 음악의 정점.', src: PUB },
  { y: 1985, m: 5, c: 'DE', kind: 'festival', name: '록 암 링', text: '뉘르부르크링에서 첫 록 암 링이 열렸다. U2와 조 코커가 무대에 섰다.', src: 'bonedo·Pollstar 회고' },
  { y: 1989, m: 7, c: 'DE', kind: 'festival', name: '러브 퍼레이드', text: '베를린 거리에서 첫 러브 퍼레이드가 열렸다. 150명으로 시작한 행렬이었다.', src: PUB },
  { y: 1990, c: 'DE', kind: 'festival', genre: 'metal', name: '바켄 오픈 에어', text: '작은 마을 바켄에서 첫 바켄 오픈 에어가 열렸다. 훗날 세계 최대의 메탈 페스티벌이 된다.', src: PUB },
  { y: 1995, m: 9, c: 'DE', kind: 'release', genre: 'metal', who: '람슈타인', text: '람슈타인이 데뷔 앨범을 냈다. 독일어 인더스트리얼 메탈이 세계에 알려지기 시작했다.', src: PUB },
  { y: 1989, m: 11, c: 'DE', kind: 'world', text: '베를린 장벽이 무너졌다. 그날 밤 장벽 위에서 사람들이 노래했다.', src: PUB },
  { y: 1990, m: 10, c: 'DE', kind: 'world', text: '독일이 통일됐다. 동쪽의 밴드들이 서쪽 무대에 서기 시작했다.', src: PUB },
];

export const BR_HISTORY: HistoryItem[] = [
  { y: 1968, c: 'BR', kind: 'release', genre: 'folk', who: '오스 무탄치스', text: '앨범 《Tropicália》가 나왔다. 오스 무탄치스와 카에타누 벨로주, 지우베르투 지우가 함께한 트로피칼리아 운동의 선언.', src: PUB },
  { y: 1985, m: 1, c: 'BR', kind: 'festival', genre: 'metal', name: '록 인 리우', text: '리우데자네이루에서 첫 록 인 리우가 열렸다. 퀸, AC/DC, 아이언 메이든, 스콜피언스가 무대에 섰다.', src: 'CNN Brasil·Rolling Stone Brasil 회고' },
  { y: 1985, c: 'BR', kind: 'release', genre: 'indierock', who: '레지앙 우르바나', text: '브라질리아의 밴드 레지앙 우르바나가 데뷔 앨범을 냈다. 브라질 록의 황금기.', src: PUB },
  { y: 1993, m: 10, c: 'BR', kind: 'release', genre: 'metal', who: '세풀투라', text: '세풀투라가 《Chaos A.D.》를 냈다. 브라질 메탈이 세계로 나갔다.', src: PUB },
  { y: 2024, c: 'BR', kind: 'industry', text: '브라질 녹음 음악 매출이 21.7% 늘었다. 상위 10개 시장 중 가장 빠른 성장.', src: 'IFPI Global Music Report 2025' },
  { y: 1985, m: 3, c: 'BR', kind: 'world', text: '21년 만에 군사 정부가 물러나고 민간 정부가 들어섰다.', src: PUB },
  { y: 2014, m: 6, c: 'BR', kind: 'world', text: '브라질 월드컵이 열렸다.', src: PUB },
];

export const GLOBAL_HISTORY: HistoryItem[] = [
  { y: 1963, c: 'GLOBAL', kind: 'industry', text: '손바닥만 한 카세트테이프가 처음 공개됐다.', src: PUB },
  { y: 1979, m: 7, c: 'GLOBAL', kind: 'industry', text: '휴대용 카세트 플레이어가 출시됐다. 음악을 들고 걸을 수 있게 됐다.', src: PUB },
  { y: 1999, m: 6, c: 'GLOBAL', kind: 'industry', text: '음악 파일 공유 서비스가 등장했다. 음반 산업이 흔들리기 시작했다.', src: PUB },
  { y: 2005, c: 'GLOBAL', kind: 'industry', text: '동영상 공유 사이트가 문을 열었다. 누구나 자기 공연을 세상에 올릴 수 있게 됐다.', src: PUB },
  { y: 2007, m: 6, c: 'GLOBAL', kind: 'industry', text: '터치스크린 스마트폰이 등장했다.', src: PUB },
  { y: 2008, m: 10, c: 'GLOBAL', kind: 'industry', text: '음악 스트리밍 서비스가 유럽에서 시작됐다. 곧 ‘소유’가 ‘재생’으로 바뀐다.', src: PUB },
  { y: 2020, m: 3, c: 'GLOBAL', kind: 'industry', text: '감염병 유행으로 전 세계 공연장이 문을 닫았다.', src: PUB },
];

export const OTHER_WAVES: Wave[] = [
  { id: 'jp_bandboom', c: 'JP', from: 1987, to: 1991, genres: ['indierock', 'punk'], name: '밴드 붐', ref: 'BOØWY', text: 'TV 밴드 오디션 프로그램과 라이브하우스가 들끓는다. 일본 전역이 밴드 붐이다.' },
  { id: 'xjapan', c: 'JP', from: 1989, to: 1993, genres: ['metal'], name: '비주얼 메탈 열풍', ref: 'X JAPAN', text: '화려한 무대와 빠른 메탈이 일본 음악 시장을 휩쓸고 있다.' },
  { id: 'shibuyakei', c: 'JP', from: 1993, to: 1997, genres: ['indiepop'], name: '시부야계', ref: '피치카토 파이브', text: '도쿄 시부야의 레코드 가게에서 세련된 팝이 쏟아져 나온다.' },
  { id: 'krautrock', c: 'DE', from: 1970, to: 1975, genres: ['shoegaze', 'indierock'], name: '크라우트록', ref: '캔', text: '반복되는 리듬과 끝없는 즉흥. 독일 밴드들이 영미권과 다른 록을 만든다.' },
  { id: 'ndw', c: 'DE', from: 1980, to: 1983, genres: ['indiepop', 'punk'], name: '노이에 도이체 벨레', ref: '네나', text: '독일어로 부르는 신물결 팝이 차트를 휩쓴다.' },
  { id: 'ndh', c: 'DE', from: 1995, to: 1999, genres: ['metal'], name: '독일어 인더스트리얼 메탈', ref: '람슈타인', text: '독일어로 부르는 육중한 메탈이 국경을 넘고 있다.' },
  { id: 'tropicalia', c: 'BR', from: 1967, to: 1969, genres: ['folk', 'indierock'], name: '트로피칼리아', ref: '오스 무탄치스', text: '전기 기타와 삼바, 시와 풍자. 브라질 음악이 뒤집히고 있다.' },
  { id: 'brock', c: 'BR', from: 1982, to: 1987, genres: ['indierock', 'punk'], name: '브라질 록 붐', ref: '레지앙 우르바나', text: '민정 이양을 앞두고 젊은 록 밴드들이 쏟아져 나온다.' },
  { id: 'brmetal', c: 'BR', from: 1991, to: 1996, genres: ['metal'], name: '브라질 메탈의 세계 진출', ref: '세풀투라', text: '브라질 메탈 밴드들이 유럽 페스티벌 무대에 서기 시작했다.' },
];
