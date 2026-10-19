// 태어나는 순간 — data/fate/birth.json 에서 매 인생마다 새로 굴린다.
// 혈액형·출생 장소·체중·조산·엄마 나이(통계 근사), 태몽(한국), 타고난 특징 여러 개, 그날의 장면.
// 굴린 결과는 운명 카드(fate.draws)에 더해져 출생증명서와 희귀도에 반영되고, 첫 사건 ‘응애’에서 효과가 적용된다.

import { Rng, clamp } from './rng';
import type { GameState } from './types';
import type { FateDraw } from './data/fate';
import birthJson from '../data/fate/birth.json';

const B = birthJson.data;

export type Effects = Partial<Record<'pitch' | 'rhythm' | 'lyric' | 'presence' | 'stamina' | 'vocal' | 'guitar' | 'bass' | 'drums' | 'keys' | 'compose' | 'stage' | 'health' | 'happiness' | 'stress' | 'money', number>>;

export interface BirthInfo {
  month: number;
  blood: string;
  place: 'home' | 'hospital';
  lowWeight: boolean;
  preterm: boolean;
  motherAge: number;
  dream: { id: string; label: string; line: string; effects: Effects } | null;
  gifts: { id: string; label: string; line: string; effects: Effects }[];
  moments: string[];
}

function lerp(t: number[][], y: number): number {
  if (y <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (y <= t[i][0]) return t[i - 1][1] + ((y - t[i - 1][0]) / (t[i][0] - t[i - 1][0])) * (t[i][1] - t[i - 1][1]);
  return t[t.length - 1][1];
}

interface Moment { t: string; place?: string; from?: number; to?: number; c?: string[]; months?: number[]; needOlder?: boolean; needInst?: boolean; income?: string; groups?: string[]; notIf?: string[] }

/** 출생 변수를 굴린다. 운명 카드에 더할 draws 도 함께 돌려준다 */
export function rollBirth(seed: number, s: GameState): { info: BirthInfo; draws: FateDraw[] } {
  const r = new Rng(seed ^ 0xb1e7);
  const p = s.player;
  const ct = p.country ?? 'KR';
  const y = p.birthYear;
  const month = 1 + (s.seed % 12);
  const draws: FateDraw[] = [];

  // 혈액형
  const bw = (B.bloodType.weights as Record<string, Record<string, number>>)[ct] ?? B.bloodType.weights.KR;
  const blood = r.weighted(Object.keys(bw), (k) => bw[k])!;
  draws.push({ id: 'blood', label: `${blood}형`, p: bw[blood], src: B.bloodType.about, kind: '근사' });

  // 출생 장소
  const homeP = lerp((B.homeBirth.table as Record<string, number[][]>)[ct] ?? B.homeBirth.table.KR, y);
  const place: BirthInfo['place'] = r.chance(homeP) ? 'home' : 'hospital';
  if (place === 'home') draws.push({ id: 'home', label: '집에서 태어났다', p: homeP, src: B.homeBirth.about, kind: '근사' });

  // 조산·저체중
  const pretermP = lerp(B.preterm.table, y);
  const preterm = r.chance(pretermP);
  if (preterm) draws.push({ id: 'preterm', label: '예정보다 일찍 태어났다', p: pretermP, src: B.preterm.about, kind: '근사' });
  const lwP = lerp(B.lowBirthWeight.table, y);
  const lowWeight = r.chance(preterm ? Math.min(0.6, lwP * 5) : lwP);
  if (lowWeight) draws.push({ id: 'lowweight', label: '2.5kg이 안 되게 태어났다', p: lwP, src: B.lowBirthWeight.about, kind: '근사' });

  // 엄마 나이
  const mAvg = lerp((B.motherAge.table as Record<string, number[][]>)[ct] ?? B.motherAge.table.KR, y);
  const motherAge = Math.round(clamp(r.normal(mAvg, 4.5), 17, 46));

  // 태몽 (한국)
  let dream: BirthInfo['dream'] = null;
  if (ct === 'KR' && r.chance(B.dreams.rate)) {
    const total = B.dreams.list.reduce((a, d) => a + d.w, 0);
    const d = r.weighted(B.dreams.list, (x) => x.w)!;
    dream = { id: d.id, label: d.label, line: d.line, effects: d.effects as Effects };
    draws.push({ id: 'dream', label: `태몽: ${d.label}`, p: B.dreams.rate * (d.w / total), src: B.dreams.about, kind: '가정' });
  }

  // 타고난 특징 — 하나하나 따로 굴린다 (여러 개 겹칠 수도, 하나도 없을 수도)
  const gifts: BirthInfo['gifts'] = [];
  const cond: Record<string, boolean> = { lowWeight, preterm };
  // 순서를 섞어서 굴린다 — 서로 맞지 않는 특징은 먼저 나온 쪽만 남는다 (모순 방지)
  const order = r.shuffle([...B.gifts.list]) as ((typeof B.gifts.list)[number] & { conflicts?: string[]; notIf?: string[] })[];
  for (const g of order) {
    if (g.notIf?.some((k) => cond[k])) continue;
    if (gifts.some((x) => g.conflicts?.includes(x.id) || (B.gifts.list.find((y) => y.id === x.id) as { conflicts?: string[] } | undefined)?.conflicts?.includes(g.id))) continue;
    if (r.chance(g.p)) {
      gifts.push({ id: g.id, label: g.label, line: g.line, effects: g.effects as Effects });
      draws.push({ id: `gift_${g.id}`, label: g.label, p: g.p, src: (g as { src?: string }).src ?? '게임 가정', kind: (g.kind as FateDraw['kind']) ?? '가정' });
    }
  }

  // 그날의 장면 — 조건이 맞는 것 중 두 개
  const ok = (m: Moment) =>
    (!m.place || m.place === place) &&
    (!m.from || y >= m.from) &&
    (!m.to || y <= m.to) &&
    (!m.c || m.c.includes(ct)) &&
    (!m.months || m.months.includes(month)) &&
    (!m.needOlder || (p.fate?.older ?? 0) > 0) &&
    (!m.needInst || p.instrumentAtHome) &&
    (!m.income || m.income === p.income) &&
    !m.notIf?.some((k) => cond[k]);
  let pool = (B.moments.list as Moment[]).filter(ok);
  const moments: string[] = [];
  // 같은 묶음(진통·시간·아빠·계절·이름·크기…)에서는 한 장면만 — 열여섯 시간 진통과 두 시간 만에 나온 아기가 같이 나오지 않게
  for (let i = 0; i < 2 && pool.length; i++) {
    const m = pool[r.int(0, pool.length - 1)];
    moments.push(m.t);
    pool = pool.filter((x) => x !== m && !(x.groups ?? []).some((gr) => (m.groups ?? []).includes(gr)));
  }

  return { info: { month, blood, place, lowWeight, preterm, motherAge, dream, gifts, moments }, draws };
}

/** 효과를 적용할 수 있게 한 줄로 */
export function effectsOf(info: BirthInfo): Effects[] {
  const out: Effects[] = [];
  if (info.dream) out.push(info.dream.effects);
  for (const g of info.gifts) out.push(g.effects);
  if (info.preterm) out.push({ health: -4 });
  if (info.lowWeight) out.push({ health: -3, stamina: -2 });
  return out;
}
