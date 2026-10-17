import { ENDINGS } from '../sim/endings';
import type { Meta } from './save';
import { count } from '../sim/korean';

export function Collection({ meta, onBack }: { meta: Meta; onBack: () => void }) {
  const got = Object.keys(meta.endings).length;
  return (
    <div className="app no-tabs">
      <div className="create">
        <div className="row">
          <button className="x" onClick={onBack} aria-label="뒤로">←</button>
          <h2 style={{ margin: 0 }}>엔딩 도감</h2>
        </div>
        <div className="sub">
          {got}/{ENDINGS.length}개의 인생을 살아 봤다. 실패도 엔딩이다.
        </div>
        <div className="collect">
          {ENDINGS.map((e) => {
            const n = meta.endings[e.id];
            return (
              <div key={e.id} className={`slot ${n ? '' : 'locked'}`}>
                <span className="e">{n ? e.emoji : '❔'}</span>
                <b>{n ? e.title : '???'}</b>
                <div className="dim">{n ? `${n}회 · ${e.subtitle}` : '아직 아무도 살지 않은 인생'}</div>
              </div>
            );
          })}
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
