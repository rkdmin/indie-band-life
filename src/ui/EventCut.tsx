// 사건마다 짧은 컷신 — 그 장소의 도트 장면, 레터박스, 카메라 움직임, 자막.
// 카메라는 사건마다 달라진다 (천천히 다가가기·옆으로 흐르기·위로 들기·멀어지기·손떨림).
// 결과가 나오면 장면이 반응한다: 잘되면 따뜻한 빛, 안되면 색이 빠지고, 대박이면 번쩍.
// 탭하면 바로 건너뛴다. 움직임 줄이기 설정이면 정지 화면.

import { useEffect, useState } from 'react';
import type { ActiveEvent, SceneId } from '../sim/types';
import { moodOf } from './cutMood';
import type { PixelPerson } from '../art/pixel';
import { PixelScene } from '../art/PixelScene';

const CAMS = ['push', 'pan-l', 'pan-r', 'tilt', 'pull', 'drift'] as const;
const SEASON = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function EventCut({ ev, scene, label, people, night, seed, onDone }: { ev: ActiveEvent; scene: SceneId; label: string; people: PixelPerson[]; night: boolean; seed: number; onDone: () => void }) {
  const [skip, setSkip] = useState(false);
  const h = hash(`${ev.id}:${ev.at}`);
  const cam = CAMS[h % CAMS.length];
  const month = Math.min(12, Math.floor((ev.at - Math.floor(ev.at)) * 12) + 1);
  const mood = moodOf(ev);
  // 컷신 길이: 1.1초 — 그 뒤 선택지가 열린다
  useEffect(() => {
    if (skip) { onDone(); return; }
    const id = window.setTimeout(onDone, 1100);
    return () => window.clearTimeout(id);
  }, [skip]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`ecut cam-${cam} mood-${mood} ${skip ? 'skip' : ''}`}
      onClick={(e) => { e.stopPropagation(); setSkip(true); }}
      role="img"
      aria-label={`${label} 장면`}
    >
      <div className="ecut-frame">
        <PixelScene id={scene} people={people} night={night} seed={seed} crowd={scene === 'club' || scene === 'festival' || scene === 'arena' ? 0.5 : 0} label={label} />
      </div>
      <i className="ecut-bar top" />
      <i className="ecut-bar bot" />
      <div className="ecut-cap">
        <span>{Math.floor(ev.at)} · {SEASON[month - 1]} · {label}</span>
      </div>
      {mood === 'jackpot' && <i className="ecut-flash" />}
    </div>
  );
}
