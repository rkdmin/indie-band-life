// 논리 모순 검사: 어느 나라·어느 시대에 태어나도 인생 기록이 앞뒤가 맞는지 본다.
//  - 숫자가 망가지지 않는다 (NaN, 음수 팬)
//  - 죽은 뒤의 기록이 없고, 태어나기 전의 기록이 없다
//  - 밴드 멤버는 살아 있고, 밴드는 열 살 넘어서 만든다
//  - 음반은 그 해에 있던 형태로만 낸다 (CD 이전 CD 없음)
//  - 나이에 맞지 않는 사건이 없다 (아이가 결혼하거나 입대하지 않는다)

import { describe, expect, it } from 'vitest';
import { newGame, runPeriodAuto } from '../src/sim/engine';
import type { CountryId } from '../src/sim/data/countries';
import type { GameState } from '../src/sim/types';
import { textMinAge } from '../src/sim/data/anachronism';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const N = Number(env.LOGIC_N ?? 48);

function numbersOk(s: GameState): string[] {
  const out: string[] = [];
  const p = s.player;
  for (const [k, v] of Object.entries({ money: p.money, fans: p.fans, debt: p.debt, rep: p.rep, ...p.stats, ...p.skills })) {
    if (typeof v !== 'number' || !Number.isFinite(v)) out.push(`${k}=${v}`);
  }
  if (p.fans < 0) out.push(`fans<0 (${p.fans})`);
  if (p.debt < 0) out.push(`debt<0 (${p.debt})`);
  for (const n of Object.values(s.npcs)) if (!Number.isFinite(n.affinity) || !Number.isFinite(n.skill)) out.push(`npc ${n.name} NaN`);
  return out;
}

describe('논리 모순', () => {
  it('어느 나라·시대에서도 기록이 앞뒤가 맞는다', () => {
    const bad: string[] = [];
    const cts: CountryId[] = ['KR', 'KR', 'US', 'UK', 'JP', 'DE', 'BR'];
    for (let i = 0; i < N; i++) {
      const ct = cts[i % cts.length];
      const by = 1950 + ((i * 7) % 76);
      let s = newGame({ name: ct === 'KR' ? '김논리' : '논리 테스트', gender: i % 2 ? 'm' : 'f', birthYear: by, seed: 31000 + i * 29, country: ct });
      let g = 0;
      let lastTime = s.time;
      while (s.phase !== 'ending' && g++ < 400) {
        s = runPeriodAuto(s);
        // 숫자는 매 시기 멀쩡해야 한다
        for (const b of numbersOk(s)) bad.push(`${ct}${by} t=${Math.floor(s.time)} ${b}`);
        if (s.time < lastTime) bad.push(`${ct}${by} 시간이 거꾸로 흘렀다 ${lastTime}→${s.time}`);
        lastTime = s.time;
        // 밴드 멤버는 살아 있어야 한다
        if (s.band) for (const id of s.band.memberIds) if (s.npcs[id] && !s.npcs[id].alive) bad.push(`${ct}${by} 죽은 멤버 ${s.npcs[id].name}가 밴드에 남아 있다`);
      }
      const p = s.player;
      const death = by + (p.deathAge ?? 0);
      expect(s.phase).toBe('ending');
      for (const c of s.chronicle) {
        if (c.year < by - 1) bad.push(`${ct}${by} 태어나기 전 기록: ${c.year} ${c.text}`);
        if (c.year > death + 1) bad.push(`${ct}${by} 죽은 뒤 기록: ${c.year} ${c.text}`);
        if (p.deathAge != null && c.age > p.deathAge) bad.push(`${ct}${by} 떠난 나이(${p.deathAge})보다 늦은 기록: ${c.age}세 ${c.text}`);
        // 나이에 맞지 않는 사건
        if (c.age < 16 && /결혼|입대|계약금|대출/.test(c.text)) bad.push(`${ct}${by} ${c.age}세에 어울리지 않는 기록: ${c.text}`);
      }
      for (const b of [...s.pastBands, ...(s.band ? [s.band] : [])]) {
        if (b.formedYear - by < 10) bad.push(`${ct}${by} ${b.formedYear - by}세에 밴드 결성`);
        if (b.endedYear !== null && b.endedYear < b.formedYear) bad.push(`${ct}${by} 밴드가 결성 전에 해체`);
      }
      // 미성년자의 기록에 술·담배·계약·결혼이 없다
      for (const e of s.feed) {
        if (e.tone === 'history' || e.tone === 'world') continue;
        const ag = e.t - by;
        if (ag >= 0 && ag < textMinAge(e.text, ct) - 0.5) bad.push(`${ct}${by} ${Math.floor(ag)}세: ${e.text.slice(0, 60)}`);
      }
      // 취미로 돌아선 뒤엔 팬이 동네 규모를 크게 넘지 않는다
      if (s.flags.hobby && !s.flags.revivalHit && !s.songs.some((x) => x.hit && (x.releasedYear ?? 0) - by >= Number(s.flags.hobby)) && p.fans > 5000) bad.push(`${ct}${by} 취미인데 팬 ${p.fans}`);
      // 군 복무는 한국 남성만
      if (p.military === 'done' && (ct !== 'KR' || p.gender !== 'm')) bad.push(`${ct}${by} ${p.gender} 병역`);
      // 음반 형태: CD 이전 시대에 ‘CD’, 카세트 이전에 ‘카세트’가 기록에 남지 않는다 (시대어 사전이 바꿔 둔다)
      for (const c of s.chronicle) {
        if (ct === 'KR' && c.year < 1985 && /CD/.test(c.text)) bad.push(`${ct}${by} ${c.year} CD: ${c.text}`);
      }
    }
    expect(bad.slice(0, 15)).toEqual([]);
  });
});

describe('태어나는 순간', () => {
  it('출생 변수끼리 서로 모순되지 않고, 인생마다 다르다', async () => {
    const B = (await import('../src/data/fate/birth.json')).default.data as unknown as {
      gifts: { list: { id: string; conflicts?: string[]; notIf?: string[] }[] };
      moments: { list: { t: string; place?: string; c?: string[]; months?: number[]; groups?: string[]; notIf?: string[] }[] };
    };
    const gift = Object.fromEntries(B.gifts.list.map((g) => [g.id, g]));
    const moment = new Map(B.moments.list.map((m) => [m.t, m]));
    const bad: string[] = [];
    const seen = new Set<string>();
    const cts: CountryId[] = ['KR', 'US', 'UK', 'JP', 'DE', 'BR'];
    const M = N * 8;
    for (let i = 0; i < M; i++) {
      const ct = cts[i % cts.length];
      const s = newGame({ name: '출생 검사', gender: i % 2 ? 'm' : 'f', birthYear: 1950 + ((i * 11) % 76), seed: 77000 + i * 13, country: ct });
      const b = s.player.birth!;
      const cond: Record<string, boolean> = { lowWeight: b.lowWeight, preterm: b.preterm };
      const ids = b.gifts.map((g) => g.id);
      for (const id of ids) {
        for (const c of gift[id].conflicts ?? []) if (ids.includes(c)) bad.push(`${id} 와 ${c} 가 함께`);
        for (const k of gift[id].notIf ?? []) if (cond[k]) bad.push(`${id} 인데 ${k}`);
      }
      if (b.dream && ct !== 'KR') bad.push(`${ct} 에서 태몽`);
      const ms = b.moments.map((t) => moment.get(t)!);
      for (const m of ms) {
        if (m.c && !m.c.includes(ct)) bad.push(`${ct} 에 맞지 않는 장면 ‘${m.t.slice(0, 15)}’`);
        if (m.months && !m.months.includes(b.month)) bad.push(`${b.month}월인데 ‘${m.t.slice(0, 15)}’`);
        if (m.place && m.place !== b.place) bad.push(`${b.place} 출생인데 ‘${m.t.slice(0, 15)}’`);
        for (const k of m.notIf ?? []) if (cond[k]) bad.push(`${k} 인데 ‘${m.t.slice(0, 15)}’`);
        if (/술|담배|소주|맥주/.test(m.t)) bad.push(`출생 장면에 술·담배 ‘${m.t.slice(0, 15)}’`);
      }
      if (ms.length === 2 && (ms[0].groups ?? []).some((g) => (ms[1].groups ?? []).includes(g))) bad.push(`같은 묶음 두 장면 ‘${ms[0].t.slice(0, 10)}’ ‘${ms[1].t.slice(0, 10)}’`);
      seen.add([b.blood, b.place, b.dream?.id, ...ids, ...b.moments].join('|'));
    }
    expect(bad.slice(0, 15)).toEqual([]);
    // 거의 모든 인생이 서로 다르게 태어난다
    expect(seen.size).toBeGreaterThan(M * 0.9);
  });
});
