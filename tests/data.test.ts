// src/data/**/*.json 스키마 검사. 데이터는 JSON 이라 타입 검사가 없으니 여기서 모양과 값을 확인한다.
// 데이터를 고치면 `npm test` 로 이 검사를 꼭 돌린다.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { GENRES } from '../src/sim/types';

const ROOT = 'src/data';
const COUNTRIES = ['KR', 'JP', 'US', 'UK', 'DE', 'BR'];
const isGenre = (g: unknown) => (GENRES as readonly string[]).includes(g as string);
const isCountry = (c: unknown) => COUNTRIES.includes(c as string);
const isYear = (y: unknown) => typeof y === 'number' && y >= 1900 && y <= 2200;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.json') ? [p] : [];
  });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (p: string): any => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

describe('데이터 파일', () => {
  it('모든 JSON 이 { about, data } 모양이고 UTF-8 로 읽힌다', () => {
    const all = files(ROOT);
    expect(all.length).toBeGreaterThan(20);
    for (const p of all) {
      const raw = readFileSync(p, 'utf8');
      expect(raw.charCodeAt(0), `${p} BOM`).not.toBe(0xfeff);
      expect(raw.includes('\r\n'), `${p} CRLF`).toBe(false);
      const j = JSON.parse(raw);
      expect(typeof j.about, p).toBe('string');
      expect(j.data, p).toBeDefined();
    }
  });

  it('음악사: 나라·연도·종류·출처', () => {
    const kinds = ['release', 'scene', 'festival', 'industry', 'policy', 'world'];
    for (const f of ['kr', 'us', 'uk', 'jp', 'de', 'br', 'global']) {
      for (const h of read(`history/${f}.json`).data) {
        const where = `${f}: ${h.y} ${h.text?.slice(0, 20)}`;
        expect(isYear(h.y), where).toBe(true);
        if (h.m !== undefined) expect(h.m >= 1 && h.m <= 12, where).toBe(true);
        expect(f === 'global' ? h.c === 'GLOBAL' : h.c === f.toUpperCase(), where).toBe(true);
        expect(kinds.includes(h.kind), where).toBe(true);
        if (h.genre) expect(isGenre(h.genre), where).toBe(true);
        expect(h.src?.length, where).toBeGreaterThan(3);
        expect(h.text?.length, where).toBeGreaterThan(5);
        if (h.kind === 'release' && h.genre) expect(h.who, `${where} — 발매에는 주인공(who)이 필요`).toBeTruthy();
      }
    }
    for (const w of read('history/waves.json').data) {
      expect(isCountry(w.c), w.id).toBe(true);
      expect(w.to, w.id).toBeGreaterThanOrEqual(w.from);
      expect(w.genres.every(isGenre), w.id).toBe(true);
      expect(w.ref, w.id).toBeTruthy();
    }
  });

  it('밴드·씬·라인업', () => {
    const bands = read('era/bands.json').data;
    const names = new Set<string>();
    for (const b of bands) {
      const k = `${b.c}:${b.name}`;
      expect(names.has(k), `중복 ${k}`).toBe(false);
      names.add(k);
      expect(isCountry(b.c), k).toBe(true);
      expect(isYear(b.from) && isYear(b.to), k).toBe(true);
      expect(b.to, k).toBeGreaterThanOrEqual(b.from);
      expect(b.genres.length && b.genres.every(isGenre), k).toBeTruthy();
    }
    for (const sc of read('era/scenes.json').data) {
      expect(isCountry(sc.c) && sc.to > sc.from && sc.acts.length > 0 && sc.genres.every(isGenre), sc.id).toBe(true);
    }
    for (const bl of read('era/bills.json').data) {
      expect(isCountry(bl.c) && isYear(bl.y) && bl.top.length > 0 && bl.src, bl.id).toBeTruthy();
      // 라인업의 밴드가 bands.json 에 있다면 그 해에 활동 중이어야 한다
      for (const name of bl.top) {
        const b = bands.find((x: { name: string }) => x.name === name);
        if (b) expect(bl.y >= Math.floor(b.from) && bl.y <= Math.ceil(b.to), `${bl.id}: ${name}`).toBe(true);
      }
    }
  });

  it('장르·매체·시대어·일상', () => {
    const genres = read('era/genres.json').data;
    expect(Object.keys(genres).sort()).toEqual([...GENRES].sort());
    for (const g of Object.values(genres) as { id: string; named: number; scene: Record<string, number>; before: [number, string][]; pitch: string }[]) {
      expect(isYear(g.named), g.id).toBe(true);
      expect(Object.keys(g.scene).sort(), g.id).toEqual([...COUNTRIES].sort());
      expect(g.before.length && g.before.every(([y, name]) => typeof y === 'number' && name), g.id).toBeTruthy();
      expect(g.pitch, g.id).toBeTruthy();
    }
    for (const m of Object.values(read('era/media.json').data) as { id: string; from: Record<string, number> }[]) {
      expect(Object.keys(m.from).sort(), m.id).toEqual([...COUNTRIES].sort());
    }
    const media = Object.keys(read('era/media.json').data);
    for (const t of read('era/terms.json').data) {
      expect(() => new RegExp(t.pattern, 'g'), t.pattern).not.toThrow();
      expect(isYear(t.y), t.pattern).toBe(true);
      if (t.media) expect(media.includes(t.media), t.pattern).toBe(true);
      if (t.only) expect(t.only.every(isCountry), t.pattern).toBe(true);
      // 대체어 표는 최신 순(시작 연도 내림차순)이고 0 으로 끝나야 한다
      for (const table of [t.old, t.intl].filter(Boolean)) {
        const ys = table.map((r: [number, string | null]) => r[0]);
        expect([...ys].sort((a, b) => b - a), t.pattern).toEqual(ys);
        expect(ys[ys.length - 1], t.pattern).toBe(0);
      }
    }
    for (const l of read('era/life.json').data) {
      expect(l.to, l.text).toBeGreaterThanOrEqual(l.from);
      if (l.c) expect(l.c.every(isCountry), l.text).toBe(true);
    }
  });

  it('이름: 나라·성별마다 연대 순서, 한글만', () => {
    const given = read('names/given.json').data as Record<string, Record<string, [number, string[]][]>>;
    for (const c of COUNTRIES) {
      for (const g of ['m', 'f']) {
        const t = given[c]?.[g];
        expect(t && t.length >= 6, `${c}/${g} 연대 수`).toBeTruthy();
        const ys = t.map((r) => r[0]);
        expect([...ys].sort((a, b) => a - b), `${c}/${g} 연대 오름차순`).toEqual(ys);
        expect(ys[0], `${c}/${g} 1950년대부터`).toBeLessThanOrEqual(1950);
        for (const [, names] of t) for (const n of names) expect(/^[가-힣]+$/.test(n), `${c}/${g} 이름 ‘${n}’`).toBe(true);
      }
    }
  });

  it('세계·운명 표', () => {
    for (const c of Object.values(read('world/countries.json').data) as { id: string; births: number; lifeExp: number; simReach10k: number }[]) {
      expect(isCountry(c.id) && c.births > 0 && c.lifeExp > 40 && c.simReach10k >= 0, c.id).toBe(true);
      const lt = (c as unknown as { lifeExpTable: [number, number][]; minWageSince: number }).lifeExpTable;
      expect(lt.length > 3 && lt.every((r, i) => i === 0 || r[0] > lt[i - 1][0]), `${c.id} 기대수명 표`).toBe(true);
      expect(isYear((c as unknown as { minWageSince: number }).minWageSince), `${c.id} 최저임금제 시작`).toBe(true);
    }
    for (const [name, t] of Object.entries(read('fate/tables.json').data) as [string, { table: [number, number][] }][]) {
      const ys = t.table.map((r) => r[0]);
      expect([...ys].sort((a, b) => a - b), `${name} 연도 오름차순`).toEqual(ys);
    }
    for (const row of read('fate/parent_jobs.json').data) {
      const sum = Object.values(row.weights as Record<string, number>).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1), `parent_jobs ${row.from} 합계 ${sum}`).toBeLessThan(0.011);
    }
    for (const [scope, eras] of Object.entries(read('world/eras.json').data as Record<string, { from: number; to: number }[]>)) {
      for (let i = 1; i < eras.length; i++) expect(eras[i].from, `${scope} 시대 구분이 빈틈없이 이어져야 한다`).toBeCloseTo(eras[i - 1].to + 0.01, 1);
    }
  });

  it('실존 밴드: 장르는 실제 스타일에서만 나온다 (뮤즈가 메탈이 되지 않게)', () => {
    // 스타일 낱말 → 허용되는 게임 장르. 스타일에 근거가 없는 장르 태그는 틀린 것이다.
    const RULES: [string, RegExp][] = [
      ['shoegaze', /슈게이즈|드림팝/],
      ['metal', /메탈|하드 록|하드록/],
      ['punk', /펑크 록|펑크$|팝 펑크|포스트펑크|이모|하드코어|코믹 펑크|록·펑크/],
      ['folk', /포크|루츠|트로피칼리아|MPB/],
      ['indiepop', /팝|뉴웨이브|일렉트로닉|신스|스카|레게|매드체스터/],
      ['indierock', /록|그런지|크라우트|포스트펑크|브릿팝|뉴웨이브|매드체스터|비주얼/],
    ];
    const bad: string[] = [];
    for (const b of read('era/bands.json').data) {
      if (typeof b.style !== 'string' || !b.style) { bad.push(`${b.name}: 스타일 없음`); continue; }
      for (const g of b.genres) {
        const rule = RULES.find(([k]) => k === g);
        if (!rule || !rule[1].test(b.style)) bad.push(`${b.name}(${b.style}) → ${g}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
