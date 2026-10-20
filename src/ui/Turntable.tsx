// 판정 화면 — LP 턴테이블에 바늘을 떨어뜨린다.
// 레코드에는 1~20번 트랙이 원처럼 새겨져 있고, ‘성공하는 트랙’이 미리 칠해져 있다 — 확률이 눈에 보인다.
// 판을 손으로 돌렸다 놓으면 그 힘으로 돌다가 멈추고, 바늘이 내려앉은 트랙 번호가 판정 값이다.
//   20번 = 히든 트랙(대성공) · 1번 = 판이 튀었다(대실패)
// 나오는 번호는 엔진이 시드로 미리 정해 두었다(재현 가능, 계산은 d20 과 같다) — 화면은 그것을 손맛 있게 보여 준다.
// 바늘이 내려앉은 뒤엔 보정치마다 판이 한 칸씩 더 돌아 최종 값으로 간다 (10 + 2 → 10에서 멈췄다가 11, 12).
// 성공 경계도 같은 만큼 함께 움직이므로, 바늘 아래 색(성공/실패)은 처음부터 끝까지 같다.

import { useEffect, useRef, useState } from 'react';
import type { PendingRoll } from '../sim/types';
import { sfx } from '../audio/player';
import { useBackButton } from '../platform';
import { useArmed } from './useArmed';

interface Props {
  pending: PendingRoll;
  inspiration: number;
  onReroll: () => void;
  onAccept: () => void;
  auto?: boolean;
}

type Stage = 'ready' | 'dragging' | 'spinning' | 'landed' | 'nudge' | 'total' | 'verdict';

const N = 20;
const SEG = 360 / N;
/** 트랙 n(1~20)의 가운데 각도 — 12시 방향이 0도, 시계 방향 */
const centerOf = (n: number) => (n - 1) * SEG + SEG / 2;
const mod360 = (a: number) => ((a % 360) + 360) % 360;

export function TurntableScreen({ pending, inspiration, onReroll, onAccept, auto }: Props) {
  const o = pending.odds;
  const [stage, setStage] = useState<Stage>('ready');
  const [angle, setAngle] = useState(0);
  const [drop, setDrop] = useState(0); // 유리함: 몇 번째 바늘인지 (0 → 1)
  const [shown, setShown] = useState<number[]>([]);
  // 보정으로 판을 몇 칸 더 돌렸나 (0 → o.mod) · 지금 보정 몇 번째를 더하는 중인가
  const [applied, setApplied] = useState(0);
  const [part, setPart] = useState(-1);
  const angleRef = useRef(0);
  const disc = useRef<HTMLDivElement>(null);
  const drag = useRef<{ a: number; t: number; v: number; moved: number } | null>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const lastTick = useRef(0);
  const landedRef = useRef(false);
  const armed = useArmed(`${stage}:${pending.nat}:${pending.rerolled ?? ''}`, 450);
  const nats = pending.nat2 !== undefined ? [pending.nat, pending.nat2] : [pending.nat];
  const best = Math.max(...nats);
  const total = best + o.mod;
  const crit = pending.crit;
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
  const wins = (n: number) => n === 20 || (n !== 1 && n + o.mod >= o.dc);
  // 보정을 더하는 동안엔 성공 경계도 같은 만큼 움직인다: 트랙 n 은 n + (남은 보정) ≥ 난이도면 성공
  const winsNow = (n: number) => n + (o.mod - applied) >= o.dc;
  const winCount = Array.from({ length: N }, (_, i) => i + 1).filter(wins).length;

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  // 다시 틀기: 새 결과로 처음부터
  useEffect(() => {
    if (pending.rerolled) {
      setStage('ready');
      setDrop(0);
      setShown([]);
      setApplied(0);
      setPart(-1);
    }
  }, [pending.rerolled, pending.nat]);

  const setA = (a: number) => {
    angleRef.current = a;
    setAngle(a);
  };

  /** 지금 각도에서 velocity(도/초)만큼의 힘으로 돌려, 정해진 트랙이 바늘(12시) 아래 오게 멈춘다 */
  const spin = (velocity: number) => {
    const target = nats[drop];
    const v = Math.max(540, Math.min(2600, Math.abs(velocity)));
    const turns = Math.round(v / 360) + 1;
    const start = angleRef.current;
    // 레코드를 시계 방향으로 a 만큼 돌리면, 바늘 아래(12시)에는 각도 −a 의 트랙이 온다
    const want = mod360(-centerOf(target) + (Math.random() - 0.5) * SEG * 0.6);
    const end = start + turns * 360 + mod360(want - mod360(start));
    const dur = 1400 + turns * 260;
    const t0 = performance.now();
    landedRef.current = false;
    setStage('spinning');
    sfx('page');
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3.2); // 점점 느려진다
      const a = start + (end - start) * e;
      setA(a);
      // 트랙 경계를 지날 때마다 작은 소리 (너무 잦지 않게)
      const seg = Math.floor(mod360(a) / SEG);
      if (seg !== lastTick.current && now % 3 < 2) {
        lastTick.current = seg;
        if (k > 0.55) sfx('tap');
      }
      if (k < 1) raf.current = requestAnimationFrame(step);
      else land();
    };
    raf.current = requestAnimationFrame(step);
    // 프레임이 멈춰도(백그라운드 탭) 제때 내려앉는다
    later(dur + 400, () => {
      if (angleRef.current !== end) {
        cancelAnimationFrame(raf.current);
        setA(end);
        land();
      }
    });
  };

  const land = () => {
    if (landedRef.current) return;
    landedRef.current = true;
    const n = nats[drop];
    setShown((s) => [...s, n]);
    sfx(n === 20 ? 'big' : n === 1 ? 'bad' : 'coin');
    if (drop + 1 < nats.length) {
      // 유리함: 바늘을 한 번 더 떨어뜨린다
      later(700, () => {
        setDrop(drop + 1);
        setStage('ready');
      });
      return;
    }
    setStage('landed');
    // 대성공·대실패(20·1)는 보정과 상관없이 정해진다 — 판을 더 돌리지 않는다
    if (crit || o.mod === 0) {
      later(650, () => setStage('total'));
      later(1300, () => {
        setStage('verdict');
        sfx(pending.ok ? 'good' : 'bad');
      });
      return;
    }
    later(700, () => nudge());
  };

  /** 판을 to 각도까지 부드럽게 돌린다 */
  const turnTo = (to: number, dur: number, done: () => void) => {
    const from = angleRef.current;
    const t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setA(to);
      done();
    };
    const step = (now: number) => {
      if (finished) return;
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setA(from + (to - from) * e);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else finish();
    };
    raf.current = requestAnimationFrame(step);
    later(dur + 250, finish); // 프레임이 멈춰도 끝난다
  };

  /** 보정치를 하나씩 더하며 판을 한 칸씩 돌린다 — 바늘 아래 트랙이 최종 값으로 간다 */
  const nudge = () => {
    setStage('nudge');
    // 유리함으로 두 번 떨어뜨렸으면, 먼저 높은 쪽 트랙으로 돌아간다
    const last = nats[nats.length - 1];
    const toTrack = (n: number) => angleRef.current - (Math.max(1, Math.min(N, n)) - Math.max(1, Math.min(N, cur))) * SEG;
    let cur = last;
    const steps: { part: number; d: number }[] = [];
    o.parts.forEach((p, i) => {
      for (let k = 0; k < Math.abs(p.d); k++) steps.push({ part: i, d: Math.sign(p.d) });
    });
    // 보정 내역 합이 o.mod 와 다르면(반올림 등) 마지막에 맞춘다
    const sum = steps.reduce((a, x) => a + x.d, 0);
    for (let k = 0; k < Math.abs(o.mod - sum); k++) steps.push({ part: o.parts.length - 1, d: Math.sign(o.mod - sum) });
    const per = Math.max(140, Math.min(320, 1500 / Math.max(1, steps.length)));
    let i = 0;
    let acc = 0;
    const next = () => {
      if (i >= steps.length) {
        setPart(o.parts.length);
        later(450, () => setStage('total'));
        later(1100, () => {
          setStage('verdict');
          sfx(pending.ok ? 'good' : 'bad');
        });
        return;
      }
      const st = steps[i++];
      setPart(st.part);
      acc += st.d;
      const target = best + acc;
      const to = toTrack(target);
      cur = target;
      turnTo(to, per, () => {
        setApplied(acc);
        sfx('tap');
        later(i < steps.length && steps[i].part !== st.part ? 260 : 40, next);
      });
    };
    if (last !== best) {
      const to = toTrack(best);
      cur = best;
      turnTo(to, 420, () => later(200, next));
    } else next();
  };

  // ── 손으로 판 돌리기 ──
  const angleAt = (e: React.PointerEvent) => {
    const r = disc.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onDown = (e: React.PointerEvent) => {
    if (stage !== 'ready') return;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* 포인터가 이미 떠났으면 캡처 없이 진행 */
    }
    drag.current = { a: angleAt(e), t: performance.now(), v: 0, moved: 0 };
    setStage('dragging');
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || stage !== 'dragging') return;
    const a = angleAt(e);
    let da = a - d.a;
    if (da > 180) da -= 360;
    if (da < -180) da += 360;
    const now = performance.now();
    const dt = Math.max(1, now - d.t) / 1000;
    d.v = d.v * 0.5 + (da / dt) * 0.5;
    d.moved += Math.abs(da);
    d.a = a;
    d.t = now;
    setA(angleRef.current + da);
  };
  const onUp = () => {
    const d = drag.current;
    if (!d || stage !== 'dragging') return;
    drag.current = null;
    // 거의 안 돌렸으면(탭) 적당한 힘으로
    spin(d.moved < 8 ? 1100 : d.v);
  };

  // 자동 결정 모드
  useEffect(() => {
    if (!auto) return;
    if (stage === 'ready') later(450, () => spin(1200));
    if (stage === 'verdict') later(1300, onAccept);
  }, [auto, stage, drop]); // eslint-disable-line react-hooks/exhaustive-deps

  useBackButton(() => stage === 'verdict' && onAccept(), true);

  const verdict = crit === 'success' ? '히든 트랙!' : crit === 'fail' ? '판이 튀었다' : pending.ok ? '성공' : '실패';
  const canReroll = stage === 'verdict' && !pending.ok && !pending.rerolled && inspiration > 0;
  const settled = stage === 'landed' || stage === 'nudge' || stage === 'total' || stage === 'verdict';
  const nudging = applied !== 0 || stage === 'nudge';
  // 바늘 아래 숫자: 보정을 더한 만큼 (20을 넘거나 1 아래로 가도 숫자는 그대로 보여 준다)
  const reading = best + applied;
  const pct = Math.round(o.p * 100);
  const under = Math.floor(mod360(-angle) / SEG) + 1; // 지금 바늘 아래 트랙

  return (
    <div className="tt-screen" role="dialog" aria-modal="true" aria-label={`${o.ability} 난이도 ${o.dc}`} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="tt-head">
        <div className="tt-ability">{o.ability}</div>
        <div className="tt-chance">
          <b>{pct}%</b>
          <span>
            20트랙 중 <em>{winCount}트랙</em>이 성공 · 난이도 {o.dc}
            {o.adv ? ' · 유리함: 바늘 두 번, 높은 쪽' : ''}
          </span>
          <span className={`src src-${o.src}`}>{o.src}</span>
        </div>
      </div>

      <div className="tt-deck">
        <div className={`tt-disc ${stage === 'ready' ? 'grab' : ''}`} ref={disc} onPointerDown={onDown} role="button" aria-label="판을 돌리기">
          <svg viewBox="-110 -110 220 220" style={{ transform: `rotate(${angle}deg)` }} aria-hidden>
            <defs>
              <radialGradient id="vinyl" r="1">
                <stop offset="0.3" stopColor="#1c1a24" />
                <stop offset="1" stopColor="#0b0a10" />
              </radialGradient>
            </defs>
            <circle r="104" fill="url(#vinyl)" />
            {Array.from({ length: N }, (_, i) => {
              const n = i + 1;
              const a0 = (i * SEG - 90) * (Math.PI / 180);
              const a1 = ((i + 1) * SEG - 90) * (Math.PI / 180);
              const R = 102;
              const r = 46;
              const path = `M ${r * Math.cos(a0)} ${r * Math.sin(a0)} L ${R * Math.cos(a0)} ${R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} L ${r * Math.cos(a1)} ${r * Math.sin(a1)} A ${r} ${r} 0 0 0 ${r * Math.cos(a0)} ${r * Math.sin(a0)} Z`;
              const mid = ((i + 0.5) * SEG - 90) * (Math.PI / 180);
              // 보정을 더하는 동안엔 20·1 도 보통 트랙처럼 — 대성공·대실패는 처음 떨어진 숫자로만 정해진다
              const cls = !nudging ? (n === 20 ? 'hidden' : n === 1 ? 'skip' : wins(n) ? 'win' : 'lose') : winsNow(n) ? 'win' : 'lose';
              const hit = settled && (nudging ? n === Math.max(1, Math.min(N, reading)) : shown.includes(n));
              return (
                <g key={n} className={`tt-track ${cls} ${hit ? 'hit' : ''}`}>
                  <path d={path} />
                  <text x={92 * Math.cos(mid)} y={92 * Math.sin(mid)} transform={`rotate(${(i + 0.5) * SEG} ${92 * Math.cos(mid)} ${92 * Math.sin(mid)})`}>
                    {n}
                  </text>
                </g>
              );
            })}
            {/* 홈(groove) */}
            {[54, 62, 70, 78, 86].map((r) => (
              <circle key={r} r={r} fill="none" stroke="#ffffff10" strokeWidth="0.6" />
            ))}
            <circle r="40" className="tt-label" />
            <text y="-6" className="tt-label-t">
              SIDE {pending.rerolled ? 'B' : 'A'}
            </text>
            <text y="10" className="tt-label-s">
              DC {o.dc}
            </text>
            <circle r="3" fill="#0b0a10" />
          </svg>
          {/* 바늘 — 12시 방향에 고정 */}
          <div className={`tt-needle ${stage === 'spinning' ? 'down' : settled ? 'rest' : ''}`} aria-hidden>
            <i />
          </div>
          {stage === 'spinning' && <div className="tt-reading">♪ {under}</div>}
          {(stage === 'nudge' || ((stage === 'total' || stage === 'verdict') && applied !== 0)) && (
            <div className={`tt-reading nudge ${applied > 0 ? 'up' : applied < 0 ? 'down' : ''}`} aria-live="polite">
              ♪ {reading}
              {applied !== 0 && <small> ({best}{applied > 0 ? '+' : '−'}{Math.abs(applied)})</small>}
            </div>
          )}
        </div>
        {stage === 'ready' && <div className="tt-hint">{drop === 0 ? '판을 손으로 돌렸다 놓으세요 · 탭해도 돌아가요' : '한 번 더 — 높은 트랙이 남는다'}</div>}
        {stage === 'verdict' && <div className={`tt-verdict ${pending.ok ? 'ok' : 'no'} ${crit ? `crit-${crit}` : ''}`}>{verdict}</div>}
      </div>

      <div className="tt-legend">
        <span className="lg win">성공 트랙</span>
        <span className="lg lose">실패 트랙</span>
        <span className="lg hidden">20 히든 트랙 = 대성공</span>
        <span className="lg skip">1 튀는 판 = 대실패</span>
      </div>

      <div className={`tt-mods ${stage === 'nudge' || stage === 'total' || stage === 'verdict' ? 'show' : ''}`}>
        {o.parts.length === 0 && <span className="mod zero">보정 없음</span>}
        {o.parts.map((p, i) => (
          <span key={p.label} className={`mod ${p.d >= 0 ? 'up' : 'down'} ${stage === 'nudge' ? (i === part ? 'now' : i < part ? 'done' : 'wait') : ''}`} style={{ transitionDelay: stage === 'nudge' ? '0s' : `${i * 0.08}s` }}>
            {p.d >= 0 ? '+' : ''}
            {p.d} {p.label}
          </span>
        ))}
      </div>
      <div className={`tt-total ${stage === 'total' || stage === 'verdict' ? 'show' : ''}`}>
        {settled ? (
          <>
            {nats.length > 1 && <span className="tt-drops">바늘 {shown.join(' · ')} →</span>}
            트랙 {best} {o.mod >= 0 ? '+' : '−'} {Math.abs(o.mod)} = <b>{total}</b>
            <span className="vs"> vs 난이도 {o.dc}</span>
          </>
        ) : (
          ' '
        )}
      </div>

      {o.note && <p className="tt-note">{o.note}</p>}

      <div className="tt-actions">
        {canReroll && (
          <button className="btn" onClick={() => { sfx('page'); onReroll(); }}>
            ✦ 영감으로 B면 다시 틀기 <span style={{ opacity: 0.7 }}>(남은 영감 {inspiration})</span>
          </button>
        )}
        {stage === 'verdict' && (
          <button className="btn primary" onClick={() => armed && onAccept()}>
            {canReroll ? '결과 받아들이기' : '계속 →'}
          </button>
        )}
      </div>
      {stage === 'ready' && drop === 0 && <div className="tt-insp">✦ 영감 {inspiration} · 실패하면 영감을 써서 B면으로 한 번 더 틀 수 있다</div>}
    </div>
  );
}
