// 발더스 게이트식 d20 판정 화면 — 주사위를 직접 잡아서 던진다.
// 끌어서 휙 놓으면 그 속도로 날아가 테이블 가장자리에 부딪히며 구르다 멈춘다. 그냥 탭하면 적당히 던진다.
// 나오는 눈은 엔진이 시드로 미리 정해 두었다(재현 가능) — 화면은 그것을 손맛 있게 보여 줄 뿐이다.

import { useEffect, useRef, useState } from 'react';
import type { PendingRoll } from '../sim/types';
import { sfx } from '../audio/player';
import { useBackButton } from '../platform';

interface Props {
  pending: PendingRoll;
  inspiration: number;
  onReroll: () => void;
  onAccept: () => void;
  auto?: boolean;
}

type Stage = 'ready' | 'dragging' | 'flying' | 'landed' | 'total' | 'verdict';

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
}

const SIZE = 132;

export function DiceScreen({ pending, inspiration, onReroll, onAccept, auto }: Props) {
  const o = pending.odds;
  const [stage, setStage] = useState<Stage>('ready');
  const [face, setFace] = useState(20);
  const [face2, setFace2] = useState(20);
  const [, force] = useState(0);
  const table = useRef<HTMLDivElement>(null);
  const b1 = useRef<Body>({ x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 });
  const b2 = useRef<Body>({ x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 });
  const drag = useRef<{ px: number; py: number; t: number; vx: number; vy: number } | null>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const best = pending.nat2 !== undefined ? Math.max(pending.nat, pending.nat2) : pending.nat;
  const total = best + o.mod;
  const crit = pending.crit;
  const later = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));

  // 테이블 크기에 맞춰 시작 위치(아래 가운데)
  const home = () => {
    const el = table.current;
    const w = el?.clientWidth ?? 360;
    const h = el?.clientHeight ?? 360;
    b1.current = { x: w / 2 - SIZE / 2 - (o.adv ? SIZE * 0.6 : 0), y: h - SIZE - 12, vx: 0, vy: 0, r: 0, vr: 0 };
    b2.current = { x: w / 2 - SIZE / 2 + SIZE * 0.6, y: h - SIZE - 12, vx: 0, vy: 0, r: 0, vr: 0 };
    force((x) => x + 1);
  };
  useEffect(() => {
    home();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 다시 굴리기: 새 결과로 처음부터
  useEffect(() => {
    if (pending.rerolled) {
      home();
      setStage('ready');
    }
  }, [pending.rerolled, pending.nat]); // eslint-disable-line react-hooks/exhaustive-deps

  const land = () => {
    setFace(pending.nat);
    setFace2(pending.nat2 ?? 0);
    setStage('landed');
    sfx(crit === 'success' ? 'big' : crit === 'fail' ? 'bad' : 'coin');
    later(700, () => setStage('total'));
    later(1400, () => {
      setStage('verdict');
      sfx(pending.ok ? 'good' : 'bad');
    });
  };

  const throwDice = (vx: number, vy: number) => {
    // 너무 약하게 놓으면 적당히 세게 던져 준다
    const sp = Math.hypot(vx, vy);
    if (sp < 900) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      vx = Math.cos(a) * 1500;
      vy = Math.sin(a) * 1500;
    }
    const cap = 3200;
    const k = Math.min(1, cap / Math.hypot(vx, vy));
    b1.current.vx = vx * k;
    b1.current.vy = vy * k;
    b1.current.vr = (Math.random() > 0.5 ? 1 : -1) * (600 + Math.random() * 600);
    if (o.adv) {
      b2.current.vx = vx * k * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 400;
      b2.current.vy = vy * k * (0.8 + Math.random() * 0.4);
      b2.current.vr = -b1.current.vr * 0.8;
    }
    setStage('flying');
    sfx('page');
    simulate();
  };

  const simulate = () => {
    const el = table.current;
    const W = el?.clientWidth ?? 360;
    const H = el?.clientHeight ?? 360;
    let last = performance.now();
    let flick = 0;
    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      let moving = false;
      for (const [i, b] of [b1.current, b2.current].entries()) {
        if (i === 1 && !o.adv) continue;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.r += b.vr * dt;
        // 테이블 가장자리에서 튕긴다
        let hit = false;
        if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.72; hit = true; }
        if (b.x > W - SIZE) { b.x = W - SIZE; b.vx = -Math.abs(b.vx) * 0.72; hit = true; }
        if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * 0.72; hit = true; }
        if (b.y > H - SIZE) { b.y = H - SIZE; b.vy = -Math.abs(b.vy) * 0.72; hit = true; }
        if (hit) {
          b.vr = -b.vr * 0.8 + (Math.random() - 0.5) * 300;
          sfx('tap');
        }
        // 굴러가며 느려진다
        const f = Math.pow(0.18, dt);
        b.vx *= f;
        b.vy *= f;
        b.vr *= Math.pow(0.25, dt);
        if (Math.hypot(b.vx, b.vy) > 60) moving = true;
      }
      // 구르는 동안 윗면 숫자가 바뀐다
      flick += Math.hypot(b1.current.vx, b1.current.vy) * dt;
      if (flick > 70) {
        flick = 0;
        setFace(1 + Math.floor(Math.random() * 20));
        setFace2(1 + Math.floor(Math.random() * 20));
      }
      force((x) => x + 1);
      if (moving) raf.current = requestAnimationFrame(step);
      else land();
    };
    raf.current = requestAnimationFrame(step);
  };

  // ── 잡고 던지기 ──
  const onDown = (e: React.PointerEvent) => {
    if (stage !== 'ready') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, t: performance.now(), vx: 0, vy: 0 };
    setStage('dragging');
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || stage !== 'dragging') return;
    const now = performance.now();
    const dt = Math.max(1, now - d.t) / 1000;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    // 최근 움직임에 가중치를 둔 속도
    d.vx = d.vx * 0.4 + (dx / dt) * 0.6;
    d.vy = d.vy * 0.4 + (dy / dt) * 0.6;
    d.px = e.clientX;
    d.py = e.clientY;
    d.t = now;
    b1.current.x += dx;
    b1.current.y += dy;
    b1.current.r += dx * 0.5;
    if (o.adv) {
      b2.current.x += dx;
      b2.current.y += dy;
    }
    force((x) => x + 1);
  };
  const onUp = () => {
    const d = drag.current;
    if (!d || stage !== 'dragging') return;
    drag.current = null;
    throwDice(d.vx, d.vy);
  };

  // 자동 결정 모드: 알아서 던지고 받아들인다
  useEffect(() => {
    if (!auto) return;
    if (stage === 'ready') later(450, () => throwDice(0, 0));
    if (stage === 'verdict') later(1300, onAccept);
  }, [auto, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useBackButton(() => stage === 'verdict' && onAccept(), true);

  const verdict = crit === 'success' ? '대성공' : crit === 'fail' ? '대실패' : pending.ok ? '성공' : '실패';
  const canReroll = stage === 'verdict' && !pending.ok && !pending.rerolled && inspiration > 0;
  const settled = stage === 'landed' || stage === 'total' || stage === 'verdict';
  const pct = Math.round(o.p * 100);

  return (
    <div className="dice-screen" role="dialog" aria-modal="true" aria-label={`${o.ability} 난이도 ${o.dc}`} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="dice-top">
        <div className="dice-ability">{o.ability}</div>
        <div className="dc-shield">
          <span>난이도</span>
          <b>{o.dc}</b>
        </div>
        <div className="dice-chance">
          성공 확률 {pct}% {o.adv && <em>· 유리함 (주사위 2개 중 높은 눈)</em>} <span className={`src src-${o.src}`}>{o.src}</span>
        </div>
      </div>

      <div className="dice-table" ref={table}>
        <Die body={b1.current} value={stage === 'ready' || stage === 'dragging' ? null : face} crit={settled ? crit : undefined} dim={settled && o.adv && pending.nat < (pending.nat2 ?? 0)} grab={stage === 'ready'} onDown={onDown} />
        {o.adv && <Die body={b2.current} value={stage === 'ready' || stage === 'dragging' ? null : face2} dim={settled && (pending.nat2 ?? 0) <= pending.nat} grab={stage === 'ready'} onDown={onDown} />}
        {stage === 'ready' && <div className="table-hint">주사위를 잡고 휙 던지세요 · 탭해도 던져져요</div>}
        {stage === 'verdict' && <div className={`verdict ${pending.ok ? 'ok' : 'no'} ${crit ? 'crit' : ''}`}>{verdict}</div>}
      </div>

      <div className={`dice-mods ${stage === 'total' || stage === 'verdict' ? 'show' : ''}`}>
        {o.parts.length === 0 && <span className="mod zero">보정 없음</span>}
        {o.parts.map((p, i) => (
          <span key={p.label} className={`mod ${p.d >= 0 ? 'up' : 'down'}`} style={{ transitionDelay: `${i * 0.08}s` }}>
            {p.d >= 0 ? '+' : ''}
            {p.d} {p.label}
          </span>
        ))}
      </div>
      <div className={`dice-total ${stage === 'total' || stage === 'verdict' ? 'show' : ''}`}>
        {settled ? `${best} ${o.mod >= 0 ? '+' : '−'} ${Math.abs(o.mod)} = ${total}` : ' '}
        {settled && <span className="vs"> vs 난이도 {o.dc}</span>}
      </div>

      {o.note && <p className="dice-note">{o.note}</p>}

      <div className="dice-actions">
        {canReroll && (
          <button className="btn" onClick={() => { sfx('page'); onReroll(); }}>
            ✦ 영감으로 다시 던지기 <span style={{ opacity: 0.7 }}>(남은 영감 {inspiration})</span>
          </button>
        )}
        {stage === 'verdict' && (
          <button className="btn primary" onClick={onAccept} autoFocus>
            {canReroll ? '결과 받아들이기' : '계속 →'}
          </button>
        )}
      </div>
      {stage === 'ready' && <div className="dice-insp">✦ 영감 {inspiration} · 실패하면 영감을 써서 한 번 다시 던질 수 있다</div>}
    </div>
  );
}

function Die({ body, value, crit, dim, grab, onDown }: { body: Body; value: number | null; crit?: 'success' | 'fail'; dim?: boolean; grab: boolean; onDown: (e: React.PointerEvent) => void }) {
  const cls = `d20 ${crit ? `crit-${crit}` : ''} ${dim ? 'dim' : ''} ${grab ? 'grab' : ''}`;
  return (
    <div className={cls} style={{ width: SIZE, height: SIZE, transform: `translate(${body.x}px, ${body.y}px) rotate(${body.r}deg)` }} onPointerDown={onDown} role="button" aria-label={value ? `${value}` : '주사위 던지기'}>
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <linearGradient id="d20g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3a3326" />
            <stop offset="1" stopColor="#14110c" />
          </linearGradient>
        </defs>
        <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" fill="url(#d20g)" stroke="#c9a45c" strokeWidth="3" />
        <polygon points="100,46 152,136 48,136" fill="#ffffff08" stroke="#c9a45c" strokeWidth="2" />
        <g stroke="#c9a45c88" strokeWidth="1.5" fill="none">
          <path d="M100 8 L100 46 M20 54 L100 46 L180 54 M20 54 L48 136 M180 54 L152 136 M20 146 L48 136 L100 192 L152 136 L180 146 M48 136 L100 46 M152 136 L100 46" />
        </g>
        <text x="100" y="114" textAnchor="middle" className="d20-num">
          {value ?? '20'}
        </text>
      </svg>
    </div>
  );
}
