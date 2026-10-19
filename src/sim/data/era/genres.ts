// 장르의 시대: 장르 이름이 생기기 전에는 그 장르의 ‘조상’ 이름으로 부른다.
// 1968년에 슈게이즈 밴드는 없다 — 대신 그 소리의 조상인 사이키델릭 사운드를 한다.
//  - named: 장르 이름이 세계적으로 쓰이기 시작한 해 (명칭 기준, 모든 나라 공통)
//  - scene: 그 나라에 그 장르의 ‘씬’(클럽·밴드·관객)이 생긴 해 — 씬 사건과 물결의 조건
//  - before: named 이전의 이름 [이 해부터, 이 이름]. 받침 유무를 원래 이름과 맞춰 조사가 어긋나지 않게 했다.
// 연도는 음악사 서술의 통상적 구분을 따른 근사값이다 [근사].

import type { Genre } from '../../types';
import type { CountryId } from '../countries';

export interface GenreEra {
  id: Genre;
  label: string;
  named: number;
  scene: Record<CountryId, number>;
  before: [number, string][];
  /** 어느 시대에도 맞는 한 줄 소개 */
  pitch: string;
  note: string;
}

export const GENRE_ERAS: Record<Genre, GenreEra> = {
  indierock: {
    id: 'indierock', label: '인디록', named: 1980,
    scene: { UK: 1980, US: 1983, JP: 1985, DE: 1985, BR: 1985, KR: 1995 },
    before: [[1960, '록'], [0, '로큰롤']],
    pitch: '라이브 입소문으로 크는 소리. 무대가 곧 명함이다',
    note: '영국 인디 차트 1980년, 미국 칼리지 록 1980년대 초. 한국은 1995~96년 홍대 앞 클럽에서 ‘인디’라는 말이 퍼졌다',
  },
  punk: {
    id: 'punk', label: '펑크', named: 1976,
    scene: { US: 1975, UK: 1976, DE: 1977, JP: 1978, BR: 1979, KR: 1995 },
    before: [[1964, '개러지 사운드'], [0, '로커빌리']],
    pitch: '세 코드와 진심. 작은 무대의 열기로 버틴다',
    note: '뉴욕 CBGB(1974~)와 런던(1976). 한국 조선 펑크는 1995~96년',
  },
  shoegaze: {
    id: 'shoegaze', label: '슈게이즈', named: 1990,
    scene: { UK: 1988, US: 1991, JP: 1992, DE: 1993, BR: 1995, KR: 2000 },
    before: [[1966, '사이키델릭 사운드'], [0, '서프 사운드']],
    pitch: '소리의 벽 너머의 멜로디. 아는 사람만 안다',
    note: '1990년 무렵 영국 음악 언론이 붙인 이름. 그 전엔 사이키델릭·노이즈 록의 계보',
  },
  folk: {
    id: 'folk', label: '포크', named: 1950,
    scene: { US: 1958, UK: 1960, JP: 1966, DE: 1965, BR: 1965, KR: 1968 },
    before: [[0, '민요']],
    pitch: '가사가 무기. 기타 하나면 어디서든 무대다',
    note: '미국 포크 리바이벌 1958년~, 한국 통기타 포크 1968년~',
  },
  metal: {
    id: 'metal', label: '메탈', named: 1970,
    scene: { UK: 1970, US: 1971, DE: 1978, JP: 1980, BR: 1984, KR: 1985 },
    before: [[1965, '하드 록'], [0, '로큰롤']],
    pitch: '좁지만 깊은 세계. 팬들은 평생 간다',
    note: '1970년 영국. 한국은 1980년대 중반 헤비메탈 밴드들이 등장',
  },
  indiepop: {
    id: 'indiepop', label: '인디팝', named: 1986,
    scene: { UK: 1986, US: 1990, JP: 1993, DE: 1995, BR: 1995, KR: 2000 },
    before: [[0, '팝']],
    pitch: '귀에 붙는 멜로디. 대신 금방 잊힌다',
    note: '1986년 영국 음악지 부록 카세트 〈C86〉 무렵 굳어진 이름',
  },
};

/** 이 나라에서 이 장르 이름이 자연스러워지는 해 — 세계적으로 이름이 생기고, 그 나라에 씬이 생긴 뒤 */
export function genreNamedIn(g: Genre, country?: CountryId | string): number {
  const e = GENRE_ERAS[g];
  const sc = country ? e.scene[country as CountryId] : undefined;
  return sc !== undefined ? Math.max(e.named, sc) : e.named;
}

/** 그 해(그 나라)에 이 장르를 부르던 이름. 1986년 한국에 ‘인디록’ 밴드는 없다 — 그냥 ‘록’ 밴드다 */
export function genreLabel(g: Genre, year: number, country?: CountryId | string): string {
  const e = GENRE_ERAS[g];
  if (year >= genreNamedIn(g, country)) return e.label;
  return e.before.find(([from]) => year >= from)?.[1] ?? e.before[e.before.length - 1][1];
}

/** 그 나라에 이 장르의 씬이 있었나 */
export function hasScene(g: Genre, year: number, country: CountryId = 'KR'): boolean {
  return year >= GENRE_ERAS[g].scene[country];
}
