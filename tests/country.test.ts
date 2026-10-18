// 나라별 인생: 끝까지 진행되는지, 그리고 어디서 태어나면 음악으로 성공하기 쉬운지 비교한다.

import { describe, expect, it } from 'vitest';
import { newGame, runPeriodAuto } from '../src/sim/engine';
import { COUNTRY_IDS } from '../src/sim/data/countries';
import { given } from '../src/sim/korean';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.COUNTRY_N ?? 80);

describe('나라', () => {
  it('여섯 나라 모두 인생이 끝까지 가고, 성공 가능성이 다르다', () => {
    const rows: Record<string, unknown>[] = [];
    for (const ct of COUNTRY_IDS) {
      const fans: number[] = [];
      const deaths: number[] = [];
      let military = 0;
      let foreignNames = 0;
      for (let i = 0; i < N; i++) {
        let s = newGame({ name: ct === 'KR' ? '김하늘' : '하늘 테스트', gender: i % 2 ? 'm' : 'f', birthYear: 1990 + (i % 25), seed: 30000 + i * 11, country: ct });
        let g = 0;
        while (s.phase !== 'ending' && g++ < 400) s = runPeriodAuto(s);
        expect(s.phase).toBe('ending');
        fans.push(s.peakFans);
        deaths.push(s.player.deathAge ?? 0);
        if (s.player.military !== 'none') military++;
        if (Object.values(s.npcs).some((n) => n.name.includes(' '))) foreignNames++;
        // 외국 이름에서도 ‘부르는 이름’이 비지 않아야 한다
        for (const n of Object.values(s.npcs)) expect(given(n.name).length).toBeGreaterThan(0);
      }
      fans.sort((a, b) => a - b);
      // 성공은 ‘터지거나 못 터지거나’ 두 갈래라 중앙값은 흔들린다 — 1만 팬 도달 비율과 기하평균을 본다
      const geo = Math.round(Math.exp(fans.reduce((a, f) => a + Math.log(f + 10), 0) / N) - 10);
      rows.push({
        country: ct,
        reach10k: Math.round((fans.filter((f) => f >= 10_000).length / N) * 100) + '%',
        geoMeanFans: geo,
        medianFans: fans[Math.floor(N / 2)],
        avgDeath: Math.round((deaths.reduce((a, b) => a + b, 0) / N) * 10) / 10,
        militaryShare: military / N,
        foreignNameLives: foreignNames / N,
      });
      if (ct !== 'KR') expect(military).toBe(0);
    }
    console.log('[country]\n' + rows.map((r) => JSON.stringify(r)).join('\n'));
  });
});
