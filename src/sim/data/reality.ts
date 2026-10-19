import realityJson from '../../data/fate/reality.json';
// 게임 안에서 플레이어에게 그대로 보여 주는 ‘현실의 숫자’. 출처와 기준 시점을 함께 적는다.
// 값이 바뀌면 docs/probability-sources.md 도 같이 고친다.

export interface Fact {
  id: string;
  label: string;
  value: string;
  src: string;
  kind: '통계' | '근사' | '가정';
}

/** [통계] 문화체육관광부·한국문화관광연구원 「2024 예술인 실태조사」(2023년 기준, 2025.3 발표) */
export const ARTIST_SURVEY = realityJson.data.artistSurvey;

/** [통계] 한국콘텐츠진흥원 해외 페스티벌 참가지원 (2024 공고 기준) */
export const OVERSEAS_SUPPORT = realityJson.data.overseasSupport;

/** [근사] 스트리밍 1회당 권리자 몫 — 2015년 보도 기준 약 7.2원, 그중 실연자 약 0.43원. 직접 제작·작곡한 인디 밴드는 제작자·저작권자·실연자 몫을 함께 받는다 */
export const STREAM = realityJson.data.stream;

export function facts(year: number, minWage: number): Fact[] {
  return [
    { id: 'music', label: '음악인 예술활동 연평균 수입', value: '901만원', src: ARTIST_SURVEY.src, kind: '통계' },
    { id: 'all', label: '예술인 전체 평균', value: '1,055만원 (국민 평균의 41%)', src: ARTIST_SURVEY.src, kind: '통계' },
    { id: 'side', label: '다른 일을 겸하는 예술인', value: '47.5%', src: ARTIST_SURVEY.src, kind: '통계' },
    { id: 'wage', label: `${year}년 최저시급`, value: `${minWage.toLocaleString()}원`, src: '최저임금위원회 고시', kind: year > 2026 ? '가정' : '통계' },
    { id: 'stream', label: '스트리밍 1회 권리자 몫', value: '약 7.2원 (가수 몫 0.43원)', src: STREAM.src, kind: '근사' },
    { id: 'abroad', label: '해외 페스티벌 참가지원', value: '팀당 최대 1,000만원 · 5팀 내외', src: OVERSEAS_SUPPORT.src, kind: '통계' },
    { id: 'gig', label: '클럽 합동공연 수익', value: '티켓 매출 나눠 받기, 대개 팀당 수만~수십만원', src: '공개 자료 부족 — 게임 가정', kind: '가정' },
  ];
}
