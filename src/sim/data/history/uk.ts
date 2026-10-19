// 영국 음악사.
import { PUB, type HistoryItem, type Wave } from './types';

export const UK_HISTORY: HistoryItem[] = [
  { y: 1967, m: 6, c: 'UK', kind: 'release', genre: 'indierock', who: '비틀스', text: '비틀스가 《Sgt. Pepper\'s Lonely Hearts Club Band》를 냈다. 앨범이 하나의 작품이 됐다.', src: PUB },
  { y: 1970, m: 9, c: 'UK', kind: 'festival', name: '글래스턴베리', text: '훗날 글래스턴베리가 되는 첫 페스티벌이 영국 시골 농장에서 열렸다.', src: PUB },
  { y: 1976, m: 9, c: 'UK', kind: 'scene', genre: 'punk', text: '런던 100 클럽에서 이틀짜리 ‘펑크 스페셜’이 열렸다. 섹스 피스톨스와 클래시가 같은 무대에 섰다.', src: PUB },
  { y: 1977, m: 10, c: 'UK', kind: 'release', genre: 'punk', who: '섹스 피스톨스', text: '섹스 피스톨스가 《Never Mind the Bollocks》를 냈다. 영국 펑크가 폭발했다.', src: PUB },
  { y: 1979, m: 12, c: 'UK', kind: 'release', genre: 'punk', who: '클래시', text: '클래시가 《London Calling》을 냈다. 펑크가 더 넓은 세상을 노래했다.', src: PUB },
  { y: 1984, m: 2, c: 'UK', kind: 'release', genre: 'indierock', who: '더 스미스', text: '맨체스터 밴드 더 스미스가 첫 앨범을 냈다. 독립 레이블 음반이 차트 위로 올라왔다.', src: PUB },
  { y: 1985, m: 7, c: 'UK', kind: 'festival', name: '라이브 에이드', text: '런던 웸블리와 필라델피아를 잇는 자선 공연 라이브 에이드. 전 세계가 같은 공연을 생중계로 봤다.', src: PUB },
  { y: 1986, c: 'UK', kind: 'release', genre: 'indiepop', text: '음악 주간지가 부록 카세트 〈C86〉을 냈다. 기타 팝 밴드들을 묶은 이 테이프가 ‘인디팝’이라는 말을 굳혔다.', src: PUB },
  { y: 1989, m: 5, c: 'UK', kind: 'release', genre: 'indierock', who: '스톤 로지스', text: '스톤 로지스가 데뷔 앨범을 냈다. 맨체스터가 들썩인다.', src: PUB },
  { y: 1991, m: 11, c: 'UK', kind: 'release', genre: 'shoegaze', who: '마이 블러디 밸런타인', text: '마이 블러디 밸런타인이 《Loveless》를 냈다. 슈게이즈의 교과서가 됐다.', src: PUB },
  { y: 1994, m: 8, c: 'UK', kind: 'release', genre: 'indierock', who: '오아시스', text: '오아시스가 《Definitely Maybe》를 냈다. 브릿팝의 여름이 시작됐다.', src: PUB },
  { y: 1995, m: 8, c: 'UK', kind: 'scene', genre: 'indierock', text: '블러와 오아시스가 같은 주에 싱글을 냈다. 신문 1면까지 오른 ‘브릿팝 전쟁’.', src: PUB },
  { y: 1997, m: 6, c: 'UK', kind: 'release', genre: 'indierock', who: '라디오헤드', text: '라디오헤드가 《OK Computer》를 냈다. 록이 어디까지 갈 수 있는지 다시 정했다.', src: PUB },
  { y: 2000, m: 7, c: 'UK', kind: 'release', genre: 'indiepop', who: '콜드플레이', text: '콜드플레이가 데뷔 앨범 《Parachutes》를 냈다.', src: PUB },
  { y: 2006, m: 1, c: 'UK', kind: 'release', genre: 'indierock', who: '아크틱 몽키스', text: '인터넷 입소문으로 먼저 유명해진 아크틱 몽키스가 데뷔 앨범을 냈다.', src: PUB },
];

export const UK_WAVES: Wave[] = [
  { id: 'uk_beat', c: 'UK', from: 1963, to: 1966, genres: ['indierock'], name: '비트 붐', ref: '비틀스', text: '리버풀에서 시작된 비트 음악. 동네 클럽마다 네 명짜리 밴드가 넘쳐난다.' },
  { id: 'punk_uk', c: 'UK', from: 1976, to: 1979, genres: ['punk'], name: '런던 펑크', ref: '섹스 피스톨스', text: '찢어진 옷과 안전핀. 런던 펑크가 영국을 발칵 뒤집었다.' },
  { id: 'nwobhm', c: 'UK', from: 1979, to: 1983, genres: ['metal'], name: '영국 헤비메탈 신물결', ref: '아이언 메이든', text: '작은 독립 레이블들이 영국 헤비메탈 밴드의 싱글을 쏟아낸다.' },
  { id: 'uk_indie', c: 'UK', from: 1983, to: 1987, genres: ['indierock', 'indiepop'], name: '영국 인디 기타 팝', ref: '더 스미스', text: '독립 레이블과 대학 라디오가 기타 밴드들을 키운다.' },
  { id: 'shoegaze', c: 'UK', from: 1989, to: 1992, genres: ['shoegaze'], name: '슈게이즈의 물결', ref: '마이 블러디 밸런타인', text: '발밑의 이펙터만 보며 노이즈의 벽을 쌓는 밴드들이 영국 음악 언론을 사로잡았다.' },
  { id: 'madchester', c: 'UK', from: 1989, to: 1991, genres: ['indierock', 'indiepop'], name: '매드체스터', ref: '스톤 로지스', text: '맨체스터의 기타와 댄스 비트. 클럽과 밴드가 한 덩어리가 됐다.' },
  { id: 'britpop', c: 'UK', from: 1993, to: 1997, genres: ['indierock', 'indiepop'], name: '브릿팝', ref: '오아시스', text: '영국 기타 팝이 차트를 점령했다. 언론은 매주 ‘다음 대형 밴드’를 찾는다.' },
  { id: 'netbuzz', c: 'UK', from: 2005, to: 2007, genres: ['indierock', 'indiepop'], name: '인터넷 입소문 밴드', ref: '아크틱 몽키스', text: '레이블보다 인터넷이 먼저 밴드를 알아보는 시대가 왔다.' },
];
