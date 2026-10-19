// 카드 고르기 화면 + 위험도 태그 + 대박·쪽박 연출.

import { useEffect, useState } from 'react';
import type { GameState, Jackpot, Risk } from '../sim/types';
import { Portrait } from '../art/Portrait';
import { sfx } from '../audio/player';
import { won, count } from '../sim/korean';
import { useArmed } from './useArmed';

export const RISK_LABEL: Record<Risk, string> = { safe: '안정', risky: '모험', gamble: '도박' };

export function RiskTag({ risk }: { risk?: Risk }) {
  if (!risk) return null;
  return <span className={`risk risk-${risk}`}>{RISK_LABEL[risk]}</span>;
}

export function CardPick({ s, onChoose }: { s: GameState; onChoose: (i: number) => void }) {
  const ev = s.active!;
  const idx = ev.order ?? ev.choices.map((_, i) => i);
  const items = idx.map((i) => ({ ch: ev.choices[i], i })).filter(({ ch }) => !ch.hidden && !ch.disabled && ch.card);
  const rest = idx.map((i) => ({ ch: ev.choices[i], i })).filter(({ ch }) => !ch.hidden && !ch.disabled && !ch.card);
  useEffect(() => sfx('page'), [ev.id]);
  const armed = useArmed(ev.id, 350);
  return (
    <div className="draft-back">
      <div className="draft gdraft" role="dialog" aria-modal="true" aria-label={ev.title}>
        <div className="draft-head">
          <span className="k">{ev.kicker ?? 'CARDS'}</span>
          <h2>{ev.title}</h2>
          <p>{ev.text}</p>
        </div>
        <div className="draft-cards">
          {items.map(({ ch, i }, k) => {
            const c = ch.card!;
            const pct = ch.odds ? Math.round(ch.odds.p * 100) : null;
            return (
              <button key={i} className={`gcard gc-${ch.risk ?? 'none'}`} style={{ animationDelay: `${k * 0.1}s` }} onClick={() => { if (!armed) return; sfx('tap'); onChoose(i); }}>
                <span className="gcard-top">
                  {c.tag && c.tag !== (ch.risk && RISK_LABEL[ch.risk]) && <span className="gcard-tag">{c.tag}</span>}
                  <RiskTag risk={ch.risk} />
                </span>
                {c.face ? (
                  <span className="mcard-face"><Portrait person={{ ...c.face, mood: 60 }} /></span>
                ) : (
                  <span className="gcard-icon" aria-hidden>{c.icon ?? '🃏'}</span>
                )}
                <span className="gcard-title">{c.title}</span>
                {c.sub && <span className="gcard-sub">{c.sub}</span>}
                {c.stats && (
                  <span className="gcard-stats">
                    {c.stats.map(([k2, v]) => (
                      <span key={k2}>
                        <em>{k2}</em>
                        <b>{v}</b>
                      </span>
                    ))}
                  </span>
                )}
                {ch.range && <span className="gcard-range">{ch.range}</span>}
                {pct !== null && (
                  <span className="mcard-odds">
                    {ch.odds!.ability} <b>{pct}%</b> · 난이도 {ch.odds!.dc}
                  </span>
                )}
                {c.data && <span className="gcard-data">📊 {c.data}</span>}
              </button>
            );
          })}
        </div>
        {rest.length > 0 && (
          <div className="draft-foot">
            {rest.map(({ ch, i }) => (
              <button key={i} className="linkbtn" onClick={() => armed && onChoose(i)}>{ch.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 결과가 크게 터졌을 때: 숫자가 굴러 올라가며 터진다 (쪽박은 금이 간다) */
export function JackpotBurst({ j }: { j: Jackpot }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    sfx(j.kind === 'bust' ? 'bad' : 'big');
    const t0 = performance.now();
    const target = Math.abs(j.amount);
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const fallback = window.setTimeout(() => setN(target), 1300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [j]);
  const value = j.kind === 'fans' ? `+${count(n)}명` : j.kind === 'bust' ? `−${won(n)}` : `+${won(n)}`;
  return (
    <div className={`jackpot jackpot-${j.kind}`} role="status">
      <span className="jp-label">{j.label}</span>
      <span className="jp-value">{value}</span>
      {j.kind !== 'bust' && (
        <span className="jp-confetti" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.08}s` }} />
          ))}
        </span>
      )}
    </div>
  );
}
