import { it } from 'vitest';
import { newGame, beginPeriod, openEvent, autoChoose, proceed, endPeriod } from '../src/sim/engine';
import type { CountryId } from '../src/sim/data/countries';
import type { GameState } from '../src/sim/types';
it('repeat scan', () => {
  const evCount = new Map<string, number>();
  const evLives = new Map<string, number>();
  const chCount = new Map<string, number>();
  const cts: CountryId[] = ['KR', 'KR', 'US', 'UK', 'JP', 'DE', 'BR'];
  const L = 40;
  for (let i = 0; i < L; i++) {
    let s: GameState = newGame({ name: '검사', gender: i % 2 ? 'm' : 'f', birthYear: 1955 + ((i * 9) % 70), seed: 3100 + i * 17, country: cts[i % 7] });
    const per = new Map<string, number>();
    let g = 0;
    while (s.phase !== 'ending' && g++ < 400) {
      if (s.phase === 'plan') s = beginPeriod(s);
      let k = 0;
      while (s.queue.length && k++ < 6 && s.phase === 'running') {
        s = openEvent(s, s.time);
        if (s.phase === 'event' && s.active) {
          const id = s.active.id;
          per.set(id, (per.get(id) ?? 0) + 1);
          for (const c of s.active.choices) if (!c.hidden) chCount.set(`${id}::${c.label}`, (chCount.get(`${id}::${c.label}`) ?? 0) + 1);
          s = autoChoose(s);
          s = proceed(s);
        }
      }
      if (s.phase === 'running') s = endPeriod(s);
    }
    for (const [id, n] of per) { evCount.set(id, (evCount.get(id) ?? 0) + n); evLives.set(id, (evLives.get(id) ?? 0) + 1); }
  }
  const rows = [...evCount.entries()].map(([id, n]) => [id, n / L, n / (evLives.get(id) ?? 1)] as const).sort((a, b) => b[1] - a[1]).slice(0, 30);
  console.log(rows.map(([id, a, b]) => `${id} perLife=${a.toFixed(2)} perLifeSeen=${b.toFixed(2)}`).join('\n'));
});
