// 레이어드 SVG 장면 + CSS 애니메이션. 배경·중경·인물·빛 4개 층 (기획서 7장 에셋 규칙).
// 저사양/모션 축소 설정에서는 CSS 가 애니메이션을 끈다 (prefers-reduced-motion + .calm).

import { memo, type ReactNode } from 'react';
import type { Gender, SceneId } from '../sim/types';
import { Avatar } from './Avatar';
import { Rng } from '../sim/rng';

export interface ScenePerson {
  look: number;
  gender: Gender;
  age: number;
  mood?: number;
  military?: boolean;
  inst?: string;
}

interface Props {
  id: SceneId;
  people?: ScenePerson[];
  crowd?: number; // 0~1 관객 밀도
  night?: boolean;
  seed?: number;
  caption?: string;
}

const W = 400;
const H = 230;

export const Scene = memo(function Scene({ id, people = [], crowd = 0, night, seed = 1, caption }: Props) {
  const rng = new Rng(seed);
  const bg = BACKDROPS[id] ?? BACKDROPS.home;
  const stageLike = id === 'club' || id === 'festival' || id === 'arena' || id === 'stage_old';
  const lineY = stageLike ? 118 : 132;
  const shown = people.slice(0, stageLike ? 5 : 3);
  const size = shown.length > 3 ? 62 : 74;
  const gap = shown.length > 3 ? 66 : 84;
  const startX = W / 2 - ((shown.length - 1) * gap) / 2 - size / 2;
  return (
    <div className={`scene scene-${id}`} role="img" aria-label={caption ?? id}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="fadeB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="spot" cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="blur6">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <pattern id="foam" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 8 L8 0 L16 8 L8 16 Z" fill="#00000030" />
          </pattern>
        </defs>
        {bg(rng, !!night, crowd)}
        <g className="people">
          {shown.map((p, i) => (
            <g key={i} className={stageLike ? 'bob' : 'breathe'} style={{ animationDelay: `${i * 0.21}s` }}>
              <Avatar look={p.look} gender={p.gender} age={p.age} mood={p.mood} military={p.military} size={size} x={startX + i * gap} y={lineY - (i === 0 && !stageLike ? 4 : 0)} />
              {p.inst && <text x={startX + i * gap + size / 2} y={lineY + size + 12} textAnchor="middle" className="inst-tag">{p.inst}</text>}
            </g>
          ))}
        </g>
        {stageLike && crowdLayer(rng, crowd, id)}
        <rect width={W} height={H} fill="url(#fadeB)" />
      </svg>
      {caption && <div className="scene-caption">{caption}</div>}
    </div>
  );
});

type Backdrop = (rng: Rng, night: boolean, crowd: number) => ReactNode;

const stars = (rng: Rng, n: number, maxY = 120) => (
  <g>
    {Array.from({ length: n }, (_, i) => (
      <circle key={i} className="twinkle" style={{ animationDelay: `${rng.range(0, 3)}s` }} cx={rng.range(0, W)} cy={rng.range(0, maxY)} r={rng.range(0.6, 1.6)} fill="#fff" />
    ))}
  </g>
);

const notes = (rng: Rng, n: number, color = '#fff') => (
  <g>
    {Array.from({ length: n }, (_, i) => (
      <text key={i} className="float-note" style={{ animationDelay: `${rng.range(0, 6)}s`, animationDuration: `${rng.range(5, 9)}s` }} x={rng.range(20, W - 20)} y={rng.range(120, 210)} fontSize={rng.range(12, 20)} fill={color} opacity="0.7">
        {rng.pick(['♪', '♫', '♩', '♬'])}
      </text>
    ))}
  </g>
);

const cityline = (rng: Rng, y: number, color: string, lit = true) => {
  let x = -10;
  const out: ReactNode[] = [];
  let k = 0;
  while (x < W + 10) {
    const w = rng.range(22, 48);
    const h = rng.range(30, 90);
    out.push(<rect key={`b${k}`} x={x} y={y - h} width={w} height={h + 40} fill={color} />);
    if (lit)
      for (let wy = y - h + 8; wy < y - 6; wy += 10)
        for (let wx = x + 4; wx < x + w - 6; wx += 9)
          if (rng.chance(0.3)) out.push(<rect key={`w${k}_${wx}_${wy}`} className={rng.chance(0.1) ? 'flicker' : undefined} x={wx} y={wy} width="4" height="5" fill="#ffd98a" opacity="0.75" />);
    x += w + rng.range(0, 6);
    k++;
  }
  return <g>{out}</g>;
};

const beams = (colors: string[], y = 0) => (
  <g style={{ mixBlendMode: 'screen' }}>
    {colors.map((c, i) => (
      <polygon key={i} className="beam" style={{ transformOrigin: `${80 + i * (240 / Math.max(1, colors.length - 1))}px ${y}px`, animationDelay: `${i * 0.7}s` }} points={`${80 + i * (240 / Math.max(1, colors.length - 1))},${y} ${40 + i * 90},230 ${120 + i * 90},230`} fill={c} opacity="0.28" />
    ))}
  </g>
);

function crowdLayer(rng: Rng, density: number, id: SceneId) {
  const n = Math.round(6 + density * (id === 'club' ? 26 : 46));
  const heads: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = rng.range(-10, W + 10);
    const row = rng.next();
    const y = 196 + row * 26;
    const r = 9 + row * 5;
    const lit = id === 'arena' && rng.chance(0.5);
    heads.push(
      <g key={i} className="jump" style={{ animationDelay: `${rng.range(0, 1)}s`, animationDuration: `${rng.range(0.45, 0.65)}s` }}>
        <circle cx={x} cy={y} r={r} fill="#0b0b12" />
        <rect x={x - r * 1.1} y={y + r * 0.6} width={r * 2.2} height={30} rx={r * 0.8} fill="#0b0b12" />
        {rng.chance(0.3 + density * 0.3) && <line x1={x + r * 0.6} y1={y} x2={x + r * 1.6} y2={y - r * 2.2} stroke="#0b0b12" strokeWidth="4" strokeLinecap="round" />}
        {lit && <circle className="twinkle" cx={x + r * 1.6} cy={y - r * 2.4} r="3.2" fill={rng.pick(['#ff9ed2', '#5ad1ff', '#ffd166', '#a98bff'])} />}
      </g>,
    );
  }
  return <g>{heads}</g>;
}

const BACKDROPS: Record<SceneId, Backdrop> = {
  nursery: (rng) => (
    <g>
      <rect width={W} height={H} fill="#ffd9e2" />
      <rect y="150" width={W} height="80" fill="#f5c1cf" />
      <rect x="290" y="30" width="80" height="70" rx="6" fill="#2a2850" />
      <circle cx="342" cy="56" r="14" fill="#fff5c9" />
      <circle cx="348" cy="52" r="12" fill="#2a2850" />
      <g transform="translate(290 30) scale(0.2 0.3)">{stars(rng, 10, 220)}</g>
      <g className="spin-slow" style={{ transformOrigin: '110px 40px' }}>
        <line x1="110" y1="0" x2="110" y2="40" stroke="#b07" strokeWidth="2" />
        <line x1="80" y1="40" x2="140" y2="40" stroke="#b07" strokeWidth="2" />
        <circle cx="80" cy="52" r="7" fill="#ffd166" />
        <path d="M140 46 l6 8 h-12 z" fill="#5ad1ff" />
        <rect x="104" y="48" width="12" height="12" fill="#a98bff" />
      </g>
      <rect x="40" y="120" width="140" height="70" rx="10" fill="#fff" stroke="#e7a9bb" strokeWidth="4" />
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1={52 + i * 16} y1="122" x2={52 + i * 16} y2="188" stroke="#e7a9bb" strokeWidth="3" />)}
      {notes(rng, 6, '#c45b85')}
    </g>
  ),
  home: (rng, night) => (
    <g>
      <rect width={W} height={H} fill={night ? '#2b2440' : '#efe3d3'} />
      <rect x="230" y="22" width="140" height="100" rx="4" fill={night ? '#121530' : '#9fd3ff'} />
      {night ? <g transform="translate(230 22) scale(0.35 0.4)">{stars(rng, 18, 200)}</g> : <circle cx="330" cy="50" r="14" fill="#fff3a8" />}
      <g transform="translate(230 70)">{cityline(rng, 52, night ? '#1d1f3b' : '#7aa3c9', night)}</g>
      <rect x="226" y="18" width="148" height="108" fill="none" stroke="#5a4636" strokeWidth="6" />
      <line x1="300" y1="18" x2="300" y2="126" stroke="#5a4636" strokeWidth="4" />
      <rect y="168" width={W} height="62" fill={night ? '#3a2f4f' : '#c9a982'} />
      <rect x="30" y="30" width="60" height="80" fill="#ff7a59" opacity="0.85" transform="rotate(-4 60 70)" />
      <text x="60" y="76" textAnchor="middle" fontSize="11" fill="#fff" transform="rotate(-4 60 70)" fontWeight="900">LIVE</text>
      <g transform="translate(110 118)">
        <rect width="70" height="50" rx="4" fill="#3d2e25" />
        <g className="spin" style={{ transformOrigin: '35px 20px' }}>
          <circle cx="35" cy="20" r="18" fill="#111" />
          <circle cx="35" cy="20" r="6" fill="#ff7a59" />
          <line x1="35" y1="4" x2="35" y2="10" stroke="#333" />
        </g>
      </g>
      <circle className="glow" cx="200" cy="90" r="40" fill="#ffd98a" opacity={night ? 0.2 : 0.06} filter="url(#blur6)" />
      {notes(rng, 3, night ? '#ffd98a' : '#8b5e3c')}
    </g>
  ),
  classroom: (rng) => (
    <g>
      <rect width={W} height={H} fill="#f3ead8" />
      <rect x="20" y="20" width="220" height="100" fill="#2f5d46" stroke="#a87b4f" strokeWidth="6" />
      <g stroke="#e9f5ec" strokeWidth="1.2" opacity="0.8">
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="34" x2="226" y1={44 + i * 8} y2={44 + i * 8} />)}
      </g>
      <text x="70" y="70" fill="#fff" fontSize="22">♩ ♪ ♫</text>
      <text x="40" y="104" fill="#fff" fontSize="11" opacity="0.8">오늘의 숙제: 좋아하는 노래 한 곡</text>
      <rect x="270" y="20" width="110" height="110" fill="#bfe6ff" />
      <g className="drift">
        <ellipse cx="300" cy="50" rx="22" ry="8" fill="#fff" />
        <ellipse cx="350" cy="80" rx="18" ry="6" fill="#fff" />
      </g>
      <rect x="266" y="16" width="118" height="118" fill="none" stroke="#a87b4f" strokeWidth="5" />
      {Array.from({ length: 10 }, (_, i) => (
        <text key={i} className="petal" style={{ animationDelay: `${rng.range(0, 6)}s`, animationDuration: `${rng.range(6, 10)}s` }} x={rng.range(260, 390)} y="20" fontSize="9" fill="#ffb7c9">❀</text>
      ))}
      <rect y="170" width={W} height="60" fill="#c8a679" />
      {[40, 150, 260].map((x) => <rect key={x} x={x} y="178" width="90" height="10" rx="2" fill="#8a6440" />)}
    </g>
  ),
  musicroom: (rng) => (
    <g>
      <rect width={W} height={H} fill="#3a2a35" />
      <rect y="160" width={W} height="70" fill="#5b3d2e" />
      <g transform="translate(20 70)">
        <rect width="120" height="80" rx="4" fill="#111" />
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={6 + i * 8} y="56" width="7" height="22" fill="#fafafa" />)}
        {[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map((i) => <rect key={i} x={11 + i * 8} y="56" width="4" height="13" fill="#111" />)}
      </g>
      <g transform="translate(280 100)">
        <circle cx="40" cy="50" r="30" fill="#c0392b" stroke="#eee" strokeWidth="3" />
        <ellipse cx="0" cy="20" rx="18" ry="5" fill="#d4af37" className="wobble" />
        <ellipse cx="86" cy="14" rx="20" ry="5" fill="#d4af37" className="wobble" style={{ animationDelay: '0.4s' }} />
        <rect x="-6" y="34" width="22" height="20" rx="3" fill="#c0392b" />
      </g>
      <rect x="170" y="24" width="70" height="90" fill="#a98bff" opacity="0.7" />
      <text x="205" y="70" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">밴드부</text>
      <text x="205" y="84" textAnchor="middle" fill="#fff" fontSize="8">신입 모집</text>
      <circle cx="200" cy="10" r="90" fill="url(#spot)" opacity="0.5" />
      {notes(rng, 4, '#ffd166')}
    </g>
  ),
  street: (rng) => (
    <g>
      <rect width={W} height={H} fill="#141632" />
      {stars(rng, 12, 60)}
      {cityline(rng, 140, '#22244a')}
      {cityline(rng, 160, '#2d2f5c')}
      <g className="neon-flicker">
        <rect x="40" y="70" width="70" height="22" rx="4" fill="none" stroke="#ff4fa0" strokeWidth="2.5" />
        <text x="75" y="86" textAnchor="middle" fill="#ff8cc6" fontSize="12" fontWeight="900">라이브</text>
      </g>
      <g className="neon-flicker" style={{ animationDelay: '1.3s' }}>
        <rect x="290" y="60" width="74" height="22" rx="4" fill="none" stroke="#5ad1ff" strokeWidth="2.5" />
        <text x="327" y="76" textAnchor="middle" fill="#9be6ff" fontSize="12" fontWeight="900">합주실</text>
      </g>
      <rect y="175" width={W} height="55" fill="#1d1d2b" />
      <g>
        {[60, 340].map((x) => (
          <g key={x}>
            <rect x={x} y="80" width="4" height="96" fill="#333" />
            <circle className="glow" cx={x + 2} cy="80" r="26" fill="#ffd98a" opacity="0.22" filter="url(#blur6)" />
            <circle cx={x + 2} cy="80" r="5" fill="#ffe7b0" />
          </g>
        ))}
      </g>
      <g className="walk">
        <circle cx="0" cy="168" r="6" fill="#0a0a14" />
        <rect x="-6" y="174" width="12" height="22" rx="5" fill="#0a0a14" />
      </g>
      {notes(rng, 4, '#ffd98a')}
    </g>
  ),
  studio: (rng) => (
    <g>
      <rect width={W} height={H} fill="#3b3f4f" />
      <rect width={W} height="160" fill="url(#foam)" />
      <rect x="160" y="14" width="80" height="20" rx="4" fill="#3a0f0f" />
      <text className="blink-light" x="200" y="28" textAnchor="middle" fill="#ff4d4d" fontSize="11" fontWeight="900">● REC</text>
      <rect y="165" width={W} height="65" fill="#2a2633" />
      <g transform="translate(26 110)">
        <rect width="70" height="60" rx="4" fill="#1b1b1b" />
        <rect x="6" y="6" width="58" height="14" fill="#c8b48a" />
        <circle cx="35" cy="40" r="15" fill="#333" stroke="#555" />
      </g>
      <g transform="translate(300 116)">
        <rect width="70" height="56" rx="4" fill="#1b1b1b" />
        <circle cx="35" cy="28" r="20" fill="#2b2b2b" stroke="#555" />
      </g>
      <circle cx="200" cy="0" r="160" fill="url(#spot)" opacity="0.25" />
      {notes(rng, 3, '#9be6ff')}
    </g>
  ),
  club: (_rng, _n, crowd) => (
    <g>
      <rect width={W} height={H} fill="#120c1f" />
      <rect x="0" y="0" width={W} height="40" fill="#0a0712" />
      {[60, 140, 260, 340].map((x, i) => <circle key={x} className="blink-light" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy="30" r="5" fill={['#ff4fa0', '#5ad1ff', '#ffd166', '#a98bff'][i]} />)}
      {beams(['#ff4fa0', '#a98bff', '#5ad1ff', '#ffd166'], 28)}
      <rect y="176" width={W} height="20" fill="#2b1f3f" />
      <rect x="0" y="170" width={W} height="6" fill="#4a3a66" />
      <circle className="haze" cx="200" cy="150" r="140" fill="#a98bff" opacity={0.08 + crowd * 0.08} filter="url(#blur6)" />
    </g>
  ),
  festival: (rng, _n, crowd) => (
    <g>
      <defs>
        <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2a6b" />
          <stop offset="0.55" stopColor="#ff7a59" />
          <stop offset="1" stopColor="#ffd166" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sunset)" />
      <circle cx="320" cy="120" r="34" fill="#fff1b8" opacity="0.85" />
      <g stroke="#1a1426" strokeWidth="5">
        <line x1="40" y1="20" x2="40" y2="180" />
        <line x1="360" y1="20" x2="360" y2="180" />
        <line x1="36" y1="22" x2="364" y2="22" />
      </g>
      {[80, 150, 250, 320].map((x, i) => <circle key={x} className="blink-light" style={{ animationDelay: `${i * 0.25}s` }} cx={x} cy="30" r="6" fill="#fff" />)}
      {beams(['#ffffff', '#ffd166', '#ff9ed2'], 30)}
      {Array.from({ length: Math.round(10 + crowd * 20) }, (_, i) => (
        <rect key={i} className="confetti" style={{ animationDelay: `${rng.range(0, 4)}s`, animationDuration: `${rng.range(3, 6)}s` }} x={rng.range(0, W)} y="-10" width="4" height="7" fill={rng.pick(['#ff4fa0', '#5ad1ff', '#ffd166', '#73e2c5', '#fff'])} />
      ))}
      <rect y="176" width={W} height="54" fill="#22182e" />
    </g>
  ),
  arena: (rng) => (
    <g>
      <rect width={W} height={H} fill="#07060d" />
      {stars(rng, 60, 170)}
      {beams(['#5ad1ff', '#ff4fa0', '#ffffff', '#a98bff', '#ffd166'], 10)}
      <rect y="176" width={W} height="54" fill="#120f1c" />
    </g>
  ),
  recording: (rng) => (
    <g>
      <rect width={W} height={H} fill="#1d2230" />
      <rect x="220" y="20" width="160" height="110" rx="6" fill="#273049" stroke="#4b5878" strokeWidth="3" />
      <g transform="translate(250 50)">
        <circle cx="50" cy="20" r="14" fill="#555" />
        <rect x="47" y="34" width="6" height="40" fill="#777" />
      </g>
      <rect y="150" width={W} height="80" fill="#151925" />
      <g transform="translate(20 150)">
        <rect width="190" height="40" rx="4" fill="#2b2f3f" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} className="meter" style={{ animationDelay: `${rng.range(0, 1)}s`, transformOrigin: `${10 + i * 15}px 34px` }} x={6 + i * 15} y="6" width="8" height="28" fill={i > 9 ? '#ff4d4d' : i > 7 ? '#ffd166' : '#73e2c5'} />
        ))}
      </g>
      <path className="wave" d="M20 120 Q40 100 60 120 T100 120 T140 120 T180 120" fill="none" stroke="#73e2c5" strokeWidth="2" />
    </g>
  ),
  hospital: () => (
    <g>
      <rect width={W} height={H} fill="#dfeef2" />
      <rect x="250" y="24" width="120" height="90" fill="#bfe6ff" stroke="#9fb7c0" strokeWidth="5" />
      <rect y="170" width={W} height="60" fill="#c6d8dc" />
      <rect x="30" y="140" width="180" height="40" rx="8" fill="#fff" stroke="#b9cdd3" strokeWidth="3" />
      <g transform="translate(40 30)">
        <rect width="110" height="60" rx="6" fill="#16222b" />
        <path className="ecg" d="M6 34 L30 34 L36 18 L42 48 L48 34 L104 34" fill="none" stroke="#73e2c5" strokeWidth="2" />
      </g>
    </g>
  ),
  military: (rng) => (
    <g>
      <rect width={W} height={H} fill="#2c3a2b" />
      {stars(rng, 20, 80)}
      <path d="M0 140 L70 70 L130 120 L210 50 L290 120 L340 90 L400 130 L400 230 L0 230 Z" fill="#1d271c" />
      <rect y="170" width={W} height="60" fill="#3b4a35" />
      <rect x="40" y="120" width="140" height="56" fill="#5b6b4a" />
      <rect x="40" y="112" width="140" height="10" fill="#4a5a3a" />
      <g className="wave-flag" style={{ transformOrigin: '320px 70px' }}>
        <line x1="320" y1="70" x2="320" y2="170" stroke="#999" strokeWidth="3" />
        <rect x="320" y="70" width="40" height="24" fill="#eee" />
      </g>
    </g>
  ),
  office: () => (
    <g>
      <rect width={W} height={H} fill="#d9dde3" />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x="250" y={20 + i * 9} width="130" height="5" fill="#b7bec8" />)}
      <rect x="10" y="0" width={W - 20} height="6" fill="#fff" className="flicker" />
      <rect y="160" width={W} height="70" fill="#a7adb6" />
      {[30, 140].map((x) => (
        <g key={x} transform={`translate(${x} 100)`}>
          <rect width="90" height="56" rx="3" fill="#20242c" />
          <rect x="4" y="4" width="82" height="44" fill="#3d6fb6" opacity="0.8" />
          <rect x="40" y="56" width="10" height="10" fill="#555" />
        </g>
      ))}
      <circle cx="210" cy="40" r="16" fill="#fff" stroke="#333" strokeWidth="2" />
      <line className="clock" style={{ transformOrigin: '210px 40px' }} x1="210" y1="40" x2="210" y2="28" stroke="#333" strokeWidth="2" />
    </g>
  ),
  rooftop: (rng) => (
    <g>
      <rect width={W} height={H} fill="#0f1230" />
      {stars(rng, 40, 120)}
      <circle cx="80" cy="50" r="16" fill="#fff5c9" />
      {cityline(rng, 175, '#1b1e44')}
      <rect y="170" width={W} height="60" fill="#2a2d4a" />
      <path d="M0 40 Q100 70 200 46 T400 52" fill="none" stroke="#444" />
      {Array.from({ length: 14 }, (_, i) => <circle key={i} className="twinkle" style={{ animationDelay: `${i * 0.2}s` }} cx={i * 30 + 10} cy={46 + Math.sin(i) * 8} r="3" fill="#ffd98a" />)}
      <rect x="310" y="110" width="50" height="62" rx="4" fill="#3b3f6a" />
    </g>
  ),
  pub: () => (
    <g>
      <rect width={W} height={H} fill="#3b2219" />
      <rect y="0" width={W} height="20" fill="#2a160f" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} className="twinkle" style={{ animationDelay: `${i * 0.25}s` }} cx={i * 36 + 12} cy={26 + (i % 2) * 6} r="4" fill="#ffcf7a" />)}
      <rect y="168" width={W} height="62" fill="#5a3426" />
      {[50, 200, 320].map((x) => (
        <g key={x} transform={`translate(${x} 160)`}>
          <ellipse cx="20" cy="0" rx="40" ry="8" fill="#7a4a35" />
          <rect x="5" y="-18" width="8" height="16" rx="2" fill="#f3c34b" opacity="0.85" />
          <rect x="22" y="-14" width="7" height="12" rx="2" fill="#2e8b57" />
        </g>
      ))}
      <circle className="glow" cx="200" cy="80" r="80" fill="#ffb26b" opacity="0.15" filter="url(#blur6)" />
    </g>
  ),
  stage_old: (rng) => (
    <g>
      <rect width={W} height={H} fill="#0b0a10" />
      <polygon points="200,0 120,230 280,230" fill="#fff" opacity="0.14" />
      <ellipse cx="200" cy="200" rx="90" ry="14" fill="#fff" opacity="0.12" />
      {Array.from({ length: 24 }, (_, i) => (
        <circle key={i} className="dust" style={{ animationDelay: `${rng.range(0, 6)}s` }} cx={rng.range(150, 250)} cy={rng.range(20, 200)} r={rng.range(0.6, 1.4)} fill="#fff" opacity="0.6" />
      ))}
      <line x1="140" y1="150" x2="140" y2="210" stroke="#444" strokeWidth="3" />
      <circle cx="140" cy="148" r="5" fill="#666" />
    </g>
  ),
};
