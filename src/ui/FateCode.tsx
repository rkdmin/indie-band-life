// 운명 코드 칩 — 출생증명서와 엔딩에 붙는다. 누르면 공유(모바일) 또는 복사(데스크톱).

import { useState } from 'react';
import type { GameState } from '../sim/types';
import { encodeFate } from '../sim/fatecode';
import type { CountryId } from '../sim/data/countries';
import { shareText } from '../platform';
import { sfx } from '../audio/player';

export const fateOf = (s: GameState) => encodeFate({ country: (s.player.country ?? 'KR') as CountryId, birthYear: s.player.birthYear, gender: s.player.gender, seed: s.seed });

export function FateCode({ s, compact = false }: { s: GameState; compact?: boolean }) {
  const code = fateOf(s);
  const [msg, setMsg] = useState<string | null>(null);
  const share = async () => {
    sfx('tap');
    try {
      const how = await shareText(`인디밴드 키우기 운명 코드: ${code}\n같은 집, 같은 재능으로 태어나 보세요. 그 뒤는 당신의 선택.`, '운명 코드');
      setMsg(how === 'copied' ? '복사했어요' : '공유했어요');
    } catch {
      setMsg('복사하지 못했어요 — 코드를 직접 적어 주세요');
    }
    window.setTimeout(() => setMsg(null), 2200);
  };
  return (
    <div className={`fate-code ${compact ? 'compact' : ''}`}>
      <span className="fc-k">운명 코드</span>
      <button type="button" className="fc-v" onClick={share} aria-label={`운명 코드 ${code} 공유하기`}>{code}</button>
      <span className="fc-d" aria-live="polite">{msg ?? '친구가 이 코드로 똑같이 태어날 수 있다'}</span>
    </div>
  );
}
