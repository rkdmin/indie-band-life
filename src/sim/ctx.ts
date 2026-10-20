// 이벤트·행동이 상태를 바꿀 때 쓰는 도우미. 모든 변화는 결과 줄(ResultLine)로 남아 화면에 보인다.

import type { ChronicleEntry, GameState, Genre, Inst, Npc, Odds, PendingRoll, ResultLine, Roll, SceneId, Skill, Stats, CardInfo, Risk } from './types';
import { Rng, clamp, prob } from './rng';
import { addGenre, addSkill, addStat, age, ageInt, bornAge, isBorn, chron, flag, mainSkill, setFlag, stageOf, year } from './state';
import { createNpc, relDelta, remember, type NpcSpec } from './npc';
import { GENRE_INFO, INST_LABEL, SKILL_LABEL, priceIndex } from './data/world';
import { countryOf } from './data/countries';
import { callName, given, josa, won, count } from './korean';
import { themeByKey } from './songs';

const STAT_LABEL: Record<keyof Stats, string> = { happiness: '행복', stress: '스트레스', health: '건강', energy: '컨디션' };

export class Ctx {
  lines: ResultLine[] = [];
  rolls: Roll[] = [];
  /** 지금 고른 선택지의 확률 (engine 이 run 직전에 채운다) */
  choicesOdds?: Odds;
  constructor(
    public s: GameState,
    public rng: Rng,
    public bind: Record<string, string> = {},
    public vars: Record<string, string | number> = {},
  ) {}

  get p() {
    return this.s.player;
  }
  get age() {
    return age(this.s);
  }
  get ageInt() {
    return ageInt(this.s);
  }
  get year() {
    return year(this.s);
  }
  get stage() {
    return stageOf(age(this.s), bornAge(this.s));
  }
  /** 세상에 나왔나 (태교 시기가 끝났나) */
  get born() {
    return isBorn(this.s);
  }
  get price() {
    return priceIndex(this.s.time) * countryOf(this.p.country).costMul;
  }
  get country() {
    return countryOf(this.p.country);
  }
  get mainSkill() {
    return mainSkill(this.s);
  }
  get band() {
    return this.s.band;
  }
  get members(): Npc[] {
    return (this.s.band?.memberIds ?? []).map((id) => this.s.npcs[id]).filter(Boolean);
  }
  get isMale() {
    return this.p.gender === 'm';
  }
  /** 플레이어 부르는 이름 (서준이, 민지) */
  get me() {
    return callName(this.p.name);
  }

  // ---------- 인물 ----------
  npc(role: string): Npc {
    const id = this.bind[role];
    const n = id ? this.s.npcs[id] : undefined;
    if (!n) throw new Error(`role ${role} not bound`);
    return n;
  }
  has(role: string) {
    return !!this.bind[role] && !!this.s.npcs[this.bind[role]];
  }
  /** 이름 (성 뺀 이름) */
  n(role: string) {
    return given(this.npc(role).name);
  }
  /** 이름 + 조사 */
  nj(role: string, pair: Parameters<typeof josa>[1]) {
    return josa(given(this.npc(role).name), pair);
  }
  /** 정답게 부르는 이름: 민재야 / 서준아 */
  call(role: string) {
    return josa(given(this.npc(role).name), '아/야');
  }
  meet(role: string, spec: NpcSpec): Npc {
    const n = createNpc(this.s, this.rng, spec);
    this.bind[role] = n.id;
    this.lines.push({ text: `새로운 인연: ${n.name}`, tone: 'good' });
    return n;
  }
  /** 조건에 맞는 기존 인물 중 하나를 역할에 묶는다 */
  bindFrom(role: string, filter: (n: Npc) => boolean, weight: (n: Npc) => number = (n) => 1 + Math.max(0, n.affinity)): boolean {
    const pool = Object.values(this.s.npcs).filter((n) => n.alive && n.role !== 'parent' && n.role !== 'sibling' && filter(n));
    const pick = this.rng.weighted(pool, weight);
    if (!pick) return false;
    this.bind[role] = pick.id;
    return true;
  }
  rel(role: string, d: number, memory?: string) {
    const n = this.npc(role);
    const tr = this.p.traits ?? [];
    if (d > 0 && tr.includes('warm')) d = Math.round(d * 1.25);
    if (d > 0 && tr.includes('funny')) d = Math.round(d * 1.15);
    if (d < 0 && tr.includes('stubborn')) d = Math.round(d * 1.25);
    relDelta(this.s, n, d);
    if (memory) remember(n, `${ageInt(this.s)}세 · ${memory}`);
    if (d !== 0) this.lines.push({ text: `${given(n.name)} 친밀도 ${d > 0 ? '+' : ''}${d}`, tone: d > 0 ? 'good' : 'bad', delta: true });
  }
  conflict(role: string, d: number) {
    const n = this.npc(role);
    n.conflict = clamp(n.conflict + d);
  }

  // ---------- 수치 ----------
  stat(k: keyof Stats, d: number) {
    if (!d) return;
    const tr = this.p.traits ?? [];
    if (k === 'stress' && d > 0 && tr.includes('sensitive')) d *= 1.2;
    if (k === 'stress' && d > 0 && tr.includes('free')) d *= 0.85;
    if (k === 'happiness' && d > 0 && tr.includes('free')) d *= 1.1;
    addStat(this.s, k, d);
    const good = k === 'stress' ? d < 0 : d > 0;
    this.lines.push({ text: `${STAT_LABEL[k]} ${d > 0 ? '+' : ''}${Math.round(d)}`, tone: good ? 'good' : 'bad', delta: true });
  }
  skill(k: Skill, d: number) {
    if (!d) return;
    const before = this.p.skills[k];
    addSkill(this.s, k, d);
    const real = Math.round((this.p.skills[k] - before) * 10) / 10;
    if (Math.abs(real) >= 0.5) this.lines.push({ text: `${SKILL_LABEL[k]} ${real > 0 ? '+' : ''}${Math.round(real)}`, tone: real > 0 ? 'good' : 'bad', delta: true });
  }
  genre(g: Genre, d: number) {
    addGenre(this.s, g, d);
    if (d >= 3) this.lines.push({ text: `${GENRE_INFO[g].label} 친숙도 +${Math.round(d)}`, tone: 'good', delta: true });
  }
  money(d: number, why?: string) {
    if (!d) return;
    const v = Math.round(d);
    this.p.money += v;
    book(this.s, v, why);
    this.lines.push({ text: `${why ? why + ' ' : ''}${v > 0 ? '+' : ''}${won(v)}`, tone: v > 0 ? 'good' : 'bad', delta: true });
  }
  /** 2026년 물가 기준 금액을 해당 연도 물가로 */
  /** 대출: 원금은 통장에 들어오고, 잔액·이율은 가중평균으로 합쳐진다 */
  borrow(amount: number, rate: number, kind: string) {
    const v = Math.round(amount);
    if (v <= 0) return;
    const p = this.p;
    p.debtRate = (p.debt * p.debtRate + v * rate) / (p.debt + v);
    p.debt += v;
    p.money += v;
    p.credit = clamp(p.credit - (rate >= 0.15 ? 12 : 3));
    this.lines.push({ text: `${kind} +${won(v)} (연 ${(rate * 100).toFixed(1)}%)`, tone: 'neutral', delta: true });
    if (rate >= 0.15) this.set('loanShark');
  }
  krw(base2026: number) {
    return Math.round(base2026 * this.price);
  }
  fans(d: number) {
    // 취미로 음악을 하면 새 팬은 잘 늘지 않는다 (동네 단골·지인 위주)
    const v = Math.round(d > 0 && this.s.flags.hobby && !this.s.flags.revivalHit ? d * 0.35 : d);
    if (!v) return;
    this.p.fans = Math.max(0, this.p.fans + v);
    this.lines.push({ text: `팬 ${v > 0 ? '+' : ''}${count(v)}`, tone: v > 0 ? 'good' : 'bad', delta: true });
  }
  rep(d: number) {
    this.p.rep = clamp(this.p.rep + d);
    if (Math.abs(d) >= 1) this.lines.push({ text: `평판 ${d > 0 ? '+' : ''}${Math.round(d)}`, tone: d > 0 ? 'good' : 'bad', delta: true });
  }
  study(d: number) {
    this.p.study = clamp(this.p.study + d);
    if (Math.abs(d) >= 2) this.lines.push({ text: `학업 ${d > 0 ? '+' : ''}${Math.round(d)}`, tone: d > 0 ? 'good' : 'bad', delta: true });
  }
  setInst(i: Inst) {
    if (!this.p.mainInst) {
      this.p.mainInst = i;
      this.lines.push({ text: `주 악기: ${INST_LABEL[i]}`, tone: 'big' });
    }
  }

  // ---------- 확률 ----------
  roll(p: number) {
    return this.rng.chance(p);
  }
  /** P = sigmoid(logit(p0) + Σterms) */
  chance(p0: number, ...terms: number[]) {
    return prob(p0, ...terms);
  }
  /**
   * d20 판정 (발더스 게이트식): d20 + 보정치 ≥ 난이도(DC) 이면 성공. 자연 20은 무조건 성공, 자연 1은 무조건 실패.
   * 보정치는 실제 능력치에서 나온다. 난이도는 현실 통계(경쟁률 등)나 게임 가정에서 정한다 — note 에 근거를 적는다.
   */
  dc(dc: number, ability: string, mods: [string, number][], src: Odds['src'] = '가정', note?: string, adv = false): Odds {
    const parts = mods.filter(([, v]) => v).map(([label, v]) => ({ label, d: Math.round(v) }));
    const mod = parts.reduce((a, x) => a + x.d, 0);
    const need = dc - mod; // 이 눈 이상이면 성공
    let p = Math.min(0.95, Math.max(0.05, (21 - need) / 20));
    if (adv) p = 1 - (1 - p) * (1 - p);
    return { p, base: 0, src, note, parts, dc, ability, mod, adv };
  }
  /** 능력치 0~100 → 보정치 (-4 ~ +6) */
  m(v: number) {
    return Math.floor((v - 40) / 10);
  }
  /** 확률을 같은 성공률의 d20 난이도로 바꾼다 (보정치 0) */
  fromP(p: number, ability = '운 판정', note?: string): Odds {
    const dc = Math.max(2, Math.min(21, Math.round(21 - p * 20)));
    return this.dc(dc, ability, [], '가정', note);
  }
  /** 이전 버전 호환: 확률 모델을 d20 으로 근사 */
  odds(base: number, terms: [string, number][], src: Odds['src'] = '가정', note?: string): Odds {
    const dc = Math.round(21 - base * 20);
    return this.dc(dc, '판정', terms.map(([l, v]) => [l, Math.round(v * 3)]), src, note);
  }
  /** 정해진 결과가 있으면(engine 이 미리 굴린 것) 그것을, 없으면 지금 굴린다 */
  preset: PendingRoll | null = null;
  check(o: Odds, label = o.ability): boolean {
    let nat: number;
    let nat2: number | undefined;
    if (this.preset) {
      nat = this.preset.nat;
      nat2 = this.preset.nat2;
      this.preset = null;
    } else {
      nat = this.rng.int(1, 20);
      if (o.adv) nat2 = this.rng.int(1, 20);
    }
    const best = nat2 !== undefined ? Math.max(nat, nat2) : nat;
    const ok = best === 20 || (best !== 1 && best + o.mod >= o.dc);
    this.rolls.push({ label, p: o.p, roll: best / 20, ok, nat, nat2, mod: o.mod, dc: o.dc, crit: best === 20 ? 'success' : best === 1 ? 'fail' : undefined });
    return ok;
  }
  pct(p: number) {
    return `성공 확률 약 ${Math.round(p * 100)}%`;
  }
  pick<T>(arr: readonly T[]): T {
    return this.rng.pick(arr);
  }

  // ---------- 기록 ----------
  flag(k: string) {
    return flag(this.s, k);
  }
  set(k: string, v: number | boolean | string = true) {
    setFlag(this.s, k, v);
  }
  inc(k: string, d = 1) {
    this.s.flags[k] = ((this.s.flags[k] as number) || 0) + d;
  }
  theme(key: string) {
    if (!this.s.flags[`theme:${key}`]) {
      this.s.flags[`theme:${key}`] = true;
      this.lines.push({ text: `곡 주제 ‘${themeByKey(key).label}’`, tone: 'good', delta: true });
      if (this.p.inspiration < 3) {
        this.p.inspiration++;
        this.lines.push({ text: '영감 +1', tone: 'good', delta: true });
      }
    }
  }
  chron(text: string, kind: ChronicleEntry['kind'] = 'life', role?: string) {
    chron(this.s, text, kind, role ? this.bind[role] : undefined);
  }
  /** 같은 사건의 문장이 반복되지 않게 — 지난번과 다른 것을 고른다 */
  vary(key: string, lines: readonly string[]): string {
    const k = `tv:${key}`;
    const last = Number(this.s.flags[k] ?? -1);
    let i = this.rng.int(0, lines.length - 1);
    if (lines.length > 1 && i === last) i = (i + 1 + this.rng.int(0, lines.length - 2)) % lines.length;
    this.s.flags[k] = i;
    return lines[i];
  }
  line(text: string, tone: ResultLine['tone'] = 'neutral') {
    this.lines.push({ text, tone });
  }
  /** 다음 턴(또는 이번 턴 뒤)에 이어지는 사건 예약 */
  queue(id: string, bind: Record<string, string> = this.bind, vars?: Record<string, string | number>) {
    this.s.queue.push({ id, bind: { ...bind }, vars });
  }
  scene(id: SceneId) {
    this.s.lastScene = id;
  }
}

export interface EventChoice {
  label: string | ((c: Ctx) => string);
  hint?: (c: Ctx) => string | undefined;
  /** 성공 확률 내역 — 있으면 선택지 아래에 막대와 내역이 보이고, run 안에서 c.check() 로 굴린다 */
  odds?: (c: Ctx) => Odds;
  if?: (c: Ctx) => boolean;
  run: (c: Ctx) => string | void;
  /** 카드로 보여 줄 정보 (EventDef.cards 일 때) */
  card?: (c: Ctx) => CardInfo;
  /** 위험도 표시 */
  risk?: Risk;
  /** 최선·최악 결과 범위 한 줄 */
  range?: (c: Ctx) => string;
  /** 지금 고를 수 없는 이유 — 있으면 선택지가 잠긴 채로 보인다 (돈·외모·실력·나이…) */
  req?: (c: Ctx) => string | null | undefined | false;
  /** 고를 수 있을 때 살짝 보이는 이유 (없으면 판정 보정·지출에서 만든다) */
  why?: (c: Ctx) => string | undefined;
  /** 이 선택에 드는 돈 — 통장보다 크면 ‘돈이 부족하다’로 잠긴다. 없으면 run 의 첫 지출에서 읽는다 */
  cost?: (c: Ctx) => number;
}

export interface EventDef {
  id: string;
  scene: SceneId | ((c: Ctx) => SceneId);
  title: string | ((c: Ctx) => string);
  /** 노출 조건 — 상태만 보고 판단 (부수효과 금지) */
  when: (c: Ctx) => boolean;
  /** 조건 충족 시 이번 턴 노출 확률 (기본 0.12) */
  chance?: number | ((c: Ctx) => number);
  once?: boolean;
  cooldown?: number;
  /** 100 이상은 스토리 이벤트: 조건이 맞으면 랜덤 이벤트보다 먼저, 반드시 노출 후보가 된다 */
  priority?: number;
  /** 큐로만 발생 (후속 이벤트) */
  queued?: boolean;
  /** 역할 바인딩 — 실패하면 이 이벤트는 건너뜀 */
  bind?: (c: Ctx) => boolean;
  text: (c: Ctx) => string;
  choices: EventChoice[];
  /** 선택지를 카드로 펼쳐 보여 준다 */
  cards?: boolean;
  kicker?: string;
  /** 한 번에 보여 줄 선택지 수 (기본 4) — 많으면 이번 인생에서 덜 본 것부터 */
  show?: number;
  /** 이 해보다 이르면 나오지 않는다 (전제가 그 시대에 없던 사건) */
  minYear?: number;
  maxYear?: number;
}

const MUSIC_IN = ['공연 수익', '출연료', '계약금', '레슨비', '음원', '기타 케이스', '광고 음악', 'OST', '세션', '굿즈', '펀딩', '지원금', '작곡'];
const MUSIC_OUT = ['합주실', '녹음', '광고비', '공연 적자', '장비', '앰프', '이펙터', '대관', '항공', '투어'];

/** 장부에 적는다: 음악 수입 / 음악 지출 / 그 밖의 수입 */
export function book(s: GameState, v: number, why?: string) {
  if (!s.ledger) s.ledger = { music: 0, cost: 0, other: 0 };
  const w = why ?? '';
  if (v > 0 && MUSIC_IN.some((k) => w.includes(k))) s.ledger.music += v;
  else if (v < 0 && MUSIC_OUT.some((k) => w.includes(k))) s.ledger.cost += -v;
  else if (v > 0 && w && !w.includes('부모') && !w.includes('엄마') && !w.includes('용돈')) s.ledger.other += v;
}
