// 자동 플레이 정책. 밸런스 검사와 회귀 테스트에서 공용으로 쓴다.

import type { ActionPick, GameState } from '../src/sim/types';
import { newGame, runPeriodAuto, setPlan } from '../src/sim/engine';
import { Ctx } from '../src/sim/ctx';
import { Rng } from '../src/sim/rng';
import { availableActions, venuesFor } from '../src/sim/actions';
import { actionSlots } from '../src/sim/state';
import { availableThemes, unreleased } from '../src/sim/songs';

export type Policy = 'random' | 'musician' | 'safe' | 'auto';

function pickParam(s: GameState, id: string, kind: string | undefined, rng: Rng): string | undefined {
  const c = new Ctx(s, new Rng(1));
  switch (kind) {
    case 'inst':
      return s.player.mainInst ?? rng.pick(['guitar', 'vocal', 'drums', 'bass', 'keys']);
    case 'genre':
      return rng.pick(['indierock', 'punk', 'shoegaze', 'folk', 'metal', 'indiepop']);
    case 'compose': {
      const t = rng.pick(availableThemes(s));
      return `${t.key}:${rng.pick(t.moods)}`;
    }
    case 'venue': {
      const vs = venuesFor(c).filter((v) => !v.locked);
      return vs[vs.length - 1]?.id ?? 'openmic';
    }
    case 'release': {
      const songs = [...unreleased(s)].sort((a, b) => b.quality - a.quality).slice(0, 7);
      return `${songs[0].title}|${songs.map((x) => x.id).join(',')}`;
    }
    case 'friend': {
      const ns = Object.values(s.npcs).filter((n) => n.alive && n.role !== 'parent' && n.affinity > 10);
      return ns.length ? rng.pick(ns).id : undefined;
    }
  }
  void id;
  return undefined;
}

const MUSIC_PRIORITY = ['release', 'gig', 'compose', 'rehearse', 'form_band', 'recruit', 'practice', 'lesson', 'busking', 'cover', 'parttime', 'rest'];

export function decide(s: GameState, policy: Policy, rng: Rng): ActionPick[] {
  const c = new Ctx(s, new Rng(1));
  const list = availableActions(c).filter((x) => !x.locked);
  const slots = actionSlots(s);
  const picks: ActionPick[] = [];
  const add = (id: string) => {
    const a = list.find((x) => x.def.id === id);
    if (!a || picks.some((p) => p.id === id) || picks.length >= slots) return;
    if (id === 'release' && unreleased(s).length < (s.player.money > 5_000_000 ? 3 : 1)) return;
    picks.push({ id, param: pickParam(s, id, a.def.param, rng) });
  };
  const p = s.player;
  if (p.stats.energy < 30 || p.stats.stress > 75) add('rest');
  if (p.money < 0 && policy !== 'random') add('parttime');
  if (policy === 'random') {
    for (const a of rng.shuffle(list)) add(a.def.id);
  } else if (policy === 'musician') {
    for (const id of MUSIC_PRIORITY) if (rng.chance(0.75)) add(id);
    for (const a of list) add(a.def.id);
  } else {
    for (const id of ['study', 'parttime', 'sports', 'hangout', 'practice', 'rest']) add(id);
  }
  return picks;
}

export function playLife(seed: number, policy: Policy, opts: { gender?: 'm' | 'f'; birthYear?: number } = {}) {
  const rng = new Rng(seed ^ 0x9e3779b9);
  let s = newGame({ name: '김하늘', gender: opts.gender ?? (seed % 2 ? 'm' : 'f'), birthYear: opts.birthYear ?? 1990 + (seed % 25), seed });
  let guard = 0;
  const seenEvents = new Set<string>();
  const pickChoice = (st: GameState) => {
    seenEvents.add(st.active!.id);
    const ok = st.active!.choices.map((ch, i) => (ch.disabled ? -1 : i)).filter((i) => i >= 0);
    return policy === 'safe' ? ok[ok.length - 1] : rng.pick(ok);
  };
  while (s.phase !== 'ending' && guard++ < 400) {
    if (s.phase === 'plan' && policy !== 'auto') s = setPlan(s, decide(s, policy, rng), false);
    s = runPeriodAuto(s, pickChoice);
  }
  if (s.phase !== 'ending') throw new Error('life did not end');
  return { s, guard, seenEvents };
}
