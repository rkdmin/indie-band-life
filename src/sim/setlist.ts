// 셋리스트 — 공연에서 곡을 어떤 순서로 할지. 곡의 분위기마다 ‘에너지’가 있고,
// 센 곡으로 열고, 가운데서 한 번 숨을 고르고, 가장 좋은 곡으로 닫으면 관객이 끝까지 따라온다 [가정].

import type { GameState, Mood, Song } from './types';
import { josa } from './korean';

/** 분위기별 에너지 0~1 */
export const ENERGY: Record<Mood, number> = { angry: 0.95, epic: 0.9, bright: 0.75, dreamy: 0.45, wistful: 0.4, calm: 0.25 };
export const SET_SIZE = 5;

/** 셋리스트에 넣을 수 있는 곡 — 완성도 높은 순, 최근 곡 우선으로 최대 8곡 */
export function repertoire(s: GameState): Song[] {
  const mine = s.songs.filter((x) => !s.band || x.bandName === null || x.bandName === s.band.name);
  return [...(mine.length >= SET_SIZE ? mine : s.songs)]
    .sort((a, b) => b.quality + (b.hit ? 15 : 0) + b.writtenYear * 0.5 - (a.quality + (a.hit ? 15 : 0) + a.writtenYear * 0.5))
    .slice(0, 8);
}

export interface SetScore {
  score: number;
  /** 화면에 보여 줄 짧은 평 */
  notes: { ok: boolean; text: string }[];
}

/**
 * 오늘의 관객 — 공연장과 처지에 따라 ‘정답’ 순서가 다르다 [가정].
 *  first    처음 보는 관객(오픈 마이크·팬이 적을 때): 아는 노래(대표곡)를 앞쪽에, 쉬는 곡은 하나까지
 *  regulars 클럽 단골: 신곡(최근 2년 안에 쓴 곡)을 기다린다, 대표곡은 마지막에
 *  seated   소극장·공연장의 앉은 관객: 기승전결 — 센 곡으로 열고, 숨 고르고, 가장 큰 곡으로 닫기
 *  weeknight 평일 밤, 막차 걱정하는 관객: 조용한 곡은 빼고 짧고 세게
 */
export type Crowd = 'first' | 'regulars' | 'seated' | 'weeknight';
export const CROWD: Record<Crowd, { label: string; hint: string }> = {
  first: { label: '처음 보는 관객', hint: '우리를 모르는 사람들 — 아는 노래(대표곡)를 앞쪽에, 조용한 곡은 하나까지' },
  regulars: { label: '클럽 단골', hint: '매번 오는 사람들 — 신곡을 기다린다. 대표곡은 마지막을 위해 아껴 두자' },
  seated: { label: '앉아서 보는 관객', hint: '기승전결 — 센 곡으로 열고, 한 번 숨을 고르고, 가장 큰 곡으로 닫는다' },
  weeknight: { label: '평일 밤 관객', hint: '내일 출근하는 사람들 — 조용한 곡은 빼고 끝까지 세게' },
};

/** 공연장과 처지로 오늘의 관객을 정한다 (평일 밤은 가끔) */
export function crowdFor(venueId: string, s: GameState, roll: number): Crowd {
  if (venueId === 'hall' || venueId === 'arena') return 'seated';
  if (venueId === 'openmic' || s.player.fans < 120) return 'first';
  if (roll < 0.3) return 'weeknight';
  return (s.band?.gigs ?? 0) >= 6 ? 'regulars' : 'first';
}

/**
 * 셋리스트 점수 0~100 — 오늘 관객의 ‘정답’에 얼마나 가까운가.
 * 곡 완성도는 판정에 이미 들어가므로 여기선 순서만 본다 (좋은 곡만 넣는다고 정답이 되지 않게).
 */
export function scoreSetlist(set: Song[], all: Song[] = set, crowd: Crowd = 'seated', now = Math.max(0, ...set.map((x) => x.writtenYear))): SetScore {
  const notes: SetScore['notes'] = [];
  if (!set.length) return { score: 0, notes };
  const e = set.map((x) => ENERGY[x.mood]);
  const n = set.length;
  const top = [...all].sort((a, b) => b.quality + (b.hit ? 20 : 0) - (a.quality + (a.hit ? 20 : 0)))[0];
  const topAt = top ? set.findIndex((x) => x.id === top.id) : -1;
  const quiet = e.filter((x) => x <= 0.45).length;
  let same = 0;
  for (let i = 1; i < n; i++) if (set[i].mood === set[i - 1].mood) same++;
  let got = 0;
  let max = 0;
  const rule = (w: number, ok: boolean, yes: string, no: string) => {
    max += w;
    if (ok) got += w;
    notes.push({ ok, text: ok ? yes : no });
  };
  // 〈제목〉 뒤 조사를 제목 받침에 맞춘다
  const T = (pair: Parameters<typeof josa>[1]) => (top ? `대표곡 〈${top.title}〉${josa(top.title, pair).slice(top.title.length)}` : josa('대표곡', pair));
  switch (crowd) {
    case 'first':
      rule(30, topAt >= 0 && topAt <= 1, `${T('으로/로')} 앞에서 귀를 잡는다`, `${T('을/를')} 앞쪽(1~2번째)에 — 모르는 노래만 이어지면 떠난다`);
      rule(25, e[0] >= 0.7, '센 곡으로 연다', '첫 곡이 조용하다 — 처음 보는 관객은 기다려 주지 않는다');
      rule(20, quiet <= 1, '조용한 곡은 하나까지', `조용한 곡이 ${quiet}곡 — 처음 보는 관객에겐 길다`);
      rule(15, e[n - 1] >= 0.7, '세게 끝낸다', '끝이 약하다');
      rule(10, same === 0, '분위기가 이어지지 않고 바뀐다', `같은 분위기가 ${same}번 이어진다`);
      break;
    case 'regulars': {
      const fresh = set.filter((x) => x.writtenYear >= now - 2).length;
      rule(30, fresh >= 2, `신곡 ${fresh}곡 — 단골이 기다리던 것`, `신곡(최근 2년 안에 쓴 곡)이 ${fresh}곡 — 단골은 늘 듣던 곡만으론 아쉽다`);
      rule(25, topAt === n - 1, `${T('으로/로')} 닫는다`, `${T('은/는')} 마지막을 위해 아껴 두자`);
      rule(15, e[0] >= 0.7, '센 곡으로 연다', '첫 곡이 조용하다');
      rule(15, n >= 4 && e.slice(1, -1).some((x) => x <= 0.45), '가운데서 한 번 숨을 고른다', '쉬어 가는 곡이 없다');
      rule(15, same === 0, '분위기가 이어지지 않고 바뀐다', `같은 분위기가 ${same}번 이어진다`);
      break;
    }
    case 'weeknight':
      rule(35, quiet === 0, '조용한 곡 없이 끝까지 세게', `조용한 곡이 ${quiet}곡 — 막차 시간에 객석이 빠진다`);
      rule(25, e[0] >= 0.7, '센 곡으로 연다', '첫 곡이 조용하다');
      rule(20, e[n - 1] >= Math.max(...e) - 0.05, '마지막 곡이 가장 크다', '끝이 약하다 — 가장 센 곡을 마지막에');
      rule(20, topAt >= 0, `${T('이/가')} 들어 있다`, `${T('이/가')} 빠졌다`);
      break;
    default:
      rule(25, e[0] >= 0.7, '센 곡으로 연다', '첫 곡이 조용하다 — 객석이 늦게 깬다');
      rule(25, n >= 4 && e.slice(1, -1).some((x) => x <= 0.45), '가운데서 한 번 숨을 고른다', '쉬어 가는 곡이 없다 — 관객도 숨이 찬다');
      rule(25, e[n - 1] >= Math.max(...e) - 0.05 || topAt === n - 1, '마지막 곡이 가장 크다', '끝이 약하다 — 가장 센 곡이나 대표곡을 마지막에');
      rule(15, same === 0, '분위기가 이어지지 않고 바뀐다', `같은 분위기가 ${same}번 이어진다`);
      rule(10, topAt >= 0, `${T('이/가')} 들어 있다`, `${T('이/가')} 빠졌다`);
  }
  let score = (got / max) * 100;
  if (n < SET_SIZE) score *= n / SET_SIZE;
  // 맞춘 것 먼저 보이지 않게 — 아직 못 맞춘 것을 위로
  notes.sort((a, b) => Number(a.ok) - Number(b.ok));
  return { score: Math.max(0, Math.min(100, Math.round(score))), notes };
}

/** 점수 → 무대 판정 보정 (정답에 가까울수록 조금: −1 ~ +2, d20 한 칸 = 5%p) */
export const setMod = (score: number) => (score >= 85 ? 2 : score >= 60 ? 1 : score >= 35 ? 0 : -1);
/** 점수 → 새 팬 배율 (0.92 ~ 1.08) */
export const setFanMul = (score: number) => 0.92 + (score / 100) * 0.16;

/** ‘늘 하던 순서’ — 쓴 순서대로 다섯 곡 */
export function habitSetlist(s: GameState): Song[] {
  return [...repertoire(s)].sort((a, b) => a.writtenYear - b.writtenYear || a.id.localeCompare(b.id)).slice(0, SET_SIZE);
}

/** 화면에서 고른 셋리스트 (곡 id 목록) — 없으면 null */
export function chosenSetlist(s: GameState): Song[] | null {
  const raw = s.flags.setlist;
  if (typeof raw !== 'string' || !raw) return null;
  const set = raw.split(',').map((id) => s.songs.find((x) => x.id === id)).filter(Boolean) as Song[];
  return set.length ? set : null;
}
