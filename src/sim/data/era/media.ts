// 매체와 기술: 그 나라에서 ‘언제부터 흔했나’. 사건 조건(needs), 발매 형태, 판매/재생 표기에 쓴다.
// 연도는 보급이 시작된 해의 근사값이다 [근사]. 출처: 각국 방송사·음반 산업 연표, 공개 백과사전.

import type { CountryId } from '../countries';
import mediaJson from '../../../data/era/media.json';

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

export interface MediaInfo {
  id: MediaId;
  label: string;
  from: Years;
  /** 이 해 이후로는 사실상 사라졌다 */
  until?: Partial<Years>;
  note: string;
}

export const MEDIA: Record<MediaId, MediaInfo> = mediaJson.data as never;

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
