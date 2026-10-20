// 나라별 생활 사건 — data/world/country_life.json 을 사건으로 바꾼다.
// 한국 인생엔 수능·병역·명절·찜질방이 있듯, 다른 나라 인생에도 그 나라에서만 겪는 일이 있게.

import type { EventDef, Ctx } from '../ctx';
import type { Skill } from '../types';
import json from '../../data/world/country_life.json';

type Fx = {
  happiness?: number; stress?: number; health?: number;
  skill?: Partial<Record<Skill, number>>;
  fans?: number; money?: number; rep?: number; theme?: string; chron?: string; flag?: string; insp?: number;
};
type Branch = { fx?: Fx; out: string };
type Roll = { dc: number; skill: 'stage' | 'main' | 'compose' | 'charm'; why: string; win: Branch; lose: Branch };
type Choice = { label: string; fx?: Fx; out?: string; roll?: Roll };
type Row = {
  id: string; c: string; scene: string; title: string; text: string; choices: Choice[];
  age?: [number, number]; from?: number; to?: number; band?: boolean; solo?: boolean; fans?: [number, number];
  job?: string; sex?: 'm' | 'f'; chance?: number; once?: boolean; cooldown?: number; when?: 'healthLow' | 'noJob';
};
const ROWS = json.data as unknown as Row[];

function apply(c: Ctx, fx: Fx | undefined) {
  if (!fx) return;
  if (fx.money) c.money(fx.money > 0 ? c.krw(fx.money) : -c.krw(-fx.money), fx.money > 0 ? '수입' : '지출');
  if (fx.happiness) c.stat('happiness', fx.happiness);
  if (fx.stress) c.stat('stress', fx.stress);
  if (fx.health) c.stat('health', fx.health);
  for (const [k, v] of Object.entries(fx.skill ?? {})) c.skill(k as Skill, v as number);
  if (fx.fans) c.fans(fx.fans);
  if (fx.rep) c.rep(fx.rep);
  if (fx.insp) c.p.inspiration = Math.min(3, c.p.inspiration + fx.insp);
  if (fx.theme) c.theme(fx.theme);
  if (fx.flag) c.set(fx.flag);
  if (fx.chron) c.chron(fx.chron, 'life');
}

function rollOdds(c: Ctx, r: Roll) {
  const charm = c.p.app?.charm ?? 50;
  const mod: [string, number][] =
    r.skill === 'stage' ? [['무대 실력', c.m(c.p.skills.stage)]]
    : r.skill === 'compose' ? [['작곡 실력', c.m(c.p.skills.compose)]]
    : r.skill === 'charm' ? [['매력', Math.floor((charm - 50) / 10)]]
    : [['주 악기 실력', c.m(c.mainSkill)]];
  return c.dc(r.dc, '판정', mod, '가정', r.why);
}

const fits = (c: Ctx, r: Row) => {
  const p = c.p;
  if ((p.country ?? 'KR') !== r.c) return false;
  if (r.age && (c.age < r.age[0] || c.age >= r.age[1])) return false;
  if (r.band && !c.band) return false;
  if (r.solo && c.band) return false;
  if (r.fans && (p.fans < r.fans[0] || p.fans >= r.fans[1])) return false;
  if (r.job && p.job !== r.job) return false;
  if (r.sex && p.gender !== r.sex) return false;
  if (r.when === 'healthLow' && p.stats.health >= 55) return false;
  if (r.when === 'noJob' && !(p.job === 'none' || p.job === 'part' || p.job === undefined)) return false;
  return true;
};

export const COUNTRY_LIFE_EVENTS: EventDef[] = ROWS.map((r) => ({
  id: r.id,
  scene: r.scene as EventDef['scene'],
  title: r.title,
  chance: r.chance ?? 0.2,
  once: r.once,
  cooldown: r.cooldown,
  minYear: r.from,
  maxYear: r.to,
  when: (c: Ctx) => fits(c, r),
  text: () => r.text,
  choices: r.choices.map((ch) => ({
    label: ch.label,
    ...(ch.fx?.money && ch.fx.money < 0 ? { cost: (c: Ctx) => c.krw(-ch.fx!.money!) } : {}),
    ...(ch.roll ? { odds: (c: Ctx) => rollOdds(c, ch.roll!), risk: 'risky' as const } : {}),
    run: (c: Ctx) => {
      apply(c, ch.fx);
      if (!ch.roll) return ch.out ?? '';
      const b = c.check(c.choicesOdds!) ? ch.roll.win : ch.roll.lose;
      apply(c, b.fx);
      return b.out;
    },
  })),
}));
