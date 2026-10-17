import type { Gender } from './types';
import type { Rng } from './rng';

// 성씨 상위 빈도 (통계청 인구주택총조사 2015 성씨 순위 상위권을 참고한 가중치 — 게임용 근사)
const SURNAMES: [string, number][] = [
  ['김', 21.5], ['이', 14.7], ['박', 8.4], ['최', 4.7], ['정', 4.3], ['강', 2.4], ['조', 2.1],
  ['윤', 2.1], ['장', 2.0], ['임', 1.7], ['한', 1.5], ['오', 1.5], ['서', 1.5], ['신', 1.4],
  ['권', 1.4], ['황', 1.4], ['안', 1.3], ['송', 1.3], ['전', 1.1], ['홍', 1.1], ['유', 1.1],
  ['고', 0.9], ['문', 0.9], ['양', 0.8], ['손', 0.9], ['배', 0.8], ['백', 0.7], ['허', 0.6],
  ['남', 0.5], ['노', 0.4], ['하', 0.5], ['곽', 0.4], ['성', 0.4], ['차', 0.4], ['주', 0.4],
  ['우', 0.4], ['구', 0.4], ['민', 0.3], ['진', 0.3], ['지', 0.3], ['엄', 0.3], ['채', 0.2],
];

// 출생 연대별로 흔한 이름의 분위기를 다르게 (게임용 근사)
const GIVEN: Record<Gender, Record<'90s' | '00s' | '10s', string[]>> = {
  m: {
    '90s': ['민수', '지훈', '현우', '동현', '성민', '준호', '재민', '상우', '태현', '경민', '승현', '진우', '영훈', '정민', '우진'],
    '00s': ['민준', '서준', '지호', '도윤', '현준', '건우', '준서', '민재', '시우', '우진', '예준', '주원', '태윤', '승민', '하준'],
    '10s': ['이준', '도현', '은우', '시윤', '로운', '이안', '선우', '유찬', '하율', '서진', '지안', '윤호', '태오', '한결', '라온'],
  },
  f: {
    '90s': ['지은', '수진', '민지', '혜진', '유진', '지현', '은지', '소연', '수빈', '예진', '하늘', '가영', '보람', '다은', '미소'],
    '00s': ['서연', '지민', '민서', '서윤', '하은', '수아', '지우', '예린', '채원', '유나', '다인', '소율', '윤서', '나연', '가은'],
    '10s': ['하윤', '서아', '지아', '아린', '이서', '시아', '로아', '하린', '유주', '채아', '다온', '이솔', '봄', '나은', '세아'],
  },
};

function era(birthYear: number): '90s' | '00s' | '10s' {
  if (birthYear < 1998) return '90s';
  if (birthYear < 2010) return '00s';
  return '10s';
}

export function randomName(rng: Rng, gender: Gender, birthYear: number, avoid: Set<string> = new Set()): string {
  for (let i = 0; i < 20; i++) {
    const sur = rng.weighted(SURNAMES, (s) => s[1])![0];
    const g = rng.pick(GIVEN[gender][era(birthYear)]);
    const name = sur + g;
    if (!avoid.has(g)) return name;
  }
  return rng.pick(SURNAMES)[0] + rng.pick(GIVEN[gender][era(birthYear)]);
}

const BAND_A = ['새벽', '보라', '낡은', '푸른', '느린', '작은', '시끄러운', '잠 못 드는', '오후의', '마지막', '두 번째', '투명한', '젖은', '네온', '종이', '여름', '겨울', '반지하', '옥상', '불면'];
const BAND_B = ['고양이', '버스', '정류장', '라디오', '우주선', '해변', '편지', '자전거', '등대', '소년단', '소녀들', '모텔', '극장', '비행', '물고기', '기계', '파도', '숲', '골목', '세탁소'];
const BAND_EN = ['Velvet Noon', 'Paper Ghosts', 'Low Tide', 'Neon Bakery', 'Slow Comet', 'Blue Hour', 'Static Bloom', 'Sunday Riot', 'Tin Whale', 'Glass Garden', 'Night Bus', 'Mint Fever'];

export function randomBandName(rng: Rng): string {
  const r = rng.next();
  if (r < 0.62) return `${rng.pick(BAND_A)} ${rng.pick(BAND_B)}`;
  if (r < 0.82) return rng.pick(BAND_EN);
  return `${rng.pick(BAND_B)}${rng.pick(['들', '클럽', '연구소', '단', ' 공장', ' 다방'])}`;
}
