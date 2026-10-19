import { describe, expect, it } from 'vitest';
import { josa, won } from '../src/sim/korean';
import { compose } from '../src/audio/compose';
import { EVENTS } from '../src/sim/events';
import { annualDeathProb, minWage } from '../src/sim/data/world';
import { prob } from '../src/sim/rng';
import { playLife } from './autoplay';
import { tieNumbers } from '../src/sim/data/anachronism';

describe('줄바꿈', () => {
  it('숫자와 단위는 줄이 바뀌지 않게 묶는다 (세 장 · 두 시간 · 3천 명), 다른 낱말은 그대로', () => {
    const N = ' ';
    expect(tieNumbers('공연 제안이 세 장 들어왔다.')).toBe(`공연 제안이 세${N}장 들어왔다.`);
    expect(tieNumbers('진통 두 시간 만에')).toBe(`진통 두${N}시간 만에`);
    expect(tieNumbers('관객 3천 명이 왔다')).toBe(`관객 3천${N}명이 왔다`);
    expect(tieNumbers('열 손가락 열 발가락')).toBe('열 손가락 열 발가락');
    expect(tieNumbers('세 사람이 왔다')).toBe('세 사람이 왔다');
  });
});

describe('한국어 조사', () => {
  it('받침에 맞는 조사를 붙인다', () => {
    expect(josa('민재', '이/가')).toBe('민재가');
    expect(josa('서준', '이/가')).toBe('서준이');
    expect(josa('하늘', '으로/로')).toBe('하늘로');
    expect(josa('지훈', '과/와')).toBe('지훈과');
    expect(josa('민지', '아/야')).toBe('민지야');
  });
  it('금액을 읽기 좋게', () => {
    expect(won(12_000_000)).toBe('1,200만원');
    expect(won(150_000_000)).toBe('1.5억원');
  });
});

describe('세계 데이터', () => {
  it('최저임금은 2026년 10,320원', () => {
    expect(minWage(2026)).toBe(10320);
    expect(minWage(2030)).toBeGreaterThan(10320);
  });
  it('사망확률은 나이에 따라 증가하고 건강이 나쁘면 커진다', () => {
    expect(annualDeathProb(30, 60, 0)).toBeLessThan(0.001);
    expect(annualDeathProb(80, 60, 0)).toBeGreaterThan(0.02);
    expect(annualDeathProb(60, 20, 0)).toBeGreaterThan(annualDeathProb(60, 80, 0));
    expect(annualDeathProb(60, 60, 25)).toBeGreaterThan(annualDeathProb(60, 60, 0));
  });
  it('확률 결합은 0~1 사이', () => {
    expect(prob(0.5)).toBeCloseTo(0.5);
    expect(prob(0.5, 10)).toBeLessThanOrEqual(0.99);
    expect(prob(0.5, -10)).toBeGreaterThanOrEqual(0.01);
  });
});

describe('이벤트 데이터', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('100개 이상의 사건이 있다', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(100);
  });
  it('실존 인물/브랜드를 쓰지 않는다 (대표 키워드 점검)', () => {
    const src = JSON.stringify(EVENTS.map((e) => e.title));
    for (const bad of ['데이식스', 'DAY6', 'QWER', '혁오', '잔나비', '멜론', '유튜브', '인스타']) expect(src).not.toContain(bad);
  });
});

describe('작곡기', () => {
  it('같은 시드 → 같은 곡', () => {
    const a = compose(123, 'indierock', 'bright', 70);
    const b = compose(123, 'indierock', 'bright', 70);
    expect(a).toEqual(b);
    expect(a.notes.length).toBeGreaterThan(200);
  });
  it('장르마다 템포가 다르다', () => {
    expect(compose(5, 'punk', 'angry', 60).bpm).toBeGreaterThan(compose(5, 'folk', 'calm', 60).bpm);
  });
  it('멜로디 음역이 사람 목소리 범위 안에 있다', () => {
    for (const q of [10, 90]) {
      const sc = compose(77, 'indiepop', 'wistful', q);
      for (const n of sc.notes.filter((x) => x.kind === 'lead')) {
        expect(n.midi![0]).toBeGreaterThanOrEqual(55);
        expect(n.midi![0]).toBeLessThanOrEqual(96);
      }
    }
  });
});

describe('엔진', () => {
  it('같은 시드와 같은 선택 → 같은 인생 (결정성)', () => {
    const a = playLife(42, 'musician');
    const b = playLife(42, 'musician');
    expect(a.s.ending).toEqual(b.s.ending);
    expect(a.s.chronicle).toEqual(b.s.chronicle);
  });
  it('인생이 끝까지 진행되고 엔딩이 나온다', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { s } = playLife(seed, 'random');
      expect(s.phase).toBe('ending');
      expect(s.ending).not.toBeNull();
      expect(s.player.deathAge).not.toBeNull();
      expect(s.chronicle.length).toBeGreaterThan(5);
    }
  });
  it('저장 상태는 JSON 왕복이 가능하다', () => {
    const { s } = playLife(9, 'musician');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
