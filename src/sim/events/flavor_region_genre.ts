// 지역·장르별 장면. 사는 곳과 하는 음악에 따라 인생마다 다른 사건이 열린다.
// 클럽·페스티벌·방송·브랜드는 실명 대신 묘사로 쓴다.

import type { EventDef, Ctx } from '../ctx';
import type { Genre } from '../types';
import { josa } from '../korean';

const free = (c: Ctx) => c.p.military !== 'serving';
const between = (c: Ctx, a: number, b: number) => c.age >= a && c.age < b;
/** 밴드 장르가 g 이거나, 밴드가 없으면 그 장르를 좋아할 때 */
const isG = (c: Ctx, g: Genre) => c.band?.genre === g || (!c.band && c.p.genre[g] >= 40);
const bandName = (c: Ctx) => (c.band ? `〈${c.band.name}〉` : '우리');
const gainGlobal = (c: Ctx, n: number) => {
  c.p.globalFans = Math.max(0, c.p.globalFans + n);
  c.line(`해외 팬 +${n}`, 'good');
};

export const REGION_GENRE: EventDef[] = [
  // ───────── 서울 ─────────
  {
    id: 'rg_seoul_clubday', scene: 'club', title: '클럽 데이 같은 밤', cooldown: 8, chance: 0.18,
    when: (c) => c.p.region === 'seoul' && free(c) && between(c, 19, 40),
    text: () => '한 장의 팔찌로 동네 라이브 클럽 여러 곳을 오가는 밤.\n골목마다 다른 밴드 소리가 새어 나오고, 줄 선 사람들 사이로 아는 얼굴이 보인다.',
    choices: [
      {
        label: '즉석 오프닝 자리를 노려 본다',
        if: (c) => !!c.p.mainInst,
        odds: (c) => c.dc(14, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['평판', c.p.rep >= 20 ? 2 : 0]], '가정', '빈 시간대를 메워 줄 팀을 급히 찾는 경우를 가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.fans(c.rng.int(15, 40)); c.rep(3); c.skill('stage', 3); return '세 곡만 하기로 했는데 앵콜이 나왔다. 팔찌 찬 손들이 위로 올라갔다.'; }
          c.stat('stress', 5); return '사장님은 웃으며 명함만 받아 갔다. “다음에 연락드릴게요.”';
        },
      },
      { label: '관객으로 밤새 돌아다닌다', run: (c) => { c.stat('happiness', 6); c.stat('energy', -6); c.theme('city'); return '새벽 두 시, 다섯 번째 클럽에서 귀가 먹먹한 채로 웃고 있었다.'; } },
    ],
  },
  {
    id: 'rg_seoul_lasttrain', scene: 'street', title: '지하철 막차', cooldown: 10, chance: 0.15,
    when: (c) => c.p.region === 'seoul' && free(c) && !!c.band && between(c, 17, 40),
    text: (c) => `${bandName(c)} 합주가 길어졌다. 시계는 11시 50분.\n막차까지 뛰면 10분, 한 곡만 더 맞추면 새벽 택시다.`,
    choices: [
      {
        label: '한 곡만 더 맞춘다',
        run: (c) => { c.skill(c.p.mainInst ?? 'stage', 3); c.money(-c.krw(28_000), '택시비'); c.stat('energy', -5); return '마지막 브리지가 드디어 맞았다. 택시 창밖으로 한강이 번졌다.'; },
      },
      {
        label: '장비를 메고 막차를 향해 뛴다',
        odds: (c) => c.dc(11, '체력 판정', [['체력', c.m(c.p.stats.health)], ['컨디션', c.m(c.p.stats.energy)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.stat('happiness', 3); return '문 닫히기 직전에 몸을 밀어 넣었다. 기타 케이스가 아슬아슬하게 따라 들어왔다.'; }
          c.money(-c.krw(32_000), '택시비'); c.stat('stress', 4); return '눈앞에서 문이 닫혔다. 빈 승강장에서 숨만 몰아쉬었다.';
        },
      },
    ],
  },
  // ───────── 경기·인천 ─────────
  {
    id: 'rg_gg_bus', scene: 'street', title: '광역버스 막차를 놓친 밤', cooldown: 10, chance: 0.18,
    when: (c) => c.p.region === 'gyeonggi' && free(c) && between(c, 17, 40),
    text: () => '공연 뒤풀이에서 일어났을 땐 이미 늦었다. 광역버스 막차가 떠났다.\n정류장 전광판에 ‘운행 종료’가 깜빡인다.',
    choices: [
      { label: '첫차까지 24시간 카페에서 곡을 쓴다', run: (c) => { c.skill('compose', 3); c.stat('energy', -8); c.theme('night'); return '새벽 다섯 시, 냅킨 세 장에 가사가 빼곡했다.'; } },
      { label: '아는 사람에게 재워 달라고 연락한다', odds: (c) => c.dc(10, '인맥 판정', [['평판', c.m(c.p.rep + 30)]], '가정'), run: (c) => {
        if (c.check(c.choicesOdds!)) { c.stat('happiness', 4); c.meet('host', { metAt: '막차 놓친 밤 재워 준 동료', affinity: 30 }); return `소파를 내준 ${c.nj('host', '은/는')} 새벽까지 자기 데모를 들려줬다.`; }
        c.money(-c.krw(45_000), '심야 택시비'); c.stat('stress', 5); return '답장은 없었다. 할증 붙은 택시 미터기가 무섭게 올라갔다.';
      } },
    ],
  },
  {
    id: 'rg_gg_basement', scene: 'studio', title: '신도시 상가 지하 합주실', once: true, chance: 0.2,
    when: (c) => c.p.region === 'gyeonggi' && free(c) && !!c.p.mainInst && between(c, 15, 35),
    text: () => '신도시 상가 지하, 빈 점포 자리에 합주실이 생겼다.\n방음은 허술하지만 시간당 요금이 서울의 절반이다. 윗층 학원 원장님 표정이 좋지 않다.',
    choices: [
      { label: '월 정액으로 끊는다', run: (c) => { c.money(-c.krw(250_000), '합주실 월 정액'); c.skill(c.p.mainInst!, 4); c.set('rg_basement'); return '매일 밤 같은 방, 같은 냄새. 손이 확실히 빨라졌다.'; } },
      { label: '학원 원장님께 먼저 인사드린다', odds: (c) => c.dc(12, '설득 판정', [['무대', c.m(c.p.skills.stage)], ['평판', c.p.rep >= 15 ? 1 : 0]], '가정'), run: (c) => {
        if (c.check(c.choicesOdds!)) { c.skill(c.p.mainInst!, 3); c.money(c.krw(150_000), '레슨비'); return '원장님 아들이 기타를 배우고 싶어 했다. 첫 레슨 제자가 생겼다.'; }
        c.stat('stress', 5); return '“밤 열 시 넘어서는 북 치지 마세요.” 합주 시간이 반으로 줄었다.';
      } },
    ],
  },
  // ───────── 광역시 ─────────
  {
    id: 'rg_metro_owner', scene: 'club', title: '터줏대감 클럽 사장님', once: true, chance: 0.2,
    when: (c) => c.p.region === 'metro' && free(c) && !!c.band && between(c, 18, 40),
    text: () => '이 도시 인디 씬을 이십 년 넘게 지켜 온 지하 클럽.\n사장님이 팔짱을 끼고 리허설을 본다. “여기 무대 서려면 내 귀부터 통과해야 해.”',
    choices: [
      {
        label: '제일 자신 있는 곡으로 정면 승부',
        odds: (c) => c.dc(14, '연주 판정', [['주 악기', c.m(c.p.skills[c.p.mainInst ?? 'stage'])], ['무대', c.m(c.p.skills.stage)]], '가정'),
        run: (c) => {
          c.meet('owner', { metAt: '지역 터줏대감 클럽', affinity: 20, birthYear: c.p.birthYear - 25 });
          if (c.check(c.choicesOdds!)) { c.rel('owner', 15, '리허설 한 곡으로 인정받은 날'); c.rep(5); c.set('rg_metro_home'); return `${c.nj('owner', '이/가')} 팔짱을 풀었다. “다음 달 금요일, 비워 둘게.”`; }
          c.rel('owner', 3); c.stat('stress', 5); return '“아직 서울 흉내야. 너희 동네 얘기를 해 봐.” 그 말이 오래 남았다.';
        },
      },
      { label: '이 도시 이야기를 담은 곡을 들려준다', run: (c) => { c.skill('compose', 3); c.theme('city'); c.rep(2); return '사장님이 담배를 끄고 조용히 끝까지 들었다. “그래, 그게 너희 거다.”'; } },
    ],
  },
  {
    id: 'rg_metro_tv', scene: 'studio', title: '지역 방송국 음악 프로', once: true, chance: 0.18,
    when: (c) => c.p.region === 'metro' && free(c) && !!c.band && c.p.fans >= 100 && between(c, 19, 45),
    text: () => '지역 방송국의 심야 라이브 음악 프로그램에서 섭외 전화가 왔다.\n출연료는 적지만 이 도시 사람들 대부분이 한 번쯤 본다는 프로다.',
    choices: [
      {
        label: '라이브로 간다',
        odds: (c) => c.dc(13, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['보컬', c.m(c.p.skills.vocal)]], '가정', '방송 라이브는 모니터 환경이 낯설어 실수가 잦다'),
        run: (c) => {
          c.money(c.krw(300_000), '출연료');
          if (c.check(c.choicesOdds!)) { c.fans(c.rng.int(80, 200)); c.rep(4); c.chron('지역 방송 음악 프로에 출연했다', 'band'); return '다음 날 시장 떡집 사장님이 알아봤다. “어제 그 밴드 맞제?”'; }
          c.fans(20); c.stat('stress', 6); return '인이어가 꺼져 반 박자 밀렸다. 그래도 엄마는 녹화본을 열 번 봤다.';
        },
      },
      { label: '편집 가능한 사전 녹화로 부탁한다', run: (c) => { c.money(c.krw(300_000), '출연료'); c.fans(40); return '깔끔하게 나왔다. 다만 어딘가 심심한 화면이었다.'; } },
    ],
  },
  // ───────── 지방 소도시 ─────────
  {
    id: 'rg_local_festival', scene: 'festival', title: '읍내 축제 무대', cooldown: 12, chance: 0.2,
    when: (c) => c.p.region === 'local' && free(c) && !!c.p.mainInst && between(c, 14, 45),
    text: () => '바닷가 축제 특설무대. 트로트 가수와 노래자랑 사이에 ‘젊은 밴드’ 순서가 끼어 있다.\n객석엔 돗자리를 편 어르신들과 오징어를 굽는 연기.',
    choices: [
      {
        label: '우리 곡으로 밀고 간다',
        odds: (c) => c.dc(13, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['고향 무대', 1]], '가정'),
        run: (c) => {
          c.money(c.krw(200_000), '출연료');
          if (c.check(c.choicesOdds!)) { c.fans(c.rng.int(30, 70)); c.skill('stage', 3); return '할머니 한 분이 일어나 춤을 췄다. 그걸 찍은 영상이 동네 단톡방을 돌았다.'; }
          c.stat('stress', 4); return '박수는 예의 바르게 짧았다. 다음 순서 노래자랑이 더 뜨거웠다.';
        },
      },
      { label: '옛날 가요를 밴드 편곡으로 부른다', run: (c) => { c.money(c.krw(200_000), '출연료'); c.fans(25); c.stat('happiness', 5); c.theme('family'); return '어르신들이 떼창을 했다. 군수님이 내년에도 오라고 했다.'; } },
    ],
  },
  {
    id: 'rg_local_stay', scene: 'rooftop', title: '상경이냐, 여기서 버티기냐', once: true, chance: 0.22,
    when: (c) => c.p.region === 'local' && free(c) && !!c.p.mainInst && between(c, 20, 32),
    text: () => '친구들은 하나둘 서울로 떠났다. 합주실도, 공연장도, 관객도 거기 있다고.\n그런데 이 동네엔 아무도 하지 않는 것이 있다. 씬이 없다면 만들면 되지 않을까.',
    choices: [
      {
        label: '여기서 작은 공연을 직접 연다',
        odds: (c) => c.dc(14, '기획 판정', [['무대', c.m(c.p.skills.stage)], ['평판', c.m(c.p.rep + 30)]], '가정', '관객층이 얇은 지역에서 자체 공연이 자리 잡는 경우를 가정'),
        run: (c) => {
          c.money(-c.krw(300_000), '대관');
          if (c.check(c.choicesOdds!)) { c.fans(c.rng.int(40, 90)); c.rep(5); c.set('rg_local_scene'); c.chron('고향에 작은 인디 공연을 처음 열었다', 'big'); return '폐창고 공연에 예순 명이 왔다. 고등학생 둘이 밴드를 하겠다며 찾아왔다.'; }
          c.stat('stress', 7); return '관객은 열두 명. 그래도 그중 셋은 다음 달에도 오겠다고 했다.';
        },
      },
      { label: '짐을 싸서 서울로 간다', run: (c) => { c.p.region = 'seoul'; c.money(-c.krw(1_500_000), '이사 보증금'); c.stat('stress', 6); c.theme('city'); c.chron('고향을 떠나 서울로 올라왔다', 'life'); return '고속버스 창밖으로 바다가 멀어졌다. 가방 속엔 고향에서 쓴 노래 열 곡.'; } },
      { label: '아직 결정하지 않는다', run: (c) => { c.stat('stress', 3); c.theme('youth'); return '옥상에서 바다 쪽 불빛을 오래 봤다.'; } },
    ],
  },
  // ───────── 인디록 ─────────
  {
    id: 'rg_rock_contest', scene: 'club', title: '밴드 경연대회', cooldown: 16, chance: 0.18,
    when: (c) => isG(c, 'indierock') && !!c.band && free(c) && between(c, 17, 35),
    text: () => '신인 록 밴드 경연대회 공고. 우승 팀에겐 녹음 지원과 페스티벌 무대.\n예선 영상 마감은 이번 주 일요일.',
    choices: [
      {
        label: '라이브 한 방으로 도전한다',
        odds: (c) => c.dc(15, '무대 판정', [['기타', c.m(c.p.skills.guitar)], ['무대', c.m(c.p.skills.stage)], ['팬', c.p.fans >= 300 ? 2 : 0]], '통계', '경연대회 본선 진출률 대략 5~10% 수준을 가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(1_000_000), '상금 지원금'); c.fans(c.rng.int(100, 250)); c.rep(6); c.chron(`${bandName(c)}, 밴드 경연대회 입상`, 'band'); return '결선 마지막 곡, 심사위원 하나가 고개를 까딱이는 게 보였다.'; }
          c.skill('stage', 2); c.stat('stress', 5); return '예선 탈락. 심사평엔 “에너지는 좋으나 곡이 아직”이라고 적혀 있었다.';
        },
      },
      { label: '경연은 우리 스타일이 아니다', run: (c) => { c.skill('compose', 2); c.stat('happiness', 2); return '그 주말엔 대신 새 곡을 썼다. 제목은 ‘탈락하지 않는 법’.'; } },
    ],
  },
  {
    id: 'rg_rock_gear', scene: 'street', title: '장비 욕심', cooldown: 14, chance: 0.15,
    when: (c) => isG(c, 'indierock') && free(c) && (c.p.mainInst === 'guitar' || c.p.mainInst === 'bass') && between(c, 16, 50),
    text: () => '중고 장터에 빈티지 진공관 앰프가 올라왔다. 사진만 봐도 소리가 들리는 것 같다.\n가격은 통장 잔고의 절반쯤.',
    choices: [
      { label: '산다. 이건 운명이다', run: (c) => { c.money(-c.krw(1_200_000), '앰프'); c.skill(c.p.mainInst!, 4); c.stat('happiness', 7); return '첫 코드를 긁는 순간, 방 전체가 따뜻해졌다. 통장은 차가워졌다.'; } },
      {
        label: '흥정해 본다',
        odds: (c) => c.dc(13, '흥정 판정', [['무대 말빨', c.m(c.p.skills.stage)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(-c.krw(800_000), '앰프'); c.skill(c.p.mainInst!, 4); return '“음악 하는 사람이니까.” 판매자가 40만 원을 깎아 줬다.'; }
          c.stat('stress', 3); return '그사이 다른 사람이 정가에 사 갔다.';
        },
      },
      { label: '지금 장비로 충분하다', run: (c) => { c.skill(c.p.mainInst!, 1); return '손가락이 톤이라고 누가 그랬다. 오늘은 그 말을 믿기로 했다.'; } },
    ],
  },
  // ───────── 펑크 ─────────
  {
    id: 'rg_punk_diy', scene: 'club', title: 'DIY 공연', cooldown: 12, chance: 0.2,
    when: (c) => isG(c, 'punk') && free(c) && !!c.p.mainInst && between(c, 16, 40),
    text: () => '빌린 지하 연습실, 빌린 PA, 입장료는 자율. 포스터는 복사기로 뽑았다.\n“공연장이 안 불러 주면 우리가 공연장이 되면 돼.”',
    choices: [
      {
        label: '판을 크게 벌인다',
        odds: (c) => c.dc(13, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['드럼', c.m(c.p.skills.drums)]], '가정'),
        run: (c) => {
          c.money(-c.krw(150_000), '대관');
          if (c.check(c.choicesOdds!)) { c.money(c.krw(400_000), '공연 수익'); c.fans(c.rng.int(30, 80)); c.rep(3); return '천장에서 땀이 떨어졌다. 모르는 사람들이 어깨동무를 하고 후렴을 외쳤다.'; }
          c.stat('stress', 5); return '경찰이 소음 신고로 두 번 왔다. 세 번째 곡에서 전기가 나갔다.';
        },
      },
      { label: '친구들끼리 조촐하게 한다', run: (c) => { c.skill('stage', 2); c.stat('happiness', 6); return '관객 스무 명, 전원이 아는 얼굴. 그래도 제일 시끄러운 밤이었다.'; } },
    ],
  },
  {
    id: 'rg_punk_zine', scene: 'home', title: '자체 제작 진(zine)', once: true, chance: 0.18,
    when: (c) => isG(c, 'punk') && free(c) && between(c, 15, 40),
    text: () => '가위, 풀, 복사기. 공연 후기와 가사, 엉망인 만화를 오려 붙여 손바닥만 한 잡지를 만들기로 했다.',
    choices: [
      { label: '100부 찍어 공연장에서 나눠 준다', run: (c) => { c.money(-c.krw(60_000), '복사비'); c.fans(c.rng.int(15, 40)); c.skill('compose', 2); c.theme('youth'); return '누군가 그 진을 벽에 붙여 놨다는 사진을 보내왔다.'; } },
      {
        label: '날 선 사회 비평을 싣는다',
        odds: (c) => c.dc(12, '작사 판정', [['작곡', c.m(c.p.skills.compose)], ['가사 감각', c.m(c.p.talents.lyric)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.rep(4); c.fans(c.rng.int(30, 60)); c.theme('city'); return '“이 글 쓴 사람 누구야?” 온라인 커뮤니티에 스캔본이 돌았다.'; }
          c.rep(-2); return '과격한 문장 하나만 잘려서 퍼졌다. 해명 글은 아무도 안 읽었다.';
        },
      },
    ],
  },
  // ───────── 슈게이즈 ─────────
  {
    id: 'rg_shoe_pedal', scene: 'studio', title: '페달보드 집착', cooldown: 14, chance: 0.18,
    when: (c) => isG(c, 'shoegaze') && free(c) && (c.p.mainInst === 'guitar' || c.p.mainInst === 'bass') && between(c, 16, 50),
    text: () => '페달보드에 열네 번째 이펙터를 올렸다. 그래도 그 소리가 안 난다.\n리버브 뒤에 퍼즈를 걸어야 하나, 퍼즈 뒤에 리버브를 걸어야 하나.',
    choices: [
      { label: '새 페달을 하나 더 산다', run: (c) => { c.money(-c.krw(350_000), '이펙터'); c.skill(c.p.mainInst!, 2); c.stat('happiness', 4); return '택배 상자를 뜯는 순간이 연주보다 좋았다. 그게 문제였다.'; } },
      {
        label: '배선을 뜯고 처음부터 다시 짠다',
        odds: (c) => c.dc(13, '사운드 판정', [['주 악기', c.m(c.p.skills[c.p.mainInst!])], ['작곡', c.m(c.p.skills.compose)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill(c.p.mainInst!, 4); c.skill('compose', 2); c.theme('night'); return '새벽 세 시, 스피커에서 안개 같은 벽이 솟아올랐다. 바로 이 소리였다.'; }
          c.stat('stress', 5); return '험 노이즈만 웅웅댔다. 패치 케이블 하나가 단선이었다.';
        },
      },
    ],
  },
  {
    id: 'rg_shoe_overseas', scene: 'home', title: '바다 건너의 리스너', once: true, chance: 0.2,
    when: (c) => isG(c, 'shoegaze') && free(c) && c.s.songs.some((x) => x.released) && between(c, 17, 50),
    text: () => '스트리밍 통계를 보다가 눈을 의심했다. 청취자 1위 도시가 서울이 아니라 지구 반대편이다.\n해외 음악 블로그에서 우리 곡을 ‘올해의 발견’이라고 썼다.',
    choices: [
      {
        label: '영어로 감사 메시지와 미공개 데모를 올린다',
        odds: (c) => c.dc(12, '소통 판정', [['평판', c.m(c.p.rep + 30)], ['이중 언어', c.flag('bilingual') ? 3 : 0]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { gainGlobal(c, c.rng.int(200, 500)); c.rep(3); c.chron('해외 리스너가 먼저 우리 음악을 알아봤다', 'music'); return '“From Brazil with love.” 댓글이 밤새 쌓였다.'; }
          gainGlobal(c, 50); return '번역기 문장이 어색했지만, 몇 명은 그마저 좋다고 했다.';
        },
      },
      { label: '조용히 다음 곡에 집중한다', run: (c) => { gainGlobal(c, 80); c.skill('compose', 3); return '알고리즘은 몰라도 노이즈는 국경을 모른다.'; } },
    ],
  },
  // ───────── 포크 ─────────
  {
    id: 'rg_folk_busking', scene: 'street', title: '버스킹 단속', cooldown: 10, chance: 0.18,
    when: (c) => isG(c, 'folk') && free(c) && !!c.p.mainInst && between(c, 15, 45),
    text: () => '골목 버스킹 세 번째 곡. 사람들이 막 모이기 시작했는데 구청 단속반이 다가온다.\n“여기 허가 구역 아닌 거 아시죠?”',
    choices: [
      { label: '바로 접고 사과한다', run: (c) => { c.stat('stress', 3); c.set('rg_busk_permit'); return '단속반이 공식 버스킹 존 신청 방법을 알려 줬다. 생각보다 친절했다.'; } },
      {
        label: '“한 곡만 끝내고요.” 웃으며 부탁한다',
        odds: (c) => c.dc(13, '설득 판정', [['보컬', c.m(c.p.skills.vocal)], ['무대', c.m(c.p.skills.stage)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.fans(c.rng.int(10, 30)); c.money(c.krw(40_000), '기타 케이스'); return '단속반 아저씨가 팔짱 끼고 끝까지 들었다. 마지막엔 박수까지.'; }
          c.money(-c.krw(50_000), '과태료'); c.stat('stress', 5); return '경고장을 받았다. 기타 케이스의 동전보다 과태료가 컸다.';
        },
      },
    ],
  },
  {
    id: 'rg_folk_ssw', scene: 'stage_old', title: '싱어송라이터 경연', once: true, chance: 0.18,
    when: (c) => isG(c, 'folk') && free(c) && c.p.skills.compose >= 25 && between(c, 17, 40),
    text: () => '자작곡만 받는 싱어송라이터 경연. 통기타 한 대와 목소리, 그리고 가사.\n본선 무대는 오래된 소극장이다.',
    choices: [
      {
        label: '가장 사적인 곡을 부른다',
        odds: (c) => c.dc(14, '작곡 판정', [['작곡', c.m(c.p.skills.compose)], ['보컬', c.m(c.p.skills.vocal)], ['가사 감각', c.m(c.p.talents.lyric)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(1_500_000), '상금 지원금'); c.rep(6); c.fans(c.rng.int(80, 200)); c.chron('싱어송라이터 경연에서 상을 받았다', 'music'); return '마지막 소절에서 객석 맨 앞 사람이 눈을 훔쳤다.'; }
          c.skill('vocal', 2); c.theme('loss'); return '떨어졌다. 그런데 심사위원 한 명이 대기실로 찾아와 악수를 청했다.';
        },
      },
      { label: '무난하게 밝은 곡으로 간다', run: (c) => { c.fans(20); c.skill('stage', 2); return '장려상. “잘하는데, 당신 얘기가 안 들려요.”'; } },
    ],
  },
  // ───────── 메탈 ─────────
  {
    id: 'rg_metal_club', scene: 'pub', title: '메탈 동호회', once: true, chance: 0.2,
    when: (c) => isG(c, 'metal') && free(c) && between(c, 16, 50),
    text: () => '온라인 메탈 동호회 정모. 검은 티셔츠 스무 명이 맥주잔을 들고 있다.\n“무슨 밴드 좋아해요?” 질문이 시험처럼 느껴진다.',
    choices: [
      {
        label: '마니아 토론에 정면으로 뛰어든다',
        odds: (c) => c.dc(12, '지식 판정', [['메탈 친숙도', c.m(c.p.genre.metal)], ['기타', c.m(c.p.skills.guitar)]], '가정'),
        run: (c) => {
          c.meet('mh', { metAt: '메탈 동호회 정모', genre: 'metal', inst: c.pick(['drums', 'bass', 'guitar'] as const), affinity: 25 });
          if (c.check(c.choicesOdds!)) { c.rel('mh', 12, '정모에서 의기투합'); c.fans(30); c.genre('metal', 5); return `${c.nj('mh', '이/가')} 잔을 부딪쳤다. “형, 아니 너, 진짜구나.”`; }
          c.rel('mh', 3); c.stat('stress', 3); return '앨범 발매 연도를 하나 틀렸다. 그날 밤 내내 그 얘기를 들었다.';
        },
      },
      { label: '조용히 듣다가 합주 이야기만 한다', run: (c) => { c.genre('metal', 4); c.stat('happiness', 3); return '평생 갈 팬들이 어떤 사람들인지, 오늘 조금 알았다.'; } },
    ],
  },
  {
    id: 'rg_metal_neck', scene: 'hospital', title: '헤드뱅잉의 대가', cooldown: 20, chance: 0.12,
    when: (c) => isG(c, 'metal') && free(c) && !!c.band && between(c, 22, 60),
    text: () => '어젯밤 공연에서 앵콜 두 곡을 헤드뱅잉으로 버텼다.\n아침에 고개가 안 돌아간다. 정형외과 대기실에 앉아 있다.',
    choices: [
      { label: '2주 동안 쉰다', run: (c) => { c.stat('health', 3); c.stat('happiness', -3); c.money(-c.krw(120_000), '물리치료비'); return '목 보호대를 차고 페달보드만 정리했다.'; } },
      {
        label: '진통제 먹고 다음 공연도 뛴다',
        odds: (c) => c.dc(13, '체력 판정', [['건강', c.m(c.p.stats.health)], ['체력 재능', c.m(c.p.talents.stamina)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.fans(c.rng.int(20, 50)); c.skill('stage', 2); return '고개는 덜 흔들었지만 객석이 대신 흔들어 줬다.'; }
          c.stat('health', -8); c.stat('stress', 6); return '두 번째 곡에서 목이 굳었다. 한 달 넘게 물리치료를 다녔다.';
        },
      },
    ],
  },
  // ───────── 인디팝 ─────────
  {
    id: 'rg_pop_shortform', scene: 'studio', title: '숏폼 챌린지 협찬', once: true, chance: 0.18,
    when: (c) => isG(c, 'indiepop') && free(c) && c.s.songs.some((x) => x.released) && between(c, 17, 40),
    text: () => '화장품 회사 마케팅팀에서 메일이 왔다.\n우리 곡 후렴 15초로 숏폼 챌린지를 만들고 싶다고. 단, 가사 한 줄을 제품 이름으로 바꿔 달란다.',
    choices: [
      {
        label: '가사를 바꿔서 수락한다',
        odds: (c) => c.dc(12, '바이럴 판정', [['작곡', c.m(c.p.skills.compose)], ['팬', c.p.fans >= 500 ? 2 : 0]], '가정', '협찬 챌린지가 자연스럽게 퍼질 확률을 가정'),
        run: (c) => {
          c.money(c.krw(2_500_000), '광고 음악');
          if (c.check(c.choicesOdds!)) { c.fans(c.rng.int(300, 800)); return '챌린지가 터졌다. 다만 사람들은 그 곡을 제품 이름으로 불렀다.'; }
          c.rep(-3); return '조회수는 애매했고 “광고 같다”는 댓글만 남았다.';
        },
      },
      { label: '원곡 그대로라면 하겠다고 한다', odds: (c) => c.dc(14, '협상 판정', [['평판', c.m(c.p.rep + 30)], ['팬', c.p.fans >= 1000 ? 2 : 0]], '가정'), run: (c) => {
        if (c.check(c.choicesOdds!)) { c.money(c.krw(1_500_000), '광고 음악'); c.fans(c.rng.int(150, 400)); c.rep(3); return '“그 진정성이 오히려 좋네요.” 원곡 그대로 챌린지가 시작됐다.'; }
        c.stat('stress', 3); return '답장이 오지 않았다. 일주일 뒤 비슷한 곡으로 챌린지가 올라왔다.';
      } },
      { label: '거절한다', run: (c) => { c.rep(2); c.stat('happiness', 2); return '통장은 그대로, 마음은 가벼웠다.'; } },
    ],
  },
  {
    id: 'rg_pop_cafe', scene: 'street', title: '카페 BGM 제안', cooldown: 16, chance: 0.15,
    when: (c) => isG(c, 'indiepop') && free(c) && c.p.skills.compose >= 20 && between(c, 18, 50),
    text: () => '동네 카페 사장님이 우리 노래를 매일 튼다며 연락했다.\n“가게 분위기에 맞는 연주곡 몇 개 만들어 주실 수 있어요? 비용은 드릴게요.”',
    choices: [
      {
        label: '가게에 맞춘 연주곡 다섯 곡을 만든다',
        odds: (c) => c.dc(11, '작곡 판정', [['작곡', c.m(c.p.skills.compose)], ['건반', c.m(c.p.skills.keys)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(800_000), '작곡'); c.fans(c.rng.int(20, 60)); c.skill('keys', 2); return '손님들이 “이 노래 뭐예요?”라고 묻기 시작했다. 사장님이 우리 이름을 칠판에 적었다.'; }
          c.money(c.krw(300_000), '작곡'); return '사장님은 두 곡만 골랐다. “나머진 너무 졸려서요.”';
        },
      },
      { label: '기존 곡 사용만 허락한다', run: (c) => { c.fans(15); c.stat('happiness', 3); c.theme('city'); return `카페 창가에서 ${josa('내 노래', '이/가')} 흘러나왔다. 커피 맛이 조금 달았다.`; } },
    ],
  },
];
