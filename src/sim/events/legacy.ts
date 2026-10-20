// 지난 인생이 이번 인생에 끼어드는 순간 (sim/legacy.ts) — 라디오의 대표곡, 전설의 선배 밴드

import type { EventDef, Ctx } from '../ctx';
import type { LegacyLife } from '../types';
import { legacyTag, radioCandidates, seniorCandidates } from '../legacy';
import { josa } from '../korean';

const L = (c: Ctx): LegacyLife | undefined => (c.s.legacy ?? []).find((l) => l.id === c.vars.lid);
/** 〈제목〉 뒤 조사를 제목에 맞춘다 */
const tj = (t: string, pair: Parameters<typeof josa>[1]) => `〈${t}〉${josa(t, pair).slice(t.length)}`;
const free = (c: Ctx) => c.p.military !== 'serving';

export const LEGACY_EVENTS: EventDef[] = [
  {
    id: 'legacy_radio', scene: 'home', title: '어디서 들어 본 노래', chance: 0.3, cooldown: 6,
    when: (c) => c.age >= 8 && radioCandidates(c.s).length > 0,
    bind: (c) => {
      const l = radioCandidates(c.s)[0];
      if (!l) return false;
      c.vars.lid = l.id;
      return true;
    },
    text: (c) => {
      const l = L(c)!;
      return `라디오에서 ${tj(l.bestSong!, '이/가')} 흘러나왔다. ${l.bandName ? `〈${l.bandName}〉` : l.name}의 ${l.songYear}년 노래.\n처음 듣는 노래인데, 다음 가사가 입에서 먼저 나왔다.`;
    },
    choices: [
      {
        label: '볼륨을 올리고 끝까지 듣는다',
        run: (c) => {
          const l = L(c)!;
          c.s.flags[`legacyRadio:${l.id}`] = 1;
          c.p.inspiration = Math.min(3, c.p.inspiration + 1);
          if (l.genre) c.genre(l.genre, 6);
          c.line(legacyTag(l), 'big');
          c.line('영감 +1', 'good');
          c.chron(`라디오에서 ${tj(l.bestSong!, '을/를')} 처음 들었다. 이상하게 그리웠다`, 'music');
          return '노래가 끝나고도 한참 라디오 앞을 떠나지 못했다.';
        },
      },
      {
        label: '나도 이런 곡을 쓰고 싶다',
        if: (c) => c.age >= 12,
        run: (c) => {
          const l = L(c)!;
          c.s.flags[`legacyRadio:${l.id}`] = 1;
          c.skill('compose', 3);
          c.theme('dream');
          c.line(legacyTag(l), 'big');
          c.chron(`${tj(l.bestSong!, '을/를')} 듣고 노트에 첫 줄을 적었다`, 'music');
          return '그날 밤 노트 맨 위에 적었다. ‘저런 노래 하나만.’';
        },
      },
    ],
  },
  {
    // 같은 나라·같은 시대 — 지난 인생의 밴드가 이 동네의 전설이 되어 있다. 그 주인공을 만난다
    id: 'legacy_senior', scene: 'club', title: '전설의 선배 밴드', chance: 0.35, once: true, priority: 104,
    when: (c) => c.age >= 15 && c.age < 45 && !!c.p.mainInst && free(c) && seniorCandidates(c.s).length > 0,
    bind: (c) => {
      const l = seniorCandidates(c.s)[0];
      if (!l) return false;
      c.vars.lid = l.id;
      const n = c.meet('sr', { metAt: `전설의 선배 밴드 〈${l.bandName}〉`, role: 'mentor', career: 'musician', genre: l.genre ?? undefined, birthYear: l.born, affinity: 15, skill: 75 });
      n.name = l.name;
      c.lines[c.lines.length - 1] = { text: `새로운 인연: ${l.name}`, tone: 'good' };
      return true;
    },
    text: (c) => {
      const l = L(c)!;
      return `클럽 벽에 빛바랜 포스터 한 장 — 〈${l.bandName}〉. 이 동네에서 모르는 사람이 없는 밴드다.\n오늘 객석 맨 뒤에 그 밴드의 ${c.nj('sr', '이/가')} 서 있었다. 공연이 끝나자 다가와 말을 걸었다.\n“너 소리, 예전의 나랑 닮았다.”`;
    },
    choices: [
      {
        label: '어떻게 버텼는지 묻는다',
        run: (c) => {
          const l = L(c)!;
          c.skill('compose', 3);
          c.skill('stage', 2);
          c.rel('sr', 15, '선배에게 물어본 밤');
          c.line(legacyTag(l), 'big');
          c.chron(`전설의 선배 밴드 〈${l.bandName}〉의 ${l.name}을 만났다`, 'people', 'sr');
          return `“버틴 게 아니라, 그냥 계속 쓴 거야.” ${c.nj('sr', '이/가')} 오래된 공책을 펼쳐 보였다. 낯익은 글씨였다.`;
        },
      },
      {
        label: '같이 무대에 서 달라고 한다',
        if: (c) => !!c.band,
        odds: (c) => c.dc(11, '부탁 판정', [['주 악기 실력', c.m(c.mainSkill)], ['우리 밴드의 기세', c.p.fans >= 300 ? 1 : 0]], '가정', '선배는 실력을 먼저 본다'),
        run: (c) => {
          const l = L(c)!;
          c.line(legacyTag(l), 'big');
          if (c.check(c.choicesOdds!, '부탁 판정')) {
            c.fans(Math.round(30 + Math.min(600, l.fans * 0.02)));
            c.rep(2);
            c.rel('sr', 12, '같은 무대에 선 밤');
            c.chron(`선배 밴드 〈${l.bandName}〉의 ${l.name}과 한 무대에 섰다`, 'big', 'sr');
            return `${tj(l.bestSong ?? l.bandName!, '을/를')} 같이 불렀다. 객석의 나이 든 팬들이 먼저 따라 불렀다.`;
          }
          c.rel('sr', 4);
          return '“다음에. 네 곡이 하나 더 생기면.” 선배는 웃으며 어깨를 두드렸다.';
        },
      },
    ],
  },
];
