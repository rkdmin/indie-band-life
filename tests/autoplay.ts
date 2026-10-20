// 자동 플레이 정책. 밸런스 검사와 회귀 테스트에서 공용으로 쓴다.

import type { ActionPick, GameState } from '../src/sim/types';
import { newGame, runPeriodAuto, setPlan } from '../src/sim/engine';
import { Ctx } from '../src/sim/ctx';
import { Rng } from '../src/sim/rng';
import { availableActions, venuesFor } from '../src/sim/actions';
import { actionSlots } from '../src/sim/state';
import { availableThemes, unreleased } from '../src/sim/songs';
import { recommendedPlan } from '../src/sim/plan';

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
      // 감당 가능한 가장 큰 무대, 가끔은 한 단계 아래 (게임의 ‘알아서’와 같은 규칙)
      const vs = venuesFor(c).filter((v) => !v.locked);
      const i = vs.length - 1 - (vs.length > 1 && rng.chance(0.3) ? 1 : 0);
      return vs[Math.max(0, i)]?.id ?? 'openmic';
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
    // 음악에 열심인 사람 = 게임의 ‘알아서’ 계획에서 음악이 아닌 일(공부·놀기·그냥 듣기)을 연습·작곡으로 바꾼 사람.
    // 지칠 땐 쉬고 빈털터리면 알바하는 건 같다(위). 발매는 곡이 쌓이면 게임이 갈림길로 묻는다 (직접 발매 행동은 녹음비로 빚이 쌓였다).
    // (예전 정책은 매번 가장 큰 공연장 공연만 잡고 연습을 거의 안 해서 실력·곡 완성도가 ‘알아서’보다 낮았다 — ‘열심히’가 아니라 ‘무리’였다)
    const swap: Record<string, string[]> = { study: ['practice', 'compose'], hangout: ['practice', 'compose'], play: ['lesson', 'listen'], listen: ['practice', 'compose', 'lesson', 'listen'], sports: ['practice'] };
    for (const r of recommendedPlan(s)) for (const id of swap[r.id] ?? [r.id]) if (picks.length < slots && !picks.some((x) => x.id === id) && list.some((x) => x.def.id === id)) { add(id); break; }
    for (const id of ['practice', 'compose', 'rehearse', 'lesson', 'listen']) add(id);
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
