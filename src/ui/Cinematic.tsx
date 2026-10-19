// 큰 순간의 전체 화면 연출: 레터박스, 픽셀 장면 줌인, 한 글자씩 찍히는 제목, 그리고 음악.

import { useEffect, useState, type ReactNode } from 'react';
import type { SceneId } from '../sim/types';
import type { PixelPerson } from '../art/pixel';
import { PixelScene } from '../art/PixelScene';
import { playSong, sfx, stopSong, type SongLike } from '../audio/player';
import { useBackButton } from '../platform';
import { useArmed } from './useArmed';

interface Props {
  scene: SceneId;
  people: PixelPerson[];
  crowd?: number;
  seed: number;
  kicker: string;
  title: string;
  sub?: string;
  song?: SongLike & { title: string };
  children?: ReactNode; // 선택지 등
  onDone?: () => void; // 선택지가 없을 때 ‘계속’
  autoCloseMs?: number;
}

export function Cinematic({ scene, people, crowd = 0.8, seed, kicker, title, sub, song, children, onDone, autoCloseMs }: Props) {
  const [typed, setTyped] = useState(0);
  const done = typed >= title.length;
  const subDelay = 0.4 + title.length * 0.06;

  useEffect(() => {
    if (song) playSong(song, { bars: 18 });
    else sfx('big');
    return () => {
      if (song) stopSong();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => setTyped((x) => x + 1), typed === 0 ? 900 : 60);
    return () => window.clearTimeout(id);
  }, [typed, done]);

  useEffect(() => {
    if (!autoCloseMs || !onDone || children) return;
    const id = window.setTimeout(onDone, autoCloseMs);
    return () => window.clearTimeout(id);
  }, [autoCloseMs, onDone, children]);

  useBackButton(() => onDone?.(), !!onDone);
  // 선택지는 제목이 다 찍힌 뒤 서서히 나타난다 — 그 전(투명할 때)에는 눌리지 않는다
  const armed = useArmed(title, (subDelay + 0.5) * 1000 + 200);

  return (
    <div className="cine" role="dialog" aria-modal="true" aria-label={title} onClick={() => !done && setTyped(title.length)}>
      <div className="cine-grain" />
      <div className="cine-frame">
        <PixelScene id={scene} people={people} crowd={crowd} night seed={seed} label={title} />
      </div>
      <div className="cine-text">
        <div className="cine-kicker">{kicker}</div>
        <h1 className="cine-title">
          {title.slice(0, typed)}
          {!done && <span className="caret" />}
        </h1>
        {sub && (
          <div className="cine-sub" style={{ animationDelay: `${subDelay}s` }}>
            {sub}
          </div>
        )}
        {song && (
          <div className="cine-song">
            <span className="eq"><i /><i /><i /></span> 〈{song.title}〉 재생 중
          </div>
        )}
        {children && <div style={{ animationDelay: `${subDelay + 0.5}s`, pointerEvents: armed ? undefined : 'none' }} className="choices-wrap">{children}</div>}
        {!children && onDone && (
          <div className="cine-next" style={{ animationDelay: `${subDelay + 0.4}s`, pointerEvents: armed ? undefined : 'none' }}>
            <button className="btn primary" onClick={(e) => { e.stopPropagation(); sfx('page'); onDone(); }}>
              계속 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
