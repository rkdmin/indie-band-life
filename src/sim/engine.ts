// 게임 엔진. UI 는 이 파일의 함수만 부른다. 모든 함수는 상태를 복제해 새 상태를 돌려준다.
//   newGame → (submitActions → [ackResults] → choose* → next*) 반복 → ending

import type { ActionPick, ActiveEvent, GameState, Gender, Genre, Income, ParentTaste, Region } from './types';
import { GENRES } from './types';
import { Rng, clamp, hashStr } from './rng';
import { Ctx, type EventDef } from './ctx';
import { ACTIONS, actionById } from './actions';
import { EVENTS, eventById } from './events';
import { actionSlots, age, ageInt, chron, livingCost, stepSize, year } from './state';
import { REGIONS, annualDeathProb, priceIndex } from './data/world';
import { ageNpcs, createNpc } from './npc';
import { yearlyStreams } from './songs';
import { computeEnding } from './endings';
import { won } from './korean';

export const SAVE_VERSION = 3;

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
    lastScene: 'nursery',
    stressTurns: 0,
    history: [],
    phase: 'actions',
    ending: null,
    peakFans: 0,
  };
  // 부모님
  const mom = createNpc(s, rng, { gender: 'f', birthYear: o.birthYear - rng.int(27, 35), metAt: '가족', role: 'parent', affinity: 80, skill: 10 });
  const dad = createNpc(s, rng, { gender: 'm', birthYear: o.birthYear - rng.int(28, 37), metAt: '가족', role: 'parent', affinity: 70, skill: 10 });
  // 아버지의 성을 따른다
  dad.name = o.name[0] + dad.name.slice(1);
  s.flags.mom = mom.id;
  s.flags.dad = dad.id;
  s.rng = rng.state;
  // 태교 단계는 행동이 없으므로 바로 이벤트로
  return startTurn(s);
}

// ───────────────────────── 이벤트 선택 ─────────────────────────

function evTitle(def: EventDef, c: Ctx) {
  return typeof def.title === 'function' ? def.title(c) : def.title;
}

function materialize(s: GameState, rng: Rng, id: string, bind: Record<string, string>, vars?: Record<string, string | number>): ActiveEvent | null {
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
      return { label: typeof ch.label === 'function' ? ch.label(c) : ch.label, hint: ch.hint?.(c), disabled: !ok };
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

/** 이번 턴에 보여 줄 사건들을 큐에 쌓는다 */
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
  const shuffled = rng.shuffle(random);
  const maxRandom = picked.length >= 2 ? 0 : picked.length === 1 ? (rng.chance(0.35) ? 1 : 0) : rng.chance(0.4) ? 2 : 1;
  for (const def of shuffled) {
    if (picked.length >= 3 || picked.filter((d) => (d.priority ?? 0) < 100).length >= maxRandom) break;
    picked.push(def);
  }
  for (const def of picked) s.queue.push({ id: def.id, bind: {} });
}

function nextEvent(s: GameState, rng: Rng): boolean {
  while (s.queue.length) {
    const pe = s.queue.shift()!;
    const ev = materialize(s, rng, pe.id, pe.bind, pe.vars);
    if (ev) {
      s.active = ev;
      s.fired[pe.id] = s.turn;
      s.phase = 'event';
      return true;
    }
  }
  s.active = null;
  return false;
}

// ───────────────────────── 턴 흐름 ─────────────────────────

function startTurn(s: GameState): GameState {
  s.lastResults = [];
  if (actionSlots(s) === 0) {
    // 행동이 없는 시기(태교~6세): 사건만 보고 지나간다
    const rng = new Rng(s.rng);
    scheduleEvents(s, rng);
    const has = nextEvent(s, rng);
    s.rng = rng.state;
    if (!has) return endTurn(s);
    return s;
  }
  s.phase = 'actions';
  return s;
}

export function submitActions(prev: GameState, picks: ActionPick[]): GameState {
  const s = clone(prev);
  if (s.phase !== 'actions') return s;
  const rng = new Rng(s.rng);
  s.lastResults = [];
  s.lastActions = picks;
  const c = new Ctx(s, rng);
  let energyUsed = 0;
  for (const pick of picks.slice(0, actionSlots(s))) {
    const def = actionById(pick.id);
    if (!def || !def.when(c) || def.locked?.(c)) continue;
    const before = c.lines.length;
    s.lastScene = def.scene;
    def.run(c, pick.param);
    energyUsed += def.energy;
    const head = `${def.emoji} ${def.label}`;
    s.lastResults.push({ text: head, tone: 'neutral' });
    s.lastResults.push(...c.lines.slice(before));
  }
  s.player.stats.energy = clamp(s.player.stats.energy - energyUsed);
  if (s.player.stats.energy <= 5 && energyUsed > 0) {
    s.player.stats.stress = clamp(s.player.stats.stress + 8);
    s.player.stats.health = clamp(s.player.stats.health - 0.8);
    s.lastResults.push({ text: '무리했다. 몸이 비명을 지른다 (스트레스↑ 건강↓)', tone: 'bad' });
  }
  scheduleEvents(s, rng);
  s.rng = rng.state;
  s.phase = 'results';
  return s;
}

/** 행동 결과 화면을 닫고 사건으로 */
export function ackResults(prev: GameState): GameState {
  const s = clone(prev);
  const rng = new Rng(s.rng);
  const has = nextEvent(s, rng);
  s.rng = rng.state;
  return has ? s : endTurn(s);
}

export function choose(prev: GameState, idx: number): GameState {
  const s = clone(prev);
  const ev = s.active;
  if (!ev || ev.result) return s;
  const def = eventById(ev.id);
  if (!def) return s;
  const rng = new Rng(s.rng);
  const c = new Ctx(s, rng, ev.bind, ev.vars ?? {});
  const ch = def.choices[idx];
  if (!ch || (ch.if && !ch.if(c))) return s;
  const text = ch.run(c) || '';
  s.active = { ...ev, bind: c.bind, result: { text, lines: c.lines } };
  s.rng = rng.state;
  return s;
}

/** 사건 결과를 닫고 다음 사건 또는 다음 시기로 */
export function proceed(prev: GameState): GameState {
  const s = clone(prev);
  if (s.phase === 'ending') return s;
  if (!s.player.alive) return finish(s);
  const rng = new Rng(s.rng);
  const has = nextEvent(s, rng);
  s.rng = rng.state;
  if (has) return s;
  return endTurn(s);
}

function finish(s: GameState): GameState {
  s.phase = 'ending';
  s.active = null;
  s.ending = computeEnding(s);
  return s;
}

/** 시기 마감: 돈·건강·나이 듦·NPC 인생·사망 판정 후 시간을 넘긴다 */
function endTurn(s: GameState): GameState {
  const rng = new Rng(s.rng);
  const p = s.player;
  s.news = [];
  const a0 = age(s);
  const step = stepSize(a0);
  const y0 = Math.floor(s.time);
  s.time = Math.round((s.time + step) * 10) / 10;
  s.turn++;
  const a = age(s);
  const yearsPassed = Math.floor(s.time) - y0;

  // 생활비 (반기 단위로 환산)
  const halfYears = step * 2;
  if (a >= 20) {
    const cost = livingCost(s, priceIndex(s.time)) * halfYears;
    p.money -= cost;
    s.news.push({ text: `생활비 -${won(cost)}`, tone: 'neutral' });
  }
  // 직장 월급
  if (p.job === 'office' || p.job === 'teacher' || p.job === 'producer') {
    const base = { office: 16_000_000, teacher: 15_000_000, producer: 20_000_000 }[p.job] * priceIndex(s.time) * halfYears;
    p.money += Math.round(base);
    p.stats.stress = clamp(p.stats.stress + (p.job === 'office' ? 6 : 3));
    s.news.push({ text: `월급 +${won(base)}`, tone: 'good' });
  }
  // 군 복무
  if (p.military === 'serving' && s.time >= p.militaryUntil) {
    p.military = 'done';
    s.queue.push({ id: 'discharge', bind: {} });
  }

  // 컨디션 회복 & 스트레스 → 건강
  p.stats.energy = clamp(p.stats.energy + 45 + p.habits.exercise * 4 - (p.job === 'office' ? 18 : 0) - (a > 60 ? 10 : 0));
  if (p.stats.stress >= 80) s.stressTurns++;
  else s.stressTurns = Math.max(0, s.stressTurns - 1);
  if (p.stats.stress >= 75) p.stats.health = clamp(p.stats.health - 0.8 * halfYears);
  if (p.stats.stress <= 30) p.stats.happiness = clamp(p.stats.happiness + 1);
  // 행복은 아주 천천히 기준점(55)으로
  p.stats.happiness = clamp(p.stats.happiness + (55 - p.stats.happiness) * 0.06);
  p.stats.stress = clamp(p.stats.stress + (25 - p.stats.stress) * 0.12);

  // 팬은 활동이 없으면 서서히 줄어든다
  if (p.fans > 0) p.fans = Math.round(p.fans * (1 - 0.035 * halfYears));
  s.peakFans = Math.max(s.peakFans, p.fans);

  // 해가 바뀌면: 나이 듦·습관·NPC·음원 정산·사망 판정
  for (let i = 0; i < yearsPassed; i++) {
    const ya = a - (yearsPassed - 1 - i);
    if (p.habits.smoking) p.habits.smokeYears++;
    const decline = ya > 70 ? 2.2 : ya > 55 ? 1.4 : ya > 40 ? 0.8 : ya > 30 ? 0.3 : 0;
    p.stats.health = clamp(p.stats.health - decline - (p.habits.smoking ? 1 : 0) - p.habits.drinking * 0.4 + p.habits.exercise * 0.5);
    p.habits.exercise = Math.max(0, p.habits.exercise - 0.25);
    p.rep = clamp(p.rep * 0.97);
    p.habits.drinking = Math.max(0, p.habits.drinking - 0.1);
    if (ya > 50) for (const k of ['guitar', 'bass', 'drums', 'keys', 'vocal'] as const) p.skills[k] = clamp(p.skills[k] - 0.4);
    const news = ageNpcs(s, rng);
    for (const n of news.slice(0, 2)) s.news.push({ text: n, tone: 'neutral' });
    const before = s.lastResults.length;
    yearlyStreams(s, rng);
    s.news.push(...s.lastResults.splice(before));
    // 사망 판정 — 20세 이전과 건강이 괜찮은 40세 이전에는 판정하지 않는다 (요절은 드물게)
    if (ya >= 20 && (ya >= 40 || p.stats.health < 25)) {
      const q = annualDeathProb(ya, p.stats.health, p.habits.smokeYears);
      if (rng.chance(q) || ya >= 104) {
        p.alive = false;
        p.deathAge = Math.floor(ya);
        break;
      }
    }
  }
  // 빚
  if (p.money < -priceIndex(s.time) * 30_000_000 && !s.flags.bankrupt) s.queue.push({ id: 'debt_crisis', bind: {} });

  s.history.push({ age: Math.floor(a), fans: p.fans, happiness: Math.round(p.stats.happiness), money: p.money });
  if (s.history.length > 200) s.history.shift();
  s.rng = rng.state;

  if (!p.alive) {
    chron(s, '마지막 숨. 어딘가에서 내 노래가 흐르고 있었다.', 'big');
    s.queue = [];
    return finish(s);
  }
  return startTurn(s);
}

/** 은퇴 후: 남은 인생을 빠르게 흘려보낸다 */
export function fastForward(prev: GameState): GameState {
  let s = clone(prev);
  let guard = 0;
  while (s.phase !== 'ending' && guard++ < 200) {
    if (s.phase === 'actions') s = submitActions(s, [{ id: 'rest' }]);
    else if (s.phase === 'results') s = ackResults(s);
    else if (s.phase === 'event' && s.active) {
      if (!s.active.result) {
        const i = s.active.choices.findIndex((c) => !c.disabled);
        s = choose(s, Math.max(0, i));
      } else s = proceed(s);
    } else break;
  }
  return s;
}

export function canRetire(s: GameState) {
  return age(s) >= 55 && !s.player.retired;
}

export function retire(prev: GameState): GameState {
  const s = clone(prev);
  s.player.retired = true;
  chron(s, '은퇴를 선언했다. 이제 남은 시간은 나를 위해', 'big');
  return s;
}

export const describeTime = (s: GameState) => `${year(s)}년 · ${Math.max(0, ageInt(s))}세`;

export { ACTIONS };
