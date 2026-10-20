// 셋리스트의 관객별 정답 · 라이벌과 얽히기 · 왜 그렇게 됐나 · 지난 인생이 남는 것.
// 모두 시드를 고정한다.

import { describe, expect, it } from 'vitest';
import { newGame, runPeriodAuto, beginPeriod, openEvent, choose, resolveRoll, proceed, endPeriod } from '../src/sim/engine';
import { CROWD, crowdFor, scoreSetlist, setFanMul, setMod } from '../src/sim/setlist';
import { createRival, pushRival, tickRival } from '../src/sim/rival';
import { goalMissWhy, markYear, yearReview } from '../src/sim/why';
import { childRival, legacyOf, pickLegacy, radioCandidates, seniorCandidates } from '../src/sim/legacy';
import { Ctx } from '../src/sim/ctx';
import { eventById } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { playLife } from './autoplay';
import type { GameState, LegacyLife, Mood, Song } from '../src/sim/types';

const adult = (seed = 501, country: 'KR' | 'US' = 'KR', age = 24): GameState => {
  let s = newGame({ name: '김하늘', gender: 'f', birthYear: 1990, seed, country });
  let g = 0;
  while (s.phase !== 'ending' && s.time - s.player.birthYear < age && g++ < 200) s = runPeriodAuto(s);
  return s;
};
const withBand = (s: GameState) => {
  s.band ??= { id: 'b1', name: '테스트 밴드', genre: 'indierock', formedYear: 2010, endedYear: null, memberIds: [], playerInst: 'guitar', chemistry: 50, label: 'none', gigs: 6, bestGig: null };
  return s;
};
/** 사건 하나를 강제로 열어 고른다 (판정이 있으면 굴린다) */
function play(s: GameState, id: string, idx = 0): GameState {
  let t = s.phase === 'plan' ? beginPeriod(s) : s;
  t = { ...t, queue: [{ id, bind: {} }], phase: 'running' };
  t = openEvent(t, t.time);
  expect(t.active?.id, `${id} 가 열린다`).toBe(id);
  t = choose(t, idx);
  if (t.active?.pending) t = resolveRoll(t);
  return t;
}

const song = (id: string, mood: Mood, extra: Partial<Song> = {}): Song => ({ id, title: id, mood, quality: 60, genre: 'indierock', theme: '', lyric: [''], seed: 1, writtenYear: 2000, writtenAge: 20, bandName: null, released: false, releasedYear: null, streams: 0, peak: 0, hit: false, revival: false, coverSeed: 1, ...extra });

describe('셋리스트 — 관객마다 정답이 다르다', () => {
  const top = song('대표', 'epic', { quality: 90, hit: true });
  const all = [top, song('a', 'angry'), song('b', 'bright'), song('c', 'calm'), song('d', 'dreamy'), song('w', 'wistful')];

  it('처음 보는 관객은 대표곡을 앞에, 앉은 관객은 기승전결, 단골은 신곡, 평일 밤은 조용한 곡 없이', () => {
    const firstAnswer = [song('a', 'angry'), top, song('b', 'bright'), song('a2', 'angry'), song('b2', 'bright')];
    const seatedAnswer = [song('a', 'angry'), song('b', 'bright'), song('c', 'calm'), song('d2', 'bright'), top];
    expect(scoreSetlist(firstAnswer, all, 'first').score).toBeGreaterThan(scoreSetlist(seatedAnswer, all, 'first').score);
    expect(scoreSetlist(seatedAnswer, all, 'seated').score).toBeGreaterThan(scoreSetlist(firstAnswer, all, 'seated').score);

    const fresh = (id: string, mood: Mood) => song(id, mood, { writtenYear: 2010 });
    const regularsAnswer = [fresh('n1', 'angry'), fresh('n2', 'bright'), song('c', 'calm'), song('b', 'bright'), top];
    expect(scoreSetlist(regularsAnswer, all, 'regulars', 2011).score).toBeGreaterThan(scoreSetlist(seatedAnswer, all, 'regulars', 2011).score);

    const loud = [song('a', 'angry'), song('b', 'bright'), top, song('b2', 'bright'), song('a2', 'angry')];
    expect(scoreSetlist(loud, all, 'weeknight').score).toBeGreaterThan(scoreSetlist(seatedAnswer, all, 'weeknight').score);
  });

  it('정답에 가까울수록 조금만 유리하다 (판정 −1~+2, 팬 ±8%)', () => {
    expect(setMod(100)).toBe(2);
    expect(setMod(0)).toBe(-1);
    expect(setFanMul(100)).toBeCloseTo(1.08);
    expect(setFanMul(0)).toBeCloseTo(0.92);
  });

  it('관객은 공연장·처지로 정해지고, 사건 글에 힌트가 나온다', () => {
    const s = withBand(adult());
    s.player.fans = 500;
    s.band!.gigs = 8;
    expect(crowdFor('hall', s, 0.9)).toBe('seated');
    expect(crowdFor('openmic', s, 0.9)).toBe('first');
    expect(crowdFor('club_group', s, 0.1)).toBe('weeknight');
    expect(crowdFor('club_group', s, 0.9)).toBe('regulars');
    for (const k of Object.keys(CROWD)) expect(CROWD[k as keyof typeof CROWD].hint.length).toBeGreaterThan(5);
  });

  it('조사가 제목 받침에 맞는다', () => {
    const t = song('바다', 'epic', { quality: 95 });
    const notes = scoreSetlist([song('c', 'calm')], [t], 'first').notes.map((n) => n.text).join(' ');
    expect(notes).toContain('〈바다〉를');
    const t2 = song('여름밤', 'epic', { quality: 95 });
    expect(scoreSetlist([song('c', 'calm')], [t2], 'first').notes.map((n) => n.text).join(' ')).toContain('〈여름밤〉을');
  });
});

describe('라이벌 — 내 행동이 저들에게 닿는다', () => {
  const setup = (seed = 777) => {
    const s = withBand(adult(seed, 'US'));
    s.rival = undefined;
    s.rival = createRival(s, new Rng(3))!;
    s.rival.tone = 'fire';
    return s;
  };

  it('기세를 밀면 저들이 더 빨리 크고, 꺾으면 느려진다', () => {
    const a = setup();
    const b = structuredClone(a);
    pushRival(a, 0.6);
    pushRival(b, -0.6);
    const ra = new Rng(9);
    const rb = new Rng(9);
    for (let i = 0; i < 6; i++) { a.time += 0.5; b.time += 0.5; tickRival(a, ra, 0.5); tickRival(b, rb, 0.5); }
    expect(a.rival!.fans).toBeGreaterThan(b.rival!.fans);
    expect(Math.abs(a.rival!.momentum ?? 0)).toBeLessThan(0.6); // 시간이 지나면 0으로 돌아온다
  });

  it('저들 멤버를 데려오면 우리 밴드에 들어오고 저들은 흔들린다 (판정 결과대로)', () => {
    let s = setup(778);
    s.player.fans = Math.max(s.player.fans, s.rival!.fans * 2, 200);
    const n0 = s.band!.memberIds.length;
    const mo0 = s.rival!.momentum ?? 0;
    s = play(s, 'rival_poach_theirs', 0);
    const joined = s.band!.memberIds.length === n0 + 1;
    if (joined) {
      expect(s.rival!.momentum!).toBeLessThan(mo0);
      expect(s.rival!.tone).toBe('fire');
    } else expect(s.band!.memberIds.length).toBe(n0);
  });

  it('저들이 우리 멤버를 데려가려 하면, 보내 주면 멤버가 빠지고 저들 기세가 오른다', () => {
    let s = setup(779);
    const m = s.band!.memberIds[0] ?? null;
    if (!m) {
      const n = Object.values(s.npcs).find((x) => x.role !== 'parent' && x.role !== 'rival')!;
      n.inBand = true; n.role = 'member'; s.band!.memberIds.push(n.id);
    }
    s.rival!.fans = Math.max(1000, s.player.fans * 3);
    const n0 = s.band!.memberIds.length;
    s = play(s, 'rival_poach_mine', 1);
    expect(s.band!.memberIds.length).toBe(n0 - 1);
    expect(s.rival!.momentum!).toBeGreaterThan(0);
  });

  it('경연 맞대결·해체 후 리더 영입 사건이 실제로 열린다', () => {
    const s = setup(780);
    s.player.fans = 300;
    s.rival!.fans = 400;
    const c = new Ctx(s, new Rng(1));
    expect(eventById('rival_contest')!.when(c)).toBe(true);
    expect(eventById('rival_poach_mine')).toBeTruthy();
  });
});

describe('왜 그렇게 됐나', () => {
  it('공연 없이 한 해가 가면 ‘공연 0번 → 공연부터’', () => {
    const s = withBand(adult());
    s.player.fans = 1000;
    s.yearMark = markYear(s);
    s.player.fans = 900;
    const rv = yearReview(s, 2014, 24)!;
    expect(rv.text).toContain('팬 −100명');
    expect(rv.deltas).toContain('공연 0번');
    expect(rv.deltas).toContain('공연부터');
  });
  it('공연·새 곡으로 늘었으면 그 이유를 말한다', () => {
    const s = withBand(adult());
    s.yearMark = markYear(s);
    s.flags.gigs = Number(s.flags.gigs ?? 0) + 3;
    s.player.fans += 400;
    const rv = yearReview(s, 2014, 24)!;
    expect(rv.tone).toBe('good');
    expect(rv.deltas).toContain('공연 3번');
  });
  it('시즌 목표를 놓친 이유 — 얼마나 왔고, 계획이 따랐나', () => {
    expect(goalMissWhy(0, 1, 4, 1, 4)).toContain('계획이 목표를 따라가지 않았다');
    expect(goalMissWhy(0, 3, 4, 4, 4)).toContain('시간이 조금 모자랐다');
    expect(goalMissWhy(0, 0, 4, 4, 4)).toContain('목표가 지금 처지보다 컸다');
  });
  it('실제 인생에서 해마다 돌아보기가 남는다', () => {
    const { s } = playLife(1001, 'auto');
    expect(s.feed.some((f) => f.text.includes('돌아보기') && (f.deltas ?? '').startsWith('왜:'))).toBe(true);
  });
});

describe('지난 인생이 남는다', () => {
  const past = (): LegacyLife => {
    const { s } = playLife(1003, 'auto', { birthYear: 1965 });
    const l = legacyOf(s)!;
    return { ...l, country: 'KR', bandName: l.bandName ?? '옥상 고양이', bestSong: l.bestSong ?? '여름밤', songYear: l.songYear ?? 1990, fans: Math.max(l.fans, 5000), childName: '박서준', childBorn: 1994 };
  };

  it('끝난 인생에서 넘길 것을 뽑고, 자기 자신은 빼고, 최근 6개까지만', () => {
    const l = past();
    expect(l.name).toBeTruthy();
    expect(pickLegacy([l, null, undefined], l.id)).toEqual([]);
    expect(pickLegacy(Array.from({ length: 9 }, (_, i) => ({ ...l, id: `x${i}` }))).length).toBe(6);
  });

  it('대표곡을 낸 해가 지나면 라디오에서 흘러나온다', () => {
    const l = past();
    let s = adult(901, 'KR', 12);
    s.legacy = [l];
    expect(radioCandidates(s).length).toBe(1);
    s = play(s, 'legacy_radio', 0);
    expect(s.active!.result!.lines.some((x) => x.text.startsWith('지난 인생 —'))).toBe(true);
    s = proceed(s);
    expect(radioCandidates(s).length).toBe(0); // 한 번만
  });

  it('같은 나라·같은 시대면 지난 인생의 주인공이 선배로 나타난다', () => {
    const l = past();
    let s = adult(902, 'KR', 20);
    s.legacy = [{ ...l, born: 1960, died: 2040 }];
    expect(seniorCandidates(s).length).toBe(1);
    s = play(s, 'legacy_senior', 0);
    expect(Object.values(s.npcs).some((n) => n.name === l.name && n.role === 'mentor')).toBe(true);
  });

  it('지난 인생의 아이가 비슷한 나이면 라이벌 밴드의 리더가 된다', () => {
    const l = past();
    const s = withBand(adult(903, 'KR', 20));
    s.legacy = [{ ...l, childBorn: s.player.birthYear + 2 }];
    expect(childRival(s)).toBeTruthy();
    s.rival = undefined;
    s.rival = createRival(s, new Rng(4))!;
    expect(s.npcs[s.rival.leaderId].name).toBe('박서준');
    expect(s.rival.legacyOf).toBe(l.name);
  });

  it('지난 인생이 없으면 아무것도 끼어들지 않는다', () => {
    const s = adult(904);
    expect(radioCandidates(s)).toEqual([]);
    expect(seniorCandidates(s)).toEqual([]);
    expect(childRival(s)).toBeNull();
    void endPeriod;
  });
});
