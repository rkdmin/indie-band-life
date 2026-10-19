// 엔딩 판정. 실패도 엔딩이다 — 모든 인생은 서로 다른 이야기로 끝난다.

import type { EndingResult, GameState } from './types';
import { bestSong } from './songs';
import { count, given, josa } from './korean';
import { genreLabel } from './data/era/genres';

export interface EndingDef {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  test: (s: GameState) => boolean;
  text: (s: GameState) => string;
}

const deathAge = (s: GameState) => s.player.deathAge ?? Math.floor(s.time - s.player.birthYear);
const released = (s: GameState) => s.songs.filter((x) => x.released).length;
const gigs = (s: GameState) => (s.flags.gigs as number) || 0;

export const ENDINGS: EndingDef[] = [
  {
    id: 'legend', title: '전설', subtitle: '이름이 장르가 된 사람', emoji: '👑',
    test: (s) => s.peakFans >= 70_000 && s.albums.length >= 4,
    text: (s) => `최고 ${count(s.peakFans)}명의 팬. 앨범 ${s.albums.length}장. 사람들은 이제 ${josa(s.player.name, '을/를')} 하나의 장르처럼 이야기한다.`,
  },
  {
    id: 'young_genius', title: '불꽃처럼', subtitle: '너무 일찍 꺼진, 그러나 꺼지지 않는 노래', emoji: '🕯️',
    test: (s) => deathAge(s) < 45 && (bestSong(s)?.quality ?? 0) >= 65,
    text: (s) => `${deathAge(s)}살. 짧았지만 남긴 노래들은 아직도 누군가의 이어폰 속에서 재생된다.`,
  },
  {
    id: 'global', title: '바다 건너의 이름', subtitle: '국내보다 해외에서 더 유명했던 밴드', emoji: '✈️',
    test: (s) => s.player.globalFans >= 25_000 && s.player.globalFans > s.peakFans * 0.8,
    text: (s) => `해외 팬 ${count(s.player.globalFans)}명. 서울보다 ${s.flags.worldTour ? '스무 개 도시' : '먼 도시들'}에서 더 많은 사람이 그 노래를 불렀다.`,
  },
  {
    id: 'livelihood', title: '음악으로 먹고산 사람', subtitle: '알바 없이 버틴 해가 있었다', emoji: '🏠',
    test: (s) => !!s.flags.livingByMusic && s.peakFans < 70_000 && s.albums.length >= 3,
    text: (s) => `예술인 절반 가까이가 다른 일을 겸하는 나라에서, ${s.flags.livingByMusic}년부터 음악만으로 월세를 냈다. 화려하진 않았지만 그게 꿈이었다.`,
  },
  {
    id: 'revival', title: '역주행', subtitle: '세상이 늦게 알아본 노래', emoji: '📈',
    test: (s) => !!s.flags.revivalHit,
    text: (s) => {
      const r = s.songs.find((x) => x.revival);
      return `〈${r?.title ?? '그 노래'}〉는 발매 후 몇 년 동안 아무도 몰랐다. 그리고 어느 날, 모두가 알게 되었다.`;
    },
  },
  {
    id: 'cult', title: '컬트 레전드', subtitle: '아는 사람만 아는, 그래서 영원한', emoji: '🌙',
    test: (s) => s.player.rep >= 70 && s.albums.length >= 3,
    text: (s) => `대중은 몰랐지만 음악가들은 알았다. 후배들의 인터뷰에 ${josa(s.player.name, '이/가')} 계속 등장한다.`,
  },
  {
    id: 'one_hit', title: '원 히트 원더', subtitle: '한 번의 여름', emoji: '🎆',
    test: (s) => ((s.flags.hadHit as number) || 0) >= 1 && s.peakFans >= 15_000,
    text: (s) => `그해 여름, 어디를 가도 그 노래가 나왔다. 그걸로 충분했을까? 충분했다.`,
  },
  {
    id: 'reunion', title: '다시, 우리', subtitle: '돌아온 밴드', emoji: '🤝',
    test: (s) => !!s.flags.reunion,
    text: (s) => `흩어졌던 멤버들이 다시 모였다. 흰머리가 늘어난 얼굴로 같은 곡을 연주했다.`,
  },
  {
    id: 'lifelong', title: '평생 현역', subtitle: '마지막 날까지 무대 위에', emoji: '🎸',
    test: (s) => (!!s.flags.gigAfter65 || !!s.flags.lifelong) && gigs(s) >= 40,
    text: (s) => `${deathAge(s)}살까지 ${gigs(s)}번의 무대. 은퇴라는 단어는 끝내 배우지 않았다.`,
  },
  {
    id: 'mentor', title: '다음 세대의 등불', subtitle: '누군가의 첫 기타를 잡아 준 사람', emoji: '🧑‍🏫',
    test: (s) => !!s.flags.mentor || ((s.flags.teachCount as number) || 0) >= 16,
    text: (s) => `직접 스타가 되지는 못했지만, 가르친 제자들이 무대에 설 때마다 객석 맨 뒤에서 박수를 쳤다.`,
  },
  {
    id: 'bankrupt', title: '바닥에서 부른 노래', subtitle: '잃은 건 돈뿐이었다', emoji: '🥀',
    test: (s) => !!s.flags.bankrupt,
    text: (s) => `빚과 실패를 겪었다. 그래도 그 시절 쓴 곡이 가장 진짜였다고, 말년에 웃으며 말했다.`,
  },
  {
    id: 'quit', title: '마음속 밴드', subtitle: '꿈을 접었지만, 잊지는 않은 사람', emoji: '📦',
    test: (s) => !!s.flags.quitMusic,
    text: (s) => `음악을 그만두고 평범하게 살았다. 하지만 장롱 속 기타 케이스는 끝내 버리지 못했다.`,
  },
  {
    id: 'happy_amateur', title: '행복한 아마추어', subtitle: '유명하진 않았지만 행복했다', emoji: '☀️',
    test: (s) => s.songs.length >= 3 && avgHappiness(s) >= 55,
    text: (s) => `팬은 ${count(s.peakFans)}명이 전부였다. 그 ${count(s.peakFans)}명과, 친구들과, 노래가 있어서 충분히 좋은 인생이었다.`,
  },
  {
    id: 'ordinary', title: '라디오를 켜 두는 사람', subtitle: '음악을 사랑한 평범한 인생', emoji: '📻',
    test: () => true,
    text: (s) => `무대에 서진 못했지만, 평생 부엌 라디오를 켜 두었다. 음악은 언제나 곁에 있었다. (${s.chronicle.length}개의 기억)`,
  },
];

function avgHappiness(s: GameState) {
  const h = s.history.filter((x) => x.age >= 19);
  if (!h.length) return s.player.stats.happiness;
  return h.reduce((a, x) => a + x.happiness, 0) / h.length;
}

export function score(s: GameState): number {
  const best = bestSong(s);
  return (
    Math.log10(s.peakFans + 10) * 12 +
    s.albums.length * 3 +
    (best?.quality ?? 0) * 0.3 +
    s.player.rep * 0.25 +
    avgHappiness(s) * 0.3 +
    Object.values(s.npcs).filter((n) => n.affinity >= 60).length * 2
  );
}

export function computeEnding(s: GameState): EndingResult {
  const def = ENDINGS.find((e) => e.test(s))!;
  const sc = score(s);
  const rank: EndingResult['rank'] = sc >= 110 ? 'S' : sc >= 85 ? 'A' : sc >= 60 ? 'B' : 'C';
  const best = bestSong(s);
  const genre = s.band?.genre ?? s.pastBands[0]?.genre;
  const closest = Object.values(s.npcs)
    .filter((n) => n.role !== 'parent')
    .sort((a, b) => b.affinity - a.affinity)[0];
  const epitaphParts = [
    `${s.player.birthYear}–${s.player.birthYear + deathAge(s)}`,
    genre ? `${genreLabel(genre, (s.band ?? s.pastBands[0])!.formedYear, s.player.country)} 음악가` : '음악을 사랑한 사람',
    best ? `대표곡 〈${best.title}〉` : null,
    closest ? `가장 가까운 사람: ${given(closest.name)}` : null,
  ].filter(Boolean);
  return {
    id: def.id,
    title: `${def.emoji} ${def.title}`,
    subtitle: def.subtitle,
    text: def.text(s) + `\n\n${s.chronicle.length}개의 기억 · 곡 ${s.songs.length}개 (발매 ${released(s)}) · 공연 ${gigs(s)}회`,
    epitaph: epitaphParts.join(' · '),
    rank,
    bestSongId: best?.id ?? null,
  };
}
