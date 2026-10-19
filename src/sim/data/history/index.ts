// 나라별 음악사 데이터셋(src/data/history/*.json)을 하나로 모은다. 게임 속 시간이 흐르면 그해의 실제 소식이
// 인생 기록에 흘러나오고, 같은 시대·같은 장르의 ‘물결’에 올라타면 내 밴드가 그 시대의 주인공이 될 기회가 온다.

import type { Genre } from '../../types';
import type { CountryId } from '../countries';
import type { HistoryItem, Wave } from './types';
import kr from '../../../data/history/kr.json';
import us from '../../../data/history/us.json';
import uk from '../../../data/history/uk.json';
import jp from '../../../data/history/jp.json';
import de from '../../../data/history/de.json';
import br from '../../../data/history/br.json';
import global from '../../../data/history/global.json';
import waves from '../../../data/history/waves.json';

export type { HistoryItem, Wave } from './types';

const files = [global, kr, us, uk, jp, de, br] as { data: HistoryItem[] }[];

export const HISTORY: HistoryItem[] = files
  .flatMap((f) => f.data)
  .sort((a, b) => a.y + (a.m ?? 6) / 12 - (b.y + (b.m ?? 6) / 12));

export const WAVES: Wave[] = waves.data as Wave[];

/** (from, to] 사이에 일어난 사건 — 내 나라 + 세계적 사건 + 영미권 대형 음반(전 세계가 들었다) */
export function historyBetween(from: number, to: number, country: CountryId): HistoryItem[] {
  return HISTORY.filter((h) => {
    const t = h.y + ((h.m ?? 6) - 1) / 12;
    if (t <= from || t > to) return false;
    if (h.c === country || h.c === 'GLOBAL') return true;
    // 영미권 대형 발매는 어느 나라에서든 소식으로 들린다 (세상 소식은 그 나라만)
    return (h.c === 'US' || h.c === 'UK') && h.kind === 'release';
  });
}

export function activeWave(country: CountryId, year: number, genre: Genre | undefined): Wave | undefined {
  return WAVES.find((w) => w.c === country && year >= w.from && year <= w.to && (!genre || w.genres.includes(genre)));
}
