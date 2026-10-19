// 밴드 이름 짓기 — 직접 쓰거나, 추천 이름을 누르거나, 주사위로 새 추천을 받는다.

import { useMemo, useState } from 'react';
import { randomBandName } from '../sim/names';
import { Rng } from '../sim/rng';
import { cleanBandName } from '../sim/engine';
import { sfx } from '../audio/player';

export function BandNamer({ current, seed, onConfirm, confirmLabel = '이 이름으로 결성' }: { current: string; seed: number; onConfirm: (name: string) => void; confirmLabel?: string }) {
  const [name, setName] = useState(current);
  const [roll, setRoll] = useState(0);
  const ideas = useMemo(() => {
    const r = new Rng(seed + roll * 7919);
    const out = new Set<string>();
    for (let i = 0; i < 20 && out.size < 4; i++) {
      const n = randomBandName(r);
      if (n !== current) out.add(n);
    }
    return [...out];
  }, [seed, roll, current]);
  const clean = cleanBandName(name);
  return (
    <form
      className="namer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!clean) return;
        sfx('good');
        onConfirm(clean);
      }}
    >
      <label className="label" htmlFor="band-name">밴드 이름</label>
      <div className="namer-row">
        <input
          id="band-name"
          className="text-input"
          value={name}
          maxLength={16}
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => setName(e.target.value)}
          placeholder="우리 밴드 이름"
        />
        <button type="button" className="btn" onClick={() => { setRoll((x) => x + 1); sfx('tap'); }} aria-label="다른 이름 추천" title="다른 이름 추천">🎲</button>
      </div>
      <div className="namer-ideas">
        {ideas.map((n) => (
          <button type="button" key={n} className={`chip ${n === name ? 'on' : ''}`} onClick={() => { setName(n); sfx('tap'); }}>
            {n}
          </button>
        ))}
      </div>
      <div className="namer-preview" aria-live="polite">
        {clean ? <>포스터엔 이렇게 — <b>〈{clean}〉</b></> : '이름을 적어 주세요'}
        <span className="dim"> {clean.length}/16</span>
      </div>
      <button type="submit" className="btn primary block" disabled={!clean}>{confirmLabel}</button>
    </form>
  );
}
