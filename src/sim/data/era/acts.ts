// 실존 밴드와 같은 무대 — ‘같이 공연’ 사건의 데이터.
//
// 규칙 (README ‘원칙’ 참고)
//  1. 텍스트로만. 실존 인물의 초상·로고·음원은 쓰지 않는다.
//  2. 실존 인물의 말이나 행동을 지어내지 않는다. 문장은 언제나 ‘내가’ 겪은 일이다
//     (“포스터에 우리 이름이 나란히 적혔다”, “오프닝 무대에 섰다”, “맨 앞에서 그들의 무대를 봤다”).
//  3. 그 밴드가 그 해·그 나라·그 무대에서 실제로 활동했다는 사실에만 기대어 배치한다.
//  4. 홍보(스토어·광고)에는 실존 이름을 쓰지 않는다.

import type { Genre } from '../../types';
import type { CountryId } from '../countries';
import { BANDS } from './bands';

const PUB = '공개 음악사 자료(위키백과 등)';

/** 클럽 씬: 이 기간 이 도시의 작은 무대에서 실제로 공연하던 밴드들 */
export interface Scene {
  id: string;
  c: CountryId;
  from: number;
  to: number;
  place: string;
  acts: string[];
  genres: Genre[];
  src: string;
}

const HAND_SCENES: Scene[] = [
  { id: 'kr_8army', c: 'KR', from: 1958, to: 1969, place: '미8군 클럽 무대', acts: ['신중현'], genres: ['indierock', 'folk'], src: PUB },
  { id: 'kr_drug', c: 'KR', from: 1995.3, to: 1998.9, place: '홍대 앞 클럽 드럭', acts: ['크라잉넛', '노브레인'], genres: ['punk', 'indierock'], src: '뉴시스 인디 30주년 보도·경북매일' },
  { id: 'kr_hongdae2', c: 'KR', from: 2008, to: 2011, place: '홍대 앞 라이브클럽', acts: ['장기하와 얼굴들', '국카스텐'], genres: ['folk', 'indierock', 'indiepop', 'metal'], src: PUB },
  { id: 'us_cbgb', c: 'US', from: 1975, to: 1978, place: '뉴욕 CBGB', acts: ['라몬스', '토킹 헤즈'], genres: ['punk', 'indierock'], src: PUB },
  { id: 'us_seattle', c: 'US', from: 1988.5, to: 1991.5, place: '시애틀의 작은 클럽', acts: ['너바나'], genres: ['indierock', 'punk'], src: PUB },
  { id: 'us_nyc01', c: 'US', from: 1999.5, to: 2001.5, place: '뉴욕 로어이스트사이드의 클럽', acts: ['스트록스'], genres: ['indierock', 'punk'], src: PUB },
  { id: 'uk_100club', c: 'UK', from: 1976.5, to: 1977.5, place: '런던의 펑크 클럽', acts: ['섹스 피스톨스', '클래시'], genres: ['punk'], src: PUB },
  { id: 'uk_manc', c: 'UK', from: 1992, to: 1994, place: '맨체스터의 작은 클럽', acts: ['오아시스'], genres: ['indierock', 'indiepop'], src: PUB },
  { id: 'uk_sheffield', c: 'UK', from: 2003.5, to: 2005.5, place: '셰필드의 펍 무대', acts: ['아크틱 몽키스'], genres: ['indierock', 'punk'], src: PUB },
  { id: 'jp_livehouse', c: 'JP', from: 1985, to: 1988, place: '도쿄의 라이브하우스', acts: ['X'], genres: ['metal', 'punk'], src: PUB },
  { id: 'de_berlin', c: 'DE', from: 1994, to: 1996, place: '베를린의 클럽', acts: ['람슈타인'], genres: ['metal', 'punk'], src: PUB },
  { id: 'br_bh', c: 'BR', from: 1985, to: 1989, place: '벨루오리존치의 메탈 공연장', acts: ['세풀투라'], genres: ['metal', 'punk'], src: PUB },
];

/** 무명 시절의 작은 무대: 모든 대표 밴드는 데뷔 전후 몇 년 동안 작은 클럽에서 공연했다 — 그 무대에 함께 선다 */
function clubPlace(c: CountryId, y: number): string {
  if (c === 'KR') return y < 1980 ? '음악다방 무대' : y < 1995 ? '소극장 무대' : '홍대 앞 클럽';
  return { JP: '라이브하우스', US: '동네 클럽', UK: '펍 뒷방 무대', DE: '클럽', BR: '라이브 바' }[c] ?? '클럽';
}

export const SCENES: Scene[] = [
  ...HAND_SCENES,
  ...BANDS.filter((b) => !HAND_SCENES.some((h) => h.acts.includes(b.name))).map((b) => ({
    id: `${b.c}_${b.name}_club`,
    c: b.c,
    from: b.from,
    to: Math.min(b.to, b.from + 2.5),
    place: clubPlace(b.c, b.from),
    acts: [b.name],
    genres: b.genres,
    src: PUB,
  })),
];

/** 투어: 이 기간 이 나라를 돌던 밴드 — 오프닝 무대 자리 */
export interface Tour {
  id: string;
  c: CountryId;
  from: number;
  to: number;
  act: string;
  genres: Genre[];
  src: string;
}

// 오프닝 무대 자리는 bands.ts 의 활동 기간에서 만든다
export const TOURS: Tour[] = BANDS.map((b) => ({ id: `${b.c}_${b.name}`, c: b.c, from: b.from, to: b.to, act: b.name, genres: b.genres, src: PUB }));

/** 페스티벌 라인업: 실제 그 회차에 섰던 밴드 (보도·공식 기록으로 확인) */
export interface Bill {
  id: string;
  c: CountryId;
  y: number;
  m: number;
  event: string;
  top: string[];
  /** 실제 상황 — 악천후 등 */
  note?: string;
  src: string;
}

export const BILLS: Bill[] = [
  { id: 'woodstock69', c: 'US', y: 1969, m: 8, event: '우드스톡', top: ['지미 헨드릭스', '더 후', '재니스 조플린', '산타나'], src: PUB },
  { id: 'rir85', c: 'BR', y: 1985, m: 1, event: '록 인 리우', top: ['퀸', 'AC/DC', '아이언 메이든', '스콜피언스'], src: 'CNN Brasil·Rolling Stone Brasil 회고' },
  { id: 'rar85', c: 'DE', y: 1985, m: 5, event: '록 암 링', top: ['U2', '조 코커'], src: 'bonedo·Pollstar 회고' },
  { id: 'glasto94', c: 'UK', y: 1994, m: 6, event: '글래스턴베리', top: ['오아시스'], note: '오아시스는 이 해 작은 NME 스테이지에서 첫 글래스턴베리 무대를 가졌다', src: 'Radio X·NME 회고' },
  { id: 'glasto95', c: 'UK', y: 1995, m: 6, event: '글래스턴베리', top: ['오아시스', '펄프', '더 큐어'], note: '펄프는 마지막 순간 출연을 취소한 스톤 로지스 대신 무대에 섰다', src: 'Radio X 회고' },
  { id: 'fuji97', c: 'JP', y: 1997, m: 7, event: '후지 록 페스티벌', top: ['레드 핫 칠리 페퍼스', '푸 파이터스', '레이지 어게인스트 더 머신'], note: '태풍 속에서 첫날 공연이 이어졌고 둘째 날은 취소됐다', src: 'Monocle·후지록 공식 회고' },
  { id: 'triport99', c: 'KR', y: 1999, m: 7, event: '트라이포트 록 페스티벌', top: ['딥 퍼플', '프로디지', '자우림', '윤도현밴드'], note: '첫날 밤 딥 퍼플이 비바람 속에서 무대를 마쳤고, 폭우로 둘째 날은 취소됐다', src: '서울신문 1999.06.16·08.03 보도' },
  { id: 'sonic00', c: 'JP', y: 2000, m: 8, event: '서머소닉', top: ['그린 데이', '존 스펜서 블루스 익스플로전'], src: '서머소닉 공식 사이트' },
  { id: 'penta06', c: 'KR', y: 2006, m: 7, event: '펜타포트 록 페스티벌', top: ['스트록스'], src: '아주경제·일간스포츠 보도' },
];

const fits = (genres: Genre[], g?: Genre) => !g || genres.includes(g);

export function scenesAt(country: CountryId, year: number, genre?: Genre): Scene[] {
  return SCENES.filter((x) => x.c === country && year >= x.from && year <= x.to && fits(x.genres, genre));
}

export function toursAt(country: CountryId, year: number, genre?: Genre): Tour[] {
  return TOURS.filter((x) => x.c === country && year >= x.from && year <= x.to && fits(x.genres, genre));
}

export function billAt(country: CountryId, year: number): Bill | undefined {
  return BILLS.find((b) => b.c === country && Math.floor(year) === b.y);
}
