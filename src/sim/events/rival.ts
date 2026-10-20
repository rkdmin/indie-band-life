// 라이벌 밴드와 얽히는 순간들 (sim/rival.ts) — 첫 만남, 저들이 앞설 때, 내가 앞설 때, 같은 무대, 해체, 합작

import type { EventDef, Ctx } from '../ctx';
import { pushRival, rivalJ } from '../rival';
import { leaveBand, missingInst } from '../actions';
import { INST_LABEL } from '../data/world';
import { clamp } from '../rng';
import { count } from '../korean';

const R = (c: Ctx) => c.s.rival!;
const nj = (c: Ctx, pair: Parameters<typeof rivalJ>[1]) => rivalJ(R(c).name, pair);
const bindLeader = (c: Ctx) => {
  const r = c.s.rival;
  if (!r || !c.s.npcs[r.leaderId]) return false;
  c.bind.rl = r.leaderId;
  return true;
};
const met = (c: Ctx) => !!c.s.rival?.tone;
const free = (c: Ctx) => c.p.military !== 'serving' && !c.p.retired;

export const RIVAL_EVENTS: EventDef[] = [
  {
    id: 'rival_intro', scene: 'club', title: '같은 해에 시작한 밴드', priority: 118, once: true, chance: 0.8,
    when: (c) => !!c.s.rival && !met(c) && !!c.band && c.band.gigs >= 1 && free(c),
    bind: bindLeader,
    text: (c) =>
      `같은 날 같은 무대에 선 밴드 ${nj(c, '이/가')} 있었다. 우리와 비슷한 때 시작했다고 한다.\n` +
      `${c.nj('rl', '이/가')} 무대에서 내려오며 우리를 힐끗 봤다. 관객 반응은 저쪽이 조금 더 컸다.` +
      (R(c).legacyOf ? `\n어딘가 낯익은 얼굴이다. (지난 인생 — ${R(c).legacyOf}의 아이)` : ''),
    choices: [
      { label: '먼저 손을 내민다', run: (c) => { R(c).tone = 'friend'; c.rel('rl', 20, '같은 날 무대에 선 밤'); c.rep(2); c.chron(`라이벌 밴드 ${nj(c, '을/를')} 만났다 — 친구가 됐다`, 'band'); return '“다음엔 같이 기획 공연 하자.” 연락처를 주고받았다.'; } },
      { label: '속으로 이를 간다', run: (c) => { R(c).tone = 'fire'; c.skill(c.p.mainInst ?? 'guitar', 3); c.stat('stress', 4); c.p.inspiration = Math.min(3, c.p.inspiration + 1); c.chron(`라이벌 밴드 ${nj(c, '을/를')} 만났다 — 저들보다 잘하고 싶어졌다`, 'band'); return '집에 와서 새벽까지 연습했다. 저 밴드보다 잘하고 싶었다.'; } },
      { label: '신경 쓰지 않는다', run: (c) => { R(c).tone = 'cool'; c.stat('stress', -2); return '우리는 우리 음악을 하면 된다.'; } },
    ],
  },
  {
    id: 'rival_ahead', scene: 'festival', title: '한발 앞선 라이벌', cooldown: 10, chance: 0.35,
    when: (c) => met(c) && R(c).status === 'active' && !!c.band && R(c).fans > Math.max(200, c.p.fans * 1.6) && free(c),
    bind: bindLeader,
    text: (c) => {
      const r = R(c);
      return `${nj(c, '이/가')} 큰 페스티벌 라인업에 이름을 올렸다. 팬 ${count(r.fans)}명 — 우리의 ${Math.max(2, Math.round(r.fans / Math.max(1, c.p.fans)))}배쯤.\n` +
        (r.tone === 'friend' ? `${c.nj('rl', '이/가')} 단체 대화방에 포스터를 올렸다. “너희도 곧이야.”` : '포스터 속 저들의 이름이 유난히 크게 보였다.');
    },
    choices: [
      { label: '진심으로 축하한다', run: (c) => { c.rel('rl', 8, '축하해 준 날'); c.stat('stress', -4); c.rep(1); return '축하 메시지를 보내고 나니 오히려 마음이 가벼웠다.'; } },
      { label: '연습량을 두 배로 늘린다', run: (c) => { c.skill(c.p.mainInst ?? 'guitar', 3); c.skill('stage', 2); c.stat('stress', 8); c.stat('energy', -10); return '한 달 내내 합주실 마지막 손님은 우리였다.'; } },
      { label: '저들 공연을 보러 가서 뜯어본다', run: (c) => { c.skill('compose', 2); c.genre(R(c).genre, 4); c.stat('happiness', -2); return '맨 뒤에 서서 셋리스트와 조명을 수첩에 적었다. 배울 게 많았다. 그게 더 분했다.'; } },
    ],
  },
  {
    id: 'rival_behind', scene: 'club', title: '오프닝을 부탁받다', cooldown: 10, chance: 0.3,
    when: (c) => met(c) && R(c).status === 'active' && !!c.band && c.p.fans > Math.max(300, R(c).fans * 1.6) && free(c),
    bind: bindLeader,
    text: (c) => `${c.nj('rl', '이/가')} 연락해 왔다. ${nj(c, '이/가')} 요즘 어렵다고. “다음 공연 오프닝, 우리가 서도 될까?”\n한때는 저들이 앞서 있었다.`,
    choices: [
      { label: '흔쾌히 무대를 내준다', run: (c) => { c.rel('rl', 15, '오프닝을 내준 날'); pushRival(c.s, 0.2); R(c).fans += Math.round(c.p.fans * 0.08); c.rep(3); c.stat('happiness', 5); return '저들의 첫 곡에 우리 팬들이 환호했다. 무대 옆에서 같이 고개를 흔들었다.'; } },
      { label: '정중히 거절한다', run: (c) => { c.rel('rl', -8); pushRival(c.s, -0.1); c.stat('stress', 2); return '“이번엔 어려워.” 답장은 짧았다.'; } },
    ],
  },
  {
    id: 'rival_bill', scene: 'festival', title: '같은 무대, 다른 순서', cooldown: 8, chance: 0.3,
    when: (c) => met(c) && R(c).status === 'active' && !!c.band && c.band.gigs >= 3 && R(c).fans >= 50 && c.p.fans >= 50 && free(c),
    text: (c) => `기획 공연 포스터에 우리와 ${nj(c, '이/가')} 나란히 적혀 있다. 관객은 한 번에 두 밴드를 비교할 것이다.\n어느 쪽이 그날 밤의 주인공이 될까.`,
    choices: [
      {
        label: '정면 승부 — 가장 센 셋리스트로',
        risk: 'risky',
        odds: (c) => c.dc(Math.round(10 + Math.log10(Math.max(10, R(c).fans)) * 1.5), '그날 밤의 주인공', [['무대 실력', c.m(c.p.skills.stage)], ['밴드 케미', Math.floor(((c.band?.chemistry ?? 50) - 50) / 10)]], '가정', '같은 무대에 선 두 밴드 — 상대가 클수록 어렵다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            const g = Math.round(Math.max(40, R(c).fans * 0.12));
            c.fans(g);
            R(c).fans = Math.max(0, R(c).fans - Math.round(g * 0.4));
            pushRival(c.s, -0.2);
            c.chron(`라이벌 ${nj(c, '과/와')} 같은 무대 — 그날 밤의 주인공은 우리였다`, 'band');
            return '앙코르 함성이 우리 이름을 불렀다. 대기실 너머로 저들의 표정이 보였다.';
          }
          c.stat('stress', 8);
          pushRival(c.s, 0.15);
          return `그날 밤은 ${nj(c, '이/가')} 가져갔다. 집에 오는 길이 길었다.`;
        },
      },
      { label: '서로 한 곡씩 같이 한다', run: (c) => { c.fans(Math.round(R(c).fans * 0.04 + 20)); R(c).fans += Math.round(c.p.fans * 0.04); if (c.bind.rl) c.rel('rl', 6); c.stat('happiness', 6); return '마지막 곡에서 두 밴드가 한 무대에 섰다. 관객이 가장 크게 소리친 순간이었다.'; } },
    ],
  },
  {
    // 해체 소식이 나면 한 번만 (sim/rival.ts 가 큐에 넣는다)
    id: 'rival_split', scene: 'pub', title: '라이벌의 해체', priority: 106, chance: 0,
    when: (c) => !!c.s.rival && R(c).status === 'split' && !c.s.flags[`rivalSplit:${R(c).splitYear}`],
    bind: (c) => (bindLeader(c), true),
    text: (c) => `${nj(c, '이/가')} 해체했다는 소식. ${c.bind.rl ? `${c.nj('rl', '이/가')} 짧은 글을 남겼다.` : '마지막 공지가 올라왔다.'} “여기까지였습니다. 고마웠습니다.”\n${met(c) ? '한때 저들을 이기고 싶었는데, 막상 끝나니 이상하게 허전하다.' : '이름만 알던 밴드였는데도 이상하게 허전하다.'}`,
    choices: [
      { label: '술 한잔하자고 연락한다', run: (c) => { c.set(`rivalSplit:${R(c).splitYear}`); if (c.bind.rl) c.rel('rl', 15, '해체한 밤의 술자리'); c.stat('happiness', 3); c.theme('loss'); return '“너희는 오래 해라.” 그 말이 오래 남았다.'; } },
      { label: '다음 공연에서 저들 곡을 커버한다', run: (c) => { c.set(`rivalSplit:${R(c).splitYear}`); c.rep(3); c.fans(Math.round(R(c).fans * 0.03)); if (c.bind.rl) c.rel('rl', 6); return '첫 소절에 객석 몇 명이 울었다. 저들의 팬이었다.'; } },
      {
        // 해체한 라이벌의 리더를 우리 밴드로 — 자리가 있고, 사이가 나쁘지 않을 때
        label: (c) => `${c.n('rl')}에게 우리 밴드로 오라고 한다`,
        if: (c) => !!c.bind.rl && !!c.band && c.members.length < 4 && !c.s.npcs[c.bind.rl]?.inBand && (c.s.npcs[c.bind.rl]?.affinity ?? 0) > -20,
        odds: (c) => c.dc(10, '영입 판정', [['서로의 사이', c.npc('rl').affinity >= 30 ? 2 : c.npc('rl').affinity >= 0 ? 0 : -2], ['우리 밴드의 이름값', c.p.fans >= R(c).peak ? 2 : 0]], '가정', '해체 직후엔 다들 갈 곳을 찾는다'),
        run: (c) => {
          c.set(`rivalSplit:${R(c).splitYear}`);
          if (c.check(c.choicesOdds!, '영입 판정')) {
            const n = c.npc('rl');
            n.inBand = true;
            n.role = 'member';
            n.sat = 70;
            c.band!.memberIds.push(n.id);
            c.band!.chemistry = clamp(c.band!.chemistry - 6);
            c.rel('rl', 10, '우리 밴드에 들어온 날');
            c.chron(`해체한 라이벌 〈${R(c).name}〉의 ${n.name}, ${INST_LABEL[n.inst]}로 합류`, 'band', 'rl');
            return '첫 합주. 몇 년 동안 무대 건너편에서만 듣던 소리가 바로 옆에서 났다.';
          }
          c.rel('rl', 2);
          return '“고마워. 근데 당분간은 음악을 좀 쉬려고.”';
        },
      },
      { label: '조용히 연습실로 간다', run: (c) => { c.set(`rivalSplit:${R(c).splitYear}`); c.skill(c.p.mainInst ?? 'guitar', 2); c.stat('stress', -2); return '경쟁자가 사라진 게 아니라, 버티는 사람이 하나 줄었을 뿐이다.'; } },
    ],
  },
  {
    id: 'rival_collab', scene: 'studio', title: '라이벌과 함께 한 곡', once: true, chance: 0.25,
    when: (c) => R(c)?.tone === 'friend' && R(c).status === 'active' && !!c.band && R(c).fans >= 300 && c.p.fans >= 300 && free(c),
    bind: bindLeader,
    text: (c) => `${c.nj('rl', '이/가')} 제안했다. “우리 두 밴드가 같이 한 곡 내 볼래? 오래 붙어 다녔잖아.”`,
    choices: [
      { label: '같이 곡을 쓴다', run: (c) => { const g = Math.round(R(c).fans * 0.1 + 50); c.fans(g); R(c).fans += Math.round(c.p.fans * 0.1); pushRival(c.s, 0.1); c.skill('compose', 3); c.rel('rl', 12, '두 밴드의 합작곡'); c.chron(`라이벌 ${nj(c, '과/와')} 합작곡을 냈다`, 'big'); c.theme('friend'); return '녹음실이 비좁았다. 두 밴드의 소리가 섞이자 어느 쪽 곡인지 아무도 몰랐다.'; } },
      { label: '각자의 길을 간다', run: (c) => { c.rel('rl', -2); return '“그래, 무대에서 보자.”'; } },
    ],
  },
  {
    // 저들이 우리 멤버를 데려가려 한다 — 저들이 더 클 때, 불만 있는 멤버에게
    id: 'rival_poach_mine', scene: 'pub', title: '라이벌의 스카우트', cooldown: 12, chance: 0.22,
    when: (c) => met(c) && R(c).status === 'active' && !!c.band && c.members.length >= 1 && R(c).fans > Math.max(300, c.p.fans * 1.3) && free(c),
    bind: (c) => {
      const m = [...c.members].sort((a, b) => (a.sat ?? 60) - (b.sat ?? 60))[0];
      if (!m) return false;
      c.bind.m = m.id;
      return true;
    },
    text: (c) => `${c.nj('m', '이/가')} 머뭇거리다 말했다.\n“${nj(c, '이/가')} 같이 하자고 연락해 왔어. 거긴 레이블도 있고 투어도 잡혀 있대.”`,
    choices: [
      {
        label: '붙잡는다',
        odds: (c) => c.dc(12, '설득 판정', [['함께한 정', c.npc('m').affinity >= 50 ? 2 : c.npc('m').affinity >= 25 ? 1 : 0], ['우리 밴드 만족도', Math.floor(((c.npc('m').sat ?? 60) - 50) / 15)], ['저들과의 체급 차', R(c).fans > c.p.fans * 4 ? -2 : -1]], '가정', '멤버가 더 큰 밴드로 옮기는 건 흔한 일이다'),
        run: (c) => {
          if (c.check(c.choicesOdds!, '설득 판정')) {
            const m = c.npc('m');
            m.sat = Math.min(100, (m.sat ?? 60) + 15);
            c.rel('m', 10, '남기로 한 밤');
            pushRival(c.s, -0.05);
            return '“…그래, 우리 밴드로 끝까지 가 보자.” 그날 합주는 유난히 길었다.';
          }
          leaveBand(c, c.bind.m, `라이벌 ${nj(c, '으로/로')} 이적`);
          R(c).fans += Math.round(c.p.fans * 0.05);
          pushRival(c.s, 0.3);
          c.stat('stress', 8);
          return `${c.nj('m', '은/는')} 결국 떠났다. 다음 달 저들의 포스터에 낯익은 얼굴이 있었다.`;
        },
      },
      {
        label: '웃으며 보내 준다',
        run: (c) => {
          c.rel('m', 10, '웃으며 보내 준 날');
          leaveBand(c, c.bind.m, `라이벌 ${nj(c, '으로/로')} 이적 (웃으며 보냄)`);
          pushRival(c.s, 0.3);
          c.stat('stress', -2);
          return '“잘 가. 무대에서 보자.” 진심이었다. 반쯤은.';
        },
      },
    ],
  },
  {
    // 우리가 저들 멤버를 데려올 기회 — 저들과 비슷하거나 앞설 때, 빈자리가 있을 때
    id: 'rival_poach_theirs', scene: 'pub', title: '저쪽 멤버의 불만', cooldown: 12, chance: 0.22,
    when: (c) => met(c) && R(c).status === 'active' && !!c.band && c.members.length < 4 && c.p.fans >= Math.max(80, R(c).fans * 0.7) && free(c),
    bind: (c) => {
      const inst = missingInst(c)[0] ?? c.pick(['guitar', 'bass', 'drums', 'keys'] as const);
      c.meet('rm', { metAt: `라이벌 〈${R(c).name}〉의 멤버`, inst, skill: c.rng.int(45, 75), genre: R(c).genre, career: 'musician', birthYear: c.p.birthYear + c.rng.int(-3, 3), affinity: 15 });
      return true;
    },
    text: (c) => `뒤풀이 자리. 〈${R(c).name}〉의 ${INST_LABEL[c.npc('rm').inst]} ${c.nj('rm', '이/가')} 잔을 내려놓았다.\n“솔직히 요즘 우리 팀 분위기 별로야. 너희 쪽은 어때?”`,
    choices: [
      {
        label: '우리 밴드로 오라고 한다',
        risk: 'risky',
        odds: (c) => c.dc(11, '영입 판정', [['우리 밴드의 기세', c.p.fans >= R(c).fans * 1.5 ? 2 : c.p.fans >= R(c).fans ? 1 : 0], ['밴드 케미', Math.floor(((c.band?.chemistry ?? 50) - 50) / 15)]], '가정', '빼 오면 저쪽은 크게 흔들리지만, 리더와는 척을 진다'),
        run: (c) => {
          const leader = c.s.npcs[R(c).leaderId];
          if (c.check(c.choicesOdds!, '영입 판정')) {
            const n = c.npc('rm');
            n.inBand = true;
            n.role = 'member';
            n.sat = 65;
            c.band!.memberIds.push(n.id);
            c.band!.chemistry = clamp(c.band!.chemistry - 6);
            pushRival(c.s, -0.35);
            R(c).fans = Math.round(R(c).fans * 0.9);
            if (leader) leader.affinity = clamp(leader.affinity - 25, -100, 100);
            R(c).tone = 'fire';
            c.chron(`라이벌 〈${R(c).name}〉의 ${c.nj('rm', '을/를')} 우리 밴드로 데려왔다`, 'band', 'rm');
            return '다음 주 저들의 공연은 취소됐다. 우리 합주실엔 새 소리가 생겼다.';
          }
          if (leader) leader.affinity = clamp(leader.affinity - 10, -100, 100);
          return '“…그 얘긴 못 들은 걸로 할게.” 소문은 이틀 만에 저쪽 리더 귀에 들어갔다.';
        },
      },
      { label: '들어 주기만 한다', run: (c) => { c.rel('rm', 8, '뒤풀이에서 들어 준 고민'); return '빈 잔이 쌓였다. 남의 밴드 사정도 우리랑 다르지 않았다.'; } },
    ],
  },
  {
    // 같은 경연에서 맞붙는다 — 이기면 저들의 기세가 꺾인다
    id: 'rival_contest', scene: 'festival', title: '경연 결승, 상대는 저들', cooldown: 14, chance: 0.2,
    when: (c) => met(c) && R(c).status === 'active' && !!c.band && c.band.gigs >= 4 && c.age < 40 && R(c).fans <= Math.max(5000, c.p.fans * 3) && free(c),
    text: (c) => `밴드 경연 결승. 마지막 두 팀 중 하나가 〈${R(c).name}〉다.\n심사위원 셋, 관객 투표 한 번. 이긴 쪽은 방송 무대에 선다.`,
    choices: [
      {
        label: '정면 승부',
        risk: 'risky',
        odds: (c) => c.dc(11 + clamp(Math.round((Math.log10(R(c).fans + 10) - Math.log10(c.p.fans + 10)) * 2), -2, 3), '경연 판정', [['주 악기 실력', c.m(c.mainSkill)], ['무대 경험', Math.floor(c.m(c.p.skills.stage) / 2)]], '가정', '팬이 많은 쪽이 관객 투표에서 유리하다'),
        run: (c) => {
          if (c.check(c.choicesOdds!, '경연 판정')) {
            c.fans(Math.round(Math.max(100, R(c).fans * 0.15)));
            c.rep(3);
            pushRival(c.s, -0.3);
            c.chron(`경연 결승에서 라이벌 ${nj(c, '을/를')} 이겼다`, 'big');
            return '이름이 불리는 순간, 무대 건너편의 저들도 박수를 쳤다. 표정까진 보지 않았다.';
          }
          R(c).fans += Math.round(c.p.fans * 0.1 + 50);
          pushRival(c.s, 0.25);
          c.stat('stress', 6);
          c.theme('rage');
          return '준우승. 방송 무대에 선 건 저들이었다. 그 화면을 끝까지 봤다.';
        },
      },
      { label: '이기든 지든 우리 곡으로', run: (c) => { c.skill('compose', 2); c.fans(Math.round(20 + c.p.fans * 0.03)); c.rep(1); return '순위는 잊혔지만, 그날 부른 곡을 찾는 댓글이 며칠 동안 달렸다.'; } },
    ],
  },
];
