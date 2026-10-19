// 화면이 새로 뜬 직후의 탭을 잠깐 무시한다.
// 모바일에서 선택지를 누른 손가락이 같은 자리에 새로 나타난 ‘계속’ 버튼까지 눌러 버리거나
// (더블탭·고스트 클릭), 이전 화면에서 잡힌 포커스가 새 화면에 남아 엉뚱한 버튼이 강조되는 일을 막는다.

import { useEffect, useState } from 'react';

export function useArmed(key: unknown, ms = 300): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    // 이전 화면의 버튼에 남아 있던 포커스를 놓는다
    const el = document.activeElement as HTMLElement | null;
    if (el && el !== document.body && typeof el.blur === 'function' && el.tagName !== 'INPUT') el.blur();
    const id = window.setTimeout(() => setArmed(true), ms);
    return () => window.clearTimeout(id);
  }, [key, ms]);
  return armed;
}
