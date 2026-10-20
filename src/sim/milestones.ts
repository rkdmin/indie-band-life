// 업적과 다음 목표. 인생 시뮬레이션은 방향을 잃기 쉽다 — ‘지금 뭘 노리면 좋을지’를 보여 준다.
// 달성 여부는 상태만 보고 판단하는 순수 함수다.

import type { GameState } from './types';
import { age } from './state';

export interface Milestone {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  /** 이 나이 이후에만 목표로 보여 준다 */
  from: number;
  done: (s: GameState) => boolean;
  /** [현재, 목표] — 진행 막대용 */
  progress?: (s: GameState) => [number, number];
}

const gigs = (s: GameState) => (s.flags.gigs as number) || 0;
const released = (s: GameState) => s.songs.filter((x) => x.released).length;
const instSkill = (s: GameState) => (s.player.mainInst ? s.player.skills[s.player.mainInst] : 0);
const topGenre = (s: GameState) => Math.max(...Object.values(s.player.genre));

export const MILESTONES: Milestone[] = [
  { id: 'inst', emoji: '🎸', label: '첫 악기', desc: '평생 함께할 악기를 정한다', from: 7, done: (s) => !!s.player.mainInst },
  // 어린 시절 — 밴드까지 가는 길에 지금 할 수 있는 것 (생활 계획의 음악 학원·음악 듣기·친구랑 놀기로 채운다)
  { id: 'stage1', emoji: '🎈', label: '첫 무대 경험', desc: '학예회·장기자랑에서 사람들 앞에 선다', from: 6, done: (s) => s.player.skills.stage >= 3, progress: (s) => [Math.floor(s.player.skills.stage), 3] },
  { id: 'genre', emoji: '🎧', label: '좋아하는 장르', desc: '음악 듣기로 한 장르에 푹 빠진다', from: 8, done: (s) => topGenre(s) >= 30, progress: (s) => [Math.floor(topGenre(s)), 30] },
  { id: 'friend', emoji: '🤝', label: '음악 친구', desc: '친밀도 40 이상인 친구를 만든다', from: 9, done: (s) => Object.values(s.npcs).some((n) => n.role !== 'parent' && n.affinity >= 40) },
  { id: 'skill20', emoji: '🎶', label: '손에 익은 악기', desc: '음악 학원·연습으로 주 악기 실력 20', from: 9, done: (s) => instSkill(s) >= 20, progress: (s) => [Math.floor(instSkill(s)), 20] },
  { id: 'band', emoji: '🔥', label: '첫 밴드', desc: '중학교 밴드부에 들어가거나, 친구들과 밴드를 만든다', from: 13, done: (s) => !!s.band || s.pastBands.length > 0 },
  { id: 'skill40', emoji: '🎸', label: '합주가 되는 실력', desc: '주 악기 실력 40 — 밴드에서 내 파트를 해낸다', from: 13, done: (s) => instSkill(s) >= 40, progress: (s) => [Math.floor(instSkill(s)), 40] },
  { id: 'song', emoji: '✍️', label: '첫 자작곡', desc: '처음으로 곡을 쓴다', from: 14, done: (s) => s.songs.length > 0, progress: (s) => [s.songs.length, 1] },
  { id: 'gig', emoji: '🎤', label: '첫 무대', desc: '관객 앞에서 공연한다', from: 16, done: (s) => gigs(s) > 0 },
  { id: 'release', emoji: '💿', label: '첫 발매', desc: '곡을 세상에 내놓는다', from: 16, done: (s) => s.albums.length > 0 },
  { id: 'fans100', emoji: '👥', label: '팬 100명', desc: '이름을 기억해 주는 사람들', from: 16, done: (s) => s.peakFans >= 100 || s.player.fans >= 100, progress: (s) => [Math.max(s.player.fans, s.peakFans), 100] },
  { id: 'gigs10', emoji: '🎟️', label: '공연 10회', desc: '무대가 익숙해진다', from: 17, done: (s) => gigs(s) >= 10, progress: (s) => [gigs(s), 10] },
  { id: 'fans1k', emoji: '📣', label: '팬 1,000명', desc: '작은 클럽을 채울 수 있다', from: 18, done: (s) => s.peakFans >= 1000, progress: (s) => [Math.max(s.player.fans, s.peakFans), 1000] },
  { id: 'ep', emoji: '📀', label: 'EP 발매', desc: '세 곡 이상을 하나의 이야기로', from: 18, done: (s) => s.albums.some((a) => a.kind !== 'single') },
  { id: 'label', emoji: '✒️', label: '레이블 계약', desc: '누군가 우리에게 걸었다', from: 19, done: (s) => !!s.band && s.band.label !== 'none' },
  { id: 'hit', emoji: '📈', label: '차트 진입', desc: '모르는 사람들이 우리 노래를 듣는다', from: 19, done: (s) => s.songs.some((x) => x.peak > 0) },
  { id: 'fest', emoji: '🎪', label: '페스티벌 무대', desc: '야외 무대에 선다', from: 19, done: (s) => !!s.flags.bestGigDraw && (s.flags.bestGigDraw as number) >= 3000 },
  { id: 'abroad', emoji: '✈️', label: '해외 무대', desc: '바다 건너 처음 보는 관객 앞에서', from: 20, done: (s) => ((s.flags.abroadGigs as number) || 0) > 0 },
  { id: 'fans10k', emoji: '🌊', label: '팬 1만 명', desc: '소극장 단독공연이 가능해진다', from: 20, done: (s) => s.peakFans >= 10_000, progress: (s) => [Math.max(s.player.fans, s.peakFans), 10_000] },
  { id: 'living', emoji: '🏠', label: '음악으로 월세', desc: '알바 없이 음악만으로 한 해를 산다', from: 20, done: (s) => !!s.flags.livingByMusic },
  { id: 'full', emoji: '🎼', label: '정규 앨범', desc: '일곱 곡 이상의 정규 앨범', from: 21, done: (s) => s.albums.some((a) => a.kind === 'full') },
  { id: 'songs20', emoji: '📚', label: '노래 20곡', desc: '서랍 가득한 노래들', from: 22, done: (s) => s.songs.length >= 20, progress: (s) => [s.songs.length, 20] },
  { id: 'fans100k', emoji: '👑', label: '팬 10만 명', desc: '아레나를 꿈꾼다', from: 24, done: (s) => s.peakFans >= 100_000, progress: (s) => [Math.max(s.player.fans, s.peakFans), 100_000] },
  { id: 'released30', emoji: '🗂️', label: '발매곡 30곡', desc: '디스코그래피가 쌓였다', from: 28, done: (s) => released(s) >= 30, progress: (s) => [released(s), 30] },
];

export function achieved(s: GameState): Set<string> {
  return new Set(MILESTONES.filter((m) => m.done(s)).map((m) => m.id));
}

/** 지금 노려 볼 만한 다음 목표 (나이에 맞는 것 중 아직 못 한 것) */
export function nextGoals(s: GameState, n = 3): Milestone[] {
  const a = age(s);
  return MILESTONES.filter((m) => a >= m.from - 1 && !m.done(s)).slice(0, n);
}
