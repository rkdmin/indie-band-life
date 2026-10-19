// 화면 뒤의 규칙들 — 생활 계획 고르기, 선택지 회전, 반복 감쇠, 계획 잠금, 컷신 반응.
// 모두 시드를 고정해 몇 번을 돌려도 같은 결과가 나온다 (불안정한 테스트 금지).

import { describe, expect, it } from 'vitest';
import { togglePlan, planOptions, resolvePlan } from '../src/sim/plan';
import { newGame, runPeriodAuto, openEvent, beginPeriod, autoChoose, proceed, endPeriod } from '../src/sim/engine';
import { Rng } from '../src/sim/rng';
import { moodOf } from '../src/ui/cutMood';
import { kinLabel } from '../src/sim/npc';
import { renameBand, canRenameBand, cleanBandName } from '../src/sim/engine';
import type { Npc } from '../src/sim/types';
import type { ActiveEvent, GameState } from '../src/sim/types';
import type { CountryId } from '../src/sim/data/countries';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.LOGIC_N ?? 30);

function ageTo(s: GameState, a: number): GameState {
  let g = 0;
  while (s.phase !== 'ending' && s.time - s.player.birthYear < a && g++ < 300) s = runPeriodAuto(s);
  return s;
}

describe('생활 계획 고르기', () => {
  it('알아서 상태에서 하나를 누르면 그것 하나만 켜진다 (두 개가 같이 켜지지 않는다)', () => {
    expect(togglePlan({ auto: true, sel: [] }, 'gig', 2)).toEqual({ auto: false, sel: ['gig'], full: false });
    expect(togglePlan({ auto: true, sel: ['rest', 'compose'] }, 'gig', 2).sel).toEqual(['gig']);
  });
  it('다시 누르면 빠지고, 칸이 차면 몰래 바꾸지 않고 알린다', () => {
    expect(togglePlan({ auto: false, sel: ['gig'] }, 'gig', 2).sel).toEqual([]);
    expect(togglePlan({ auto: false, sel: ['gig'] }, 'compose', 2).sel).toEqual(['gig', 'compose']);
    const full = togglePlan({ auto: false, sel: ['gig', 'compose'] }, 'rest', 2);
    expect(full.sel).toEqual(['gig', 'compose']);
    expect(full.full).toBe(true);
    expect(togglePlan({ auto: false, sel: ['gig'] }, 'rest', 1).sel).toEqual(['rest']);
  });
  it('잠긴 활동은 이유가 있고, 계획을 실제로 돌릴 때 잠긴 활동은 빠진다', () => {
    const cts: CountryId[] = ['KR', 'US', 'JP'];
    let lockedSeen = 0;
    for (let i = 0; i < 9; i++) {
      let s = ageTo(newGame({ name: '검사', gender: 'm', birthYear: 1985 + i, seed: 7100 + i * 7, country: cts[i % 3] }), 22 + i);
      if (s.phase === 'ending') continue;
      s = { ...s, player: { ...s.player, money: 0, job: 'office' } };
      const opts = planOptions(s);
      for (const o of opts) if (o.locked) { lockedSeen++; expect(o.locked.length).toBeGreaterThan(3); }
      // 회사원은 알바를 못 한다 — 숨지 않고 이유와 함께 잠긴다
      const pt = opts.find((o) => o.def.id === 'parttime');
      if (pt) expect(pt.locked).toMatch(/회사/);
      const lockedIds = new Set(opts.filter((o) => o.locked).map((o) => o.def.id));
      const plan = resolvePlan({ ...s, autoPlan: false, plan: opts.map((o) => ({ id: o.def.id })) }, new Rng(1));
      for (const p of plan) expect(lockedIds.has(p.id), `잠긴 ${p.id} 가 계획에 들어갔다`).toBe(false);
    }
    expect(lockedSeen).toBeGreaterThan(0);
  });
});

describe('선택지 회전', () => {
  it('같은 사건이 다시 와도 보이는 선택지가 바뀐다 (덜 본 것부터)', () => {
    let s = ageTo(newGame({ name: '검사', gender: 'f', birthYear: 1990, seed: 4242, country: 'KR' }), 24);
    s = { ...s, player: { ...s.player, money: 10_000_000, military: 'done' } };
    const seen: string[][] = [];
    for (let k = 0; k < 3; k++) {
      // 번아웃 조건(스트레스가 이어진 시기)을 직접 만들어 반드시 열리게 한다 — 조용히 건너뛰는 테스트는 없다
      const o = openEvent({ ...s, phase: 'running', active: null, stressTurns: 3, queue: [{ id: 'burnout', bind: {} }] }, s.time);
      expect(o.active?.id).toBe('burnout');
      if (!o.active) return;
      seen.push(o.active.choices.filter((c) => !c.hidden).map((c) => c.label).sort());
      s = { ...o, phase: 'running', active: null, player: { ...o.player, money: 10_000_000 } };
    }
    // 번아웃 선택지는 7개, 한 번에 4개 — 세 번 보면 7개를 다 보게 된다
    const all = new Set(seen.flat());
    expect(all.size).toBeGreaterThanOrEqual(6);
    expect(seen[0].join()).not.toEqual(seen[1].join());
  });

  it('자주 보던 사건은 한 인생에서 덜 나온다', () => {
    const count = new Map<string, number>();
    const L = Math.max(8, Math.floor(N / 2));
    for (let i = 0; i < L; i++) {
      let s: GameState = newGame({ name: '검사', gender: i % 2 ? 'm' : 'f', birthYear: 1960 + ((i * 9) % 60), seed: 3100 + i * 17, country: 'KR' });
      let g = 0;
      while (s.phase !== 'ending' && g++ < 400) {
        if (s.phase === 'plan') s = beginPeriod(s);
        let k = 0;
        while (s.queue.length && k++ < 6 && s.phase === 'running') {
          s = openEvent(s, s.time);
          if (s.phase === 'event' && s.active) {
            count.set(s.active.id, (count.get(s.active.id) ?? 0) + 1);
            s = proceed(autoChoose(s));
          }
        }
        if (s.phase === 'running') s = endPeriod(s);
      }
    }
    // 이전: 곡이 쌓였다 6.6회, 그 밴드의 노래 4.8회, 장비 카드 2.8회 (한 인생 평균)
    expect((count.get('release_ready') ?? 0) / L).toBeLessThan(5);
    expect((count.get('a_heard_band') ?? 0) / L).toBeLessThan(4);
    expect((count.get('c_gear') ?? 0) / L).toBeLessThan(2.5);
  });
});

describe('컷신 반응', () => {
  const base = { id: 'x', bind: {}, title: '', text: '', scene: 'home', choices: [], at: 2000, big: false } as unknown as ActiveEvent;
  it('결과가 없으면 반응하지 않는다', () => expect(moodOf(base)).toBe('none'));
  it('대박·쪽박·판정 성공·실패를 구분한다', () => {
    expect(moodOf({ ...base, result: { text: '', lines: [], jackpot: { kind: 'fans', amount: 1, label: '' } } })).toBe('jackpot');
    expect(moodOf({ ...base, result: { text: '', lines: [], jackpot: { kind: 'bust', amount: -1, label: '' } } })).toBe('bust');
    const roll = (ok: boolean) => ({ label: '', p: 0.5, roll: 0.5, ok, nat: 10, mod: 0, dc: 10 });
    expect(moodOf({ ...base, result: { text: '', lines: [], rolls: [roll(true)] } })).toBe('good');
    expect(moodOf({ ...base, result: { text: '', lines: [], rolls: [roll(false)] } })).toBe('bad');
    expect(moodOf({ ...base, result: { text: '', lines: [{ text: '', tone: 'bad' }, { text: '', tone: 'bad' }, { text: '', tone: 'good' }] } })).toBe('bad');
  });
});

describe('가족 호칭', () => {
  const n = (role: string, gender: 'm' | 'f', birthYear: number) => ({ role, gender, birthYear }) as unknown as Npc;
  it('엄마·아빠, 내 성별과 나이로 형·오빠·누나·언니·남동생·여동생', () => {
    const boy = { gender: 'm' as const, birthYear: 2000 };
    const girl = { gender: 'f' as const, birthYear: 2000 };
    expect(kinLabel(n('parent', 'f', 1970), boy)).toBe('엄마');
    expect(kinLabel(n('parent', 'm', 1968), girl)).toBe('아빠');
    expect(kinLabel(n('sibling', 'm', 1997), boy)).toBe('형');
    expect(kinLabel(n('sibling', 'm', 1997), girl)).toBe('오빠');
    expect(kinLabel(n('sibling', 'f', 1997), boy)).toBe('누나');
    expect(kinLabel(n('sibling', 'f', 1997), girl)).toBe('언니');
    expect(kinLabel(n('sibling', 'm', 2003), girl)).toBe('남동생');
    expect(kinLabel(n('sibling', 'f', 2003), boy)).toBe('여동생');
    expect(kinLabel(n('friend', 'f', 2000), boy)).toBeNull();
  });
});

describe('밴드 이름', () => {
  it('결성한 밴드는 모두 결성 기록이 남는다 (이름 짓기를 거쳐도)', () => {
    const bad: string[] = [];
    for (let i = 0; i < 12; i++) {
      let s = newGame({ name: '검사', gender: i % 2 ? 'm' : 'f', birthYear: 1970 + i * 3, seed: 8800 + i * 11, country: 'KR' });
      let g = 0;
      while (s.phase !== 'ending' && g++ < 400) s = runPeriodAuto(s);
      for (const b of [...s.pastBands, ...(s.band ? [s.band] : [])]) {
        if (!s.chronicle.some((c) => c.text.includes(`〈${b.name}〉`))) bad.push(`${b.name} 기록 없음`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('이름을 바꾸면 지난 기록도 바뀌고, 첫 발매 뒤엔 못 바꾼다', () => {
    expect(cleanBandName('  〈새 이름〉  ')).toBe('새 이름');
    expect(cleanBandName('아주아주아주아주아주아주긴이름입니다')).toHaveLength(16);
    let s = newGame({ name: '검사', gender: 'm', birthYear: 1990, seed: 9100, country: 'KR' });
    let g = 0;
    while (!s.band && s.phase !== 'ending' && g++ < 400) s = runPeriodAuto(s);
    expect(s.band, '이 시드는 밴드를 만든다').toBeTruthy();
    if (!s.band) return;
    const old = s.band.name;
    s = { ...s, chronicle: [...s.chronicle, { age: 20, year: 2010, text: `밴드 〈${old}〉 결성`, kind: 'band' }], albums: [] };
    const r = renameBand(s, '파란 지붕');
    expect(r.band!.name).toBe('파란 지붕');
    expect(r.chronicle.some((c) => c.text.includes('〈파란 지붕〉'))).toBe(true);
    expect(r.chronicle.some((c) => c.text.includes(`〈${old}〉`))).toBe(false);
    const released = { ...r, albums: [{ id: 'a', title: 't', kind: 'single', songIds: [], year: 2011, age: 21, bandName: '파란 지붕', coverSeed: 1, genre: r.band!.genre, score: 5, sales: 1 }] } as typeof r;
    expect(canRenameBand(released)).toBe(false);
    expect(renameBand(released, '다른 이름').band!.name).toBe('파란 지붕');
  });
});
