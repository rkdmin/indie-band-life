// 태어날 나라. 몇몇 나라만 고르고, 각 나라의 실제 수치로 음악 인생의 조건을 바꾼다.
// 금액은 모두 원화로 환산해 보여 준다 (환율은 반올림한 근사).
//   [통계] IFPI Global Music Report 2025 (2024년 매출) 시장 순위: 미국·일본·영국·독일·중국·프랑스·한국·캐나다·브라질·멕시코
//   [근사] 연간 출생아 수(2023 전후), 기대수명, 합계출산율, 최저임금은 각국 공식 통계를 반올림

import type { Gender, Region } from '../types';
import type { Rng } from '../rng';

export type CountryId = 'KR' | 'JP' | 'US' | 'UK' | 'DE' | 'BR';

export interface Country {
  id: CountryId;
  name: string;
  flag: string;
  births: number; // 연간 출생아 수 [근사]
  lifeExp: number; // 기대수명 [근사]
  tfr: number; // 합계출산율 [근사]
  twinRate: number; // 다태아 비중 [근사]
  immigrantRate: number; // 이민 가정 출생 비중 [근사]
  origins: string[]; // 이민 가정 출신국 예시
  marketRank: number; // IFPI 녹음 음악 시장 순위 (2024)
  /** 자동 플레이 120회 시뮬레이션에서 팬 1만 명에 도달한 비율 (tests/country.test.ts) */
  simReach10k: number;
  marketMul: number; // 팬·음원 도달 배율 [가정, 시장 규모 순위 기반]
  wageMul: number; // 최저임금(원화 환산) / 한국 [근사]
  costMul: number; // 생활비 / 한국 [근사]
  military: boolean; // 남성 의무 병역
  scene: string; // 라이브 씬 한 줄
  quirk: string; // 이 나라 음악 생활의 특징
  regions: Record<Region, string>;
  surnames: string[];
  given: Record<Gender, string[]>;
  westernOrder: boolean; // 이름 순서: 이름 성
}

export const COUNTRIES: Record<CountryId, Country> = {
  KR: {
    simReach10k: 43,
    id: 'KR', name: '대한민국', flag: '🇰🇷', births: 230_000, lifeExp: 83.5, tfr: 0.72, twinRate: 0.055, immigrantRate: 0.053,
    origins: ['베트남', '중국', '태국', '필리핀', '일본'], marketRank: 7, marketMul: 1.0, wageMul: 1.0, costMul: 1.0, military: true,
    scene: '홍대·합정의 라이브 클럽, 페스티벌로 이어지는 밴드 붐',
    quirk: '남성은 병역이 있다. 시장은 세계 7위지만 아이돌 중심 — 밴드는 페스티벌과 숏폼으로 큰다.',
    regions: { seoul: '서울', gyeonggi: '경기·인천', metro: '광역시', local: '지방 소도시' },
    surnames: [], given: { m: [], f: [] }, westernOrder: false,
  },
  JP: {
    simReach10k: 53,
    id: 'JP', name: '일본', flag: '🇯🇵', births: 727_000, lifeExp: 84.1, tfr: 1.2, twinRate: 0.02, immigrantRate: 0.03,
    origins: ['중국', '한국', '필리핀', '베트남'], marketRank: 2, marketMul: 1.35, wageMul: 0.95, costMul: 1.0, military: false,
    scene: '시모키타자와·고엔지의 라이브하우스, CD와 투어가 아직 살아 있는 시장',
    quirk: '세계 2위 시장. 대신 작은 라이브하우스는 ‘노르마’(티켓 할당)가 있어 무명 밴드는 표를 못 팔면 자비로 메운다.',
    regions: { seoul: '도쿄', gyeonggi: '가나가와·사이타마', metro: '오사카·후쿠오카', local: '지방 소도시' },
    surnames: ['사토', '스즈키', '다카하시', '다나카', '와타나베', '이토', '야마모토', '나카무라', '고바야시', '가토'],
    given: { m: ['하루토', '소타', '렌', '유토', '하야토', '다이키', '쇼', '가이토', '료', '켄타'], f: ['유이', '하나', '아오이', '미오', '사쿠라', '린', '메이', '아카리', '히나', '유나'] },
    westernOrder: false,
  },
  US: {
    simReach10k: 64,
    id: 'US', name: '미국', flag: '🇺🇸', births: 3_600_000, lifeExp: 77.5, tfr: 1.62, twinRate: 0.031, immigrantRate: 0.23,
    origins: ['멕시코', '인도', '중국', '필리핀', '엘살바도르'], marketRank: 1, marketMul: 1.6, wageMul: 1.3, costMul: 1.45, military: false,
    scene: '차고에서 시작하는 밴드, 대학가 라디오, 끝없는 투어 밴',
    quirk: '세계 1위 시장. 대신 경쟁이 가장 치열하고 의료비·생활비가 비싸다.',
    regions: { seoul: '뉴욕·LA', gyeonggi: '대도시 교외', metro: '중소 도시', local: '시골 마을' },
    surnames: ['스미스', '존슨', '윌리엄스', '브라운', '존스', '가르시아', '밀러', '데이비스', '로드리게스', '마르티네스'],
    given: { m: ['리암', '노아', '올리버', '제임스', '엘라이자', '윌리엄', '헨리', '루카스', '벤저민', '테오'], f: ['올리비아', '에마', '샬럿', '아멜리아', '소피아', '미아', '이사벨라', '에이바', '에블린', '루나'] },
    westernOrder: true,
  },
  UK: {
    simReach10k: 43,
    id: 'UK', name: '영국', flag: '🇬🇧', births: 685_000, lifeExp: 81.0, tfr: 1.49, twinRate: 0.015, immigrantRate: 0.3,
    origins: ['인도', '폴란드', '파키스탄', '나이지리아', '루마니아'], marketRank: 3, marketMul: 1.3, wageMul: 1.9, costMul: 1.5, military: false,
    scene: '펍 뒷방 공연장, 음악 언론, 여름 페스티벌 시즌',
    quirk: '세계 3위 시장, 밴드 음악의 고향. 작은 공연장이 많지만 런던 월세는 살인적이다.',
    regions: { seoul: '런던', gyeonggi: '런던 근교', metro: '맨체스터·글래스고', local: '지방 소도시' },
    surnames: ['스미스', '존스', '테일러', '브라운', '윌리엄스', '윌슨', '존슨', '데이비스', '에번스', '토머스'],
    given: { m: ['올리버', '해리', '잭', '조지', '노아', '찰리', '제이컵', '앨피', '프레디', '오스카'], f: ['아멜리아', '올리비아', '이슬라', '에바', '에밀리', '아바', '릴리', '그레이스', '소피아', '포피'] },
    westernOrder: true,
  },
  DE: {
    simReach10k: 61,
    id: 'DE', name: '독일', flag: '🇩🇪', births: 693_000, lifeExp: 81.2, tfr: 1.35, twinRate: 0.017, immigrantRate: 0.25,
    origins: ['튀르키예', '폴란드', '시리아', '루마니아', '이탈리아'], marketRank: 4, marketMul: 1.2, wageMul: 1.75, costMul: 1.25, military: false,
    scene: '베를린의 클럽과 스쿼트, 지자체·연방의 탄탄한 예술 지원',
    quirk: '세계 4위 시장. 예술인 지원 제도가 두터워 지원금 심사에 유리하다.',
    regions: { seoul: '베를린', gyeonggi: '대도시 근교', metro: '함부르크·뮌헨', local: '지방 소도시' },
    surnames: ['뮐러', '슈미트', '슈나이더', '피셔', '베버', '마이어', '바그너', '베커', '슐츠', '호프만'],
    given: { m: ['레온', '노아', '폴', '핀', '엘리아스', '펠릭스', '루이스', '요나스', '마테오', '헨리'], f: ['에밀리아', '미아', '하나', '엠마', '소피아', '레나', '클라라', '마틸다', '리나', '엘라'] },
    westernOrder: true,
  },
  BR: {
    simReach10k: 23,
    id: 'BR', name: '브라질', flag: '🇧🇷', births: 2_530_000, lifeExp: 76.4, tfr: 1.62, twinRate: 0.018, immigrantRate: 0.01,
    origins: ['볼리비아', '아르헨티나', '포르투갈', '아이티'], marketRank: 9, marketMul: 0.95, wageMul: 0.17, costMul: 0.35, military: false,
    scene: '상파울루의 라이브 바, 거리 축제, 폭발적으로 크는 스트리밍',
    quirk: '세계 9위 시장이지만 상위 10개국 중 가장 빠르게 성장(2024년 +21.7%). 임금은 낮고 생활비도 낮다.',
    regions: { seoul: '상파울루·리우', gyeonggi: '대도시 근교', metro: '지방 대도시', local: '작은 마을' },
    surnames: ['실바', '산투스', '올리베이라', '소우자', '호드리게스', '페헤이라', '알메이다', '페레이라', '리마', '고메스'],
    given: { m: ['미겔', '아르투르', '가브리에우', '엔조', '헤이토르', '라파에우', '다비', '베르나르두', '루카스', '마테우스'], f: ['엘레나', '알리시', '라우라', '마리아', '소피아', '이자벨라', '마누엘라', '줄리아', '루이자', '발렌치나'] },
    westernOrder: true,
  },
};

export const COUNTRY_IDS = Object.keys(COUNTRIES) as CountryId[];
export const countryOf = (id?: string): Country => COUNTRIES[(id as CountryId) ?? 'KR'] ?? COUNTRIES.KR;

/** 실제 연간 출생아 수에 비례해 태어날 나라를 뽑는다 */
export function rollCountry(rng: Rng): CountryId {
  return rng.weighted(COUNTRY_IDS, (c) => COUNTRIES[c].births)!;
}

export function countryBirthShare(id: CountryId): number {
  const total = COUNTRY_IDS.reduce((a, c) => a + COUNTRIES[c].births, 0);
  return COUNTRIES[id].births / total;
}

export function foreignName(rng: Rng, c: Country, gender: Gender): string {
  const g = rng.pick(c.given[gender]);
  const s = rng.pick(c.surnames);
  return c.westernOrder ? `${g} ${s}` : `${s} ${g}`;
}

/** 음악으로 성공하기 좋은 정도 (별 1~5) — 시뮬레이션에서 팬 1만 명에 도달한 비율로 매긴다 */
export function successStars(c: Country): number {
  return Math.max(1, Math.min(5, Math.round(c.simReach10k / 11)));
}
