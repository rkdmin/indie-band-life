import { useEffect, useRef } from 'react';
import { BH, BW, drawBust, type BustPerson } from './bust';

/** 신분증 사진 같은 도트 초상 (24×28) — 외모·나이·옷차림이 반영된다 */
export function Portrait({ person, bg = '#e9e2d2' }: { person: BustPerson; bg?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([person.look, Math.floor(person.age), Math.round((person.mood ?? 60) / 15), person.military, person.gender, person.style, person.app?.hairColor, bg]);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.imageSmoothingEnabled = false;
    drawBust(g, person, bg);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={BW} height={BH} aria-hidden style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />;
}
