// 데이터로 본 내 인생 — 게임이 쓰는 실제 통계·근사 데이터를, 내가 산 시간 위에 겹쳐 보여 준다.
// 모든 숫자는 src/data/*.json 에서 온다. 그래프 위에 손을 올리면 그 해의 값이 보인다.

import { moneyAt } from '../sim/money';
import { useMemo, useState } from 'react';
import type { GameState } from '../sim/types';
import { GENRES } from '../sim/types';
import { birthsIn, minWage } from '../sim/data/world';
import { countryOf, hasMinWage, lifeExpAt, type CountryId } from '../sim/data/countries';
import { MEDIA } from '../sim/data/era/media';
import { GENRE_ERAS, genreNamedIn } from '../sim/data/era/genres';
import { bandsAt, styleOf } from '../sim/data/era/bands';
import { incomeBar } from '../sim/data/reality';
import { won } from '../sim/korean';
import { meanHeight, playerAppearance } from '../sim/appearance';

const BLUE = '#2357e6';
const PINK = '#e0367f';

interface LineProps {
  title: string;
  sub: string;
  points: [number, number][];
  fmt: (v: number) => string;
  /** 표시할 해(내 출생 등) */
  marks: { x: number; label: string }[];
  band?: [number, number];
  src: string;
}

/** 한 계열 선 그래프 + 내 인생 구간 + 손을 올리면 그 해의 값 */
function LineChart({ title, sub, points, fmt, marks, band, src }: LineProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = 150;
  const L = 44;
  const R = 10;
  const T = 12;
  const B = 24;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys) * 1.08;
  const yMin = Math.min(0, Math.min(...ys));
  const sx = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - yMin) / (y1 - yMin)) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ');
  const valueAt = (x: number) => {
    let best = points[0];
    for (const p of points) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    return best;
  };
  const ticks = [0, 0.5, 1].map((k) => yMin + (y1 / 1.08 - yMin) * k);
  const xticks = Array.from(new Set([x0, Math.round((x0 + x1) / 2 / 10) * 10, x1]));
  const h = hover !== null ? valueAt(hover) : null;
  return (
    <figure className="dchart">
      <figcaption>
        <b>{title}</b>
        <span>{sub}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: ${points.length}개 연도`}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = x0 + (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * (x1 - x0);
          setHover(Math.max(x0, Math.min(x1, x)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {band && <rect x={sx(Math.max(x0, band[0]))} y={T} width={Math.max(0, sx(Math.min(x1, band[1])) - sx(Math.max(x0, band[0])))} height={H - T - B} className="dc-band" />}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} className="dc-grid" />
            <text x={L - 4} y={sy(t) + 3} className="dc-tick" textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {xticks.map((x) => (
          <text key={x} x={sx(x)} y={H - 8} className="dc-tick" textAnchor="middle">{x}</text>
        ))}
        <path d={`${path} L${sx(x1)},${sy(yMin)} L${sx(x0)},${sy(yMin)} Z`} fill={BLUE} opacity="0.1" />
        <path d={path} fill="none" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {marks.map((m) => {
          const p = valueAt(m.x);
          return (
            <g key={m.label}>
              <line x1={sx(m.x)} x2={sx(m.x)} y1={T} y2={H - B} className="dc-mark" />
              <circle cx={sx(p[0])} cy={sy(p[1])} r="4.5" fill={PINK} stroke="var(--card)" strokeWidth="2" />
              <text x={Math.min(W - R - 2, Math.max(L + 2, sx(m.x)))} y={T + 8} className="dc-label" textAnchor={sx(m.x) > W * 0.7 ? 'end' : 'start'} dx={sx(m.x) > W * 0.7 ? -4 : 4}>
                {m.label} {fmt(p[1])}
              </text>
            </g>
          );
        })}
        {h && (
          <g>
            <line x1={sx(h[0])} x2={sx(h[0])} y1={T} y2={H - B} className="dc-cross" />
            <circle cx={sx(h[0])} cy={sy(h[1])} r="4" fill={BLUE} stroke="var(--card)" strokeWidth="2" />
          </g>
        )}
      </svg>
      <div className="dc-tip" aria-live="polite">{h ? `${Math.round(h[0])}년 · ${fmt(h[1])}` : '그래프 위에 손을 올려 보세요'}</div>
      <div className="dc-src">📊 {src}</div>
    </figure>
  );
}

/** 가로 막대 연표: 각 줄이 ‘언제부터 있었나’, 분홍 띠가 내 인생 */
function Timeline({ title, sub, rows, born, end, src }: { title: string; sub: string; rows: { label: string; from: number; to?: number; note?: string }[]; born: number; end: number; src: string }) {
  const x0 = Math.min(1950, born);
  const x1 = Math.max(2030, end);
  const pos = (y: number) => `${((Math.max(x0, Math.min(x1, y)) - x0) / (x1 - x0)) * 100}%`;
  return (
    <figure className="dchart">
      <figcaption>
        <b>{title}</b>
        <span>{sub}</span>
      </figcaption>
      <div className="tl-rows">
        <div className="tl-overlay" aria-hidden>
          <div className="tl-life" style={{ left: pos(born), width: `calc(${pos(end)} - ${pos(born)})` }} title="내 인생" />
        </div>
        {rows.map((r) => (
          <div key={r.label} className="tl-row" title={`${r.label}: ${Math.floor(r.from)}년부터${r.to ? ` ${Math.floor(r.to)}년까지` : ''}${r.note ? ` — ${r.note}` : ''}`}>
            <span className="tl-name">{r.label}</span>
            <span className="tl-track">
              <i style={{ left: pos(r.from), width: `calc(${pos(r.to ?? x1)} - ${pos(r.from)})` }} />
              <em style={{ left: pos(r.from) }}>{Math.floor(r.from)}</em>
            </span>
          </div>
        ))}
      </div>
      <div className="tl-axis">
        <span>{x0}</span>
        <span className="me">분홍 띠 = 내 인생 ({born}–{end})</span>
        <span>{x1}</span>
      </div>
      <div className="dc-src">📊 {src}</div>
    </figure>
  );
}

export function DataSheet({ s }: { s: GameState }) {
  const p = s.player;
  const ct = (p.country ?? 'KR') as CountryId;
  const c = countryOf(ct);
  const born = p.birthYear;
  const now = Math.floor(s.time);
  const lifeEnd = Math.round(born + lifeExpAt(c, born));
  const app = playerAppearance({ ...p, country: p.country });

  const births = useMemo(() => Array.from({ length: 75 }, (_, i) => 1950 + i).map((y) => [y, birthsIn(y)] as [number, number]), []);
  const le = useMemo(() => Array.from({ length: 81 }, (_, i) => 1950 + i).map((y) => [y, lifeExpAt(c, y)] as [number, number]), [c]);
  const wage = useMemo(() => Array.from({ length: 71 }, (_, i) => 1960 + i).map((y) => [y, Math.round(minWage(y) * c.wageMul)] as [number, number]), [c]);
  const mediaRows = Object.values(MEDIA)
    .filter((m) => m.from[ct] < 2200)
    .map((m) => ({ label: m.label, from: m.from[ct], to: m.until?.[ct], note: m.note }))
    .sort((a, b) => a.from - b.from);
  const genreRows = GENRES.map((g) => ({ label: GENRE_ERAS[g].label, from: genreNamedIn(g, ct), note: GENRE_ERAS[g].note })).sort((a, b) => a.from - b.from);
  const twenties = useMemo(() => {
    const seen = new Map<string, number>();
    for (let y = born + 18; y <= born + 30; y++) for (const b of bandsAt(ct, y)) if (!seen.has(b.name)) seen.set(b.name, y);
    return [...seen.entries()].slice(0, 14);
  }, [born, ct]);
  const ledgers = s.ledgers.slice(-12);
  const bar0 = incomeBar(s.player.country, s.time);
  const maxMoney = Math.max(1, ...ledgers.map((l) => Math.max(l.music - l.cost, incomeBar(s.player.country, l.year).value)));

  return (
    <div className="datasheet">
      <p className="ds-intro">
        이 게임의 숫자는 실제 통계와 그 근사에서 온다. 분홍은 <b>나</b>, 파랑은 <b>세상</b>이다.
      </p>

      {ct === 'KR' ? (
        <LineChart
          title="내가 태어난 해의 아기들"
          sub={`${born}년에 태어난 아기 약 ${Math.round(birthsIn(born) / 10000).toLocaleString()}만 명`}
          points={births}
          fmt={(v) => `${Math.round(v / 10000)}만`}
          marks={[{ x: born, label: '나' }]}
          src="통계청 인구동향조사 출생아 수 (1950년대는 추계) [근사]"
        />
      ) : (
        <div className="ds-tile">
          <span>{c.name}의 한 해 출생아</span>
          <b>{Math.round(c.births / 10000).toLocaleString()}만 명</b>
          <small>각국 공식 통계 반올림 [근사]</small>
        </div>
      )}

      <LineChart
        title="태어난 해의 기대수명"
        sub={`${born}년생 기대수명 ${lifeExpAt(c, born)}세 · 지금 ${Math.max(0, now - born)}세`}
        points={le}
        fmt={(v) => `${Math.round(v)}세`}
        marks={[{ x: born, label: '나' }]}
        band={[born, Math.min(now, lifeEnd)]}
        src={ct === 'KR' ? '통계청 생명표 · UN 추계 [근사]' : 'UN 세계인구전망 [근사]'}
      />

      <LineChart
        title={hasMinWage(c, born + 16) ? '최저시급의 흐름' : '시급의 흐름'}
        sub={`열여섯 살 ${born + 16}년의 시급 약 ${moneyAt(minWage(born + 16) * c.wageMul, born + 16, c.id)}${hasMinWage(c, born + 16) ? '' : ' (최저임금제 이전 추정)'}`}
        points={wage}
        fmt={(v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}만` : `${Math.round(v).toLocaleString()}`)}
        marks={[{ x: born + 16, label: '16세' }]}
        band={[born + 16, Math.min(now, lifeEnd)]}
        src={`${ct === 'KR' ? '최저임금위원회 고시' : `한국 최저임금 × ${c.name} 임금 배율`} · 원화 환산 [근사]`}
      />

      <Timeline title="매체는 언제부터 있었나" sub={`스무 살(${born + 20}년)에 쓸 수 있던 것: ${mediaRows.filter((m) => m.from <= born + 20 && (!m.to || m.to > born + 20)).map((m) => m.label).join(', ') || '라디오'}`} rows={mediaRows} born={born} end={Math.min(now, lifeEnd)} src="data/era/media.json — 보급이 시작된 해의 근사값" />

      <Timeline title="장르 이름은 언제 생겼나" sub={`${c.name}에서 그 이름으로 불리기 시작한 해 (그 전엔 조상 이름으로 부른다)`} rows={genreRows} born={born} end={Math.min(now, lifeEnd)} src="data/era/genres.json — 음악사 서술의 통상적 구분 [근사]" />

      <figure className="dchart">
        <figcaption>
          <b>내 스무 살 무렵 활동하던 밴드</b>
          <span>{born + 18}–{born + 30}년 {c.name}</span>
        </figcaption>
        <div className="ds-chips">
          {twenties.length ? twenties.map(([n, y]) => <span key={n}>{n} <em>{styleOf(n)} · {y}</em></span>) : <span className="dim">이 시기 데이터에 있는 밴드가 없다</span>}
        </div>
        <div className="dc-src">📊 data/era/bands.json — 활동 기간 [근사]</div>
      </figure>

      <figure className="dchart">
        <figcaption>
          <b>음악으로 번 돈 vs {bar0.short}</b>
          <span>해마다 음악 순수입(수입−지출)과 {bar0.label}{bar0.kind === '통계' ? '(「예술인 실태조사」, 그 해 물가 환산)' : '(그 해 기준)'}</span>
        </figcaption>
        {ledgers.length ? (
          <div className="ds-bars">
            {ledgers.map((l) => {
              const mine = l.music - l.cost;
              const avg = incomeBar(s.player.country, l.year).value;
              return (
                <div key={l.year} className="ds-bar" title={`${l.year}년: 나 ${moneyAt(mine, l.year, s.player.country)} · 평균 ${moneyAt(avg, l.year, s.player.country)}`}>
                  <span className="b me" style={{ height: `${(Math.max(0, mine) / maxMoney) * 100}%` }} />
                  <span className="b avg" style={{ height: `${(avg / maxMoney) * 100}%` }} />
                  <em>{String(l.year).slice(2)}</em>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dim">아직 결산한 해가 없다 (스무 살부터 해마다 결산한다)</div>
        )}
        <div className="ds-legend">
          <span><i className="me" /> 나의 음악 순수입</span>
          <span><i className="avg" /> {bar0.short} {won(bar0.value)}</span>
        </div>
        <div className="dc-src">📊 {bar0.src}</div>
      </figure>

      <div className="ds-tile">
        <span>물려받은 키</span>
        <b>{app.height}cm</b>
        <small>
          {born}년생 {p.gender === 'm' ? '남성' : '여성'} 평균 {Math.round(meanHeight(ct, p.gender, born) * 10) / 10}cm — {app.height >= meanHeight(ct, p.gender, born) ? '평균보다 크다' : '평균보다 작다'} · NCD-RisC 추세 [근사]
        </small>
      </div>
    </div>
  );
}
