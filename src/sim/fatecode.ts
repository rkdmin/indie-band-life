// 운명 코드 — 같은 나라·해·성별·운명(시드)으로 친구도 똑같이 태어나 볼 수 있게.
// 태어나는 순간(집안·재능·외모·가족)은 같고, 그 뒤는 각자의 선택으로 갈라진다.
// 형식: BR-1967M-3KQ9Z1 (나라-출생 연도·성별-시드)

import type { Gender } from './types';
import type { CountryId } from './data/countries';
import { COUNTRIES, COUNTRY_IDS, foreignName } from './data/countries';
import { Rng } from './rng';
import { randomName } from './names';

export interface Fate {
  country: CountryId;
  birthYear: number;
  gender: Gender;
  seed: number;
}

export function encodeFate(f: Fate): string {
  return `${f.country}-${f.birthYear}${f.gender === 'm' ? 'M' : 'F'}-${(f.seed >>> 0).toString(36).toUpperCase()}`;
}

/** 잘못된 코드면 null — 공백·소문자·대시 빠짐은 너그럽게 받는다 */
export function decodeFate(raw: string): Fate | null {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/[–—_]/g, '-');
  const m = code.match(/^([A-Z]{2})-?(\d{4})([MF])-?([0-9A-Z]{1,7})$/);
  if (!m) return null;
  const country = m[1] as CountryId;
  if (!COUNTRY_IDS.includes(country)) return null;
  const birthYear = Number(m[2]);
  if (birthYear < 1950 || birthYear > 2026) return null;
  const seed = parseInt(m[4], 36);
  if (!Number.isFinite(seed) || seed <= 0 || seed > 0xffffffff) return null;
  return { country, birthYear, gender: m[3] === 'M' ? 'm' : 'f', seed };
}

/** 운명에서 나오는 이름 — 같은 코드면 같은 이름 */
export function fateName(f: Fate): string {
  const r = new Rng((f.seed ^ 0x5bd1e995) >>> 0);
  return f.country === 'KR' ? randomName(r, f.gender, f.birthYear) : foreignName(r, COUNTRIES[f.country], f.gender, f.birthYear);
}
