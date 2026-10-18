// 밴드 위기. 장르 차이·생활고·현실·스카우트·관계 — 이유마다 다른 대화와 다른 해법.

import type { EventDef, Ctx } from '../ctx';
import { GENRE_INFO } from '../data/world';
import { REASON_LABEL, type LeaveReason } from '../bandlife';
import { disband, leaveBand } from '../actions';
import { clamp } from '../rng';
import { given, won } from '../korean';

const reasonText = (c: Ctx): string => {
  const r = c.vars.reason as LeaveReason;
  const m = c.npc('m');
  const g = GENRE_INFO[m.genre].label;
  switch (r) {
    case 'genre':
      return `합주가 끝나고 ${c.nj('m', '이/가')} 조심스럽게 말했다.\n“솔직히 나 요즘 ${g} 하고 싶어. 지금 우리 음악이 내 음악 같지가 않아.”`;
    case 'money':
      return `${c.nj('m', '이/가')} 합주실 월세 이체 내역을 보여 줬다.\n“이번 달도 마이너스야. 알바를 하나 더 해야 하는데, 그럼 합주에 못 나와.”`;
    case 'life':
      return `${c.nj('m', '은/는')} 이번에 정규직 제안을 받았다고 했다.\n“나이도 있고… 부모님도 그렇고. 언제까지 이렇게 살 순 없잖아.”`;
    case 'scout':
      return `더 큰 팀에서 ${c.call('m')} 세션으로 데려가고 싶다는 연락이 왔다.\n“페이도 나오고, 무대도 크대. 너한테 먼저 말하는 거야.”`;
    default:
      return `요즘 ${c.nj('m', '은/는')} 합주실에서 말이 없다. 지난 공연 이후로 계속.\n“나 좀 쉬고 싶어. 아니, 그만두고 싶어.”`;
  }
};

export const BAND_CRISIS: EventDef[] = [
  {
    id: 'member_leave', scene: 'pub', title: (c) => `${c.n('m')}의 고민 — ${REASON_LABEL[c.vars.reason as LeaveReason] ?? '탈퇴 위기'}`, priority: 145, queued: true,
    when: () => true,
    text: (c) => reasonText(c),
    choices: [
      {
        label: '붙잡는다',
        odds: (c) => {
          const m = c.npc('m');
          const r = c.vars.reason as LeaveReason;
          return c.dc(14, '설득 판정', [
            ['우리 사이', m.affinity >= 60 ? 4 : m.affinity >= 35 ? 2 : m.affinity < 0 ? -3 : 0],
            ['밴드의 앞날', c.p.fans >= 5000 ? 2 : c.band?.label !== 'none' ? 2 : 0],
            ['이유의 무게', r === 'life' ? -3 : r === 'money' ? -2 : r === 'scout' ? -2 : 0],
            ['내 무대 경험', Math.floor(c.m(c.p.skills.stage) / 2)],
          ], '가정', '돈과 생계 문제는 말로 붙잡기 가장 어렵다');
        },
        run: (c) => {
          const m = c.npc('m');
          if (c.check(c.choicesOdds!)) {
            m.sat = 60;
            c.rel('m', 6, '붙잡아 준 밤');
            return '“알았어, 한 번만 더 해 보자.” 그날 합주는 유난히 소리가 컸다.';
          }
          leaveBand(c, m.id, REASON_LABEL[c.vars.reason as LeaveReason]);
          c.rel('m', -4);
          c.theme('breakup');
          return '“미안. 이미 마음 정했어.” 장비를 챙겨 나가는 뒷모습이 오래 남았다.';
        },
      },
      {
        label: (c) => `밴드 장르를 ${GENRE_INFO[c.npc('m').genre].label}(으)로 바꿔 본다`,
        if: (c) => c.vars.reason === 'genre' && c.npc('m').genre !== c.band?.genre,
        run: (c) => {
          const m = c.npc('m');
          const band = c.band!;
          const from = band.genre;
          band.genre = m.genre;
          m.sat = 75;
          // 다른 멤버들의 마음도 장르에 따라 움직인다
          for (const o of c.members) if (o.id !== m.id) o.sat = clamp((o.sat ?? 60) + (o.genre === band.genre ? 12 : o.genre === from ? -18 : -6));
          band.chemistry = clamp(band.chemistry - 6);
          c.genre(band.genre, 8);
          c.chron(`〈${band.name}〉 ${GENRE_INFO[from].label}에서 ${GENRE_INFO[band.genre].label}(으)로 방향을 틀었다`, 'band');
          return '첫 합주는 어색했다. 그런데 몇 곡은 이상하게 더 우리 같았다. 대신 누군가는 표정이 굳었다.';
        },
      },
      {
        label: '공연 수익을 더 나눠 준다',
        hint: (c) => `내 돈 ${won(c.krw(1_500_000))}`,
        if: (c) => c.vars.reason === 'money' || c.vars.reason === 'scout',
        run: (c) => {
          c.money(-c.krw(1_500_000), '멤버 정산 보전');
          const m = c.npc('m');
          m.sat = 58;
          c.rel('m', 5, '정산을 양보한 날');
          return '통장은 더 가벼워졌지만, 밴드는 아직 넷이다.';
        },
      },
      {
        label: '웃으면서 보내 준다',
        run: (c) => {
          const m = c.npc('m');
          leaveBand(c, m.id, REASON_LABEL[c.vars.reason as LeaveReason]);
          m.affinity = clamp(m.affinity + 8, -100, 100);
          c.theme('friend');
          if (c.members.length === 0) c.line('밴드에 나 혼자 남았다', 'bad');
          return `마지막 합주 뒤 다 같이 고기를 먹었다. “공연엔 꼭 갈게.” ${c.nj('m', '은/는')} 정말로 왔다.`;
        },
      },
    ],
  },
  {
    id: 'band_broke', scene: 'studio', title: '밴드 통장 바닥', priority: 112, cooldown: 6, chance: 0.35,
    when: (c) => !!c.band && c.band.label === 'none' && c.p.money < 0 && c.year - c.band.formedYear >= 1 && c.p.military !== 'serving',
    text: (c) => `합주실 사장님 문자: “이번 달 월세 아직이에요~”\n공연 수익은 대관비로, 음원 정산은 몇 만 원. ${c.members.length + 1}명이 n분의 1로 버티는 것도 한계다.\n예술인 절반 가까이가 다른 일을 겸한다는 게 남 얘기가 아니었다.`,
    choices: [
      { label: '합주를 주 1회로 줄이고 각자 알바를 늘린다', run: (c) => { c.money(c.krw(1_800_000), '알바 늘림'); c.band!.chemistry = clamp(c.band!.chemistry - 6); for (const m of c.members) m.sat = clamp((m.sat ?? 60) - 5); return '합주 날짜 맞추는 단톡방이 점점 조용해졌다.'; } },
      {
        label: '팬들에게 크라우드펀딩을 연다',
        odds: (c) => c.dc(14, '인지도 판정', [['팬 규모', c.p.fans >= 5000 ? 4 : c.p.fans >= 1000 ? 2 : c.p.fans >= 300 ? 0 : -2], ['팬 충성도', GENRE_INFO[c.band!.genre].loyalty >= 1.4 ? 2 : 0]], '가정', '목표 금액을 채우지 못하면 한 푼도 받지 못하는 방식'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(6_000_000) / (c.members.length + 1), '펀딩'); for (const m of c.members) m.sat = clamp((m.sat ?? 60) + 10); c.chron('크라우드펀딩 성공 — 팬들이 밴드를 살렸다', 'band'); return '마감 3시간 전 100%. 후원자 명단을 공연장 벽에 붙였다.'; }
          c.stat('happiness', -6);
          return '달성률 41%. 실패한 펀딩 페이지를 오래 들여다봤다.';
        },
      },
      { label: '잠시 쉬기로 한다 (활동 중단)', run: (c) => { c.band!.chemistry = clamp(c.band!.chemistry - 12); for (const m of c.members) m.sat = clamp((m.sat ?? 60) - 8); c.set('hiatus', c.year); return '“잠깐만 쉬자.” 그 잠깐이 얼마나 길어질지 아무도 몰랐다.'; } },
      { label: '해체한다', run: (c) => { disband(c, '생활고'); c.theme('loss'); return '마지막으로 합주실 열쇠를 반납했다. 사장님이 “또 와요”라고 했다.'; } },
    ],
  },
  {
    id: 'band_genre_vote', scene: 'studio', title: '다음 앨범은 무슨 색?', cooldown: 10, chance: 0.15,
    when: (c) => !!c.band && c.members.filter((m) => m.genre !== c.band!.genre).length >= 2 && c.p.military !== 'serving',
    text: (c) => {
      const others = c.members.filter((m) => m.genre !== c.band!.genre).map((m) => `${given(m.name)}(${GENRE_INFO[m.genre].label})`);
      return `멤버 절반이 다른 음악을 하고 싶어 한다: ${others.join(', ')}.\n지금 〈${c.band!.name}〉은 ${GENRE_INFO[c.band!.genre].label} 밴드다.`;
    },
    choices: [
      { label: '지금 색을 지킨다', run: (c) => { for (const m of c.members) if (m.genre !== c.band!.genre) m.sat = clamp((m.sat ?? 60) - 8); c.rep(1); return '“우린 원래 이런 밴드야.” 고개를 끄덕인 건 절반이었다.'; } },
      { label: '한 곡씩 각자 원하는 장르로 넣는다', run: (c) => { for (const m of c.members) m.sat = clamp((m.sat ?? 60) + 6); c.band!.chemistry = clamp(c.band!.chemistry + 3); c.skill('compose', 2); return '앨범이 조금 산만해졌다. 그래도 다들 자기 곡을 제일 크게 틀었다.'; } },
    ],
  },
];

