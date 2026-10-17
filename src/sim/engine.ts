// 게임 엔진. UI 는 이 파일의 함수만 부른다. 모든 함수는 상태를 복제해 새 상태를 돌려준다.
//
// 시간은 ‘시기(period)’ 단위로 계산하고, 화면은 그 사이를 실시간으로 흘려보낸다.
//   phase 'plan'    → beginPeriod(): 생활 계획을 적용하고 기록·사건을 이번 시기에 흩뿌린다
//   phase 'running' → 시계가 사건 시점에 닿으면 openEvent() → phase 'event'
//   phase 'event'   → choose() → proceed() → 다시 'running'
//   시계가 시기 끝에 닿으면 endPeriod() → 다음 시기 'plan' (또는 'ending')

import type { ActionPick, ActiveEvent, FeedEntry, Odds, PendingRoll, GameState, Gender, Genre, Income, ParentTaste, Region, ResultLine } from './types';
import { GENRES } from './types';
import { Rng, clamp, hashStr } from './rng';
import { Ctx, book, type EventDef } from './ctx';
import { ARTIST_SURVEY } from './data/reality';
import { ACTIONS, actionById } from './actions';
import { EVENTS, eventById } from './events';
import { actionSlots, age, ageInt, chron, livingCost, stepSize } from './state';
import { REGIONS, annualDeathProb, minWage, priceIndex } from './data/world';
import { ageNpcs, createNpc } from './npc';
import { yearlyStreams } from './songs';
import { computeEnding } from './endings';
import { won } from './korean';
import { flavorLines } from './flavor';
import { narrate, resolvePlan } from './plan';

export const SAVE_VERSION = 5;

/** 전체 화면 연출로 보여 줄 큰 사건 */
export const CINEMATIC = new Set([
  'birth', 'first_inst', 'first_live', 'club_audition', 'school_festival', 'suneung', 'teen_band_end',
  'draft', 'discharge', 'old_friend_call', 'crossroads30', 'label_indie', 'label_major', 'fest_local', 'fest_big',
  'pandemic', 'band_boom', 'debt_crisis', 'reunion', 'producer_friend', 'parent_farewell', 'retire_ask', 'revival',
  'move_out', 'life_proposal', 'life_baby', 'life_friend_funeral', 'life_last_call', 'life_grandchild',
  'g_invite', 'g_stage', 'g_asia_tour', 'g_world_tour', 'release_ready',
  'car_overseas_fest', 'car_tv_live', 'car_survival_show', 'car_drama_ost', 'car_club_closing', 'car_tribute_cover',
]);

export interface NewGameOptions {
  name: string;
  gender: Gender;
  birthYear: number;
  region?: Region;
  seed?: number;
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export function newGame(o: NewGameOptions): GameState {
  const seed = o.seed ?? (hashStr(o.name + o.birthYear + Date.now()) >>> 0);
  const rng = new Rng(seed);
  const region = o.region ?? rng.weighted(REGIONS, (r) => r.weight)!.id;
  const income: Income = rng.weighted(['low', 'mid', 'high'] as Income[], (i) => ({ low: 0.3, mid: 0.5, high: 0.2 })[i])!;
  const taste: ParentTaste = rng.weighted(['indierock', 'folk', 'classical', 'trot', 'ballad', 'none', 'metal', 'indiepop'] as ParentTaste[], (t) => ({ classical: 2, ballad: 3, trot: 2, none: 2, folk: 1.5, indierock: 1.2, metal: 0.4, indiepop: 1 } as Record<string, number>)[t])!;
  const genre = Object.fromEntries(GENRES.map((g) => [g, 5])) as Record<Genre, number>;
  const s: GameState = {
    version: SAVE_VERSION,
    id: `run_${seed.toString(36)}`,
    seed,
    rng: seed,
    turn: 0,
    time: o.birthYear - 0.5,
    player: {
      name: o.name,
      gender: o.gender,
      birthYear: o.birthYear,
      region,
      income,
      parentTaste: taste,
      instrumentAtHome: rng.chance(income === 'high' ? 0.6 : income === 'mid' ? 0.35 : 0.15),
      look: rng.int(1, 1_000_000),
      skills: { vocal: 3, guitar: 0, bass: 0, drums: 0, keys: 0, compose: 0, stage: 2 },
      mainInst: null,
      genre,
      stats: { happiness: 65, stress: 20, health: 72, energy: 80 },
      money: income === 'high' ? 3_000_000 : income === 'mid' ? 1_000_000 : 300_000,
      fans: 0,
      globalFans: 0,
      inspiration: 1,
      rep: 0,
      habits: { smoking: false, smokeYears: 0, drinking: 0, exercise: 1 },
      edu: 'none',
      study: 40,
      job: 'none',
      military: o.gender === 'm' ? 'pending' : 'none',
      militaryUntil: 0,
      partnerId: null,
      alive: true,
      retired: false,
      deathAge: null,
    },
    npcs: {},
    npcSeq: 0,
    band: null,
    pastBands: [],
    songs: [],
    albums: [],
    chronicle: [],
    flags: {},
    fired: {},
    queue: [],
    active: null,
    lastResults: [],
    news: [],
    lastActions: [],
    plan: [],
    autoPlan: true,
    autoDecide: false,
    feed: [],
    cine: [],
    periodEnd: o.birthYear,
    lastScene: 'nursery',
    stressTurns: 0,
    history: [],
    ledger: { music: 0, cost: 0, other: 0 },
    ledgers: [],
    phase: 'plan',
    ending: null,
    peakFans: 0,
  };
  const mom = createNpc(s, rng, { gender: 'f', birthYear: o.birthYear - rng.int(27, 35), metAt: '가족', role: 'parent', affinity: 80, skill: 10 });
  const dad = createNpc(s, rng, { gender: 'm', birthYear: o.birthYear - rng.int(28, 37), metAt: '가족', role: 'parent', affinity: 70, skill: 10 });
  dad.name = o.name[0] + dad.name.slice(1); // 아버지의 성을 따른다
  s.flags.mom = mom.id;
  s.flags.dad = dad.id;
  s.rng = rng.state;
  return s;
}

// ───────────────────────── 사건 ─────────────────────────

function evTitle(def: EventDef, c: Ctx) {
  return typeof def.title === 'function' ? def.title(c) : def.title;
}

function materialize(s: GameState, rng: Rng, id: string, bind: Record<string, string>, at: number, vars?: Record<string, string | number>): ActiveEvent | null {
  const def = eventById(id);
  if (!def) return null;
  const c = new Ctx(s, rng, { ...bind }, vars ?? {});
  try {
    // 예약 시점과 노출 시점 사이에 상황이 바뀌었을 수 있다 (예: 그 사이 밴드 해체)
    if (!def.queued && !def.when(c)) return null;
    if (def.bind && !def.queued && !def.bind(c)) return null;
    if (def.queued && def.bind && Object.keys(bind).length === 0 && !def.bind(c)) return null;
    const choices = def.choices.map((ch) => {
      const ok = ch.if ? ch.if(c) : true;
      return { label: typeof ch.label === 'function' ? ch.label(c) : ch.label, hint: ch.hint?.(c), disabled: !ok, odds: ok ? ch.odds?.(c) : undefined };
    });
    if (!choices.some((x) => !x.disabled)) return null;
    return {
      id,
      bind: c.bind,
      vars: c.vars,
      title: evTitle(def, c),
      text: def.text(c),
      scene: typeof def.scene === 'function' ? def.scene(c) : def.scene,
      choices,
      at,
      big: CINEMATIC.has(id),
    };
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('event failed', id, e);
    return null;
  }
}

function eligible(s: GameState, rng: Rng, def: EventDef): boolean {
  if (def.queued) return false;
  if (def.once && s.fired[def.id] !== undefined) return false;
  if (def.cooldown && s.fired[def.id] !== undefined && s.turn - s.fired[def.id] < def.cooldown) return false;
  const c = new Ctx(s, rng);
  try {
    return def.when(c);
  } catch {
    return false;
  }
}

function scheduleEvents(s: GameState, rng: Rng) {
  const story: EventDef[] = [];
  const random: EventDef[] = [];
  for (const def of EVENTS) {
    if (!eligible(s, rng, def)) continue;
    const c = new Ctx(s, rng);
    const p = typeof def.chance === 'function' ? def.chance(c) : def.chance ?? 0.12;
    if (!rng.chance(p)) continue;
    ((def.priority ?? 0) >= 100 ? story : random).push(def);
  }
  story.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const picked: EventDef[] = story.slice(0, 2);
  const maxRandom = picked.length >= 2 ? 0 : picked.length === 1 ? (rng.chance(0.35) ? 1 : 0) : rng.chance(0.4) ? 2 : 1;
  for (const def of rng.shuffle(random)) {
    if (picked.length >= 3 || picked.filter((d) => (d.priority ?? 0) < 100).length >= maxRandom) break;
    picked.push(def);
  }
  for (const def of picked) s.queue.push({ id: def.id, bind: {} });
}

// ───────────────────────── 기록 ─────────────────────────

function summarize(lines: ResultLine[]): string | undefined {
  const d = lines.filter((l) => l.delta).map((l) => l.text);
  return d.length ? d.join(' · ') : undefined;
}

function pushFeed(s: GameState, e: FeedEntry) {
  s.feed.push(e);
  if (s.feed.length > 400) s.feed.splice(0, s.feed.length - 400);
}

/** 결과 줄 묶음을 기록으로: 서술 문장은 각각, 수치 변화는 앞 문장 뒤에 작게 */
function linesToFeed(s: GameState, lines: ResultLine[], t: number, lead?: string, kind: FeedEntry['kind'] = 'action') {
  const sentences = lines.filter((l) => !l.delta);
  const deltas = summarize(lines);
  if (lead) {
    pushFeed(s, { t, text: lead, tone: 'neutral', deltas: sentences.length ? undefined : deltas, kind });
  }
  sentences.forEach((l, i) => {
    pushFeed(s, { t: t + 0.001 * (i + 1), text: l.text, tone: l.tone ?? 'neutral', deltas: i === sentences.length - 1 ? deltas : undefined, kind });
  });
  if (!lead && !sentences.length && deltas) pushFeed(s, { t, text: '', tone: 'neutral', deltas, kind });
}

// ───────────────────────── 시기 흐름 ─────────────────────────

/** 이번 시기 시작: 계획 적용 + 작은 순간 + 사건 예약 */
export function beginPeriod(prev: GameState): GameState {
  const s = clone(prev);
  if (s.phase !== 'plan') return s;
  const rng = new Rng(s.rng);
  const step = stepSize(age(s));
  s.periodEnd = Math.round((s.time + step) * 1000) / 1000;
  s.lastResults = [];
  const picks: ActionPick[] = resolvePlan(s, rng);
  s.lastActions = picks;
  const c = new Ctx(s, rng);
  let energyUsed = 0;
  const cineBefore = s.cine.length;
  picks.forEach((pick, i) => {
    const def = actionById(pick.id);
    if (!def || !def.when(c) || def.locked?.(c)) return;
    const before = c.lines.length;
    const sayBefore = s.lastResults.length;
    s.lastScene = def.scene;
    def.run(c, pick.param);
    energyUsed += def.energy;
    const lines = [...c.lines.slice(before), ...s.lastResults.splice(sayBefore)];
    s.lastResults.push(...lines);
    linesToFeed(s, lines, s.time + step * (0.08 + i * 0.3 + rng.next() * 0.1), narrate(def.id, rng));
  });
  for (const cn of s.cine.slice(cineBefore)) cn.at = s.time + step * 0.4;
  s.player.stats.energy = clamp(s.player.stats.energy - energyUsed);
  if (s.player.stats.energy <= 5 && energyUsed > 0) {
    s.player.stats.stress = clamp(s.player.stats.stress + 8);
    s.player.stats.health = clamp(s.player.stats.health - 0.8);
    pushFeed(s, { t: s.time + step * 0.7, text: '무리했다. 몸이 먼저 신호를 보냈다.', tone: 'bad', deltas: '스트레스 +8 · 건강 -1', kind: 'life' });
  }
  for (const line of flavorLines(s, rng)) pushFeed(s, { t: s.time + step * rng.range(0.05, 0.95), text: line, tone: 'flavor', kind: 'flavor' });
  s.feed.sort((a, b) => a.t - b.t);
  scheduleEvents(s, rng);
  s.rng = rng.state;
  s.phase = 'running';
  return s;
}

/** 큐의 다음 사건을 연다. 없으면 그대로 'running' */
export function openEvent(prev: GameState, at: number): GameState {
  const s = clone(prev);
  if (s.phase !== 'running') return s;
  const rng = new Rng(s.rng);
  while (s.queue.length) {
    const pe = s.queue.shift()!;
    const ev = materialize(s, rng, pe.id, pe.bind, at, pe.vars);
    if (ev) {
      s.active = ev;
      s.fired[pe.id] = s.turn;
      s.phase = 'event';
      s.lastScene = ev.scene;
      break;
    }
  }
  s.rng = rng.state;
  return s;
}

export const hasQueuedEvent = (s: GameState) => s.queue.length > 0;

export function choose(prev: GameState, idx: number): GameState {
  const s = clone(prev);
  const ev = s.active;
  if (!ev || ev.result || ev.pending) return s;
  const def = eventById(ev.id);
  if (!def) return s;
  const ch = def.choices[idx];
  const rng = new Rng(s.rng);
  const c = new Ctx(s, rng, ev.bind, ev.vars ?? {});
  if (!ch || (ch.if && !ch.if(c))) return s;
  // 판정이 있는 선택지는 먼저 주사위만 굴린다 (결과 적용은 resolveRoll)
  if (ch.odds) {
    const o = ch.odds(c);
    s.active = { ...ev, pending: rollD20(rng, o, idx, false) };
    s.rng = rng.state;
    return s;
  }
  return applyChoice(s, idx);
}

function rollD20(rng: Rng, o: Odds, idx: number, rerolled: boolean): PendingRoll {
  const nat = rng.int(1, 20);
  const nat2 = o.adv ? rng.int(1, 20) : undefined;
  const best = nat2 !== undefined ? Math.max(nat, nat2) : nat;
  const ok = best === 20 || (best !== 1 && best + o.mod >= o.dc);
  return { idx, odds: o, nat, nat2, ok, crit: best === 20 ? 'success' : best === 1 ? 'fail' : undefined, rerolled };
}

/** 영감을 써서 실패한 판정을 다시 굴린다 */
export function reroll(prev: GameState): GameState {
  const s = clone(prev);
  const pd = s.active?.pending;
  if (!pd || pd.ok || pd.rerolled || s.player.inspiration <= 0) return s;
  const rng = new Rng(s.rng);
  s.player.inspiration--;
  s.active!.pending = rollD20(rng, pd.odds, pd.idx, true);
  s.rng = rng.state;
  return s;
}

/** 굴린 결과를 확정하고 선택지를 적용한다 */
export function resolveRoll(prev: GameState): GameState {
  const pd = prev.active?.pending;
  if (!pd) return prev;
  return applyChoice(clone(prev), pd.idx, pd);
}

function applyChoice(s: GameState, idx: number, pd?: PendingRoll): GameState {
  const ev = s.active!;
  const def = eventById(ev.id)!;
  const rng = new Rng(s.rng);
  const c = new Ctx(s, rng, ev.bind, ev.vars ?? {});
  const ch = def.choices[idx];
  const cineBefore = s.cine.length;
  c.choicesOdds = pd?.odds ?? ch.odds?.(c);
  c.preset = pd ?? null;
  const sayBefore = s.lastResults.length;
  const text = ch.run(c) || '';
  c.lines.push(...s.lastResults.splice(sayBefore));
  for (const cn of s.cine.slice(cineBefore)) cn.at = ev.at;
  for (const r of c.rolls) c.lines.push({ text: `🎲 ${r.label} d20(${r.nat2 !== undefined ? `${r.nat}·${r.nat2}` : r.nat})${r.mod >= 0 ? '+' : ''}${r.mod} vs 난이도 ${r.dc} → ${r.crit === 'success' ? '대성공' : r.crit === 'fail' ? '대실패' : r.ok ? '성공' : '실패'}`, tone: r.ok ? 'good' : 'bad', delta: true });
  s.active = { ...ev, pending: undefined, bind: c.bind, result: { text, lines: c.lines, rolls: c.rolls } };
  const label = typeof ch.label === 'function' ? ch.label(c) : ch.label;
  pushFeed(s, { t: ev.at, text: `${ev.title} — ${label}`, tone: ev.big ? 'big' : 'neutral', kind: 'event' });
  linesToFeed(s, c.lines, ev.at + 0.002, text || undefined, 'event');
  s.feed.sort((a, b) => a.t - b.t);
  s.rng = rng.state;
  return s;
}

/** 자동 결정: 고를 수 있는 선택지 중 무작위 (결정적) */
export function autoChoose(prev: GameState): GameState {
  const ev = prev.active;
  if (!ev || ev.result) return prev;
  const rng = new Rng(prev.rng ^ 0x5bd1e995);
  const ok = ev.choices.map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0);
  const s = choose(prev, rng.pick(ok));
  return s.active?.pending ? resolveRoll(s) : s;
}

export function proceed(prev: GameState): GameState {
  const s = clone(prev);
  if (s.phase === 'ending') return s;
  s.active = null;
  if (!s.player.alive) return finish(s);
  s.phase = 'running';
  return s;
}

export function popCine(prev: GameState): GameState {
  const s = clone(prev);
  s.cine.shift();
  return s;
}

export function setPlan(prev: GameState, plan: ActionPick[], auto: boolean): GameState {
  const s = clone(prev);
  s.plan = plan;
  s.autoPlan = auto;
  return s;
}

export function setAutoDecide(prev: GameState, v: boolean): GameState {
  const s = clone(prev);
  s.autoDecide = v;
  return s;
}

function finish(s: GameState): GameState {
  s.phase = 'ending';
  s.active = null;
  s.queue = [];
  s.ending = computeEnding(s);
  return s;
}

/** 시기 마감: 돈·건강·나이 듦·NPC 인생·사망 판정 후 시간을 넘긴다 */
export function endPeriod(prev: GameState): GameState {
  const s = clone(prev);
  if (s.phase !== 'running') return s;
  const rng = new Rng(s.rng);
  const p = s.player;
  const a0 = age(s);
  const step = stepSize(a0);
  const y0 = Math.floor(s.time);
  s.time = Math.round((s.time + step) * 10) / 10;
  s.turn++;
  const a = age(s);
  const yearsPassed = Math.floor(s.time) - y0;
  const t = s.time;
  const news: ResultLine[] = [];

  const halfYears = step * 2;
  if (a >= 20) {
    const cost = livingCost(s, priceIndex(s.time)) * halfYears;
    p.money -= cost;
    news.push({ text: `생활비 -${won(cost)}`, tone: 'neutral', delta: true });
  }
  if (p.job === 'office' || p.job === 'teacher' || p.job === 'producer') {
    const base = { office: 16_000_000, teacher: 15_000_000, producer: 20_000_000 }[p.job] * priceIndex(s.time) * halfYears;
    p.money += Math.round(base);
    book(s, Math.round(base), '월급');
    p.stats.stress = clamp(p.stats.stress + (p.job === 'office' ? 6 : 3));
    news.push({ text: `월급 +${won(base)}`, tone: 'good', delta: true });
  }
  if (p.military === 'serving' && s.time >= p.militaryUntil) {
    p.military = 'done';
    s.queue.push({ id: 'discharge', bind: {} });
  }

  p.stats.energy = clamp(p.stats.energy + 45 + p.habits.exercise * 4 - (p.job === 'office' ? 18 : 0) - (a > 60 ? 10 : 0));
  if (p.stats.stress >= 80) s.stressTurns++;
  else s.stressTurns = Math.max(0, s.stressTurns - 1);
  if (p.stats.stress >= 75) p.stats.health = clamp(p.stats.health - 0.8 * halfYears);
  if (p.stats.stress <= 30) p.stats.happiness = clamp(p.stats.happiness + 1);
  p.stats.happiness = clamp(p.stats.happiness + (55 - p.stats.happiness) * 0.06);
  p.stats.stress = clamp(p.stats.stress + (25 - p.stats.stress) * 0.12);

  if (p.fans > 0) p.fans = Math.round(p.fans * (1 - 0.035 * halfYears));
  s.peakFans = Math.max(s.peakFans, p.fans);

  for (let i = 0; i < yearsPassed; i++) {
    const ya = a - (yearsPassed - 1 - i);
    if (p.habits.smoking) p.habits.smokeYears++;
    const decline = ya > 70 ? 2.2 : ya > 55 ? 1.4 : ya > 40 ? 0.8 : ya > 30 ? 0.3 : 0;
    p.stats.health = clamp(p.stats.health - decline - (p.habits.smoking ? 1 : 0) - p.habits.drinking * 0.4 + p.habits.exercise * 0.5);
    p.habits.exercise = Math.max(0, p.habits.exercise - 0.25);
    p.rep = clamp(p.rep * 0.97);
    p.habits.drinking = Math.max(0, p.habits.drinking - 0.1);
    if (ya > 50) for (const k of ['guitar', 'bass', 'drums', 'keys', 'vocal'] as const) p.skills[k] = clamp(p.skills[k] - 0.4);
    for (const n of ageNpcs(s, rng).slice(0, 2)) pushFeed(s, { t, text: n, tone: 'neutral', kind: 'news' });
    const before = s.lastResults.length;
    const m0 = p.money;
    yearlyStreams(s, rng);
    if (p.money > m0) book(s, p.money - m0, '음원 정산');
    news.push(...s.lastResults.splice(before));
    closeLedger(s, Math.floor(s.time) - (yearsPassed - 1 - i) - 1, Math.floor(ya) - 1, t);
    if (ya >= 20 && (ya >= 40 || p.stats.health < 25)) {
      const q = annualDeathProb(ya, p.stats.health, p.habits.smokeYears);
      if (rng.chance(q) || ya >= 104) {
        p.alive = false;
        p.deathAge = Math.floor(ya);
        break;
      }
    }
  }
  if (p.money < -priceIndex(s.time) * 30_000_000 && !s.flags.bankrupt) s.queue.push({ id: 'debt_crisis', bind: {} });
  s.news = news;
  const money = news.filter((n) => n.delta).map((n) => n.text);
  if (money.length) pushFeed(s, { t, text: '', tone: 'neutral', deltas: money.join(' · '), kind: 'news' });
  for (const n of news.filter((x) => !x.delta)) pushFeed(s, { t, text: n.text, tone: n.tone ?? 'neutral', kind: 'news' });

  s.history.push({ age: Math.floor(a), fans: p.fans, happiness: Math.round(p.stats.happiness), money: p.money });
  if (s.history.length > 200) s.history.shift();
  s.rng = rng.state;

  if (!p.alive) {
    chron(s, '마지막 숨. 어딘가에서 내 노래가 흐르고 있었다.', 'big');
    s.cine.push({ kind: 'death', scene: 'stage_old', kicker: `${p.birthYear + (p.deathAge ?? 0)} · ${p.deathAge}세`, title: '마지막 무대', sub: `${p.name}, ${p.birthYear}–${p.birthYear + (p.deathAge ?? 0)}`, at: s.time });
    return finish(s);
  }
  s.phase = 'plan';
  return s;
}

export function canRetire(s: GameState) {
  return age(s) >= 55 && !s.player.retired;
}

export function retire(prev: GameState): GameState {
  const s = clone(prev);
  s.player.retired = true;
  chron(s, '은퇴를 선언했다. 이제 남은 시간은 나를 위해', 'big');
  pushFeed(s, { t: s.time, text: '은퇴를 선언했다.', tone: 'big', kind: 'life' });
  return s;
}

/** 한 시기를 통째로 진행 (테스트·자동 진행용). 사건은 자동 결정. */
export function runPeriodAuto(prev: GameState, pickChoice?: (s: GameState) => number): GameState {
  let s = prev;
  if (s.phase === 'plan') s = beginPeriod(s);
  let guard = 0;
  while (s.phase !== 'ending' && guard++ < 20) {
    if (s.phase === 'running') {
      if (hasQueuedEvent(s)) {
        s = openEvent(s, s.time + 0.25);
        if (s.phase === 'running') continue;
      } else {
        s = { ...s, cine: [] };
        s = endPeriod(s);
        return s;
      }
    }
    if (s.phase === 'event') {
      s = pickChoice ? choose(s, pickChoice(s)) : autoChoose(s);
      if (s.active?.pending) s = resolveRoll(s);
      s = proceed(s);
    }
  }
  return s;
}

/** 은퇴 후: 남은 인생을 빠르게 */
export function fastForward(prev: GameState): GameState {
  let s = setPlan(prev, [{ id: 'rest' }], false);
  let guard = 0;
  while (s.phase !== 'ending' && guard++ < 200) s = runPeriodAuto(s);
  return s;
}

export const describeTime = (s: GameState) => `${Math.floor(s.time)}년 · ${Math.max(0, ageInt(s))}세`;

export { ACTIONS, actionSlots };

/** 한 해 장부 마감: 현실 통계와 나란히 기록에 남기고, 처음으로 음악만으로 먹고살게 된 해를 기념한다 */
function closeLedger(s: GameState, yr: number, ag: number, t: number) {
  const L = s.ledger ?? { music: 0, cost: 0, other: 0 };
  s.ledgers = s.ledgers ?? [];
  if (ag >= 17 && (L.music || L.cost || L.other)) {
    s.ledgers.push({ year: yr, age: ag, ...L });
    if (s.ledgers.length > 120) s.ledgers.shift();
    const net = L.music - L.cost;
    const avg = ARTIST_SURVEY.avgArtIncomeMusic;
    const tone: FeedEntry['tone'] = net >= avg ? 'good' : 'neutral';
    pushFeed(s, {
      t,
      text: `${yr}년 결산 — 음악으로 ${won(L.music)} 벌고 ${won(L.cost)} 썼다.${L.other ? ` 다른 일로 ${won(L.other)}.` : ''}`,
      tone,
      deltas: `음악인 평균 예술활동 수입 ${won(avg)} · 2024 예술인 실태조사`,
      kind: 'news',
    });
    // ‘먹고산다’의 기준: 최저임금으로 1년 일한 만큼(주 40시간, 209시간×12개월)의 80% [가정]
    const livingBar = minWage(yr) * 209 * 12 * 0.8;
    if (!s.flags.livingByMusic && ag >= 19 && net >= livingBar) {
      s.flags.livingByMusic = yr;
      chron(s, '처음으로 음악으로 번 돈만으로 한 해를 살았다', 'big');
      s.cine.push({ kind: 'gig', scene: 'rooftop', kicker: `${yr} · ${ag}세`, title: '음악으로 월세를 냈다', sub: `올해 음악으로 번 돈 ${won(net)}.
예술인 절반 가까이(47.5%)가 다른 일을 겸하는 나라에서, 처음으로 알바 없이 한 해를 버텼다.`, at: t });
    }
  }
  s.ledger = { music: 0, cost: 0, other: 0 };
}
