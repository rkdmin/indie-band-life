// 사건 결과에 컷신이 어떻게 반응할지 — 화면과 떨어진 순수 규칙 (테스트한다).

import type { ActiveEvent } from '../sim/types';

export type CutMood = 'none' | 'good' | 'bad' | 'jackpot' | 'bust';

/** 결과 문장·판정에서 장면의 반응을 고른다 */
export function moodOf(ev: ActiveEvent): CutMood {
  const r = ev.result;
  if (!r) return 'none';
  if (r.jackpot) return r.jackpot.kind === 'bust' ? 'bust' : 'jackpot';
  if (r.rolls?.length) return r.rolls.every((x) => x.ok) ? 'good' : 'bad';
  const good = r.lines.filter((l) => l.tone === 'good' || l.tone === 'big').length;
  const bad = r.lines.filter((l) => l.tone === 'bad').length;
  return bad > good ? 'bad' : good > 0 ? 'good' : 'none';
}
