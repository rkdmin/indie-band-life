// 실시간으로 흘러가는 인생 화면.
// 시계는 화면에만 있고, 엔진은 시기(period) 단위로 계산한다. 시계가 사건·연출·시기 끝에 닿으면 멈추고 엔진을 부른다.

import { genreLabel } from '../sim/data/era/genres';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeedEntry, GameState, SceneId } from '../sim/types';
import { autoChoose, beginPeriod, canRetire, choose, renameBand, endPeriod, fastForward, openEvent, popCine, proceed, reroll, resolveRoll, retire, setAutoDecide, setPlan } from '../sim/engine';
import { STAGE_LABEL, actionSlots, age, favoriteGenre, stageOf } from '../sim/state';
import { INST_LABEL, minWage } from '../sim/data/world';
import { ARTIST_SURVEY, facts, incomeBar } from '../sim/data/reality';
import { countryOf, hasMinWage } from '../sim/data/countries';
import { count, won } from '../sim/korean';
import { actionById } from '../sim/actions';
import { planOptions, recommendedPlan, togglePlan } from '../sim/plan';
import { Ctx } from '../sim/ctx';
import { Rng } from '../sim/rng';
import { PixelScene } from '../art/PixelScene';
import { Portrait } from '../art/Portrait';
import type { PixelPerson } from '../art/pixel';
import { playBgm, sfx } from '../audio/player';
import { Cinematic } from './Cinematic';
import { OddsBar } from './Odds';
import { TurntableScreen } from './Turntable';
import { Console, TapeCounter, TapeReels } from './Deck';
import { CardPick, JackpotBurst, RiskTag } from './Cards';
import { DataSheet } from './DataSheet';
import { MemberDraft } from './Draft';
import { AchievementToast, Coach, GoalsCard, StatPops, feedIcon, useAchievementToasts, useStatPops } from './Juice';
import { periodText } from '../sim/data/anachronism';
import { TRAIT_LABEL, relationLabel } from '../sim/npc';
import { Sheet } from './Sheet';
import { BandSheet, ChronicleSheet, PeopleSheet, RecordsSheet } from './Sheets';
import { Settings } from './Settings';
import { useBackButton } from '../platform';
import type { Meta } from './save';
import { npcAppearance, playerAppearance } from '../sim/appearance';
import { charmWord, heightAt } from '../sim/appearance';
import { useArmed } from './useArmed';
import { EventCut } from './EventCut';
import { BandNamer } from './BandNamer';
import { Flag } from './Flag';
import { useScrollLock } from './useScrollLock';

type Speed = 0 | 1 | 2 | 4 | 8;
type Tab = null | 'people' | 'band' | 'records' | 'chron' | 'data' | 'settings' | 'plan';

/**
 * 1배속에서 1년이 몇 초인가 — ‘약 1시간’ 설정 기준.
 * 80억분의 1 처럼 1년 ≈ 40~60초가 기본이고, 음악 인생의 핵심(10대 후반~30대)이 가장 느리다.
 * 합계 약 59분: 0~6세 25초 · 7~12세 35초 · 13~18세 50초 · 19~39세 55초 · 40~64세 45초 · 65세~ 30초.
 */
export function secPerYear(a: number) {
  if (a < 7) return 25;
  if (a < 13) return 35;
  if (a < 19) return 50;
  if (a < 40) return 55;
  if (a < 65) return 45;
  return 30;
}

export const SCENE_LABEL: Record<SceneId, string> = {
  nursery: '아기 방', home: '내 방', classroom: '교실', musicroom: '음악실', street: '밤거리', studio: '합주실',
  club: '라이브 클럽', festival: '페스티벌', arena: '아레나', recording: '녹음실', hospital: '병원', military: '부대',
  office: '사무실', rooftop: '옥상', pub: '뒤풀이 술집', stage_old: '작은 무대', airport: '공항', abroad: '해외 페스티벌',
};

const SEASON = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];

function sceneFor(s: GameState): SceneId {
  const a = age(s);
  if (a < 0) return 'nursery';
  if (a < 3) return 'nursery';
  if (a < 7) return 'home';
  if (s.player.military === 'serving') return 'military';
  return s.lastScene ?? 'home';
}

function peopleFor(s: GameState, id: SceneId, extraIds: string[] = []): PixelPerson[] {
  const a = Math.max(0, age(s));
  const stageLike = id === 'club' || id === 'festival' || id === 'arena' || id === 'stage_old' || id === 'studio' || id === 'abroad' || (id === 'musicroom' && !!s.band);
  const me: PixelPerson = {
    look: s.player.look,
    gender: s.player.gender,
    age: a,
    mood: s.player.stats.happiness,
    military: s.player.military === 'serving',
    inst: stageLike ? s.band?.playerInst ?? s.player.mainInst : null,
    app: playerAppearance({ ...s.player, country: s.player.country }),
    style: s.band?.genre ?? null,
  };
  if (age(s) < 0) return [];
  const out: PixelPerson[] = [me];
  const ids = new Set<string>(extraIds);
  if (stageLike && s.band) s.band.memberIds.forEach((m) => ids.add(m));
  for (const nid of ids) {
    const n = s.npcs[nid];
    if (!n || !n.alive) continue;
    out.push({ look: n.look, gender: n.gender, age: Math.max(0, s.time - n.birthYear), mood: 50 + n.affinity / 2, inst: stageLike ? n.inst : null, app: npcAppearance(n, s.player.country), style: n.inBand ? s.band?.genre ?? n.genre : n.career === 'musician' ? n.genre : null });
  }
  return out;
}

interface Props {
  state: GameState;
  onChange: (s: GameState) => void;
  meta: Meta;
  onQuit: () => void;
  onNewLife: () => void;
}

export function Life({ state: s, onChange, onQuit, onNewLife }: Props) {
  const [speed, setSpeed] = useState<Speed>(1);
  const [skipping, setSkipping] = useState(false);
  const lastSpeed = useRef<Speed>(1);
  const [tab, setTab] = useState<Tab>(null);
  const [coach, setCoach] = useState(() => {
    try {
      return localStorage.getItem('ibl.coach') !== '1';
    } catch {
      return false;
    }
  });
  const closeCoach = () => {
    setCoach(false);
    try {
      localStorage.setItem('ibl.coach', '1');
    } catch {
      /* 무시 */
    }
  };
  const [clock, setClock] = useState(() => s.time);
  const clockRef = useRef(s.time);
  const stRef = useRef(s);
  stRef.current = s;
  // 이어하기로 시기 중간에 들어오면 이미 쌓인 사건을 곧바로 연다
  const nextEvRef = useRef<number>(s.phase === 'running' && s.queue.length ? s.time + 0.02 : Infinity);
  const pace = (s.flags.pace as number) || 1;

  const commit = useCallback(
    (n: GameState) => {
      stRef.current = n;
      onChange(n);
    },
    [onChange],
  );

  // 겹쳐 있는 화면이 있으면 시간은 멈춘다
  const cineDue = s.cine.length > 0 && s.cine[0].at <= clock + 1e-6;
  const overlay = !!tab || s.phase === 'event' || cineDue || coach;
  const paused = speed === 0 && !skipping;

  // ── 시계 루프 ──
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      let st = stRef.current;
      if (st.phase === 'ending') return;
      if (overlay) return;
      if (st.phase === 'plan') {
        st = beginPeriod(st);
        const step = st.periodEnd - st.time;
        nextEvRef.current = st.queue.length ? st.time + Math.min(step * (0.3 + Math.random() * 0.25), 0.15 + Math.random() * 0.25) : Infinity;
        clockRef.current = st.time;
        commit(st);
        return;
      }
      if (st.phase !== 'running' || paused) {
        if (now - lastPaint > 250) { lastPaint = now; setClock(clockRef.current); }
        return;
      }
      const mul = skipping ? 40 : speed;
      const rate = mul / (secPerYear(clockRef.current - st.player.birthYear) * pace);
      const target = clockRef.current + dt * rate;
      const cineAt = st.cine.length ? st.cine[0].at : Infinity;
      const evAt = st.queue.length ? Math.max(nextEvRef.current, st.time) : Infinity;
      const stop = Math.min(cineAt, evAt, st.periodEnd);
      if (target >= stop) {
        clockRef.current = Math.max(clockRef.current, stop);
        if (cineAt <= stop) {
          setSkipping(false);
        } else if (evAt <= stop) {
          const opened = openEvent(st, clockRef.current);
          if (opened.phase === 'event') setSkipping(false);
          else nextEvRef.current = clockRef.current + 0.02;
          commit(opened);
        } else {
          clockRef.current = st.periodEnd;
          commit(endPeriod(st));
        }
        setClock(clockRef.current);
        return;
      }
      clockRef.current = target;
      if (now - lastPaint > 90) {
        lastPaint = now;
        setClock(target);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [overlay, paused, speed, skipping, pace, commit]);

  // 다른 시기로 넘어가면 시계 보정
  useEffect(() => {
    if (clockRef.current < s.time) {
      clockRef.current = s.time;
      setClock(s.time);
    }
  }, [s.time]);

  // 시기별 배경음 (연출 중에는 연출이 음악을 맡는다)
  const a = Math.max(-0.5, clock - s.player.birthYear);
  const stage = stageOf(a);
  useEffect(() => {
    const g = s.band?.genre ?? favoriteGenre(s);
    const mood = stage === 'baby' || stage === 'prenatal' ? 'calm' : stage === 'senior' ? 'wistful' : stage === 'elem' ? 'bright' : 'dreamy';
    playBgm(`${stage}-${g}`, a < 7 ? 'folk' : g, mood, s.seed + stage.length * 97);
  }, [stage, s.band?.genre]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 사건 처리 ──
  const ev = s.phase === 'event' ? s.active : null;
  const onChoose = (i: number) => commit(choose(stRef.current, i));
  const onProceed = () => {
    const st = proceed(stRef.current);
    nextEvRef.current = clockRef.current + Math.max(0.03, (st.periodEnd - st.time) * 0.18);
    commit(st);
  };
  // 자동 결정
  useEffect(() => {
    if (!ev || !s.autoDecide || ev.pending) return;
    if (!ev.result) {
      const id = window.setTimeout(() => commit(autoChoose(stRef.current)), ev.big ? 3800 : 700);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(onProceed, ev.big ? 3400 : 1900);
    return () => window.clearTimeout(id);
  }, [ev?.id, ev?.result, s.autoDecide]); // eslint-disable-line react-hooks/exhaustive-deps

  useBackButton(() => setTab(null), !!tab);
  const pops = useStatPops(s);
  const ach = useAchievementToasts(s);

  // ── 화면 계산 ──
  const sceneId = sceneFor(s);
  const people = useMemo(() => peopleFor(s, sceneId), [s, sceneId]);
  const month = Math.min(12, Math.floor((clock - Math.floor(clock)) * 12) + 1);
  const yearFrac = clock - Math.floor(clock);
  const visible = useMemo(() => s.feed.filter((e) => e.t <= clock + 1e-6), [s.feed, clock]);

  const cine = cineDue ? s.cine[0] : null;
  const cineSong = cine?.songId ? s.songs.find((x) => x.id === cine.songId) : undefined;

  return (
    <div className="life">
      <header className="topbar">
        <div className="topbar-row">
          <div>
            <div className="brand">인디밴드 <em>키우기</em></div>
            <div className="agebig">
              {a < 0 ? '태아' : <TapeCounter value={a} />}
              {a >= 0 && <small>세</small>}
            </div>
          </div>
          <TapeReels s={s} clock={clock} playing={!paused && s.phase === 'running'} />
          <div className="datebar">
            {Math.floor(clock)}년 {month}월 · {SEASON[month - 1]}
            <br />
            {s.player.military === 'serving' ? '군 복무 중' : s.flags.hobby ? '취미로 음악' : STAGE_LABEL[stage]}
            {s.band ? ` · 〈${s.band.name}〉` : ''}
          </div>
          <div className="speed" role="group" aria-label="배속">
            <button className={speed === 0 && !skipping ? 'on' : ''} onClick={() => { setSpeed(0); setSkipping(false); }} aria-label="일시정지" title="일시정지">❚❚</button>
            {([1, 2, 4, 8] as Speed[]).map((x) => (
              <button key={x} className={speed === x && !skipping ? 'on' : ''} onClick={() => { setSpeed(x); setSkipping(false); sfx('tap'); }}>
                {x}×
              </button>
            ))}
            <button className={skipping ? 'on' : ''} onClick={() => { setSkipping(true); if (speed === 0) setSpeed(1); }} title="다음 갈림길까지 빨리 감기">
              ▸▸ 다음 결정
            </button>
          </div>
          {/* 휴대폰: 한 줄짜리 큰 버튼 */}
          <div className="speed-m" role="group" aria-label="시간 조절">
            <button className={paused ? 'on' : ''} onClick={() => { if (paused) setSpeed(lastSpeed.current); else { lastSpeed.current = speed || 1; setSpeed(0); setSkipping(false); } sfx('tap'); }} aria-label={paused ? '재생' : '일시정지'} title={paused ? '재생' : '일시정지'}>
              {paused ? '▶' : '❚❚'}
            </button>
            <button onClick={() => { const order: Speed[] = [1, 2, 4, 8]; const nx = order[(order.indexOf(speed === 0 ? lastSpeed.current : speed) + 1) % order.length]; setSpeed(nx); lastSpeed.current = nx; setSkipping(false); sfx('tap'); }} aria-label="배속 바꾸기" title="배속 바꾸기">
              {speed === 0 ? lastSpeed.current : speed}×
            </button>
            <button className={skipping ? 'on' : ''} onClick={() => { setSkipping(true); if (speed === 0) setSpeed(lastSpeed.current); }} aria-label="다음 결정까지 빨리 감기" title="다음 결정까지 빨리 감기">
              ▸▸
            </button>
            <button className={s.autoDecide ? 'on' : ''} onClick={() => commit(setAutoDecide(stRef.current, !s.autoDecide))} aria-label="자동 결정" title="고민 없이 자동으로 고른다">
              자동
            </button>
            <button onClick={() => setTab('settings')} aria-label="설정" title="설정">⚙</button>
          </div>
        </div>
        <div className="yearprog" aria-hidden>
          <i style={{ width: `${yearFrac * 100}%` }} />
        </div>
        <div className="toolrow desk-only">
          <button className={`tool ${s.autoDecide ? 'on' : ''}`} onClick={() => commit(setAutoDecide(stRef.current, !s.autoDecide))}>
            {s.autoDecide ? '✓ 자동 결정 중' : '자동 결정'}
          </button>
          <button className="tool" onClick={() => setTab('settings')}>설정</button>
        </div>
      </header>

      <div className="life-grid">
        <div className="life-left">
          <div className="idcard-wrap"><IdCard s={s} clock={clock} /></div>
          {a >= 6 && <div className="goals-wrap"><GoalsCard s={s} /></div>}
          <div className="plan-wrap"><PlanCard s={s} onEdit={() => setTab('plan')} onChange={commit} /></div>
          {a >= 15 && <div className="reality-wrap"><RealityCard s={s} clock={clock} /></div>}
          <nav className="tabs" aria-label="기록">
            <button className={`mobile-only ${tab === 'plan' ? 'on' : ''}`} aria-pressed={tab === 'plan'} onClick={() => setTab('plan')}>계획</button>
            <button className={tab === 'people' ? 'on' : ''} aria-pressed={tab === 'people'} onClick={() => setTab('people')}>사람<span className="n">{Object.keys(s.npcs).length}</span></button>
            <button className={tab === 'band' ? 'on' : ''} aria-pressed={tab === 'band'} onClick={() => setTab('band')}>밴드</button>
            <button className={tab === 'records' ? 'on' : ''} aria-pressed={tab === 'records'} onClick={() => setTab('records')}>음반<span className="n">{s.songs.length}</span></button>
            <button className={tab === 'chron' ? 'on' : ''} aria-pressed={tab === 'chron'} onClick={() => setTab('chron')}>연대기</button>
            <button className={tab === 'data' ? 'on' : ''} aria-pressed={tab === 'data'} onClick={() => setTab('data')}>데이터</button>
          </nav>
        </div>
        <div className="life-right">
          <div className="stage">
            <div className="stage-view"><PixelScene id={sceneId} people={people} crowd={Math.min(1, ((s.flags.lastGigAudience as number) || 40) / 300)} night={month >= 9 || month <= 2 || sceneId === 'rooftop'} seed={s.seed + s.turn} label={SCENE_LABEL[sceneId]} /></div>
            <div className="stage-cap">
              <span><b>{SCENE_LABEL[sceneId]}</b> · {SEASON[month - 1]}</span>
              <span className="dim"><Flag c={countryOf(s.player.country).id} size={11} /> {periodText(countryOf(s.player.country).regions[s.player.region], s.time, s.player.country)}</span>
            </div>
          </div>
          <div className="pops-anchor"><StatPops pops={pops} /></div>
          <Console s={s} />
          <Feed entries={visible} birthYear={s.player.birthYear} paused={paused} />
        </div>
      </div>

      {!coach && ev && isDraft(ev.id) && !ev.result && !ev.pending && <MemberDraft s={s} onChoose={onChoose} cut={<EventCut ev={ev} scene={ev.scene} label={SCENE_LABEL[ev.scene]} people={peopleFor(s, ev.scene, Object.values(ev.bind))} night seed={s.seed + Math.round(ev.at * 12)} onDone={() => undefined} />} />}
      {!coach && ev && ev.cards && !ev.result && !ev.pending && <CardPick s={s} onChoose={onChoose} cut={<EventCut ev={ev} scene={ev.scene} label={SCENE_LABEL[ev.scene]} people={peopleFor(s, ev.scene, Object.values(ev.bind))} night={false} seed={s.seed + Math.round(ev.at * 12)} onDone={() => undefined} />} />}
      {!coach && ev && !ev.big && !(isDraft(ev.id) && !ev.result) && !(ev.cards && !ev.result) && <Fork s={s} onChoose={onChoose} onNext={onProceed} onAuto={() => commit(setAutoDecide(stRef.current, true))} onRename={(n) => commit(renameBand(stRef.current, n))} />}
      {!coach && ev && ev.big && (
        <Cinematic
          key={`${ev.id}-${ev.at}`}
          scene={ev.scene}
          people={peopleFor(s, ev.scene, Object.values(ev.bind))}
          seed={s.seed + s.turn}
          kicker={`${Math.floor(ev.at)} · ${Math.max(0, Math.floor(ev.at - s.player.birthYear))}세`}
          title={ev.title}
          sub={ev.text}
        >
          <EventChoices s={s} onChoose={onChoose} onNext={onProceed} dark />
        </Cinematic>
      )}
      {!coach && ev?.pending && (
        <TurntableScreen
          key={`${ev.id}-${ev.pending.rerolled ? 'r' : 'f'}`}
          pending={ev.pending}
          inspiration={s.player.inspiration}
          auto={s.autoDecide}
          onReroll={() => commit(reroll(stRef.current))}
          onAccept={() => commit(resolveRoll(stRef.current))}
        />
      )}
      {!coach && !ev && cine && (
        <Cinematic
          key={`${cine.kind}-${cine.at}-${cine.title}`}
          scene={cine.scene}
          people={peopleFor(s, cine.scene)}
          crowd={cine.kind === 'release' ? 0.4 : 1}
          seed={s.seed + s.turn + 5}
          kicker={cine.kicker}
          title={periodText(cine.title, cine.at, s.player.country)}
          sub={cine.sub && periodText(cine.sub, cine.at, s.player.country)}
          song={cineSong ? { ...cineSong, title: cineSong.title } : undefined}
          onDone={() => commit(popCine(stRef.current))}
          autoCloseMs={s.autoDecide ? 6500 : undefined}
        />
      )}

      {coach && <Coach onDone={closeCoach} />}
      {ach && !ev && <AchievementToast id={ach.id} />}
      {tab === 'plan' && (
        <PlanSheet
          s={s}
          onClose={() => setTab(null)}
          onSave={(picks, auto) => {
            commit(setPlan(stRef.current, picks, auto));
            setTab(null);
          }}
        />
      )}
      {tab === 'people' && <Sheet title="사람들" onClose={() => setTab(null)}><PeopleSheet s={s} /></Sheet>}
      {tab === 'band' && <Sheet title="밴드 · 실력" onClose={() => setTab(null)}><BandSheet s={s} onRename={(n) => commit(renameBand(stRef.current, n))} /></Sheet>}
      {tab === 'records' && <Sheet title="디스코그래피" onClose={() => setTab(null)}><RecordsSheet s={s} /></Sheet>}
      {tab === 'chron' && <Sheet title="연대기 · 음악사" onClose={() => setTab(null)}><ChronicleSheet s={s} /></Sheet>}
      {tab === 'data' && <Sheet title="데이터로 본 내 인생" onClose={() => setTab(null)}><DataSheet s={s} /></Sheet>}
      {tab === 'settings' && (
        <Sheet title="설정" onClose={() => setTab(null)}>
          <PaceSetting s={s} onChange={commit} />
          {canRetire(s) && <button className="btn block" onClick={() => { commit(retire(stRef.current)); setTab(null); }}>은퇴 선언하기</button>}
          {s.player.retired && <button className="btn block" onClick={() => { commit(fastForward(stRef.current)); setTab(null); }}>남은 인생 조용히 흘려보내기</button>}
          <Settings onQuit={onQuit} onNewLife={onNewLife} />
        </Sheet>
      )}
    </div>
  );
}

// ───────────────────────── 신분증 ─────────────────────────
function IdCard({ s, clock }: { s: GameState; clock: number }) {
  const p = s.player;
  const a = Math.max(0, clock - p.birthYear);
  const st = p.stats;
  const stats: [string, number, string, boolean][] = [
    ['건강', st.health, 'var(--green)', st.health < 35],
    ['행복', st.happiness, 'var(--gold)', st.happiness < 30],
    ['스트레스', st.stress, 'var(--bad)', st.stress > 75],
    ['컨디션', st.energy, 'var(--blue)', st.energy < 25],
  ];
  const mrz = `IBL<${({ KR: 'KOR', JP: 'JPN', US: 'USA', UK: 'GBR', DE: 'DEU', BR: 'BRA' } as Record<string, string>)[p.country ?? 'KR'] ?? 'KOR'}<${p.name.length}${p.birthYear}<<${(p.mainInst ?? 'NONE').toUpperCase()}<<${s.band ? s.band.genre.toUpperCase() : 'SOLO'}<<<${String(s.seed).slice(0, 6)}`;
  return (
    <div className="card idcard">
      <div className="idcard-head">
        <span>BACKSTAGE PASS</span>
        <span>ARTIST · {Math.floor(clock)}</span>
      </div>
      <div className="idcard-body">
        <div className="portrait">
          <Portrait person={{ look: p.look, gender: p.gender, age: a, mood: st.happiness, military: p.military === 'serving', app: playerAppearance({ ...p, country: p.country }), style: s.band?.genre ?? null }} />
        </div>
        <div>
          <div className="idname">{p.name}</div>
          <dl className="idfields">
            <dt>출생</dt><dd>{p.birthYear} · <Flag c={countryOf(p.country).id} size={11} /> {periodText(countryOf(p.country).regions[p.region], p.birthYear, p.country)}</dd>
            <dt>외모</dt><dd>{heightAt(playerAppearance({ ...p, country: p.country }), a, p.gender)}cm · {charmWord(playerAppearance({ ...p, country: p.country }).charm)}</dd>
            {a >= 18 && <><dt>직업</dt><dd>{String(s.flags.jobTitle ?? JOB_LABEL[p.job] ?? '—')}</dd></>}
            <dt>악기</dt><dd>{p.mainInst ? `${INST_LABEL[p.mainInst]} ${Math.round(p.skills[p.mainInst])}` : '아직 없음'}</dd>
            <dt>작곡</dt><dd>{Math.round(p.skills.compose)}</dd>
            <dt>밴드</dt><dd>{s.band ? `〈${s.band.name}〉 ${genreLabel(s.band.genre, s.time, s.player.country)}` : '—'}</dd>
            {p.traits?.length > 0 && <><dt>성격</dt><dd>{p.traits.map((t) => TRAIT_LABEL[t]).join(' · ')}</dd></>}
          </dl>
        </div>
      </div>
      <div style={{ padding: '0 12px 12px' }}>
        <div className="stats">
          {stats.map(([l, v, c, warn]) => (
            <div key={l} className={`stat ${warn ? 'warn' : ''}`}>
              <span>{l}</span>
              <div className="bar"><i style={{ width: `${v}%`, background: c }} /></div>
              <b>{Math.round(v)}</b>
            </div>
          ))}
        </div>
        <div className="money-row">
          <div><div className="k">통장</div><div className={`v ${p.money < 0 ? 'neg' : ''}`}>{won(p.money)}</div></div>
          <div><div className="k">팬 (국내{p.globalFans > 0 ? ' · 해외' : ''})</div><div className="v">{count(p.fans)}{p.globalFans > 0 && <span style={{ fontSize: 14 }}> · ✈ {count(p.globalFans)}</span>}</div></div>
          {p.debt > 0 && <div><div className="k">빚 (연 {(p.debtRate * 100).toFixed(1)}%)</div><div className="v neg">{won(p.debt)}</div></div>}
          <div><div className="k">영감</div><div className="v" style={{ color: 'var(--gold-ink)' }}>{'✦'.repeat(p.inspiration) || '—'}</div></div>
        </div>
      </div>
      <div className="mrz">{mrz}</div>
    </div>
  );
}

// ───────────────────────── 생활 계획 ─────────────────────────
function PlanCard({ s, onEdit }: { s: GameState; onEdit: () => void; onChange: (s: GameState) => void }) {
  const slots = actionSlots(s);
  const picks = s.autoPlan || !s.plan.length ? recommendedPlan(s) : s.plan;
  const a = age(s);
  return (
    <div className="card">
      <div className="section-title">
        <h3>생활 계획</h3>
        {slots > 0 && <button className="linkbtn" onClick={onEdit}>바꾸기</button>}
      </div>
      {slots === 0 ? (
        <div className="focus-note" style={{ marginTop: 6 }}>{a < 0 ? '아직 세상에 나오기 전.' : '아직은 어려서, 부모님 품에서 자라는 중.'}</div>
      ) : (
        <>
          <div className="plan-chips">
            {s.autoPlan && <span className="plan-chip" style={{ borderStyle: 'dashed' }}>알아서</span>}
            {picks.map((p) => {
              const d = actionById(p.id);
              return d ? <span key={p.id} className="plan-chip">{d.label}</span> : null;
            })}
          </div>
          <div className="dim">시간이 흐르는 동안 이 계획대로 산다. 언제든 바꿀 수 있다.</div>
        </>
      )}
    </div>
  );
}

function PlanSheet({ s, onClose, onSave }: { s: GameState; onClose: () => void; onSave: (p: { id: string }[], auto: boolean) => void }) {
  const slots = actionSlots(s);
  const opts = planOptions(s);
  const c = useMemo(() => new Ctx(s, new Rng(1)), [s]);
  const [auto, setAuto] = useState(s.autoPlan);
  // 지금 고를 수 있는 것만 — 예전 계획에 지금은 잠긴 활동이 남아 있으면 뺀다
  const open = new Set(opts.filter((o) => !o.locked).map((o) => o.def.id));
  const [sel, setSel] = useState<string[]>(() => (s.autoPlan ? [] : s.plan.map((p) => p.id).filter((id) => open.has(id)).slice(0, slots)));
  const [full, setFull] = useState(false);
  // ‘알아서’에서 처음 고르면 새로 시작한다 (추천 목록이 몰래 남아 두 개가 같이 켜지던 문제)
  // 칸이 다 찼으면 몰래 바꾸지 않고, 하나를 먼저 빼 달라고 알려 준다
  const toggle = (id: string) => {
    const next = togglePlan({ auto, sel }, id, slots);
    setAuto(next.auto);
    setSel(next.sel);
    setFull(next.full);
  };
  return (
    <Sheet title="생활 계획" onClose={onClose}>
      <div className="dim">한 번에 {slots}가지에 집중할 수 있다 — {auto ? '지금은 알아서 산다' : `${sel.length}/${slots} 골랐다`}. 정해 두면 바꿀 때까지 계속 그렇게 산다.</div>
      {full && <div className="plan-full">🔒 {slots}가지까지만 — 하나를 먼저 빼고 고르세요</div>}
      <button className={`pick ${auto ? 'on' : ''}`} onClick={() => { setAuto(true); setSel([]); setFull(false); }}>
        알아서 살기
        <small>나이·돈·컨디션에 맞춰 그때그때 정한다</small>
      </button>
      <div className="picker-grid">
        {opts.map(({ def, locked }) => (
          <button key={def.id} className={`pick ${!auto && sel.includes(def.id) ? 'on' : ''}`} disabled={!!locked} aria-pressed={!auto && sel.includes(def.id)} onClick={() => toggle(def.id)}>
            {!auto && sel.includes(def.id) && <span className="pick-n">{sel.indexOf(def.id) + 1}</span>}
            {periodText(def.label, s.time, s.player.country)}
            <small>{periodText(locked ? `🔒 ${locked}` : def.desc(c), s.time, s.player.country)}</small>
          </button>
        ))}
      </div>
      <button className="btn primary block" disabled={!auto && sel.length === 0} onClick={() => onSave(sel.map((id) => ({ id })), auto)}>
        이렇게 살기
      </button>
    </Sheet>
  );
}

function PaceSetting({ s, onChange }: { s: GameState; onChange: (s: GameState) => void }) {
  const pace = (s.flags.pace as number) || 1;
  const set = (v: number) => onChange({ ...s, flags: { ...s.flags, pace: v } });
  return (
    <div>
      <span className="label">한 번의 인생 길이</span>
      <div className="seg" style={{ marginTop: 6 }}>
        {([[0.5, '약 30분'], [1, '약 1시간'], [1.5, '약 1시간 30분']] as [number, string][]).map(([v, l]) => (
          <button key={v} className={pace === v ? 'on' : ''} onClick={() => set(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── 인생 기록 ─────────────────────────
function Feed({ entries, birthYear, paused }: { entries: FeedEntry[]; birthYear: number; paused: boolean }) {
  const rows = useMemo(() => {
    const list = entries.slice(-160).reverse();
    const out: ({ head: string } | (FeedEntry & { key: string }))[] = [];
    const seen = new Map<string, number>();
    let lastAge = Infinity;
    for (const e of list) {
      const ag = Math.max(0, Math.floor(e.t - birthYear));
      if (ag !== lastAge) {
        out.push({ head: `${ag}세 · ${Math.floor(e.t)}` });
        lastAge = ag;
      }
      // 같은 시각·같은 문장이 두 번 나올 수 있다 — 순번을 붙여 키를 고정한다
      const base = `${e.t}-${e.kind ?? ''}-${e.text}-${e.deltas ?? ''}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      out.push({ ...e, key: n ? `${base}#${n}` : base });
    }
    return out;
  }, [entries, birthYear]);
  return (
    <div className="card feed">
      <div className="feed-head">
        <h3>인생 기록</h3>
        <span className="dim">{paused ? '❚❚ 멈춤' : '최근 순'}</span>
      </div>
      <div className="feed-list">
        {rows.map((r, i) =>
          'head' in r ? (
            <div key={`h${r.head}`} className="entry yearhead"><span data-side={parseInt(r.head, 10) < 40 ? 'A' : 'B'}>{r.head}</span></div>
          ) : (
            <div key={r.key} className={`entry ${r.tone} ${r.kind ?? ''}`}>
              <span className="when">{Math.min(12, Math.floor((r.t - Math.floor(r.t)) * 12) + 1)}월</span>
              <span className="what">
                <span className="ico" aria-hidden>{feedIcon(r)}</span>
                {r.text}
                {r.deltas && <span className={`deltas${r.text ? '' : ' solo'}`}>{r.deltas}</span>}
              </span>
            </div>
          ),
        )}
        {!rows.length && <div className="entry"><span /><span className="what flavor">이야기는 이제 막 시작됐다.</span></div>}
      </div>
    </div>
  );
}

// ───────────────────────── 갈림길 ─────────────────────────
function EventChoices({ s, onChoose, onNext, dark }: { s: GameState; onChoose: (i: number) => void; onNext: () => void; dark?: boolean }) {
  const ev = s.active!;
  const res = ev.result;
  const deltas = res?.lines.filter((l) => l.delta).map((l) => l.text).join(' · ');
  const bigs = res?.lines.filter((l) => !l.delta && l.tone === 'big').map((l) => l.text) ?? [];
  // ‘운에 맡겼다’ 줄은 결과보다 먼저 — 무엇이 골라졌는지부터 보여 준다
  const picked = bigs.filter((t) => t.startsWith('🎲'));
  const notes = bigs.filter((t) => !t.startsWith('🎲'));
  useEffect(() => {
    if (!res) return;
    const tones = res.lines.map((l) => l.tone);
    sfx(tones.includes('big') ? 'good' : tones.includes('bad') && !tones.includes('good') ? 'bad' : 'good');
  }, [res]);
  // 새 사건·결과가 뜬 직후의 탭은 무시한다 (선택지를 누른 손가락이 ‘계속’까지 누르지 않게)
  const armedPick = useArmed(ev.id, 250);
  const armedNext = useArmed(res, 450);
  // 키보드: 숫자로 고르고, 결과가 나오면 Enter·Space 로 계속 (데스크톱)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (!res) {
        if (!armedPick) return;
        const visible = (ev.order ?? ev.choices.map((_, i) => i)).filter((i) => !ev.choices[i].hidden);
        const n = Number(e.key);
        if (n >= 1 && n <= visible.length && !ev.choices[visible[n - 1]].disabled) { e.preventDefault(); sfx('tap'); onChoose(visible[n - 1]); }
        else if (e.key === '?' && ev.wild) { e.preventDefault(); sfx('tap'); onChoose(ev.choices.length); }
      } else if ((e.key === 'Enter' || e.key === ' ') && armedNext) {
        e.preventDefault(); sfx('page'); onNext();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ev, res, armedPick, armedNext, onChoose, onNext]);
  const resRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (res) resRef.current?.scrollIntoView({ block: 'nearest' });
  }, [res]);
  // 주사위가 굴러가는 동안에는 결과 문장을 잠깐 숨긴다
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!res) return setRevealed(false);
    const id = window.setTimeout(() => setRevealed(true), 0);
    return () => window.clearTimeout(id);
  }, [res]);
  if (!res)
    return (
      <div className="choices">
        {(ev.order ?? ev.choices.map((_, i) => i)).map((i, pos) => { const ch = ev.choices[i]; return ch.hidden ? null : (
          <button key={`${ev.id}:${i}`} className="choice" disabled={ch.disabled} onClick={(e) => { e.stopPropagation(); if (!armedPick) return; sfx('tap'); onChoose(i); }}>
            <span className="num">{pos + 1}</span>
            <span>
              <RiskTag risk={ch.risk} />
              {ch.odds && <span className="checktag">[{ch.odds.ability} · 난이도 {ch.odds.dc}]</span>}
              {ch.label}
              {ch.hint && <span className="hint">{ch.hint}</span>}
              {ch.lock && <span className="lock">🔒 {ch.lock}</span>}
              {!ch.lock && ch.why && <span className="why">{ch.why}</span>}
              {ch.range && !ch.lock && <span className="hint range">{ch.range}</span>}
              {ch.odds && <OddsBar o={ch.odds} />}
            </span>
          </button>
        ); })}
        {ev.wild && (
          <button key={`${ev.id}:wild`} className="choice wild" onClick={(e) => { e.stopPropagation(); if (!armedPick) return; sfx('tap'); onChoose(ev.choices.length); }}>
            <span className="num">?</span>
            <span>🎲 운에 맡긴다 <span className="hint">위 선택지 중 하나가 무작위로 · 영감 +1</span></span>
          </button>
        )}
      </div>
    );
  return (
    <div ref={resRef}>
      {ev.picked !== undefined && ev.choices[ev.picked] && <div className="picked-line"><span>고른 것</span><b>{ev.choices[ev.picked].label}</b></div>}
      {revealed && res.jackpot && <JackpotBurst j={res.jackpot} />}
      {revealed && !!(res.text || notes.length || picked.length) && (
        <div className="fork-result">
          {picked.length ? `${picked.join('\n')}\n` : ''}
          {res.text}
          {notes.length ? `${res.text ? '\n' : ''}${notes.join('\n')}` : ''}
        </div>
      )}
      {revealed && deltas && <div className="deltas-line">{deltas}</div>}
      <div className={dark ? 'cine-next' : ''} style={{ marginTop: 14, opacity: revealed ? 1 : 0.3 }}>
        <button className="btn primary" onClick={(e) => { e.stopPropagation(); if (!armedNext) return; sfx('page'); onNext(); }}>
          계속 살기 →
        </button>
      </div>
    </div>
  );
}

function Fork({ s, onChoose, onNext, onAuto, onRename }: { s: GameState; onChoose: (i: number) => void; onNext: () => void; onAuto: () => void; onRename: (name: string) => void }) {
  const ev = s.active!;
  useScrollLock();
  useEffect(() => sfx('page'), [ev.id]);
  const a = Math.max(0, Math.floor(ev.at - s.player.birthYear));
  const m = Math.min(12, Math.floor((ev.at - Math.floor(ev.at)) * 12) + 1);
  // 사건마다 짧은 컷신 — 끝나면(또는 탭하면) 선택지가 열린다. 자동 결정 중이면 건너뛴다
  const people = useMemo(() => peopleFor(s, ev.scene, Object.values(ev.bind)), [ev.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cutFor, setCutFor] = useState<string | null>(null);
  const key = `${ev.id}:${ev.at}`;
  const ready = cutFor === key || !!ev.result || s.autoDecide;
  return (
    <div className="modal-back">
      <div className="fork" role="dialog" aria-modal="true" aria-label={ev.title}>
        <EventCut ev={ev} scene={ev.scene} label={SCENE_LABEL[ev.scene]} people={people} night={m >= 10 || m <= 2 || ev.scene === 'club' || ev.scene === 'pub'} seed={s.seed + Math.round(ev.at * 12)} onDone={() => setCutFor(key)} />
        <div className="fork-head">
          <span className="k">갈림길</span>
          <span>{a}세 · {Math.floor(ev.at)}년 {m}월</span>
        </div>
        <div className="fork-body">
          <WhoBar s={s} />
          <h2>{ev.title}</h2>
          <div className="text">{ev.text}</div>
          {ready && ev.id === 'name_band' && !ev.result && s.band ? <BandNamer current={s.band.name} seed={s.seed + s.turn} onConfirm={(n) => { onRename(n); onChoose(0); }} /> : ready ? <EventChoices s={s} onChoose={onChoose} onNext={onNext} /> : <div className="choices-wait" aria-hidden><i /><i /><i /></div>}
        </div>
        {!ev.result && !s.autoDecide && (
          <div className="fork-foot">
            <span className="dim">고민될 땐 맡겨도 된다.</span>
            <button className="linkbtn" onClick={onAuto}>이제부터 결정을 자동으로 맡기기</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── 현실 체크 ─────────────────────────
function RealityCard({ s, clock }: { s: GameState; clock: number }) {
  const [open, setOpen] = useState(false);
  const L = s.ledger ?? { music: 0, cost: 0, other: 0 };
  const net = L.music - L.cost;
  const yr = Math.floor(clock);
  const bar = incomeBar(s.player.country, yr);
  const avg = bar.value;
  const kr = (s.player.country ?? 'KR') === 'KR';
  const last = s.ledgers?.[s.ledgers.length - 1];
  return (
    <div className="card reality">
      <div className="section-title">
        <h3>현실 체크</h3>
        <button className="linkbtn" onClick={() => setOpen(!open)}>{open ? '닫기' : '출처와 숫자'}</button>
      </div>
      <div className="real-row">
        <span>올해 음악 순수입</span>
        <b className={net < 0 ? 'neg' : ''}>{won(net)}</b>
      </div>
      <div className="bar" style={{ margin: '4px 0 2px' }}>
        <i style={{ width: `${Math.max(0, Math.min(100, (net / avg) * 100))}%`, background: 'var(--red)' }} />
      </div>
      <div className="dim">{bar.label} {won(avg)}{kr ? ' · 2024 예술인 실태조사' : ''}</div>
      {last && (
        <div className="real-last">
          {last.year}년: 음악 {won(last.music - last.cost)} · 다른 일 {won(last.other)}
          {last.other > last.music ? ' — 음악만으론 못 산다' : last.music - last.cost > 0 ? ' — 음악이 생계였다' : ''}
        </div>
      )}
      <div className="dim" style={{ marginTop: 4 }}>{kr ? `예술인 ${Math.round(ARTIST_SURVEY.sideJobRate * 1000) / 10}%가 다른 일을 겸한다. ` : ''}{hasMinWage(countryOf(s.player.country), yr) ? '최저시급' : '알바 시급(추정)'} {Math.round(minWage(yr) * countryOf(s.player.country).wageMul).toLocaleString()}원.</div>
      {open && (
        <ul className="facts">
          {(kr ? facts(yr, minWage(yr)) : [{ id: 'bar', label: bar.label, value: won(avg), src: bar.src, kind: bar.kind }]).map((f) => (
            <li key={f.id}>
              <span className={`src src-${f.kind}`}>{f.kind}</span> {f.label}: <b>{f.value}</b>
              <div className="dim">{f.src}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── 휴대폰용 한 줄 상태 ─────────────────────────
/** 사건에 얽힌 사람들 — 대화 상대의 얼굴을 보여 준다 */
function WhoBar({ s }: { s: GameState }) {
  const ev = s.active!;
  const ppl = [...new Set(Object.values(ev.bind))].map((id) => s.npcs[id]).filter(Boolean).slice(0, 3);
  if (!ppl.length) return null;
  return (
    <div className="who">
      {ppl.map((n) => (
        <div key={n.id} className="who-p">
          <div className="who-face">
            <Portrait person={{ look: n.look, gender: n.gender, age: Math.max(0, s.time - n.birthYear), mood: 50 + n.affinity / 2, app: npcAppearance(n, s.player.country), style: n.inBand ? s.band?.genre ?? n.genre : null }} />
          </div>
          <div>
            <b>{n.name}</b>
            <span>{relationLabel(n, s.player)} · 친밀도 {Math.round(n.affinity)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const JOB_LABEL: Record<string, string> = { none: '음악만', part: '아르바이트', office: '회사원', teacher: '음악 강사', producer: '프로듀서', session: '세션 연주자', owner: '가게 사장' };

const isDraft = (id: string) => id === 'pick_member' || id === 'member_walkin';
