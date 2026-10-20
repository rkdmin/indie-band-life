import { hasMedia } from './data/era/media';
import type { CountryId } from './data/countries';
import type { Album, GameState, Genre, Mood, Song } from './types';
import { Rng, clamp, sigmoid } from './rng';
import { ageInt, chron, favoriteGenre, say, year } from './state';
import { GENRE_INFO, eraOf } from './data/world';
import { countryOf } from './data/countries';
import { bandMembers } from './npc';
import { count, josa, won } from './korean';
import hitsJson from '../data/fate/hits.json';

// 인생 사건이 곡의 주제가 된다. flags 에 theme:<key> 가 쌓이면 작곡 때 추천된다.
export interface Theme {
  key: string;
  label: string;
  words: string[];
  moods: Mood[];
}

export const THEMES: Theme[] = [
  { key: 'youth', label: '열일곱', words: ['교복', '운동장', '방과 후', '음악실', '여름방학'], moods: ['bright', 'wistful'] },
  { key: 'friend', label: '오랜 친구', words: ['너와 나', '골목', '자전거', '편의점 앞', '어깨'], moods: ['bright', 'calm'] },
  { key: 'firstlove', label: '첫사랑', words: ['네 이름', '버스 정류장', '이어폰 한쪽', '봄비', '손끝'], moods: ['wistful', 'dreamy'] },
  { key: 'breakup', label: '이별', words: ['빈방', '마지막 인사', '새벽 세 시', '젖은 우산', '답장'], moods: ['wistful', 'angry', 'calm'] },
  { key: 'city', label: '서울살이', words: ['반지하', '막차', '네온', '월세', '옥탑'], moods: ['angry', 'wistful', 'bright'] },
  { key: 'dream', label: '꿈', words: ['무대', '조명', '아직', '언젠가', '날개'], moods: ['epic', 'bright'] },
  { key: 'military', label: '입대', words: ['까까머리', '편지', '초소', '전역', '휴가'], moods: ['wistful', 'calm'] },
  { key: 'family', label: '가족', words: ['엄마의 라디오', '아버지의 기타', '밥상', '현관', '오래된 사진'], moods: ['calm', 'wistful'] },
  { key: 'loss', label: '상실', words: ['빈자리', '마지막 겨울', '꽃', '안녕', '하늘'], moods: ['calm', 'epic', 'wistful'] },
  { key: 'rage', label: '청춘의 분노', words: ['소음', '벽', '거짓말', '불꽃', '외침'], moods: ['angry', 'epic'] },
  { key: 'night', label: '불면', words: ['천장', '형광등', '네 시', '창문', '고양이'], moods: ['dreamy', 'calm'] },
  { key: 'sea', label: '바다', words: ['파도', '모래', '등대', '수평선', '여름'], moods: ['dreamy', 'bright'] },
  { key: 'band', label: '우리 밴드', words: ['합주실', '앰프', '셋리스트', '뒤풀이', '스틱'], moods: ['bright', 'epic'] },
  { key: 'age', label: '나이 듦', words: ['흰머리', '오래된 노래', '계절', '무릎', '처음처럼'], moods: ['calm', 'wistful'] },
];

export const themeByKey = (k: string) => THEMES.find((t) => t.key === k) ?? THEMES[1];

export function availableThemes(s: GameState): Theme[] {
  const unlocked = THEMES.filter((t) => s.flags[`theme:${t.key}`]);
  const base = ['friend', 'dream', 'night', 'city'];
  const list = [...unlocked];
  for (const k of base) if (!list.find((t) => t.key === k)) list.push(themeByKey(k));
  return list;
}

const TITLE_PATTERNS = [
  (w: string) => w,
  (w: string) => `${w}의 노래`,
  (w: string) => `안녕, ${w}`,
  (w: string) => `${w}에서`,
  (w: string) => `우리의 ${w}`,
  (w: string) => `다시, ${w}`,
  (w: string) => `${w} 블루스`,
];

const LYRIC_LINES: Record<Mood, string[]> = {
  bright: ['{w}까지 달려가자', '오늘만큼은 우리가 주인공', '볼륨을 끝까지 올려', '{w} 위로 쏟아지는 햇살', '아무것도 몰라도 괜찮아'],
  wistful: ['{w}에 두고 온 마음', '그때 우린 왜 몰랐을까', '{w}, 아직도 거기 있니', '지나간 계절이 다시 불러', '돌아보면 늘 너였어'],
  angry: ['{w:을/를} 부숴버려', '더는 참지 않을래', '소리쳐 더 크게', '{w} 따위 필요 없어', '닫힌 문을 걷어차'],
  dreamy: ['{w} 속을 헤엄쳐', '눈을 감으면 들려와', '천천히 녹아내리는 {w}', '꿈인지 모를 새벽', '흐릿한 빛 너머로'],
  calm: ['{w} 옆에 앉아', '괜찮아, 천천히 가도', '조용히 흘러가는 {w}', '오늘도 수고했어', '따뜻한 차 한 잔처럼'],
  epic: ['{w:을/를} 향해 날아올라', '우리는 끝나지 않아', '모두 함께 노래해', '{w} 끝에서 다시 시작해', '마지막 불이 꺼져도'],
};

/** 한국 밖이면 한국에만 있는 말(반지하·옥탑)은 그 나라에 있을 말로 */
const wordsFor = (theme: Theme, country?: string) =>
  (country ?? 'KR') === 'KR' ? theme.words : theme.words.map((w) => ({ 반지하: '다락방', 옥탑: '지붕 위' })[w] ?? w);
export const themeLabel = (theme: Theme, country?: string) => ((country ?? 'KR') !== 'KR' && theme.key === 'city' ? '도시살이' : theme.label);

export function makeTitle(rng: Rng, theme: Theme, country?: string): string {
  const w = rng.pick(wordsFor(theme, country));
  return rng.pick(TITLE_PATTERNS)(w);
}

export function makeLyric(rng: Rng, theme: Theme, mood: Mood, country?: string): string[] {
  const lines = rng.shuffle(LYRIC_LINES[mood]).slice(0, 3);
  return lines.map((l) => {
    const w = rng.pick(wordsFor(theme, country));
    return l.replace('{w:을/를}', josa(w, '을/를')).replace('{w}', w);
  });
}

/** 곡 품질: 작곡 실력 + 밴드 연주력 + 케미 + 장르 친숙도 + 진정성(실제 겪은 주제) + 운 */
export function songQuality(s: GameState, rng: Rng, genre: Genre, themeKey: string): number {
  const p = s.player;
  const members = bandMembers(s);
  const play = members.length ? members.reduce((a, m) => a + m.skill, 0) / members.length : Math.max(p.skills.guitar, p.skills.keys, p.skills.vocal);
  const chem = s.band ? s.band.chemistry : 40;
  const fam = p.genre[genre];
  const authentic = s.flags[`theme:${themeKey}`] ? 8 : 0;
  const tired = p.stats.energy < 30 ? -6 : 0;
  const raw = p.skills.compose * 0.45 + play * 0.2 + chem * 0.1 + fam * 0.15 + authentic + tired + rng.normal(4, 9);
  return clamp(Math.round(raw), 3, 100);
}

export function writeSong(s: GameState, rng: Rng, themeKey: string, mood: Mood): Song {
  const theme = themeByKey(themeKey);
  const genre = s.band?.genre ?? favoriteGenre(s);
  const song: Song = {
    id: `s${s.songs.length + 1}_${rng.int(1000, 9999)}`,
    title: makeTitle(rng, theme, s.player.country),
    genre,
    mood,
    theme: themeLabel(theme, s.player.country),
    lyric: makeLyric(rng, theme, mood, s.player.country),
    quality: songQuality(s, rng, genre, themeKey),
    seed: rng.int(1, 2 ** 30),
    writtenYear: year(s),
    writtenAge: ageInt(s),
    bandName: s.band?.name ?? null,
    released: false,
    releasedYear: null,
    streams: 0,
    peak: 0,
    hit: false,
    revival: false,
    coverSeed: rng.int(1, 2 ** 30),
  };
  s.songs.push(song);
  return song;
}

/** 노래가 갑자기 퍼지는 곳 — 그 시대의 매체 (data/era/media.json) */
function viralWhere(s: GameState): string {
  const k = (s.player.country ?? 'KR') as CountryId;
  if (hasMedia('shortform', s.time, k)) return '숏폼';
  if (hasMedia('youtube', s.time, k)) return '동영상 사이트';
  if (hasMedia('music_tv', s.time, k)) return 'TV 음악 프로그램';
  return '라디오';
}

export const unreleased = (s: GameState) => s.songs.filter((x) => !x.released);

export function bestSong(s: GameState): Song | null {
  const rel = s.songs.filter((x) => x.released);
  const pool = rel.length ? rel : s.songs;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => b.streams + b.quality * 1000 - (a.streams + a.quality * 1000))[0];
}

const HITS = hitsJson.data;
/** 터졌을 때의 크기 — 완성도 90 이상이면 큰 단계가 더 자주 */
export function hitLevel(rng: Rng, quality: number) {
  const boost = quality >= 90 ? HITS.qualityBoost : quality >= 80 ? Math.sqrt(HITS.qualityBoost) : 1;
  const ws = HITS.levels.map((l, i) => l.p * (i >= 2 ? boost : 1));
  return rng.weighted(HITS.levels, (l) => ws[HITS.levels.indexOf(l)])!;
}

/** 발매: 곡들의 품질·팬·평판·장르 도달력·시대로 반응을 계산 */
export function release(s: GameState, rng: Rng, songIds: string[], title: string): Album {
  const songs = songIds.map((id) => s.songs.find((x) => x.id === id)!).filter(Boolean);
  const kind: Album['kind'] = songs.length >= 7 ? 'full' : songs.length >= 3 ? 'ep' : 'single';
  const genre = s.band?.genre ?? favoriteGenre(s);
  const gi = GENRE_INFO[genre];
  const era = eraOf(s.time, s.player.country);
  const avgQ = songs.reduce((a, x) => a + x.quality, 0) / songs.length;
  const p = s.player;
  const labelMul = s.band?.label === 'major' ? 2.2 : s.band?.label === 'indie' ? 1.4 : 1;
  const promo = (s.flags.promo as number) || 0;

  // 도달 청취자: 기존 팬 + 알고리즘 노출. 팬 수에 선형이면 눈덩이가 되므로 완만하게 [가정]
  // 너무 잦은 발매는 청취자를 지치게 한다
  const sinceLast = s.time - ((s.flags.lastRelease as number) ?? -99);
  const fatigue = sinceLast < 1 ? 0.35 : sinceLast < 2 ? 0.7 : 1;
  s.flags.lastRelease = s.time;
  // 최근 급성장한 시장 [통계 기반 가정]: 브라질 녹음 음악 매출 +21.7%(IFPI 2024), 한국 인디 스트리밍 +68%(Spotify 2025 결산)
  const boom = year(s) >= 2022 ? (p.country === 'BR' ? 1.2 : (p.country ?? 'KR') === 'KR' ? 1.35 : 1) : 1;
  const cMul = countryOf(p.country).marketMul * boom;
  const reach = (500 + Math.pow(p.fans, 0.9) * 1.6) * cMul * gi.reach * era.streamMul * labelMul * (1 + promo * 0.15) * (kind === 'full' ? 1.25 : kind === 'ep' ? 1 : 0.7) * fatigue;
  let newFans = 0;
  const best = [...songs].sort((a, b) => b.quality - a.quality)[0];
  for (const song of songs) {
    song.released = true;
    song.releasedYear = year(s);
    song.bandName = s.band?.name ?? p.name;
    const qMul = Math.pow(song.quality / 60, 2.2);
    const share = song === best ? 1 : 0.45;
    song.streams = Math.round(reach * share * qMul * rng.range(0.6, 1.5) * 6);
    newFans += reach * share * 0.035 * qMul * gi.loyalty / songs.length * 1.6;
  }
  // 바이럴은 앨범당 한 번, 가장 좋은 곡만 노린다: 품질·장르 도달력·숏폼 시대
  // 취미 음악인의 곡이 터질 일은 훨씬 드물다 (홍보·유통이 없다)
  const viralP = (sigmoid((best.quality - 80) / 8 + Math.log(gi.reach) + (era.from >= 2022 ? 0.3 : 0) + promo * 0.1 + (p.rep > 50 ? 0.3 : 0) - 2.6)) * (s.flags.hobby ? 0.3 : 1);
  const viral = rng.chance(viralP);
  s.lastResults.push({ text: `🎲 ${viralWhere(s)} 입소문 ${Math.max(1, Math.round(viralP * 100))}% → ${viral ? '터졌다' : '불발'}`, tone: viral ? 'big' : 'neutral', delta: true });
  let hitGlobal = 0;
  if (viral) {
    best.hit = true;
    // 얼마나 크게 터지나 — 대부분은 반짝, 아주 드물게 나라 전체·세계로 (data/fate/hits.json)
    const lv = hitLevel(rng, best.quality);
    const burst = rng.range(1.5, 6) * 1_000_000 * gi.reach * era.streamMul * lv.mul;
    best.streams += Math.round(burst);
    best.peak = rng.int(lv.peak[0], lv.peak[1]);
    best.hitLevel = lv.id;
    const add = (burst / 250) * cMul;
    newFans += add;
    hitGlobal = add * lv.global;
    if (lv.id !== 'spark') s.lastResults.push({ text: `🔥 ${lv.label}`, tone: 'big', delta: true });
    s.flags[`hit_${lv.id}`] = ((s.flags[`hit_${lv.id}`] as number) || 0) + 1;
  } else if (best.streams > 600_000) {
    best.peak = rng.int(41, 100);
  }
  newFans = Math.round(newFans);
  // 해외 팬은 해외 플레이리스트·투어로 생긴 팬층이 있을 때 발매마다 조금씩 는다
  if (hitGlobal > 0) {
    p.globalFans += Math.round(hitGlobal);
    s.lastResults.push({ text: `해외 팬 +${count(Math.round(hitGlobal))}`, tone: 'good', delta: true });
  }
  if (p.globalFans > 0 || gi.id === 'shoegaze' || gi.id === 'metal') {
    const g = Math.round((p.globalFans * 0.12 + newFans * (gi.id === 'shoegaze' || gi.id === 'metal' ? 0.25 : 0.06)) * Math.pow(best.quality / 70, 2));
    p.globalFans += g;
    if (g > 50) s.lastResults.push({ text: `해외 팬 +${count(g)}`, tone: 'good', delta: true });
  }
  // 취미 음악인의 발매는 지인·단골 중심으로만 퍼진다
  p.fans += s.flags.hobby && !s.flags.revivalHit ? Math.round(newFans * 0.35) : newFans;
  // 한 나라 안의 팬은 그 나라 인구가 상한이다
  p.fans = Math.min(p.fans, (HITS.domesticCap as Record<string, number>)[p.country ?? 'KR'] ?? 12_000_000);
  p.rep = clamp(p.rep + ((avgQ - 40) / 25) * (kind === 'full' ? 3 : kind === 'ep' ? 1.8 : 0.8) * fatigue);

  const album: Album = {
    id: `a${s.albums.length + 1}`,
    title,
    kind,
    songIds: songs.map((x) => x.id),
    year: year(s),
    age: ageInt(s),
    bandName: s.band?.name ?? p.name,
    coverSeed: songs[0]?.coverSeed ?? rng.int(1, 1e9),
    genre,
    score: Math.round(clamp(avgQ / 10 + rng.normal(0, 0.8), 1, 10) * 10) / 10,
    sales: Math.round(newFans * rng.range(0.1, 0.4)),
  };
  s.albums.push(album);
  const label = { single: '싱글', ep: 'EP', full: '정규 앨범' }[kind];
  chron(s, `${label} 〈${title}〉 발매`, 'music');
  say(s, `〈${title}〉 발매! 새 팬 ${count(newFans)}명 · 평점 ${album.score}`, 'big');
  const kindLabel = { single: '싱글', ep: 'EP', full: '정규 앨범' }[kind];
  const hit = songs.find((x) => x.hit);
  s.cine.push({ kind: hit ? 'hit' : 'release', scene: hit ? 'arena' : 'recording', kicker: `${year(s)} · ${ageInt(s)}세 · ${kindLabel}`, title: hit ? `〈${hit.title}〉 차트 ${hit.peak}위` : `〈${title}〉`, sub: hit ? '숏폼에서 터졌다. 모르는 사람들이 우리 노래를 부른다.' : `${album.bandName}의 ${kindLabel}이 세상에 나왔다.`, songId: (hit ?? best).id, albumId: album.id, at: s.time });
  if (hit) {
    chron(s, `〈${hit.title}〉 차트 ${hit.peak}위 — 인생이 바뀐 날`, 'big');
    say(s, `〈${hit.title}〉${josa(hit.title, '이/가').slice(hit.title.length)} ${viralWhere(s)}에서 터졌다! 차트 ${hit.peak}위`, 'big');
    s.flags.hadHit = ((s.flags.hadHit as number) || 0) + 1;
  }
  s.flags.promo = 0;
  return album;
}

/** 해마다 발매곡이 조금씩 계속 재생된다. 아주 드물게 역주행. */
export function yearlyStreams(s: GameState, rng: Rng) {
  const era = eraOf(s.time, s.player.country);
  let newStreams = 0;
  for (const song of s.songs) {
    if (!song.released) continue;
    const yearsOld = year(s) - (song.releasedYear ?? year(s));
    const add = Math.round(song.streams * 0.12 * Math.exp(-yearsOld / 5) * era.streamMul);
    song.streams += add;
    newStreams += add;
  }
  // 역주행: 1년에 한 곡만 후보, 인생에 한 번 [가정]
  const candidates = s.songs.filter((x) => x.released && !x.revival && x.quality >= 70 && year(s) - (x.releasedYear ?? year(s)) >= 6);
  if (!s.flags.revivalHit && candidates.length) {
    const song = rng.pick(candidates);
    const yearsOld = year(s) - (song.releasedYear ?? year(s));
    {
      const p = sigmoid((song.quality - 88) / 5 - 4.6 + (era.from >= 2022 ? 0.4 : 0));
      if (rng.chance(p)) {
        s.flags.revivalHit = true;
        song.revival = true;
        song.hit = true;
        song.streams += Math.round(2_000_000 * rng.range(0.5, 3));
        song.peak = rng.int(1, 20);
        s.player.fans += Math.round(song.streams / 150);
        newStreams += song.streams / 2;
        s.queue.push({ id: 'revival', bind: {}, vars: { song: song.title, years: yearsOld } });
      }
    }
  }
  // 음원 정산 [가정]: 아티스트 몫 스트림당 약 3원 → 밴드 n분의 1
  const share = 1 / Math.max(1, (s.band?.memberIds.length ?? 0) + 1);
  const money = Math.round(newStreams * 3 * share);
  if (money > 0) {
    s.player.money += money;
    if (money > 100_000) say(s, `음원 정산금이 들어왔다 (+${won(money)})`, 'good');
  }
}
