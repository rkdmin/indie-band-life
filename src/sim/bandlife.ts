// 밴드 살림. 시기마다 합주실 월세를 나눠 내고, 멤버마다 만족도가 오르내린다.
// 만족도가 바닥나면 이유(장르·돈·나이·스카우트)에 맞는 탈퇴 위기가 찾아온다.
// 합주실 월 대여료 등 수치는 공개 통계가 없어 [가정]이다.

import type { GameState, Npc } from './types';
import type { Rng } from './rng';
import { clamp } from './rng';
import { npcAge } from './npc';
import { book } from './ctx';
import { priceIndex } from './data/world';
import { won } from './korean';

export type LeaveReason = 'genre' | 'money' | 'life' | 'scout' | 'chem';

export const REASON_LABEL: Record<LeaveReason, string> = {
  genre: '하고 싶은 음악이 다르다',
  money: '먹고살기가 힘들다',
  life: '취업·결혼 같은 현실',
  scout: '더 큰 팀에서 부른다',
  chem: '사람 사이가 틀어졌다',
};

/** 합주실 정기 대여 — 월 35만원(2026년 기준) [가정], 멤버 수로 나눈다 */
export const ROOM_MONTHLY = 350_000;

export interface Pressure {
  reason: LeaveReason;
  parts: Record<LeaveReason, number>;
}

/** 멤버 한 명의 이번 시기 만족도 변화와 가장 큰 불만 */
export function memberPressure(s: GameState, m: Npc, bandAvgSkill: number, fansUp: boolean): Pressure {
  const band = s.band!;
  const age = npcAge(s, m);
  const broke = s.player.money < 0;
  const noIncome = band.label === 'none' && s.player.fans < 3000;
  const parts: Record<LeaveReason, number> = {
    genre: m.genre === band.genre ? 2 : -4,
    money: (broke ? -3 : 0) + (noIncome ? -1.5 : 1) + (band.label !== 'none' ? 2 : 0),
    life: age >= 30 && noIncome ? -3 : age >= 27 && noIncome ? -1.5 : 0,
    scout: m.skill > bandAvgSkill + 15 ? -2 : 0,
    chem: (band.chemistry - 50) / 12 + (m.affinity - 30) / 30,
  };
  if (fansUp) parts.chem += 1.5;
  const worst = (Object.entries(parts) as [LeaveReason, number][]).sort((a, b) => a[1] - b[1])[0][0];
  return { reason: worst, parts };
}

/** 시기 마감 때 호출. 결과 문장들을 돌려준다 (기록에 남는다) */
export function bandUpkeep(s: GameState, rng: Rng, halfYears: number, fansBefore: number): string[] {
  const band = s.band;
  if (!band || s.player.military === 'serving') return [];
  const out: string[] = [];
  const members = band.memberIds.map((id) => s.npcs[id]).filter(Boolean);
  // 합주실 월세 나눠 내기 (레이블이 있으면 레이블 부담)
  if (band.label === 'none' && s.time - s.player.birthYear >= 17) {
    const cost = Math.round((ROOM_MONTHLY * priceIndex(s.time) * 6 * halfYears) / (members.length + 1));
    s.player.money -= cost;
    book(s, -cost, '합주실 정기 대여');
    out.push(`합주실 월세 내 몫 -${won(cost)}`);
  }
  const avg = members.length ? (members.reduce((a, m) => a + m.skill, 0) + (s.player.mainInst ? s.player.skills[s.player.mainInst] : 30)) / (members.length + 1) : 30;
  const fansUp = s.player.fans > fansBefore * 1.03;
  for (const m of members) {
    if (m.sat === undefined) m.sat = 60;
    const pr = memberPressure(s, m, avg, fansUp);
    const delta = Object.values(pr.parts).reduce((a, b) => a + b, 0) * halfYears + rng.normal(0, 3);
    m.sat = clamp(m.sat + delta);
    const already = s.queue.some((q) => q.id === 'member_leave' && q.bind.m === m.id);
    if (m.sat < 22 && !already && !s.flags[`leaveAsked:${m.id}:${Math.floor(s.time)}`]) {
      s.flags[`leaveAsked:${m.id}:${Math.floor(s.time)}`] = true;
      s.queue.push({ id: 'member_leave', bind: { m: m.id }, vars: { reason: pr.reason } });
    }
  }
  return out;
}
