// 나라별 대표 밴드와 활동 기간. ‘같이 공연’(오프닝 무대)과 ‘라디오에서 흘러나온 노래’ 사건이 쓴다.
// 해체·멤버의 죽음·장기 휴지기 뒤로는 나오지 않는다 (예: 너바나 1994년 3월, 조이 디비전 1980년 5월까지).
// 기간은 공개 음악사 자료의 활동 연표를 반올림한 근사값이다 [근사].
// 실존 밴드는 이름만 쓴다 — 말이나 행동을 지어내지 않고, 초상·로고·음원을 쓰지 않는다.

import type { Genre } from '../../types';
import type { CountryId } from '../countries';

export interface Band {
  name: string;
  c: CountryId;
  from: number;
  to: number;
  genres: Genre[];
}

const B = (c: CountryId, name: string, from: number, to: number, genres: Genre[]): Band => ({ name, c, from, to, genres });

export const BANDS: Band[] = [
  // ── 한국 ──
  B('KR', '신중현과 엽전들', 1974, 1975.5, ['indierock']),
  B('KR', '산울림', 1977, 1997, ['indierock', 'folk']),
  B('KR', '사랑과 평화', 1978, 1988, ['indierock']),
  B('KR', '송골매', 1979, 1990, ['indierock', 'folk']),
  B('KR', '들국화', 1985, 1989, ['indierock', 'folk']),
  B('KR', '부활', 1986, 2010, ['indierock', 'metal']),
  B('KR', '시나위', 1986, 1995, ['metal', 'indierock']),
  B('KR', '백두산', 1986, 1990, ['metal']),
  B('KR', '봄여름가을겨울', 1988, 2010, ['indierock', 'folk']),
  B('KR', '넥스트', 1992, 1997, ['metal', 'indierock']),
  B('KR', '윤도현밴드', 1995, 2020, ['indierock']),
  B('KR', '언니네 이발관', 1996, 2017, ['indierock', 'indiepop', 'shoegaze']),
  B('KR', '자우림', 1997, 2025, ['indierock', 'indiepop']),
  B('KR', '델리스파이스', 1997, 2008, ['indierock', 'indiepop', 'shoegaze']),
  B('KR', '크라잉넛', 1998, 2025, ['punk', 'indierock']),
  B('KR', '노브레인', 1998, 2025, ['punk']),
  B('KR', '체리필터', 2000, 2008, ['indierock', 'punk']),
  B('KR', '국카스텐', 2009, 2018, ['indierock', 'metal']),
  B('KR', '장기하와 얼굴들', 2009, 2018, ['folk', 'indierock', 'indiepop']),
  B('KR', '쏜애플', 2010, 2022, ['indierock', 'shoegaze']),
  B('KR', '혁오', 2015, 2022, ['indierock', 'indiepop']),
  B('KR', '잔나비', 2016, 2025, ['indierock', 'indiepop', 'folk']),
  B('KR', '실리카겔', 2017, 2025, ['indierock', 'shoegaze']),
  B('KR', '새소년', 2017, 2022, ['indierock']),
  // ── 일본 ──
  B('JP', '핫피 엔도', 1970, 1972.9, ['folk', 'indierock']),
  B('JP', '서던 올 스타즈', 1978, 2025, ['indiepop', 'indierock']),
  B('JP', 'BOØWY', 1982, 1987.12, ['indierock', 'punk']),
  B('JP', '더 블루 하츠', 1987, 1995, ['punk']),
  B('JP', 'X JAPAN', 1989, 1997.9, ['metal']),
  B('JP', '미스터 칠드런', 1992, 2025, ['indiepop', 'indierock']),
  B('JP', '라르크앙시엘', 1994, 2025, ['indierock']),
  B('JP', '쿠루리', 1998, 2025, ['indierock', 'folk']),
  B('JP', '넘버 걸', 1999, 2002.11, ['punk', 'indierock']),
  B('JP', '범프 오브 치킨', 2000, 2025, ['indierock']),
  B('JP', '아시안 쿵푸 제너레이션', 2003, 2025, ['indierock', 'punk']),
  B('JP', '원 오크 록', 2007, 2025, ['indierock', 'metal']),
  // ── 미국 ──
  B('US', '비치 보이스', 1962, 1970, ['indiepop', 'folk']),
  B('US', '도어스', 1967, 1971.4, ['indierock', 'shoegaze']),
  B('US', '크리던스 클리어워터 리바이벌', 1968, 1972, ['indierock', 'folk']),
  B('US', '에어로스미스', 1973, 2019, ['indierock', 'metal']),
  B('US', '라몬스', 1976, 1996, ['punk']),
  B('US', '토킹 헤즈', 1977, 1988, ['indierock', 'indiepop']),
  B('US', 'R.E.M.', 1983, 2011, ['indierock', 'folk']),
  B('US', '소닉 유스', 1983, 2011, ['shoegaze', 'indierock', 'punk']),
  B('US', '메탈리카', 1983, 2025, ['metal']),
  B('US', '레드 핫 칠리 페퍼스', 1984, 2025, ['indierock', 'punk']),
  B('US', '건즈 앤 로지스', 1987, 1993, ['metal', 'indierock']),
  B('US', '너바나', 1989, 1994.2, ['indierock', 'punk']),
  B('US', '펄 잼', 1991, 2025, ['indierock']),
  B('US', '그린 데이', 1994, 2025, ['punk']),
  B('US', '푸 파이터스', 1995, 2025, ['indierock']),
  B('US', '스트록스', 2001, 2006, ['indierock', 'punk']),
  B('US', '화이트 스트라이프스', 2001, 2011, ['punk', 'indierock']),
  B('US', '킬러스', 2004, 2025, ['indierock', 'indiepop']),
  B('US', '뱀파이어 위크엔드', 2008, 2025, ['indiepop', 'indierock']),
  // ── 영국 ──
  B('UK', '비틀스', 1962, 1966.6, ['indierock', 'indiepop']),
  B('UK', '롤링 스톤스', 1963, 2025, ['indierock']),
  B('UK', '킹크스', 1964, 1984, ['indierock', 'punk']),
  B('UK', '더 후', 1965, 1982, ['indierock', 'punk']),
  B('UK', '핑크 플로이드', 1967, 1994, ['shoegaze', 'indierock']),
  B('UK', '레드 제플린', 1968, 1980, ['metal', 'indierock']),
  B('UK', '블랙 사바스', 1970, 1983, ['metal']),
  B('UK', '섹스 피스톨스', 1976, 1977.12, ['punk']),
  B('UK', '클래시', 1977, 1985, ['punk']),
  B('UK', '조이 디비전', 1978, 1980.3, ['punk', 'shoegaze']),
  B('UK', '더 큐어', 1979, 2025, ['indierock', 'shoegaze', 'indiepop']),
  B('UK', '아이언 메이든', 1980, 2025, ['metal']),
  B('UK', '더 스미스', 1983, 1987.5, ['indierock', 'indiepop']),
  B('UK', '마이 블러디 밸런타인', 1988.5, 1992, ['shoegaze']),
  B('UK', '스톤 로지스', 1989, 1990, ['indierock', 'indiepop']),
  B('UK', '블러', 1991, 2003, ['indierock', 'indiepop']),
  B('UK', '라디오헤드', 1993, 2025, ['indierock', 'shoegaze']),
  B('UK', '오아시스', 1994, 2009, ['indierock', 'indiepop']),
  B('UK', '펄프', 1994, 2002, ['indiepop', 'indierock']),
  B('UK', '뮤즈', 1999, 2025, ['indierock', 'metal']),
  B('UK', '콜드플레이', 2000.5, 2025, ['indiepop', 'indierock', 'folk']),
  B('UK', '프란츠 퍼디난드', 2004, 2025, ['indierock', 'indiepop']),
  B('UK', '아크틱 몽키스', 2006, 2025, ['indierock', 'punk']),
  // ── 독일 ──
  B('DE', '캔', 1969, 1979, ['shoegaze', 'indierock']),
  B('DE', '스콜피언스', 1972, 2025, ['metal', 'indierock']),
  B('DE', '크라프트베르크', 1974, 2025, ['indiepop']),
  B('DE', '억셉트', 1979, 1989, ['metal']),
  B('DE', '디 토텐 호젠', 1982, 2025, ['punk']),
  B('DE', '헬로윈', 1985, 2025, ['metal']),
  B('DE', '디 에르츠테', 1993, 2025, ['punk', 'indierock']),
  B('DE', '람슈타인', 1995, 2025, ['metal']),
  B('DE', '토키오 호텔', 2005, 2012, ['indierock', 'indiepop']),
  // ── 브라질 ──
  B('BR', '오스 무탄치스', 1968, 1978, ['indierock', 'folk', 'shoegaze']),
  B('BR', '세쿠스 이 몰랴두스', 1973, 1974, ['indierock', 'folk']),
  B('BR', '바랑 베르멜류', 1982, 2017, ['indierock']),
  B('BR', '파랄라마스 두 수세수', 1983, 2025, ['indierock', 'indiepop']),
  B('BR', '티탕스', 1984, 2025, ['punk', 'indierock']),
  B('BR', '레지앙 우르바나', 1985, 1996.8, ['indierock', 'punk']),
  B('BR', '세풀투라', 1986, 2025, ['metal']),
  B('BR', '앙그라', 1993, 2025, ['metal']),
  B('BR', '스캉키', 1993, 2019, ['indiepop', 'indierock']),
  B('BR', '마모나스 아사시나스', 1995, 1996.1, ['punk']),
];

/** 그 해 그 나라에서 활동 중이던 밴드 */
export function bandsAt(country: CountryId, year: number, genre?: Genre): Band[] {
  return BANDS.filter((b) => b.c === country && year >= b.from && year <= b.to && (!genre || b.genres.includes(genre)));
}
