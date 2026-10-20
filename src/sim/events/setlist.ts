// 셋리스트 짜기 — 중요한 공연을 앞두고 곡 순서를 직접 고른다 (화면: ui/SetlistBuilder.tsx, 점수: sim/setlist.ts)
// 첫 번째 선택지는 화면에서 고른 셋리스트로, 고르지 않았으면(자동 진행) 무난한 순서로 공연한다.

import type { EventDef, Ctx } from '../ctx';
import { playGig, venuesFor } from '../actions';
import { VENUES } from '../data/world';
import { CROWD, chosenSetlist, crowdFor, habitSetlist, repertoire, scoreSetlist, SET_SIZE, type Crowd } from '../setlist';
import { josa } from '../korean';

/** 〈곡 제목〉 뒤 조사를 제목에 맞춘다 */
const tj = (t: string, pair: Parameters<typeof josa>[1]) => `〈${t}〉${josa(t, pair).slice(t.length)}`;

const venue = (c: Ctx) => {
  // 고를 때 정한 공연장 (없으면 감당 가능한 가장 큰 곳)
  const picked = c.vars.venue ? VENUES.find((v) => v.id === c.vars.venue) : undefined;
  if (picked) return picked;
  const vs = venuesFor(c).filter((v) => !v.locked);
  return vs[vs.length - 1] ?? null;
};
const crowd = (c: Ctx) => ((c.vars.crowd as Crowd) || 'seated');

export const SETLIST_EVENTS: EventDef[] = [
  {
    id: 'gig_setlist', scene: 'club', title: '셋리스트를 짜자', kicker: 'SETLIST', priority: 102, cooldown: 6, chance: 0.4,
    when: (c) => !!c.band && c.band.gigs >= 2 && repertoire(c.s).length >= SET_SIZE && c.p.military !== 'serving' && !c.p.retired && !!venue(c),
    // 오늘의 관객은 공연장·처지로 정해진다 — 관객마다 ‘정답’ 순서가 다르다 (sim/setlist.ts)
    bind: (c) => {
      const v = venue(c)!;
      c.vars.venue = v.id;
      c.vars.crowd = crowdFor(v.id, c.s, c.rng.next());
      return true;
    },
    text: (c) => {
      const v = venue(c)!;
      const cr = CROWD[crowd(c)];
      return `이번 주말 ${v.label} 공연. 합주실 화이트보드 앞에 멤버들이 모였다.\n오늘은 ${cr.label}. ${cr.hint}.\n다섯 곡, 어떤 순서로 할까?`;
    },
    choices: [
      {
        label: '이 순서로 간다',
        risk: 'risky',
        run: (c) => {
          const set = chosenSetlist(c.s) ?? habitSetlist(c.s);
          c.s.flags.setlist = set.map((x) => x.id).join(',');
          c.s.flags.setCrowd = crowd(c);
          const sc = scoreSetlist(set, repertoire(c.s), crowd(c), c.year);
          playGig(c, venue(c)!);
          c.set('setlistDone');
          if (sc.score >= 85) c.inc('setlistGreat');
          const open = set[0];
          const close = set[set.length - 1];
          // 순서가 좋아도 무대 판정에서 무너질 수 있다 — 글은 둘 다 본다
          const grade = c.s.flags.lastGigGrade;
          if (grade === 'bad')
            return sc.score >= 60
              ? `순서는 맞았다. 그런데 〈${open.title}〉 첫 소절부터 손이 굳었다. 좋은 셋리스트도 연주를 대신해 주진 않았다.`
              : `순서도 연주도 꼬였다. ${tj(close.title, '으로/로')} 닫을 때쯤 객석 절반이 휴대폰을 보고 있었다.`;
          return sc.score >= 70
            ? `첫 곡 〈${open.title}〉에 객석이 한 번에 깼다. 마지막 〈${close.title}〉에선 모두가 따라 불렀다.`
            : sc.score >= 45
              ? `${tj(open.title, '으로/로')} 시작해 ${tj(close.title, '으로/로')} 끝냈다. 중간에 조금 늘어졌지만 나쁘지 않았다.`
              : `순서가 꼬였다. ${tj(close.title, '으로/로')} 닫을 때쯤 객석 절반이 휴대폰을 보고 있었다.`;
        },
      },
      {
        label: '늘 하던 순서로 한다',
        risk: 'safe',
        run: (c) => {
          // 늘 하던 순서 — 셋리스트 점수를 매기지 않는다 (보정 없음)
          delete c.s.flags.setlist;
          playGig(c, venue(c)!);
          return '익숙한 순서. 손은 편했지만 관객도 다음 곡을 알고 있었다.';
        },
      },
    ],
  },
];
