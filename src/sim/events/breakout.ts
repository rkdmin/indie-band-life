// 확 뜰 수 있는 길 — 시대·나라마다 실제로 있었던 TV 경연·라디오·플랫폼·삽입곡·역주행 (data/era/breakouts.json).
// 도전하면 d20 판정 (난이도와 근거는 데이터에), 붙으면 팬이 크게 늘고 드물게 대박이 터진다. 안전한 길도 늘 하나 있다.
// 못 하는 이유(밴드가 없다·팬이 모자라다·실력이 안 된다·외모가 화면에 안 받는다·돈이 부족하다)는 잠긴 선택지로 보인다.
// 실존 인물·밴드는 fact 의 사실 문장으로만 나온다 — 말이나 행동을 지어내지 않는다.

import type { EventDef, Ctx } from '../ctx';
import type { Inst } from '../types';
import type { CountryId } from '../data/countries';
import { hasMedia, type MediaId } from '../data/era/media';
import { playerAppearance } from '../appearance';
import { won, count } from '../korean';
import json from '../../data/era/breakouts.json';

type Mod = 'song' | 'vocal' | 'stage' | 'inst' | 'chem' | 'look' | 'rep' | 'lyric' | 'pitch' | 'rhythm' | 'compose';
interface Route {
  id: string;
  c: CountryId[];
  from: number;
  to: number;
  years?: number[];
  gap?: [number, number];
  name: string;
  kind: string;
  icon: string;
  age: [number, number];
  need: { band?: boolean; songs?: boolean; released?: boolean; album?: boolean; minFans?: number; maxFans?: number; noMajor?: boolean; media?: MediaId };
  offer: number;
  title: string;
  text: string;
  attempt: { label: string; dc: number; ability: string; mods: Mod[]; src: '통계' | '근사' | '가정'; note: string };
  win: { fans: [number, number]; rep: number; line: string; chron: string; money: number; globalFans: number };
  jackpot?: { p: number; fans: [number, number]; line: string; chron: string };
  lose: { line: string; stress: number };
  safe: { label: string; line: string; skill: string; amt: number };
  fact: string;
  src: string;
}

export const ROUTES = json.data as unknown as Route[];

const ct = (c: Ctx) => (c.p.country ?? 'KR') as CountryId;
const route = (c: Ctx) => ROUTES.find((r) => r.id === c.vars.r)!;
const fill = (t: string, c: Ctx) => t.replace(/\{y\}/g, String(Math.floor(c.year)));
const best = (c: Ctx) => Math.max(0, ...c.s.songs.map((x) => x.quality));
const charm = (c: Ctx) => playerAppearance({ ...c.p, country: c.p.country }).charm;
const instSkill = (c: Ctx) => (c.p.mainInst ? c.p.skills[c.p.mainInst as Inst] : 0);

/** 이 해에 열려 있던 길인가 */
export function routeOpen(r: Route, year: number, country: CountryId): boolean {
  const y = Math.floor(year);
  if (!r.c.includes(country)) return false;
  if (r.years ? !r.years.includes(y) : y < r.from || y > r.to) return false;
  if (r.gap && y >= r.gap[0] && y <= r.gap[1]) return false;
  if (r.need.media && !hasMedia(r.need.media, year, country)) return false;
  return true;
}

/** 길이 눈앞에 나타날 조건 (못 하는 이유와 별개로, 아예 상관없는 길은 보이지 않는다) */
function fits(r: Route, c: Ctx): boolean {
  if (!routeOpen(r, c.year, ct(c)) || c.flag(`bo:${r.id}`)) return false;
  if (c.age < r.age[0] || c.age > r.age[1]) return false;
  if (r.need.band && !c.band) return false;
  if (r.need.songs && c.s.songs.length === 0) return false;
  if (r.need.released && !c.s.songs.some((x) => x.released)) return false;
  if (r.need.album && !c.s.albums.some((a) => a.kind !== 'single')) return false;
  if (r.need.maxFans !== undefined && c.p.fans > r.need.maxFans) return false;
  // 무명에게 섭외는 오지 않는다 — 팬이 필요 인원의 절반도 안 되면 길 자체가 안 보인다
  if (r.need.minFans && c.p.fans < r.need.minFans * 0.5) return false;
  return true;
}

const MOD_LABEL: Record<Mod, string> = { song: '곡 완성도', vocal: '보컬', stage: '무대', inst: '주 악기', chem: '밴드 합', look: '외모', rep: '평판', lyric: '가사 감각', pitch: '음감', rhythm: '리듬감', compose: '작곡' };
function modValue(m: Mod, c: Ctx): number {
  switch (m) {
    case 'song': return c.m(best(c));
    case 'vocal': return c.m(c.p.skills.vocal);
    case 'stage': return c.m(c.p.skills.stage);
    case 'inst': return c.m(instSkill(c));
    case 'chem': return c.band ? c.m(c.band.chemistry) : 0;
    case 'look': return Math.round((charm(c) - 50) / 15);
    case 'rep': return c.m(c.p.rep);
    case 'compose': return c.m(c.p.skills.compose);
    default: return c.m(c.p.talents[m]);
  }
}
function rawValue(m: Mod, c: Ctx): number {
  switch (m) {
    case 'song': return best(c);
    case 'vocal': return c.p.skills.vocal;
    case 'stage': return c.p.skills.stage;
    case 'inst': return instSkill(c);
    case 'chem': return c.band?.chemistry ?? 0;
    case 'look': return charm(c);
    case 'rep': return c.p.rep;
    case 'compose': return c.p.skills.compose;
    default: return c.p.talents[m];
  }
}

/** 도전할 수 없는 이유 — 잠긴 선택지에 그대로 보인다 */
function whyNot(r: Route, c: Ctx): string | null {
  if (r.need.minFans && c.p.fans < r.need.minFans) return `아직 무명이다 — 팬 ${count(r.need.minFans)}명은 돼야 연락이 온다 (지금 ${count(c.p.fans)}명)`;
  if (r.need.noMajor && c.band?.label === 'major') return '대형 기획사 소속이라 나갈 수 없다';
  // 화면이 중요한 무대인데 외모 매력이 아주 낮으면 서류에서 걸러진다 [가정]
  if (r.attempt.mods.includes('look') && (r.kind === 'tv' || r.kind === 'audition') && charm(c) < 25) return `외모가 화면에 안 받는다는 말을 들었다 (매력 ${charm(c)})`;
  // 핵심 능력(첫 번째 보정)이 바닥이면 예선 자격이 없다
  const key = r.attempt.mods[0];
  const need = r.kind === 'tv' && r.age[0] <= 8 ? 8 : r.attempt.dc >= 17 ? 30 : 20;
  if (key !== 'look' && key !== 'rep' && rawValue(key, c) < need) return `실력이 안 된다 — ${MOD_LABEL[key]} ${Math.round(rawValue(key, c))} (최소 ${need})`;
  if (r.win.money < 0 && c.p.money < c.krw(-r.win.money)) return `돈이 부족하다 — 제작비 ${won(c.krw(-r.win.money))} (통장 ${won(Math.max(0, c.p.money))})`;
  return null;
}

export const BREAKOUT_EVENTS: EventDef[] = [
  {
    id: 'b_route', scene: (c) => (route(c)?.kind === 'radio' ? 'home' : route(c)?.kind === 'net' || route(c)?.kind === 'revival' ? 'home' : route(c)?.kind === 'club' ? 'club' : 'festival'),
    title: (c) => fill(route(c).title, c), kicker: 'BREAKOUT', cooldown: 3,
    chance: (c) => Math.max(...ROUTES.filter((r) => fits(r, c)).map((r) => r.offer), 0),
    when: (c) => c.p.military !== 'serving' && ROUTES.some((r) => fits(r, c)),
    bind: (c) => {
      const pool = ROUTES.filter((r) => fits(r, c));
      if (!pool.length) return false;
      const r = c.rng.weighted(pool, (x) => x.offer)!;
      c.vars.r = r.id;
      return true;
    },
    text: (c) => {
      const r = route(c);
      return `${fill(r.text, c)}\n\n📊 실제로: ${r.fact}`;
    },
    choices: [
      {
        label: (c) => `${route(c).icon} ${route(c).attempt.label}`,
        risk: 'gamble',
        req: (c) => whyNot(route(c), c),
        hint: (c) => { const a = route(c).attempt; return a.note.includes('[') ? a.note : `[${a.src}] ${a.note}`; },
        range: (c) => {
          const r = route(c);
          const top = r.jackpot ? r.jackpot.fans[1] : r.win.fans[1];
          return `실패하면 스트레스 +${r.lose.stress} · 붙으면 팬 +${count(r.win.fans[0])}~${count(r.win.fans[1])}${r.jackpot ? ` · 대박이면 +${count(top)}` : ''}`;
        },
        odds: (c) => {
          const r = route(c);
          return c.dc(r.attempt.dc, r.attempt.ability, r.attempt.mods.map((m) => [MOD_LABEL[m], modValue(m, c)] as [string, number]), r.attempt.src, `${r.attempt.note} · 출처: ${r.src}`);
        },
        run: (c) => {
          const r = route(c);
          c.set(`bo:${r.id}`);
          if (r.win.money < 0) c.money(c.krw(r.win.money), `${r.name} 제작비`);
          if (!c.check(c.choicesOdds!)) {
            c.stat('stress', r.lose.stress);
            c.skill('stage', 1);
            return r.lose.line;
          }
          c.set(`boWin:${r.kind}`);
          const jp = r.jackpot && c.roll(r.jackpot.p);
          const [lo, hi] = jp ? r.jackpot!.fans : r.win.fans;
          c.fans(c.rng.int(lo, hi));
          c.rep(r.win.rep);
          if (r.win.money > 0) c.money(c.krw(r.win.money), `${r.name} 수익`);
          if (r.win.globalFans) {
            c.p.globalFans += r.win.globalFans;
            c.line(`해외 팬 +${count(r.win.globalFans)}`, 'good');
          }
          c.stat('happiness', jp ? 15 : 8);
          c.chron(fill(jp ? r.jackpot!.chron : r.win.chron, c), jp ? 'big' : 'music');
          if (jp) c.line('🎆 대박', 'big');
          return jp ? r.jackpot!.line : r.win.line;
        },
      },
      {
        label: (c) => route(c).safe.label,
        risk: 'safe',
        run: (c) => {
          const r = route(c);
          c.set(`bo:${r.id}`);
          const k = r.safe.skill;
          if (k === 'inst') c.skill((c.p.mainInst as Inst) ?? 'guitar', r.safe.amt);
          else if (k === 'lyric') c.skill('compose', r.safe.amt);
          else c.skill(k as 'stage', r.safe.amt);
          c.stat('happiness', 3);
          return r.safe.line;
        },
      },
    ],
  },
];
