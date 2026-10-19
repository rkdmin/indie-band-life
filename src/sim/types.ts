// 게임 상태의 단일 정의. 저장(localStorage)되는 것은 전부 직렬화 가능한 값이어야 한다.

export type Gender = 'm' | 'f';
export type Region = 'seoul' | 'gyeonggi' | 'metro' | 'local';
export type Income = 'low' | 'mid' | 'high';

export const INSTRUMENTS = ['vocal', 'guitar', 'bass', 'drums', 'keys'] as const;
export type Inst = (typeof INSTRUMENTS)[number];

export const SKILLS = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'compose', 'stage'] as const;
export type Skill = (typeof SKILLS)[number];

export const GENRES = ['indierock', 'punk', 'shoegaze', 'folk', 'metal', 'indiepop'] as const;
export type Genre = (typeof GENRES)[number];

export type ParentTaste = Genre | 'classical' | 'trot' | 'ballad' | 'none';

export type Edu =
  | 'none'
  | 'elem'
  | 'middle'
  | 'high'
  | 'univ'
  | 'music_univ'
  | 'grad_high'
  | 'grad_univ'
  | 'grad_music';

export type Job = 'none' | 'part' | 'office' | 'teacher' | 'producer' | 'session' | 'owner';
export type Military = 'none' | 'pending' | 'serving' | 'done' | 'exempt';

export type Mood = 'bright' | 'wistful' | 'angry' | 'dreamy' | 'calm' | 'epic';

export type SceneId =
  | 'nursery'
  | 'home'
  | 'classroom'
  | 'musicroom'
  | 'street'
  | 'studio'
  | 'club'
  | 'festival'
  | 'arena'
  | 'recording'
  | 'hospital'
  | 'military'
  | 'office'
  | 'rooftop'
  | 'pub'
  | 'stage_old'
  | 'airport'
  | 'abroad';

export interface Stats {
  happiness: number; // 0-100
  stress: number; // 0-100
  health: number; // 0-100 장기 건강
  energy: number; // 0-100 이번 시기 컨디션
}

export interface Habits {
  smoking: boolean;
  smokeYears: number;
  drinking: number; // 0~3
  exercise: number; // 0~3
}

export interface Player {
  name: string;
  gender: Gender;
  birthYear: number;
  region: Region;
  income: Income;
  parentTaste: ParentTaste;
  instrumentAtHome: boolean;
  look: number; // 외형 시드
  skills: Record<Skill, number>;
  mainInst: Inst | null;
  genre: Record<Genre, number>; // 친숙도 0~100
  stats: Stats;
  money: number; // 원
  fans: number;
  globalFans: number; // 해외 팬
  inspiration: number; // 영감 — 실패한 판정을 다시 굴린다 (최대 3)
  /** 대출 잔액(원)과 가중평균 연이율, 신용(0~100) */
  debt: number;
  debtRate: number;
  credit: number;
  /** 태어난 나라 (data/countries.ts) */
  country: string;
  /** 타고난 재능 (음감·리듬감·가사 감각·무대 존재감·체력) 0~100 */
  talents: Record<'pitch' | 'rhythm' | 'lyric' | 'presence' | 'stamina', number>;
  /** 성격 두 가지 */
  traits: Trait[];
  /** 태어날 때 정해진 인생 변수 (data/fate.ts) */
  fate: import('./data/fate').FateResult;
  /** 이런 인생이 나올 확률의 log10(1/p) */
  rarityLog: number;
  rep: number; // 평판/업계 인지도 0~100
  habits: Habits;
  edu: Edu;
  study: number; // 학업 0~100
  job: Job;
  military: Military;
  militaryUntil: number; // 전역 시점(연도 소수)
  partnerId: string | null;
  alive: boolean;
  retired: boolean;
  deathAge: number | null;
}

export type Trait = 'diligent' | 'free' | 'sensitive' | 'warm' | 'ambitious' | 'funny' | 'stubborn' | 'shy';

export type NpcCareer =
  | 'student'
  | 'musician'
  | 'office'
  | 'producer'
  | 'label'
  | 'teacher'
  | 'journalist'
  | 'promoter'
  | 'cafe'
  | 'gone';

export interface Npc {
  id: string;
  name: string;
  gender: Gender;
  birthYear: number;
  look: number;
  inst: Inst;
  skill: number; // 주 악기 실력 0~100
  traits: Trait[];
  genre: Genre;
  dream: string;
  career: NpcCareer;
  metAt: string; // 만난 맥락
  metAge: number; // 플레이어 나이 기준
  affinity: number; // 친밀도 -100~100
  trust: number; // 0~100
  conflict: number; // 0~100
  lastSeenTurn: number;
  memories: string[]; // 공유한 기억 (최근 순)
  inBand: boolean;
  /** 밴드 만족도 0~100 — 낮아지면 탈퇴 위기 */
  sat?: number;
  alive: boolean;
  role?: 'parent' | 'sibling' | 'child' | 'friend' | 'rival' | 'mentor' | 'partner' | 'fan' | 'member';
}

export interface Song {
  id: string;
  title: string;
  genre: Genre;
  mood: Mood;
  theme: string; // 곡 주제 (인생 사건에서 파생)
  lyric: string[]; // 대표 가사 몇 줄
  quality: number; // 0~100
  seed: number; // 절차 음악 시드
  writtenYear: number;
  writtenAge: number;
  bandName: string | null;
  released: boolean;
  releasedYear: number | null;
  streams: number;
  peak: number; // 최고 순위 (0 = 차트 진입 못함)
  hit: boolean;
  revival: boolean; // 역주행
  coverSeed: number;
}

export interface Album {
  id: string;
  title: string;
  kind: 'single' | 'ep' | 'full';
  songIds: string[];
  year: number;
  age: number;
  bandName: string;
  coverSeed: number;
  genre: Genre;
  score: number; // 평단 점수 0~10
  sales: number;
}

export interface Band {
  id: string;
  name: string;
  genre: Genre;
  formedYear: number;
  endedYear: number | null;
  memberIds: string[]; // NPC id
  playerInst: Inst;
  chemistry: number; // 0~100
  label: 'none' | 'indie' | 'major';
  gigs: number;
  bestGig: string | null;
}

export interface ChronicleEntry {
  age: number;
  year: number;
  text: string;
  kind: 'life' | 'music' | 'people' | 'band' | 'health' | 'big';
  npcId?: string;
}

export interface ResultLine {
  text: string;
  tone?: 'good' | 'bad' | 'neutral' | 'big';
  /** 수치 변화 한 줄 (행복 +5 같은) — 기록에서는 문장 뒤에 작게 붙는다 */
  delta?: boolean;
}

/** 확률 내역: 기본값과 각 요인이 몇 %p 바꿨는지 — 화면에 그대로 보인다 */
export interface Odds {
  p: number;
  base: number;
  src: '통계' | '근사' | '가정';
  note?: string;
  parts: { label: string; d: number }[];
  /** d20 판정: 난이도·판정 능력·보정치 합·유리함 */
  dc: number;
  ability: string;
  mod: number;
  adv?: boolean;
}

/** 실제로 굴린 주사위 */
export interface Roll {
  label: string;
  p: number;
  roll: number;
  ok: boolean;
  nat: number;
  nat2?: number;
  mod: number;
  dc: number;
  crit?: 'success' | 'fail';
}

/** 굴렸지만 아직 결과를 적용하지 않은 판정 — 영감으로 다시 굴릴 수 있다 */
export interface PendingRoll {
  idx: number;
  odds: Odds;
  nat: number;
  nat2?: number;
  ok: boolean;
  crit?: 'success' | 'fail';
  rerolled: boolean;
}

/** 인생 기록 한 줄. 시간(연도 소수)에 맞춰 화면에 흘러나온다 */
export interface FeedEntry {
  t: number;
  text: string;
  tone: 'good' | 'bad' | 'neutral' | 'big' | 'flavor' | 'history' | 'world';
  deltas?: string;
  kind?: 'action' | 'event' | 'news' | 'flavor' | 'life';
}

/** 전체 화면 연출이 필요한 큰 순간 */
export interface Cine {
  kind: 'event' | 'release' | 'band' | 'hit' | 'gig' | 'death' | 'birth';
  scene: SceneId;
  kicker: string;
  title: string;
  sub?: string;
  songId?: string;
  albumId?: string;
  at: number;
}

export interface PendingEvent {
  id: string;
  bind: Record<string, string>; // 역할 → npc id
  vars?: Record<string, string | number>;
}

export interface ActiveEvent extends PendingEvent {
  title: string;
  text: string;
  scene: SceneId;
  choices: { label: string; hint?: string; disabled?: boolean; hidden?: boolean; odds?: Odds }[];
  result?: { text: string; lines: ResultLine[]; rolls?: Roll[] };
  pending?: PendingRoll;
  at: number;
  big: boolean;
}

export type Phase = 'plan' | 'running' | 'event' | 'ending';

export interface EndingResult {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  epitaph: string;
  rank: 'S' | 'A' | 'B' | 'C';
  bestSongId: string | null;
}

export interface GameState {
  version: number;
  id: string;
  seed: number;
  rng: number;
  turn: number;
  time: number; // 연도 소수 (2004.5 = 2004년 하반기)
  player: Player;
  npcs: Record<string, Npc>;
  npcSeq: number;
  band: Band | null;
  pastBands: Band[];
  songs: Song[];
  albums: Album[];
  chronicle: ChronicleEntry[];
  flags: Record<string, number | boolean | string>;
  fired: Record<string, number>; // 이벤트 id → 마지막 발생 턴
  queue: PendingEvent[];
  active: ActiveEvent | null;
  lastResults: ResultLine[];
  news: ResultLine[]; // 시기가 넘어가며 생긴 일 (생활비·정산·나이 듦)
  lastActions: ActionPick[];
  plan: ActionPick[];
  autoPlan: boolean;
  autoDecide: boolean;
  feed: FeedEntry[];
  cine: Cine[];
  periodEnd: number;
  /** 이번 인생의 사건 덱에서 빠진 일반 사건들 — 인생마다 다른 조합 */
  deckOut: string[];
  lastScene: SceneId;
  stressTurns: number;
  history: { age: number; fans: number; happiness: number; money: number }[];
  /** 올해 장부: 음악으로 번 돈 / 음악에 쓴 돈 / 그 밖의 수입 */
  ledger: { music: number; cost: number; other: number };
  ledgers: { year: number; age: number; music: number; cost: number; other: number }[];
  phase: Phase;
  ending: EndingResult | null;
  peakFans: number;
}

export interface ActionPick {
  id: string;
  param?: string;
}
