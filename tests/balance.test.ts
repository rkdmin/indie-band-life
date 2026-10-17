// 자동 플레이 수백 회로 엔딩·사망 나이·스타 확률 분포를 검사한다 (기획서 5장 밸런스 검증).
// 수치는 콘솔에 출력되고, 명백히 망가진 분포만 실패로 처리한다.

import { describe, expect, it } from 'vitest';
import { playLife, type Policy } from './autoplay';
import { EVENTS } from '../src/sim/events';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.BALANCE_N ?? 300);

function run(policy: Policy) {
  const endings: Record<string, number> = {};
  const deaths: number[] = [];
  const turns: number[] = [];
  const fans: number[] = [];
  const seen = new Map<string, number>();
  let bands = 0;
  let albums = 0;
  for (let i = 0; i < N; i++) {
    const { s, seenEvents } = playLife(1000 + i, policy);
    endings[s.ending!.id] = (endings[s.ending!.id] ?? 0) + 1;
    deaths.push(s.player.deathAge!);
    turns.push(s.turn);
    fans.push(s.peakFans);
    if (s.band || s.pastBands.length) bands++;
    albums += s.albums.length;
    for (const id of seenEvents) seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const sortedFans = [...fans].sort((a, b) => a - b);
  return {
    endings,
    avgDeath: avg(deaths),
    under40: deaths.filter((d) => d < 40).length / N,
    avgTurns: avg(turns),
    medianFans: sortedFans[Math.floor(N / 2)],
    top10Fans: sortedFans[Math.floor(N * 0.9)],
    bandRate: bands / N,
    avgAlbums: albums / N,
    seen,
  };
}

describe('밸런스', () => {
  it('뮤지션 정책', () => {
    const r = run('musician');
    console.log('[musician]', JSON.stringify({ ...r, seen: undefined }, null, 1));
    const never = EVENTS.filter((e) => !e.queued && !r.seen.has(e.id)).map((e) => e.id);
    console.log('[musician] 한 번도 안 나온 사건:', never.join(', '));
    expect(r.avgDeath).toBeGreaterThan(65);
    expect(r.avgDeath).toBeLessThan(95);
    expect(r.under40).toBeLessThan(0.05);
    expect(r.bandRate).toBeGreaterThan(0.6);
    expect(Object.keys(r.endings).length).toBeGreaterThanOrEqual(6);
    // 전설은 드물어야 한다
    expect((r.endings.legend ?? 0) / N).toBeLessThan(0.25);
  });
  it('무작위 정책', () => {
    const r = run('random');
    console.log('[random]', JSON.stringify({ ...r, seen: undefined }, null, 1));
    expect(r.avgTurns).toBeGreaterThan(60);
    expect(Object.keys(r.endings).length).toBeGreaterThanOrEqual(5);
  });
});
