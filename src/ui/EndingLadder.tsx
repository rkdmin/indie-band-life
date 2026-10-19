// 엔딩 화면의 두 장면.
//  - 팬 사다리: 14칸 중 이 인생이 선 칸까지 표시가 아래에서부터 올라간다. 칸마다 ‘인생 1,000번 중 몇 번’.
//  - 특이사항: 배지가 도장처럼 하나씩 쾅쾅 찍힌다. 희귀하면 반짝이고, 처음 받은 건 NEW.

import { useEffect, useState } from 'react';
import { ENDINGS, BADGES } from '../sim/endings';
import oddsJson from '../data/fate/ending_odds.json';
import { count } from '../sim/korean';
import { sfx } from '../audio/player';

const ODDS = oddsJson.data as { lives: number; tiers: Record<string, number>; badges: Record<string, number> };

/** 1,000번 중 몇 번 → 읽기 좋은 말 */
export function oddsText(per1000: number | undefined): string {
  if (per1000 === undefined) return '';
  if (per1000 <= 0) return "기록 없음";
  if (per1000 < 1) return `인생 1만 번 중 ${Math.max(1, Math.round(per1000 * 10))}번`;
  return `인생 1,000번 중 ${per1000 < 10 ? per1000.toFixed(1).replace(/\.0$/, '') : Math.round(per1000)}번`;
}
const RARE = 20;

export function FameLadder({ tier, fame }: { tier: number; fame: number }) {
  // 표시가 맨 아래 칸에서 출발해 한 칸씩 올라간다
  const [at, setAt] = useState(ENDINGS.length);
  useEffect(() => {
    if (at <= tier) return;
    const id = window.setTimeout(() => {
      setAt((x) => x - 1);
      if (at - 1 === tier) sfx(tier <= 5 ? 'cheer' : 'good');
    }, at === ENDINGS.length ? 500 : 90);
    return () => window.clearTimeout(id);
  }, [at, tier]);
  return (
    <ol className="ladder" aria-label={`팬 사다리 ${ENDINGS.length}단계 중 ${tier}단계`}>
      {ENDINGS.map((e) => {
        const here = e.tier === at;
        const mine = e.tier === tier && at === tier;
        return (
          <li key={e.id} className={`rung ${e.tier < tier ? 'above' : ''} ${here ? 'here' : ''} ${mine ? 'mine' : ''} ${e.tier <= 3 ? 'summit' : ''}`}>
            <span className="rung-n">{e.tier}</span>
            <span className="rung-e" aria-hidden>{e.emoji}</span>
            <span className="rung-t">
              <b>{e.title}</b>
              <small>{e.min !== undefined ? `팬 ${count(e.min)}명 이상` : e.subtitle}</small>
            </span>
            <span className="rung-o">{mine ? <em>팬 {count(fame)}명</em> : oddsText(ODDS.tiers[e.id])}</span>
          </li>
        );
      })}
    </ol>
  );
}

const INK: Record<string, string> = { red: '#d62f4b', blue: '#2357e6', green: '#13896a', gold: '#b88300', purple: '#7c4dff', black: '#2a2733' };

export function BadgeStamps({ ids, lines, seen }: { ids: string[]; lines: Record<string, string>; seen: Record<string, number> }) {
  const list = BADGES.filter((b) => ids.includes(b.id));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= list.length) return;
    const id = window.setTimeout(() => {
      setShown((x) => x + 1);
      sfx('coin');
    }, shown === 0 ? 900 : 420);
    return () => window.clearTimeout(id);
  }, [shown, list.length]);
  if (!list.length) return <p className="dim">특별한 사연 없이, 조용히 흘러간 인생.</p>;
  return (
    <div className="stamps">
      {list.map((b, i) => {
        const o = ODDS.badges[b.id];
        const rare = o !== undefined && o < RARE;
        // 이번 인생에 처음 받았다 (도감 기록은 이번 인생까지 포함해 1회)
        const isNew = (seen[b.id] ?? 0) <= 1;
        const tilt = ((b.id.charCodeAt(0) + i * 7) % 9) - 4;
        return (
          <div key={b.id} className={`stamp ${i < shown ? 'in' : ''} ${rare ? 'rare' : ''}`} style={{ ['--ink' as string]: INK[b.ink], ['--tilt' as string]: `${tilt}deg` }}>
            <span className="stamp-e" aria-hidden>{b.emoji}</span>
            <b>{b.title}</b>
            <small>{lines[b.id]}</small>
            <span className="stamp-o">{rare ? '희귀 · ' : ''}{oddsText(o)}</span>
            {isNew && <span className="stamp-new">NEW</span>}
          </div>
        );
      })}
    </div>
  );
}
