// 생활 계획: 플레이어가 정해 두면 시간이 흐르는 동안 계속 적용된다.
// 세부 선택(악기·공연장·작곡 주제)은 상황에 맞게 자동으로 채운다.

import type { ActionPick, GameState, Mood } from './types';
import { GENRES } from './types';
import { Ctx } from './ctx';
import { Rng } from './rng';
import { ACTIONS, availableActions, venuesFor } from './actions';
import { actionSlots, age, favoriteGenre } from './state';
import { availableThemes } from './songs';
import narrationJson from '../data/text/narration.json';

/** 계획에 넣을 수 없는 행동 (발매는 ‘곡이 쌓였을 때’ 갈림길로 묻는다) */
export const PLAN_EXCLUDED = new Set(['release']);

export function planOptions(s: GameState) {
  const c = new Ctx(s, new Rng(1));
  return availableActions(c).filter((x) => !PLAN_EXCLUDED.has(x.def.id));
}

export function recommendedPlan(s: GameState): ActionPick[] {
  const a = age(s);
  const p = s.player;
  const ok = new Set(planOptions(s).filter((x) => !x.locked).map((x) => x.def.id));
  const pick = (...ids: string[]) => ids.filter((id) => ok.has(id));
  let ids: string[] = [];
  if (a < 7) ids = [];
  else if (p.military === 'serving') ids = pick(s.flags.militaryBand ? 'practice' : 'duty', 'write_letter');
  else if (a < 13) ids = pick(p.income !== 'low' ? 'lesson' : 'listen', 'play', 'listen');
  else if (a < 19) ids = s.band ? pick('rehearse', 'practice') : pick('practice', a >= 17 ? 'study' : 'hangout', 'listen');
  else if (a >= 65) ids = s.flags.lifelong ? pick('gig', 'rest') : pick('rest', 'hangout');
  else {
    const broke = p.money < 0 && p.job !== 'office' && p.job !== 'teacher' && p.job !== 'producer';
    if (p.stats.energy < 30 || p.stats.stress > 80) ids.push('rest');
    if (broke) ids.push(...pick(p.skills[p.mainInst ?? 'guitar'] >= 60 ? 'teach' : 'parttime', 'parttime'));
    if (!s.band) ids.push(...pick('form_band', 'practice', 'busking'));
    else {
      if (s.band.memberIds.length < 2) ids.push(...pick('recruit'));
      ids.push(...pick(s.turn % 3 === 0 ? 'compose' : s.turn % 3 === 1 ? 'gig' : 'rehearse', 'rehearse', 'compose', 'gig'));
    }
    ids = ids.filter((id) => ok.has(id));
  }
  return [...new Set(ids)].slice(0, actionSlots(s)).map((id) => ({ id }));
}

/** 계획의 빈 세부 선택을 채우고, 지금 할 수 없는 건 빼고, 비면 추천으로 채운다 */
export function resolvePlan(s: GameState, rng: Rng): ActionPick[] {
  const slots = actionSlots(s);
  if (slots === 0) return [];
  const c = new Ctx(s, new Rng(1));
  const valid = new Map(availableActions(c).filter((x) => !x.locked).map((x) => [x.def.id, x.def]));
  let base = s.autoPlan ? recommendedPlan(s) : s.plan.filter((p) => valid.has(p.id) && !PLAN_EXCLUDED.has(p.id));
  if (!base.length) base = recommendedPlan(s);
  const out: ActionPick[] = [];
  for (const p of base.slice(0, slots)) {
    const def = valid.get(p.id) ?? ACTIONS.find((x) => x.id === p.id);
    if (!def) continue;
    out.push({ id: p.id, param: p.param ?? autoParam(s, c, def.param, rng) });
  }
  return out;
}

function autoParam(s: GameState, c: Ctx, kind: string | undefined, rng: Rng): string | undefined {
  switch (kind) {
    case 'inst':
      return s.player.mainInst ?? rng.pick(['guitar', 'vocal', 'keys', 'drums'] as const);
    case 'genre':
      return rng.chance(0.6) ? favoriteGenre(s) : rng.pick(GENRES);
    case 'compose': {
      const themes = availableThemes(s);
      const lived = themes.filter((t) => s.flags[`theme:${t.key}`]);
      const used = new Set(s.songs.map((x) => x.theme));
      const fresh = lived.filter((t) => !used.has(t.label));
      const t = fresh.length ? rng.pick(fresh) : rng.pick(lived.length ? lived : themes);
      const mood: Mood = rng.pick(t.moods);
      return `${t.key}:${mood}`;
    }
    case 'venue': {
      const vs = venuesFor(c).filter((v) => !v.locked);
      // 감당 가능한 가장 큰 무대, 가끔은 한 단계 아래
      const i = vs.length - 1 - (vs.length > 1 && rng.chance(0.3) ? 1 : 0);
      return vs[Math.max(0, i)]?.id ?? 'openmic';
    }
    case 'friend': {
      const ns = Object.values(s.npcs).filter((n) => n.alive && n.role !== 'parent' && n.affinity > 0);
      if (!ns.length) return undefined;
      return [...ns].sort((a, b) => a.lastSeenTurn - b.lastSeenTurn || b.affinity - a.affinity)[0].id;
    }
  }
  return undefined;
}

/** 계획 행동을 이야기 문장으로 */
type NarrLine = string | { t: string; age?: [number, number]; from?: number; to?: number; band?: boolean };
const NARR = narrationJson.data as Record<string, NarrLine[]>;

/** 행동 한 줄 — 나이·시대·밴드 조건이 맞고, 최근 기록에 없는 줄 중에서. 다 썼으면 비워 둔다(반복보다 침묵이 낫다) */
export function narrate(id: string, rng: Rng, o: { age?: number; year?: number; band?: boolean; recent?: Set<string> } = {}): string {
  const pool = (NARR[id] ?? [])
    .map((l) => (typeof l === 'string' ? { t: l } : l))
    .filter((l) => (!l.age || ((o.age ?? 0) >= l.age[0] && (o.age ?? 0) < l.age[1])) && (!l.from || (o.year ?? 9999) >= l.from) && (!l.to || (o.year ?? 0) <= l.to) && (!l.band || o.band));
  const fresh = pool.filter((l) => !o.recent?.has(l.t));
  return fresh.length ? rng.pick(fresh).t : '';
}

/**
 * 생활 계획 고르기 — 화면의 버튼 하나를 눌렀을 때 선택이 어떻게 바뀌는지.
 * ‘알아서’ 상태에서 처음 고르면 새로 시작하고, 칸이 다 찼으면 몰래 바꾸지 않고 full 을 알린다.
 */
export function togglePlan(st: { auto: boolean; sel: string[] }, id: string, slots: number): { auto: boolean; sel: string[]; full: boolean } {
  if (st.auto) return { auto: false, sel: [id], full: false };
  if (st.sel.includes(id)) return { auto: false, sel: st.sel.filter((x) => x !== id), full: false };
  if (slots === 1) return { auto: false, sel: [id], full: false };
  if (st.sel.length >= slots) return { auto: false, sel: st.sel, full: true };
  return { auto: false, sel: [...st.sel, id], full: false };
}
