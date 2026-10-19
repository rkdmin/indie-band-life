// 인생 화면의 ‘장비’들 — 카세트 데크와 믹싱 콘솔.
//  · TapeReels: 인생 한 편이 테이프 한 개. 왼쪽 릴(남은 테이프)은 기대수명까지 남은 시간만큼, 오른쪽 릴은 산 시간만큼 감겨 있다
//  · TapeCounter: 나이를 기계식 테이프 카운터로
//  · Console: 건강·행복·스트레스·컨디션은 채널 페이더, 돈·팬은 숫자판

import type { GameState } from '../sim/types';
import { countryOf, lifeExpAt } from '../sim/data/countries';
import { won, count } from '../sim/korean';

export function TapeReels({ s, clock, playing }: { s: GameState; clock: number; playing: boolean }) {
  const life = lifeExpAt(countryOf(s.player.country), s.player.birthYear);
  const lived = Math.max(0, clock - s.player.birthYear);
  const k = Math.max(0.04, Math.min(0.96, lived / Math.max(life, lived + 1)));
  const rL = 9 + 15 * (1 - k); // 남은 테이프
  const rR = 9 + 15 * k; // 감긴 테이프
  return (
    <div className="reels" title={`기대수명 ${life}세 기준 — ${Math.round(k * 100)}% 감김`} aria-hidden>
      <svg viewBox="0 0 120 52">
        <rect x="1" y="1" width="118" height="50" rx="6" className="reel-shell" />
        <rect x="26" y="34" width="68" height="14" rx="3" className="reel-window" />
        <path d={`M ${30 - rL * 0.2} ${26 + rL} L ${90 + rR * 0.2} ${26 + rR}`} className="reel-tape" />
        {[
          { cx: 30, r: rL },
          { cx: 90, r: rR },
        ].map((w, i) => (
          <g key={i}>
            <circle cx={w.cx} cy="26" r={w.r} className="reel-wound" />
            <g className={`reel-hub ${playing ? 'spin' : ''}`} style={{ transformOrigin: `${w.cx}px 26px` }}>
              <circle cx={w.cx} cy="26" r="7" />
              {[0, 60, 120].map((a) => (
                <rect key={a} x={w.cx - 1} y="19.5" width="2" height="13" transform={`rotate(${a} ${w.cx} 26)`} />
              ))}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function TapeCounter({ value }: { value: number }) {
  const digits = String(Math.max(0, Math.floor(value))).padStart(3, '0').split('');
  return (
    <span className="counter-digits" aria-label={`${Math.floor(value)}세`}>
      {digits.map((d, i) => (
        <i key={i}>{d}</i>
      ))}
    </span>
  );
}

export function Console({ s }: { s: GameState }) {
  const st = s.player.stats;
  const ch: [string, number, string, boolean][] = [
    ['건강', st.health, 'var(--green)', st.health < 35],
    ['행복', st.happiness, 'var(--gold)', st.happiness < 30],
    ['스트레스', st.stress, 'var(--bad)', st.stress > 75],
    ['컨디션', st.energy, 'var(--blue)', st.energy < 25],
  ];
  const p = s.player;
  return (
    <div className="console">
      <div className="faders">
        {ch.map(([l, v, c, warn]) => (
          <div key={l} className={`fader ${warn ? 'warn' : ''}`}>
            <b>{Math.round(v)}</b>
            <div className="slot">
              <i className="lvl" style={{ height: `${v}%`, background: c, ['--w' as string]: `${v}%` }} />
              <i className="knob" style={{ bottom: `calc(${v}% - 6px)` }} />
            </div>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="readouts">
        <div className={`ro ${p.money < 0 ? 'neg' : ''}`}>
          <span>통장</span>
          <b>{won(p.money)}</b>
        </div>
        <div className="ro">
          <span>팬</span>
          <b>{count(p.fans)}</b>
          {p.globalFans > 0 && <small>해외 {count(p.globalFans)}</small>}
        </div>
        <div className="ro">
          <span>영감</span>
          <b className="insp">{'✦'.repeat(p.inspiration) || '—'}</b>
        </div>
        {p.debt > 0 && (
          <div className="ro neg">
            <span>빚</span>
            <b>{won(p.debt)}</b>
          </div>
        )}
      </div>
    </div>
  );
}
