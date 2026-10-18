// 옛 시대 인생과 음악사: 시대착오가 없는지, 실제 음악사 사건이 인생에 섞여 드는지 본다.

import { describe, expect, it } from 'vitest';
import { newGame, runPeriodAuto } from '../src/sim/engine';
import { TERMS } from '../src/sim/data/anachronism';
import { HISTORY, WAVES } from '../src/sim/data/history';
import type { CountryId } from '../src/sim/data/countries';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.HISTORY_N ?? 60);

function life(birthYear: number, seed: number, country: CountryId = 'KR') {
  let s = newGame({ name: country === 'KR' ? '김옛날' : '옛날 테스트', gender: seed % 2 ? 'm' : 'f', birthYear, seed, country });
  let g = 0;
  while (s.phase !== 'ending' && g++ < 400) s = runPeriodAuto(s);
  return s;
}

describe('음악사', () => {
  it('데이터: 모든 항목에 출처가 있고, 물결 기간이 말이 된다', () => {
    for (const h of HISTORY) {
      expect(h.src.length).toBeGreaterThan(3);
      expect(h.y).toBeGreaterThanOrEqual(1950);
    }
    for (const w of WAVES) expect(w.to).toBeGreaterThanOrEqual(w.from);
  });

  it('옛 시대 인생에 그 시대에 없던 말이 나오지 않는다', () => {
    const bad: string[] = [];
    const fired = new Map<string, number>();
    let news = 0;
    for (let i = 0; i < N; i++) {
      const s = life(1950 + (i % 35), 50000 + i * 7);
      expect(s.phase).toBe('ending');
      for (const e of s.feed) {
        if (e.tone === 'history') news++;
        for (const t of TERMS) {
          t.re.lastIndex = 0;
          if (e.t < t.y - 0.5 && t.re.test(e.text)) bad.push(`${Math.floor(e.t)} ${e.text}`);
        }
      }
      for (const id of Object.keys(s.fired)) if (id.startsWith('h_')) fired.set(id, (fired.get(id) ?? 0) + 1);
    }
    console.log('[history] fired', JSON.stringify(Object.fromEntries(fired)), 'news/life', Math.round(news / N));
    expect(bad.slice(0, 10)).toEqual([]);
    expect(fired.get('h_influence') ?? 0).toBeGreaterThan(N * 0.3);
  });

  it('물결의 시대에 태어나면 ‘제2의 누구’가 될 기회가 온다', () => {
    let waves = 0;
    let rode = 0;
    for (let i = 0; i < N; i++) {
      const s = life(1966 + (i % 8), 70000 + i * 13, i % 2 ? 'US' : 'UK');
      if (Object.keys(s.flags).some((k) => k.startsWith('wave:'))) waves++;
      if (s.flags.rodeWave) rode++;
    }
    console.log('[history] wave offered', waves, '/', N, 'rode', rode);
    expect(waves).toBeGreaterThan(0);
  });
});
