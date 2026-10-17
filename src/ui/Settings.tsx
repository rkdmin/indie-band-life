import { useState } from 'react';
import { isBgmOn, isMuted, setBgm, setMuted } from '../audio/player';

export function Settings({ onQuit, onNewLife }: { onQuit: () => void; onNewLife: () => void }) {
  const [muted, setM] = useState(isMuted());
  const [bgm, setB] = useState(isBgmOn());
  const [calm, setCalm] = useState(() => document.documentElement.classList.contains('calm'));
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <button className="btn block" onClick={() => { setMuted(!muted); setM(!muted); }}>
        {muted ? '🔇 소리 꺼짐 — 켜기' : '🔊 소리 켜짐 — 끄기'}
      </button>
      <button className="btn block" onClick={() => { setBgm(!bgm); setB(!bgm); }}>
        {bgm ? '🎼 배경음 켜짐 — 끄기' : '🎼 배경음 꺼짐 — 켜기'}
      </button>
      <button
        className="btn block"
        onClick={() => {
          const v = !calm;
          document.documentElement.classList.toggle('calm', v);
          try {
            localStorage.setItem('ibl.calm', v ? '1' : '0');
          } catch {
            /* 무시 */
          }
          setCalm(v);
        }}
      >
        {calm ? '🐢 움직임 줄이기 켜짐' : '🐢 움직임 줄이기'}
      </button>
      <button className="btn block" onClick={onQuit}>🏠 타이틀로 (자동 저장됨)</button>
      {!confirm ? (
        <button className="btn block ghost" onClick={() => setConfirm(true)}>🗑 이 인생 포기하고 새로 시작</button>
      ) : (
        <button className="btn block" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={onNewLife}>
          정말로? 지금 인생은 사라집니다
        </button>
      )}
      <div className="dim" style={{ textAlign: 'center', marginTop: 8 }}>
        확률은 공개 통계(생명표·최저임금·인구 분포)와 게임용 가정을 섞어 계산합니다.
        <br />
        현실의 통계가 개인의 미래를 결정하지 않습니다.
      </div>
    </>
  );
}
