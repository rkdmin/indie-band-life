// 어린 시절의 ‘갖고 싶다’ — 일하기 전엔 용돈이 전부다. 모아서 사거나, 부모님께 조르거나, 중고로 구하거나, 포기하거나.
// 형편이 넉넉하면 부모님이 사 준다. 보통이면 설득해야 하고, 빠듯하면 말조차 꺼내기 어렵다 (잠긴 선택지로 보인다).
// 값은 2026년 원화 기준 [근사 — 중고·입문용 시세], 그 해 물가로 바꿔 쓴다.

import type { EventDef, Ctx } from '../ctx';
import type { Genre, Inst } from '../types';
import { won } from '../korean';
import { hasMedia } from '../data/era/media';
import type { CountryId } from '../data/countries';

interface Want {
  id: string;
  label: string;
  price: number;
  used: number;
  inst?: Inst;
  genre?: Genre;
  skill: 'guitar' | 'bass' | 'drums' | 'keys' | 'vocal' | 'compose';
  amt: number;
  ok: (c: Ctx) => boolean;
  line: string;
}

const ct = (c: Ctx) => (c.p.country ?? 'KR') as CountryId;
const WANTS: Want[] = [
  { id: 'eguitar', label: '입문용 일렉기타와 작은 앰프', price: 450_000, used: 200_000, inst: 'guitar', genre: 'indierock', skill: 'guitar', amt: 6, ok: (c) => c.age >= 12, line: '앰프 볼륨 3에서 방바닥이 울렸다.' },
  { id: 'pedal', label: '디스토션 페달', price: 120_000, used: 60_000, genre: 'punk', skill: 'guitar', amt: 3, ok: (c) => c.p.mainInst === 'guitar' && c.year >= 1970, line: '밟자마자 소리가 찢어졌다. 좋은 쪽으로.' },
  { id: 'keyboard', label: '61건반 키보드', price: 300_000, used: 120_000, inst: 'keys', genre: 'indiepop', skill: 'keys', amt: 5, ok: (c) => c.year >= 1985, line: '헤드폰을 꽂고 밤새 코드를 짚었다.' },
  { id: 'pad', label: '드럼 연습 패드와 스틱', price: 80_000, used: 40_000, inst: 'drums', skill: 'drums', amt: 4, ok: () => true, line: '아래층에서 올라오기 전까지는 행복했다.' },
  { id: 'bass', label: '중고 베이스', price: 350_000, used: 180_000, inst: 'bass', skill: 'bass', amt: 5, ok: (c) => c.age >= 13, line: '낮은 음이 배 속까지 울렸다.' },
  { id: 'walkman', label: '휴대용 카세트 플레이어', price: 150_000, used: 70_000, skill: 'compose', amt: 2, ok: (c) => hasMedia('walkman', c.year, ct(c)) && c.year < 2002, line: '등굣길이 영화가 됐다.' },
  { id: 'mp3', label: 'MP3 플레이어', price: 200_000, used: 90_000, skill: 'compose', amt: 2, ok: (c) => hasMedia('mp3', c.year, ct(c)) && c.year < 2012, line: '512MB에 백 곡이 들어갔다. 백 곡을 다 외웠다.' },
  { id: 'phones', label: '좋은 헤드폰', price: 180_000, used: 80_000, skill: 'compose', amt: 3, ok: (c) => c.year >= 1980, line: '같은 노래인데 베이스 라인이 처음 들렸다.' },
  { id: 'mic', label: '홈레코딩 마이크', price: 160_000, used: 70_000, skill: 'vocal', amt: 3, ok: (c) => c.year >= 2005 && c.age >= 13, line: '처음 녹음한 내 목소리가 너무 낯설었다.' },
];

const want = (c: Ctx) => WANTS.find((w) => w.id === c.vars.w)!;
const price = (c: Ctx) => c.krw(want(c).price * (c.p.country && c.p.country !== 'KR' ? 1.1 : 1));
const usedPrice = (c: Ctx) => c.krw(want(c).used);
const parents = (c: Ctx) => Object.values(c.s.npcs).filter((n) => n.role === 'parent' && n.alive);

function gain(c: Ctx, w: Want, mul = 1) {
  if (w.inst) c.setInst(w.inst);
  c.skill(w.skill, w.amt * mul);
  if (w.genre) c.genre(w.genre, 4);
  c.stat('happiness', 8);
  c.inc(`want:${w.id}`);
}

export const WANT_EVENTS: EventDef[] = [
  {
    id: 'w_want', scene: 'street', title: (c) => `갖고 싶은 것 — ${want(c).label}`, cooldown: 3, chance: 0.22,
    when: (c) => c.age >= 9 && c.age < 19 && (c.p.job === 'none' || c.p.job === 'part'),
    bind: (c) => {
      const pool = WANTS.filter((w) => w.ok(c) && !c.flag(`want:${w.id}`));
      if (!pool.length) return false;
      c.vars.w = c.pick(pool).id;
      return true;
    },
    text: (c) => {
      const w = want(c);
      return `악기점 진열장의 ${w.label}. 새것 ${won(price(c))}, 중고 ${won(usedPrice(c))}.\n지금 통장에는 ${won(Math.max(0, c.p.money))}. ${c.p.income === 'high' ? '집은 넉넉한 편이다.' : c.p.income === 'low' ? '집 사정은 내가 제일 잘 안다.' : '조르면 될 것 같기도, 안 될 것 같기도 하다.'}`;
    },
    choices: [
      {
        label: '모아 둔 용돈으로 새것을 산다',
        risk: 'safe',
        cost: (c) => price(c),
        run: (c) => { c.money(-price(c), want(c).label); gain(c, want(c)); c.chron(`용돈을 모아 ${want(c).label}을(를) 샀다`, 'music'); return want(c).line; },
      },
      {
        label: '부모님께 사 달라고 조른다',
        risk: 'risky',
        req: (c) => (!parents(c).length ? '사 달라고 할 부모님이 곁에 없다' : c.p.income === 'low' ? '형편이 어려운 걸 안다 — 차마 말을 꺼내지 못했다' : null),
        hint: (c) => (c.p.income === 'high' ? '집이 넉넉하다 — 거의 사 준다' : c.p.income === 'mid' ? '보통 형편 — 성적과 사이가 관건' : undefined),
        odds: (c) => {
          const pa = parents(c)[0];
          return c.dc(c.p.income === 'high' ? 4 : 12, '설득 판정', [['부모님과 사이', pa ? Math.floor((pa.affinity - 40) / 15) : 0], ['성적', Math.floor((c.p.study - 45) / 15)]], '가정', '형편이 넉넉할수록 쉽게 사 준다 [가정]');
        },
        run: (c) => {
          const w = want(c);
          if (c.check(c.choicesOdds!)) {
            gain(c, w);
            for (const n of parents(c)) n.affinity = Math.min(100, n.affinity + 3);
            c.chron(`부모님이 ${w.label}을(를) 사 주었다`, 'music');
            return c.p.income === 'high' ? `“그 정도야 뭐.” 다음 날 택배가 왔다.\n${w.line}` : `“이번 한 번이다.” 대신 다음 시험은 꼭 잘 봐야 한다.\n${w.line}`;
          }
          c.stat('stress', 4);
          return '“공부나 해.” 대화는 거기서 끝났다.';
        },
      },
      {
        label: '중고 거래로 싸게 구한다',
        risk: 'risky',
        cost: (c) => usedPrice(c),
        odds: (c) => c.dc(8, '중고 운', [], '가정', '중고는 상태가 복불복 [가정]'),
        run: (c) => {
          const w = want(c);
          c.money(-usedPrice(c), `중고 ${w.label}`);
          if (c.check(c.choicesOdds!)) { gain(c, w, 0.9); return `상태가 생각보다 좋았다. 전 주인이 아끼던 물건이었다.\n${w.line}`; }
          gain(c, w, 0.4);
          c.stat('stress', 3);
          return '받아 보니 고장이 있었다. 고쳐 쓰는 법은 배웠다.';
        },
      },
      {
        label: '방학에 알바해서 산다',
        req: (c) => (c.age < 16 ? `아직 알바를 할 수 없는 나이다 (${Math.floor(c.age)}살)` : null),
        run: (c) => { const w = want(c); c.stat('energy', -10); c.stat('stress', 3); gain(c, w); c.chron(`방학 알바비로 ${w.label}을(를) 샀다`, 'music'); return `전단지 돌린 손으로 처음 만져 본 내 물건.\n${w.line}`; },
      },
      { label: '진열장만 보고 돌아선다', run: (c) => { c.stat('happiness', -2); c.skill('compose', 1); return '대신 그 소리를 머릿속으로 상상하며 걸었다.'; } },
    ],
  },
];
