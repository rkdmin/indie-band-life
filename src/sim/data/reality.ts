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
export const ARTIST_SURVEY = {
  year: 2023,
  avgArtIncomeAll: 10_550_000, // 예술인 1인당 예술활동 연평균 수입
  avgArtIncomeMusic: 9_010_000, // 음악 분야
  sideJobRate: 0.475, // 겸업 예술인 비율 (전체)
  vsNational: 0.41, // 국민 평균 소득 대비
  src: '문화체육관광부 「2024 예술인 실태조사」(2023년 기준)',
};

/** [통계] 한국콘텐츠진흥원 해외 페스티벌 참가지원 (2024 공고 기준) */
export const OVERSEAS_SUPPORT = {
  maxPerTeam: 10_000_000,
  teams: 5,
  requirement: '해외 페스티벌 공식 초청장 · 앨범 발매 경력 · 1시간 이상 단독 공연 가능',
  covers: '왕복 항공료 · 현지 숙박비 · 악기 임차료 · 해외 운송료',
  src: '한국콘텐츠진흥원 해외 페스티벌 참가지원 공고 (2024)',
};

/** [근사] 스트리밍 1회당 권리자 몫 — 2015년 보도 기준 약 7.2원, 그중 실연자 약 0.43원. 직접 제작·작곡한 인디 밴드는 제작자·저작권자·실연자 몫을 함께 받는다 */
export const STREAM = {
  perPlayRights: 7.2,
  performerShare: 0.43,
  indieSelfReleased: 3, // 게임에서 쓰는 값: 유통 수수료를 떼고 제작·작곡·실연 몫을 합친 근사
  src: '저작권료 분배 구조 보도(2015) · 문체부 징수규정 개정(2019, 권리자 몫 60→65%)',
};

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
