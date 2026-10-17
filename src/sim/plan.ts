// 생활 계획: 플레이어가 정해 두면 시간이 흐르는 동안 계속 적용된다.
// 세부 선택(악기·공연장·작곡 주제)은 상황에 맞게 자동으로 채운다.

import type { ActionPick, GameState, Mood } from './types';
import { GENRES } from './types';
import { Ctx } from './ctx';
import { Rng } from './rng';
import { ACTIONS, availableActions, venuesFor } from './actions';
import { actionSlots, age, favoriteGenre } from './state';
import { availableThemes } from './songs';

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
const NARR: Record<string, string[]> = {
  play: ['친구들과 해가 질 때까지 놀았다.', '놀이터와 떡볶이집을 오가며 계절을 보냈다.'],
  lesson: ['음악 학원을 꾸준히 다녔다.', '학원 연습실에서 같은 마디를 백 번 반복했다.'],
  listen: ['라디오와 플레이리스트에 귀를 기울였다.', '형 누나들의 음악을 몰래 훔쳐 들었다.'],
  study: ['책상 앞에 앉아 시간을 보냈다.', '문제집 한 권을 끝냈다.'],
  sports: ['운동으로 땀을 흘렸다.', '아침마다 동네를 달렸다.'],
  practice: ['손끝에 굳은살이 박이도록 연습했다.', '메트로놈과 씨름했다.', '같은 프레이즈를 될 때까지 반복했다.'],
  compose: ['밤마다 노트에 가사를 적었다.', '녹음 앱에 데모를 쌓았다.'],
  rehearse: ['합주실에서 멤버들과 소리를 맞췄다.', '주 2회 합주를 빠지지 않았다.'],
  gig: ['무대에 섰다.', '공연을 했다.'],
  busking: ['거리에서 노래했다.', '공원 앞에서 버스킹을 했다.'],
  cover: ['커버 영상을 찍어 올렸다.'],
  promo: ['SNS에 공연 소식을 열심히 알렸다.'],
  network: ['공연 뒤풀이에 빠지지 않았다.'],
  hangout: ['오랜 친구를 만났다.'],
  parttime: ['아르바이트로 생활비를 벌었다.', '알바와 음악 사이를 오갔다.'],
  teach: ['레슨으로 생활비를 벌었다.'],
  rest: ['아무것도 하지 않고 쉬었다.', '푹 자고, 천천히 먹고, 멍하니 지냈다.'],
  form_band: ['밴드를 만들기로 했다.'],
  recruit: ['멤버 모집 공고를 올렸다.'],
  checkup: ['건강검진을 받았다.'],
  duty: ['하루하루 복무했다.'],
  write_letter: ['바깥으로 편지를 썼다.'],
};

export function narrate(id: string, rng: Rng): string {
  const pool = NARR[id];
  return pool ? rng.pick(pool) : '';
}
