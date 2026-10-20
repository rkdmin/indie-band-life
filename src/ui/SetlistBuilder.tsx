// 셋리스트 짜기 — 곡을 눌러 순서대로 다섯 칸에 넣는다. 칸을 누르면 뺀다.
// 아래 작은 그래프가 공연의 에너지 흐름을 보여 주고, 점수와 한 줄 평이 바로 바뀐다 (sim/setlist.ts).

import { useMemo, useState } from 'react';
import type { GameState, Mood } from '../sim/types';
import { CROWD, ENERGY, SET_SIZE, repertoire, scoreSetlist, type Crowd } from '../sim/setlist';
import { sfx } from '../audio/player';

const MOOD_LABEL: Record<Mood, string> = { angry: '분노', epic: '웅장', bright: '밝음', dreamy: '몽환', wistful: '그리움', calm: '잔잔' };

export function SetlistBuilder({ s, onConfirm, onHabit }: { s: GameState; onConfirm: (ids: string[]) => void; onHabit: () => void }) {
  const songs = useMemo(() => repertoire(s), [s]);
  const [ids, setIds] = useState<string[]>([]);
  const set = ids.map((id) => songs.find((x) => x.id === id)!).filter(Boolean);
  // 오늘의 관객 (사건을 열 때 정해진다) — 관객마다 정답 순서가 다르다
  const crowd = ((s.active?.vars?.crowd as Crowd) || 'seated');
  const sc = scoreSetlist(set, songs, crowd, Math.floor(s.time));
  const full = set.length >= SET_SIZE;
  // 빠르게 연달아 눌러도 빠지지 않게 — 이전 상태에서 이어 붙인다
  const add = (id: string) => {
    if (ids.includes(id) || full) return;
    setIds((prev) => (prev.includes(id) || prev.length >= SET_SIZE ? prev : [...prev, id]));
    sfx('tap');
  };
  const remove = (i: number) => {
    setIds((prev) => prev.filter((_, j) => j !== i));
    sfx('tap');
  };
  return (
    <div className="setb">
      <div className="setb-crowd"><b>오늘 관객 · {CROWD[crowd].label}</b><span>{CROWD[crowd].hint}</span></div>
      <ol className="setb-slots" aria-label="셋리스트">
        {Array.from({ length: SET_SIZE }, (_, i) => {
          const x = set[i];
          return (
            <li key={i}>
              {x ? (
                <button type="button" className="setb-slot on" onClick={() => remove(i)} aria-label={`${i + 1}번째 곡 ${x.title} 빼기`}>
                  <span className="setb-n">{i + 1}</span>
                  <span className="setb-t">〈{x.title}〉</span>
                  <span className={`setb-m m-${x.mood}`}>{MOOD_LABEL[x.mood]}</span>
                </button>
              ) : (
                <div className="setb-slot"><span className="setb-n">{i + 1}</span><span className="dim">{i === 0 ? '여는 곡' : i === SET_SIZE - 1 ? '닫는 곡' : '—'}</span></div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="setb-curve" aria-hidden>
        {Array.from({ length: SET_SIZE }, (_, i) => (
          <i key={i} style={{ height: `${set[i] ? Math.round(ENERGY[set[i].mood] * 100) : 6}%` }} className={set[i] ? 'on' : ''} />
        ))}
      </div>
      <div className="setb-pool" role="list" aria-label="곡 목록">
        {songs.map((x) => {
          const used = ids.includes(x.id);
          return (
            <button key={x.id} type="button" role="listitem" className={`setb-song ${used ? 'used' : ''}`} disabled={used || full} onClick={() => add(x.id)}>
              <span className="setb-t">〈{x.title}〉{x.hit ? ' ★' : ''}</span>
              <span className="setb-sub"><span className={`setb-m m-${x.mood}`}>{MOOD_LABEL[x.mood]}</span> 완성도 {x.quality}{x.writtenYear >= Math.floor(s.time) - 2 && <span className="setb-new">신곡</span>}</span>
            </button>
          );
        })}
      </div>
      <div className="setb-score" aria-live="polite">
        <b>{set.length ? `${sc.score}점` : '곡을 눌러 순서대로 넣으세요'}</b>
        {set.length > 0 && (
          <ul>
            {sc.notes.slice(0, 4).map((n) => (
              <li key={n.text} className={n.ok ? 'ok' : 'no'}>{n.ok ? '✓' : '·'} {n.text}</li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="btn primary block" disabled={!full} onClick={() => { sfx('good'); onConfirm(ids); }}>
        {full ? '이 순서로 무대에 오른다' : `${SET_SIZE - set.length}곡 더 고르세요`}
      </button>
      <button type="button" className="btn block" onClick={onHabit}>늘 하던 순서로 한다</button>
    </div>
  );
}
