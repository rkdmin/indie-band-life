// 한국 음악사. 기사로 교차 확인한 항목은 src 에 매체를 적었다.
import { PUB, type HistoryItem, type Wave } from './types';

export const KR_HISTORY: HistoryItem[] = [
  { y: 1964, c: 'KR', kind: 'scene', genre: 'indierock', text: '미8군 무대의 밴드들이 한국 그룹사운드의 뿌리가 되고 있다.', src: PUB },
  { y: 1971, c: 'KR', kind: 'release', genre: 'folk', who: '김민기', text: '김민기가 첫 음반을 냈다. 통기타 포크가 청년 문화의 목소리가 됐다.', src: PUB },
  { y: 1975, m: 6, c: 'KR', kind: 'policy', text: '정부의 ‘공연활동 정화대책’ 발표. 그해 6~10월에만 가요 223곡이 금지곡이 됐고, 대마초 파동으로 많은 음악가가 무대를 잃었다.', src: '경향신문·서울신문 보도' },
  { y: 1977, m: 9, c: 'KR', kind: 'festival', genre: 'folk', name: '대학가요제', text: '제1회 MBC 대학가요제. 서울대 농대 그룹사운드 샌드페블즈의 ‘나 어떡해’가 대상을 받았다.', src: '스포츠경향·매일신문 보도' },
  { y: 1985, c: 'KR', kind: 'release', genre: 'indierock', who: '들국화', text: '들국화가 1집을 냈다. 훗날 한국 대중음악 100대 명반 1위로 꼽힌다.', src: '경향신문 2007 한국 대중음악 100대 명반' },
  { y: 1986, c: 'KR', kind: 'release', genre: 'metal', who: '시나위', text: '시나위가 1집을 냈다. 한국 헤비메탈의 시작으로 꼽힌다.', src: PUB },
  { y: 1986, c: 'KR', kind: 'release', genre: 'indierock', who: '부활', text: '록 밴드 부활이 1집을 냈다. 밴드 음악이 다시 가요 차트에 올랐다.', src: PUB },
  { y: 1988, c: 'KR', kind: 'festival', genre: 'indierock', name: '대학가요제', text: '대학가요제에서 밴드 무한궤도의 ‘그대에게’가 대상을 받았다.', src: PUB },
  { y: 1992, m: 3, c: 'KR', kind: 'release', who: '서태지와 아이들', text: '서태지와 아이들이 데뷔했다. 가요계의 판도가 통째로 바뀌었다.', src: PUB },
  { y: 1995, m: 4, c: 'KR', kind: 'scene', genre: 'punk', text: '홍대 앞 클럽 ‘드럭’에서 커트 코베인 1주기 추모공연이 열렸다. 한국 인디 신의 출발점으로 꼽히는 날.', src: '뉴시스 인디 30주년 보도' },
  { y: 1996, m: 5, c: 'KR', kind: 'scene', genre: 'punk', text: '홍대와 명동 한복판에서 거리 공연 ‘스트리트 펑크쇼’가 열렸다. 조선 펑크가 거리로 나왔다.', src: '뉴시스 인디 30주년 보도' },
  { y: 1996, m: 10, c: 'KR', kind: 'scene', genre: 'punk', who: '노브레인', text: '펑크 밴드 노브레인이 결성돼 클럽 드럭에서 활동을 시작했다.', src: '경북매일·한국학중앙연구원 디지털인문학 사전' },
  { y: 1997, c: 'KR', kind: 'release', genre: 'indierock', who: '델리스파이스', text: '델리스파이스가 1집을 냈다. 모던 록이 인디의 새 얼굴이 됐다.', src: PUB },
  { y: 1998, c: 'KR', kind: 'release', genre: 'punk', who: '크라잉넛', text: '크라잉넛이 1집을 냈다. ‘말달리자’가 전국구 노래가 됐다.', src: '서울신문·뉴스토마토 보도' },
  { y: 1999, m: 7, c: 'KR', kind: 'festival', name: '트라이포트 록 페스티벌', storm: true, text: '인천 송도에서 트라이포트 록 페스티벌이 열렸다. 첫날 밤 딥 퍼플이 비바람 속에서 무대를 마쳤지만, 폭우로 텐트촌이 잠겨 둘째 날은 취소됐다. 한국 야외 록 페스티벌의 효시.', src: '서울신문 1999.08.03 보도' },
  { y: 2005, m: 7, c: 'KR', kind: 'policy', text: '음악 방송 생방송 사고 이후 인디 밴드의 방송 출연이 막히고 1세대 인디 신이 침체에 빠졌다.', src: '주간경향 2005 대중음악 8대 사건' },
  { y: 2006, m: 7, c: 'KR', kind: 'festival', name: '펜타포트 록 페스티벌', text: '인천 송도에서 제1회 펜타포트 록 페스티벌이 열렸다. 헤드라이너는 뉴욕의 스트록스. 7년 만에 돌아온 대형 록 페스티벌.', src: '아주경제·국민일보·일간스포츠 보도' },
  { y: 2008, c: 'KR', kind: 'release', genre: 'folk', who: '장기하와 얼굴들', text: '장기하와 얼굴들의 ‘싸구려 커피’가 인디 음반으로는 드물게 1만 장 넘게 팔렸다. 인디 2세대의 시작.', src: '헤럴드경제·더위키' },
  { y: 2015, m: 8, c: 'KR', kind: 'scene', genre: 'indierock', who: '혁오', text: '밴드 혁오가 TV 예능 프로그램의 가요제 무대에 서며 단숨에 이름을 알렸다. 인디 밴드가 차트 위로 올라왔다.', src: PUB },
  { y: 2024, c: 'KR', kind: 'industry', text: '한국 인디 음악 스트리밍이 1년 새 68% 늘었다. 밴드 붐이 숫자로 확인됐다.', src: 'Spotify 2025 결산 보도 (코리아중앙데일리)' },
  // ── 음악 밖의 세상 (그 시절을 사는 감각) ──
  { y: 1961, m: 12, c: 'KR', kind: 'world', text: 'TV 방송이 시작됐다. 동네에 텔레비전 있는 집은 손에 꼽았다.', src: PUB },
  { y: 1980, m: 12, c: 'KR', kind: 'world', text: '컬러 TV 방송이 시작됐다.', src: PUB },
  { y: 1982, m: 1, c: 'KR', kind: 'world', text: '36년 만에 야간 통행금지가 풀렸다. 밤 열두 시가 넘어도 집에 안 가도 된다.', src: PUB },
  { y: 1988, m: 9, c: 'KR', kind: 'world', text: '서울 올림픽이 열렸다.', src: PUB },
  { y: 1991, c: 'KR', kind: 'world', text: '노래방이 처음 생겼다. 곧 골목마다 간판이 걸린다.', src: PUB },
  { y: 1997, m: 12, c: 'KR', kind: 'world', text: '외환위기. 나라가 국제통화기금(IMF)의 구제금융을 받았다. 공연장도 하나둘 문을 닫는다.', src: PUB },
  { y: 2002, m: 6, c: 'KR', kind: 'world', text: '한일 월드컵. 광장마다 수십만 명이 같은 노래를 불렀다.', src: PUB },
  { y: 2004, m: 11, c: 'KR', kind: 'industry', text: '월정액 음원 스트리밍 서비스가 시작됐다. 음반을 ‘사는’ 대신 ‘듣는’ 시대.', src: PUB },
  { y: 2009, m: 11, c: 'KR', kind: 'industry', text: '터치스크린 스마트폰이 국내에 출시됐다.', src: PUB },
];

export const KR_WAVES: Wave[] = [
  { id: 'kr_folk', c: 'KR', from: 1969, to: 1975, genres: ['folk'], name: '통기타 포크', ref: '김민기', text: '청바지와 통기타. 음악다방과 대학가에서 포크 가수들이 쏟아져 나온다.' },
  { id: 'kr_campus', c: 'KR', from: 1977, to: 1984, genres: ['indierock', 'folk'], name: '캠퍼스 그룹사운드', ref: '샌드페블즈', text: '대학가요제가 전국에 생중계되면서 대학 밴드가 하룻밤 새 스타가 된다.' },
  { id: 'kr_metal', c: 'KR', from: 1986, to: 1990, genres: ['metal', 'indierock'], name: '헤비메탈 붐', ref: '시나위', text: '긴 머리와 빠른 기타 솔로. 록 밴드들이 다시 무대를 채우고 있다.' },
  { id: 'chosunpunk', c: 'KR', from: 1995, to: 1999, genres: ['punk', 'indierock'], name: '조선 펑크', ref: '크라잉넛', text: '홍대 앞 클럽에서 펑크 밴드들이 쏟아져 나온다. 거리 공연과 몸싸움 같은 슬램.' },
  { id: 'kr_modern', c: 'KR', from: 1997, to: 2001, genres: ['indierock', 'indiepop', 'shoegaze'], name: '모던 록', ref: '델리스파이스', text: '‘모던 록’이라는 말이 유행이다. 클럽 공연이 끝나면 데모 카세트가 팔려 나간다.' },
  { id: 'indie2', c: 'KR', from: 2008, to: 2011, genres: ['folk', 'indierock', 'indiepop'], name: '인디 2세대', ref: '장기하와 얼굴들', text: '인디 음반이 1만 장을 넘게 팔렸다. 방송국이 다시 인디 밴드를 찾는다.' },
];
