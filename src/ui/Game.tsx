import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionPick, GameState, SceneId } from '../sim/types';
import { ackResults, canRetire, choose, fastForward, proceed, retire, submitActions } from '../sim/engine';
import { Ctx } from '../sim/ctx';
import { Rng } from '../sim/rng';
import { availableActions, type ActionDef } from '../sim/actions';
import { STAGE_LABEL, actionSlots, age, favoriteGenre, half, stageOf, year } from '../sim/state';
import { INST_LABEL } from '../sim/data/world';
import { count, won } from '../sim/korean';
import { Scene, type ScenePerson } from '../art/Scene';
import { playBgm, sfx } from '../audio/player';
import { ParamSheet, paramLabel } from './ParamSheet';
import { BandSheet, ChronicleSheet, PeopleSheet, RecordsSheet } from './Sheets';
import { Sheet } from './Sheet';
import { Ending } from './Ending';
import { Settings } from './Settings';
import type { Meta } from './save';

type Tab = 'life' | 'people' | 'band' | 'records' | 'chron';

interface Props {
  state: GameState;
  onChange: (s: GameState) => void;
  onQuit: () => void;
  onNewLife: () => void;
  meta: Meta;
}

export function Game({ state: s, onChange, onQuit, onNewLife, meta }: Props) {
  const [tab, setTab] = useState<Tab>('life');
  const [menu, setMenu] = useState(false);
  const a = age(s);
  const stage = stageOf(a);

  // 시기별 배경음
  useEffect(() => {
    if (s.phase === 'ending') return;
    const g = s.band?.genre ?? favoriteGenre(s);
    const mood = stage === 'baby' || stage === 'prenatal' ? 'calm' : stage === 'senior' ? 'wistful' : stage === 'elem' ? 'bright' : 'dreamy';
    playBgm(`${stage}-${g}`, a < 7 ? 'folk' : g, mood, s.seed + stage.length * 97);
  }, [stage, s.band?.genre, s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (s.phase === 'ending') return <Ending state={s} meta={meta} onNewLife={onNewLife} onQuit={onQuit} />;

  const unseenSongs = s.songs.filter((x) => !x.released).length;

  return (
    <div className="app">
      <Hud s={s} onMenu={() => setMenu(true)} />
      <GameScene s={s} />
      <div className="main">
        {s.phase === 'actions' && <ActionPanel s={s} onChange={onChange} />}
        {s.phase === 'results' && <Results s={s} onNext={() => onChange(ackResults(s))} />}
        {s.phase === 'event' && s.active && <EventCard s={s} onChoose={(i) => onChange(choose(s, i))} onNext={() => onChange(proceed(s))} />}
      </div>
      <nav className="tabbar" aria-label="메뉴">
        {(
          [
            ['life', '🌱', '인생'],
            ['people', '👥', '사람들'],
            ['band', '🎸', '밴드'],
            ['records', '💿', '음반'],
            ['chron', '📜', '연대기'],
          ] as [Tab, string, string][]
        ).map(([id, ic, label]) => (
          <button key={id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => { sfx('tap'); setTab(id); }}>
            <span className="ic">{ic}</span>
            {label}
            {id === 'records' && unseenSongs > 0 && <span className="dot" />}
          </button>
        ))}
      </nav>
      {tab === 'people' && <Sheet title="사람들" onClose={() => setTab('life')}><PeopleSheet s={s} /></Sheet>}
      {tab === 'band' && <Sheet title="밴드 · 실력" onClose={() => setTab('life')}><BandSheet s={s} /></Sheet>}
      {tab === 'records' && <Sheet title="디스코그래피" onClose={() => setTab('life')}><RecordsSheet s={s} /></Sheet>}
      {tab === 'chron' && <Sheet title="인생 연대기" onClose={() => setTab('life')}><ChronicleSheet s={s} /></Sheet>}
      {menu && (
        <Sheet title="설정" onClose={() => setMenu(false)}>
          <Settings onQuit={onQuit} onNewLife={onNewLife} />
        </Sheet>
      )}
    </div>
  );
}

// ───────────────────────── HUD ─────────────────────────
function Hud({ s, onMenu }: { s: GameState; onMenu: () => void }) {
  const p = s.player;
  const a = age(s);
  const st = p.stats;
  const bars: [string, number, string, boolean][] = [
    ['행복', st.happiness, 'var(--yellow)', st.happiness < 30],
    ['스트레스', st.stress, 'var(--pink)', st.stress > 75],
    ['건강', st.health, 'var(--mint)', st.health < 35],
    ['컨디션', st.energy, 'var(--sky)', st.energy < 25],
  ];
  return (
    <header className="hud">
      <div className="hud-top">
        <div className="hud-age">{a < 0 ? '태아' : `${Math.floor(a)}세`}</div>
        <div className="grow">
          <div className="hud-name">{p.name}</div>
          <div className="hud-meta">
            {year(s)}년 {half(s)} · {p.military === 'serving' ? '군 복무 중' : STAGE_LABEL[stageOf(a)]}
            {s.band ? ` · ${s.band.name}` : ''}
          </div>
        </div>
        <div className="hud-money">
          <b className={p.money < 0 ? 'neg' : ''}>{won(p.money)}</b>
          <br />팬 <b>{count(p.fans)}</b>
        </div>
        <button className="x" onClick={onMenu} aria-label="설정">⚙</button>
      </div>
      {a >= 7 && (
        <div className="stats4">
          {bars.map(([l, v, c, warn]) => (
            <div key={l} className={`stat-mini ${warn ? 'warn' : ''}`}>
              <div className="lbl">
                {l} <b>{Math.round(v)}</b>
              </div>
              <div className="bar">
                <i style={{ width: `${v}%`, background: c }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

// ───────────────────────── 장면 ─────────────────────────
function defaultScene(s: GameState): SceneId {
  const a = age(s);
  if (s.player.military === 'serving') return 'military';
  if (a < 0) return 'nursery';
  if (a < 7) return 'home';
  if (a < 13) return 'classroom';
  if (a < 19) return s.band ? 'musicroom' : 'classroom';
  if (a >= 65) return s.player.retired ? 'home' : 'stage_old';
  if (s.band) return 'studio';
  return s.flags.independent ? 'rooftop' : 'home';
}

function GameScene({ s }: { s: GameState }) {
  const a = age(s);
  const id: SceneId = s.phase === 'event' && s.active ? s.active.scene : s.phase === 'results' ? s.lastScene : defaultScene(s);
  const stageLike = id === 'club' || id === 'festival' || id === 'arena' || id === 'stage_old';
  const me: ScenePerson = {
    look: s.player.look,
    gender: s.player.gender,
    age: Math.max(0, a),
    mood: s.player.stats.happiness,
    military: s.player.military === 'serving',
    inst: stageLike && s.player.mainInst ? INST_LABEL[s.player.mainInst] : undefined,
  };
  const people: ScenePerson[] = [me];
  const ids = new Set<string>();
  if (s.phase === 'event' && s.active) for (const v of Object.values(s.active.bind)) ids.add(v);
  if ((stageLike || id === 'studio') && s.band) for (const m of s.band.memberIds) ids.add(m);
  for (const nid of ids) {
    const n = s.npcs[nid];
    if (!n || !n.alive) continue;
    people.push({ look: n.look, gender: n.gender, age: Math.max(0, s.time - n.birthYear), mood: 50 + n.affinity / 2, inst: stageLike ? INST_LABEL[n.inst] : undefined });
  }
  if (a < 0) people.length = 0;
  const audience = (s.flags.lastGigAudience as number) || 0;
  const crowd = id === 'festival' || id === 'arena' ? 1 : Math.min(1, audience / 200 + 0.1);
  const night = s.turn % 2 === 1 || id === 'rooftop';
  const caption = s.phase === 'event' && s.active ? s.active.title : undefined;
  return (
    <div className="scene-enter" key={`${id}-${s.turn}-${s.active?.id ?? ''}`}>
      <Scene id={id} people={people} crowd={crowd} night={night} seed={s.seed + s.turn} caption={caption} />
    </div>
  );
}

// ───────────────────────── 행동 선택 ─────────────────────────
function ActionPanel({ s, onChange }: { s: GameState; onChange: (s: GameState) => void }) {
  const [picks, setPicks] = useState<ActionPick[]>([]);
  const [paramFor, setParamFor] = useState<ActionDef | null>(null);
  const c = useMemo(() => new Ctx(s, new Rng(s.rng)), [s]);
  const list = useMemo(() => availableActions(c), [c]);
  const slots = actionSlots(s);
  const energyNeed = picks.reduce((acc, p) => acc + (list.find((x) => x.def.id === p.id)?.def.energy ?? 0), 0);

  const toggle = (def: ActionDef) => {
    sfx('tap');
    const has = picks.findIndex((p) => p.id === def.id);
    if (has >= 0) {
      setPicks(picks.filter((_, i) => i !== has));
      return;
    }
    if (picks.length >= slots) {
      if (slots === 1) setPicks([]);
      else return;
    }
    if (def.param) setParamFor(def);
    else setPicks((ps) => [...(slots === 1 ? [] : ps), { id: def.id }]);
  };

  const go = (ps: ActionPick[]) => {
    const next = submitActions(s, ps);
    const tones = next.lastResults.map((l) => l.tone);
    sfx(tones.includes('big') ? 'big' : tones.filter((t) => t === 'bad').length > tones.filter((t) => t === 'good').length ? 'bad' : 'good');
    if (ps.some((p) => p.id === 'gig' || p.id === 'busking') && next.flags.lastGigGrade === 'great') window.setTimeout(() => sfx('cheer'), 300);
    onChange(next);
  };

  const repeatable = s.lastActions.length > 0 && s.lastActions.every((p) => list.some((x) => x.def.id === p.id && !x.locked));

  return (
    <>
      {s.news.length > 0 && (
        <div className="news">
          {s.news.slice(0, 6).map((n, i) => (
            <span key={i} className={`chip ${n.tone ?? ''}`}>{n.text}</span>
          ))}
        </div>
      )}
      <div className="section-title">
        <h3>이번 시기에 할 일 <span className="dim">({picks.length}/{slots})</span></h3>
        <span className="energy-cost">
          컨디션 {Math.round(s.player.stats.energy)} {energyNeed > 0 && <>→ <b style={{ color: s.player.stats.energy - energyNeed < 5 ? 'var(--bad)' : 'var(--ink)' }}>{Math.round(s.player.stats.energy - energyNeed)}</b></>}
        </span>
      </div>
      <div className="actions-grid">
        {list.map(({ def, locked }) => {
          const idx = picks.findIndex((p) => p.id === def.id);
          const pick = picks[idx];
          return (
            <button key={def.id} className={`action ${idx >= 0 ? 'on' : ''} ${locked ? 'locked' : ''}`} disabled={!!locked} onClick={() => toggle(def)}>
              <span className="emo">{def.emoji}</span>
              <span className="nm">{def.label}</span>
              <span className="ds">{def.desc(c)}</span>
              {pick?.param && <span className="param">→ {paramLabel(s, def.param!, pick.param)}</span>}
              {locked && <span className="lock">🔒 {locked}</span>}
              {idx >= 0 && slots > 1 && <span className="order">{idx + 1}</span>}
            </button>
          );
        })}
      </div>
      <div className="go-bar">
        {repeatable && picks.length === 0 && (
          <button className="btn" onClick={() => go(s.lastActions)} title="지난 시기와 같은 행동">↻ 똑같이</button>
        )}
        <button className="btn primary grow" disabled={picks.length === 0} onClick={() => go(picks)}>
          {picks.length === 0 ? '할 일을 고르세요' : `${stepLabel(s)} 보내기 →`}
        </button>
      </div>
      <LateLife s={s} onChange={onChange} />
      {paramFor && (
        <ParamSheet
          s={s}
          def={paramFor}
          onCancel={() => setParamFor(null)}
          onPick={(param) => {
            setPicks((ps) => [...(slots === 1 ? [] : ps), { id: paramFor.id, param }]);
            setParamFor(null);
          }}
        />
      )}
    </>
  );
}

function LateLife({ s, onChange }: { s: GameState; onChange: (s: GameState) => void }) {
  if (s.player.retired)
    return (
      <button className="btn block" onClick={() => onChange(fastForward(s))}>
        🌅 남은 인생 조용히 흘려보내기
      </button>
    );
  if (canRetire(s))
    return (
      <button className="btn ghost small" onClick={() => onChange(retire(s))}>
        은퇴 선언하기
      </button>
    );
  return null;
}

function stepLabel(s: GameState) {
  const a = age(s);
  if (a < 13) return '1년';
  if (a < 40) return '반년';
  if (a < 65) return '1년';
  return '2년';
}

// ───────────────────────── 결과 ─────────────────────────
function Results({ s, onNext }: { s: GameState; onNext: () => void }) {
  return (
    <>
      <div className="results">
        {s.lastResults.map((l, i) => {
          const head = /^\S+ \S/.test(l.text) && i === s.lastResults.findIndex((x) => x === l) && l.tone === 'neutral' && /^[\p{Extended_Pictographic}]/u.test(l.text);
          return (
            <div key={i} className={`result-line ${head ? 'head' : l.tone ?? ''}`} style={{ animationDelay: `${i * 0.07}s` }}>
              {l.text}
            </div>
          );
        })}
      </div>
      <div className="go-bar">
        <button className="btn primary grow" onClick={() => { sfx('page'); onNext(); }}>
          계속 →
        </button>
      </div>
    </>
  );
}

// ───────────────────────── 사건 ─────────────────────────
function EventCard({ s, onChoose, onNext }: { s: GameState; onChoose: (i: number) => void; onNext: () => void }) {
  const ev = s.active!;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sfx('page');
  }, [ev.id, s.turn]);
  useEffect(() => {
    if (ev.result) {
      const tones = ev.result.lines.map((l) => l.tone);
      sfx(tones.includes('big') ? 'big' : tones.includes('bad') && !tones.includes('good') ? 'bad' : 'good');
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [ev.result]);
  const a = Math.max(0, Math.floor(age(s)));
  return (
    <div className="event card" key={`${ev.id}-${s.turn}`}>
      <div className="event-kicker">{age(s) < 0 ? 'BEFORE BIRTH' : `${year(s)} · ${a}세`}</div>
      <h2>{ev.title}</h2>
      <div className="event-text">{ev.text}</div>
      {!ev.result && (
        <div className="choices">
          {ev.choices.map((ch, i) => (
            <button key={i} className="choice" disabled={ch.disabled} onClick={() => { sfx('tap'); onChoose(i); }}>
              {ch.label}
              {ch.hint && <span className="hint">{ch.hint}</span>}
            </button>
          ))}
        </div>
      )}
      {ev.result && (
        <div ref={ref}>
          {ev.result.text && <div className="event-result">{ev.result.text}</div>}
          {ev.result.lines.length > 0 && (
            <div className="chips">
              {ev.result.lines.map((l, i) => (
                <span key={i} className={`chip ${l.tone ?? ''}`} style={{ animation: `lineIn .3s ${i * 0.05}s both` }}>
                  {l.text}
                </span>
              ))}
            </div>
          )}
          <div className="spacer" />
          <button className="btn primary block" onClick={() => { sfx('page'); onNext(); }}>
            계속 →
          </button>
        </div>
      )}
    </div>
  );
}
