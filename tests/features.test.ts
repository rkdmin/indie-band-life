// 중반을 덜 반복적으로 만드는 장치들과 나라 맞춤 — 시즌 목표, 문장 기억, 라이벌, 셋리스트, 운명 코드, 나라 돈.
// 시드를 고정해 몇 번을 돌려도 같은 결과가 나온다.

import { describe, expect, it } from 'vitest';
import { newGame, runPeriodAuto, setSetlist } from '../src/sim/engine';
import { GOALS, goalProgress, settleGoal, startGoal } from '../src/sim/goals';
import { isFresh, remember } from '../src/sim/state';
import { ENERGY, scoreSetlist, chosenSetlist } from '../src/sim/setlist';
import { decodeFate, encodeFate, fateName } from '../src/sim/fatecode';
import { won } from '../src/sim/korean';
import { createRival, tickRival } from '../src/sim/rival';
import { Rng } from '../src/sim/rng';
import { COUNTRY_LIFE_EVENTS } from '../src/sim/events/country_life';
import { EVENTS } from '../src/sim/events';
import type { GameState, Mood, Song } from '../src/sim/types';

const adult = (country: 'KR' | 'US' | 'BR' = 'KR', seed = 501): GameState => {
  let s = newGame({ name: '김하늘', gender: 'f', birthYear: 1990, seed, country });
  let g = 0;
  while (s.phase !== 'ending' && s.time - s.player.birthYear < 24 && g++ < 200) s = runPeriodAuto(s);
  return s;
};

describe('시즌 목표', () => {
  it('목표를 이루면 보상과 함께 끝나고, 기한이 지나면 놓친다', () => {
    const s = adult();
    const def = GOALS.find((g) => g.id === 'songs')!;
    const done0 = Number(s.flags.goalsDone ?? 0);
    const miss0 = Number(s.flags.goalsMissed ?? 0);
    s.goal = startGoal(s, def);
    expect(goalProgress(s, s.goal)).toBe(0);
    for (let i = 0; i < 3; i++) s.songs.push({ ...s.songs[0], id: `x${i}` } as Song);
    const won1 = settleGoal(s)!;
    expect(won1.ok).toBe(true);
    expect(s.goal).toBeUndefined();
    expect(Number(s.flags.goalsDone)).toBe(done0 + 1);

    s.goal = startGoal(s, def);
    s.time = s.goal.until + 0.1;
    const lost = settleGoal(s)!;
    expect(lost.ok).toBe(false);
    expect(Number(s.flags.goalsMissed)).toBe(miss0 + 1);
  });
  it('20~40대 인생에 시즌 목표 갈림길이 나온다', () => {
    let n = 0;
    for (let i = 0; i < 6; i++) {
      let s = newGame({ name: '김하늘', gender: i % 2 ? 'm' : 'f', birthYear: 1980 + i, seed: 900 + i, country: 'KR' });
      let g = 0;
      while (s.phase !== 'ending' && s.time - s.player.birthYear < 45 && g++ < 300) s = runPeriodAuto(s, (st) => { if (st.active!.id === 'season_goal') n++; return st.active!.choices.findIndex((c) => !c.disabled && !c.hidden); });
    }
    expect(n).toBeGreaterThan(6);
  });
});

describe('같은 문장을 되풀이하지 않는다', () => {
  it('한 번 쓴 문장은 12년 동안 다시 쓰지 않는다', () => {
    const s = adult();
    const line = '테스트용 문장 — 어디에도 없는 줄.';
    expect(isFresh(s, line)).toBe(true);
    remember(s, line);
    expect(isFresh(s, line)).toBe(false);
    s.time += 12;
    expect(isFresh(s, line)).toBe(true);
  });
  it('20~45세 인생 기록에 같은 작은 문장이 두 번 넘게 나오지 않는다', () => {
    let s = newGame({ name: '김하늘', gender: 'm', birthYear: 1975, seed: 4242, country: 'KR' });
    const seen = new Map<string, number>();
    let g = 0;
    while (s.phase !== 'ending' && g++ < 300) {
      const f0 = s.feed.length;
      const a = s.time - s.player.birthYear;
      s = runPeriodAuto(s);
      if (a >= 20 && a < 45) for (const f of s.feed.slice(f0)) if (f.kind === 'flavor') seen.set(f.text, (seen.get(f.text) ?? 0) + 1);
    }
    expect(Math.max(0, ...seen.values())).toBeLessThanOrEqual(2);
  });
});

describe('라이벌 밴드', () => {
  it('밴드가 생기면 라이벌도 생기고, 시간이 흐르면 저들도 변한다', () => {
    const s = adult('US', 777);
    s.band ??= { id: 'b1', name: '테스트 밴드', genre: 'indierock', formedYear: 2014, endedYear: null, memberIds: [], playerInst: 'guitar', chemistry: 50, label: 'none', gigs: 0, bestGig: null };
    s.rival = undefined;
    const rng = new Rng(3);
    s.rival = createRival(s, rng)!;
    expect(s.rival.name).not.toBe(s.band.name);
    expect(s.npcs[s.rival.leaderId]?.role).toBe('rival');
    const before = s.rival.fans;
    for (let i = 0; i < 20; i++) { s.time += 0.5; tickRival(s, rng, 0.5); }
    expect(s.rival.fans).not.toBe(before);
    expect(s.rival.peak).toBeGreaterThanOrEqual(s.rival.fans);
  });
});

describe('셋리스트', () => {
  const song = (id: string, mood: Mood, quality = 60): Song => ({ id, title: id, mood, quality, genre: 'indierock', theme: '', lyric: [''], seed: 1, writtenYear: 2000, writtenAge: 20, bandName: null, released: false, releasedYear: null, streams: 0, peak: 0, hit: false, revival: false, coverSeed: 1 });
  it('센 곡으로 열고, 가운데 숨 고르고, 가장 큰 곡으로 닫으면 점수가 높다', () => {
    const good = [song('a', 'angry'), song('b', 'bright'), song('c', 'calm'), song('d', 'dreamy'), song('e', 'epic', 80)];
    const bad = [song('c', 'calm'), song('c2', 'calm'), song('d', 'wistful'), song('d2', 'wistful'), song('b', 'bright')];
    expect(scoreSetlist(good).score).toBeGreaterThan(scoreSetlist(bad).score + 20);
    expect(ENERGY.angry).toBeGreaterThan(ENERGY.calm);
  });
  it('화면에서 고른 순서가 다음 공연에 쓰인다', () => {
    const s = adult();
    if (s.songs.length < 2) return;
    const ids = s.songs.slice(0, 2).map((x) => x.id);
    const t = setSetlist(s, [...ids, 'nope']);
    expect(chosenSetlist(t)!.map((x) => x.id)).toEqual(ids);
  });
});

describe('운명 코드', () => {
  it('코드를 주고받으면 같은 출생이 된다', () => {
    const f = { country: 'BR' as const, birthYear: 1967, gender: 'm' as const, seed: 123456789 };
    const code = encodeFate(f);
    expect(code).toMatch(/^BR-1967M-[0-9A-Z]+$/);
    expect(decodeFate(code.toLowerCase())).toEqual(f);
    expect(decodeFate(' br 1967m ' + code.split('-')[2])).toEqual(f);
    expect(decodeFate('XX-1967M-ABC')).toBeNull();
    expect(decodeFate('KR-1800F-ABC')).toBeNull();
    const a = newGame({ name: fateName(f), gender: f.gender, birthYear: f.birthYear, country: f.country, seed: f.seed });
    const b = newGame({ name: fateName(f), gender: f.gender, birthYear: f.birthYear, country: f.country, seed: f.seed });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('돈 표시', () => {
  it('어느 나라 인생이든 돈은 원으로 보인다', () => {
    expect(won(12_000_000)).toBe('1,200만원');
    let s = newGame({ name: '하늘 테스트', gender: 'f', birthYear: 1990, seed: 61, country: 'US' });
    for (let i = 0; i < 30 && s.phase !== 'ending'; i++) s = runPeriodAuto(s);
    const text = s.feed.map((f) => `${f.text} ${f.deltas ?? ''}`).join(' ');
    expect(text).not.toMatch(/달러|파운드|유로|헤알|\d엔/);
  });
});

describe('나라별 생활 사건', () => {
  it('id 가 겹치지 않고, 그 나라 인생에만 나온다', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of COUNTRY_LIFE_EVENTS) expect(e.id.startsWith('ct_')).toBe(true);
    let jp = 0;
    for (let i = 0; i < 5; i++) {
      let s = newGame({ name: '하늘 테스트', gender: 'f', birthYear: 1985 + i, seed: 3100 + i, country: 'JP' });
      let g = 0;
      while (s.phase !== 'ending' && s.time - s.player.birthYear < 40 && g++ < 300) s = runPeriodAuto(s, (st) => { if (COUNTRY_LIFE_EVENTS.some((e) => e.id === st.active!.id)) jp++; return st.active!.choices.findIndex((c) => !c.disabled && !c.hidden); });
    }
    expect(jp).toBeGreaterThan(0);
  });
});

describe('리뷰에서 나온 경계 사례', () => {
  it('돈이 바닥나면 시즌 목표가 있어도 알바가 계획에 들어간다', async () => {
    const { recommendedPlan } = await import('../src/sim/plan');
    const s = adult();
    s.player.money = -5_000_000;
    s.player.job = 'none';
    s.goal = startGoal(s, GOALS.find((g) => g.id === 'songs')!);
    const ids = recommendedPlan(s).map((p) => p.id);
    expect(ids.some((id) => id === 'parttime' || id === 'teach')).toBe(true);
  });
  it('군 복무 중엔 목표 기한이 멈춘다', () => {
    const s = adult();
    s.goal = startGoal(s, GOALS.find((g) => g.id === 'songs')!);
    const until = s.goal.until;
    s.player.military = 'serving';
    s.time = until + 0.2;
    expect(settleGoal(s, 0.5)).toBeNull();
    expect(s.goal!.until).toBeGreaterThan(until);
  });
  it('만난 적 없는 라이벌과는 엔딩에서 견주지 않는다', async () => {
    const { rivalVerdict } = await import('../src/sim/rival');
    const s = adult();
    s.rival = { name: '모르는 밴드', genre: 'punk', leaderId: 'x', formed: 2010, fans: 100, peak: 5000, potential: 1000, status: 'active', albums: 0, hits: 0, label: 'none' };
    expect(rivalVerdict(s)).toBeNull();
    s.rival.tone = 'fire';
    expect(rivalVerdict(s)).not.toBeNull();
  });
});
