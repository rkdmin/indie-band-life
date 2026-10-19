// 엔딩은 두 겹이다.
//  1) 팬 사다리 14단계 — 그 인생이 얼마나 멀리 닿았나 (최고 팬 + 해외 팬). 위로 갈수록 극단적으로 드물다.
//  2) 특이사항 배지 — 파산·재결합·역주행·요절·오디션 출신처럼 그 인생에만 있던 사연. 여러 개가 함께 붙는다.
// 실패도 엔딩이다. 모든 인생은 사다리 어딘가에 서고, 저마다의 도장을 받는다.

import type { EndingResult, GameState } from './types';
import { bestSong } from './songs';
import { count, given, josa } from './korean';
import { genreLabel } from './data/era/genres';
import { tieNumbers } from './data/anachronism';

export interface EndingDef {
  id: string;
  /** 사다리 단계 (1 이 꼭대기) */
  tier: number;
  title: string;
  subtitle: string;
  emoji: string;
  /** 이 단계에 서는 최소 팬 규모 (fame) — 아래쪽 단계는 대신 test 로 */
  min?: number;
  test?: (s: GameState) => boolean;
  text: (s: GameState) => string;
}

const deathAge = (s: GameState) => s.player.deathAge ?? Math.floor(s.time - s.player.birthYear);
const released = (s: GameState) => s.songs.filter((x) => x.released).length;
const gigs = (s: GameState) => (s.flags.gigs as number) || 0;
/** 이 인생이 닿은 사람 수 — 국내 최고 팬 + 해외 팬 */
export const fame = (s: GameState) => s.peakFans + (s.player.globalFans || 0);
const hadBand = (s: GameState) => !!s.band || s.pastBands.length > 0;
const bandOf = (s: GameState) => s.band?.name ?? s.pastBands[s.pastBands.length - 1]?.name ?? null;
const who = (s: GameState) => (bandOf(s) ? `〈${bandOf(s)}〉` : s.player.name);

export const ENDINGS: EndingDef[] = [
  { id: 't1_world', tier: 1, emoji: '🌍', title: '세계가 아는 이름', subtitle: '지구 반대편에서도 떼창이 나온다', min: 10_000_000,
    text: (s) => `${count(fame(s))}명. 공항마다 기다리는 사람들이 있었다. ${josa(who(s), '은/는')} 한 나라의 밴드가 아니라 한 시대의 소리가 됐다.` },
  { id: 't2_stadium', tier: 2, emoji: '🏟️', title: '스타디움 밴드', subtitle: '5만 석이 매진되는 이름', min: 3_000_000,
    text: (s) => `${count(fame(s))}명의 팬. 축구장 조명 아래서 5만 명이 같은 후렴을 불렀다.` },
  { id: 't3_national', tier: 3, emoji: '📣', title: '온 나라가 아는 밴드', subtitle: '노래방 차트에 늘 있는 노래', min: 1_000_000,
    text: (s) => `${count(fame(s))}명. 할머니도 후렴을 아는 노래가 생겼다.` },
  { id: 't4_chart', tier: 4, emoji: '🥇', title: '차트 1위', subtitle: '한 번은 꼭대기에 섰다', min: 300_000,
    text: (s) => `최고 ${count(fame(s))}명의 팬. 차트 맨 위에 우리 이름이 걸린 날, 멤버들은 합주실에서 컵라면을 먹고 있었다.` },
  { id: 't5_headliner', tier: 5, emoji: '🎪', title: '페스티벌 헤드라이너', subtitle: '마지막 순서는 우리 차례', min: 100_000,
    text: (s) => `${count(fame(s))}명의 팬. 페스티벌 마지막 날, 마지막 순서. 불꽃놀이가 우리 앵콜에 맞춰 터졌다.` },
  { id: 't6_scene', tier: 6, emoji: '🔥', title: '신(scene)의 이름', subtitle: '이 바닥에서 모르면 간첩', min: 30_000,
    text: (s) => `${count(fame(s))}명. 대중은 몰라도, 이 바닥 사람들은 다 안다. 후배들의 인터뷰에 우리 이름이 나온다.` },
  { id: 't7_summer', tier: 7, emoji: '🎆', title: '그해 여름의 노래', subtitle: '한때는 어디서나 들렸다', min: 10_000,
    text: (s) => `${count(fame(s))}명의 팬. 그해 여름, 어디를 가도 그 노래가 나왔다. 그걸로 충분했다.` },
  { id: 't8_club', tier: 8, emoji: '🎟️', title: '클럽 단골 밴드', subtitle: '금요일 밤이면 줄이 섰다', min: 3_000,
    text: (s) => `${count(fame(s))}명. 클럽 사장님은 우리 공연 날이면 맥주를 더 들여놓았다.` },
  { id: 't9_local', tier: 9, emoji: '🏘️', title: '동네의 밴드', subtitle: '우리 동네에선 유명했다', min: 1_000,
    text: (s) => `${count(fame(s))}명. 동네 축제 포스터엔 늘 우리 이름이 있었다.` },
  { id: 't10_friends', tier: 10, emoji: '👥', title: '친구들이 아는 밴드', subtitle: '단톡방에 공연 공지를 올리던', min: 300,
    text: (s) => `${count(fame(s))}명. 공연 날이면 친구들이 친구를 데려왔다. 그 친구의 친구가 팬이 됐다.` },
  { id: 't11_rehearsal', tier: 11, emoji: '🥁', title: '합주실의 밤', subtitle: '밴드는 했다, 무대는 작았다', test: hadBand,
    text: (s) => `밴드를 했다. 팬은 ${count(fame(s))}명이었지만, 새벽 합주실의 소리는 누구보다 컸다.` },
  { id: 't12_demo', tier: 12, emoji: '💾', title: '서랍 속 데모', subtitle: '아무도 듣지 못한 명곡들', test: (s) => s.songs.length > 0,
    text: (s) => `곡 ${s.songs.length}개를 썼다. 대부분 서랍 속에 남았다. 누군가 언젠가 그 폴더를 열지도 모른다.` },
  { id: 't13_bedroom', tier: 13, emoji: '🎸', title: '방구석 기타', subtitle: '방 안에서만 연주했다', test: (s) => !!s.player.mainInst,
    text: () => '악기를 배웠다. 무대엔 서지 않았지만, 퇴근 후 방에서 치는 몇 곡이 하루를 버티게 했다.' },
  { id: 't14_radio', tier: 14, emoji: '📻', title: '라디오를 켜 두는 사람', subtitle: '음악을 사랑한 평범한 인생', test: () => true,
    text: (s) => `무대에 서진 못했지만, 평생 부엌 라디오를 켜 두었다. 음악은 언제나 곁에 있었다. (${s.chronicle.length}개의 기억)` },
];

/** 이 인생이 선 단계 — 팬 규모가 기준을 넘는 가장 높은 단계, 없으면 아래쪽 조건 */
export function endingOf(s: GameState): EndingDef {
  const f = fame(s);
  return ENDINGS.find((e) => (e.min !== undefined ? f >= e.min : e.test!(s)))!;
}

// ───────────────────────── 특이사항 배지 ─────────────────────────
export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  /** 도장 색 */
  ink: 'red' | 'blue' | 'green' | 'gold' | 'purple' | 'black';
  /** 도감에서 아직 못 받은 배지에 보이는 힌트 */
  hint: string;
  test: (s: GameState) => boolean;
  line: (s: GameState) => string;
}

const f = (s: GameState, k: string) => s.flags[k];
const n = (s: GameState, k: string) => Number(s.flags[k] ?? 0);
const firstAlbumAge = (s: GameState) => (s.albums.length ? Math.min(...s.albums.map((a) => a.age)) : null);

export const BADGES: BadgeDef[] = [
  { id: 'phenomenon', emoji: '🌠', title: '세계적 현상', ink: 'gold', hint: '한 곡이 세상을 뒤덮는다', test: (s) => n(s, 'hit_phenomenon') > 0, line: () => '한 곡이 세계를 한 바퀴 돌았다.' },
  { id: 'mega', emoji: '💥', title: '메가 히트', ink: 'gold', hint: '차트를 집어삼킨 노래', test: (s) => n(s, 'hit_mega') > 0, line: () => '차트 1위를 몇 주씩 지켰다.' },
  { id: 'national_hit', emoji: '🎤', title: '국민 히트곡', ink: 'red', hint: '노래방 인기곡이 된다', test: (s) => n(s, 'hit_national') > 0, line: () => '노래방에서 제일 많이 불린 노래.' },
  { id: 'one_summer', emoji: '🎵', title: '한 번의 여름', ink: 'red', hint: '노래 한 곡이 터진다', test: (s) => n(s, 'hadHit') >= 1 && !n(s, 'hit_national') && !n(s, 'hit_mega') && !n(s, 'hit_phenomenon'), line: () => '그해 여름, 그 노래가 어디서나 들렸다.' },
  { id: 'revival', emoji: '📈', title: '역주행', ink: 'red', hint: '잊힌 노래가 다시 뜬다', test: (s) => !!f(s, 'revivalHit'), line: (s) => `〈${s.songs.find((x) => x.revival)?.title ?? '그 노래'}〉, 세상이 늦게 알아봤다.` },
  { id: 'young', emoji: '🕯️', title: '불꽃처럼', ink: 'black', hint: '너무 일찍 꺼진 노래', test: (s) => deathAge(s) < 45 && released(s) > 0, line: (s) => `${deathAge(s)}살. 노래만 남기고 떠났다.` },
  { id: 'centenarian', emoji: '🐢', title: '백 년 가까이', ink: 'green', hint: '아주 오래 산다', test: (s) => deathAge(s) >= 95, line: (s) => `${deathAge(s)}살까지 살았다.` },
  { id: 'global', emoji: '✈️', title: '바다 건너의 이름', ink: 'blue', hint: '국내보다 해외에서 더 유명해진다', test: (s) => s.player.globalFans >= 5000 && s.player.globalFans > s.peakFans * 0.8, line: (s) => `해외 팬 ${count(s.player.globalFans)}명 — 국내보다 많았다.` },
  { id: 'worldtour', emoji: '🌐', title: '월드 투어', ink: 'blue', hint: '세계를 돈다', test: (s) => !!f(s, 'worldTour'), line: () => '여권에 도장이 빼곡해졌다.' },
  { id: 'audition', emoji: '🎙️', title: '오디션 출신', ink: 'purple', hint: '오디션 프로그램에서 붙는다', test: (s) => !!f(s, 'boWin:audition'), line: () => '오디션 무대에서 이름을 알렸다.' },
  { id: 'tv', emoji: '📺', title: '방송이 만든 밴드', ink: 'purple', hint: 'TV 무대가 인생을 바꾼다', test: (s) => !!f(s, 'boWin:tv'), line: () => 'TV 한 번에 인생이 바뀌었다.' },
  { id: 'radio', emoji: '📻', title: '라디오가 키운 밴드', ink: 'purple', hint: '심야 라디오가 알아본다', test: (s) => !!f(s, 'boWin:radio'), line: () => '새벽 라디오가 우리를 처음 틀어 줬다.' },
  { id: 'algorithm', emoji: '📱', title: '알고리즘의 선택', ink: 'purple', hint: '인터넷이 먼저 알아본다', test: (s) => !!f(s, 'boWin:net') || !!f(s, 'boWin:revival'), line: () => '알고리즘이 우리를 골랐다.' },
  { id: 'legend_stage', emoji: '🤘', title: '전설과 한 무대', ink: 'red', hint: '실존 밴드와 세 번 같은 무대에 선다', test: (s) => String(f(s, 'sharedStages') ?? '').split(';').filter(Boolean).length >= 3, line: () => '실존 밴드와 같은 포스터에 이름이 올랐다.' },
  { id: 'bankrupt', emoji: '🥀', title: '바닥에서 부른 노래', ink: 'black', hint: '파산을 겪는다', test: (s) => !!f(s, 'bankrupt'), line: () => '빚과 실패를 겪었다. 그 시절 곡이 제일 진짜였다.' },
  { id: 'reunion', emoji: '🤝', title: '다시, 우리', ink: 'green', hint: '흩어진 밴드가 다시 모인다', test: (s) => !!f(s, 'reunion'), line: () => '흰머리가 늘어난 얼굴로 다시 모였다.' },
  { id: 'lifelong', emoji: '🎸', title: '평생 현역', ink: 'green', hint: '65살 넘어서도 무대에 선다', test: (s) => (!!f(s, 'gigAfter65') || !!f(s, 'lifelong')) && gigs(s) >= 40, line: (s) => `${gigs(s)}번의 무대. 은퇴는 끝내 배우지 않았다.` },
  { id: 'mentor', emoji: '🧑‍🏫', title: '다음 세대의 등불', ink: 'green', hint: '제자를 키운다', test: (s) => (!!f(s, 'mentor') && n(s, 'teachCount') >= 30) || n(s, 'teachCount') >= 120, line: () => '제자들이 무대에 설 때마다 맨 뒤에서 박수를 쳤다.' },
  { id: 'livelihood', emoji: '🏠', title: '음악으로 월세를 낸 사람', ink: 'green', hint: '음악만으로 먹고산다', test: (s) => !!f(s, 'livingByMusic'), line: (s) => `${f(s, 'livingByMusic')}년부터 알바 없이 음악으로 살았다.` },
  { id: 'cult', emoji: '🌙', title: '아는 사람만 아는', ink: 'purple', hint: '평판은 높고 팬은 적다', test: (s) => s.player.rep >= 30 && fame(s) < 30_000 && s.albums.length >= 3, line: () => '음악가들의 음악가.' },
  { id: 'quit', emoji: '📦', title: '접어 둔 꿈', ink: 'black', hint: '음악을 그만둔다', test: (s) => !!f(s, 'quitMusic'), line: () => '장롱 속 기타 케이스는 끝내 버리지 못했다.' },
  { id: 'late', emoji: '🌅', title: '늦깎이', ink: 'gold', hint: '마흔 넘어 첫 음반', test: (s) => (firstAlbumAge(s) ?? 0) >= 40, line: (s) => `${firstAlbumAge(s)}살에 첫 음반을 냈다.` },
  { id: 'prodigy', emoji: '⚡', title: '신동', ink: 'gold', hint: '열여덟 전에 첫 음반을 내고 크게 뜬다', test: (s) => { const a = firstAlbumAge(s); return a !== null && a <= 18 && fame(s) >= 30_000; }, line: (s) => `${firstAlbumAge(s)}살에 첫 음반, 그리고 단숨에.` },
  { id: 'nomad', emoji: '🚐', title: '밴드 유목민', ink: 'blue', hint: '밴드를 여러 번 갈아탄다', test: (s) => s.pastBands.length + (s.band ? 1 : 0) >= 3, line: (s) => `밴드 ${s.pastBands.length + (s.band ? 1 : 0)}개를 거쳤다.` },
  { id: 'family_stage', emoji: '👨‍👩‍👧', title: '무대와 육아', ink: 'green', hint: '가정을 꾸리고도 무대에 선다', test: (s) => (!!f(s, 'weddingDone') || !!f(s, 'married')) && (!!f(s, 'child') || !!f(s, 'childId')) && gigs(s) >= 10, line: () => '아이를 재우고 공연하러 갔다.' },
  { id: 'military_band', emoji: '🪖', title: '군악대', ink: 'blue', hint: '군대에서도 연주한다', test: (s) => !!f(s, 'militaryBand'), line: () => '군복을 입고도 악기를 놓지 않았다.' },
  { id: 'perfect_pitch', emoji: '🎼', title: '절대음감', ink: 'gold', hint: '타고난 귀', test: (s) => !!f(s, 'perfectPitch'), line: () => '타고난 귀를 가졌다.' },
  { id: 'refused_major', emoji: '🙅', title: '기획사를 거절한 사람', ink: 'red', hint: '대형 기획사 제안을 거절한다', test: (s) => !!f(s, 'refusedMajor'), line: () => '우리 음악은 우리가 했다.' },
  { id: 'gambler', emoji: '🎲', title: '운에 맡긴 인생', ink: 'purple', hint: '운에 맡긴다를 다섯 번', test: (s) => n(s, 'wildCount') >= 5, line: (s) => `${n(s, 'wildCount')}번이나 운에 맡겼다.` },
  { id: 'jackpot', emoji: '💰', title: '한탕', ink: 'gold', hint: '대박을 여러 번 터뜨린다', test: (s) => n(s, 'jpBig') >= 12, line: (s) => `대박이 ${n(s, 'jpBig')}번 터졌다.` },
  { id: 'busts', emoji: '💸', title: '쪽박의 달인', ink: 'black', hint: '쪽박을 여러 번', test: (s) => n(s, 'jpBust') >= 8, line: (s) => `쪽박만 ${n(s, 'jpBust')}번.` },
  { id: 'new_face', emoji: '🪞', title: '새 얼굴', ink: 'purple', hint: '성형이 아주 잘된다', test: (s) => !!f(s, 'surgeryGreat'), line: () => '거울 속 얼굴이 마음에 들었다.' },
  { id: 'regret', emoji: '🩹', title: '후회한 수술', ink: 'black', hint: '성형이 잘못된다', test: (s) => !!f(s, 'surgeryRegret'), line: () => '그 수술만은 되돌리고 싶었다.' },
  { id: 'prolific', emoji: '✍️', title: '다작', ink: 'blue', hint: '곡을 서른다섯 개 넘게 쓴다', test: (s) => s.songs.length >= 35, line: (s) => `곡 ${s.songs.length}개를 썼다.` },
];

export function badgesOf(s: GameState): BadgeDef[] {
  return BADGES.filter((b) => {
    try {
      return b.test(s);
    } catch {
      return false;
    }
  });
}

function avgHappiness(s: GameState) {
  const h = s.history.filter((x) => x.age >= 19);
  if (!h.length) return s.player.stats.happiness;
  return h.reduce((a, x) => a + x.happiness, 0) / h.length;
}

export function score(s: GameState): number {
  const best = bestSong(s);
  return (
    Math.log10(fame(s) + 10) * 12 +
    s.albums.length * 3 +
    (best?.quality ?? 0) * 0.3 +
    s.player.rep * 0.25 +
    avgHappiness(s) * 0.3 +
    Object.values(s.npcs).filter((n) => n.affinity >= 60).length * 2
  );
}

export function computeEnding(s: GameState): EndingResult {
  const def = endingOf(s);
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
    tier: def.tier,
    title: `${def.emoji} ${def.title}`,
    subtitle: def.subtitle,
    text: tieNumbers(def.text(s)) + `\n\n${s.chronicle.length}개의 기억 · 곡 ${s.songs.length}개 (발매 ${released(s)}) · 공연 ${gigs(s)}회`,
    epitaph: epitaphParts.join(' · '),
    rank,
    bestSongId: best?.id ?? null,
    fame: fame(s),
    badges: badgesOf(s).map((b) => b.id),
  };
}
