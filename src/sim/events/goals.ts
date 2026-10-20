// 시즌 목표 고르기 — 몇 년마다 다음 1~2년의 방향을 카드 세 장 중에서 고른다 (sim/goals.ts)

import type { EventDef, Ctx } from '../ctx';
import type { CardInfo } from '../types';
import { goalChoices, goalDef, startGoal } from '../goals';
import { actionById } from '../actions';

const def = (c: Ctx, i: number) => goalDef(String(c.vars[`g${i}`] ?? ''));

export const GOAL_EVENTS: EventDef[] = [
  {
    id: 'season_goal', scene: 'home', title: '다음 시즌의 목표', kicker: 'SEASON GOAL', cards: true, priority: 104, cooldown: 2,
    chance: (c) => (c.age < 22 ? 0.5 : 0.75),
    when: (c) =>
      c.age >= 18 && c.age < 66 && !c.s.goal && c.p.military !== 'serving' && !c.p.retired &&
      c.s.time - Number(c.s.flags.goalEnd ?? -99) >= 0.5,
    bind: (c) => {
      const picks = goalChoices(c.s, (xs) => c.rng.pick(xs));
      if (picks.length < 2) return false;
      picks.forEach((g, i) => (c.vars[`g${i}`] = g.id));
      return true;
    },
    text: (c) => {
      const done = Number(c.s.flags.goalsDone ?? 0);
      const lead = c.vary('goal_open', [
        '달력을 넘기다 손이 멈췄다. 다음 한두 해, 무엇에 걸어 볼까.',
        '합주가 끝나고 혼자 남은 밤, 수첩 맨 뒷장에 목표를 적어 보기로 했다.',
        '똑같은 하루가 반복되는 것 같았다. 방향을 하나 정하기로 했다.',
        '새 계절이 왔다. 이번엔 뭘 이뤄 볼까.',
      ]);
      return `${lead}\n${done ? `지금까지 이룬 목표 ${done}개. ` : ''}고른 목표에 맞춰 ‘알아서 살기’도 그쪽으로 기운다.`;
    },
    choices: [
      ...[0, 1, 2].map((i) => ({
        label: (c: Ctx) => {
          const g = def(c, i);
          return g ? g.title(g.target(c.s), c.s) : '';
        },
        if: (c: Ctx) => !!def(c, i),
        risk: 'risky' as const,
        card: (c: Ctx): CardInfo => {
          const g = def(c, i);
          if (!g) return { title: '', icon: '', tag: '' };
          const t = g.target(c.s);
          return {
            title: g.title(t, c.s),
            icon: g.icon,
            tag: g.tag,
            stats: [
              ['기한', `${g.years}년`],
              ['이루면', g.reward],
              ['어울리는 계획', g.plan.map((id) => actionById(id)?.label).filter(Boolean).slice(0, 2).join('·')],
            ],
            sub: '기한 안에 못 이루면 스트레스 +5.',
          };
        },
        run: (c: Ctx) => {
          const g = def(c, i)!;
          c.s.goal = startGoal(c.s, g);
          c.chron(`시즌 목표: ${c.s.goal.title}`, 'life');
          return c.pick(['수첩에 크게 적고 동그라미를 쳤다.', '멤버들에게도 말했다. 이제 빼도 박도 못 한다.', '냉장고 문에 붙여 두었다. 아침마다 보이게.']);
        },
      })),
      {
        label: '목표 없이, 흘러가는 대로',
        risk: 'safe' as const,
        card: () => ({ title: '흘러가는 대로', icon: '🍃', tag: '자유', stats: [['기한', '없음'], ['이루면', '—']], sub: '정해진 것 없이 사는 것도 방법이다.' }),
        run: (c: Ctx) => {
          c.s.flags.goalEnd = c.s.time;
          c.stat('stress', -3);
          return '수첩을 덮었다. 내일 일은 내일 정하기로.';
        },
      },
    ],
  },
];

