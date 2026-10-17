import { useEffect, useState } from 'react';
import { Scene } from '../art/Scene';
import { isMuted, playBgm, setMuted, sfx, stopBgm } from '../audio/player';

const TAGLINES = [
  '“밴드부 친구랑 만든 첫 곡이 20년 뒤 역주행했습니다.”',
  '“우리 밴드는 유명해졌는데, 보컬이 먼저 떠났습니다.”',
  '“나는 록스타가 되지 못했지만, 마지막 앨범을 남겼습니다.”',
  '“세 살 어린이집 단짝이 서른에 드러머가 되어 돌아왔다.”',
  '“군악대 오디션에 떨어지고 쓴 노래가 첫 싱글이 됐다.”',
];

interface Props {
  canContinue: boolean;
  continueLabel: string;
  onContinue: () => void;
  onNew: () => void;
  onCollection: () => void;
  lives: number;
}

export function Title({ canContinue, continueLabel, onContinue, onNew, onCollection, lives }: Props) {
  const [tag, setTag] = useState(0);
  const [muted, setM] = useState(isMuted());
  useEffect(() => {
    const t = window.setInterval(() => setTag((x) => (x + 1) % TAGLINES.length), 4200);
    const startMusic = () => playBgm('title', 'indierock', 'bright', 20261018);
    window.addEventListener('pointerdown', startMusic, { once: true });
    return () => {
      window.clearInterval(t);
      window.removeEventListener('pointerdown', startMusic);
      stopBgm();
    };
  }, []);
  const people = [
    { look: 4242, gender: 'f' as const, age: 24, mood: 80, inst: 'GUITAR' },
    { look: 1717, gender: 'm' as const, age: 25, mood: 80, inst: 'VOCAL' },
    { look: 9001, gender: 'f' as const, age: 23, mood: 80, inst: 'DRUMS' },
  ];
  return (
    <div className="app no-tabs title-screen">
      <div className="title-hero">
        <Scene id="festival" people={people} crowd={0.9} seed={7} />
      </div>
      <div className="title-logo">
        <h1>
          인디밴드<br />
          <em>키우기</em>
        </h1>
        <p>태교부터 마지막 무대까지, 음악으로 기록되는 한 사람의 일생</p>
      </div>
      <p className="tagline" key={tag}>{TAGLINES[tag]}</p>
      <div className="title-menu">
        {canContinue && (
          <button className="btn primary block pulse" onClick={() => { sfx('tap'); onContinue(); }}>
            ▶ 이어하기 <span style={{ opacity: 0.8, fontWeight: 400 }}>· {continueLabel}</span>
          </button>
        )}
        <button className={`btn block ${canContinue ? '' : 'primary pulse'}`} onClick={() => { sfx('tap'); onNew(); }}>
          ✨ 새 인생 시작
        </button>
        <button className="btn block" onClick={() => { sfx('tap'); onCollection(); }}>
          📖 엔딩 도감 · 지난 인생들 {lives > 0 && <span className="chip big">{lives}</span>}
        </button>
        <button className="btn ghost small" onClick={() => { const m = !muted; setMuted(m); setM(m); }}>
          {muted ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'}
        </button>
      </div>
      <div className="title-foot">
        모든 곡은 플레이어의 선택으로 즉석 작곡됩니다 · 실존 인물·밴드와 무관한 창작물입니다
      </div>
    </div>
  );
}
