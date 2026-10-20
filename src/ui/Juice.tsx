// 손맛: 수치 변화가 떠오르고, 업적을 달성하면 배지가 튀어나오고, 첫 플레이에는 짧은 안내가 나온다.

import { useEffect, useRef, useState } from 'react';
import type { FeedEntry, GameState } from '../sim/types';
import { MILESTONES, achieved, nextGoals } from '../sim/milestones';
import { sfx } from '../audio/player';
import { count, won } from '../sim/korean';

// ───────── 떠오르는 수치 변화 ─────────
interface Pop {
  id: number;
  text: string;
  good: boolean;
}

let popSeq = 0;

export function useStatPops(s: GameState): Pop[] {
  const prev = useRef<Record<string, number> | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const cur: Record<string, number> = {
    건강: Math.round(s.player.stats.health),
    행복: Math.round(s.player.stats.happiness),
    스트레스: Math.round(s.player.stats.stress),
    팬: s.player.fans,
    돈: s.player.money,
  };
  useEffect(() => {
    const p = prev.current;
    prev.current = cur;
    if (!p) return;
    const add: Pop[] = [];
    for (const k of Object.keys(cur)) {
      const d = cur[k] - p[k];
      if (!d) continue;
      if ((k === '건강' || k === '행복' || k === '스트레스') && Math.abs(d) < 3) continue;
      if (k === '팬' && Math.abs(d) < Math.max(5, p[k] * 0.02)) continue;
      if (k === '돈' && Math.abs(d) < 100_000) continue;
      const good = k === '스트레스' ? d < 0 : d > 0;
      const v = k === '돈' ? `${d > 0 ? '+' : '−'}${won(Math.abs(d))}` : `${k} ${d > 0 ? '+' : '−'}${count(Math.abs(d))}`;
      add.push({ id: ++popSeq, text: v, good });
    }
    if (add.length) {
      setPops((x) => [...x, ...add].slice(-5));
      const ids = add.map((a) => a.id);
      window.setTimeout(() => setPops((x) => x.filter((y) => !ids.includes(y.id))), 1800);
    }
  }, [cur.건강, cur.행복, cur.스트레스, cur.팬, cur.돈]); // eslint-disable-line react-hooks/exhaustive-deps
  return pops;
}

export function StatPops({ pops }: { pops: Pop[] }) {
  return (
    <div className="pops" aria-live="polite">
      {pops.map((p, i) => (
        <span key={p.id} className={`pop ${p.good ? 'good' : 'bad'}`} style={{ left: `${8 + ((i * 23) % 70)}%` }}>
          {p.text}
        </span>
      ))}
    </div>
  );
}

// ───────── 업적 배지 ─────────
export function useAchievementToasts(s: GameState) {
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const now = achieved(s);
  const key = [...now].sort().join(',');
  useEffect(() => {
    if (!seen.current) {
      seen.current = now; // 이어하기로 들어왔을 때 이미 이룬 건 다시 축하하지 않는다
      return;
    }
    const fresh = [...now].filter((id) => !seen.current!.has(id));
    seen.current = now;
    if (fresh.length) setQueue((q) => [...q, ...fresh]);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const top = queue[0];
  useEffect(() => {
    if (!top) return;
    sfx('big');
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 2600);
    return () => window.clearTimeout(id);
  }, [top]);
  return top ? MILESTONES.find((m) => m.id === top) ?? null : null;
}

export function AchievementToast({ id }: { id: string }) {
  const m = MILESTONES.find((x) => x.id === id)!;
  return (
    <div className="ach" role="status">
      <div className="ach-badge">{m.emoji}</div>
      <div>
        <div className="ach-k">업적 달성</div>
        <div className="ach-t">{m.label}</div>
        <div className="ach-d">{m.desc}</div>
      </div>
    </div>
  );
}

// ───────── 다음 목표 ─────────
export function GoalsCard({ s }: { s: GameState }) {
  const goals = nextGoals(s, 3);
  const done = achieved(s).size;
  if (!goals.length && done === 0) return null;
  return (
    <div className="card goals">
      <div className="section-title">
        <h3>다음 목표</h3>
        <span className="dim">
          업적 {done}/{MILESTONES.length}
        </span>
      </div>
      <div className="goal-list">
        {goals.map((g) => {
          const pr = g.progress?.(s);
          const pct = pr ? Math.min(100, (pr[0] / pr[1]) * 100) : 0;
          return (
            <div key={g.id} className="goal">
              <span className="goal-e">{g.emoji}</span>
              <div className="grow">
                <div className="goal-l">
                  {g.label}
                  {pr && <span className="goal-n">{count(Math.min(pr[0], pr[1]))}/{count(pr[1])}</span>}
                </div>
                <div className="goal-d">{g.desc}</div>
                {pr && (
                  <div className="bar" style={{ marginTop: 4 }}>
                    <i style={{ width: `${pct}%`, background: 'var(--pink)' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!goals.length && <div className="dim">지금 나이에 노릴 목표를 다 이뤘다. 남은 건 나만의 이야기.</div>}
      </div>
    </div>
  );
}

// ───────── 기록 아이콘 ─────────
const ICONS: [RegExp, string][] = [
  [/결산|생활비|월급|알바|정산|원 벌|만원/, '💰'],
  [/발매|앨범|EP|싱글|녹음/, '💿'],
  [/바이럴|차트|숏폼/, '📈'],
  [/무대 판정|공연|무대|떼창|관객|페스티벌/, '🎤'],
  [/해외|투어|공항|초청/, '✈️'],
  [/합주/, '🥁'],
  [/작곡|가사|데모|곡을/, '✍️'],
  [/연습|레슨|학원/, '🎸'],
  [/헤어|이별|떠났|부고|세상을 떠/, '💔'],
  [/연애|고백|결혼|사랑/, '💗'],
  [/입대|전역|군/, '🪖'],
  [/병원|건강|아팠|쓰러/, '🩺'],
  [/친구|만났|인연|동창/, '🤝'],
  [/밴드|멤버|결성/, '🔥'],
  [/🎲/, '🎲'],
];

export function feedIcon(e: FeedEntry): string {
  if (e.kind === 'flavor') return '·';
  if (e.tone === 'history') return '📻';
  if (e.tone === 'world') return '📰';
  // 문장 자체로 먼저 판단하고, 문장이 비었거나 단서가 없을 때만 수치 줄을 본다
  for (const [re, ic] of ICONS) if (re.test(e.text)) return ic;
  if (e.kind === 'event') return '⚑';
  for (const [re, ic] of ICONS) if (re.test(e.deltas ?? '')) return ic;
  return '•';
}

// ───────── 첫 플레이 안내 ─────────
const STEPS = [
  { t: '인생은 멈추지 않는다', d: '시간이 실시간으로 흐릅니다. 위의 ❚❚ 버튼으로 멈추고, 1× 버튼으로 배속을 바꾸고, ▸▸ 버튼으로 다음 갈림길까지 빨리 감을 수 있어요.' },
  { t: '생활 계획을 세워 두세요', d: '연습·합주·작곡·알바처럼 지금 집중할 일을 정해 두면, 바꿀 때까지 그렇게 삽니다. 고민되면 ‘알아서’에 맡겨도 돼요.' },
  { t: '갈림길에선 레코드를 돌린다', d: '위험한 선택은 d20 판정입니다. 난이도와 내 능력치 보정이 다 보여요. 레코드를 돌리면 바늘이 멈춘 트랙이 결과예요. 실패하면 영감(✦)으로 B면을 한 번 더 틀 수 있어요.' },
];

export function Coach({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const st = STEPS[i];
  return (
    <div className="modal-back coach-back">
      <div className="coach" role="dialog" aria-modal="true" aria-label={st.t}>
        <div className="coach-n">
          {i + 1} / {STEPS.length}
        </div>
        <h2>{st.t}</h2>
        <p>{st.d}</p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="linkbtn" onClick={onDone}>건너뛰기</button>
          <button
            className="btn primary"
            onClick={() => {
              sfx('tap');
              if (i < STEPS.length - 1) setI(i + 1);
              else onDone();
            }}
          >
            {i < STEPS.length - 1 ? '다음' : '살아 보기 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
