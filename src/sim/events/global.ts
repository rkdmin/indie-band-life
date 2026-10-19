// 해외 진출. 국내 쇼케이스 → 해외 페스티벌 초청장 → 참가지원 심사 → 해외 무대 → 투어.
// 지원 제도의 숫자(팀당 최대 1,000만원, 5팀 내외, 초청장·발매 경력·1시간 공연 요건)는 data/reality.ts 의 실제 공고를 따른다.
// 페스티벌·기관 이름은 실명 대신 묘사로 쓴다.

import type { EventDef, Ctx } from '../ctx';
import { OVERSEAS_SUPPORT } from '../data/reality';
import { GENRE_INFO } from '../data/world';
import { count, won } from '../korean';
import { clamp } from '../rng';

const free = (c: Ctx) => c.p.military !== 'serving';
const genreBonus = (c: Ctx) => {
  const g = c.band?.genre;
  return g === 'shoegaze' || g === 'metal' ? 3 : g === 'indierock' || g === 'punk' ? 1 : g === 'indiepop' ? 1 : 0;
};
const bestQ = (c: Ctx) => Math.max(0, ...c.s.songs.filter((x) => x.released).map((x) => x.quality));

const FESTS = [
  { id: 'us', label: '미국 텍사스의 대형 쇼케이스 페스티벌', city: '오스틴', cost: 16_000_000, gain: 1.3 },
  { id: 'uk', label: '영국 바닷가 도시의 신인 쇼케이스', city: '브라이턴', cost: 13_000_000, gain: 1.1 },
  { id: 'jp', label: '일본 여름 록 페스티벌 신인 스테이지', city: '니가타', cost: 6_000_000, gain: 1.0 },
  { id: 'tw', label: '대만 타이베이 인디 페스티벌', city: '타이베이', cost: 4_000_000, gain: 0.8 },
];

const gainFans = (c: Ctx, n: number) => {
  const v = Math.round(n);
  c.p.globalFans = Math.max(0, c.p.globalFans + v);
  c.line(`해외 팬 ${v > 0 ? '+' : ''}${count(v)}`, v > 0 ? 'good' : 'bad');
  c.lines[c.lines.length - 1].delta = true;
};

export const GLOBAL: EventDef[] = [
  {
    id: 'g_showcase', scene: 'club', title: '국제 음악 마켓 쇼케이스', chance: 0.22, cooldown: 6, minYear: 2008,
    when: (c) => !!c.band && free(c) && c.age >= 19 && c.age < 55 && c.s.albums.length >= 1 && c.p.rep >= 15 && !c.flag('g_invite_pending'),
    text: (c) =>
      `해외 페스티벌 디렉터와 바이어들이 서울에 모이는 국제 음악 마켓.\n쇼케이스 무대에 설 국내 팀을 뽑는다는 공고가 떴다.\n〈${c.band!.name}〉의 ${GENRE_INFO[c.band!.genre].label}이 바다 건너에서도 통할까?`,
    choices: [
      {
        label: '지원서를 낸다',
        odds: (c) =>
          c.dc(16, '심사 판정', [
            ['대표곡 완성도', c.m(bestQ(c))],
            ['업계 평판', Math.floor(c.m(c.p.rep) / 2) + 1],
            ['해외에서 통하는 장르', genreBonus(c)],
            ['라이브 실력', Math.floor(c.m(c.p.skills.stage) / 2)],
            ['외국어 (다문화 가정)', c.flag('bilingual') ? 2 : 0],
          ], '가정', '수백 팀이 지원해 수십 팀이 무대에 선다고 보고 난이도를 높게 잡았다'),
        run: (c) => {
          c.stat('stress', 4);
          if (c.check(c.choicesOdds!)) {
            c.rep(4);
            c.set('g_invite_pending');
            c.queue('g_invite', {});
            c.chron('국제 음악 마켓 쇼케이스 선정', 'band');
            return '쇼케이스 30분. 맨 앞줄에서 외국인 몇 명이 열심히 메모를 했다.';
          }
          return '탈락. 선정 팀 목록을 세 번 다시 읽었다. 우리 이름은 없었다.';
        },
      },
      { label: '아직은 국내에서 다진다', run: (c) => { c.skill('stage', 2); return '해외는 나중에. 일단 다음 주 클럽 공연부터.'; } },
    ],
  },
  {
    id: 'g_invite', scene: 'office', title: '바다 건너 온 초청장', priority: 125, queued: true,
    when: () => true,
    bind: (c) => {
      const g = c.band?.genre;
      const pool = FESTS.filter((f) => (g === 'shoegaze' || g === 'metal' ? true : f.id !== 'uk' || c.rng.chance(0.5)));
      const f = c.pick(pool);
      c.vars.fest = f.id;
      return true;
    },
    text: (c) => {
      const f = FESTS.find((x) => x.id === c.vars.fest)!;
      return `메일 제목: “Official Invitation”.\n${f.label}에서 〈${c.band?.name ?? '우리 밴드'}〉를 초청한다고 한다.\n단, 항공·숙박·장비 운송은 각자 부담. 네 명이 가면 약 ${won(c.krw(f.cost))}.`;
    },
    choices: [
      {
        label: `공공 해외 페스티벌 참가지원을 신청한다`,
        hint: () => `요건: ${OVERSEAS_SUPPORT.requirement}`,
        odds: (c) =>
          c.dc(15, '서류 심사', [
            ['발매 경력', Math.min(4, c.s.albums.length)],
            ['업계 평판', Math.floor(c.m(c.p.rep) / 2)],
            ['1시간 단독공연 가능', c.s.songs.filter((x) => x.released).length >= 12 ? 2 : -2],
          ], '통계', `실제 공고 기준 팀당 최대 1,000만원 · ${OVERSEAS_SUPPORT.teams}팀 내외 선정 — 문이 좁다`),
        run: (c) => {
          const f = FESTS.find((x) => x.id === c.vars.fest)!;
          const cost = c.krw(f.cost);
          if (c.check(c.choicesOdds!)) {
            const support = Math.min(c.krw(OVERSEAS_SUPPORT.maxPerTeam), cost);
            c.money(-(cost - support) / (c.members.length + 1), '항공·숙박 자부담');
            c.line(`지원금 ${won(support)}이 항공료와 숙박비를 덮었다`, 'good');
            c.queue('g_stage', c.bind, { fest: f.id });
            return '선정. 여권 사진을 새로 찍었다. 다들 긴장한 얼굴이었다.';
          }
          c.vars.denied = 1;
          c.queue('g_selfpay', c.bind, { fest: f.id });
          return '탈락. 초청장은 그대로 있는데, 비행기 표가 없다.';
        },
      },
      {
        label: '자비로 간다',
        hint: (c) => `멤버당 약 ${won(c.krw(FESTS.find((x) => x.id === c.vars.fest)!.cost) / (c.members.length + 1))}`,
        run: (c) => {
          const f = FESTS.find((x) => x.id === c.vars.fest)!;
          c.money(-c.krw(f.cost) / (c.members.length + 1), '항공·숙박');
          c.queue('g_stage', c.bind, { fest: f.id });
          return '적금을 깼다. 멤버 한 명은 부모님께 돈을 빌렸다.';
        },
      },
      { label: '정중히 거절한다', run: (c) => { c.set('g_invite_pending', false); c.rep(-1); return '“다음엔 꼭.” 답장을 쓰는 손가락이 무거웠다.'; } },
    ],
  },
  {
    id: 'g_selfpay', scene: 'home', title: '비행기 표 값', priority: 124, queued: true,
    when: () => true,
    text: (c) => `지원금은 떨어졌다. 초청장은 아직 유효하다.\n멤버당 약 ${won(c.krw(FESTS.find((x) => x.id === c.vars.fest)!.cost) / (c.members.length + 1))}. 알바 몇 달 치다.`,
    choices: [
      {
        label: '그래도 간다',
        run: (c) => {
          const f = FESTS.find((x) => x.id === c.vars.fest)!;
          c.money(-c.krw(f.cost) / (c.members.length + 1), '항공·숙박');
          c.queue('g_stage', c.bind, { fest: f.id });
          if (c.band) c.band.chemistry = clamp(c.band.chemistry + 4);
          return '“언제 또 이런 기회가 오겠어.” 모두가 같은 말을 했다.';
        },
      },
      { label: '이번엔 접는다', run: (c) => { c.set('g_invite_pending', false); c.stat('happiness', -6); return '초청장을 출력해서 합주실 벽에 붙였다. 언젠가를 위해.'; } },
    ],
  },
  {
    id: 'g_stage', scene: 'abroad', title: (c) => `${FESTS.find((x) => x.id === c.vars.fest)?.city ?? '해외'}의 무대`, priority: 126, queued: true,
    when: () => true,
    text: (c) => {
      const f = FESTS.find((x) => x.id === c.vars.fest)!;
      return `${f.label}.\n아무도 우리 노래를 모른다. 가사도 못 알아듣는다.\n오직 소리만으로 붙잡아야 한다.`;
    },
    choices: [
      {
        label: '한국어 가사 그대로, 우리 식대로',
        odds: (c) => c.dc(14, '무대 판정', [['밴드 연주력', c.m(bandAvg(c))], ['무대 경험', Math.floor(c.m(c.p.skills.stage) / 2) + 1], ['팀워크', (c.band?.chemistry ?? 50) >= 70 ? 2 : 0], ['시차 피로', -1]], '가정'),
        run: (c) => abroadResult(c),
      },
      {
        label: '영어 멘트를 연습해서 관객과 대화한다',
        odds: (c) => c.dc(15, '설득 판정', [['무대 경험', c.m(c.p.skills.stage)], ['밴드 연주력', Math.floor(c.m(bandAvg(c)) / 2)], ['어색한 영어', -1]], '가정'),
        run: (c) => abroadResult(c, true),
      },
    ],
  },
  {
    id: 'g_playlist', scene: 'home', title: '모르는 언어의 댓글', chance: 0.12, cooldown: 8,
    when: (c) => c.s.songs.some((x) => x.released && x.quality >= 65) && c.age >= 17,
    text: (c) => {
      const s = [...c.s.songs].filter((x) => x.released).sort((a, b) => b.quality - a.quality)[0];
      return `〈${s.title}〉 영상에 처음 보는 글자의 댓글이 달리기 시작했다.\n해외의 어느 플레이리스트에 실렸다고 한다.`;
    },
    choices: [
      {
        label: '번역기를 돌려 하나하나 답장한다',
        odds: (c) => c.dc(12, '운 판정', [['장르의 해외 인기', genreBonus(c)], ['대표곡 완성도', Math.floor(c.m(bestQ(c)) / 2)]], '가정', '해외 플레이리스트는 슈게이즈·메탈 같은 장르에 특히 너그럽다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { gainFans(c, 800 + c.p.fans * 0.1); c.theme('sea'); return '브라질, 폴란드, 인도네시아. 지도에 핀을 꽂았다.'; }
          gainFans(c, 120);
          return '반짝 관심은 금방 식었다. 그래도 몇 명은 남았다.';
        },
      },
      { label: '신기하네, 하고 넘긴다', run: (c) => { gainFans(c, 80); } },
    ],
  },
  {
    id: 'g_asia_tour', scene: 'airport', title: '아시아 클럽 투어 제안', priority: 112, cooldown: 6, chance: 0.45, minYear: 2000,
    when: (c) => !!c.band && free(c) && c.p.globalFans >= 1500 && c.age < 60,
    text: (c) => `해외 팬 ${count(c.p.globalFans)}명. 현지 기획사에서 연락이 왔다.\n도쿄·오사카·타이베이·방콕, 열흘 동안 네 도시.\n티켓 수익은 나누지만 항공과 숙박은 우리 몫이다.`,
    choices: [
      {
        label: '간다',
        odds: (c) => c.dc(13, '흥행 판정', [['해외 팬 규모', Math.min(6, Math.floor(Math.log10(c.p.globalFans + 1) * 2 - 5))], ['밴드 연주력', Math.floor(c.m(bandAvg(c)) / 2)]], '가정', '해외 클럽 투어는 대개 적자이거나 겨우 본전이다'),
        run: (c) => {
          const cost = c.krw(9_000_000);
          if (c.check(c.choicesOdds!)) {
            gainFans(c, 1500 + c.p.globalFans * 0.35);
            c.money((c.krw(4_000_000)) / (c.members.length + 1), '투어 정산');
            c.chron('아시아 4개 도시 투어 — 매진된 밤도 있었다', 'big');
            c.theme('sea');
            return '방콕의 밤, 모르는 사람들이 한국어 후렴을 따라 불렀다.';
          }
          gainFans(c, 500);
          c.money(-cost / (c.members.length + 1), '투어 적자');
          return '빈자리가 더 많은 공연도 있었다. 적자. 그래도 비행기 창밖 구름은 예뻤다.';
        },
      },
      { label: '돈이 없다. 다음에', run: (c) => { c.stat('stress', 3); } },
    ],
  },
  {
    id: 'g_world_tour', scene: 'abroad', title: '월드 투어', priority: 130, once: true, chance: 0.5,
    when: (c) => !!c.band && free(c) && c.p.globalFans >= 30_000,
    text: (c) => `해외 팬 ${count(c.p.globalFans)}명.\n북미·유럽·아시아 20개 도시. 버스 한 대에 멤버와 스태프가 함께 탄다.`,
    choices: [
      {
        label: '떠난다',
        odds: (c) => c.dc(12, '체력 판정', [['건강', c.m(c.p.stats.health)], ['팀워크', (c.band?.chemistry ?? 50) >= 70 ? 2 : -1]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            gainFans(c, c.p.globalFans * 0.6);
            c.money(c.krw(60_000_000) / (c.members.length + 1), '투어 정산');
            c.rep(8);
            c.set('worldTour');
            c.chron('월드 투어 20개 도시 완주', 'big');
            return '마지막 도시에서 멤버들이 무대 위에서 서로를 끌어안았다.';
          }
          gainFans(c, c.p.globalFans * 0.2);
          c.stat('health', -10);
          c.stat('stress', 15);
          return '열두 번째 도시에서 쓰러졌다. 남은 일정은 취소됐다.';
        },
      },
      { label: '가족 곁에 남는다', run: (c) => { c.stat('happiness', 4); return '집 앞 공원에서 듣는 새소리가 더 좋은 나이가 됐다.'; } },
    ],
  },
];

function bandAvg(c: Ctx) {
  const m = c.members;
  return m.length ? (m.reduce((a, x) => a + x.skill, 0) + c.mainSkill) / (m.length + 1) : c.mainSkill;
}

function abroadResult(c: Ctx, english = false): string {
  const f = FESTS.find((x) => x.id === c.vars.fest)!;
  c.set('g_invite_pending', false);
  c.inc('abroadGigs');
  c.theme('sea');
  c.scene('abroad');
  if (c.check(c.choicesOdds!)) {
    gainFans(c, (600 + c.p.fans * 0.08) * f.gain * (english ? 1.2 : 1));
    c.rep(5);
    c.s.cine.push({ kind: 'gig', scene: 'abroad', kicker: `${c.year} · ${f.city}`, title: `${f.city}의 밤`, sub: '처음 보는 얼굴들이 처음 듣는 노래에 맞춰 뛰었다.', at: c.s.time });
    c.chron(`${f.city} 무대 — 처음 해외 관객 앞에 섰다`, 'big');
    if (c.roll(0.3)) c.queue('g_playlist', {});
    return english ? '“We are from Seoul!” 그 한마디에 함성이 터졌다.' : '말이 통하지 않아도 됐다. 드럼이 먼저 말을 걸었다.';
  }
  gainFans(c, 150);
  c.stat('happiness', -3);
  return '관객은 반쯤 비어 있었고, 사운드는 엉망이었다. 그래도 한 명이 끝까지 박수를 쳤다.';
}
