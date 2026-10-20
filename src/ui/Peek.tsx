// 잠깐 내리기 — 갈림길·카드·멤버 고르기 창을 잠시 내려 두고 뒤 화면(상태·기록)을 볼 수 있게.
// 내려 둔 동안 시간은 멈춘 채고, 화면 아래 막대를 누르면(또는 뒤로 가기) 다시 올라온다.

import { useEffect, useState } from 'react';
import { useScrollLock } from './useScrollLock';
import { useBackButton } from '../platform';
import { sfx } from '../audio/player';

/** key 가 바뀌면(새 사건) 다시 펼친다. 내려 둔 동안엔 뒤 화면 스크롤 잠금을 푼다 */
export function usePeek(key: string) {
  const [peek, setPeek] = useState(false);
  useEffect(() => setPeek(false), [key]);
  useScrollLock(!peek);
  useBackButton(() => setPeek(false), peek);
  return [peek, setPeek] as const;
}

export function PeekButton({ onPeek, dark = false }: { onPeek: () => void; dark?: boolean }) {
  return (
    <button type="button" className={`peek-btn ${dark ? 'dark' : ''}`} onClick={() => { sfx('tap'); onPeek(); }} aria-label="잠깐 내리기 — 뒤 화면 보기">
      ▾ 잠깐 내리기
    </button>
  );
}

export function PeekBar({ kicker, title, onBack }: { kicker: string; title: string; onBack: () => void }) {
  return (
    <button type="button" className="fork-peekbar" onClick={() => { sfx('page'); onBack(); }} aria-label={`다시 보기: ${title}`}>
      <span className="grip" aria-hidden />
      <span className="k">{kicker}</span>
      <b>{title}</b>
      <span className="go">▴ 다시 보기</span>
    </button>
  );
}
