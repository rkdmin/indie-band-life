// 멤버 고르기 카드. 인연(지금까지 만난 사람)과 우연(갑자기 나타난 연주자) 중에서 직접 고른다.
// 카드마다 영입 판정(d20)이 있다 — 오랜 친구는 쉽게 "좋아", 실력 좋은 낯선 사람은 우리가 유명해야 온다.

import type { EventDef, Ctx } from '../ctx';
import type { Inst, Npc } from '../types';
import { INSTRUMENTS } from '../types';
import { GENRE_INFO, INST_LABEL } from '../data/world';
import { createNpc, npcAge, remember } from '../npc';
import { bandSkill, missingInst } from '../actions';
import { clamp } from '../rng';
import { given, josa } from '../korean';
import { textMinYear } from '../data/anachronism';

const WALK_IN_PLACES = ['멤버 모집 공고를 보고 온 지원자', '공연 뒤풀이에서 만난 연주자', '합주실 옆방에서 연습하던 사람', 'SNS DM 으로 연락 온 사람', '음악 학원 강사', '버스킹 구경꾼이었던 사람', '중고 악기 거래에서 만난 사람'];

/** 후보 뽑기: 인연 최대 2명 + 우연 1~3명, 모두 합쳐 3~4장 */
function draftCandidates(c: Ctx, src: string): Npc[] {
  const band = c.band!;
  const miss = missingInst(c);
  const taken = new Set<Inst>([band.playerInst, ...c.members.map((m) => m.inst)]);
  const out: Npc[] = [];
  if (src !== 'walkin') {
    const known = Object.values(c.s.npcs)
      .filter((n) => n.alive && !n.inBand && n.role !== 'parent' && n.role !== 'partner' && n.affinity >= 5 && n.skill >= 10 && npcAge(c.s, n) >= 14)
      .sort((a, b) => Number(miss.includes(b.inst)) - Number(miss.includes(a.inst)) || b.affinity + b.skill * 0.5 - (a.affinity + a.skill * 0.5));
    for (const n of known) {
      if (out.length >= 2) break;
      out.push(n);
    }
  }
  const fame = c.p.fans;
  const walkIns = src === 'walkin' ? 1 : Math.max(1, (c.rng.chance(0.5) ? 4 : 3) - out.length);
  for (let i = 0; i < walkIns; i++) {
    const want = miss.filter((x) => !out.some((o) => o.inst === x));
    const inst: Inst = want.length && c.rng.chance(0.75) ? c.pick(want) : c.pick(INSTRUMENTS.filter((x) => !taken.has(x)).length ? INSTRUMENTS.filter((x) => !taken.has(x)) : INSTRUMENTS);
    const skill = clamp(Math.round(25 + Math.log10(fame + 10) * 8 + c.rng.normal(src === 'walkin' ? 12 : 0, 14)), 8, 95);
    const n = createNpc(c.s, c.rng, {
      metAt: c.pick((src === 'walkin' ? WALK_IN_PLACES.slice(1) : WALK_IN_PLACES).filter((x) => textMinYear(x) <= c.year)),
      inst,
      skill,
      genre: c.rng.chance(0.55) ? band.genre : undefined,
      birthYear: c.p.birthYear + c.rng.int(-6, 5),
      affinity: c.rng.int(3, 15),
      career: 'musician',
    });
    remember(n, `${c.ageInt}세 · 멤버 카드로 처음 만났다`);
    out.push(n);
  }
  return out.slice(0, 4);
}

/** 영입 판정 — 근거가 있는 통계는 없어 [가정]으로 표시한다 */
export function joinOdds(c: Ctx, n: Npc) {
  const band = c.band!;
  const gap = n.skill - bandSkill(c);
  return c.dc(
    11,
    '영입 판정',
    [
      ['우리 사이', n.affinity >= 60 ? 4 : n.affinity >= 30 ? 2 : n.affinity < 0 ? -3 : 0],
      ['밴드 인지도', c.p.fans >= 10_000 ? 3 : c.p.fans >= 1000 ? 1 : 0],
      ['실력 차이', gap > 25 ? -4 : gap > 12 ? -2 : gap < -15 ? 2 : 0],
      ['장르 궁합', n.genre === band.genre ? 2 : 0],
      ['내 성격', c.p.traits?.includes('warm') || c.p.traits?.includes('funny') ? 1 : 0],
      ['그 사람 성격', n.traits.includes('stubborn') ? -1 : n.traits.includes('free') ? 1 : 0],
    ],
    '가정',
    n.affinity >= 30 ? `${n.metAge}살 때부터 아는 사이다` : '처음 보는 사람 — 우리가 얼마나 매력적인지가 관건',
  );
}

function tryJoin(c: Ctx, id: string): string {
  const n = c.s.npcs[id];
  if (!n || !c.band) return '';
  if (c.check(c.choicesOdds!)) {
    c.band.memberIds.push(n.id);
    n.inBand = true;
    n.role = 'member';
    n.career = 'musician';
    n.affinity = clamp(n.affinity + 10, -100, 100);
    remember(n, `${c.ageInt}세 · 〈${c.band.name}〉에 합류한 날`);
    c.band.chemistry = clamp(c.band.chemistry + (n.genre === c.band.genre ? 4 : -2) + (n.affinity >= 40 ? 4 : 0));
    c.line(`${n.name} — ${INST_LABEL[n.inst]} 합류!`, 'big');
    c.chron(`${n.name}, ${INST_LABEL[n.inst]}로 〈${c.band.name}〉 합류`, 'band');
    // 3인조가 될 때까지는 다음 카드를 계속 뽑는다
    const round = Number(c.vars.round ?? 1);
    if (c.members.length < 2 && round < 3) c.queue('pick_member', {}, { src: 'more', round: round + 1 });
    return n.affinity >= 50 ? `“네가 하자는데 당연하지.” ${josa(given(n.name), '이/가')} 웃었다.` : '첫 합주 날짜를 잡았다. 새 사람의 소리가 들어오자 곡이 달라졌다.';
  }
  n.affinity = clamp(n.affinity - 3, -100, 100);
  const round = Number(c.vars.round ?? 1);
  if (c.members.length < 2 && round < 3) c.queue('pick_member', {}, { src: 'more', round: round + 1 });
  return c.pick(['“조금만 생각해 볼게요.” 연락은 오지 않았다.', '“다른 팀 일정이랑 겹쳐서요. 미안해요.”', '“장르가 좀… 저랑은 안 맞는 것 같아요.”']);
}

function makeDraft(id: string, queued: boolean): EventDef {
  return {
    id,
    scene: 'studio',
    title: (c) => (c.vars.src === 'walkin' ? '찾아온 연주자' : c.vars.src === 'form' ? `〈${c.band?.name}〉 멤버 고르기` : '멤버 고르기'),
    priority: queued ? 150 : undefined,
    queued,
    chance: queued ? undefined : 0.1,
    cooldown: queued ? undefined : 6,
    when: (c) => (queued ? true : !!c.band && c.members.length < 4 && c.p.military !== 'serving' && c.age < 65),
    bind: (c) => {
      if (!c.band || c.members.length >= 4) return false;
      if (!queued) c.vars.src = 'walkin';
      const src = String(c.vars.src ?? 'recruit');
      const cands = draftCandidates(c, src);
      cands.forEach((n, i) => (c.vars[`c${i}`] = n.id));
      c.vars.n = cands.length;
      return cands.length > 0;
    },
    text: (c) => {
      const miss = missingInst(c).map((i) => INST_LABEL[i]);
      if (c.vars.src === 'walkin') return `합주실 문을 누가 두드렸다.\n“여기 ${GENRE_INFO[c.band!.genre].label} 하는 팀 맞죠? 같이 해 보고 싶어서요.”`;
      return `지금 〈${c.band!.name}〉은 ${c.members.length + 1}인조.${miss.length ? ` 비어 있는 자리: ${miss.join(' · ')}.` : ''}\n함께할 사람을 한 명 고르자. 오랜 인연일 수도, 오늘 처음 본 사람일 수도 있다.`;
    },
    choices: [
      ...[0, 1, 2, 3].map((i) => ({
        label: (c: Ctx) => {
          const n = c.s.npcs[c.vars[`c${i}`] as string];
          return n ? `${n.name} — ${INST_LABEL[n.inst]} ${Math.round(n.skill)}` : '';
        },
        if: (c: Ctx) => !!c.s.npcs[c.vars[`c${i}`] as string],
        odds: (c: Ctx) => joinOdds(c, c.s.npcs[c.vars[`c${i}`] as string]),
        run: (c: Ctx) => tryJoin(c, c.vars[`c${i}`] as string),
      })),
      { label: '이번엔 아무도 고르지 않는다', run: () => '좋은 사람은 기다리면 온다. 아마도.' },
    ],
  };
}

export const DRAFT: EventDef[] = [makeDraft('pick_member', true), makeDraft('member_walkin', false)];
