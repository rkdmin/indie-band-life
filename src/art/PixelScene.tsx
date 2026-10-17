import { useEffect, useRef } from 'react';
import type { SceneId } from '../sim/types';
import { PH, PW, drawFrame, type PixelPerson } from './pixel';

interface Props {
  id: SceneId;
  people?: PixelPerson[];
  crowd?: number;
  night?: boolean;
  seed?: number;
  className?: string;
  label?: string;
}

const reduced = () => typeof matchMedia !== 'undefined' && (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('calm'));

export function PixelScene({ id, people = [], crowd = 0, night = false, seed = 1, className, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ people, crowd, night, seed });
  opts.current = { people, crowd, night, seed };

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 66) return; // 약 15fps — 픽셀 게임다운 끊김
      last = now;
      if (document.hidden) return;
      drawFrame(g, id, (now - t0) / 1000, opts.current);
    };
    drawFrame(g, id, 0.5, opts.current);
    if (!reduced()) raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id]);

  return <canvas ref={ref} width={PW} height={PH} className={`pixel ${className ?? ''}`} role="img" aria-label={label ?? id} />;
}
