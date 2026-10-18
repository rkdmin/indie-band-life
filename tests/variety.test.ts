// 다양성 검사: 매번 다른 인생이 나오는가? 그리고 운명 변수가 실제 통계 빈도대로 나오는가?

import { describe, expect, it } from 'vitest';
import { playLife } from './autoplay';
import { newGame } from '../src/sim/engine';
import { Rng } from '../src/sim/rng';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.VARIETY_N ?? 120);

describe('다양성', () => {
  it('인생마다 겪는 사건이 많이 다르다', () => {
    const sets: Set<string>[] = [];
    const endings = new Set<string>();
    const all = new Set<string>();
    const fateCombos = new Set<string>();
    let total = 0;
    for (let i = 0; i < N; i++) {
      const { s, seenEvents } = playLife(5000 + i * 7, i % 2 ? 'auto' : 'random');
      sets.push(seenEvents);
      seenEvents.forEach((e) => all.add(e));
      endings.add(s.ending!.id);
      fateCombos.add(s.player.fate.draws.map((d) => d.label).sort().join('|'));
      total += seenEvents.size;
    }
    // 무작위 쌍 300개의 자카드 유사도 평균 (1 = 완전히 같은 인생)
    const rng = new Rng(1);
    let sim = 0;
    const pairs = 300;
    for (let k = 0; k < pairs; k++) {
      const a = sets[rng.int(0, N - 1)];
      let b = sets[rng.int(0, N - 1)];
      if (a === b) b = sets[(sets.indexOf(a) + 1) % N];
      const inter = [...a].filter((x) => b.has(x)).length;
      const uni = new Set([...a, ...b]).size;
      sim += inter / uni;
    }
    sim /= pairs;
    const report = {
      lives: N,
      avgEventsPerLife: Math.round((total / N) * 10) / 10,
      distinctEventsSeen: all.size,
      avgSimilarity: Math.round(sim * 100) / 100,
      distinctEndings: endings.size,
      distinctFateCombos: fateCombos.size,
    };
    console.log('[variety]', JSON.stringify(report));
    expect(sim).toBeLessThan(0.45);
    expect(endings.size).toBeGreaterThanOrEqual(6);
    expect(fateCombos.size).toBeGreaterThan(N * 0.5);
  });

  it('운명 변수 빈도가 실제 통계와 비슷하다', () => {
    const M = 4000;
    let twins = 0;
    let multi = 0;
    let only = 0;
    let cancer = 0;
    for (let i = 0; i < M; i++) {
      const s = newGame({ name: '김하늘', gender: i % 2 ? 'm' : 'f', birthYear: 2023, seed: 90000 + i });
      const f = s.player.fate;
      if (f.twin) twins++;
      if (f.origin) multi++;
      if (f.older + f.younger === 0) only++;
      if (f.cancerAge !== null) cancer++;
    }
    const r = { twin: twins / M, multicultural: multi / M, onlyChild: only / M, cancerLifetime: cancer / M };
    console.log('[fate rates 2023]', JSON.stringify(r));
    expect(r.twin).toBeGreaterThan(0.04); // 실제 5.5%
    expect(r.twin).toBeLessThan(0.07);
    expect(r.multicultural).toBeGreaterThan(0.04); // 실제 5.3%
    expect(r.multicultural).toBeLessThan(0.067);
    expect(r.cancerLifetime).toBeGreaterThan(0.32); // 실제 남 37.7%·여 34.8%
    expect(r.cancerLifetime).toBeLessThan(0.4);
    expect(r.onlyChild).toBeGreaterThan(0.6); // 합계출산율 0.72 시대엔 외동이 다수
  });
});
