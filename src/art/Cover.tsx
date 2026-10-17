// 생성형 앨범 커버. coverSeed + 장르 팔레트로 매번 다른, 그러나 재현 가능한 추상 아트.

import { memo } from 'react';
import { Rng } from '../sim/rng';
import type { Genre } from '../sim/types';
import { GENRE_INFO } from '../sim/data/world';

interface Props {
  seed: number;
  genre: Genre;
  title: string;
  artist: string;
  size?: number;
  spin?: boolean;
}

export const Cover = memo(function Cover({ seed, genre, title, artist, size = 120 }: Props) {
  const r = new Rng(seed);
  const g = GENRE_INFO[genre];
  const style = r.int(0, 4);
  const bgDark = r.chance(0.55);
  const bg = bgDark ? '#111018' : '#f1ece2';
  const ink = bgDark ? '#f6f3ee' : '#15131c';
  const id = `cv${seed % 1_000_000}`;
  const shapes = [];
  switch (style) {
    case 0: // 동심원
      for (let i = 6; i > 0; i--) shapes.push(<circle key={i} cx={r.range(40, 60)} cy={r.range(40, 60)} r={i * 7} fill={i % 2 ? g.color : g.color2} opacity={0.85} />);
      break;
    case 1: // 줄무늬
      for (let i = 0; i < 9; i++) shapes.push(<rect key={i} x="0" y={i * 11 + r.range(-2, 2)} width="100" height={r.range(3, 8)} fill={i % 3 ? g.color : g.color2} transform={`rotate(${r.range(-20, 20)} 50 50)`} />);
      break;
    case 2: // 흩어진 점
      for (let i = 0; i < 40; i++) shapes.push(<circle key={i} cx={r.range(0, 100)} cy={r.range(0, 100)} r={r.range(1, 8)} fill={r.chance(0.5) ? g.color : g.color2} opacity={r.range(0.4, 1)} />);
      break;
    case 3: // 큰 도형 + 그림자
      shapes.push(<rect key="s" x="22" y="22" width="56" height="56" fill={g.color2} transform={`rotate(${r.range(0, 45)} 50 50)`} />);
      shapes.push(<circle key="c" cx={r.range(35, 65)} cy={r.range(35, 65)} r="22" fill={g.color} style={{ mixBlendMode: 'multiply' }} />);
      break;
    default: // 수평선 + 해
      shapes.push(<circle key="sun" cx="50" cy={r.range(40, 60)} r="20" fill={g.color} />);
      for (let i = 0; i < 6; i++) shapes.push(<rect key={i} x="0" y={62 + i * 6} width="100" height={2 + i * 0.6} fill={bg} />);
      shapes.push(<rect key="sea" x="0" y="64" width="100" height="36" fill={g.color2} opacity="0.5" />);
  }
  return (
    <svg className="cover" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${artist} — ${title}`}>
      <defs>
        <filter id={`${id}n`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed % 100} />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={bg} />
      {shapes}
      <rect width="100" height="100" filter={`url(#${id}n)`} />
      <text x="6" y="92" fontSize="6.5" fontWeight="900" fill={ink} style={{ fontFamily: 'Black Han Sans, Noto Sans KR, sans-serif' }}>
        {title.length > 16 ? title.slice(0, 15) + '…' : title}
      </text>
      <text x="6" y="10" fontSize="4.6" fill={ink} opacity="0.85" letterSpacing="0.6">
        {artist.toUpperCase().slice(0, 22)}
      </text>
    </svg>
  );
});
