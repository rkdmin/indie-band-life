// 결정적 SVG 아바타. 같은 look 시드 → 평생 같은 얼굴 특징, 나이에 따라 체형·머리색만 변한다.
// 실존 인물 이미지는 쓰지 않는다 (가상 캐릭터만).

import { Rng } from '../sim/rng';
import type { Gender } from '../sim/types';

const SKIN = ['#ffe0c7', '#f8d0b0', '#f1c39e', '#e8b48a', '#d9a274', '#c98e62'];
const HAIR = ['#1b1717', '#231a16', '#2e211b', '#3b2a20', '#4a3426'];
const DYED = ['#e85d75', '#7c6cff', '#3fc1c9', '#f2c14e', '#e8e8e8'];
const SHIRT = ['#ff7a59', '#5ad1ff', '#a98bff', '#73e2c5', '#ffd166', '#ff9ed2', '#2d2f3f', '#e9e4d8'];

export interface AvatarProps {
  look: number;
  gender: Gender;
  age: number;
  mood?: number; // 0~100 행복
  size?: number;
  military?: boolean;
  dyed?: boolean;
  blink?: boolean;
  className?: string;
  x?: number;
  y?: number;
}

export function Avatar({ look, gender, age, mood = 60, size = 64, military, dyed, blink = true, className, x, y }: AvatarProps) {
  const r = new Rng(look);
  const skin = r.pick(SKIN);
  const baseHair = r.pick(HAIR);
  const shirt = r.pick(SHIRT);
  const style = r.int(0, 3);
  const glasses = r.chance(0.22);
  const beardChance = r.chance(0.35);
  const eyeShape = r.int(0, 2);
  const faceW = 30 + r.int(-2, 2);
  const dyeColor = r.pick(DYED);
  const gray = age >= 70 ? '#d9d9d9' : age >= 55 ? '#9a9a9a' : age >= 45 ? mix(baseHair, '#9a9a9a', 0.35) : baseHair;
  const hair = dyed && age >= 17 && age < 45 ? dyeColor : gray;
  const baby = age < 4;
  const kid = age < 13;
  const scale = baby ? 0.8 : kid ? 0.9 : 1;
  const happy = mood >= 60;
  const sad = mood < 35;
  const bald = gender === 'm' && age >= 58 && style === 0;
  const buzz = military;

  const id = `a${look % 100000}`;
  return (
    <svg className={className} x={x} y={y} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <g transform={`translate(50 ${baby ? 58 : 54}) scale(${scale}) translate(-50 -54)`}>
          {/* 몸 */}
          <path d={`M18 104 Q20 76 50 74 Q80 76 82 104 Z`} fill={military ? '#5b6b4a' : shirt} />
          {!military && <path d="M42 75 L50 84 L58 75" fill="none" stroke="#0003" strokeWidth="2" />}
          <rect x="44" y="64" width="12" height="12" rx="4" fill={skin} />
          {/* 뒷머리 (긴 머리) */}
          {!buzz && gender === 'f' && style !== 2 && <path d={`M${50 - faceW + 2} 44 Q${50 - faceW - 4} 80 ${50 - faceW + 6} 86 L${50 + faceW - 6} 86 Q${50 + faceW + 4} 80 ${50 + faceW - 2} 44 Z`} fill={hair} />}
          {/* 얼굴 */}
          <ellipse cx="50" cy="46" rx={faceW * (baby ? 0.95 : 0.82)} ry={baby ? 27 : 26} fill={skin} />
          {/* 귀 */}
          <ellipse cx={50 - faceW * 0.82} cy="48" rx="4" ry="5.5" fill={skin} />
          <ellipse cx={50 + faceW * 0.82} cy="48" rx="4" ry="5.5" fill={skin} />
          {/* 앞머리 */}
          {!bald && hairFront(gender, style, hair, faceW, buzz, baby)}
          {bald && <path d={`M${50 - faceW * 0.8} 44 Q${50 - faceW * 0.8} 30 ${50 - faceW * 0.5} 30`} fill="none" stroke={hair} strokeWidth="5" />}
          {/* 눈 */}
          <g className={blink ? 'blink' : undefined} style={{ transformOrigin: '50px 47px', animationDelay: `${(look % 37) / 10}s` }}>
            {eyes(eyeShape, happy, baby)}
          </g>
          {/* 눈썹 */}
          {!baby && (
            <g stroke={age >= 60 ? '#aaa' : '#2a201b'} strokeWidth="2" strokeLinecap="round" fill="none">
              <path d={sad ? 'M36 37 L44 39' : 'M36 38 Q40 35 44 37'} />
              <path d={sad ? 'M64 37 L56 39' : 'M56 37 Q60 35 64 38'} />
            </g>
          )}
          {/* 볼 */}
          {(kid || happy) && (
            <g fill="#ff8a8a" opacity={kid ? 0.45 : 0.25}>
              <ellipse cx="34" cy="55" rx="5" ry="3" />
              <ellipse cx="66" cy="55" rx="5" ry="3" />
            </g>
          )}
          {/* 입 */}
          <path d={happy ? 'M43 58 Q50 65 57 58' : sad ? 'M44 62 Q50 57 56 62' : 'M45 60 L55 60'} fill="none" stroke="#7a3b3b" strokeWidth="2.4" strokeLinecap="round" />
          {/* 수염 */}
          {gender === 'm' && beardChance && age >= 30 && !military && (
            <path d={`M38 58 Q50 76 62 58 Q58 70 50 71 Q42 70 38 58`} fill={age >= 60 ? '#bbb' : '#2a201b'} opacity="0.55" />
          )}
          {/* 주름 */}
          {age >= 50 && (
            <g stroke="#0002" strokeWidth="1.2" fill="none">
              <path d="M28 46 Q30 49 28 52" />
              <path d="M72 46 Q70 49 72 52" />
              {age >= 65 && <path d="M40 30 Q50 28 60 30" />}
            </g>
          )}
          {/* 안경 */}
          {glasses && age >= 10 && (
            <g fill="none" stroke="#1d1d1d" strokeWidth="2">
              <circle cx="40" cy="47" r="7" />
              <circle cx="60" cy="47" r="7" />
              <path d="M47 47 L53 47" />
            </g>
          )}
          {military && <path d="M22 30 Q50 6 78 30 L80 34 L20 34 Z" fill="#4f5d3f" />}
        </g>
      </g>
    </svg>
  );
}

function eyes(shape: number, happy: boolean, baby: boolean) {
  if (happy && !baby) {
    return (
      <g stroke="#1d1d1d" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M36 48 Q40 44 44 48" />
        <path d="M56 48 Q60 44 64 48" />
      </g>
    );
  }
  const rx = baby ? 3.6 : shape === 0 ? 2.6 : shape === 1 ? 3.2 : 2.2;
  const ry = baby ? 4.2 : shape === 2 ? 1.8 : 3.2;
  return (
    <g fill="#1d1d1d">
      <ellipse cx="40" cy="48" rx={rx} ry={ry} />
      <ellipse cx="60" cy="48" rx={rx} ry={ry} />
      <circle cx="41" cy="46.6" r="0.9" fill="#fff" />
      <circle cx="61" cy="46.6" r="0.9" fill="#fff" />
    </g>
  );
}

function hairFront(g: Gender, style: number, color: string, w: number, buzz?: boolean, baby?: boolean) {
  if (buzz) return <path d={`M${50 - w * 0.8} 40 Q50 14 ${50 + w * 0.8} 40 Q50 28 ${50 - w * 0.8} 40`} fill={color} opacity="0.7" />;
  if (baby) return <path d="M44 22 Q50 14 54 22 Q50 19 44 22" fill={color} />;
  const L = 50 - w * 0.86;
  const R = 50 + w * 0.86;
  if (g === 'm') {
    switch (style) {
      case 0:
        return <path d={`M${L} 46 Q${L - 2} 16 50 16 Q${R + 2} 16 ${R} 46 Q${R - 4} 30 ${50 + 6} 28 Q40 34 ${L + 4} 40 Z`} fill={color} />;
      case 1:
        return <path d={`M${L} 48 Q${L} 14 50 15 Q${R} 14 ${R} 48 L${R - 3} 36 Q50 40 ${L + 3} 36 Z`} fill={color} />;
      case 2:
        return <path d={`M${L - 2} 50 Q${L - 6} 12 50 13 Q${R + 6} 12 ${R + 2} 50 Q${R - 2} 28 64 30 Q56 22 46 30 Q36 24 ${L + 2} 32 Z`} fill={color} />;
      default:
        return <path d={`M${L} 42 Q50 10 ${R} 42 Q${R - 6} 26 50 26 Q${L + 6} 26 ${L} 42 Z`} fill={color} />;
    }
  }
  switch (style) {
    case 0:
      return <path d={`M${L - 2} 56 Q${L - 4} 12 50 14 Q${R + 4} 12 ${R + 2} 56 Q${R - 2} 30 ${50 + 4} 28 Q${L + 10} 30 ${L + 2} 50 Z`} fill={color} />;
    case 1:
      return <path d={`M${L} 50 Q${L - 2} 13 50 14 Q${R + 2} 13 ${R} 50 L${R - 2} 34 Q50 36 ${L + 2} 34 Z`} fill={color} />;
    case 2:
      return (
        <g fill={color}>
          <path d={`M${L} 50 Q${L - 2} 13 50 14 Q${R + 2} 13 ${R} 50 Q${R - 6} 26 50 28 Q${L + 6} 26 ${L} 50 Z`} />
          <circle cx="50" cy="12" r="8" />
        </g>
      );
    default:
      return <path d={`M${L - 4} 66 Q${L - 6} 12 50 13 Q${R + 6} 12 ${R + 4} 66 Q${R} 40 ${R - 6} 32 Q50 24 ${L + 6} 32 Q${L} 40 ${L - 4} 66 Z`} fill={color} />;
  }
}

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const A = ch(pa);
  const B = ch(pb);
  const c = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
