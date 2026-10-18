import type { GameState, Gender, Genre, Inst, Npc, NpcCareer, Trait } from './types';
import { GENRES, INSTRUMENTS } from './types';
import { Rng, clamp } from './rng';
import { randomName } from './names';
import { age } from './state';

export const TRAIT_LABEL: Record<Trait, string> = {
  diligent: '성실한',
  free: '자유로운',
  sensitive: '예민한',
  warm: '다정한',
  ambitious: '야심 찬',
  funny: '유쾌한',
  stubborn: '고집 센',
  shy: '수줍은',
};

const TRAITS: Trait[] = ['diligent', 'free', 'sensitive', 'warm', 'ambitious', 'funny', 'stubborn', 'shy'];

const DREAMS = [
  '언젠가 단독 공연을 매진시키는 것',
  '자기 이름이 적힌 LP를 갖는 것',
  '부모님을 공연에 초대하는 것',
  '해외 페스티벌 무대에 서는 것',
  '작은 라이브 카페를 차리는 것',
  '평범하게, 하지만 음악을 놓지 않고 사는 것',
  '드라마 OST에 내 곡이 실리는 것',
  '아무도 안 들어도 좋은 곡 하나 남기는 것',
  '음악으로 월세를 내는 것',
  '자기 밴드의 공연에서 관객이 떼창하는 것',
];

export const CAREER_LABEL: Record<NpcCareer, string> = {
  student: '학생',
  musician: '뮤지션',
  office: '회사원',
  producer: '프로듀서',
  label: '레이블 대표',
  teacher: '음악 선생님',
  journalist: '음악 기자',
  promoter: '공연 기획자',
  cafe: '카페 사장',
  gone: '연락 두절',
};

export interface NpcSpec {
  gender?: Gender;
  birthYear?: number;
  inst?: Inst;
  skill?: number;
  genre?: Genre;
  metAt: string;
  affinity?: number;
  role?: Npc['role'];
  traits?: Trait[];
  career?: NpcCareer;
}

export function createNpc(s: GameState, rng: Rng, spec: NpcSpec): Npc {
  const gender = spec.gender ?? (rng.chance(0.5) ? 'm' : 'f');
  const birthYear = spec.birthYear ?? s.player.birthYear + rng.int(-1, 1);
  const used = new Set(Object.values(s.npcs).map((n) => n.name.slice(1)));
  used.add(s.player.name.slice(1));
  const id = `n${++s.npcSeq}`;
  const t1 = rng.pick(TRAITS);
  let t2 = rng.pick(TRAITS);
  if (t2 === t1) t2 = TRAITS[(TRAITS.indexOf(t1) + 3) % TRAITS.length];
  const npc: Npc = {
    id,
    name: randomName(rng, gender, birthYear, used),
    gender,
    birthYear,
    look: rng.int(1, 1_000_000),
    inst: spec.inst ?? rng.weighted(INSTRUMENTS, (i) => ({ vocal: 3, guitar: 4, bass: 2, drums: 2, keys: 1.5 })[i])!,
    skill: spec.skill ?? clamp(Math.round(rng.normal(30, 15)), 3, 95),
    traits: spec.traits ?? [t1, t2],
    genre: spec.genre ?? rng.pick(GENRES),
    dream: rng.pick(DREAMS),
    career: spec.career ?? 'student',
    metAt: spec.metAt,
    metAge: Math.max(0, Math.floor(age(s))),
    affinity: spec.affinity ?? rng.int(10, 30),
    trust: 30,
    conflict: 0,
    lastSeenTurn: s.turn,
    memories: [],
    inBand: false,
    alive: true,
    role: spec.role ?? 'friend',
  };
  s.npcs[id] = npc;
  return npc;
}

export const npcAge = (s: GameState, n: Npc) => Math.floor(s.time - n.birthYear);

/** 시간이 흐르면 NPC 들도 각자의 인생을 산다. 1년에 한 번 호출. */
export function ageNpcs(s: GameState, rng: Rng): string[] {
  const news: string[] = [];
  for (const n of Object.values(s.npcs)) {
    if (!n.alive || n.role === 'parent') continue;
    const a = npcAge(s, n);
    // 연습은 계속된다 — 음악을 하는 사람만
    if (n.career === 'musician' || n.career === 'student' || n.inBand) {
      n.skill = clamp(n.skill + rng.range(0.5, n.traits.includes('diligent') ? 4 : 2.5), 0, 98);
    }
    // 오래 안 보면 관계가 식는다
    if (!n.inBand && s.turn - n.lastSeenTurn > 6) n.affinity = clamp(n.affinity - 2, -100, 100);
    if (n.inBand) continue;
    // 진로 변화 (20대 이후)
    if (a >= 20 && n.career === 'student') {
      if (n.skill > 55 && rng.chance(0.35)) n.career = 'musician';
      else if (rng.chance(0.3)) n.career = rng.pick(['office', 'office', 'cafe', 'teacher'] as NpcCareer[]);
    }
    if (a >= 30 && n.career === 'musician' && rng.chance(0.1)) {
      const next = rng.weighted<NpcCareer>(['producer', 'office', 'promoter', 'teacher', 'label'], (c) => ({ producer: n.skill > 60 ? 3 : 1, office: 2, promoter: 1, teacher: 1, label: n.traits.includes('ambitious') ? 1.5 : 0.4 } as Record<string, number>)[c])!;
      n.career = next;
      if (n.affinity > 20) news.push(`${n.name}, ${CAREER_LABEL[next]}의 길로`);
    }
    if (a >= 35 && n.career === 'office' && rng.chance(0.03)) n.career = 'cafe';
    if (a >= 33 && n.career === 'office' && rng.chance(0.02)) n.career = 'journalist';
  }
  return news;
}

export function bandMembers(s: GameState): Npc[] {
  return (s.band?.memberIds ?? []).map((id) => s.npcs[id]).filter(Boolean);
}

export function friends(s: GameState, min = 25): Npc[] {
  return Object.values(s.npcs).filter((n) => n.alive && n.role !== 'parent' && n.affinity >= min);
}

export function remember(n: Npc, memory: string) {
  n.memories.unshift(memory);
  if (n.memories.length > 6) n.memories.length = 6;
}

export function relDelta(s: GameState, n: Npc, d: number) {
  n.affinity = clamp(n.affinity + d, -100, 100);
  if (d > 0) n.trust = clamp(n.trust + d / 2);
  n.lastSeenTurn = s.turn;
}

export function relationLabel(n: Npc): string {
  if (n.role === 'parent') return '가족';
  if (n.role === 'sibling') return '형제·자매';
  if (n.role === 'partner') return '연인';
  if (n.inBand) return '밴드 멤버';
  if (n.affinity >= 70) return '절친';
  if (n.affinity >= 40) return '친구';
  if (n.affinity >= 10) return '아는 사이';
  if (n.affinity <= -30) return '앙숙';
  return '서먹한 사이';
}
