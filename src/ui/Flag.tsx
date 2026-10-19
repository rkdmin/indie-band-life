// 나라 국기 — 이모지 국기는 윈도우에서 ‘KR’ 같은 글자로 깨져서, 어디서나 같게 보이도록 직접 그린다 (단순화한 SVG).

import type { CountryId } from '../sim/data/countries';

type Code = CountryId | 'GLOBAL';

function Body({ c }: { c: Code }) {
  switch (c) {
    case 'KR':
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          <g transform="translate(15 10)">
            <circle r="5" fill="#0047a0" />
            <path d="M-5 0a5 5 0 0 1 10 0a2.5 2.5 0 0 1-5 0a2.5 2.5 0 0 0-5 0z" fill="#cd2e3a" transform="rotate(33.7)" />
          </g>
          {/* 사괘 — 왼쪽 위 건(☰)·오른쪽 위 감(☵)·왼쪽 아래 리(☲)·오른쪽 아래 곤(☷) */}
          <g fill="#000">
            <g transform="translate(6.2 4.4) rotate(-56.3)"><rect x="-2.5" y="-1.6" width="5" height="0.8" /><rect x="-2.5" y="-0.4" width="5" height="0.8" /><rect x="-2.5" y="0.8" width="5" height="0.8" /></g>
            <g transform="translate(23.8 15.6) rotate(-56.3)"><rect x="-2.5" y="-1.6" width="2.2" height="0.8" /><rect x="0.3" y="-1.6" width="2.2" height="0.8" /><rect x="-2.5" y="-0.4" width="2.2" height="0.8" /><rect x="0.3" y="-0.4" width="2.2" height="0.8" /><rect x="-2.5" y="0.8" width="2.2" height="0.8" /><rect x="0.3" y="0.8" width="2.2" height="0.8" /></g>
            <g transform="translate(6.2 15.6) rotate(56.3)"><rect x="-2.5" y="-1.6" width="5" height="0.8" /><rect x="-2.5" y="-0.4" width="2.2" height="0.8" /><rect x="0.3" y="-0.4" width="2.2" height="0.8" /><rect x="-2.5" y="0.8" width="5" height="0.8" /></g>
            <g transform="translate(23.8 4.4) rotate(56.3)"><rect x="-2.5" y="-1.6" width="2.2" height="0.8" /><rect x="0.3" y="-1.6" width="2.2" height="0.8" /><rect x="-2.5" y="-0.4" width="5" height="0.8" /><rect x="-2.5" y="0.8" width="2.2" height="0.8" /><rect x="0.3" y="0.8" width="2.2" height="0.8" /></g>
          </g>
        </>
      );
    case 'JP':
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          <circle cx="15" cy="10" r="6" fill="#bc002d" />
        </>
      );
    case 'US':
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          {Array.from({ length: 7 }, (_, i) => <rect key={i} y={i * (20 / 6.5)} width="30" height={20 / 13} fill="#b22234" />)}
          <rect width="12" height={20 * 7 / 13} fill="#3c3b6e" />
          {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={1.6 + (i % 4) * 2.9} cy={1.6 + Math.floor(i / 4) * 3.4} r="0.55" fill="#fff" />)}
        </>
      );
    case 'UK':
      return (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.4" />
          <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
          <path d="M15 0V20M0 10H30" stroke="#c8102e" strokeWidth="3.4" />
        </>
      );
    case 'DE':
      return (
        <>
          <rect width="30" height="7" fill="#000" />
          <rect y="6.66" width="30" height="7" fill="#dd0000" />
          <rect y="13.33" width="30" height="6.67" fill="#ffce00" />
        </>
      );
    case 'BR':
      return (
        <>
          <rect width="30" height="20" fill="#009c3b" />
          <path d="M15 2L27.5 10L15 18L2.5 10Z" fill="#ffdf00" />
          <circle cx="15" cy="10" r="4.4" fill="#002776" />
          <path d="M10.8 9.2Q15 8 19.2 10.6" stroke="#fff" strokeWidth="0.8" fill="none" />
        </>
      );
    default:
      return (
        <>
          <rect width="30" height="20" fill="#2357e6" />
          <circle cx="15" cy="10" r="7" fill="none" stroke="#fff" strokeWidth="1" />
          <ellipse cx="15" cy="10" rx="3" ry="7" fill="none" stroke="#fff" strokeWidth="0.8" />
          <path d="M8 10H22M9 6.5H21M9 13.5H21" stroke="#fff" strokeWidth="0.7" />
        </>
      );
  }
}

const NAME: Record<Code, string> = { KR: '대한민국', JP: '일본', US: '미국', UK: '영국', DE: '독일', BR: '브라질', GLOBAL: '세계' };

export function Flag({ c, size = 18, className }: { c: Code; size?: number; className?: string }) {
  return (
    <svg className={`flag ${className ?? ''}`} viewBox="0 0 30 20" width={size * 1.5} height={size} role="img" aria-label={NAME[c]}>
      <title>{NAME[c]}</title>
      <Body c={c} />
    </svg>
  );
}
