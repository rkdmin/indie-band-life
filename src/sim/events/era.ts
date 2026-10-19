// 시대 사건: data/era/media.ts·life.ts 의 연도에 묶여, 그 시대에만 일어나는 일.
// 음악다방, 심야 라디오 엽서, 데모 카세트, 통금, 장발 단속, PC통신 정모, MP3 공유, 미니홈피 배경음악…

import type { EventDef, Ctx } from '../ctx';
import { GENRES } from '../types';
import { hasMedia } from '../data/era/media';
import { genreLabel } from '../data/era/genres';
import type { CountryId } from '../data/countries';
import { clamp } from '../rng';

const ct = (c: Ctx) => (c.p.country ?? 'KR') as CountryId;
const kr = (c: Ctx) => ct(c) === 'KR';
const busy = (c: Ctx) => c.p.military === 'serving';
const yr = (c: Ctx, from: number, to: number) => c.year >= from && c.year < to;
const released = (c: Ctx) => c.s.songs.filter((x) => x.released);
const bestSong = (c: Ctx) => Math.max(0, ...c.s.songs.map((x) => x.quality));

export const ERA_EVENTS: EventDef[] = [
  {
    id: 'e_dabang_dj', scene: 'pub', title: '음악다방 DJ 박스', once: true, chance: 0.3,
    when: (c) => kr(c) && yr(c, 1965, 1989) && c.age >= 17 && c.age < 35 && !busy(c),
    text: () => '단골 음악다방 사장님이 물었다. “저녁 DJ 자리가 비었는데, 판 좀 틀어 볼래?”\n유리 부스 안에서 신청곡 쪽지를 받아 LP를 거는 일이다.',
    choices: [
      {
        label: 'DJ 박스에 앉는다',
        run: (c) => {
          c.money(c.krw(600_000), 'DJ 아르바이트');
          const g = c.pick([...GENRES]);
          c.genre(g, 8);
          c.skill('compose', 2);
          c.meet('dj', { metAt: '음악다방 단골', affinity: 20, skill: c.rng.int(20, 50) });
          c.chron('음악다방 DJ 박스에 앉았다', 'music');
          return `매일 밤 수십 장의 판을 걸었다. 손님 쪽지 덕에 ${genreLabel(g, c.year, ct(c))}의 매력을 알게 됐다.`;
        },
      },
      { label: '손님으로만 간다', run: (c) => { c.stat('happiness', 4); c.theme('night'); return '커피 한 잔으로 세 시간을 버텼다.'; } },
    ],
  },
  {
    id: 'e_radio_postcard', scene: 'home', title: '심야 라디오에 보낸 엽서', cooldown: 6, chance: 0.25,
    when: (c) => hasMedia('radio', c.year, ct(c)) && c.year < 2000 && c.age >= 14 && c.age < 40 && c.s.songs.length > 0 && !busy(c),
    text: () => '심야 음악 프로그램에 엽서를 보낼까. 사연 끝에 ‘제가 만든 노래가 있는데…’라고 적었다.\n데모 테이프도 함께 부쳤다.',
    choices: [
      {
        label: '부친다',
        odds: (c) => c.dc(15, '선곡 판정', [['곡 완성도', c.m(bestSong(c))], ['사연의 힘', c.m(c.p.talents?.lyric ?? 50)]], '가정', '하루에 엽서 수백 장이 온다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            c.fans(80 + c.p.fans * 0.05);
            c.rep(2);
            c.chron('심야 라디오에서 내 노래가 소개됐다', 'music');
            return '새벽 한 시, DJ가 내 이름을 읽었다. 라디오 앞에서 이불을 뒤집어쓰고 소리를 질렀다.';
          }
          return '몇 주를 기다렸지만 내 엽서는 읽히지 않았다.';
        },
      },
      { label: '부끄러워서 서랍에 넣는다', run: (c) => { c.theme('night'); return '엽서는 서랍 안에서 누렇게 바랬다.'; } },
    ],
  },
  {
    id: 'e_demo_tape', scene: 'recording', title: '데모 카세트', cooldown: 5, chance: 0.3,
    when: (c) => hasMedia('cassette', c.year, ct(c)) && !hasMedia('streaming', c.year, ct(c)) && c.year < 2005 && !!c.band && c.s.songs.length >= 2 && c.age >= 16 && c.age < 40 && !busy(c),
    text: () => '녹음기 두 대를 붙여 데모 카세트를 50개 복사했다.\n음반사와 라디오국, 공연 기획사에 돌려 볼까?',
    choices: [
      {
        label: '직접 돌린다',
        odds: (c) => c.dc(15, '귀에 걸릴 판정', [['곡 완성도', c.m(bestSong(c))], ['보컬', Math.floor(c.m(c.p.skills.vocal) / 2)]], '가정', '책상 위 데모 더미에서 살아남아야 한다'),
        run: (c) => {
          c.money(-c.krw(150_000), '공테이프·우표');
          if (c.check(c.choicesOdds!)) {
            c.rep(5);
            c.fans(120);
            c.set('demoNoticed');
            c.chron('데모 카세트가 음반사 사람 귀에 걸렸다', 'band');
            return '석 달 뒤 전화가 왔다. “테이프 잘 들었어요. 한번 만나죠.”';
          }
          return '돌아온 건 반송된 소포 두 개뿐이었다.';
        },
      },
      { label: '공연장에서 팔기로 한다', run: (c) => { c.money(c.krw(200_000), '데모 테이프 판매'); c.fans(30); return '공연 끝나고 테이블 위에 놓은 테이프가 하나둘 팔려 나갔다.'; } },
    ],
  },
  {
    id: 'e_record_shop', scene: 'street', title: '레코드 가게 진열대', once: true, chance: 0.35,
    when: (c) => !hasMedia('streaming', c.year, ct(c)) && c.s.albums.length > 0 && c.age < 60,
    text: (c) => `동네 레코드 가게 사장님이 우리 음반을 위탁으로 받아 주겠다고 한다.\n${hasMedia('cd', c.year, ct(c)) ? 'CD 진열대' : 'LP 칸'} 맨 아래, 손글씨 띠지를 붙여서.`,
    choices: [
      { label: '열 장 맡긴다', run: (c) => { c.money(c.krw(250_000), '위탁 판매'); c.fans(40); c.stat('happiness', 8); c.chron('레코드 가게 진열대에 우리 음반이 꽂혔다', 'music'); return '일주일 뒤 가 보니 세 장이 빠져 있었다. 누군가 우리 음악을 돈 주고 샀다.'; } },
      { label: '사장님께 한 장 선물한다', run: (c) => { c.rep(1); return '가게 스피커에서 우리 노래가 흘러나왔다.'; } },
    ],
  },
  {
    id: 'e_curfew_gig', scene: 'club', title: '통금 너머의 공연', once: true, chance: 0.4,
    when: (c) => kr(c) && yr(c, 1960, 1981.9) && !!c.band && c.age >= 17 && c.age < 40 && !busy(c),
    text: () => '공연이 길어져 자정이 다가온다. 지금 나가면 통금에 걸린다.\n공연장 주인이 말했다. “어차피 못 나가요. 통금 풀리는 새벽 네 시까지 계속하든가.”',
    choices: [
      { label: '새벽 네 시까지 연주한다', run: (c) => { c.fans(60); c.skill('stage', 3); c.stat('stress', 5); c.theme('night'); c.band!.chemistry = clamp(c.band!.chemistry + 5); c.chron('통금에 갇혀 새벽 네 시까지 공연했다', 'band'); return '갇힌 관객과 갇힌 밴드. 그날 밤 우리는 레퍼토리를 세 번 돌았다.'; } },
      { label: '서둘러 마치고 뛴다', odds: (c) => c.dc(11, '체력 판정', [['체력', c.m(c.p.talents?.stamina ?? 50)]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) return '사이렌이 울리기 1분 전, 대문을 닫았다.'; c.money(-c.krw(50_000), '통금 위반 벌금'); c.stat('stress', 6); return '골목에서 방범대원에게 붙잡혀 파출소에서 밤을 새웠다.'; } },
    ],
  },
  {
    id: 'e_long_hair', scene: 'street', title: '장발 단속', once: true, chance: 0.35,
    when: (c) => kr(c) && yr(c, 1970, 1980) && c.isMale && c.age >= 16 && c.age < 35 && !busy(c),
    text: () => '공연 가는 길, 경찰이 자를 들고 머리 길이를 재고 있다.\n귀를 덮는 머리는 단속 대상이다.',
    choices: [
      { label: '돌아서 골목으로 간다', odds: (c) => c.dc(12, '눈치 판정', [['체력', c.m(c.p.talents?.stamina ?? 50)]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.theme('rage'); return '기타 케이스를 끌어안고 골목을 세 개 돌아 공연장에 도착했다.'; } c.stat('happiness', -6); c.chron('장발 단속에 걸려 머리를 잘렸다', 'life'); return '파출소에서 머리를 잘렸다. 그날 무대에선 모자를 썼다.'; } },
      { label: '미리 머리를 자른다', run: (c) => { c.stat('happiness', -2); return '거울 속 짧은 머리가 낯설었다.'; } },
    ],
  },
  {
    id: 'e_curfew_end', scene: 'street', title: '통금이 풀린 밤', once: true, chance: 1, priority: 120,
    when: (c) => kr(c) && yr(c, 1982, 1982.5) && c.age >= 15 && c.age < 50,
    text: () => '36년 만에 야간 통행금지가 풀렸다.\n자정이 넘었는데도 거리에 사람들이 있다.',
    choices: [
      { label: '밤새 친구들과 거리를 걷는다', run: (c) => { c.stat('happiness', 10); c.theme('night'); return '새벽 세 시의 거리. 처음 보는 풍경이었다.'; } },
      { label: '밤새 합주한다', if: (c) => !!c.band, run: (c) => { c.skill('stage', 2); c.band!.chemistry = clamp(c.band!.chemistry + 5); c.theme('band'); return '시계를 보지 않고 연주한 첫 밤.'; } },
    ],
  },
  {
    id: 'e_pc_comm', scene: 'pub', title: 'PC통신 음악 동호회 정모', once: true, chance: 0.4,
    when: (c) => kr(c) && hasMedia('pc_comm', c.year, 'KR') && c.age >= 15 && c.age < 40 && !busy(c),
    text: () => '모뎀 접속음이 끝나면 들어가는 음악 동호회 게시판. 이번 주말 첫 정모가 있다.\n대화명으로만 알던 사람들을 실제로 만난다.',
    choices: [
      { label: '나간다', run: (c) => { const n = c.meet('pc', { metAt: 'PC통신 음악 동호회 정모', career: 'musician', affinity: 25, skill: c.rng.int(30, 65) }); c.genre(n.genre, 6); c.chron('PC통신 음악 동호회 정모에 나갔다', 'people'); return '대화명 ‘새벽기타’는 생각보다 수줍은 사람이었다. 같이 밴드 얘기를 밤새 했다.'; } },
      { label: '게시판에만 남는다', run: (c) => { c.skill('compose', 1); return '밤새 음악 리뷰를 읽고 썼다. 전화 요금 고지서가 무서웠다.'; } },
    ],
  },
  {
    id: 'e_imf', scene: 'office', title: '외환위기', once: true, chance: 1, priority: 140,
    when: (c) => kr(c) && yr(c, 1997.9, 1999) && c.age >= 18 && c.age < 60,
    text: (c) => `나라가 구제금융을 받았다. 회사들이 줄줄이 문을 닫는다.${c.band ? `\n〈${c.band.name}〉 합주실 월세도 올랐다. 멤버 하나는 아버지 회사가 부도났다고 했다.` : ''}`,
    choices: [
      { label: '허리띠를 졸라매고 버틴다', run: (c) => { c.money(-c.krw(800_000), '생활비 상승'); c.stat('stress', 8); if (c.band) c.band.chemistry = clamp(c.band.chemistry + 4); c.theme('city'); c.chron('외환위기를 버텼다', 'life'); return '라면으로 끼니를 때우면서도 합주는 빠지지 않았다.'; } },
      { label: '일자리부터 구한다', run: (c) => { c.p.job = 'part'; c.money(c.krw(600_000), '구한 일자리'); c.stat('stress', 4); if (c.band) c.band.chemistry = clamp(c.band.chemistry - 5); return '공사장, 주유소, 전단지. 음악은 밤에만 했다.'; } },
    ],
  },
  {
    id: 'e_mp3_spread', scene: 'home', title: '우리 노래가 파일로 퍼졌다', once: true, chance: 0.4,
    when: (c) => hasMedia('mp3', c.year, ct(c)) && c.year < 2007 && released(c).length > 0,
    text: () => '파일 공유 프로그램에 우리 노래가 올라와 있다. 다운로드 수가 꽤 된다.\n음반은 안 팔리는데 노래는 퍼지고 있다.',
    choices: [
      { label: '그래도 들어 주는 게 어디냐', run: (c) => { c.fans(150 + c.p.fans * 0.1); c.chron('우리 노래가 파일로 퍼졌다', 'music'); return '공연장에 처음 보는 얼굴들이 와서 가사를 다 따라 불렀다.'; } },
      { label: '불법 공유에 항의 글을 쓴다', run: (c) => { c.rep(2); c.stat('stress', 4); return '게시판에 글을 올렸다. 응원과 욕이 반반이었다.'; } },
    ],
  },
  {
    id: 'e_minihompy_bgm', scene: 'home', title: '배경음악 결제', once: true, chance: 0.4,
    when: (c) => kr(c) && hasMedia('minihompy', c.year, 'KR') && released(c).length > 0,
    text: () => '누군가 미니홈피 배경음악으로 우리 노래를 걸었다. 그걸 듣고 또 누군가가 결제했다.\n도토리 몇 개짜리 노래가 조금씩 팔리고 있다.',
    choices: [{ label: '정산 내역을 확인한다', run: (c) => { c.money(c.krw(300_000), '배경음악 정산'); c.fans(200); c.chron('우리 노래가 미니홈피 배경음악으로 팔렸다', 'music'); return '푼돈이었지만, 모르는 사람의 방에서 우리 노래가 흐른다는 게 좋았다.'; } }],
  },
  {
    id: 'e_tv_chart', scene: 'arena', title: 'TV 가요 순위 프로그램', cooldown: 8, chance: 0.4, priority: 115,
    when: (c) => kr(c) && hasMedia('music_tv', c.year, 'KR') && c.year < 2005 && !!c.band && c.p.fans >= 5000 && !busy(c),
    text: () => '지상파 가요 순위 프로그램에서 출연 섭외가 왔다.\n생방송 3분. 전국이 본다.',
    choices: [
      {
        label: '출연한다',
        odds: (c) => c.dc(14, '생방송 판정', [['무대', c.m(c.p.skills.stage)], ['보컬', Math.floor(c.m(c.p.skills.vocal) / 2)]], '가정', '라이브 밴드에게 TV 음향은 늘 낯설다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            c.fans(c.p.fans * 0.5 + 3000);
            c.rep(5);
            c.chron('TV 가요 순위 프로그램 생방송에 나갔다', 'big');
            return '다음 날 동네 슈퍼 아주머니가 알아봤다.';
          }
          c.fans(500);
          return '모니터 스피커가 안 들렸다. 그래도 화면 속 우리는 꽤 그럴듯했다.';
        },
      },
      { label: '밴드는 라이브로 말한다', run: (c) => { c.rep(2); return '거절했다. 클럽 관객들이 박수를 쳤다.'; } },
    ],
  },
  {
    id: 'e_walkman_gift', scene: 'home', title: '생일 선물', once: true, chance: 0.4,
    when: (c) => hasMedia('walkman', c.year, ct(c)) && c.year < 1999 && c.age >= 10 && c.age < 17,
    text: () => '생일 선물 상자 안에 휴대용 카세트 플레이어가 들어 있었다.',
    choices: [{ label: '테이프를 넣고 걷는다', run: (c) => { const g = c.pick([...GENRES]); c.genre(g, 6); c.stat('happiness', 10); c.theme('youth'); return '등굣길이 하나의 뮤직비디오가 됐다. 같은 테이프를 A면 B면 늘어질 때까지.'; } }],
  },
  {
    id: 'e_live_aid', scene: 'home', title: '라이브 에이드 생중계', once: true, chance: 1, priority: 105, minYear: 1985.5, maxYear: 1985.9,
    when: (c) => c.age >= 10 && c.age < 50 && hasMedia('tv', c.year, ct(c)),
    text: () => '런던과 필라델피아를 잇는 자선 공연이 전 세계에 생중계됐다.\nTV 앞에서 밤을 새웠다.',
    choices: [{ label: '그 무대를 눈에 담는다', run: (c) => { c.stat('happiness', 8); c.theme('dream'); c.genre('indierock', 6); c.chron('1985년 7월, 라이브 에이드 생중계를 밤새 봤다', 'music'); return '수만 명이 한 노래를 부르는 장면. 음악이 세상을 움직일 수 있다고 처음 믿었다.'; } }],
  },
  {
    id: 'e_wall_falls', scene: 'street', title: '장벽이 무너진 밤', once: true, chance: 1, priority: 150, minYear: 1989.8, maxYear: 1990.2,
    when: (c) => ct(c) === 'DE' && c.age >= 12 && c.age < 70,
    text: () => '베를린 장벽이 열렸다. 거리마다 사람들이 쏟아져 나왔다.',
    choices: [
      { label: '기타를 들고 거리로 나간다', if: (c) => !!c.p.mainInst, run: (c) => { c.fans(150); c.stat('happiness', 15); c.theme('dream'); c.chron('1989년 11월, 장벽 앞에서 노래했다', 'big'); return '모르는 사람들이 어깨동무를 하고 따라 불렀다. 동쪽에서 온 드러머가 깡통으로 박자를 맞췄다.'; } },
      { label: '그 밤을 지켜본다', run: (c) => { c.stat('happiness', 10); c.theme('dream'); return '평생 잊지 못할 밤이었다.'; } },
    ],
  },
  {
    id: 'e_censor_br', scene: 'office', title: '가사 검열', once: true, chance: 0.5, minYear: 1968, maxYear: 1984.9,
    when: (c) => ct(c) === 'BR' && c.s.songs.length > 0 && c.age >= 16,
    text: () => '군사 정부의 검열 위원회에 가사를 제출해야 한다. 빨간 줄이 그어질지도 모른다.',
    choices: [
      { label: '비유로 바꿔 쓴다', odds: (c) => c.dc(13, '작사 판정', [['가사 감각', c.m(c.p.talents?.lyric ?? 50)], ['작곡', Math.floor(c.m(c.p.skills.compose) / 2)]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.rep(4); c.theme('rage'); return '검열관은 통과시켰고, 관객은 숨은 뜻을 알아들었다.'; } c.stat('stress', 6); return '두 번 반려됐다. 결국 그 곡은 공연에서만 불렀다.'; } },
      { label: '그대로 낸다', run: (c) => { c.fans(-Math.round(c.p.fans * 0.2)); c.theme('rage'); c.chron('가사가 검열에 걸렸다', 'life'); return '금지 통보가 왔다. 그 노래는 입소문으로만 남았다.'; } },
    ],
  },
];
