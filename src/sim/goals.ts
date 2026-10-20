// 시즌 목표 — 스무 살부터 몇 년마다 ‘다음 1~2년 동안 무엇을 이룰지’를 카드로 고른다.
// 매년 같은 생활 계획을 반복하던 중반에 방향을 준다: 목표에 맞는 계획을 추천하고, 기한 안에 이루면 보상, 놓치면 아쉬움.

import type { GameState, Goal, ResultLine } from './types';
import { age, livingCost } from './state';
import { priceIndex } from './data/world';
import { countryOf } from './data/countries';
import { goalMissWhy } from './why';
import { unreleased } from './songs';

export type { Goal };

interface GoalDef {
  id: string;
  icon: string;
  tag: string;
  /** 지금 처지에서 고를 만한가 */
  fits: (s: GameState) => boolean;
  title: (target: number, s: GameState) => string;
  value: (s: GameState) => number;
  target: (s: GameState) => number;
  years: number;
  /** 이 목표에 맞는 생활 계획 (알아서 살기가 이걸 먼저 넣는다) */
  plan: string[];
  /** 이루면 */
  reward: string;
  win: (s: GameState) => ResultLine[];
  /** 진행을 보여 줄 단위 */
  unit: string;
}

const inst = (s: GameState) => s.player.mainInst ?? 'guitar';
const living = (s: GameState) => livingCost(s, priceIndex(s.time) * countryOf(s.player.country).costMul);
const r = (text: string, tone: ResultLine['tone'] = 'good'): ResultLine => ({ text, tone, delta: true });

export const GOALS: GoalDef[] = [
  {
    id: 'form', icon: '🤝', tag: '밴드', unit: '팀', years: 1.5,
    fits: (s) => !s.band && age(s) < 45,
    title: () => '내 밴드를 만든다',
    value: (s) => (s.band ? 1 : 0),
    target: () => 1,
    plan: ['form_band', 'network', 'busking'],
    reward: '영감 +1 · 행복 +8',
    win: (s) => { s.player.inspiration = Math.min(3, s.player.inspiration + 1); s.player.stats.happiness = Math.min(100, s.player.stats.happiness + 8); return [r('영감 +1'), r('행복 +8')]; },
  },
  {
    id: 'first_fans', icon: '🙋', tag: '팬', unit: '명', years: 2,
    fits: (s) => s.player.fans < 60 && age(s) < 50,
    title: (t) => `팬 ${t.toLocaleString()}명을 만든다`,
    value: (s) => s.player.fans,
    target: (s) => Math.max(30, Math.round((s.player.fans + 30) / 10) * 10),
    plan: ['busking', 'gig', 'promo'],
    reward: '평판 +6 · 행복 +6',
    win: (s) => { s.player.rep = Math.min(100, s.player.rep + 6); s.player.stats.happiness = Math.min(100, s.player.stats.happiness + 6); return [r('평판 +6'), r('행복 +6')]; },
  },
  {
    id: 'fans_up', icon: '📣', tag: '팬', unit: '명', years: 2,
    fits: (s) => s.player.fans >= 60,
    title: (t) => `팬 ${t.toLocaleString()}명을 넘긴다`,
    value: (s) => s.player.fans,
    target: (s) => Math.round((s.player.fans * 1.15 + 30) / 10) * 10,
    plan: ['gig', 'promo', 'network'],
    reward: '팬 +10% · 평판 +5',
    win: (s) => { const d = Math.round(s.player.fans * 0.1); s.player.fans += d; s.player.rep = Math.min(100, s.player.rep + 5); return [r(`팬 +${d.toLocaleString()}`), r('평판 +5')]; },
  },
  {
    id: 'release', icon: '💿', tag: '발매', unit: '장', years: 3,
    fits: (s) => s.songs.length >= 2 && (unreleased(s).length >= 2 || s.songs.length >= 4),
    title: () => '음반을 하나 낸다',
    value: (s) => s.albums.length,
    target: (s) => s.albums.length + 1,
    plan: ['compose', 'rehearse', 'gig'],
    reward: '팬 +15% · 영감 +1',
    win: (s) => { const d = Math.round(s.player.fans * 0.15 + 40); s.player.fans += d; s.player.inspiration = Math.min(3, s.player.inspiration + 1); return [r(`팬 +${d.toLocaleString()}`), r('영감 +1')]; },
  },
  {
    id: 'songs', icon: '✍️', tag: '작곡', unit: '곡', years: 2,
    fits: (s) => age(s) < 70,
    title: (t, s) => `새 곡 ${t - s.songs.length}곡을 쓴다`,
    value: (s) => s.songs.length,
    target: (s) => s.songs.length + 3,
    plan: ['compose', 'practice'],
    reward: '작곡 +4 · 영감 +1',
    win: (s) => { s.player.skills.compose = Math.min(100, s.player.skills.compose + 4); s.player.inspiration = Math.min(3, s.player.inspiration + 1); return [r('작곡 +4'), r('영감 +1')]; },
  },
  {
    id: 'skill', icon: '🎯', tag: '실력', unit: '', years: 2,
    fits: (s) => s.player.skills[inst(s)] < 85 && age(s) < 60,
    title: (t) => `주 악기 실력 ${t}까지`,
    value: (s) => Math.floor(s.player.skills[(s.goal?.id === 'skill' && s.goal.inst) || inst(s)]),
    target: (s) => Math.min(95, Math.floor(s.player.skills[inst(s)]) + 4),
    plan: ['practice', 'lesson', 'busking'],
    reward: '무대 +4 · 자신감(스트레스 −8)',
    win: (s) => { s.player.skills.stage = Math.min(100, s.player.skills.stage + 4); s.player.stats.stress = Math.max(0, s.player.stats.stress - 8); return [r('무대 +4'), r('스트레스 -8')]; },
  },
  {
    id: 'chem', icon: '🫂', tag: '밴드', unit: '', years: 2,
    fits: (s) => !!s.band && s.band.chemistry < 78,
    title: (t) => `밴드 케미 ${t}까지`,
    value: (s) => Math.floor(s.band?.chemistry ?? 0),
    target: (s) => Math.min(92, Math.floor(s.band!.chemistry) + 5),
    plan: ['rehearse', 'hangout', 'gig'],
    reward: '케미 +5 · 행복 +6',
    win: (s) => { if (s.band) s.band.chemistry = Math.min(100, s.band.chemistry + 5); s.player.stats.happiness = Math.min(100, s.player.stats.happiness + 6); return [r('케미 +5'), r('행복 +6')]; },
  },
  {
    id: 'gigs', icon: '🎸', tag: '공연', unit: '회', years: 2,
    fits: (s) => !!s.band && s.band.memberIds.length >= 1,
    title: (t, s) => `공연 ${t - (s.band?.gigs ?? 0)}번 더 서기`,
    value: (s) => s.band?.gigs ?? 0,
    target: (s) => (s.band?.gigs ?? 0) + 3,
    plan: ['gig', 'rehearse', 'busking'],
    reward: '무대 +4 · 평판 +4',
    win: (s) => { s.player.skills.stage = Math.min(100, s.player.skills.stage + 4); s.player.rep = Math.min(100, s.player.rep + 4); return [r('무대 +4'), r('평판 +4')]; },
  },
  {
    id: 'debt', icon: '🧾', tag: '돈', unit: '원', years: 2,
    fits: (s) => s.player.money < 0,
    title: () => '마이너스 통장에서 벗어난다',
    value: (s) => Math.round(s.player.money),
    target: () => 0,
    plan: ['parttime', 'teach', 'rest'],
    reward: '스트레스 −15 · 신용 +6',
    win: (s) => { s.player.stats.stress = Math.max(0, s.player.stats.stress - 15); s.player.credit = Math.min(100, s.player.credit + 6); return [r('스트레스 -15'), r('신용 +6')]; },
  },
  {
    id: 'savings', icon: '🐷', tag: '돈', unit: '원', years: 2,
    fits: (s) => s.player.money >= 0 && age(s) >= 22 && age(s) < 60,
    title: () => '1년 치 생활비를 모은다',
    value: (s) => Math.round(s.player.money),
    target: (s) => Math.round((Math.max(0, s.player.money) + living(s) * 2) / 10000) * 10000,
    plan: ['parttime', 'teach', 'compose'],
    reward: '행복 +6 · 스트레스 −6',
    win: (s) => { s.player.stats.happiness = Math.min(100, s.player.stats.happiness + 6); s.player.stats.stress = Math.max(0, s.player.stats.stress - 6); return [r('행복 +6'), r('스트레스 -6')]; },
  },
  {
    id: 'health', icon: '🌿', tag: '몸', unit: '', years: 2,
    fits: (s) => s.player.stats.health < 60,
    title: (t) => `건강 ${t}까지 되찾는다`,
    value: (s) => Math.floor(s.player.stats.health),
    target: (s) => Math.min(85, Math.floor(s.player.stats.health) + 5),
    plan: ['rest', 'sports', 'checkup'],
    reward: '건강 +5 · 행복 +5',
    win: (s) => { s.player.stats.health = Math.min(100, s.player.stats.health + 5); s.player.stats.happiness = Math.min(100, s.player.stats.happiness + 5); return [r('건강 +5'), r('행복 +5')]; },
  },
];

export const goalDef = (id: string) => GOALS.find((g) => g.id === id);

/** 지금 고를 만한 목표들 (돈·몸이 급하면 그게 먼저) */
export function goalChoices(s: GameState, pick: <T>(xs: T[]) => T): GoalDef[] {
  const fit = GOALS.filter((g) => g.fits(s));
  const urgent = fit.filter((g) => g.id === 'debt' || g.id === 'health' || g.id === 'form');
  const out: GoalDef[] = [...urgent.slice(0, 1)];
  const rest = fit.filter((g) => !out.includes(g));
  while (out.length < 3 && rest.length) out.push(rest.splice(rest.indexOf(pick(rest)), 1)[0]);
  return out;
}

export function startGoal(s: GameState, def: GoalDef): Goal {
  const target = def.target(s);
  return { id: def.id, title: def.title(target, s), target, base: def.value(s), from: s.time, until: Math.round((s.time + def.years) * 10) / 10, ...(def.id === 'skill' ? { inst: inst(s) } : {}) };
}

/** 0~1 진행도 */
export function goalProgress(s: GameState, g: Goal): number {
  const def = goalDef(g.id);
  if (!def) return 0;
  const span = g.target - g.base;
  if (span <= 0) return def.value(s) >= g.target ? 1 : 0;
  return Math.max(0, Math.min(1, (def.value(s) - g.base) / span));
}

/** 시기가 끝날 때: 이뤘으면 보상, 기한이 지났으면 아쉬움. 결과 문장과 이야기 줄을 돌려준다 */
export function settleGoal(s: GameState, step = 0.5): { done: boolean; ok: boolean; text: string; lines: ResultLine[] } | null {
  const g = s.goal;
  if (!g) return null;
  // 군 복무 중엔 시계가 멈춘다 — 입대 전에 고른 목표가 복무 중에 저절로 실패하지 않게
  if (s.player.military === 'serving') {
    g.until = Math.round((g.until + step) * 10) / 10;
    return null;
  }
  if (s.player.retired) {
    s.goal = undefined;
    s.flags.goalEnd = s.time;
    return null;
  }
  const def = goalDef(g.id);
  if (!def) {
    s.goal = undefined;
    return null;
  }
  if (def.value(s) >= g.target) {
    s.goal = undefined;
    s.flags.goalsDone = Number(s.flags.goalsDone ?? 0) + 1;
    s.flags.goalEnd = s.time;
    return { done: true, ok: true, text: `시즌 목표 달성 — ${g.title}`, lines: def.win(s) };
  }
  if (s.time >= g.until) {
    s.goal = undefined;
    s.flags.goalsMissed = Number(s.flags.goalsMissed ?? 0) + 1;
    s.flags.goalEnd = s.time;
    s.player.stats.stress = Math.min(100, s.player.stats.stress + 5);
    return { done: true, ok: false, text: `시즌 목표를 놓쳤다 — ${g.title}. ${goalMissWhy(g.base, def.value(s), g.target, g.hits ?? 0, g.periods ?? 0)}`, lines: [r('스트레스 +5', 'bad')] };
  }
  return null;
}
