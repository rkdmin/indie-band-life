// 매 시기 플레이어가 고르는 행동. 비용(컨디션·돈)과 결과는 여기서만 계산한다.

import type { Genre, Inst, Mood, SceneId } from './types';
import { GENRES, INSTRUMENTS } from './types';
import { Ctx } from './ctx';
import { GENRE_INFO, INST_LABEL, VENUES, eraOf, festivalFee, minWage, type Venue } from './data/world';
import { availableThemes, release, unreleased, writeSong } from './songs';
import { favoriteGenre } from './state';
import { randomBandName } from './names';
import { given, josa } from './korean';
import { clamp } from './rng';

export type ParamKind = 'inst' | 'genre' | 'compose' | 'venue' | 'release' | 'friend';

export interface ActionDef {
  id: string;
  label: string;
  emoji: string;
  scene: SceneId;
  energy: number;
  param?: ParamKind;
  desc: (c: Ctx) => string;
  when: (c: Ctx) => boolean;
  /** 고를 수는 없지만 보여 줄 때 이유 */
  locked?: (c: Ctx) => string | null;
  run: (c: Ctx, param?: string) => void;
}

const serving = (c: Ctx) => c.p.military === 'serving';
const free = (c: Ctx) => !serving(c);

export function bandSkill(c: Ctx): number {
  const m = c.members;
  const mine = c.mainSkill;
  if (!m.length) return mine;
  return (m.reduce((a, x) => a + x.skill, 0) + mine) / (m.length + 1);
}

export function gigScore(c: Ctx): number {
  const chem = c.band?.chemistry ?? 50;
  return bandSkill(c) * 0.5 + c.p.skills.stage * 0.3 + chem * 0.2 + (c.p.stats.energy - 50) * 0.1;
}

export function venuesFor(c: Ctx): (Venue & { locked: string | null })[] {
  return VENUES.filter((v) => v.id !== 'local_fest' && v.id !== 'big_fest').map((v) => ({
    ...v,
    locked: c.p.fans < v.minFans ? `팬 ${v.minFans.toLocaleString()}명 이상` : v.cost > 0 && c.p.money < c.krw(v.cost) * 0.3 ? '대관비 부족' : null,
  }));
}

export function playGig(c: Ctx, v: Venue, fest = false) {
  const era = eraOf(c.s.time);
  const base = gigScore(c);
  const gi = GENRE_INFO[c.band?.genre ?? favoriteGenre(c.s)];
  const draw = fest ? v.capacity : Math.min(v.capacity, Math.round((c.p.fans * 0.08 + 15) * era.gigMul * (0.7 + c.rng.next() * 0.6)));
  const fill = draw / v.capacity;
  // 무대 판정 (d20): 공연장이 클수록 난이도가 높다. 보정치는 밴드 연주력·무대 경험·팀워크·컨디션
  const DC: Record<string, number> = { openmic: 8, club_group: 11, club_solo: 13, hall: 15, local_fest: 14, big_fest: 17, arena: 18 };
  const dc = DC[v.id] ?? 12;
  const chem = c.band?.chemistry ?? 50;
  const mod = c.m(bandSkill(c)) + Math.floor(c.m(c.p.skills.stage) / 2) + (chem >= 70 ? 2 : chem < 40 ? -2 : 0) + (c.p.stats.energy < 30 ? -2 : 0);
  const nat = c.rng.int(1, 20);
  const total = nat + mod;
  const grade = nat === 20 || total >= dc + 5 ? 'great' : nat !== 1 && total >= dc ? 'good' : 'bad';
  c.lines.push({ text: `🎲 무대 판정 d20(${nat})${mod >= 0 ? '+' : ''}${mod} = ${total} vs 난이도 ${dc} → ${nat === 20 ? '대성공(자연 20)' : nat === 1 ? '대실패(자연 1)' : grade === 'great' ? '대성공' : grade === 'good' ? '성공' : '실패'}`, tone: grade === 'bad' ? 'bad' : 'good', delta: true });
  void base;
  c.scene(v.scene);
  c.s.flags.lastGigAudience = draw;
  c.s.flags.lastGigGrade = grade;
  c.s.flags.lastGigVenue = v.label;
  c.s.flags.lastGigYear = c.year;
  if (c.band) c.band.gigs++;
  c.inc('gigs');
  if (c.age >= 65) c.set('gigAfter65');

  // 관객 대부분은 이미 팬이다. 새 팬은 데려온 친구들과 페스티벌의 처음 보는 관객에게서 [가정]
  const conv = fest ? (grade === 'great' ? 0.08 : grade === 'good' ? 0.03 : 0.004) : grade === 'great' ? 0.22 : grade === 'good' ? 0.09 : 0.01;
  const fanGain = Math.round(draw * conv * gi.loyalty * c.country.marketMul);
  if (grade === 'great') {
    c.line(`${v.label} — 관객 ${draw.toLocaleString()}명이 떼창했다!`, 'big');
    if (fest || v.capacity >= 700 || !c.flag('firstGreatGig')) {
      c.set('firstGreatGig');
      c.s.cine.push({ kind: 'gig', scene: v.scene, kicker: `${c.year} · ${c.ageInt}세`, title: v.label, sub: `관객 ${draw.toLocaleString()}명이 함께 노래했다.`, at: c.s.time });
    }
    c.stat('happiness', 10);
    if (fest || draw >= 150) c.rep(fest ? 3 : 1);
    if (c.band && (!c.band.bestGig || draw > ((c.s.flags.bestGigDraw as number) || 0))) {
      c.band.bestGig = `${v.label} (${c.year})`;
      c.s.flags.bestGigDraw = draw;
    }
  } else if (grade === 'good') {
    c.line(`${v.label} — 관객 ${draw.toLocaleString()}명, 무난한 공연`, 'good');
    c.stat('happiness', 4);
  } else {
    c.line(`${v.label} — 삑사리, 끊긴 줄, 식은 객석… (${draw.toLocaleString()}명)`, 'bad');
    c.stat('happiness', -6);
    c.stat('stress', 6);
    if (c.band) c.band.chemistry = clamp(c.band.chemistry - 3);
  }
  c.fans(fanGain);
  c.skill('stage', grade === 'bad' ? 1.5 : 2.5);
  const members = c.members.length + 1;
  if (fest) {
    c.money((festivalFee(c.p.fans) * c.country.marketMul) / members, '출연료');
  } else if (c.country.id === 'JP' && (v.id === 'club_group' || v.id === 'club_solo') && draw < 25) {
    // 일본 라이브하우스 ‘노르마’: 팔지 못한 할당 티켓 값을 밴드가 메운다 [근사]
    const short = (25 - draw) * c.krw(22_000);
    c.money(-short / members, '노르마(티켓 할당) 자부담');
    c.line('노르마를 못 채웠다. 남은 티켓 값을 멤버들이 나눠 냈다.', 'bad');
  } else if (v.ticket > 0) {
    const revenue = draw * c.krw(v.ticket) * 0.75 - c.krw(v.cost);
    c.money(revenue / members, revenue >= 0 ? '공연 수익' : '공연 적자');
  }
  if (c.band) for (const m of c.members) m.affinity = clamp(m.affinity + (grade === 'great' ? 4 : grade === 'bad' ? -2 : 1), -100, 100);
  if (fill < 0.3 && !fest) c.line('객석이 텅 비어 보였다…', 'bad');
  return grade;
}

export const ACTIONS: ActionDef[] = [
  // ───────────── 어린 시절 (7~12) ─────────────
  {
    id: 'play', label: '친구랑 놀기', emoji: '🛝', scene: 'street', energy: 10,
    desc: () => '놀이터, 피시방, 떡볶이. 친구가 생기고 마음이 자란다.',
    when: (c) => c.age >= 7 && c.age < 13,
    run: (c) => {
      c.stat('happiness', 6);
      c.stat('stress', -5);
      const f = Object.values(c.s.npcs).filter((n) => n.role === 'friend' && n.alive && n.metAge < 13);
      if (f.length && c.roll(0.7)) {
        c.bind.f = c.pick(f).id;
        c.rel('f', 5, '같이 놀던 날');
      } else if (c.roll(0.5)) {
        c.meet('f', { metAt: '동네 놀이터', birthYear: c.p.birthYear + c.rng.int(-1, 1) });
      }
    },
  },
  {
    id: 'lesson', label: '음악 학원', emoji: '🎹', scene: 'musicroom', energy: 15, param: 'inst',
    desc: (c) => `악기 하나를 정해 배운다. 학원비 월 ${Math.round(c.krw(180000) / 10000)}만원 정도.`,
    when: (c) => c.age >= 7 && c.age < 13,
    locked: (c) => (c.p.income === 'low' && c.p.money < c.krw(500000) && !c.flag('scholarship') ? '형편상 학원은 어렵다' : null),
    run: (c, inst) => {
      const i = (inst as Inst) || 'keys';
      c.skill(i, 7 + c.rng.next() * 3);
      c.setInst(i);
      // 학원비는 부모님이 낸다 — 형편이 빠듯하면 집안 분위기가 무거워진다
      if (c.p.income === 'mid' && c.roll(0.3)) c.line('학원비 고지서를 보는 엄마의 한숨을 들었다.', 'neutral');
      c.stat('stress', 3);
      c.inc(`lesson_${i}`);
    },
  },
  {
    id: 'listen', label: '음악 듣기', emoji: '🎧', scene: 'home', energy: 5, param: 'genre',
    desc: () => '라디오, 형 누나의 플레이리스트, 동영상 사이트. 귀가 트인다.',
    when: (c) => c.age >= 7 && free(c) && c.age < 65,
    run: (c, g) => {
      const genre = (g as Genre) || c.pick(GENRES);
      c.genre(genre, 6 + c.rng.next() * 4);
      c.skill('compose', 0.8);
      c.stat('happiness', 3);
      c.stat('stress', -3);
    },
  },
  {
    id: 'study', label: '공부', emoji: '📚', scene: 'classroom', energy: 15,
    desc: (c) => (c.age >= 16 ? '수능까지 얼마 안 남았다. 성적은 선택지를 넓힌다.' : '숙제와 시험. 부모님이 좋아하신다.'),
    when: (c) => c.age >= 7 && c.age < 19,
    run: (c) => {
      c.study(6 + c.rng.next() * 3);
      c.stat('stress', 4);
      if (c.age < 13) c.stat('happiness', -1);
    },
  },
  {
    id: 'sports', label: '운동', emoji: '🏃', scene: 'street', energy: 12,
    desc: () => '체력은 무대에서 오래 버티는 힘. 장기 건강에도 좋다.',
    when: (c) => c.age >= 7 && free(c),
    run: (c) => {
      c.stat('health', c.age > 50 ? 3 : 2);
      c.stat('stress', -6);
      c.p.habits.exercise = Math.min(3, c.p.habits.exercise + 0.5);
    },
  },
  // ───────────── 음악 ─────────────
  {
    id: 'practice', label: '개인 연습', emoji: '🎸', scene: 'studio', energy: 18, param: 'inst',
    desc: (c) => (c.p.mainInst ? `손끝에 굳은살이 박인다. 주 악기: ${INST_LABEL[c.p.mainInst]}` : '악기를 하나 골라 파고든다.'),
    when: (c) => c.age >= 13 && (free(c) || !!c.flag('militaryBand')),
    run: (c, inst) => {
      const i = (inst as Inst) || c.p.mainInst || 'guitar';
      const diligence = c.p.stats.energy > 40 ? 1 : 0.6;
      c.skill(i, (6 + c.rng.next() * 4) * diligence);
      c.setInst(i);
      c.stat('stress', 2);
      if (c.roll(0.2)) c.skill('compose', 1.5);
    },
  },
  {
    id: 'compose', label: '작곡', emoji: '✍️', scene: 'home', energy: 20, param: 'compose',
    desc: (c) => `인생의 장면을 노래로. 지금 쓸 수 있는 주제 ${availableThemes(c.s).length}개`,
    when: (c) => c.age >= 14 && free(c),
    locked: (c) => (c.p.skills.compose < 8 && !c.p.mainInst ? '악기를 먼저 배워야 한다' : null),
    run: (c, param) => {
      const [theme, mood] = (param || 'friend:bright').split(':');
      const song = writeSong(c.s, c.rng, theme, mood as Mood);
      c.skill('compose', 4 + c.rng.next() * 2);
      c.stat('stress', 3);
      c.line(`신곡 〈${song.title}〉 완성 — 완성도 ${song.quality}`, song.quality >= 70 ? 'big' : 'good');
      c.line(`“${song.lyric[0]}”`, 'neutral');
      c.s.flags.lastSongId = song.id;
    },
  },
  {
    id: 'rehearse', label: '밴드 합주', emoji: '🥁', scene: 'studio', energy: 18,
    desc: (c) => `합주실 2시간 ${Math.round(c.krw(20000) * 2 / 10000)}만원. 실력과 팀워크가 함께 오른다.`,
    when: (c) => !!c.band && free(c),
    run: (c) => {
      const band = c.band!;
      c.money(-c.krw(40000) / (c.members.length + 1), '합주실비');
      c.skill(c.p.mainInst || band.playerInst, 4);
      for (const m of c.members) {
        m.skill = clamp(m.skill + 1 + c.rng.next() * 1.5);
        m.affinity = clamp(m.affinity + 2, -100, 100);
        m.lastSeenTurn = c.s.turn;
      }
      band.chemistry = clamp(band.chemistry + 4 + c.rng.next() * 3);
      c.line(`팀워크 ${Math.round(band.chemistry)}`, 'good');
      if (c.roll(0.25)) {
        c.skill('compose', 2);
        c.line('합주 중 즉흥 리프가 하나 나왔다', 'good');
      }
    },
  },
  {
    id: 'gig', label: '공연하기', emoji: '🎤', scene: 'club', energy: 28, param: 'venue',
    desc: (c) => `팬 ${c.p.fans.toLocaleString()}명. 무대가 우리를 키운다.`,
    when: (c) => c.age >= 16 && free(c) && (!!c.band || c.p.skills.vocal + c.p.skills.guitar > 60),
    run: (c, venueId) => {
      const v = VENUES.find((x) => x.id === venueId) ?? VENUES[0];
      playGig(c, v);
    },
  },
  {
    id: 'busking', label: '버스킹', emoji: '🪕', scene: 'street', energy: 15,
    desc: () => '거리에서 지나가는 사람을 멈춰 세우는 연습.',
    when: (c) => c.age >= 15 && free(c) && c.age < 70,
    run: (c) => {
      const score = (c.p.skills.vocal + Math.max(c.p.skills.guitar, c.p.skills.keys)) / 2 + c.rng.normal(0, 12);
      c.scene('street');
      if (score > 45) {
        const crowd = Math.round(20 + score + c.rng.next() * 40);
        c.line(`${crowd}명이 발걸음을 멈췄다`, 'good');
        c.fans(Math.round(crowd * 0.15));
        c.money(c.krw(crowd * 600), '기타 케이스 속');
        c.stat('happiness', 5);
      } else {
        c.line('아무도 멈추지 않았다. 그래도 노래는 끝까지 불렀다.', 'neutral');
        c.stat('stress', 3);
      }
      c.skill('stage', 2);
      c.skill('vocal', 1.5);
    },
  },
  {
    id: 'cover', label: '커버 영상 올리기', emoji: '📱', scene: 'home', energy: 12,
    desc: () => '숏폼에 연주 영상. 알고리즘의 신은 변덕스럽다.',
    when: (c) => c.age >= 14 && c.s.time >= 2008 && free(c) && c.age < 70,
    run: (c) => {
      const sk = c.mainSkill;
      const viral = c.chance(0.03, (sk - 50) / 15, c.s.time >= 2020 ? 0.6 : 0);
      if (c.roll(viral)) {
        const views = Math.round(300000 + c.rng.next() * 2000000);
        c.line(`커버 영상 조회수 ${Math.round(views / 10000)}만! 댓글창이 난리다`, 'big');
        c.fans(Math.round(views / 400));
        c.chron('커버 영상이 처음으로 크게 퍼졌다', 'music');
      } else {
        const views = Math.round(50 + sk * 20 * c.rng.next());
        c.line(`조회수 ${views.toLocaleString()}회`, 'neutral');
        c.fans(Math.round(views / 150));
      }
      c.skill(c.p.mainInst || 'guitar', 2);
    },
  },
  {
    id: 'release', label: '녹음·발매', emoji: '💿', scene: 'recording', energy: 25, param: 'release',
    desc: (c) => `미발매 곡 ${unreleased(c.s).length}개. 싱글·EP·정규 중 선택.`,
    when: (c) => c.age >= 16 && free(c) && unreleased(c.s).length > 0,
    run: (c, param) => {
      const [title, ids] = (param || '').split('|');
      const songIds = ids ? ids.split(',') : [unreleased(c.s)[0].id];
      const n = songIds.length;
      const cost = c.band?.label && c.band.label !== 'none' ? 0 : c.krw(n >= 7 ? 9_000_000 : n >= 3 ? 4_000_000 : 1_200_000);
      if (cost) c.money(-cost, '녹음·마스터링');
      c.scene('recording');
      release(c.s, c.rng, songIds, title || c.s.songs.find((x) => x.id === songIds[0])!.title);
      c.stat('happiness', 8);
    },
  },
  {
    id: 'promo', label: 'SNS 홍보', emoji: '📣', scene: 'home', energy: 8,
    desc: (c) => `광고비 ${Math.round(c.krw(300000) / 10000)}만원. 다음 발매의 초반 화력을 키운다.`,
    when: (c) => c.age >= 17 && free(c) && c.s.time >= 2010,
    run: (c) => {
      c.money(-c.krw(300000), '광고비');
      c.inc('promo');
      c.fans(Math.round(20 + c.p.fans * 0.03));
      c.line('다음 발매 화력 +15%', 'good');
    },
  },
  {
    // SNS 이전 시대의 홍보: 전봇대·클럽 게시판·레코드 가게 유리문
    id: 'flyer', label: '포스터 붙이기', emoji: '🧷', scene: 'street', energy: 10,
    desc: (c) => `인쇄비 ${Math.round(c.krw(60000) / 10000) || 1}만원. 전봇대와 레코드 가게 유리문에 공연 포스터를.`,
    when: (c) => c.age >= 16 && free(c) && c.s.time < 2010 && !!c.band,
    run: (c) => {
      c.money(-c.krw(60000), '포스터 인쇄');
      c.inc('promo');
      c.fans(Math.round(8 + c.p.fans * 0.015));
      c.line('다음 발매 화력 +15%', 'good');
    },
  },
  {
    id: 'network', label: '뒤풀이·인맥', emoji: '🍻', scene: 'pub', energy: 14,
    desc: () => '공연 끝난 클럽 뒤풀이. 사람이 곧 기회다.',
    when: (c) => c.age >= 19 && free(c) && c.age < 70,
    run: (c) => {
      c.money(-c.krw(40000), '술값');
      c.stat('happiness', 3);
      c.p.habits.drinking = Math.min(3, c.p.habits.drinking + 0.2);
      const r = c.rng.next();
      if (r < 0.55) {
        const careers = ['musician', 'musician', 'musician', 'promoter', 'producer', 'journalist'] as const;
        const career = c.pick(careers);
        const n = c.meet('x', { metAt: '공연 뒤풀이', birthYear: c.p.birthYear + c.rng.int(-6, 4), career, skill: c.rng.int(30, 75) });
        c.line(`${given(n.name)} — ${career === 'musician' ? INST_LABEL[n.inst] + ' 연주자' : career === 'promoter' ? '공연 기획자' : career === 'producer' ? '프로듀서' : '음악 기자'}`, 'neutral');
        if (career !== 'musician') c.rep(2);
      } else {
        c.rep(1);
        c.line('명함 몇 장과 숙취를 얻었다', 'neutral');
      }
    },
  },
  {
    id: 'hangout', label: '친구 만나기', emoji: '☕', scene: 'pub', energy: 8, param: 'friend',
    desc: () => '오래된 친구와의 시간. 관계는 돌봐야 이어진다.',
    when: (c) => c.age >= 13 && free(c) && Object.values(c.s.npcs).some((n) => n.alive && n.role !== 'parent' && n.affinity > 0),
    run: (c, id) => {
      const pool = Object.values(c.s.npcs).filter((n) => n.alive && n.role !== 'parent' && n.affinity > 0);
      const n = (id && c.s.npcs[id]) || c.pick(pool);
      c.bind.f = n.id;
      c.rel('f', 6 + c.rng.int(0, 4), c.pick(['밤새 이야기한 날', '같이 라면 먹은 날', '노래방 간 날', '옥상에서 맥주 마신 날']));
      c.stat('happiness', 5);
      c.stat('stress', -6);
    },
  },
  {
    id: 'parttime', label: '아르바이트', emoji: '🧋', scene: 'street', energy: 20,
    desc: (c) => `최저시급 약 ${Math.round(minWage(c.s.time) * c.country.wageMul).toLocaleString()}원${c.country.id !== 'KR' ? '(원화 환산)' : ''} · ${Math.floor(c.s.time)}년. 반년 동안 주 20시간.`,
    when: (c) => c.age >= 16 && free(c) && c.p.job !== 'office' && c.age < 70,
    run: (c) => {
      const pay = minWage(c.s.time) * c.country.wageMul * 20 * 26;
      c.money(pay, '알바비');
      c.stat('stress', 6);
      if (c.roll(0.12)) c.meet('w', { metAt: '알바하던 가게', birthYear: c.p.birthYear + c.rng.int(-3, 3) });
    },
  },
  {
    id: 'teach', label: '레슨하기', emoji: '🧑‍🏫', scene: 'musicroom', energy: 15,
    desc: (c) => `실력 60 이상. 시간당 ${Math.round(c.krw(50000) / 10000)}만원.`,
    when: (c) => c.age >= 20 && free(c),
    locked: (c) => (c.mainSkill < 60 ? '주 악기 실력 60 이상 필요' : null),
    run: (c) => {
      c.money(c.krw(50000) * 40, '레슨비');
      c.skill(c.p.mainInst || 'guitar', 1);
      c.stat('happiness', 2);
      c.inc('teachCount');
      if (c.roll(0.15)) c.meet('st', { metAt: '레슨 제자', birthYear: c.p.birthYear + c.rng.int(10, 25), role: 'fan', affinity: 40 });
    },
  },
  {
    id: 'rest', label: '푹 쉬기', emoji: '🛌', scene: 'home', energy: -25,
    desc: () => '아무것도 안 하는 것도 능력이다. 컨디션 회복.',
    when: () => true,
    run: (c) => {
      c.stat('stress', -14);
      c.stat('happiness', 3);
      c.stat('health', 1);
    },
  },
  {
    id: 'form_band', label: '밴드 결성', emoji: '🔥', scene: 'studio', energy: 15,
    desc: () => '친한 사람들을 모아 밴드를 만든다. 이름도 정한다.',
    when: (c) => c.age >= 16 && !c.band && free(c),
    locked: (c) => (c.p.mainInst ? null : '주 악기가 있어야 한다'),
    run: (c) => {
      formBand(c);
    },
  },
  {
    id: 'recruit', label: '멤버 모집', emoji: '📋', scene: 'studio', energy: 10,
    desc: (c) => `지금 ${c.members.length + 1}인조. 비어 있는 자리: ${missingInst(c).map((i) => INST_LABEL[i]).join(', ') || '없음'}`,
    when: (c) => !!c.band && c.members.length < 4 && free(c),
    run: (c) => {
      recruit(c);
    },
  },
  {
    id: 'checkup', label: '건강검진', emoji: '🩺', scene: 'hospital', energy: 5,
    desc: () => '나이가 들면 몸이 악기다. 병을 일찍 찾는다.',
    when: (c) => c.age >= 35,
    run: (c) => {
      c.money(-c.krw(300000), '검진비');
      c.stat('health', 4);
      if (c.p.habits.smoking) {
        c.line('의사: "담배는 이제 정말 끊으셔야 합니다."', 'bad');
        c.set('doctorWarned');
      } else c.line('큰 이상은 없다고 한다', 'good');
    },
  },
  {
    id: 'duty', label: '복무', emoji: '🪖', scene: 'military', energy: 10,
    desc: () => '점호, 근무, 다시 점호. 전역일 계산이 취미가 된다.',
    when: (c) => serving(c),
    run: (c) => {
      c.stat('health', 2);
      c.stat('stress', 4);
      if (c.roll(0.3)) c.line('편지 한 통이 하루를 버티게 했다', 'neutral');
    },
  },
  {
    id: 'write_letter', label: '편지 쓰기', emoji: '✉️', scene: 'military', energy: 5, param: 'friend',
    desc: () => '바깥의 사람들에게. 기억이 노래가 되기도 한다.',
    when: (c) => serving(c) && Object.values(c.s.npcs).some((n) => n.alive && n.affinity > 10),
    run: (c, id) => {
      const pool = Object.values(c.s.npcs).filter((n) => n.alive && n.affinity > 10);
      const n = (id && c.s.npcs[id]) || c.pick(pool);
      c.bind.f = n.id;
      c.rel('f', 6, '군대에서 편지를 주고받은 날');
      c.skill('compose', 1.5);
      c.theme('military');
    },
  },
];

export const actionById = (id: string) => ACTIONS.find((a) => a.id === id);

export function availableActions(c: Ctx): { def: ActionDef; locked: string | null }[] {
  return ACTIONS.filter((a) => a.when(c)).map((def) => ({ def, locked: def.locked?.(c) ?? null }));
}

export function missingInst(c: Ctx): Inst[] {
  const have = new Set<Inst>([c.band?.playerInst ?? c.p.mainInst ?? 'guitar', ...c.members.map((m) => m.inst)]);
  return (['vocal', 'guitar', 'bass', 'drums'] as Inst[]).filter((i) => !have.has(i));
}

export function formBand(c: Ctx, name?: string, genre?: Genre) {
  const g = genre ?? favoriteGenre(c.s);
  const inst = c.p.mainInst ?? 'guitar';
  const band = {
    id: `b${c.s.pastBands.length + 1}`,
    name: name ?? randomBandName(c.rng),
    genre: g,
    formedYear: c.year,
    endedYear: null,
    memberIds: [] as string[],
    playerInst: inst,
    chemistry: 45,
    label: 'none' as const,
    gigs: 0,
    bestGig: null,
  };
  c.s.band = band;
  // 멤버는 카드로 직접 고른다 (events/draft.ts) — 결성 직후 첫 카드를 띄운다
  c.queue('pick_member', {}, { src: 'form', round: 1 });
  band.chemistry = clamp(40 + c.members.reduce((a, m) => a + m.affinity, 0) / Math.max(1, c.members.length) / 3);
  c.chron(`밴드 〈${band.name}〉 결성 (${GENRE_INFO[g].label})`, 'band');
  c.line(`밴드 〈${band.name}〉 결성!`, 'big');
  c.s.cine.push({ kind: 'band', scene: 'studio', kicker: `${c.year} · ${c.ageInt}세 · ${GENRE_INFO[g].label}`, title: `〈${band.name}〉`, sub: c.members.length ? `${josa(c.members.map((m) => given(m.name)).join(', '), '과/와')} 함께 밴드를 시작했다.` : '이름부터 정했다. 이제 함께할 사람을 고를 차례.', at: c.s.time });
  return band;
}

/** 멤버 모집: 후보 카드를 띄운다 */
export function recruit(c: Ctx) {
  c.queue('pick_member', {}, { src: 'recruit', round: 1 });
  c.line('멤버 모집 공고를 올렸다 — 곧 지원자 카드가 도착한다', 'neutral');
}

/** 바로 한 명을 들인다 (학교 밴드부 선배처럼 이야기상 정해진 경우) */
export function addWalkIn(c: Ctx) {
  const miss = missingInst(c);
  const inst = miss[0] ?? c.pick(INSTRUMENTS);
  const fame = c.p.fans;
  const skill = clamp(Math.round(25 + Math.log10(fame + 10) * 9 + c.rng.normal(0, 10)), 10, 90);
  const n = c.meet('r', { metAt: '멤버 모집 공고', inst, skill, genre: c.band!.genre, birthYear: c.p.birthYear + c.rng.int(-4, 4), affinity: 20, career: 'musician' });
  n.inBand = true;
  n.role = 'member';
  c.band!.memberIds.push(n.id);
  c.band!.chemistry = clamp(c.band!.chemistry - 4);
  c.line(`${n.name} — ${INST_LABEL[inst]}, 실력 ${Math.round(skill)}`, 'good');
  c.chron(`${n.name}, ${INST_LABEL[inst]}로 합류`, 'band', 'r');
}

export function leaveBand(c: Ctx, id: string, why: string) {
  const band = c.band;
  if (!band) return;
  const n = c.s.npcs[id];
  band.memberIds = band.memberIds.filter((x) => x !== id);
  if (n) {
    n.inBand = false;
    n.role = 'friend';
    c.chron(`${n.name} 탈퇴 — ${why}`, 'band', undefined);
  }
  band.chemistry = clamp(band.chemistry - 8);
}

export function disband(c: Ctx, why: string) {
  const band = c.band;
  if (!band) return;
  band.endedYear = c.year;
  for (const id of band.memberIds) {
    const n = c.s.npcs[id];
    if (n) {
      n.inBand = false;
      n.role = 'friend';
    }
  }
  c.s.pastBands.push(band);
  c.s.band = null;
  c.chron(`〈${band.name}〉 해체 — ${why}`, 'band');
  c.line(`〈${band.name}〉의 시간이 끝났다`, 'bad');
}
