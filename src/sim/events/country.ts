// 나라별 사건. 한국이 아닌 곳에서 태어난 인생에만 나온다 (id 가 ct_ 로 시작 — engine 이 한국 인생에선 뺀다).
// 각 나라 음악 생활의 실제 특징을 바탕으로 했다: 일본 라이브하우스 노르마, 미국 밴 투어, 영국 펍 공연장, 독일 예술 지원, 브라질 거리 축제.

import type { EventDef, Ctx } from '../ctx';
import { playGig } from '../actions';
import { VENUES } from '../data/world';
import { won } from '../korean';

const is = (c: Ctx, id: string) => c.p.country === id;

export const COUNTRY_EVENTS: EventDef[] = [
  {
    id: 'ct_school_end', scene: 'classroom', title: '학교를 마치며', priority: 185, once: true, chance: 1,
    when: (c) => c.age >= 18 && c.age < 19.5 && c.p.edu === 'none',
    text: (c) => `${c.year}년. 졸업이 다가온다. 음악을 전공할까, 대학에 갈까, 바로 무대로 갈까.`,
    choices: [
      {
        label: '음악 대학 실기 시험을 본다',
        odds: (c) => c.dc(17, '실기 판정', [['주 악기 실력', c.m(c.mainSkill)], ['작곡', Math.floor(c.m(c.p.skills.compose) / 2)]], '가정', '음대 실기는 어느 나라든 문이 좁다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.p.edu = 'music_univ'; c.skill(c.p.mainInst ?? 'guitar', 5); c.rep(3); c.chron('음악 대학 합격', 'big'); return '합격 메일을 몇 번이고 다시 읽었다.'; }
          c.p.edu = 'grad_high'; c.stat('happiness', -6); return '떨어졌다. 그래도 무대는 학위를 묻지 않는다.';
        },
      },
      { label: '일반 대학에 간다', odds: (c) => c.dc(11, '학업 판정', [['학업', c.m(c.p.study)]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.p.edu = 'univ'; c.meet('uni', { metAt: '대학 음악 동아리', affinity: 25 }); return '캠퍼스 라디오 방송국 문을 두드렸다.'; } c.p.edu = 'grad_high'; return '원하던 곳은 아니었다. 대신 시간이 생겼다.'; } },
      { label: '바로 음악을 한다', run: (c) => { c.p.edu = 'grad_high'; c.skill(c.p.mainInst ?? 'guitar', 3); c.theme('dream'); return '“1년만 해 보고.” 그 1년이 얼마나 길어질지 몰랐다.'; } },
    ],
  },
  // ───────── 일본: 라이브하우스와 노르마 ─────────
  {
    id: 'ct_jp_noruma', scene: 'club', title: '노르마', once: true, chance: 0.4,
    when: (c) => is(c, 'JP') && !!c.band && c.p.fans < 400 && c.age >= 17,
    text: () => '라이브하우스 점장이 말했다. “출연 조건은 노르마 25장. 못 팔면 남은 표 값은 밴드가 내는 거고.”\n도쿄 무명 밴드라면 누구나 지나는 길이다.',
    choices: [
      { label: '친구·가족에게 표를 돌린다', odds: (c) => c.dc(12, '인맥 판정', [['아는 사람 수', Math.min(4, Math.floor(Object.keys(c.s.npcs).length / 5))]], '근사', '일본 라이브하우스의 티켓 할당 관행'), run: (c) => { if (c.check(c.choicesOdds!)) { c.fans(30); return '25장 완판. 객석 절반이 아는 얼굴이었지만, 그래도 만석은 만석이다.'; } c.money(-c.krw(180_000), '노르마 자부담'); return '12장 남았다. 멤버 넷이 지갑을 털었다.'; } },
      { label: '노르마 없는 길거리로 간다', run: (c) => { c.skill('stage', 3); c.fans(15); return '역 앞 광장, 경찰이 올 때까지 세 곡.'; } },
    ],
  },
  {
    id: 'ct_jp_cd', scene: 'recording', title: 'CD가 팔리는 나라', once: true, chance: 0.3,
    when: (c) => is(c, 'JP') && c.s.albums.length >= 1,
    text: () => '일본은 아직 CD가 팔리는 몇 안 되는 시장이다. 공연장 물판 테이블에 CD를 쌓아 볼까?',
    choices: [
      { label: '500장 찍는다', run: (c) => { c.money(-c.krw(1_200_000), '프레스 비용'); c.money(c.krw(2_400_000), '물판 수익'); c.fans(c.p.fans * 0.04 + 40); return '공연 끝나고 사인해 준 CD가 120장. 손목이 아팠지만 웃음이 났다.'; } },
      { label: '스트리밍만으로 간다', run: (c) => { c.rep(1); } },
    ],
  },
  // ───────── 미국: 밴 투어 ─────────
  {
    id: 'ct_us_van', scene: 'street', title: '중고 밴과 대륙 횡단', cooldown: 8, chance: 0.25,
    when: (c) => is(c, 'US') && !!c.band && c.age >= 19 && c.age < 45 && c.p.military !== 'serving',
    text: () => '중고 밴 한 대, 주유비 카드 하나, 14개 주 21개 도시.\n미국 밴드는 결국 길 위에서 큰다.',
    choices: [
      {
        label: '떠난다',
        odds: (c) => c.dc(13, '체력 판정', [['체력', c.m(c.p.talents?.stamina ?? 50)], ['팀워크', (c.band?.chemistry ?? 50) >= 65 ? 2 : -1]], '가정', '세계 1위 시장, 하지만 투어는 대개 적자다'),
        run: (c) => {
          c.money(-c.krw(3_000_000) / (c.members.length + 1), '투어 경비');
          if (c.check(c.choicesOdds!)) { c.fans(c.p.fans * 0.25 + 600); c.rep(4); c.chron('미국 21개 도시 밴 투어 완주', 'big'); return '사막 한가운데 휴게소에서 쓴 곡이 다음 앨범 타이틀이 됐다.'; }
          c.stat('health', -6); c.money(-c.krw(1_500_000), '밴 수리비'); return '네브래스카에서 밴이 퍼졌다. 남은 일정은 취소.';
        },
      },
      { label: '지역 클럽에서 내실을 다진다', run: (c) => { c.skill('stage', 3); c.fans(80); } },
    ],
  },
  // ───────── 영국: 펍 공연장 레지던시 ─────────
  {
    id: 'ct_uk_pub', scene: 'pub', title: '펍 뒷방 레지던시', cooldown: 8, chance: 0.25,
    when: (c) => is(c, 'UK') && !!c.band && c.age >= 17 && c.age < 50,
    text: () => '동네 펍 사장님이 제안했다. “매주 목요일 밤, 뒷방 무대는 너희 거야. 대신 페이는 맥주 한 잔.”\n영국의 많은 밴드가 이런 방에서 시작했다.',
    choices: [
      { label: '석 달 동안 매주 선다', run: (c) => { c.skill('stage', 5); c.fans(120 + c.p.fans * 0.05); c.p.habits.drinking = Math.min(3, c.p.habits.drinking + 0.4); return '열두 번째 목요일, 처음 보는 기자가 맨 뒤에서 메모를 했다.'; } },
      { label: '음악 잡지에 데모를 보낸다', odds: (c) => c.dc(15, '평판 판정', [['곡 완성도', c.m(Math.max(0, ...c.s.songs.map((x) => x.quality)))]], '가정', '영국은 음악 언론의 힘이 크다'), run: (c) => { if (c.check(c.choicesOdds!)) { c.rep(6); c.fans(500); return '“이번 주의 신인” 한 칸. 그게 전부를 바꿨다.'; } return '답장은 오지 않았다.'; } },
    ],
  },
  // ───────── 독일: 예술 지원금 ─────────
  {
    id: 'ct_de_grant', scene: 'office', title: '음악가 지원 프로그램', cooldown: 6, chance: 0.3,
    when: (c) => is(c, 'DE') && c.age >= 19 && c.age < 60 && c.s.songs.length >= 2,
    text: () => '연방·주 정부의 음악가 지원 프로그램 공고가 났다. 앨범 제작과 투어 비용을 보조해 준다.\n서류는 독일어로 열두 쪽.',
    choices: [
      { label: '지원한다', odds: (c) => c.dc(12, '서류 심사', [['발매 경력', Math.min(3, c.s.albums.length)], ['평판', Math.floor(c.m(c.p.rep) / 2)]], '근사', '독일은 예술인 지원 제도가 두텁다 — 다른 나라보다 난이도가 낮다'), run: (c) => { if (c.check(c.choicesOdds!)) { c.money(c.krw(8_000_000) / (c.members.length + 1), '지원금'); c.chron('음악가 지원 프로그램 선정', 'band'); return '지원금으로 처음으로 제대로 된 스튜디오를 빌렸다.'; } return '이번엔 떨어졌다. 다음 공고는 반년 뒤.'; } },
      { label: '서류는 질색이다', run: (c) => { c.stat('stress', -2); } },
    ],
  },
  // ───────── 브라질: 거리 축제 ─────────
  {
    id: 'ct_br_bloco', scene: 'festival', title: '거리 축제의 행렬', cooldown: 6, chance: 0.3,
    when: (c) => is(c, 'BR') && c.age >= 14 && c.age < 70,
    text: () => '축제 기간, 거리가 하나의 거대한 무대가 된다. 동네 행렬 밴드가 드럼 연주자를 찾는다.',
    choices: [
      { label: '행렬에 합류해 밤새 연주한다', run: (c) => { c.skill('drums', 4); c.skill('stage', 3); c.fans(60); c.stat('happiness', 8); return '새벽 다섯 시, 수천 명이 같은 박자로 춤추고 있었다.'; } },
      { label: '그 리듬을 우리 곡에 넣는다', odds: (c) => c.dc(13, '작곡 판정', [['작곡', c.m(c.p.skills.compose)], ['리듬감', c.m(c.p.talents?.rhythm ?? 50)]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.fans(c.p.fans * 0.08 + 200); c.line('스트리밍이 폭발적으로 크는 시장 — 브라질은 2024년 상위 10개국 중 가장 빨리 성장했다', 'neutral'); return '록과 거리의 리듬이 섞인 곡이 플레이리스트를 타고 퍼졌다.'; } return '어색한 혼합. 아직은 시간이 필요하다.'; } },
    ],
  },
  {
    id: 'ct_any_festival', scene: 'festival', title: '큰 페스티벌의 신인 무대', cooldown: 6, chance: 0.3,
    when: (c) => !is(c, 'KR') && !!c.band && c.p.fans >= 2000 && c.p.fans < 30000 && c.p.military !== 'serving',
    text: (c) => `${c.country.name}에서 손꼽히는 여름 페스티벌의 신인 무대 섭외가 왔다.`,
    choices: [
      { label: '선다', run: (c) => { playGig(c, VENUES.find((v) => v.id === 'local_fest')!, true); } },
      { label: '일정이 안 맞는다', run: (c) => { c.rep(-1); return `다음 해를 기약했다. 출연료는 ${won(c.krw(800_000))}였다.`; } },
    ],
  },
];
