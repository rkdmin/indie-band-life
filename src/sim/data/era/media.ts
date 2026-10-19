// 매체와 기술: 그 나라에서 ‘언제부터 흔했나’. 사건 조건(needs), 발매 형태, 판매/재생 표기에 쓴다.
// 연도는 보급이 시작된 해의 근사값이다 [근사]. 출처: 각국 방송사·음반 산업 연표, 공개 백과사전.

import type { CountryId } from '../countries';

export type MediaId =
  | 'radio'
  | 'tv'
  | 'color_tv'
  | 'lp'
  | 'cassette'
  | 'walkman'
  | 'cd'
  | 'karaoke'
  | 'pc_comm'
  | 'internet'
  | 'mp3'
  | 'minihompy'
  | 'youtube'
  | 'smartphone'
  | 'streaming'
  | 'shortform'
  | 'music_tv';

type Years = Record<CountryId, number>;
const all = (y: number): Years => ({ KR: y, JP: y, US: y, UK: y, DE: y, BR: y });

export interface MediaInfo {
  id: MediaId;
  label: string;
  from: Years;
  /** 이 해 이후로는 사실상 사라졌다 */
  until?: Partial<Years>;
  note: string;
}

export const MEDIA: Record<MediaId, MediaInfo> = {
  radio: { id: 'radio', label: '라디오', from: { ...all(1935), KR: 1955 }, note: '한국은 1960년대 트랜지스터라디오로 가정 보급' },
  tv: { id: 'tv', label: '텔레비전', from: { KR: 1962, JP: 1953, US: 1948, UK: 1946, DE: 1952, BR: 1950 }, note: '한국 KBS TV 1961년 12월 개국' },
  color_tv: { id: 'color_tv', label: '컬러 TV', from: { KR: 1981, JP: 1960, US: 1965, UK: 1967, DE: 1967, BR: 1972 }, note: '한국 컬러 방송 1980년 12월' },
  lp: { id: 'lp', label: 'LP', from: all(1955), note: '' },
  cassette: { id: 'cassette', label: '카세트테이프', from: { ...all(1968), KR: 1972 }, note: '필립스 컴팩트 카세트 1963년 공개' },
  walkman: { id: 'walkman', label: '휴대용 카세트 플레이어', from: { ...all(1980), JP: 1979, KR: 1982 }, note: '1979년 일본 출시' },
  cd: { id: 'cd', label: 'CD', from: { KR: 1986, JP: 1982, US: 1983, UK: 1983, DE: 1983, BR: 1987 }, note: '1982년 일본에서 첫 판매' },
  karaoke: { id: 'karaoke', label: '노래방', from: { ...all(1990), JP: 1985, KR: 1991 }, note: '한국 노래방은 1991년 부산에서 시작' },
  pc_comm: { id: 'pc_comm', label: 'PC통신', from: { ...all(1985), KR: 1990 }, until: { KR: 2000 }, note: '한국 PC통신 동호회 전성기 1990년대' },
  internet: { id: 'internet', label: '인터넷', from: { ...all(1995), KR: 1996 }, note: '' },
  mp3: { id: 'mp3', label: 'MP3', from: all(1999), note: '파일 공유 서비스 1999년 등장' },
  minihompy: { id: 'minihompy', label: '미니홈피', from: { ...all(9999), KR: 2002 }, until: { KR: 2010 }, note: '한국에서만' },
  youtube: { id: 'youtube', label: '동영상 사이트', from: all(2006), note: '2005년 서비스 시작' },
  smartphone: { id: 'smartphone', label: '스마트폰', from: { ...all(2008), US: 2007, KR: 2010 }, note: '한국 2009년 11월 아이폰 출시' },
  streaming: { id: 'streaming', label: '음원 스트리밍', from: { KR: 2004, JP: 2016, US: 2011, UK: 2009, DE: 2012, BR: 2014 }, note: '한국 음원 서비스 2004년 시작, 일본은 2015~16년에야 본격화' },
  shortform: { id: 'shortform', label: '숏폼', from: all(2018), note: '' },
  music_tv: { id: 'music_tv', label: '음악 순위 TV 프로그램', from: { ...all(1981), KR: 1981, UK: 1964, JP: 1968 }, note: '한국 TV 가요 순위 프로그램 1981년, 미국 MTV 1981년' },
};

export function hasMedia(id: MediaId, year: number, country: CountryId = 'KR'): boolean {
  const m = MEDIA[id];
  const u = m.until?.[country];
  return year >= m.from[country] && (u === undefined || year < u);
}

/** 그 해에 음반을 낸다면 어떤 형태였나 */
export function releaseFormat(year: number, country: CountryId = 'KR'): string {
  if (hasMedia('streaming', year, country)) return year < 2012 ? 'CD·음원' : '음원';
  if (hasMedia('cd', year, country)) return hasMedia('cassette', year, country) && year < 2000 ? 'CD·카세트' : 'CD';
  if (hasMedia('cassette', year, country)) return 'LP·카세트';
  return 'LP';
}

/** 스트리밍 이전 곡은 ‘재생 수’가 아니라 ‘판매량’으로 보여 준다 (약 200회 재생 ≈ 1장으로 환산) [가정] */
export function playsText(streams: number, releasedYear: number | null, country: CountryId = 'KR', fmt: (n: number) => string = (n) => n.toLocaleString()): string {
  const y = releasedYear ?? 2026;
  if (hasMedia('streaming', y, country)) return `${fmt(streams)}회 재생`;
  return `${fmt(Math.max(1, Math.round(streams / 200)))}장 판매`;
}
