// 돈 표시를 그 인생의 나라에 맞춘다 — 한국은 원화, 다른 나라는 그 나라 돈의 지금 가치 (data/world/currency.json)
// 계산은 늘 원화로 하고, 보여 줄 때만 바꾼다. 엔진이 한 걸음 나아갈 때와 화면을 그릴 때 그 인생으로 맞춘다.

import type { GameState } from './types';
import { localMoney, setMoneyDisplay } from './korean';
import { priceIndex } from './data/world';
import currencyJson from '../data/world/currency.json';

type Cur = { unit: string; fx: number; decimals: number };
const CUR = currencyJson.data as unknown as Record<string, Cur>;

/** 원화 1원 → 그 나라 돈(지금 가치) 배율 */
export function moneyFactor(country: string | undefined, year: number): number {
  const c = CUR[country ?? 'KR'];
  return c ? 1 / (priceIndex(year) * c.fx) : 1;
}

/** 이 인생의 돈 표시로 맞춘다 */
export function applyMoneyOf(s: Pick<GameState, 'time'> & { player: { country?: string } }) {
  const c = CUR[s.player.country ?? 'KR'];
  setMoneyDisplay(c ? { unit: c.unit, factor: moneyFactor(s.player.country, s.time), decimals: c.decimals } : null);
}

/** 특정 해의 금액을 그 나라 돈으로 (출생증명서의 16세 시급처럼 지금과 다른 해) */
export function moneyAt(krw: number, year: number, country: string | undefined): string {
  const c = CUR[country ?? 'KR'];
  if (!c) return `${Math.round(krw).toLocaleString('ko-KR')}원`;
  return localMoney(krw * moneyFactor(country, year), c.unit, c.decimals);
}

/** 화면 한쪽에 붙일 설명 */
export function moneyNote(country: string | undefined): string | null {
  const c = CUR[country ?? 'KR'];
  return c ? `돈은 ${c.unit} — 그 시절 금액을 지금 가치로 바꿔 보여 준다 [근사]` : null;
}
