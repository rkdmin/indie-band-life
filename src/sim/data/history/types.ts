// 음악사 데이터의 모양. 나라별 파일(kr.ts, us.ts …)이 이 모양으로 사실을 적는다.
//
// 원칙
//  - 실존 음악가는 사실(발매·결성·공연·사건)로만 쓴다. 말이나 행동을 지어내지 않는다.
//  - 연도는 공개 자료로 확인한 것만. 확인 경로는 src 에 적는다.

import type { Genre } from '../../types';
import type { CountryId } from '../countries';

export interface HistoryItem {
  y: number;
  m?: number;
  c: CountryId | 'GLOBAL';
  /** world: 음악 밖의 세상 소식 */
  kind: 'release' | 'scene' | 'festival' | 'industry' | 'policy' | 'world';
  genre?: Genre;
  text: string;
  src: string;
  /** 발매·결성 사건의 주인공 (사실로만 언급) */
  who?: string;
  /** 페스티벌 이름 */
  name?: string;
  /** 실제로 악천후로 중단된 회차 */
  storm?: boolean;
}

export interface Wave {
  id: string;
  c: CountryId;
  from: number;
  to: number;
  genres: Genre[];
  name: string;
  /** 언론이 비교할 실제 선배 — 사실로만 언급 */
  ref: string;
  text: string;
}

export const PUB = '공개 음악사 자료(위키백과 등)';
