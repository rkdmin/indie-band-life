// 엔딩 단계·배지 빈도 (src/data/fate/ending_odds.json) — 화면의 ‘인생 1,000번 중 N번’.
// 평소엔 데이터가 모든 단계·배지를 담고 있는지만 본다. 기준을 바꾸면 GEN_ODDS=1 로 다시 만든다:
//   GEN_ODDS=1 npx vitest run tests/ending_odds.test.ts

import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { playLife } from './autoplay';
import { ENDINGS, BADGES } from '../src/sim/endings';
import odds from '../src/data/fate/ending_odds.json';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

describe('엔딩 빈도 데이터', () => {
  it.runIf(env.GEN_ODDS === '1')('시뮬레이션으로 다시 만든다', () => {
    const tier: Record<string, number> = {};
    const badge: Record<string, number> = {};
    let N = 0;
    for (const [k, policy] of (['auto', 'musician', 'random'] as const).entries()) {
      for (let i = 0; i < 300; i++) {
        const { s } = playLife(40000 + i * 17 + k * 100000, policy, { birthYear: 1950 + ((i * 7) % 76) });
        N++;
        tier[s.ending!.id] = (tier[s.ending!.id] ?? 0) + 1;
        for (const b of s.ending!.badges ?? []) badge[b] = (badge[b] ?? 0) + 1;
      }
    }
    const per1000 = (x: number) => Math.round((x / N) * 10000) / 10;
    const out = {
      about: `엔딩 단계·배지가 나오는 빈도 — 시뮬레이션 인생 ${N}번(자동·음악가·무작위 플레이 각 ${N / 3}번)에서 센 값, 인생 1,000번당 [근사]. 음악을 거의 안 하는 아래쪽 단계는 시뮬레이션에 잘 안 나온다. GEN_ODDS=1 npx vitest run tests/ending_odds.test.ts 로 다시 만든다.`,
      data: { lives: N, tiers: Object.fromEntries(ENDINGS.map((e) => [e.id, per1000(tier[e.id] ?? 0)])), badges: Object.fromEntries(BADGES.map((b) => [b.id, per1000(badge[b.id] ?? 0)])) },
    };
    writeFileSync('src/data/fate/ending_odds.json', JSON.stringify(out, null, 2) + '\n');
  });
  it('모든 단계·배지의 빈도가 있다', () => {
    for (const e of ENDINGS) expect(odds.data.tiers, e.id).toHaveProperty(e.id);
    for (const b of BADGES) expect(odds.data.badges, b.id).toHaveProperty(b.id);
  });
});
