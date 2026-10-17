import { useEffect, useRef } from 'react';
import { drawPerson, type PixelPerson } from './pixel';

/** 신분증 사진 같은 픽셀 초상 (머리·상체만) */
export function Portrait({ person, bg = '#e9e2d2' }: { person: PixelPerson; bg?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.imageSmoothingEnabled = false;
    g.fillStyle = bg;
    g.fillRect(0, 0, 14, 17);
    const a = person.age;
    // 발끝을 캔버스 아래로 내려 상체만 보이게
    const feet = a < 3 ? 13 : a < 12 ? 17 : 22;
    drawPerson(g, 2, feet, { ...person, inst: null }, 0.2, false);
  }, [person.look, person.age, person.mood, person.military, person.gender, bg]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={14} height={17} aria-hidden style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />;
}
