// 성형 — 외모(매력)를 바꿀 수 있는 몇 안 되는 길. 성공도, 티 안 남도, 실패도, 부작용도 있다.
// 나라마다 흔해진 시기와 빈도가 다르고(data/fate/cosmetic.json), 수술마다 비용·결과 분포가 다르다.
// 매력은 공연 팬 증가·TV·오디션 무대에 쓰인다. 쌍꺼풀 수술이 잘되면 도트 초상화에도 쌍꺼풀이 생긴다.

import type { EventDef, Ctx } from '../ctx';
import type { CardInfo } from '../types';
import type { CountryId } from '../data/countries';
import { countryOf } from '../data/countries';
import { playerAppearance, charmWord } from '../appearance';
import { clamp } from '../rng';
import { won } from '../korean';
import json from '../../data/fate/cosmetic.json';

type Outcome = 'great' | 'good' | 'meh' | 'bad' | 'comp';
interface Proc {
  id: string;
  label: string;
  icon: string;
  cost: number;
  recovery: string;
  gain: [number, number];
  from: Record<string, number>;
  outcomes: Record<Outcome, number>;
  note: string;
}
const D = json.data as unknown as { mainstream: Record<string, number>; popularity: Record<string, number>; maxPerLife: number; procedures: Proc[] };

const ct = (c: Ctx) => (c.p.country ?? 'KR') as CountryId;
const app = (c: Ctx) => {
  // 외모를 바꾸려면 저장된 외모가 있어야 한다 (옛 저장이면 지금 만들어 둔다)
  if (!c.p.app) c.p.app = playerAppearance({ ...c.p, country: c.p.country });
  return c.p.app;
};
const price = (c: Ctx, p: Proc) => c.krw(p.cost * countryOf(c.p.country).costMul);
const open = (c: Ctx, p: Proc) => c.year >= (p.from[ct(c)] ?? 9999);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function run(c: Ctx, p: Proc): string {
  const a = app(c);
  c.money(-price(c, p), p.label);
  c.inc('surgeries');
  const r = c.rng.weighted(Object.keys(p.outcomes) as Outcome[], (k) => p.outcomes[k])!;
  const before = a.charm;
  const [lo, hi] = p.gain;
  switch (r) {
    case 'great':
      a.charm = clamp(a.charm + c.rng.int(Math.round((lo + hi) / 2), hi), 5, 98);
      if (p.id === 'eyelid') a.doubleEyelid = true;
      c.stat('happiness', 12);
      c.set('surgeryGreat');
      break;
    case 'good':
      a.charm = clamp(a.charm + c.rng.int(lo, Math.round((lo + hi) / 2)), 5, 98);
      if (p.id === 'eyelid') a.doubleEyelid = true;
      c.stat('happiness', 6);
      break;
    case 'meh':
      a.charm = clamp(a.charm + c.rng.int(0, 2), 5, 98);
      c.stat('happiness', -3);
      break;
    case 'bad':
      a.charm = clamp(a.charm - c.rng.int(3, 9), 5, 98);
      c.stat('stress', 12);
      c.stat('happiness', -10);
      c.set('surgeryRegret');
      break;
    case 'comp':
      a.charm = clamp(a.charm - c.rng.int(0, 4), 5, 98);
      c.stat('health', -c.rng.int(6, 14));
      c.stat('stress', 15);
      c.money(-Math.round(price(c, p) * 0.4), '부작용 치료');
      c.set('surgeryRegret');
      break;
  }
  const d = a.charm - before;
  // 변화 줄에 ‘매력 +9’로 — 돈·행복과 나란히 보이게
  if (Math.abs(d) >= 1) c.lines.push({ text: `매력 ${d > 0 ? '+' : ''}${d}`, tone: d > 0 ? 'good' : 'bad', delta: true });
  c.chron(`${p.label}을 받았다${r === 'great' ? ' — 거울 속 얼굴이 마음에 들었다' : r === 'bad' || r === 'comp' ? ' — 후회했다' : ''}`, 'life');
  const lines: Record<Outcome, string[]> = {
    great: ['붓기가 빠지자 친구들이 못 알아봤다. 무대 사진이 처음으로 마음에 들었다.', '거울을 볼 때마다 웃음이 났다. 공연 날 조명이 얼굴에 예쁘게 떨어졌다.'],
    good: ['자연스럽게 잘됐다. “뭐 달라졌어?” 소리를 들을 정도로.', '크게 티는 안 나는데, 사진이 조금 더 잘 나온다.'],
    meh: ['돈 들인 것치고는 별로 달라진 게 없다. 엄마만 알아봤다.', '전후 사진을 나란히 놓고 봐도 잘 모르겠다.'],
    bad: ['짝짝이가 됐다. 재수술 상담 예약을 잡았다. 한동안 모자를 눌러썼다.', '마음에 안 든다. 거울 앞에 서는 게 무서워졌다.'],
    comp: ['붓기가 좀처럼 빠지지 않았다. 감각이 돌아오는 데 몇 달이 걸렸다.', '염증으로 병원을 다시 찾았다. 몸이 먼저 대가를 치렀다.'],
  };
  return c.pick(lines[r]);
}

export const SURGERY_EVENTS: EventDef[] = [
  {
    id: 'c_surgery', scene: 'hospital', title: '거울 앞에서', kicker: 'FACE CARDS', cards: true, cooldown: 14,
    chance: (c) => {
      const pop = D.popularity[ct(c)] ?? 1;
      const charm = app(c).charm;
      // 매력이 낮거나, 무대·방송 일을 할수록 더 자주 고민한다
      // 여성의 성형 경험률이 훨씬 높다 (한국 20대 여성 2015년 31%) — 남성 배율은 [가정]
      const sex = c.p.gender === 'f' ? 1 : 0.35;
      return 0.025 * pop * sex * (charm < 40 ? 1.8 : charm < 55 ? 1.2 : 0.6) * (c.band ? 1.3 : 1);
    },
    when: (c) => c.age >= 19 && c.age < 50 && c.p.military !== 'serving' && c.year >= (D.mainstream[ct(c)] ?? 9999) && Number(c.s.flags.surgeries ?? 0) < D.maxPerLife && D.procedures.some((p) => open(c, p)),
    text: (c) => {
      const a = app(c);
      const by = c.vary('surgery_open', [
        `공연 사진 속 내 얼굴이 자꾸 눈에 걸린다. 매력은 지금 ${charmWord(a.charm)} 정도.`,
        '친구가 성형외과 상담 후기를 보여 줬다. “요즘 다 해. 티도 안 나.”',
        c.year >= 2010 ? '무대 직캠 댓글에 얼굴 얘기가 달렸다. 노래 얘기는 하나도 없었다.' : '공연 리뷰에 얼굴 얘기가 실렸다. 노래 얘기는 한 줄뿐이었다.',
        '홍보 사진을 찍는 날, 사진작가가 “각도를 좀 바꿔 볼까요”라고 했다.',
      ]);
      return `${by}\n결과는 아무도 장담 못 한다. 잘되면 무대가 달라지고, 안되면 돈과 마음이 다친다.`;
    },
    choices: [
      ...D.procedures.map((p) => ({
        label: p.label,
        if: (c: Ctx) => open(c, p),
        risk: (p.id === 'jaw' ? 'gamble' : 'risky') as 'gamble' | 'risky',
        cost: (c: Ctx) => price(c, p),
        range: (c: Ctx) => `잘되면 매력 +${p.gain[0]}~${p.gain[1]} · 망하면 매력 −9, 부작용이면 건강도`,
        card: (c: Ctx): CardInfo => ({
          title: p.label,
          icon: p.icon,
          tag: p.id === 'jaw' ? '도박' : '모험',
          stats: [
            ['비용', won(price(c, p))],
            ['회복', p.recovery],
            ['만족', pct(p.outcomes.great + p.outcomes.good)],
            ['재수술·부작용', pct(p.outcomes.bad + p.outcomes.comp)],
          ],
          sub: p.id === 'eyelid' ? '가장 흔한 수술. 비교적 가볍다.' : p.id === 'nose' ? '인상이 크게 바뀐다. 재수술도 적지 않다.' : '얼굴형이 바뀐다. 회복이 길고 위험도 크다.',
          data: p.note,
        }),
        run: (c: Ctx) => run(c, p),
      })),
      {
        label: '지금 얼굴로 무대에 선다',
        risk: 'safe' as const,
        card: () => ({ title: '이대로 간다', icon: '🎤', tag: '안정', stats: [['비용', '0원'], ['매력', '그대로']], sub: '얼굴 말고 노래로.' }),
        run: (c: Ctx) => { c.stat('stress', -3); c.skill('stage', 1); return c.pick(['거울 대신 악보를 봤다. 그날 합주는 유난히 잘 맞았다.', '“얼굴 말고 노래로 기억되자.” 멤버들에게 그렇게 말하고 나니 마음이 편했다.']); },
      },
    ],
  },
];
