// 게임 엔진. UI 는 이 파일의 함수만 부른다. 모든 함수는 상태를 복제해 새 상태를 돌려준다.
//
// 시간은 ‘시기(period)’ 단위로 계산하고, 화면은 그 사이를 실시간으로 흘려보낸다.
//   phase 'plan'    → beginPeriod(): 생활 계획을 적용하고 기록·사건을 이번 시기에 흩뿌린다
//   phase 'running' → 시계가 사건 시점에 닿으면 openEvent() → phase 'event'
//   phase 'event'   → choose() → proceed() → 다시 'running'
//   시계가 시기 끝에 닿으면 endPeriod() → 다음 시기 'plan' (또는 'ending')

import type { ActionPick, ActiveEvent, FeedEntry, Jackpot, Odds, PendingRoll, GameState, Gender, Genre, Income, ParentTaste, Region, ResultLine } from './types';
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
import { COUNTRIES, countryBirthShare, countryOf, type CountryId } from './data/countries';
import { withFamilyName } from './korean';
import { rollFate, rollTalents } from './data/fate';
import type { Trait } from './types';
import { narrate, resolvePlan } from './plan';
import { bandUpkeep } from './bandlife';
import { ageScene, eventMinAge, eventMinYear, periodText, textMinAge, textMinYear } from './data/anachronism';
import { historyBetween } from './data/history';
import { inheritAppearance, npcAppearance } from './appearance';
import { parentJobsFor } from './data/fate';
import type { NpcCareer } from './types';
import { effectsOf, rollBirth } from './birth';

export const SAVE_VERSION = 5;

/** 전체 화면 연출로 보여 줄 큰 사건 */
export const CINEMATIC = new Set([
  'birth', 'first_inst', 'first_live', 'club_audition', 'school_festival', 'suneung', 'teen_band_end',
  'draft', 'discharge', 'old_friend_call', 'crossroads30', 'label_indie', 'label_major', 'fest_local', 'fest_big',
  'pandemic', 'band_boom', 'debt_crisis', 'reunion', 'producer_friend', 'parent_farewell', 'retire_ask', 'revival',
  'move_out', 'life_proposal', 'life_baby', 'life_friend_funeral', 'life_last_call', 'life_grandchild',
  'member_leave', 'career_end', 'h_wave', 'h_kr_1995', 'h_first_fest', 'h_kr_1975',
  'fate_divorce', 'fate_cancer', 'fate_origin_visit', 'fate_perfect_pitch', 'fate_twin_duo', 'era_2002',
  'g_invite', 'g_stage', 'g_asia_tour', 'g_world_tour', 'release_ready',
  'car_overseas_fest', 'car_tv_live', 'car_survival_show', 'car_drama_ost', 'car_club_closing', 'car_tribute_cover',
]);

export interface NewGameOptions {
  name: string;
  gender: Gender;
  birthYear: number;
  region?: Region;
  seed?: number;
  country?: CountryId;
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
      // 1990년 이전 출생은 그 시절 물가로 줄인다
      money: Math.round((income === 'high' ? 3_000_000 : income === 'mid' ? 1_000_000 : 300_000) * Math.min(1, priceIndex(o.birthYear) / priceIndex(1990))),
      fans: 0,
      globalFans: 0,
      inspiration: 1,
      debt: 0,
      debtRate: 0,
      credit: 70,
      country: o.country ?? 'KR',
      talents: { pitch: 50, rhythm: 50, lyric: 50, presence: 50, stamina: 50 },
      traits: [],
      fate: null as never,
      rarityLog: 0,
      rep: 0,
      habits: { smoking: false, smokeYears: 0, drinking: 0, exercise: 1 },
      edu: 'none',
      study: 40,
      job: 'none',
      military: o.gender === 'm' && (o.country ?? 'KR') === 'KR' ? 'pending' : 'none',
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
    deckOut: [],
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
  dad.name = withFamilyName(o.name, dad.name); // 아버지의 성을 따른다
  s.flags.mom = mom.id;
  s.flags.dad = dad.id;
  // 외모는 부모님에게서 물려받는다 (키는 부모 평균으로 회귀)
  s.player.app = inheritAppearance(s.player.look, o.gender, o.birthYear, o.country, npcAppearance(mom, o.country), npcAppearance(dad, o.country));

  // ── 사건 덱: 일반 사건의 약 45%를 이번 인생에서 뺀다 → 인생마다 겪는 일이 달라진다 ──
  s.deckOut = EVENTS.filter((e) => !e.queued && (e.priority ?? 0) < 100 && /^(life_|car_)/.test(e.id) && rng.chance(0.45)).map((e) => e.id);

  // ── 인생 변수 · 재능 · 성격 ──
  const fate = rollFate(rng, o.birthYear, o.gender, countryOf(o.country));
  s.player.fate = fate;
  s.player.talents = rollTalents(rng, fate.perfectPitch);
  const TR: Trait[] = ['diligent', 'free', 'sensitive', 'warm', 'ambitious', 'funny', 'stubborn', 'shy'];
  const t1 = rng.pick(TR);
  const rest = TR.filter((t) => t !== t1);
  s.player.traits = [t1, rng.pick(rest)];
  // 희귀도: 인생 변수 + 지역·형편·부모 취향·성별
  const regionW = REGIONS.find((r) => r.id === region)!.weight;
  const incomeW = { low: 0.3, mid: 0.5, high: 0.2 }[income];
  s.player.rarityLog = fate.rarityLog - Math.log10(regionW) - Math.log10(incomeW) + Math.log10(2) + Math.log10(8) - Math.log10(countryBirthShare((o.country ?? 'KR') as CountryId));
  if (fate.origin) {
    const foreign = fate.origin.parent === 'mom' ? mom : dad;
    const NAMES: Record<string, [string, string]> = {
      베트남: ['응우옌 티 란', '쩐 반 훙'], 중국: ['왕리', '리웨이'], 태국: ['쑤다', '쏨차이'], 필리핀: ['마리아', '호세'],
      일본: ['사토 유키', '다나카 켄'], 미국: ['에밀리', '제임스'], 캄보디아: ['소피아', '다라'], 몽골: ['사롤', '바트'], 우즈베키스탄: ['딜노자', '루스탐'],
    };
    const nm = NAMES[fate.origin.country];
    if (nm && (o.country ?? 'KR') === 'KR') foreign.name = foreign.gender === 'f' ? nm[0] : nm[1];
    s.flags.origin = fate.origin.country;
    s.flags.originMusic = fate.origin.music;
  }
  for (let i = 0; i < fate.older; i++) {
    const sib = createNpc(s, rng, { birthYear: o.birthYear - rng.int(1, 3) - i * 2, metAt: '가족', role: 'sibling', affinity: 45, skill: rng.int(5, 40) });
    sib.name = withFamilyName(o.name, sib.name);
    s.flags.olderSib = sib.id;
  }
  if (fate.twin) {
    const tw = createNpc(s, rng, { birthYear: o.birthYear, metAt: '같은 날 태어난 쌍둥이', role: 'sibling', affinity: 60, skill: rng.int(5, 25) });
    tw.name = withFamilyName(o.name, tw.name);
    s.flags.twin = tw.id;
  }
  if (fate.younger) s.flags.youngerLeft = fate.younger;
  if (fate.grandparents) s.flags.grandparents = true;
  s.flags.parentJob = fate.parentJob;
  // 부모님 직업 — 주 수입원은 운명 카드의 직업, 다른 한 분은 그 시대 분포에서
  {
    const map: Record<string, NpcCareer> = { office: 'office', pro: 'pro', shop: 'shop', factory: 'factory', farm: 'farm', driver: 'driver' };
    dad.career = map[fate.parentJob] ?? 'office';
    const other = rng.weighted(parentJobsFor(o.birthYear), (x) => x[1])!;
    mom.career = rng.chance(o.birthYear < 1990 ? 0.45 : 0.25) ? 'shop' : map[other[0]] ?? 'office';
    if (rng.chance(0.5)) [dad.career, mom.career] = [mom.career, dad.career];
  }
  if (fate.pet) s.flags.pet = 1;
  if (fate.perfectPitch) s.flags.perfectPitch = true;
  // 태어나는 순간: 혈액형·출생 장소·조산·태몽·타고난 특징 (별도 시드라 다른 운명과 섞이지 않는다)
  {
    const b = rollBirth(seed, s);
    s.player.birth = b.info;
    fate.draws.push(...b.draws);
    s.player.rarityLog += b.draws.reduce((a, d) => a - Math.log10(Math.max(1e-9, d.p)), 0);
    // 재능은 태어날 때 바로 반영한다 (기술·상태는 첫 사건에서 기록과 함께)
    const tal = s.player.talents as Record<string, number>;
    for (const e of effectsOf(b.info)) for (const [k, v] of Object.entries(e)) if (k in tal) tal[k] = clamp(tal[k] + (v ?? 0), 5, 98);
  }
  if (fate.lefty) s.flags.lefty = true;
  if (fate.divorceAge !== null) s.flags.divorceAge = fate.divorceAge;
  if (fate.jobLossAge !== null) s.flags.jobLossAge = fate.jobLossAge;
  if (fate.cancerAge !== null) s.flags.cancerAge = fate.cancerAge;
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
      const hint = ch.hint?.(c);
      const raw = typeof ch.label === 'function' ? ch.label(c) : ch.label;
      const label = periodText(raw, at, s.player.country);
      // 선택지 자체가 그 시대에 없던 일이면(예: 1980년의 ‘숏폼에 올린다’) 숨긴다
      const hidden = !!raw && (!label || (textMinYear(raw, s.player.country) > at + 0.5 && !label.trim()) || textMinAge(raw, s.player.country) > age(s));
      const card = ch.card?.(c);
      return {
        label,
        hint: hint ? periodText(hint, at, s.player.country) : hint,
        disabled: !ok || hidden,
        hidden,
        odds: ok && !hidden ? ch.odds?.(c) : undefined,
        risk: ch.risk,
        range: ch.range?.(c),
        card: card && { ...card, title: periodText(card.title, at, s.player.country), sub: card.sub && periodText(card.sub, at, s.player.country) },
      };
    });
    if (!choices.some((x) => !x.disabled)) return null;
    // ── 선택지를 매번 다르게: 순서를 섞고, 많으면 일부만, 가끔 ‘운에 맡긴다’ ──
    const PASS = /않는다|안 한다|그냥|거절|못 간다|아무도|다음에|지켜본다|넘어간다|둔다$|포기한다/;
    const shown = choices.map((x, i) => i).filter((i) => !choices[i].hidden);
    const lastI = shown[shown.length - 1];
    const keepLast = shown.length >= 3 && PASS.test(choices[lastI].label);
    const body = keepLast ? shown.slice(0, -1) : [...shown];
    const custom = id === 'pick_member' || id === 'member_walkin';
    if (!custom) {
      // 다섯 개 이상이면 네 개만 — 열려 있는 선택지 중에서
      const live = body.filter((i) => !choices[i].disabled);
      if (live.length >= 5) {
        const drop = rng.shuffle([...live]).slice(0, live.length - 4);
        for (const i of drop) choices[i].hidden = true;
      }
    }
    const order = custom ? shown : [...rng.shuffle(body.filter((i) => !choices[i].hidden)), ...(keepLast ? [lastI] : [])];
    const wild = !custom && !def.queued && !def.cards && order.filter((i) => !choices[i].disabled).length >= 2 && rng.chance(0.12);
    return {
      id,
      bind: c.bind,
      vars: c.vars,
      title: periodText(evTitle(def, c), at, s.player.country),
      text: periodText(def.text(c), at, s.player.country),
      scene: ageScene(typeof def.scene === 'function' ? def.scene(c) : def.scene, age(s)),
      choices,
      order,
      wild,
      cards: def.cards,
      kicker: def.kicker,
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
  if ((s.player.country ?? 'KR') !== 'KR' && isKoreaOnly(def.id)) return false;
  if ((s.player.country ?? 'KR') === 'KR' && def.id.startsWith('ct_')) return false;
  if (s.deckOut?.includes(def.id)) return false;
  if (age(s) < eventMinAge(def, s.player.country)) return false;
  if (s.time < eventMinYear(def, s.player.country) || (def.maxYear !== undefined && s.time > def.maxYear)) return false;
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
  // 그 시대에 없던 말은 그 시대의 말로 (실제 음악사·세상 소식은 원문 그대로)
  if (e.tone !== 'history' && e.tone !== 'world') {
    const ct = s.player.country ?? 'KR';
    e.text = periodText(e.text, e.t, ct);
    if (e.deltas) e.deltas = periodText(e.deltas, e.t, ct);
    if (!e.text && !e.deltas) return;
  }
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
  // 최근 기록에 나온 문장은 이번에 다시 쓰지 않는다
  const recent = new Set(s.feed.slice(-80).map((e) => e.text));
  picks.forEach((pick, i) => {
    const def = actionById(pick.id);
    if (!def || !def.when(c) || def.locked?.(c)) return;
    const before = c.lines.length;
    const sayBefore = s.lastResults.length;
    s.lastScene = ageScene(def.scene, age(s));
    def.run(c, pick.param);
    energyUsed += def.energy;
    const lines = [...c.lines.slice(before), ...s.lastResults.splice(sayBefore)];
    s.lastResults.push(...lines);
    linesToFeed(s, lines, s.time + step * (0.08 + i * 0.3 + rng.next() * 0.1), narrate(def.id, rng, { age: age(s), year: s.time, band: !!s.band, recent }) || undefined);
  });
  for (const cn of s.cine.slice(cineBefore)) cn.at = s.time + step * 0.4;
  s.player.stats.energy = clamp(s.player.stats.energy - energyUsed);
  if (s.player.stats.energy <= 5 && energyUsed > 0) {
    s.player.stats.stress = clamp(s.player.stats.stress + 8);
    s.player.stats.health = clamp(s.player.stats.health - 0.8);
    pushFeed(s, { t: s.time + step * 0.7, text: '무리했다. 몸이 먼저 신호를 보냈다.', tone: 'bad', deltas: '스트레스 +8 · 건강 -1', kind: 'life' });
  }
  // 그해의 실제 음악 소식 (내 나라 + 세계)
  for (const h of historyBetween(s.time, s.periodEnd, (s.player.country ?? 'KR') as CountryId)) {
    pushFeed(s, { t: h.y + ((h.m ?? 6) - 0.5) / 12, text: h.text, tone: h.kind === 'world' ? 'world' : 'history', deltas: `${h.y}${h.m ? `.${String(h.m).padStart(2, '0')}` : ''} · ${h.c === 'GLOBAL' ? '세계' : COUNTRIES[h.c].flag} · ${h.src}`, kind: 'news' });
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
  const rng = new Rng(s.rng);
  // ‘운에 맡긴다’: 보이는 선택지 중 하나를 무작위로 — 영감 +1
  if (ev.wild && idx === def.choices.length) {
    const live = (ev.order ?? ev.choices.map((_, i) => i)).filter((i) => !ev.choices[i].disabled && !ev.choices[i].hidden);
    if (!live.length) return s;
    idx = rng.pick(live);
    s.flags.wildPick = 1;
  }
  const ch = def.choices[idx];
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
/** 한 번의 선택으로 크게 터졌나 — 팬이 크게 늘거나, 한 달 생활비의 몇 배가 들어오거나 날아갔을 때 */
function jackpotOf(s: GameState, fans0: number, money0: number): Jackpot | undefined {
  const df = s.player.fans - fans0;
  const dm = s.player.money - money0;
  const month = Math.max(300_000 * priceIndex(s.time), livingCost(s, priceIndex(s.time)) / 6);
  if (df >= Math.max(1500, fans0 * 0.6)) return { kind: 'fans', amount: df, label: '팬 폭발' };
  if (dm >= month * 6) return { kind: 'money', amount: dm, label: '대박' };
  if (dm <= -month * 6) return { kind: 'bust', amount: dm, label: '쪽박' };
  return undefined;
}

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
  if (s.flags.wildPick) {
    delete s.flags.wildPick;
    if (s.player.inspiration < 3) s.player.inspiration++;
    c.lines.push({ text: `🎲 운에 맡겼다 — ‘${typeof ch.label === 'function' ? ch.label(c) : ch.label}’`, tone: 'big' });
    c.lines.push({ text: '영감 +1', tone: 'good', delta: true });
  }
  const fans0 = s.player.fans;
  const money0 = s.player.money;
  const text = periodText(ch.run(c) || '', ev.at, s.player.country);
  for (const l of c.lines) l.text = periodText(l.text, ev.at, s.player.country);
  c.lines.push(...s.lastResults.splice(sayBefore));
  for (const cn of s.cine.slice(cineBefore)) cn.at = ev.at;
  for (const r of c.rolls) c.lines.push({ text: `🎲 ${r.label} d20(${r.nat2 !== undefined ? `${r.nat}·${r.nat2}` : r.nat})${r.mod >= 0 ? '+' : ''}${r.mod} vs 난이도 ${r.dc} → ${r.crit === 'success' ? '대성공' : r.crit === 'fail' ? '대실패' : r.ok ? '성공' : '실패'}`, tone: r.ok ? 'good' : 'bad', delta: true });
  s.active = { ...ev, pending: undefined, bind: c.bind, result: { text, lines: c.lines, rolls: c.rolls, jackpot: jackpotOf(s, fans0, money0) } };
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
  // 음악 인생을 마무리하기로 했다면 남은 삶은 조용히 흘려보낸다 (에필로그)
  if (s.flags.careerEndNow) {
    delete s.flags.careerEndNow;
    s.cine = [];
    return fastForward(s);
  }
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
    const cost = livingCost(s, priceIndex(s.time) * countryOf(p.country).costMul) * halfYears;
    p.money -= cost;
    news.push({ text: `생활비 -${won(cost)}`, tone: 'neutral', delta: true });
  }
  if (p.job === 'office' || p.job === 'teacher' || p.job === 'producer' || p.job === 'session') {
    // 세션 일은 들쭉날쭉하다
    const base = { office: 16_000_000, teacher: 15_000_000, producer: 20_000_000, session: rng.range(6_000_000, 22_000_000) }[p.job] * priceIndex(s.time) * countryOf(p.country).wageMul * halfYears;
    p.money += Math.round(base);
    book(s, Math.round(base), '월급');
    p.stats.stress = clamp(p.stats.stress + (p.job === 'office' ? 6 : 3));
    news.push({ text: `월급 +${won(base)}`, tone: 'good', delta: true });
  }
  // 취미로 음악을 하면 팬은 동네 단골 규모로 천천히 줄어든다
  if (s.flags.hobby && !s.flags.revivalHit && p.fans > 300) p.fans = Math.max(300, Math.round(p.fans * 0.9));
  // ── 대출: 이자가 붙고, 여윳돈이 있으면 자동으로 갚는다 ──
  if (p.debt > 0) {
    const interest = Math.round(p.debt * p.debtRate * step);
    p.debt += interest;
    news.push({ text: `대출 이자 -${won(interest)} (연 ${(p.debtRate * 100).toFixed(1)}%)`, tone: 'bad', delta: true });
    const buffer = livingCost(s, priceIndex(s.time)) * 2;
    if (p.money > buffer) {
      const pay = Math.min(p.debt, Math.round((p.money - buffer) * 0.5));
      p.debt -= pay;
      p.money -= pay;
      if (pay > 0) news.push({ text: `대출 상환 -${won(pay)} (남은 빚 ${won(p.debt)})`, tone: 'good', delta: true });
      if (p.debt === 0) {
        p.debtRate = 0;
        p.credit = clamp(p.credit + 8);
        pushFeed(s, { t: s.time, text: '대출을 다 갚았다. 통장 앱 알림이 조용해졌다.', tone: 'good', kind: 'life' });
      }
    } else if (p.money < 0) {
      p.credit = clamp(p.credit - 6 * step * 2);
      if (p.credit < 35 && !s.flags.delinquent) {
        s.flags.delinquent = s.time;
        pushFeed(s, { t: s.time, text: '대출 연체 — 신용점수가 떨어졌다. 은행 문자가 하루에 세 번 온다.', tone: 'bad', kind: 'life' });
      }
    }
  }
  // 마이너스 통장: 잔고가 음수면 연 8% 이자 [근사 — 시중은행 마이너스통장 금리 수준]
  if (p.money < 0 && a >= 19) {
    const od = Math.round(-p.money * 0.08 * step);
    p.money -= od;
    if (od >= 10_000) news.push({ text: `마이너스 통장 이자 -${won(od)}`, tone: 'bad', delta: true });
    p.credit = clamp(p.credit - step * 2);
  } else if (p.money > 0 && p.debt === 0) {
    p.credit = clamp(p.credit + step);
  }
  if (p.military === 'serving' && s.time >= p.militaryUntil) {
    p.military = 'done';
    s.queue.push({ id: 'discharge', bind: {} });
  }

  p.stats.energy = clamp(p.stats.energy + 45 + (p.talents.stamina - 50) / 8 + p.habits.exercise * 4 - (p.job === 'office' ? 18 : 0) - (a > 60 ? 10 : 0));
  if (p.stats.stress >= 80) s.stressTurns++;
  else s.stressTurns = Math.max(0, s.stressTurns - 1);
  if (p.stats.stress >= 75) p.stats.health = clamp(p.stats.health - 0.8 * halfYears);
  if (p.stats.stress <= 30) p.stats.happiness = clamp(p.stats.happiness + 1);
  p.stats.happiness = clamp(p.stats.happiness + (55 - p.stats.happiness) * 0.06);
  p.stats.stress = clamp(p.stats.stress + (25 - p.stats.stress) * 0.12);

  const fansBefore = p.fans;
  if (p.fans > 0) p.fans = Math.round(p.fans * (1 - 0.035 * halfYears));
  s.peakFans = Math.max(s.peakFans, p.fans);
  for (const line of bandUpkeep(s, rng, halfYears, fansBefore)) news.push({ text: line, tone: 'neutral', delta: true });
  // 팬은 활동이 없으면 빠르게, 있어도 조금씩 떠난다 — 큰 변화는 기록에 남긴다
  const fansStart = (s.flags.fansAtPeriodStart as number) ?? fansBefore;
  const fd = p.fans - fansStart;
  if (fansStart >= 50 && Math.abs(fd) >= Math.max(20, fansStart * 0.08)) {
    const why = fd > 0 ? (p.fans > s.peakFans * 0.98 ? '최고 기록 경신' : '새로 생긴 팬들') : s.flags.hiatus ? '활동 중단' : fansStart > 1000 ? '새 노래가 없으면 잊힌다' : '관심이 식었다';
    pushFeed(s, { t: s.time, text: `팬 ${fd > 0 ? '+' : ''}${fd.toLocaleString()}명 — ${why}`, tone: fd > 0 ? 'good' : 'bad', kind: 'news' });
  }
  s.flags.fansAtPeriodStart = p.fans;

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
      // 기대수명 차이만큼 나이를 옮겨 그 나라의 생명표처럼 [근사]
      const q = annualDeathProb(ya + (83.5 - countryOf(p.country).lifeExp), p.stats.health, p.habits.smokeYears);
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
    // 몇 해를 한꺼번에 넘기는 시기에 세상을 떠나면 시기 끝이 아니라 떠난 해로 적는다 (1968–2034인데 ‘2035년 67세 마지막 숨’이 되던 문제)
    const dA = p.deathAge ?? Math.floor(a);
    s.chronicle.push({ age: dA, year: p.birthYear + dA, text: '마지막 숨. 어딘가에서 내 노래가 흐르고 있었다.', kind: 'big' });
    const ce = s.flags.careerEnd as number | undefined;
    s.cine.push(
      ce !== undefined
        ? { kind: 'death', scene: 'home', kicker: `${p.birthYear + (p.deathAge ?? 0)} · ${p.deathAge}세`, title: '에필로그', sub: `${ce}세에 음악을 내려놓고, ${Math.max(0, (p.deathAge ?? ce) - ce)}년을 더 살았다.
${p.name}, ${p.birthYear}–${p.birthYear + (p.deathAge ?? 0)}`, at: s.time }
        : { kind: 'death', scene: 'stage_old', kicker: `${p.birthYear + (p.deathAge ?? 0)} · ${p.deathAge}세`, title: '마지막 무대', sub: `${p.name}, ${p.birthYear}–${p.birthYear + (p.deathAge ?? 0)}`, at: s.time },
    );
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

/** 한국에만 있는 제도·문화에 기댄 사건들 (수능·병역·명절·찜질방·광역버스·홍대…) */
const KOREA_ONLY = new Set(['suneung', 'draft', 'move_out', 'band_boom', 'era_2002', 'life_holiday_nag', 'life_jjimjilbang', 'life_pcbang', 'life_cup_ramen', 'life_school_trip', 'car_survival_show', 'g_showcase']);
export function isKoreaOnly(id: string) {
  return KOREA_ONLY.has(id) || /^rg_(seoul|gg|metro|local)_/.test(id);
}
export { COUNTRIES };
