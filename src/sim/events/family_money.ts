// 결혼·육아, 대출·빚, 팬의 증감. life.ts 의 결혼·아이 플래그 위에 얹는 생활의 무게.

import type { EventDef, Ctx } from '../ctx';
import type { Npc } from '../types';
import { createNpc } from '../npc';
import { josa, won, withFamilyName } from '../korean';
import { clamp } from '../rng';

const between = (c: Ctx, a: number, b: number) => c.age >= a && c.age < b;
const free = (c: Ctx) => c.p.military !== 'serving';
const hasPartner = (c: Ctx) => !!c.p.partnerId && !!c.s.npcs[c.p.partnerId]?.alive;
const bindPartner = (c: Ctx): boolean => {
  if (!hasPartner(c)) return false;
  c.bind.pt = c.p.partnerId!;
  return true;
};
const kid = (c: Ctx): Npc | undefined => {
  const id = c.s.flags.childId as string | undefined;
  const n = id ? c.s.npcs[id] : undefined;
  return n && n.alive ? n : undefined;
};
const kidAge = (c: Ctx) => {
  const k = kid(c);
  return k ? c.year - k.birthYear : -1;
};
const kidBetween = (c: Ctx, a: number, b: number) => {
  const k = kidAge(c);
  return k >= a && k < b;
};
const bindKid = (c: Ctx): boolean => {
  const k = kid(c);
  if (!k) return false;
  c.bind.k = k.id;
  return true;
};
/** 아이가 부르는 나 */
const parentWord = (c: Ctx) => (c.isMale ? '아빠' : '엄마');
const parentAlive = (c: Ctx) => ['mom', 'dad'].some((k) => {
  const n = c.s.npcs[c.s.flags[k] as string];
  return !!n && n.alive;
});
const lastRelease = (c: Ctx) => c.s.albums.reduce((m, a) => Math.max(m, a.year), 0);
const loan = (c: Ctx, amount2026: number, rate: number, kind: string) => {
  c.borrow(c.krw(amount2026), rate, kind);
  c.set('hadDebt');
};
const cut = (c: Ctx, ratio: number) => c.fans(-Math.round(c.p.fans * ratio));

export const FAMILY_MONEY: EventDef[] = [
  // ───────── A. 결혼·육아 ─────────
  {
    id: 'fm_wedding_cost', scene: 'home', title: '결혼 비용 계산서', chance: 0.3, once: true,
    when: (c) => !!c.flag('married') && !c.flag('weddingDone') && between(c, 25, 45),
    bind: bindPartner,
    text: (c) => `${c.nj('pt', '과/와')} 식탁에 앉아 견적서를 펼쳤다.\n예식장, 스드메, 예물, 혼수… 신혼집을 빼고도 평균 6천만 원이 넘는다는 기사가 떠오른다.\n계산기 숫자가 공연 수익 몇 년 치다.`,
    choices: [
      { label: '스몰웨딩으로 간다', run: (c) => { c.set('weddingDone'); c.money(-c.krw(5_000_000), '스몰웨딩'); c.rel('pt', 8, '작고 단단한 결혼식'); c.stat('happiness', 6); return '마당 있는 식당을 빌렸다. 하객은 적었지만 다들 끝까지 남아 있었다.'; } },
      {
        label: '부모님께 도움을 청한다', if: parentAlive,
        odds: (c) => c.dc(12, '설득 판정', [['집안 형편', c.p.income === 'high' ? 4 : c.p.income === 'low' ? -4 : 0], ['내 평판', c.m(c.p.rep)]], '가정'),
        run: (c) => {
          c.set('weddingDone');
          if (c.check(c.choicesOdds!)) { c.money(c.krw(15_000_000), '부모님 도움'); c.money(-c.krw(20_000_000), '결혼식'); c.stat('happiness', 8); return '“우리 때도 다 받았어.” 봉투를 건네는 손이 조금 떨렸다.'; }
          c.money(-c.krw(12_000_000), '결혼식'); c.stat('stress', 8); return '“음악 한다고 할 때 이미 각오했어야지.” 결국 우리 돈으로 했다.';
        },
      },
      {
        label: '신용대출로 평균만큼 제대로 한다', hint: () => '연 5.5%',
        odds: (c) => c.dc(9, '대출 심사', [['신용', c.m(c.p.credit)], ['직업', c.p.job === 'office' || c.p.job === 'teacher' ? 3 : c.p.job === 'none' ? -3 : 0]], '통계', '2024 결혼 비용 리포트: 신혼집 제외 평균 약 6,300만 원. 신용대출은 연 5~6%대'),
        run: (c) => {
          c.set('weddingDone');
          if (c.check(c.choicesOdds!)) { loan(c, 30_000_000, 0.055, '신용대출'); c.money(-c.krw(32_000_000), '결혼식'); c.rel('pt', 10, '근사했던 결혼식'); c.stat('happiness', 10); c.stat('stress', 6); return '버진로드는 반짝였다. 다음 달부터 이자 문자가 왔다.'; }
          loan(c, 8_000_000, 0.059, '신용대출'); c.money(-c.krw(12_000_000), '결혼식'); c.stat('stress', 8); return '한도가 생각의 4분의 1이었다. 예식장 등급을 두 단계 낮췄다.';
        },
      },
      { label: '축가는 내 밴드가 한다', if: (c) => !!c.band, run: (c) => { c.set('weddingDone'); c.money(-c.krw(9_000_000), '결혼식'); for (const m of c.members) m.sat = clamp((m.sat ?? 60) + 5); c.skill('stage', 2); c.fans(c.rng.int(5, 30)); c.theme('family'); return '신랑 신부가 직접 무대에 섰다. 하객들이 휴대폰을 들었고, 그 영상이 조금 돌았다.'; } },
    ],
  },
  {
    id: 'fm_newlywed_home', scene: 'home', title: '신혼집', chance: 0.25, once: true,
    when: (c) => !!c.flag('married') && between(c, 25, 50) && !c.flag('fmHome'),
    bind: bindPartner,
    text: (c) => `부동산 창문에 붙은 매물표를 ${c.nj('pt', '과/와')} 한참 봤다.\n“합주실이랑 가까우면 좋겠어.” “그럼 역이랑 멀어.”\n전세냐 월세냐, 그것이 문제다.`,
    choices: [
      { label: '전세자금대출로 전세를 얻는다', hint: () => '연 4.0%', run: (c) => { c.set('fmHome'); loan(c, 150_000_000, 0.04, '전세자금대출'); c.money(-c.krw(150_000_000), '전세 보증금'); c.stat('happiness', 6); c.rel('pt', 6, '처음 우리 집 열쇠'); return '방 하나를 작업실로 만들었다. 벽에 흡음재를 붙이던 날, 둘 다 웃고 있었다.'; } },
      { label: '월세로 버틴다', run: (c) => { c.set('fmHome'); c.money(-c.krw(10_000_000), '월세 보증금'); c.stat('stress', 4); return '보증금 천만 원에 월세. 매달 25일이 조금 무섭다.'; } },
      { label: '당분간 부모님 집에 들어간다', if: parentAlive, run: (c) => { c.set('fmHome'); c.rel('pt', -5); c.stat('stress', 6); c.money(c.krw(2_000_000), '아낀 생활비'); return '돈은 모였다. 대신 밤 열 시 이후엔 기타를 칠 수 없었다.'; } },
    ],
  },
  {
    id: 'fm_child_born', scene: 'hospital', title: '이름을 짓는 날', priority: 130, once: true,
    when: (c) => !!c.flag('child') && !c.s.flags.childId,
    text: (c) => `출생신고서의 이름 칸이 비어 있다.\n노래 제목은 수십 개 지어 봤는데, 이건 차원이 다르다.\n${c.p.partnerId ? '옆에서 배우자가' : '간호사가'} 펜을 내밀었다.`,
    choices: [
      {
        label: '오래 고민한 이름을 적는다',
        run: (c) => {
          const n = createNpc(c.s, c.rng, { birthYear: c.year, metAt: '내 아이', role: 'child', affinity: 70, skill: 0 });
          n.name = withFamilyName(c.p.name, n.name);
          c.s.flags.childId = n.id;
          c.bind.k = n.id;
          c.stat('happiness', 6);
          c.chron(`아이 이름을 ${josa(n.name, '으로/로')} 지었다`, 'people', 'k');
          return `${n.name}. 소리 내어 불러 보니, 첫 음이 좋았다.`;
        },
      },
    ],
  },
  {
    id: 'fm_first_steps', scene: 'home', title: '첫 걸음마', chance: 0.3, once: true,
    when: (c) => kidBetween(c, 1, 2),
    bind: bindKid,
    text: (c) => `${c.nj('k', '이/가')} 소파를 붙잡고 일어섰다.\n한 발, 두 발. 그리고 내 쪽으로 손을 뻗는다.\n마침 손에는 기타 피크가 들려 있다.`,
    choices: [
      { label: '두 팔을 벌리고 기다린다', run: (c) => { c.rel('k', 10, '첫 걸음마'); c.stat('happiness', 10); c.theme('family'); return '세 걸음 만에 내 품으로 넘어졌다. 그 무게가 오래 남았다.'; } },
      { label: '휴대폰으로 찍는다', run: (c) => { c.rel('k', 5); c.stat('happiness', 7); return '영상은 흔들리고 초점도 나갔다. 그래도 수백 번 돌려 봤다.'; } },
      { label: '피크로 기타 줄을 튕겨 응원한다', run: (c) => { c.rel('k', 6, '기타 소리를 따라 걷던 날'); c.skill('compose', 1); c.stat('happiness', 8); return '소리 나는 쪽으로 아이가 걸어왔다. 첫 관객이었다.'; } },
    ],
  },
  {
    id: 'fm_night_shift', scene: 'home', title: '새벽 세 시의 울음', chance: 0.25, cooldown: 3,
    when: (c) => kidBetween(c, 0, 3) && !!c.band,
    bind: bindPartner,
    text: (c) => `밤새 아이가 울었다. ${c.nj('pt', '은/는')} 소파에서 쓰러져 잠들었다.\n오늘 저녁엔 공연 전 마지막 합주가 잡혀 있다.\n눈이 모래처럼 서걱거린다.`,
    choices: [
      { label: '합주를 미루고 아이를 본다', run: (c) => { c.rel('pt', 8, '밤새 아이를 대신 본 날'); c.band!.chemistry = clamp(c.band!.chemistry - 3); c.stat('energy', -8); return '단톡방에 “미안, 오늘 못 가.” 답장은 늦게 왔다.'; } },
      { label: '아이를 안고 합주실에 간다', odds: (c) => c.dc(12, '운 판정', [['밴드 사이', c.band!.chemistry >= 60 ? 2 : 0]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { for (const m of c.members) m.sat = clamp((m.sat ?? 60) + 4); c.stat('happiness', 6); return '드럼 소리에 아이가 오히려 잠들었다. 멤버들이 번갈아 안아 줬다.'; } c.stat('stress', 8); c.band!.chemistry = clamp(c.band!.chemistry - 2); return '첫 곡 인트로에서 아이가 울음을 터뜨렸다. 합주는 거기서 끝났다.'; } },
      { label: '배우자를 깨워 교대한다', run: (c) => { c.rel('pt', -6); c.conflict('pt', 8); c.stat('energy', -4); return '“나도 어제 못 잤어.” 합주실 가는 길이 길었다.'; } },
    ],
  },
  {
    id: 'fm_birthday_tour', scene: 'airport', title: '투어와 생일', chance: 0.22, cooldown: 4,
    when: (c) => kidBetween(c, 3, 13) && !!c.band && c.p.fans >= 300 && free(c),
    bind: bindKid,
    text: (c) => `지방 투어 일정표를 보다가 손이 멈췄다.\n${c.n('k')}의 생일이 공연 날과 겹친다.\n“${parentWord(c)}, 그날 케이크 같이 불어?”`,
    choices: [
      { label: '공연 하나를 빼고 집에 간다', run: (c) => { c.rel('k', 10, '생일에 와 준 날'); c.money(-c.krw(800_000), '공연 취소 위약금'); c.rep(-1); c.stat('happiness', 8); return '케이크 촛불을 같이 불었다. 아이는 그날 일을 오래 자랑했다.'; } },
      { label: '영상통화로 생일 노래를 부른다', run: (c) => { c.rel('k', -4); c.money(c.krw(600_000), '공연 수익'); c.stat('stress', 4); return '대기실 구석에서 부른 생일 노래. 화면 속 아이는 웃다가 울었다.'; } },
      { label: '아이를 투어에 데려간다', run: (c) => { c.rel('k', 8, '투어를 따라간 생일'); c.money(-c.krw(400_000), '투어 숙박'); c.fans(c.rng.int(10, 40)); c.stat('energy', -6); return '무대 옆에서 귀마개를 낀 아이가 춤을 췄다. 관객들이 생일 축하 노래를 불러 줬다.'; } },
    ],
  },
  {
    id: 'fm_kid_first_inst', scene: 'home', title: '내 기타를 만지작', chance: 0.25, once: true,
    when: (c) => kidBetween(c, 5, 11),
    bind: bindKid,
    text: (c) => `거실에 세워 둔 기타 앞에 ${c.nj('k', '이/가')} 쪼그려 앉아 있다.\n작은 손가락으로 줄을 하나씩 눌러 본다.\n“이거 어떻게 하면 노래 돼?”`,
    choices: [
      { label: '무릎에 앉혀 코드 하나를 알려 준다', run: (c) => { const k = c.npc('k'); k.inst = 'guitar'; k.skill = Math.min(100, k.skill + 6); c.rel('k', 10, '처음 배운 코드'); c.stat('happiness', 8); return 'G 코드 하나로 둘이 한 시간을 놀았다.'; } },
      { label: '작은 우쿨렐레를 사 준다', run: (c) => { const k = c.npc('k'); k.skill = Math.min(100, k.skill + 4); c.money(-c.krw(80_000), '우쿨렐레'); c.rel('k', 8); return '아이 몸에 꼭 맞는 크기. 그날부터 집에 노래가 하나 더 늘었다.'; } },
      { label: '“음악은 힘들어. 다른 거 해.”', run: (c) => { c.rel('k', -4); c.stat('happiness', -3); return '아이는 고개를 끄덕였지만, 다음 날도 기타 앞에 앉아 있었다.'; } },
    ],
  },
  {
    id: 'fm_tuition', scene: 'home', title: '학원비 고지서', chance: 0.2, cooldown: 4,
    when: (c) => kidBetween(c, 8, 19),
    bind: bindKid,
    text: (c) => `${c.n('k')}의 학원비 고지서가 냉장고에 붙어 있다.\n영어, 수학, 그리고 아이가 꼭 하고 싶다던 것 하나.\n이번 달 공연 수익보다 숫자가 크다.`,
    choices: [
      { label: '다 보낸다', run: (c) => { c.money(-c.krw(1_200_000), '학원비'); c.stat('stress', 6); c.rel('k', 3); return '아이 시간표가 내 투어 일정보다 빽빽해졌다.'; } },
      { label: '하고 싶다는 것 하나만 보낸다', run: (c) => { c.money(-c.krw(400_000), '학원비'); c.rel('k', 8, '하고 싶은 걸 하게 해 준 날'); c.stat('happiness', 4); return '“진짜? 그것만?” 아이 얼굴이 환해졌다.'; } },
      { label: '레슨 알바를 늘려 메운다', run: (c) => { c.money(c.krw(600_000), '레슨비'); c.money(-c.krw(1_000_000), '학원비'); c.stat('energy', -8); c.skill('stage', 1); return '주말이 사라졌다. 대신 아이는 아무것도 포기하지 않았다.'; } },
    ],
  },
  {
    id: 'fm_old_video', scene: 'home', title: '옛날 공연 영상', chance: 0.25, once: true,
    when: (c) => kidBetween(c, 9, 16) && c.s.chronicle.some((e) => e.kind === 'music' || e.kind === 'band'),
    bind: bindKid,
    text: (c) => `${c.nj('k', '이/가')} 노트북을 들고 뛰어왔다.\n“이거 ${parentWord(c)} 맞지? 머리 왜 이래?”\n화질 낮은 영상 속, 스무 몇 살의 내가 땀범벅으로 소리를 지르고 있다.`,
    choices: [
      { label: '같이 끝까지 본다', run: (c) => { c.rel('k', 10, '옛날 공연 영상을 같이 본 밤'); c.stat('happiness', 8); c.theme('youth'); return '“근데 좀 멋있다.” 그 한마디로 몇 년이 보상받았다.'; } },
      { label: '창피해서 노트북을 덮는다', run: (c) => { c.rel('k', -2); c.stat('happiness', 2); return '덮었지만, 그날 밤 혼자 몰래 다시 틀어 봤다.'; } },
      { label: '그때 이야기를 들려준다', run: (c) => { c.rel('k', 7); c.skill('compose', 2); c.theme('youth'); return '이야기하다 보니 잊었던 가사 한 줄이 돌아왔다.'; } },
    ],
  },
  {
    id: 'fm_teen_cringe', scene: 'home', title: '“음악 촌스러워”', chance: 0.25, once: true,
    when: (c) => kidBetween(c, 13, 18),
    bind: bindKid,
    text: (c) => `친구들이 놀러 온 날, 내 노래가 스피커에서 흘러나왔다.\n${c.nj('k', '이/가')} 황급히 꺼 버렸다.\n“${parentWord(c)} 음악 촌스러워. 제발 친구들 앞에서 틀지 마.”`,
    choices: [
      { label: '웃어넘긴다', run: (c) => { c.rel('k', 3); c.stat('happiness', -2); return '방문 너머로 아이 친구 목소리가 들렸다. “근데 이 노래 좋은데?”'; } },
      { label: '요즘 아이가 듣는 음악을 물어본다', run: (c) => { c.rel('k', 8, '서로 플레이리스트를 바꿔 들은 날'); c.genre('indiepop', 4); c.skill('compose', 2); return '처음 듣는 소리들. 몇 곡은 솔직히 좋았다. 인정하진 않았다.'; } },
      { label: '서운한 티를 낸다', run: (c) => { c.rel('k', -6); c.conflict('k', 6); c.stat('stress', 4); return '식탁 위에 침묵이 이틀 동안 앉아 있었다.'; } },
    ],
  },
  {
    id: 'fm_kid_band', scene: 'musicroom', title: '아이가 밴드를 시작했다', chance: 0.25, once: true,
    when: (c) => kidBetween(c, 14, 22) && (kid(c)?.skill ?? 0) >= 4,
    bind: bindKid,
    text: (c) => `${c.nj('k', '이/가')} 쭈뼛거리며 말했다.\n“나 친구들이랑 밴드 하기로 했어. 근데… 합주실이 너무 비싸.”\n그 말투가 이상하게 낯익다.`,
    choices: [
      { label: '내 합주실을 빌려준다', run: (c) => { const k = c.npc('k'); k.skill = Math.min(100, k.skill + 8); k.career = 'musician'; c.rel('k', 10, '합주실을 빌려준 날'); c.stat('happiness', 10); c.chron(`${c.nj('k', '이/가')} 밴드를 시작했다`, 'people', 'k'); return '문밖에서 들리는 서툰 8비트. 귀를 막으려다 그냥 끝까지 들었다.'; } },
      { label: '연습 방법부터 잔소리한다', run: (c) => { const k = c.npc('k'); k.skill = Math.min(100, k.skill + 12); c.rel('k', -3); return '“알았다고!” 그래도 다음 날부터 메트로놈 소리가 들렸다.'; } },
      { label: '“공부나 해.”', run: (c) => { c.rel('k', -10); c.conflict('k', 10); c.stat('happiness', -4); return `말하고 나서야 알았다. 어릴 적 들었던 바로 그 말이었다.`; } },
    ],
  },
  {
    id: 'fm_kid_leaves', scene: 'home', title: '빈 방', chance: 0.25, once: true,
    when: (c) => kidBetween(c, 22, 35),
    bind: bindKid,
    text: (c) => `${c.nj('k', '이/가')} 짐을 다 뺐다.\n벽에 붙어 있던 포스터 자국만 네모나게 남았다.\n“${parentWord(c)}, 결혼식 때 노래 하나 해 줄 수 있어?”`,
    choices: [
      { label: '아이를 위한 곡을 쓴다', run: (c) => { c.skill('compose', 4); c.rel('k', 12, '결혼식 축가'); c.stat('happiness', 12); c.theme('family'); c.chron(`${c.n('k')}의 결혼식에서 직접 쓴 축가를 불렀다`, 'big', 'k'); return '첫 소절에서 목이 메었다. 하객들이 대신 이어 불러 줬다.'; } },
      { label: '살림에 보태라고 봉투를 건넨다', run: (c) => { c.money(-c.krw(10_000_000), '자녀 결혼 지원'); c.rel('k', 8); c.stat('happiness', 6); return '“이거 언제 모았어?” 대답 대신 어깨를 두드렸다.'; } },
      { label: '빈 방을 작업실로 꾸민다', run: (c) => { c.stat('happiness', -3); c.skill('compose', 3); c.theme('loss'); return '조용한 방에서 녹음 버튼을 눌렀다. 이상하게 소리가 울렸다.'; } },
    ],
  },
  {
    id: 'fm_leave_or_work', scene: 'office', title: '육아휴직이냐 맞벌이냐', chance: 0.25, once: true,
    when: (c) => kidBetween(c, 0, 2),
    bind: bindPartner,
    text: (c) => `${c.nj('pt', '이/가')} 휴직 신청서를 내밀었다.\n“둘 중 하나는 아이를 봐야 해. 근데 그게 당신 음악이면 우리 수입이 없어.”\n어린이집 대기 번호는 아직 두 자릿수다.`,
    choices: [
      { label: '내가 음악을 잠시 쉬고 아이를 본다', run: (c) => { c.rel('pt', 10, '아이를 맡아 준 해'); c.stat('happiness', 4); c.skill(c.p.mainInst ?? 'guitar', -2); c.theme('family'); return '유모차를 밀면서 멜로디를 흥얼거렸다. 그해 노트엔 자장가만 쌓였다.'; } },
      { label: '배우자가 휴직하고 나는 일을 늘린다', run: (c) => { c.rel('pt', -3); c.money(c.krw(2_000_000), '세션'); c.stat('energy', -8); c.stat('stress', 5); return '돈은 됐다. 아이의 첫 단어는 영상통화로 들었다.'; } },
      { label: '부모님께 SOS', if: parentAlive, run: (c) => { c.money(-c.krw(1_000_000), '부모님 용돈'); c.stat('stress', -3); c.rel('pt', 4); return '할머니 품에서 아이는 잘 웃었다. 대신 명절마다 빚진 기분이 들었다.'; } },
    ],
  },
  {
    id: 'fm_music_vs_living', scene: 'home', title: '음악이냐 생계냐', chance: 0.18, cooldown: 6,
    when: (c) => !!c.flag('married') && between(c, 28, 55) && (c.p.money < c.krw(3_000_000) || c.p.debt > c.krw(30_000_000)),
    bind: bindPartner,
    text: (c) => `통장 잔고를 본 ${c.nj('pt', '이/가')} 조용히 말했다.\n“나 당신 음악 좋아해. 근데 이번 달 관리비는 노래로 못 내.”\n싸우자는 목소리가 아니라서 더 아팠다.`,
    choices: [
      {
        label: '1년만 더 해 보자고 설득한다',
        odds: (c) => c.dc(14, '설득 판정', [['우리 사이', c.npc('pt').affinity >= 60 ? 3 : 0], ['내 팬', c.p.fans >= 3000 ? 3 : c.p.fans >= 500 ? 1 : -1], ['평판', c.m(c.p.rep)]], '가정'),
        run: (c) => { if (c.check(c.choicesOdds!)) { c.rel('pt', 4, '1년만 더'); c.stat('happiness', 5); return '“딱 1년이야.” 그 말에 기한이 아니라 응원이 들어 있었다.'; } c.rel('pt', -8); c.conflict('pt', 10); c.stat('stress', 8); return '“작년에도 그랬잖아.” 대답할 말이 없었다.'; },
      },
      { label: '낮에는 일을 구한다', run: (c) => { c.money(c.krw(2_500_000), '월급'); c.rel('pt', 8); c.stat('energy', -6); c.skill(c.p.mainInst ?? 'guitar', -1); return '사원증 목걸이가 어색했다. 퇴근길 지하철에서 가사를 썼다.'; } },
      { label: '장비 하나를 판다', run: (c) => { c.money(c.krw(1_500_000), '중고 판매'); c.stat('happiness', -5); c.rel('pt', 4); return '택배 상자에 앰프를 넣으며 짧게 인사했다.'; } },
    ],
  },

  // ───────── B. 대출·빚 ─────────
  {
    id: 'fm_student_loan', scene: 'classroom', title: '학자금 대출', chance: 0.25, once: true,
    when: (c) => between(c, 19, 24) && (c.p.edu === 'univ' || c.p.edu === 'music_univ') && c.p.income !== 'high',
    text: () => `등록금 고지서가 나왔다.\n아르바이트 통장으로는 반도 안 된다.\n정부 학자금 대출 안내 페이지를 띄워 놓고 한참 스크롤했다.`,
    choices: [
      { label: '학자금 대출을 받는다', hint: () => '연 1.7%', odds: (c) => c.dc(5, '대출 심사', [['학업', c.p.study < 30 ? -3 : 0]], '통계', '한국장학재단 학자금 대출 금리 연 1.7% 수준. 성적 기준 미달이면 거절될 수 있다'), run: (c) => { if (c.check(c.choicesOdds!)) { loan(c, 4_500_000, 0.017, '학자금 대출'); c.money(-c.krw(4_500_000), '등록금'); c.stat('stress', 3); return '졸업장보다 먼저 상환 일정표가 생겼다.'; } c.study(-3); c.stat('stress', 8); return '성적 기준 미달. 결국 한 학기를 쉬었다.'; } },
      { label: '휴학하고 1년 일한다', run: (c) => { c.money(c.krw(8_000_000), '알바'); c.study(-4); c.stat('energy', -6); return '편의점 야간 카운터에서 코드 진행을 외웠다.'; } },
      { label: '부모님께 손을 벌린다', if: parentAlive, run: (c) => { c.money(c.krw(1_000_000), '부모님 용돈'); c.stat('stress', 5); return '“괜찮아.” 그 말 뒤에 부모님이 무엇을 줄였는지는 나중에야 알았다.'; } },
    ],
  },
  {
    id: 'fm_gear_loan', scene: 'studio', title: '녹음비가 모자라다', chance: 0.18, cooldown: 6,
    when: (c) => !!c.band && free(c) && between(c, 20, 50) && c.p.money < c.krw(3_000_000),
    text: (c) => `스튜디오 견적서: 믹싱·마스터링 포함 ${won(c.krw(5_000_000))}.\n통장에는 그 절반도 없다.\n은행 앱에 ‘비상금 대출 한도 조회’ 버튼이 깜빡인다.`,
    choices: [
      { label: '신용대출로 제대로 녹음한다', hint: () => '연 5.5%', run: (c) => { loan(c, 5_000_000, 0.055, '신용대출'); c.money(-c.krw(5_000_000), '녹음'); c.skill('compose', 3); c.stat('happiness', 6); return '헤드폰 속 소리가 처음으로 “음반” 같았다. 대출 문자는 못 본 척했다.'; } },
      { label: '홈레코딩으로 버틴다', run: (c) => { c.money(-c.krw(500_000), '장비'); c.skill('compose', 2); c.stat('stress', 3); return '이불을 벽에 걸고 녹음했다. 거친 소리가 오히려 우리 같았다.'; } },
      {
        label: '크라우드펀딩을 연다',
        odds: (c) => c.dc(13, '운 판정', [['팬 규모', c.p.fans >= 3000 ? 4 : c.p.fans >= 500 ? 2 : -2], ['평판', c.m(c.p.rep)]], '가정'),
        run: (c) => { if (c.check(c.choicesOdds!)) { c.money(c.krw(4_000_000), '펀딩'); c.fans(c.rng.int(20, 80)); return '마감 사흘 전에 목표 달성. 후원자 명단을 크레딧에 다 넣었다.'; } c.stat('stress', 6); return '달성률 34%. 숫자보다 남겨진 응원 댓글이 더 오래 남았다.'; },
      },
    ],
  },
  {
    id: 'fm_shark', scene: 'street', title: '“당일 대출 가능”', chance: 0.25, cooldown: 4,
    when: (c) => between(c, 20, 70) && (c.p.money < -c.krw(15_000_000) || c.p.credit < 35),
    text: () => `전봇대에 붙은 명함, 휴대폰에 쏟아지는 문자.\n“신용 무관, 당일 입금.”\n은행은 이미 세 군데서 거절당했다.`,
    choices: [
      { label: '빌린다', hint: () => '연 20%', odds: (c) => c.dc(5, '대출 심사', [['신용', c.p.credit < 15 ? -3 : 0]], '통계', '법정 최고금리 연 20% (대부업). 등록 업체도 심사는 한다'), run: (c) => { if (c.check(c.choicesOdds!)) { loan(c, 5_000_000, 0.2, '대부업 대출'); c.stat('stress', 12); return '돈은 한 시간 만에 들어왔다. 이자 계산은 하지 않기로 했다.'; } c.stat('stress', 8); return '“고객님은 어렵겠습니다.” 거기서도 거절이었다.'; } },
      { label: '부모님께 털어놓는다', if: parentAlive, run: (c) => { c.money(c.krw(3_000_000), '부모님 도움'); c.stat('stress', -4); c.stat('happiness', -4); return '전화기 너머 긴 침묵. 그리고 “계좌 불러.”'; } },
      { label: '거절하고 허리띠를 졸라맨다', run: (c) => { c.stat('stress', 6); c.stat('health', -2); return '라면으로 한 달을 났다. 그래도 그 번호로는 전화하지 않았다.'; } },
    ],
  },
  {
    id: 'fm_delinquent', scene: 'home', title: '연체 독촉', chance: 0.25, cooldown: 4,
    when: (c) => c.p.debt > 0 && c.p.credit < 40 && between(c, 20, 75),
    text: (c) => `“고객님의 대출이 연체 중입니다.”\n하루에 문자가 세 통, 전화가 두 통.\n남은 원금 ${won(c.p.debt)}. 우편함엔 빨간 봉투가 꽂혀 있다.`,
    choices: [
      { label: '악기를 팔아 일부를 갚는다', run: (c) => { const v = Math.min(c.p.debt, c.krw(2_000_000)); c.p.debt -= v; c.p.credit = clamp(c.p.credit + 5); c.line(`대출 상환 ${won(v)}`, 'good'); c.stat('happiness', -6); return '아끼던 악기가 남의 차 트렁크로 들어갔다. 독촉 전화는 일단 멈췄다.'; } },
      {
        label: '채무조정을 신청한다',
        odds: (c) => c.dc(11, '서류 판정', [['소득 증빙', c.p.job !== 'none' ? 3 : -1], ['연체 기간', c.p.credit < 20 ? -2 : 0]], '가정', '채무조정은 상환 의지와 소득이 있어야 승인이 쉽다'),
        run: (c) => { if (c.check(c.choicesOdds!)) { c.p.debtRate = Math.max(0.03, c.p.debtRate * 0.5); c.p.credit = clamp(c.p.credit - 5); c.stat('stress', -8); return `이율이 연 ${(c.p.debtRate * 100).toFixed(1)}%로 낮아졌다. 처음으로 끝이 보였다.`; } c.stat('stress', 6); return '서류가 반려됐다. 보완 서류 목록이 한 장 더 늘었다.'; },
      },
      { label: '전화를 안 받고 버틴다', run: (c) => { c.p.credit = clamp(c.p.credit - 8); c.stat('stress', 10); c.stat('health', -2); return '휴대폰을 무음으로 바꿨다. 화면은 계속 켜졌다 꺼졌다.'; } },
    ],
  },
  {
    id: 'fm_debt_free', scene: 'rooftop', title: '완납', chance: 0.6, once: true,
    when: (c) => c.p.debt === 0 && !!c.flag('hadDebt'),
    text: () => `“대출 상환이 완료되었습니다.”\n짧은 문자 한 통. 몇 번을 다시 읽었다.\n옥상에 올라가니 바람이 생각보다 시원하다.`,
    choices: [
      { label: '혼자 맥주 한 캔으로 자축한다', run: (c) => { c.p.credit = clamp(c.p.credit + 10); c.stat('happiness', 10); c.stat('stress', -10); c.chron('빚을 다 갚았다', 'life'); return '캔 따는 소리가 그렇게 좋은 줄 몰랐다.'; } },
      { label: '그 기분으로 곡을 쓴다', run: (c) => { c.p.credit = clamp(c.p.credit + 10); c.skill('compose', 3); c.stat('happiness', 8); c.theme('dream'); c.chron('빚을 다 갚은 날, 곡을 하나 썼다', 'music'); return '가사는 단 한 줄. “이제 내 거야.”'; } },
    ],
  },
  {
    id: 'fm_friend_borrow', scene: 'pub', title: '돈 좀 빌려줄 수 있어?', chance: 0.18, cooldown: 6,
    when: (c) => between(c, 20, 60) && c.p.money > c.krw(3_000_000),
    bind: (c) => c.bindFrom('f', (n) => n.role !== 'partner' && n.role !== 'child' && n.affinity >= 20),
    text: (c) => `${c.nj('f', '이/가')} 소주잔만 돌리다가 겨우 입을 뗐다.\n“…3백만 원만. 다음 달에 꼭 갚을게.”\n눈을 못 마주친다.`,
    choices: [
      {
        label: '빌려준다',
        odds: (c) => c.dc(12, '회수 판정', [['신뢰', c.m(c.npc('f').trust)], ['친밀도', c.npc('f').affinity >= 50 ? 2 : 0]], '가정', '지인 간 금전 거래는 회수가 늦거나 안 되는 일이 흔하다'),
        run: (c) => {
          c.money(-c.krw(3_000_000), '빌려준 돈');
          if (c.check(c.choicesOdds!)) { c.money(c.krw(3_000_000), '돌려받은 돈'); c.rel('f', 10, '돈을 빌려준 일'); return '석 달 뒤, 이자 대신 비싼 고기를 사 들고 왔다.'; }
          c.rel('f', -10, '돌려받지 못한 돈'); c.stat('stress', 6); return '연락이 점점 뜸해졌다. 돈보다 그게 더 아팠다.';
        },
      },
      { label: '절반만, 받을 생각 없이 준다', run: (c) => { c.money(-c.krw(1_500_000), '친구 도움'); c.rel('f', 8); c.stat('happiness', 2); return '“갚지 마.” 그렇게 말하니 오히려 마음이 편했다.'; } },
      {
        label: '차용증을 쓰고 빌려준다',
        odds: (c) => c.dc(9, '회수 판정', [['신뢰', c.m(c.npc('f').trust)]], '가정', '종이 한 장이 회수 가능성을 높인다'),
        run: (c) => {
          c.money(-c.krw(3_000_000), '빌려준 돈');
          if (c.check(c.choicesOdds!)) { c.money(c.krw(3_000_000), '돌려받은 돈'); c.rel('f', 2); return '정확히 약속한 날 돌려받았다. 조금 서먹해졌지만, 돈은 돌아왔다.'; }
          c.rel('f', -12); c.stat('stress', 8); return '차용증이 있어도 받을 방법은 마땅치 않았다.';
        },
      },
      { label: '돈 대신 일자리를 소개한다', run: (c) => { c.rel('f', 5); c.stat('stress', -1); return '내가 하던 알바 자리를 넘겨줬다. 한 달 뒤 “덕분에 숨 쉰다”는 문자가 왔다.'; } },
      { label: '정중히 거절한다', run: (c) => { c.rel('f', -5); c.stat('stress', 3); return '“그래, 이해해.” 그날 술값은 각자 냈다.'; } },
    ],
  },
  {
    id: 'fm_card_bill', scene: 'home', title: '할부의 늪', chance: 0.15, cooldown: 6,
    when: (c) => between(c, 22, 50) && c.p.money < c.krw(1_000_000) && c.p.money > -c.krw(15_000_000),
    text: () => `카드 명세서를 열었다.\n이펙터 6개월 할부, 노트북 12개월 할부, 공연 대관비 리볼빙.\n“최소 결제 금액만 내시겠습니까?” 버튼이 친절하게 웃는다.`,
    choices: [
      { label: '리볼빙으로 넘긴다', run: (c) => { loan(c, 2_000_000, 0.16, '리볼빙'); c.stat('stress', 4); return '이번 달은 넘겼다. 다음 달의 내가 알아서 하겠지.'; } },
      { label: '카드를 가위로 자른다', run: (c) => { c.money(-c.krw(1_000_000), '카드값'); c.p.credit = clamp(c.p.credit + 4); c.stat('stress', 2); return '가위질 두 번. 생각보다 후련했다.'; } },
      { label: '중고 장터에 이펙터를 올린다', run: (c) => { c.money(c.krw(700_000), '중고 판매'); c.stat('happiness', -3); return '페달보드에 빈칸이 생겼다. 소리는 조금 단순해졌다.'; } },
    ],
  },

  // ───────── C. 팬의 증감 ─────────
  {
    id: 'fm_fans_cooling', scene: 'home', title: '“요즘 뭐 해요?”', chance: 0.25, cooldown: 4,
    when: (c) => c.p.fans >= 500 && !c.p.retired && c.s.albums.length > 0 && c.year - lastRelease(c) >= 2,
    text: (c) => `마지막 발매가 ${c.year - lastRelease(c)}년 전이다.\nSNS 마지막 게시물에 댓글이 달렸다. “요즘 뭐 해요? 살아는 계시죠?”\n팔로워 숫자가 조용히 줄고 있다.`,
    choices: [
      { label: '작업 중인 데모 한 소절을 올린다', run: (c) => { cut(c, 0.05); c.fans(c.rng.int(10, 50)); c.stat('stress', 3); return '“기다릴게요.” 짧은 답글 몇 개가 버틸 힘이 됐다.'; } },
      { label: '근황을 솔직하게 쓴다', run: (c) => { cut(c, 0.08); c.rep(1); c.stat('stress', -3); return '먹고사느라 바빴다고 썼다. 공감 댓글이 의외로 많았다.'; } },
      { label: '그냥 둔다', run: (c) => { cut(c, 0.1 + c.rng.next() * 0.1); return '알림은 점점 줄었다. 잊히는 데는 소리가 없다.'; } },
    ],
  },
  {
    id: 'fm_scandal_rumor', scene: 'home', title: '근거 없는 소문', chance: 0.12, cooldown: 10,
    when: (c) => c.p.fans >= 1000 && between(c, 20, 60),
    text: () => `커뮤니티에 글이 올라왔다. “그 밴드 사실 공연 뒤에…”\n출처도 없는 이야기인데 캡처가 돌고 있다.\nDM 알림이 멈추지 않는다.`,
    choices: [
      {
        label: '사실관계를 정리해 해명한다',
        odds: (c) => c.dc(13, '설득 판정', [['평판', c.m(c.p.rep)], ['무대 경험', Math.floor(c.m(c.p.skills.stage) / 2)]], '가정'),
        run: (c) => { if (c.check(c.choicesOdds!)) { c.rep(2); c.fans(c.rng.int(20, 100)); return '날짜와 영상으로 하나씩 반박했다. 최초 글이 조용히 지워졌다.'; } cut(c, 0.15 + c.rng.next() * 0.15); c.rep(-4); c.stat('stress', 10); return '해명은 “변명”이라는 댓글에 묻혔다.'; },
      },
      { label: '법적 대응을 예고한다', run: (c) => { c.money(-c.krw(1_500_000), '법률 상담'); cut(c, 0.05); c.stat('stress', 6); return '소문은 잠잠해졌다. 대신 차가운 사람이라는 말이 붙었다.'; } },
      { label: '무시하고 공연만 한다', run: (c) => { cut(c, 0.1); c.skill('stage', 2); c.stat('stress', 4); return '객석 몇 자리가 비었다. 남은 사람들은 더 크게 따라 불렀다.'; } },
    ],
  },
  {
    id: 'fm_trend_shift', scene: 'club', title: '유행이 지나간다', chance: 0.15, cooldown: 8,
    when: (c) => !!c.band && c.p.fans >= 300 && between(c, 22, 60),
    text: (c) => `요즘 공연장 라인업이 달라졌다.\n작년까지 붐비던 ${c.band ? '우리 장르' : '이 장르'}의 밤이 반쯤 비었다.\n“요즘 애들은 이런 거 안 들어.” 공연장 사장이 어깨를 으쓱했다.`,
    choices: [
      { label: '우리 색을 지킨다', run: (c) => { cut(c, 0.1); c.rep(2); c.skill(c.p.mainInst ?? 'guitar', 1); return '사람은 줄었지만, 남은 팬들은 진짜였다.'; } },
      { label: '새 사운드를 조금 섞어 본다', odds: (c) => c.dc(13, '작곡 판정', [['작곡', c.m(c.p.skills.compose)]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.fans(Math.round(c.p.fans * 0.08)); c.skill('compose', 2); return '어색할 줄 알았는데, 새 곡에서 오히려 우리 소리가 또렷해졌다.'; } cut(c, 0.12); return '옛 팬은 “변했다”고, 새 팬은 “어정쩡하다”고 했다.'; } },
      { label: '해외 반응을 노린다', run: (c) => { cut(c, 0.06); c.p.globalFans += c.rng.int(10, 60); c.line('해외 팬이 조금 늘었다', 'good'); return '국내에선 식었지만, 지구 반대편에서 댓글이 달리기 시작했다.'; } },
    ],
  },
  {
    id: 'fm_fan_comeback', scene: 'club', title: '컴백 공연', chance: 0.3, cooldown: 4,
    when: (c) => !!c.band && free(c) && typeof c.s.flags.hiatus === 'number' && c.year - (c.s.flags.hiatus as number) >= 1,
    text: (c) => `${c.year - (c.s.flags.hiatus as number)}년 만의 단독 공연 공지를 올렸다.\n“진짜예요?” “휴가 냈습니다.” 댓글이 빠르게 달린다.\n멤버들 손이 아직 기억할까.`,
    choices: [
      {
        label: '옛 곡 위주로 무대를 꾸민다',
        odds: (c) => c.dc(11, '무대 판정', [['무대 경험', c.m(c.p.skills.stage)], ['밴드 호흡', c.band!.chemistry >= 60 ? 2 : -1]], '가정'),
        run: (c) => { c.set('hiatus', false); if (c.check(c.choicesOdds!)) { c.fans(Math.round(c.p.fans * 0.15) + c.rng.int(30, 100)); c.money(c.krw(1_500_000), '공연 수익'); c.stat('happiness', 12); c.chron('활동 중단을 끝내고 컴백 공연을 했다', 'band'); return '첫 곡 전주에서 객석이 먼저 노래를 시작했다.'; } c.fans(c.rng.int(10, 40)); c.stat('stress', 5); return '실수가 몇 번 났다. 그래도 끝나고 다들 “다시 와 줘서 고맙다”고 했다.'; },
      },
      { label: '신곡으로 정면 승부한다', run: (c) => { c.set('hiatus', false); c.fans(Math.round(c.p.fans * 0.08)); c.skill('compose', 2); c.rep(2); return '반응은 조용했지만, 공연 뒤 신곡 제목 검색이 늘었다.'; } },
      { label: '아직 아니다. 미룬다', run: (c) => { cut(c, 0.05); c.stat('stress', -2); return '공지를 내렸다. “언젠가”라는 말이 또 늘었다.'; } },
    ],
  },
  {
    id: 'fm_fan_meet', scene: 'pub', title: '작은 팬미팅', chance: 0.18, cooldown: 4,
    when: (c) => c.p.fans >= 200 && free(c) && between(c, 18, 70),
    text: () => `대관한 작은 카페, 의자 서른 개.\n손글씨 이름표와 직접 구운 쿠키를 들고 온 사람들이 있다.\n“처음 공연 봤을 때가 고3이었어요.”`,
    choices: [
      { label: '통기타로 신청곡을 받는다', run: (c) => { c.money(-c.krw(300_000), '대관'); c.fans(c.rng.int(20, 60)); c.skill('stage', 2); c.stat('happiness', 8); return '세 시간이 30분처럼 지나갔다. 신청곡 중엔 나도 잊은 노래가 있었다.'; } },
      { label: '굿즈를 만들어 판다', run: (c) => { c.money(c.krw(600_000), '굿즈'); c.fans(c.rng.int(10, 30)); return '스티커와 엽서가 다 팔렸다. 사인하다 손목이 아팠다.'; } },
      { label: '한 명씩 이야기를 듣는다', run: (c) => { c.fans(c.rng.int(10, 30)); c.theme('friend'); c.stat('stress', -6); return '내 노래가 누군가의 시험 기간, 이별, 입원을 버티게 했단다.'; } },
      { label: '아직 안 낸 신곡을 처음 들려준다', run: (c) => { c.fans(c.rng.int(15, 45)); c.skill('compose', 2); return '첫 소절에서 누군가 울기 시작했다. 이 곡은 꼭 내야겠다고 생각했다.'; } },
      { label: '팬들 이야기로 즉석에서 가사를 쓴다', run: (c) => { c.fans(c.rng.int(20, 50)); c.theme('friend'); c.skill('stage', 1); return '서른 명의 한 줄씩으로 노래 한 곡이 됐다. 제목은 그날 날짜.'; } },
      { label: '다 같이 근처 공원으로 나가 노래한다', if: (c) => !!c.p.mainInst, run: (c) => { c.fans(c.rng.int(20, 70)); c.stat('happiness', 10); return '지나가던 사람들까지 서서 들었다. 작은 팬미팅이 동네 공연이 됐다.'; } },
    ],
  },
  {
    id: 'fm_algorithm', scene: 'home', title: '알고리즘의 변덕', chance: 0.15, cooldown: 6,
    when: (c) => c.year >= 2019 && c.p.fans >= 100 && between(c, 16, 60),
    text: () => `숏폼 플랫폼에 올린 15초짜리 클립.\n어제까지는 조회수 두 자릿수였는데, 오늘 아침엔 숫자가 이상하다.\n좋은 쪽일지 나쁜 쪽일지는 아직 모른다.`,
    choices: [
      {
        label: '하루에 세 개씩 더 올린다',
        odds: (c) => c.dc(14, '운 판정', [['무대 존재감', c.m(c.p.talents.presence)], ['곡 완성도', Math.floor(c.m(c.p.skills.compose) / 2)]], '가정', '숏폼 노출은 예측하기 어렵다'),
        run: (c) => { c.stat('energy', -5); if (c.check(c.choicesOdds!)) { c.fans(Math.round(c.p.fans * 0.2) + c.rng.int(100, 400)); c.stat('happiness', 8); return '후렴 구간이 챌린지가 됐다. 모르는 사람들이 내 노래로 춤을 춘다.'; } cut(c, 0.05); c.stat('stress', 5); return '알고리즘은 하루 만에 등을 돌렸다. 조회수는 다시 두 자릿수.'; },
      },
      { label: '원래 하던 대로 한다', run: (c) => { c.fans(c.rng.int(5, 40)); return '반짝 올랐다가 제자리로. 그래도 몇 명은 남았다.'; } },
    ],
  },
  {
    id: 'fm_old_fan', scene: 'home', title: '오래된 팬의 편지', chance: 0.15, once: true,
    when: (c) => c.p.fans >= 300 && between(c, 30, 75) && c.s.albums.length > 0,
    text: () => `소속사 주소로 손편지가 왔다.\n“첫 EP 때부터 들었어요. 저 다음 달에 결혼해요.\n혹시… 정말 혹시 와 주실 수 있을까요?”`,
    choices: [
      { label: '몰래 찾아가 축가를 부른다', run: (c) => { c.stat('happiness', 12); c.fans(c.rng.int(30, 120)); c.rep(1); c.theme('friend'); c.chron('오래된 팬의 결혼식에서 축가를 불렀다', 'music'); return '신부가 입을 막고 울었다. 그 영상이 조용히 퍼졌다.'; } },
      { label: '사인 앨범과 답장을 보낸다', run: (c) => { c.stat('happiness', 6); c.fans(c.rng.int(5, 20)); return '한 달 뒤 사진이 왔다. 앨범이 신혼집 거실에 걸려 있었다.'; } },
      { label: '편지를 상자에 소중히 넣어 둔다', run: (c) => { c.stat('happiness', 4); c.skill('compose', 1); return '힘든 날마다 그 편지를 꺼내 읽었다.'; } },
    ],
  },
];
