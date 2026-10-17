// 확률 공개: 선택지마다 성공 확률과 그 내역을 보여 주고, 굴린 주사위가 어디에 떨어졌는지 애니메이션으로 보여 준다.

import { useEffect, useState } from 'react';
import type { Odds, Roll } from '../sim/types';
import { sfx } from '../audio/player';

export function OddsBar({ o }: { o: Odds }) {
  const pct = Math.round(o.p * 100);
  return (
    <span className="odds">
      <span className="odds-bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="odds-text">
        <b>{pct}%</b>
        <span className="odds-parts">
          d20{o.mod >= 0 ? '+' : ''}
          {o.mod} ≥ {o.dc}
          {o.parts.map((p) => (
            <span key={p.label} className={p.d > 0 ? 'up' : 'down'}>
              {' · '}
              {p.label} {p.d > 0 ? '+' : ''}
              {p.d}
            </span>
          ))}
          {o.adv && <span className="up"> · 유리함</span>}
          <span className={`src src-${o.src}`}>{o.src}</span>
        </span>
      </span>
    </span>
  );
}

export function RollView({ r, delay = 0 }: { r: Roll; delay?: number }) {
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t0 = performance.now() + delay;
    let raf = 0;
    const dur = 1300;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur));
      // 몇 번 왔다 갔다 하다가 결과에 멈춘다
      const ease = 1 - Math.pow(1 - k, 3);
      const wobble = Math.sin(k * Math.PI * 5) * (1 - k) * 0.35;
      setPos(Math.min(1, Math.max(0, r.roll * ease + wobble)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else {
        setDone(true);
        sfx(r.ok ? 'good' : 'bad');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [r.roll, r.ok, delay]);
  const pct = Math.round(r.p * 100);
  return (
    <div className={`roll ${done ? (r.ok ? 'ok' : 'no') : ''}`}>
      <div className="roll-head">
        <span>🎲 {r.label}</span>
        <span className="mono">{pct}%</span>
      </div>
      <div className="roll-track">
        <span className="zone" style={{ width: `${pct}%` }} />
        <span className="marker" style={{ left: `${pos * 100}%` }} />
      </div>
      <div className="roll-res">{done ? (r.ok ? '성공!' : '실패…') : ' '}</div>
    </div>
  );
}
