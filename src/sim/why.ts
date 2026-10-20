// 왜 그렇게 됐나 — 팬이 늘고 준 이유, 시즌 목표를 놓친 이유를 한 줄로.
// 숫자만 바뀌면 다음에 무엇을 바꿔야 할지 알 수 없다. 기록에 원인과 다음 한 수를 남긴다.

import type { FeedEntry, GameState } from './types';
import { count } from './korean';
import { unreleased } from './songs';

/** 한 해를 돌아보기 위해 연초에 찍어 두는 값 */
export interface YearMark {
  fans: number;
  gigs: number;
  songs: number;
  albums: number;
  hits: number;
  /** 이 해에 생활 계획으로 한 활동 횟수 (시기 단위) */
  acts: Record<string, number>;
}

export function markYear(s: GameState): YearMark {
  return {
    fans: s.player.fans,
    gigs: Number(s.flags.gigs ?? 0),
    songs: s.songs.length,
    albums: s.albums.length,
    hits: s.songs.filter((x) => x.hit).length,
    acts: {},
  };
}

/** 이번 시기에 한 활동을 센다 */
export function countActs(s: GameState, ids: string[]) {
  const m = (s.yearMark ??= markYear(s));
  for (const id of ids) m.acts[id] = (m.acts[id] ?? 0) + 1;
}

/** 지난 한 해(yr) 돌아보기 — 팬의 증감과 그 원인, 줄었으면 다음 한 수 */
export function yearReview(s: GameState, yr: number, age: number): Omit<FeedEntry, 't'> | null {
  const m = s.yearMark;
  if (!m || age < 14) return null;
  const p = s.player;
  if (!s.band && p.fans < 30 && m.fans < 30) return null;
  const d = p.fans - m.fans;
  const gigs = Number(s.flags.gigs ?? 0) - m.gigs;
  const songs = s.songs.length - m.songs;
  const albums = s.albums.length - m.albums;
  const hits = s.songs.filter((x) => x.hit).length - m.hits;
  const left = s.chronicle.filter((c) => c.year === yr && c.kind === 'band' && c.text.includes('탈퇴')).length;
  const work = (m.acts.parttime ?? 0) + (m.acts.teach ?? 0) + (m.acts.duty ?? 0);
  const sinceRelease = s.time - Number(s.flags.lastRelease ?? -99);
  const up: string[] = [];
  const down: string[] = [];
  if (hits > 0) up.push('입소문이 터졌다');
  if (albums > 0) up.push(`발매 ${albums}장`);
  if (gigs > 0) up.push(`공연 ${gigs}번`);
  if (songs > 0) up.push(`새 곡 ${songs}곡`);
  // 그해의 큰 사건(페스티벌·경연·방송…)이 팬을 데려왔을 수도 있다 — 가장 앞의 하나
  const big = s.chronicle.find((c) => c.year === yr && c.kind === 'big');
  if (big && d > Math.max(200, m.fans * 0.3)) up.unshift(big.text.length > 26 ? `${big.text.slice(0, 25)}…` : big.text);
  if (p.military === 'serving') down.push('군 복무 중');
  else if (s.flags.hiatus) down.push('활동 중단');
  if (s.band && gigs === 0 && p.military !== 'serving') down.push('공연 0번');
  if (s.albums.length && albums === 0 && sinceRelease >= 2) down.push(`새 음반 없이 ${Math.floor(sinceRelease)}년`);
  if (left > 0) down.push(`멤버 ${left}명 탈퇴`);
  if (work >= 2) down.push('생계 일에 쓴 시간이 많았다');
  if (Math.abs(d) < Math.max(10, m.fans * 0.03) && !up.length && !down.length) return null;
  let reasons: string[];
  let tip = '';
  if (d >= 0) {
    reasons = up.length ? up : ['꾸준히 찾아 주는 사람들'];
  } else {
    reasons = down.length ? down : [`활동이 있어도 해마다 7%쯤은 떠난다${up.length ? ` (${up.join(' · ')}로는 못 메웠다)` : ''}`];
    tip =
      p.military === 'serving' ? '' :
      s.band && gigs === 0 ? '다음 해엔 공연부터' :
      (s.albums.length === 0 || sinceRelease >= 2) && unreleased(s).length >= 3 ? `쌓인 곡 ${unreleased(s).length}곡을 내 보자` :
      songs === 0 ? '다음 해엔 새 곡부터' :
      left > 0 ? '남은 멤버와 합주로 다시 맞추자' : '';
  }
  return {
    text: `${yr}년 돌아보기 — 팬 ${d >= 0 ? '+' : '−'}${count(Math.abs(d))}명`,
    tone: d >= 0 ? 'good' : 'bad',
    deltas: `왜: ${reasons.slice(0, 3).join(' · ')}${tip ? ` → ${tip}` : ''}`,
    kind: 'news',
  };
}

/** 한 시기의 팬 감소 이유 (짧게) */
export function fansDownWhy(s: GameState, fansStart: number): string {
  const acts = new Set(s.lastActions.map((x) => x.id));
  if (s.player.military === 'serving') return '군 복무 중 — 무대가 없다';
  if (s.flags.hiatus) return '활동 중단';
  if (s.band && !acts.has('gig') && !acts.has('busking')) return '이번엔 공연이 없었다';
  if (s.time - Number(s.flags.lastRelease ?? -99) >= 2 && fansStart > 300) return '새 노래가 없으면 잊힌다';
  return '관심이 식었다';
}

/** 시즌 목표를 놓친 이유 — 어디까지 왔고, 계획이 목표를 따랐나 */
export function goalMissWhy(base: number, value: number, target: number, hits: number, periods: number): string {
  const span = Math.max(1, target - base);
  const pct = Math.max(0, Math.min(99, Math.round(((value - base) / span) * 100)));
  const follow = periods > 0 ? hits / periods : 0;
  const how =
    periods === 0 ? '' :
    follow < 0.5 ? ` 목표에 맞는 활동을 한 시기는 ${hits}/${periods} — 계획이 목표를 따라가지 않았다.` :
    pct >= 70 ? ` 목표에 맞는 활동은 ${hits}/${periods} — 방향은 맞았고, 시간이 조금 모자랐다.` :
    pct >= 40 ? ` 목표에 맞는 활동은 ${hits}/${periods} — 절반쯤. 같은 계획으로 한 시즌 더면 닿는다.` :
    ` 목표에 맞는 활동은 ${hits}/${periods}인데도 멀었다 — 목표가 지금 처지보다 컸다.`;
  return `${pct}%까지 왔다.${how}`;
}
