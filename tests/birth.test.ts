// 태어나는 순간과 어린 시절 — 출생 월·태교·아기 때 순간·키·출생증명서의 미래 변수·중학교 밴드부·결혼 줄기.
// 모두 시드를 고정한다.

import { describe, expect, it } from 'vitest';
import { newGame, runPeriodAuto } from '../src/sim/engine';
import { bornAt } from '../src/sim/state';
import { heightAt } from '../src/sim/appearance';
import { playerAppearance } from '../src/sim/appearance';
import { nextGoals } from '../src/sim/milestones';
import type { GameState } from '../src/sim/types';

const monthOf = (t: number) => Math.min(12, Math.floor((t - Math.floor(t)) * 12) + 1);
function ageTo(s: GameState, a: number): GameState {
  let g = 0;
  while (s.phase !== 'ending' && s.time - s.player.birthYear < a && g++ < 300) s = runPeriodAuto(s);
  return s;
}

describe('태어나는 순간', () => {
  it('출생증명서의 달에 태어나고, 태교 사건이 꼭 온다', () => {
    for (let seed = 1; seed <= 48; seed++) {
      let s = newGame({ name: '김하늘', gender: seed % 2 ? 'm' : 'f', birthYear: 2001, seed });
      const m = s.player.birth!.month;
      s = ageTo(s, 1.5);
      const birth = s.feed.find((e) => e.text.startsWith('응애'))!;
      expect(birth, `seed ${seed}`).toBeTruthy();
      expect(Math.floor(birth.t)).toBe(2001);
      expect(monthOf(birth.t), `seed ${seed}`).toBe(m);
      expect(s.feed.some((e) => e.text.startsWith('태교')), `seed ${seed} 태교`).toBe(true);
    }
  });

  it('태어나기 전에는 아기 기록이 없고, 뒤집기는 첫 돌 전에', () => {
    const baby = ['밤마다 우는', '콧노래를 들으면', '모빌을', '뒤집기', '첫걸음마'];
    for (let seed = 1; seed <= 40; seed++) {
      let s = newGame({ name: '김하늘', gender: 'f', birthYear: 1995, seed });
      s = ageTo(s, 4);
      const t0 = bornAt(s);
      for (const e of s.feed) {
        if (e.t < t0) expect(baby.some((b) => e.text.includes(b)), `seed ${seed}: ${e.text}`).toBe(false);
        if (e.text.includes('뒤집기')) expect(e.t - t0).toBeLessThan(1);
      }
    }
  });

  it('출생증명서에 보일 변수에 미래(부모님 이혼·가세·동생)가 섞이지 않는다', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = newGame({ name: '김하늘', gender: 'm', birthYear: 1985, seed });
      for (const d of s.player.fate.draws) {
        if (d.id === 'divorce' || d.id === 'jobloss') expect(d.future).toBe(true);
        if (d.id === 'siblings') expect(!!d.future).toBe(s.player.fate.younger > 0);
      }
    }
  });
});

describe('어린 시절', () => {
  it('키는 성장도표 비율을 따른다 — 다 크면 172cm 인 남자아이는 아홉 살에 130cm 안팎', () => {
    const s = newGame({ name: '김하늘', gender: 'm', birthYear: 2001, seed: 7 });
    const app = { ...playerAppearance({ ...s.player, country: s.player.country }), height: 172 };
    expect(heightAt(app, 9, 'm')).toBeGreaterThanOrEqual(128);
    expect(heightAt(app, 9, 'm')).toBeLessThanOrEqual(135);
    expect(heightAt(app, 0, 'm')).toBe(50);
    expect(heightAt(app, 20, 'm')).toBe(172);
  });

  it('아홉 살에도 노릴 목표가 있다', () => {
    const s = ageTo(newGame({ name: '김하늘', gender: 'f', birthYear: 2005, seed: 3 }), 9);
    expect(nextGoals(s, 3).length).toBeGreaterThan(0);
  });

  it('중학교 밴드부로 열세~열다섯 살에 첫 밴드를 시작하는 인생이 있다', () => {
    let found = 0;
    for (let seed = 1; seed <= 120 && !found; seed++) {
      const s = ageTo(newGame({ name: '김하늘', gender: 'm', birthYear: 2005, seed, country: 'KR' }), 16);
      if (s.flags.middleBand) {
        found++;
        const rec = s.chronicle.find((c) => c.text.includes('밴드부에 들어갔다'))!;
        expect(rec.age).toBeGreaterThanOrEqual(13);
        expect(rec.age).toBeLessThan(16);
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});
