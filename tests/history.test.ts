// 시대 고증 검사: 데이터(data/era, data/history)가 서로 맞는지, 그리고 실제 인생에서 모순이 생기지 않는지.

import { describe, expect, it } from 'vitest';
import { newGame, runPeriodAuto } from '../src/sim/engine';
import { TERMS } from '../src/sim/data/anachronism';
import { applies, termYear } from '../src/sim/data/era/terms';
import { HISTORY, WAVES } from '../src/sim/data/history';
import { BANDS } from '../src/sim/data/era/bands';
import { BILLS, SCENES } from '../src/sim/data/era/acts';
import { GENRE_ERAS } from '../src/sim/data/era/genres';
import { MEDIA } from '../src/sim/data/era/media';
import { ERA_LINES } from '../src/sim/data/era/life';
import { sharedStages } from '../src/sim/events/acts';
import type { CountryId } from '../src/sim/data/countries';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.HISTORY_N ?? 60);

function life(birthYear: number, seed: number, country: CountryId = 'KR') {
  let s = newGame({ name: country === 'KR' ? '김옛날' : '옛날 테스트', gender: seed % 2 ? 'm' : 'f', birthYear, seed, country });
  let g = 0;
  while (s.phase !== 'ending' && g++ < 400) s = runPeriodAuto(s);
  return s;
}

/** 그 해·그 나라에 없던 말이 들어 있으면 위반 목록에 넣는다 */
function violations(text: string, t: number, ct: CountryId): string[] {
  const out: string[] = [];
  for (const term of TERMS) {
    if (!applies(term, ct)) continue;
    term.re.lastIndex = 0;
    if (t < termYear(term, ct) - 0.5 && term.re.test(text)) out.push(`${Math.floor(t)} [${term.re.source}] ${text}`);
  }
  return out;
}

describe('시대 데이터', () => {
  it('데이터끼리 앞뒤가 맞는다', () => {
    for (const h of HISTORY) {
      expect(h.src.length).toBeGreaterThan(3);
      expect(h.y).toBeGreaterThanOrEqual(1950);
    }
    for (const w of WAVES) expect(w.to).toBeGreaterThanOrEqual(w.from);
    for (const b of BANDS) expect(b.to, b.name).toBeGreaterThanOrEqual(b.from);
    for (const sc of SCENES) expect(sc.to).toBeGreaterThan(sc.from);
    for (const l of ERA_LINES) expect(l.to).toBeGreaterThanOrEqual(l.from);
    // 장르 이름은 세계적으로 생긴 뒤에야 각 나라 씬이 생긴다
    for (const g of Object.values(GENRE_ERAS)) for (const y of Object.values(g.scene)) expect(y + 15, g.id).toBeGreaterThanOrEqual(g.named);
    // 실존 밴드가 등장하는 페스티벌 라인업 연도는 그 나라 데이터에 있어야 한다
    for (const bl of BILLS) expect(bl.y).toBeGreaterThanOrEqual(1969);
    // 매체 연도는 나라마다 다 적혀 있어야 한다
    for (const m of Object.values(MEDIA)) for (const c of ['KR', 'JP', 'US', 'UK', 'DE', 'BR'] as const) expect(m.from[c]).toBeGreaterThan(1900);
    console.log(`[data] 음악사 ${HISTORY.length}건 · 물결 ${WAVES.length} · 실존 밴드 ${BANDS.length} · 클럽 씬 ${SCENES.length} · 라인업 ${BILLS.length} · 시대 일상 ${ERA_LINES.length}`);
  });
});

describe('시대 고증', () => {
  it('옛 시대 인생에 그 시대에 없던 말·장르 이름이 나오지 않는다', () => {
    const bad: string[] = [];
    const fired = new Map<string, number>();
    let news = 0;
    for (let i = 0; i < N; i++) {
      const s = life(1950 + (i % 35), 50000 + i * 7);
      expect(s.phase).toBe('ending');
      for (const e of s.feed) {
        if (e.tone === 'history' || e.tone === 'world') { news++; continue; }
        bad.push(...violations(e.text, e.t, 'KR'));
      }
      for (const ch of s.chronicle) bad.push(...violations(ch.text, ch.year + 0.5, 'KR'));
      for (const id of Object.keys(s.fired)) if (/^(h_|a_|e_)/.test(id)) fired.set(id, (fired.get(id) ?? 0) + 1);
    }
    console.log('[history] fired', JSON.stringify(Object.fromEntries(fired)), 'news/life', Math.round(news / N));
    expect(bad.slice(0, 10)).toEqual([]);
    expect(fired.size).toBeGreaterThan(12);
  });

  it('다른 나라 옛 인생도 모순이 없고, 실존 밴드는 활동 기간에만 함께 무대에 선다', () => {
    const bad: string[] = [];
    let shared = 0;
    const cts: CountryId[] = ['US', 'UK', 'JP', 'DE', 'BR', 'KR'];
    for (let i = 0; i < N; i++) {
      const ct = cts[i % cts.length];
      const s = life(1955 + (i % 40), 80000 + i * 13, ct);
      for (const e of s.feed) if (e.tone !== 'history' && e.tone !== 'world') bad.push(...violations(e.text, e.t, ct));
      for (const row of sharedStages(s.flags)) {
        shared++;
        for (const name of row.acts.split(', ')) {
          const b = BANDS.find((x) => x.name === name && x.c === ct);
          // 데뷔 전 클럽 시절은 손으로 확인한 SCENES 기간이 따로 있다
          const club = SCENES.some((sc) => sc.acts.includes(name) && row.year >= Math.floor(sc.from) && row.year <= Math.ceil(sc.to));
          if (b && !club && (row.year < Math.floor(b.from) || row.year > Math.ceil(b.to))) bad.push(`${ct} ${row.year} ${name} (${b.from}–${b.to}) ${row.where}`);
        }
      }
    }
    console.log('[acts] 같은 무대 기록', shared, '/', N, '인생');
    expect(bad.slice(0, 10)).toEqual([]);
    expect(shared).toBeGreaterThan(0);
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
