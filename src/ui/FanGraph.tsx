// 팬 그래프 — 나이에 따라 팬이 늘고 줄어든 모양. 최고점을 표시한다.

import type { GameState } from '../sim/types';
import { count } from '../sim/korean';

export function FanGraph({ s, height = 90 }: { s: GameState; height?: number }) {
  const h = s.history.filter((x) => x.age >= 12);
  if (h.length < 3) return <div className="dim">아직 그릴 만큼 기록이 쌓이지 않았다.</div>;
  const W = 320;
  const H = height;
  const maxF = Math.max(10, ...h.map((x) => x.fans));
  const a0 = h[0].age;
  const a1 = h[h.length - 1].age || a0 + 1;
  const X = (a: number) => ((a - a0) / Math.max(1, a1 - a0)) * (W - 8) + 4;
  const Y = (f: number) => H - 14 - (f / maxF) * (H - 26);
  const pts = h.map((x) => `${X(x.age).toFixed(1)},${Y(x.fans).toFixed(1)}`).join(' ');
  const peak = h.reduce((a, x) => (x.fans > a.fans ? x : a), h[0]);
  const last = h[h.length - 1];
  return (
    <svg className="fangraph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`팬 변화: 최고 ${count(peak.fans)}명(${peak.age}세), 지금 ${count(last.fans)}명`}>
      <polyline points={`4,${H - 14} ${pts} ${X(last.age)},${H - 14}`} fill="#f0378f22" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--pink)" strokeWidth="2" strokeLinejoin="round" />
      <line x1="4" x2={W - 4} y1={H - 14} y2={H - 14} stroke="var(--line)" />
      <circle cx={X(peak.age)} cy={Y(peak.fans)} r="3.5" fill="var(--blue)" />
      <text x={Math.min(W - 70, X(peak.age) + 5)} y={Math.max(10, Y(peak.fans) - 5)} className="fg-t">최고 {count(peak.fans)} · {peak.age}세</text>
      <text x="4" y={H - 2} className="fg-a">{a0}세</text>
      <text x={W - 4} y={H - 2} textAnchor="end" className="fg-a">{a1}세</text>
    </svg>
  );
}
