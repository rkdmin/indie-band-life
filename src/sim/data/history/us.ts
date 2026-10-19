// 미국 음악사.
import { PUB, type HistoryItem, type Wave } from './types';

export const US_HISTORY: HistoryItem[] = [
  { y: 1964, m: 2, c: 'US', kind: 'scene', genre: 'indierock', who: '비틀스', text: '비틀스가 미국 TV에 출연했다. 영국 밴드들의 미국 진출, ‘브리티시 인베이전’이 시작됐다.', src: PUB },
  { y: 1965, m: 7, c: 'US', kind: 'scene', genre: 'folk', who: '밥 딜런', text: '뉴포트 포크 페스티벌에서 밥 딜런이 전기 기타를 들었다. 포크와 록의 경계가 무너졌다.', src: PUB },
  { y: 1967, m: 3, c: 'US', kind: 'release', genre: 'indierock', who: '벨벳 언더그라운드', text: '벨벳 언더그라운드가 첫 앨범을 냈다. 당시엔 거의 안 팔렸지만, 훗날 수많은 인디 밴드의 출발점이 된다.', src: PUB },
  { y: 1969, m: 8, c: 'US', kind: 'festival', name: '우드스톡', text: '우드스톡 페스티벌. 수십만 명이 사흘 동안 진흙 속에서 음악을 들었다.', src: PUB },
  { y: 1976, m: 4, c: 'US', kind: 'release', genre: 'punk', who: '라몬스', text: '라몬스가 데뷔 앨범을 냈다. 세 코드와 2분짜리 노래 — 펑크가 태어났다.', src: PUB },
  { y: 1981, m: 8, c: 'US', kind: 'industry', text: 'MTV가 개국했다. 이제 음악은 ‘보는 것’이 됐다.', src: PUB },
  { y: 1986, m: 3, c: 'US', kind: 'release', genre: 'metal', who: '메탈리카', text: '메탈리카가 《Master of Puppets》를 냈다. 스래시 메탈이 정점에 섰다.', src: PUB },
  { y: 1988, m: 10, c: 'US', kind: 'release', genre: 'shoegaze', who: '소닉 유스', text: '소닉 유스가 《Daydream Nation》을 냈다. 노이즈와 멜로디가 함께 갈 수 있다는 걸 보여 줬다.', src: PUB },
  { y: 1991, m: 7, c: 'US', kind: 'festival', name: '롤라팔루자', text: '순회 록 페스티벌 롤라팔루자가 처음 열렸다. ‘얼터너티브’가 미국 여름의 이름이 됐다.', src: PUB },
  { y: 1991, m: 9, c: 'US', kind: 'release', genre: 'indierock', who: '너바나', text: '시애틀 밴드 너바나가 《Nevermind》를 냈다. 그런지가 순식간에 주류가 됐다.', src: PUB },
  { y: 1994, m: 4, c: 'US', kind: 'scene', genre: 'indierock', text: '너바나의 커트 코베인이 세상을 떠났다. 한 시대가 갑자기 멈췄다.', src: PUB },
  { y: 2001, c: 'US', kind: 'release', genre: 'indierock', who: '스트록스', text: '스트록스가 《Is This It》을 냈다. 개러지 록 리바이벌이 시작됐다.', src: PUB },
  { y: 2003, m: 4, c: 'US', kind: 'release', genre: 'punk', who: '화이트 스트라이프스', text: '두 명짜리 밴드 화이트 스트라이프스가 《Elephant》를 냈다. 기타 리프 하나가 경기장을 울렸다.', src: PUB },
  { y: 1969, m: 7, c: 'US', kind: 'world', text: '사람이 달에 내렸다. 온 세상이 같은 TV 화면을 봤다.', src: PUB },
  { y: 2001, m: 9, c: 'US', kind: 'world', text: '뉴욕에서 9·11 테러가 일어났다. 그해 가을의 공연은 모두 추모로 시작됐다.', src: PUB },
];

export const US_WAVES: Wave[] = [
  { id: 'us_folk', c: 'US', from: 1960, to: 1965, genres: ['folk'], name: '포크 리바이벌', ref: '밥 딜런', text: '뉴욕 그리니치빌리지 커피하우스마다 통기타를 든 젊은이들이 줄을 선다.' },
  { id: 'british_inv', c: 'US', from: 1964, to: 1966, genres: ['indierock'], name: '브리티시 인베이전', ref: '비틀스', text: '영국 밴드들이 미국 차트를 점령했다. 동네마다 머리를 기른 밴드가 생긴다.' },
  { id: 'cbgb', c: 'US', from: 1975, to: 1978, genres: ['punk', 'indierock'], name: '뉴욕 펑크', ref: '라몬스', text: '뉴욕의 작은 클럽 CBGB 무대에서 짧고 빠른 노래들이 터져 나온다.' },
  { id: 'thrash', c: 'US', from: 1983, to: 1988, genres: ['metal'], name: '스래시 메탈', ref: '메탈리카', text: '더 빠르고 더 무겁게. 캘리포니아 차고에서 스래시 메탈이 폭발한다.' },
  { id: 'grunge', c: 'US', from: 1990, to: 1993, genres: ['indierock', 'punk'], name: '그런지 붐', ref: '너바나', text: '시애틀에서 시작된 거친 기타 소리가 미국을 뒤집고 있다. 레이블들이 비슷한 소리를 내는 밴드를 찾아 클럽을 뒤진다.' },
  { id: 'garage', c: 'US', from: 2001, to: 2004, genres: ['indierock', 'punk'], name: '개러지 록 리바이벌', ref: '스트록스', text: '청바지와 낡은 기타, 3분짜리 노래. 뉴욕발 개러지 록이 다시 유행이다.' },
];
