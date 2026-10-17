// 이벤트·행동이 상태를 바꿀 때 쓰는 도우미. 모든 변화는 결과 줄(ResultLine)로 남아 화면에 보인다.

import type { ChronicleEntry, GameState, Genre, Inst, Npc, ResultLine, SceneId, Skill, Stats } from './types';
import { Rng, clamp, prob } from './rng';
import { addGenre, addSkill, addStat, age, ageInt, chron, flag, mainSkill, setFlag, stageOf, year } from './state';
import { createNpc, relDelta, remember, type NpcSpec } from './npc';
import { GENRE_INFO, INST_LABEL, SKILL_LABEL, priceIndex } from './data/world';
import { callName, given, josa, won, count } from './korean';

const STAT_LABEL: Record<keyof Stats, string> = { happiness: '행복', stress: '스트레스', health: '건강', energy: '컨디션' };

export class Ctx {
  lines: ResultLine[] = [];
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
    return stageOf(age(this.s));
  }
  get price() {
    return priceIndex(this.s.time);
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
    const pool = Object.values(this.s.npcs).filter((n) => n.alive && n.role !== 'parent' && filter(n));
    const pick = this.rng.weighted(pool, weight);
    if (!pick) return false;
    this.bind[role] = pick.id;
    return true;
  }
  rel(role: string, d: number, memory?: string) {
    const n = this.npc(role);
    relDelta(this.s, n, d);
    if (memory) remember(n, `${ageInt(this.s)}세 · ${memory}`);
    if (d !== 0) this.lines.push({ text: `${given(n.name)} 친밀도 ${d > 0 ? '+' : ''}${d}`, tone: d > 0 ? 'good' : 'bad' });
  }
  conflict(role: string, d: number) {
    const n = this.npc(role);
    n.conflict = clamp(n.conflict + d);
  }

  // ---------- 수치 ----------
  stat(k: keyof Stats, d: number) {
    if (!d) return;
    addStat(this.s, k, d);
    const good = k === 'stress' ? d < 0 : d > 0;
    this.lines.push({ text: `${STAT_LABEL[k]} ${d > 0 ? '+' : ''}${Math.round(d)}`, tone: good ? 'good' : 'bad' });
  }
  skill(k: Skill, d: number) {
    if (!d) return;
    const before = this.p.skills[k];
    addSkill(this.s, k, d);
    const real = Math.round((this.p.skills[k] - before) * 10) / 10;
    if (Math.abs(real) >= 0.5) this.lines.push({ text: `${SKILL_LABEL[k]} ${real > 0 ? '+' : ''}${Math.round(real)}`, tone: real > 0 ? 'good' : 'bad' });
  }
  genre(g: Genre, d: number) {
    addGenre(this.s, g, d);
    if (d >= 3) this.lines.push({ text: `${GENRE_INFO[g].label} 친숙도 +${Math.round(d)}`, tone: 'good' });
  }
  money(d: number, why?: string) {
    if (!d) return;
    const v = Math.round(d);
    this.p.money += v;
    this.lines.push({ text: `${why ? why + ' ' : ''}${v > 0 ? '+' : ''}${won(v)}`, tone: v > 0 ? 'good' : 'bad' });
  }
  /** 2026년 물가 기준 금액을 해당 연도 물가로 */
  krw(base2026: number) {
    return Math.round(base2026 * this.price);
  }
  fans(d: number) {
    const v = Math.round(d);
    if (!v) return;
    this.p.fans = Math.max(0, this.p.fans + v);
    this.lines.push({ text: `팬 ${v > 0 ? '+' : ''}${count(v)}`, tone: v > 0 ? 'good' : 'bad' });
  }
  rep(d: number) {
    this.p.rep = clamp(this.p.rep + d);
    if (Math.abs(d) >= 1) this.lines.push({ text: `평판 ${d > 0 ? '+' : ''}${Math.round(d)}`, tone: d > 0 ? 'good' : 'bad' });
  }
  study(d: number) {
    this.p.study = clamp(this.p.study + d);
    if (Math.abs(d) >= 2) this.lines.push({ text: `학업 ${d > 0 ? '+' : ''}${Math.round(d)}`, tone: d > 0 ? 'good' : 'bad' });
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
      this.lines.push({ text: '새 곡 주제를 얻었다', tone: 'big' });
    }
  }
  chron(text: string, kind: ChronicleEntry['kind'] = 'life', role?: string) {
    chron(this.s, text, kind, role ? this.bind[role] : undefined);
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
  if?: (c: Ctx) => boolean;
  run: (c: Ctx) => string | void;
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
}
