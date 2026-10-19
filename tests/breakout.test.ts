// 확 뜰 수 있는 길·어린 시절 돈·잠긴 선택지 검사.
//  - 길은 실제 운영 기간과 매체가 있던 해에만 열린다
//  - 아기·어린이 인생 기록에 음악 소식·발매·계약이 끼어들지 않는다
//  - 갓난아기는 돈이 없고, 용돈은 일곱 살부터, 열아홉에 부모님 돈
//  - 돈이 모자라면 그 선택지는 잠기고, 잠긴 선택지는 고를 수 없다

import { describe, expect, it } from 'vitest';
import { ROUTES, routeOpen } from '../src/sim/events/breakout';
import { newGame, runPeriodAuto, choose, openEvent } from '../src/sim/engine';
import { MEDIA } from '../src/sim/data/era/media';
import type { CountryId } from '../src/sim/data/countries';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.LOGIC_N ?? 36);

describe('확 뜰 수 있는 길', () => {
  it('데이터 모양과 기간이 맞다', () => {
    const ids = new Set<string>();
    for (const r of ROUTES) {
      expect(ids.has(r.id), r.id).toBe(false);
      ids.add(r.id);
      expect(r.from).toBeLessThanOrEqual(r.to);
      expect(r.from).toBeGreaterThanOrEqual(1950);
      expect(r.attempt.dc).toBeGreaterThanOrEqual(2);
      expect(r.attempt.dc).toBeLessThanOrEqual(21);
      expect(['통계', '근사', '가정']).toContain(r.attempt.src);
      expect(r.win.fans[0]).toBeLessThanOrEqual(r.win.fans[1]);
      if (r.jackpot) expect(r.jackpot.fans[0]).toBeGreaterThan(r.win.fans[1] * 0.9);
      expect(r.age[0]).toBeLessThan(r.age[1]);
      expect(r.fact.length).toBeGreaterThan(10);
      // 매체가 필요한 길은 그 매체가 생기기 전엔 열리지 않는다
      for (const k of r.c) {
        for (let y = r.from - 3; y <= r.to + 3; y++) {
          const open = routeOpen(r, y + 0.5, k);
          if (r.need.media && open) expect(y + 0.5 >= MEDIA[r.need.media].from[k], `${r.id} ${k} ${y}`).toBe(true);
          if (y < r.from || y > r.to) expect(open, `${r.id} ${y}`).toBe(false);
        }
      }
      // 어른 무대엔 아이가 못 나간다 (아이 무대는 TV 노래자랑·동요제처럼 실제로 아이가 나가던 곳만)
      if (r.need.band || r.need.released) expect(r.age[0], r.id).toBeGreaterThanOrEqual(13);
    }
    expect(ROUTES.length).toBeGreaterThanOrEqual(30);
    for (const k of ['KR', 'US', 'UK', 'JP', 'DE', 'BR']) expect(ROUTES.filter((r) => r.c.includes(k as CountryId)).length, k).toBeGreaterThanOrEqual(4);
  });

  it('인생에서 실제로 마주치고, 기록은 나이에 맞는다', () => {
    let seen = 0;
    const bad: string[] = [];
    const cts: CountryId[] = ['KR', 'US', 'UK', 'JP', 'DE', 'BR'];
    for (let i = 0; i < N; i++) {
      const ct = cts[i % cts.length];
      let s = newGame({ name: '검사', gender: i % 2 ? 'm' : 'f', birthYear: 1950 + ((i * 11) % 76), seed: 51000 + i * 37, country: ct });
      if (s.player.money !== 0) bad.push(`갓난아기 통장 ${s.player.money}`);
      let g = 0;
      let at7 = -1;
      let at19: number | null = null;
      while (s.phase !== 'ending' && g++ < 400) {
        s = runPeriodAuto(s);
        const a = s.time - s.player.birthYear;
        if (a >= 7.6 && at7 < 0) at7 = s.player.money;
        if (a >= 19.6 && at19 === null) at19 = s.flags.adultGift ? 1 : 0;
      }
      if (at19 === 0) bad.push(`${ct} 열아홉에 부모님 돈이 없다`);
      if (s.fired?.b_route || Object.keys(s.flags).some((k) => k.startsWith('bo:'))) seen++;
      const by = s.player.birthYear;
      for (const f of s.feed) {
        if (f.tone === 'history' && f.t - by < 10) bad.push(`${ct}${by} ${Math.floor(f.t - by)}세 기록에 음악 소식: ${f.text.slice(0, 30)}`);
      }
      for (const c of s.chronicle) {
        if (c.age < 15 && /발매|계약|투어|레이블|슈퍼위크|생방송 진출/.test(c.text)) bad.push(`${ct}${by} ${c.age}세: ${c.text}`);
      }
    }
    expect(bad.slice(0, 12)).toEqual([]);
    expect(seen).toBeGreaterThan(N * 0.25);
  });
});

describe('잠긴 선택지', () => {
  it('돈이 모자라면 잠기고 이유가 보이며, 잠긴 선택지는 고를 수 없다', () => {
    let checked = 0;
    for (let i = 0; i < 30 && checked < 5; i++) {
      let s = newGame({ name: '검사', gender: 'm', birthYear: 1995, seed: 61000 + i * 13, country: 'KR' });
      let g = 0;
      while (s.time - s.player.birthYear < 12 && g++ < 200) s = runPeriodAuto(s);
      if (s.phase === 'ending') continue;
      s = { ...s, phase: 'running', active: null, queue: [{ id: 'w_want', bind: {} }], player: { ...s.player, money: 0, income: 'low' } };
      const o = openEvent(s, s.time);
      if (o.active?.id !== 'w_want') continue;
      checked++;
      const buy = o.active.choices.findIndex((c) => c.label.startsWith('모아 둔 용돈'));
      const ask = o.active.choices.findIndex((c) => c.label.startsWith('부모님께'));
      expect(o.active.choices[buy].lock).toMatch(/돈이 부족하다/);
      expect(o.active.choices[ask].lock).toMatch(/형편|부모님/);
      expect(o.active.choices[buy].disabled).toBe(true);
      expect(choose(o, buy).active?.result).toBeFalsy();
      // 넉넉한 집이면 조를 수 있다
      const rich = openEvent({ ...s, player: { ...s.player, income: 'high' } }, s.time);
      if (rich.active?.id === 'w_want') expect(rich.active.choices[ask].lock).toBeUndefined();
    }
    expect(checked).toBeGreaterThan(0);
  });
});
