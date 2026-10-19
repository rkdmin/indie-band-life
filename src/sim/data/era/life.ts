// 시대의 일상: 그 해·그 나라에서만 자연스러운 작은 순간들. 인생 기록의 flavor 줄로 섞인다.
// 연도는 제도·풍경이 실제로 있던 기간의 근사값이다 [근사].
//   야간 통행금지 1945~1982.1 · 버스 안내양 ~1989 · 장발 단속 1970년대 · 교복 자율화 1983~1985
//   연탄 난방 1960~1990년대 · 삐삐 1990년대 · 외환위기 1997.12~ · 공중전화 카드 1986~

import type { CountryId } from '../countries';

export interface EraLine {
  from: number;
  to: number;
  c?: CountryId[];
  /** 이 나이 사이에만 */
  age?: [number, number];
  /** 밴드가 있을 때만 */
  band?: boolean;
  text: string;
}

const KR: CountryId[] = ['KR'];

export const ERA_LINES: EraLine[] = [
  // ── 한국 ──
  { from: 1955, to: 1981.9, c: KR, age: [16, 60], text: '통금 사이렌이 울리기 전에 뛰어서 집에 왔다.' },
  { from: 1955, to: 1981.9, c: KR, age: [17, 40], band: true, text: '합주가 길어져 통금에 걸릴 뻔했다. 골목에서 숨을 죽이고 순찰이 지나가길 기다렸다.' },
  { from: 1960, to: 1989, c: KR, age: [7, 40], text: '버스 안내양이 “오라이!” 하고 문을 두드렸다.' },
  { from: 1960, to: 1995, c: KR, age: [5, 70], text: '새벽에 연탄불이 꺼져서 온 식구가 떨며 잤다.' },
  { from: 1960, to: 1985, c: KR, age: [7, 18], text: '동네 만화방에서 해 질 때까지 있었다.' },
  { from: 1962, to: 1980, c: KR, age: [5, 70], text: '저녁마다 TV 있는 집 마루에 동네 사람들이 모였다.' },
  { from: 1970, to: 1980, c: KR, age: [16, 35], text: '장발 단속에 걸려 파출소에서 머리를 잘렸다.' },
  { from: 1970, to: 1980, c: KR, age: [16, 35], band: true, text: '기타 케이스를 메고 가다 장발 단속반을 보고 골목으로 돌아갔다.' },
  { from: 1965, to: 1990, c: KR, age: [16, 40], text: '음악다방 DJ에게 신청곡 쪽지를 건넸다.' },
  { from: 1968, to: 1985, c: KR, age: [15, 35], text: '청바지에 통기타를 메고 친구들과 강가에 갔다.' },
  { from: 1972, to: 1998, age: [12, 40], text: '라디오에서 좋아하는 노래가 나오자 급히 녹음 버튼을 눌렀다. 앞부분이 잘렸다.' },
  { from: 1975, to: 1995, age: [12, 30], text: '친구가 직접 녹음해 준 믹스테이프를 늘어질 때까지 들었다.' },
  { from: 1983, to: 1986, c: KR, age: [13, 18], text: '교복 자율화로 사복을 입고 등교했다. 뭘 입을지가 새로운 고민이 됐다.' },
  { from: 1986, to: 2003, c: KR, age: [12, 50], text: '공중전화 카드를 꽂고 줄 선 사람들 눈치를 보며 통화했다.' },
  { from: 1993, to: 1999, c: KR, age: [15, 45], text: '삐삐에 찍힌 번호를 보고 공중전화로 달려갔다.' },
  { from: 1993, to: 1999, c: KR, age: [15, 30], band: true, text: '멤버에게 삐삐로 ‘8282’를 보냈다. 합주 시간이 지났다.' },
  { from: 1997.9, to: 1999.5, c: KR, age: [18, 60], text: '아는 형이 다니던 회사가 문을 닫았다. 다들 돈 얘기만 했다.' },
  { from: 1998, to: 2003, c: KR, age: [13, 30], text: 'PC방에서 밤을 새우고 아침 해를 봤다.' },
  { from: 2002, to: 2009, c: KR, age: [14, 40], text: '미니홈피 배경음악을 몇 시간째 고르고 있었다.' },
  { from: 2002.4, to: 2002.6, c: KR, age: [5, 80], text: '거리마다 붉은 티셔츠가 넘쳤다.' },
  // ── 다른 나라 ──
  { from: 1960, to: 1975, c: ['US', 'UK', 'DE'], age: [14, 30], text: '주크박스에 동전을 넣고 같은 노래를 세 번 들었다.' },
  { from: 1981, to: 1990, c: ['US'], age: [12, 25], text: '뮤직비디오 채널 앞에서 하루를 다 보냈다.' },
  { from: 1961, to: 1989, c: ['DE'], age: [10, 70], text: '장벽 너머에서 라디오 전파가 넘어왔다.' },
  { from: 1985, to: 1999, c: ['JP'], age: [14, 30], text: '노래방 박스에서 친구들과 밤새 노래했다.' },
  { from: 1970, to: 1990, c: ['UK'], age: [15, 35], text: '레코드 가게 수입 코너에서 한 시간을 서 있었다.' },
  { from: 1964, to: 1985, c: ['BR'], age: [15, 40], text: '검열을 피해 가사를 비유로 바꿔 썼다.' },
];

export function eraLines(year: number, age: number, country: CountryId, hasBand: boolean): string[] {
  return ERA_LINES.filter(
    (l) => year >= l.from && year <= l.to && (!l.c || l.c.includes(country)) && (!l.age || (age >= l.age[0] && age < l.age[1])) && (!l.band || hasBand),
  ).map((l) => l.text);
}
