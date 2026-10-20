// 라이벌 밴드 — 내 밴드와 비슷한 때 시작한 가상의 밴드 하나가 인생 내내 따라온다.
// 나와 상관없이 저들만의 속도로 크고, 터지고, 해체하고, 재결합한다. 인생 기록에 소식이 흐르고,
// 앞서거니 뒤서거니 할 때마다 갈림길이 생긴다 (events/rival.ts). 엔딩에서 둘을 나란히 놓는다.

import type { GameState, Genre, Rival } from './types';
import { GENRES } from './types';
import type { Rng } from './rng';
import { randomBandName } from './names';
import { createNpc } from './npc';
import { countryOf } from './data/countries';
import { count, josa } from './korean';

/** 〈이름〉 뒤 조사를 이름에 맞춘다 */
export const rivalJ = (name: string, pair: Parameters<typeof josa>[1]) => `〈${name}〉${josa(name, pair).slice(name.length)}`;

/** 라이벌을 만든다 — 내 밴드가 생길 때 한 번 */
export function createRival(s: GameState, rng: Rng): Rival | null {
  if (s.rival || !s.band) return null;
  let name = randomBandName(rng, s.player.country);
  for (let i = 0; i < 8 && name === s.band.name; i++) name = randomBandName(rng, s.player.country);
  const genre: Genre = rng.chance(0.6) ? s.band.genre : rng.pick(GENRES.filter((g) => g !== s.band!.genre));
  const leader = createNpc(s, rng, {
    metAt: `라이벌 밴드 〈${name}〉의 리더`,
    role: 'rival',
    affinity: 0,
    genre,
    birthYear: s.player.birthYear + rng.int(-3, 3),
    skill: rng.int(45, 75),
  });
  // 잠재력: 대부분은 작게, 가끔은 크게 — 나라 시장 크기에 맞춘다 [가정]
  const potential = Math.round(Math.min(3_000_000, Math.exp(rng.normal(Math.log(1200), 1.5)) * countryOf(s.player.country).marketMul));
  return {
    name,
    genre,
    leaderId: leader.id,
    formed: Math.floor(s.time) - rng.int(0, 1),
    fans: rng.int(5, 40),
    peak: 0,
    potential,
    status: 'active',
    albums: 0,
    hits: 0,
    label: 'none',
  };
}

/** 한 시기가 지날 때 라이벌도 산다 — 인생 기록에 남길 소식을 돌려준다 */
export function tickRival(s: GameState, rng: Rng, years: number): string[] {
  const r = s.rival;
  if (!r) return [];
  const out: string[] = [];
  const nm = `〈${r.name}〉`;
  const nmj = (pair: Parameters<typeof josa>[1]) => rivalJ(r.name, pair);
  const y = Math.floor(s.time);
  const ageOfBand = s.time - r.formed;
  if (r.status === 'active') {
    // 결성 후 10년 남짓까지는 잠재력 쪽으로 자라고, 그 뒤로는 조금씩 식는다
    const grow = ageOfBand < 12 ? 0.22 : -0.06;
    const noise = rng.normal(0, 0.12);
    r.fans = Math.max(0, Math.round(r.fans + ((grow > 0 ? (r.potential - r.fans) * grow : r.fans * grow) + r.fans * noise) * years));
    if (r.hits < 3 && rng.chance(0.03 * years)) {
      r.hits++;
      r.potential = Math.round(r.potential * 3.5);
      r.fans = Math.round(r.fans * 2.5 + 200);
      out.push(
        [
          `${nm}의 노래가 터졌다. 어딜 가나 그 후렴이 들린다.`,
          `${nmj('이/가')} 또 한 곡을 띄웠다. 차트에서 저들 이름을 피할 수가 없다.`,
          `${nm}의 세 번째 히트곡. 이제 저들은 ‘그 밴드’가 됐다.`,
        ][r.hits - 1],
      );
    }
    if (ageOfBand >= 1.5 && rng.chance(0.4 * years / 2.5)) {
      r.albums++;
      out.push(r.albums === 1 ? `${nmj('이/가')} 첫 음반을 냈다.` : `${nmj('이/가')} ${r.albums}번째 음반을 냈다.`);
    }
    if (r.label === 'none' && r.fans >= 3000) {
      r.label = 'indie';
      out.push(`${nmj('이/가')} 인디 레이블과 계약했다.`);
    } else if (r.label !== 'major' && r.fans >= 40_000) {
      r.label = 'major';
      out.push(`${nmj('이/가')} 대형 기획사와 계약했다.`);
    }
    // 해체: 초반엔 드물게, 오래될수록 조금 더 [가정]
    if (rng.chance((ageOfBand < 5 ? 0.025 : 0.05) * years)) {
      r.status = 'split';
      r.splitYear = y;
      out.push(`${nmj('이/가')} 해체했다. 팬 ${count(r.fans)}명을 남기고.`);
      s.queue.push({ id: 'rival_split', bind: {} });
    }
  } else if (r.splitYear !== undefined && y - r.splitYear >= 8 && rng.chance(0.08 * years)) {
    r.status = 'active';
    r.fans = Math.round(r.peak * 0.35);
    r.formed = y - 12;
    out.push(`${nmj('이/가')} ${y - r.splitYear}년 만에 재결합했다.`);
  } else {
    r.fans = Math.round(r.fans * Math.pow(0.85, years));
  }
  r.peak = Math.max(r.peak, r.fans);
  return out;
}

/** 엔딩에서 둘을 나란히 */
export function rivalVerdict(s: GameState): { line: string; win: boolean } | null {
  const r = s.rival;
  if (!r) return null;
  const me = s.peakFans;
  if (me >= r.peak * 1.2) return { line: `라이벌 〈${r.name}〉의 최고 팬 ${count(r.peak)}명 — 결국 내가 앞섰다.`, win: true };
  if (r.peak >= me * 1.2) return { line: `라이벌 〈${r.name}〉의 최고 팬 ${count(r.peak)}명 — 끝내 따라잡지 못했다.`, win: false };
  return { line: `라이벌 〈${r.name}〉의 최고 팬 ${count(r.peak)}명 — 끝까지 엎치락뒤치락했다.`, win: me >= r.peak };
}
