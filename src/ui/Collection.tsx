import { ENDINGS, BADGES } from '../sim/endings';
import { oddsText } from './EndingLadder';
import oddsJson from '../data/fate/ending_odds.json';

const ODDS_T = (oddsJson.data as { tiers: Record<string, number> }).tiers;
import type { Meta } from './save';
import { count } from '../sim/korean';

export function Collection({ meta, onBack }: { meta: Meta; onBack: () => void }) {
  const got = ENDINGS.filter((e) => meta.endings[e.id]).length;
  const badges = meta.badges ?? {};
  const gotB = BADGES.filter((b) => badges[b.id]).length;
  return (
    <div className="app no-tabs">
      <div className="create">
        <div className="row">
          <button className="x" onClick={onBack} aria-label="뒤로">←</button>
          <h2 style={{ margin: 0 }}>엔딩 도감</h2>
        </div>
        <div className="sub">
          팬 사다리 {ENDINGS.length}단계 중 {got}단계에 서 봤다 · 특이사항 {gotB}/{BADGES.length}개. 실패도 엔딩이다.
        </div>
        <div className="collect">
          {ENDINGS.map((e) => {
            const n = meta.endings[e.id];
            return (
              <div key={e.id} className={`slot ${n ? '' : 'locked'}`}>
                <span className="e">{n ? e.emoji : '❔'}</span>
                <b>{n ? e.title : '???'}</b>
                <div className="dim">{e.tier}단계 · {n ? `${n}회 · ${e.subtitle}` : e.min !== undefined ? `팬 ${count(e.min)}명 이상` : '아직 아무도 살지 않은 인생'}</div>
                <div className="dim" style={{ fontSize: 11 }}>{oddsText(ODDS_T[e.id])}</div>
              </div>
            );
          })}
        </div>
        <h3 style={{ margin: '8px 0 0' }}>특이사항 도장</h3>
        <div className="dex-badges">
          {BADGES.map((b) => (
            <div key={b.id} className={`dex-badge ${badges[b.id] ? 'got' : ''}`}>
              <span className="e" aria-hidden>{b.emoji}</span>
              <b>{badges[b.id] ? b.title : '???'}</b>
              <small>{badges[b.id] ? `${badges[b.id]}회` : b.hint}</small>
            </div>
          ))}
        </div>
        <h3 style={{ margin: '8px 0 0' }}>지난 인생들</h3>
        {meta.lives.length === 0 && <div className="dim">첫 인생을 시작해 보세요.</div>}
        {meta.lives.map((l) => (
          <div key={l.id} className="card" style={{ padding: 12 }}>
            <div className="row">
              <b className="grow">{l.name}</b>
              <span className="chip big">{l.rank}</span>
            </div>
            <div className="dim">
              {l.born}–{l.died} · {l.endingTitle} · 최고 팬 {count(l.fans)}
              {l.bestSong ? ` · 〈${l.bestSong}〉` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
