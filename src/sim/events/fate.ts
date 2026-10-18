// 인생 변수에서 이어지는 사건들. 태어날 때 굴린 운명(data/fate.ts)에 따라 인생마다 전혀 다른 장면이 열린다.
// 무거운 주제(이혼·실직·병)는 담담하게, 자극 없이 쓴다.

import type { EventDef, Ctx } from '../ctx';
import { GENRES } from '../types';
import { GENRE_INFO, INST_LABEL } from '../data/world';
import { given, josa, withFamilyName } from '../korean';
import { createNpc } from '../npc';
import { clamp } from '../rng';

const between = (c: Ctx, a: number, b: number) => c.age >= a && c.age < b;
const npcOf = (c: Ctx, flag: string) => {
  const id = c.s.flags[flag] as string;
  return id && c.s.npcs[id]?.alive ? c.s.npcs[id] : null;
};
const parentWord = (c: Ctx) => (c.s.flags.originParentWord as string) || (c.p.fate?.origin?.parent === 'dad' ? '아빠' : '엄마');

export const FATE: EventDef[] = [
  // ───────── 형제 ─────────
  {
    id: 'fate_sib_born', scene: 'nursery', title: '동생이 생겼다', priority: 150, cooldown: 4, chance: 0.6,
    when: (c) => ((c.s.flags.youngerLeft as number) || 0) > 0 && between(c, 1.5, 12),
    text: (c) => `${c.ageInt}살. 엄마 배가 점점 불러 오더니, 어느 날 집에 작은 울음소리가 생겼다.\n이제 나는 ‘언니·형·누나·오빠’다.`,
    choices: [
      {
        label: '동생 침대 옆에서 자장가를 불러 준다',
        run: (c) => {
          const n = createNpc(c.s, c.rng, { birthYear: c.year, metAt: '가족', role: 'sibling', affinity: 50, skill: 0 });
          n.name = withFamilyName(c.p.name, n.name);
          c.s.flags.youngerSib = n.id;
          c.s.flags.youngerLeft = ((c.s.flags.youngerLeft as number) || 1) - 1;
          c.skill('vocal', 2);
          c.theme('family');
          c.chron(`동생 ${josa(given(n.name), '이/가')} 태어났다`, 'people');
          return '동생은 내 노래를 들으면 울음을 그쳤다. 첫 관객이었다.';
        },
      },
      {
        label: '관심을 다 뺏겨서 서운하다',
        run: (c) => {
          const n = createNpc(c.s, c.rng, { birthYear: c.year, metAt: '가족', role: 'sibling', affinity: 30, skill: 0 });
          n.name = withFamilyName(c.p.name, n.name);
          c.s.flags.youngerSib = n.id;
          c.s.flags.youngerLeft = ((c.s.flags.youngerLeft as number) || 1) - 1;
          c.stat('stress', 4);
          return '방문을 닫고 장난감 피아노를 세게 두드렸다.';
        },
      },
    ],
  },
  {
    id: 'fate_older_guitar', scene: 'home', title: '형제의 방', once: true, chance: 0.35,
    when: (c) => !!npcOf(c, 'olderSib') && between(c, 8, 15),
    bind: (c) => { c.bind.sb = c.s.flags.olderSib as string; return true; },
    text: (c) => {
      const n = c.npc('sb');
      return `손위 형제 ${c.nj('sb', '이/가')} 쓰던 방에서 ${GENRE_INFO[n.genre].label} CD와 낡은 ${INST_LABEL[n.inst]} 교본을 발견했다.\n“그거 가져가도 돼. 난 이제 안 해.”`;
    },
    choices: [
      { label: '몰래 다 들어 본다', run: (c) => { const g = c.npc('sb').genre; c.genre(g, 12); c.rel('sb', 6, '물려받은 CD'); return '형제가 사춘기 내내 듣던 노래가 이제 내 노래가 됐다.'; } },
      { label: '교본으로 연습을 시작한다', run: (c) => { const i = c.npc('sb').inst; c.skill(i, 5); c.setInst(i); c.rel('sb', 8, '교본을 물려받은 날'); return '교본 여백에 형제의 낙서가 있었다. “여기 어려움 ㅠ”'; } },
    ],
  },
  {
    id: 'fate_sib_compare', scene: 'home', title: '비교', cooldown: 8, chance: 0.15,
    when: (c) => (!!npcOf(c, 'olderSib') || !!npcOf(c, 'twin')) && between(c, 10, 22),
    bind: (c) => { c.bind.sb = (npcOf(c, 'twin') ?? npcOf(c, 'olderSib'))!.id; return true; },
    text: (c) => `명절 저녁상. “${c.nj('sb', '은/는')} 이번에 장학금 받았다더라. 너는 아직도 그 기타니?”\n수저 소리만 들렸다.`,
    choices: [
      { label: '“저도 제 길이 있어요.”', odds: (c) => c.dc(12, '설득 판정', [['자신감', c.m(c.p.skills.stage)], ['형제와의 사이', c.npc('sb').affinity >= 50 ? 2 : 0]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.stat('happiness', 5); c.rel('sb', 4, '편들어 준 저녁'); return `${c.nj('sb', '이/가')} 조용히 거들었다. “얘 공연 진짜 좋아요.”`; } c.stat('stress', 8); return '말이 꼬였다. 방에 들어가 이어폰을 꽂았다.'; } },
      { label: '그냥 웃어넘긴다', run: (c) => { c.stat('stress', 4); c.theme('family'); return '그날 밤 쓴 가사 첫 줄: “밥상 위의 침묵”.'; } },
    ],
  },
  {
    id: 'fate_twin_duo', scene: 'musicroom', title: '쌍둥이 듀오', once: true, chance: 0.5,
    when: (c) => !!npcOf(c, 'twin') && between(c, 12, 20) && !!c.p.mainInst,
    bind: (c) => { c.bind.tw = c.s.flags.twin as string; return true; },
    text: (c) => `쌍둥이 ${c.nj('tw', '이/가')} 말했다. “우리 둘이 하면 화음은 진짜 자신 있잖아.”\n같은 날 태어나 같은 목소리를 가진 두 사람.`,
    choices: [
      { label: '같이 음악을 한다', run: (c) => { const n = c.npc('tw'); n.inst = c.p.mainInst === 'vocal' ? 'guitar' : 'vocal'; n.skill = clamp(n.skill + 15); c.rel('tw', 15, '쌍둥이 듀오 결성'); c.skill('vocal', 3); c.theme('family'); c.chron('쌍둥이와 함께 음악을 하기로 했다', 'band', 'tw'); return '첫 화음에서 엄마가 부엌에서 나와 박수를 쳤다.'; } },
      { label: '각자의 길을 간다', run: (c) => { c.rel('tw', -2); return '“그래, 넌 너, 난 나.” 그래도 공연엔 꼭 오기로 했다.'; } },
    ],
  },
  {
    id: 'fate_sib_tuition', scene: 'home', title: '동생의 등록금', once: true, chance: 0.4,
    when: (c) => !!npcOf(c, 'youngerSib') && between(c, 24, 38) && c.p.money > 5_000_000,
    bind: (c) => { c.bind.sb = c.s.flags.youngerSib as string; return true; },
    text: (c) => `동생 ${c.nj('sb', '이/가')} 쭈뼛거리며 말을 꺼냈다.\n“이번 학기 등록금이… 조금 모자라서.” 통장에는 녹음비로 모아 둔 돈이 있다.`,
    choices: [
      { label: '녹음비를 내준다', run: (c) => { c.money(-c.krw(3_500_000), '동생 등록금'); c.rel('sb', 20, '등록금을 보태 준 날'); c.stat('happiness', 4); c.theme('family'); return '앨범은 반년 늦어졌다. 동생은 졸업식에서 내 노래를 틀었다.'; } },
      { label: '반만 보태 준다', run: (c) => { c.money(-c.krw(1_500_000), '동생 등록금'); c.rel('sb', 8); return '“나머지는 알바로 해 볼게.” 동생이 생각보다 컸다.'; } },
      { label: '지금은 나도 힘들다', run: (c) => { c.rel('sb', -10); c.stat('stress', 4); return '전화를 끊고 한참 천장을 봤다.'; } },
    ],
  },
  // ───────── 다문화 가정 ─────────
  {
    id: 'fate_origin_visit', scene: 'airport', title: (c) => `${c.s.flags.origin}의 외갓집`, once: true, chance: 0.6, priority: 120,
    when: (c) => !!c.s.flags.origin && between(c, 7, 15),
    text: (c) => `방학에 ${parentWord(c)}의 나라 ${c.s.flags.origin}에 갔다.\n친척들이 모인 저녁, 할머니가 ${josa(String(c.s.flags.originMusic), '을/를')} 부르기 시작했다.\n가사는 몰라도 멜로디는 이상하게 익숙하다.`,
    choices: [
      { label: '할머니 옆에서 따라 부른다', run: (c) => { c.skill('vocal', 4); c.skill('compose', 3); c.set('bilingual'); c.theme('family'); c.chron(`${c.s.flags.origin} 외갓집에서 처음 들은 노래`, 'big'); return '돌아오는 비행기에서 그 멜로디를 수첩에 그렸다. 언젠가 내 곡에 넣을 거다.'; } },
      { label: '사촌들과 말이 통하지 않아 쑥스럽다', run: (c) => { c.set('bilingual'); c.stat('stress', 2); c.genre(c.pick(GENRES), 5); return '말 대신 휴대폰으로 서로 좋아하는 노래를 틀어 줬다. 그게 대화였다.'; } },
    ],
  },
  {
    id: 'fate_origin_tease', scene: 'classroom', title: '다르다는 것', once: true, chance: 0.3,
    when: (c) => !!c.s.flags.origin && between(c, 9, 15),
    text: (c) => `반 아이 하나가 ${parentWord(c)}의 말투를 흉내 냈다. 몇 명이 웃었다.\n얼굴이 뜨거워졌다.`,
    choices: [
      { label: '“우리 엄마 나라 노래 들어 볼래?”', odds: (c) => c.dc(12, '무대 판정', [['보컬', c.m(c.p.skills.vocal)], ['배짱', c.p.traits?.includes('shy') ? -2 : 1]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.skill('stage', 3); c.stat('happiness', 8); c.meet('f', { metAt: '노래를 듣고 다가온 친구', birthYear: c.p.birthYear, affinity: 35 }); return '노래가 끝나자 웃던 아이들이 조용해졌다. 한 명이 다가와 “그거 다시 불러 줘”라고 했다.'; } c.stat('stress', 6); return '목소리가 떨려서 중간에 멈췄다. 그래도 끝까지 서 있었다.'; } },
      { label: '선생님께 말한다', run: (c) => { c.stat('stress', -2); c.stat('happiness', 2); return '선생님은 다음 날 ‘세계의 노래’ 수업을 열었다. 내가 첫 순서였다.'; } },
    ],
  },
  // ───────── 가족의 변화 ─────────
  {
    id: 'fate_divorce', scene: 'home', title: '두 개의 집', priority: 140, once: true, chance: 1,
    when: (c) => c.s.flags.divorceAge !== undefined && c.age >= (c.s.flags.divorceAge as number),
    text: () => '어느 밤, 거실에서 부모님이 오래 이야기했다.\n다음 달부터 집이 두 개가 된다고 했다. 누구의 잘못도 아니라고.',
    choices: [
      { label: '엄마와 산다', run: (c) => { c.set('liveWith', 'mom'); c.stat('stress', 10); c.stat('happiness', -6); c.theme('family'); c.theme('breakup'); c.chron('부모님이 각자의 길을 갔다', 'life'); return '주말마다 아빠를 만났다. 아빠는 늘 차 안에서 같은 노래를 틀었다.'; } },
      { label: '아빠와 산다', run: (c) => { c.set('liveWith', 'dad'); c.stat('stress', 10); c.stat('happiness', -6); c.theme('family'); c.theme('breakup'); c.chron('부모님이 각자의 길을 갔다', 'life'); return '엄마는 전화할 때마다 “밥은?”부터 물었다.'; } },
      { label: '헤드폰을 끼고 아무 말도 안 한다', run: (c) => { c.stat('stress', 6); c.skill('compose', 4); c.theme('night'); return '그해 처음으로 내 노래를 썼다. 아무에게도 들려주지 않았다.'; } },
    ],
  },
  {
    id: 'fate_jobloss', scene: 'home', title: '기울어진 집', priority: 140, once: true, chance: 1,
    when: (c) => c.s.flags.jobLossAge !== undefined && c.age >= (c.s.flags.jobLossAge as number),
    text: () => '아빠 가게가 문을 닫았다. 저녁 반찬 가짓수가 줄었고, 학원 얘기는 아무도 꺼내지 않았다.',
    choices: [
      { label: '학원을 그만두고 독학한다', run: (c) => { c.p.income = 'low'; c.set('selfTaught'); c.skill('compose', 3); c.stat('stress', 6); return '무료 강좌 영상과 도서관 악보가 선생님이 됐다.'; } },
      { label: '용돈을 받지 않겠다고 한다', run: (c) => { c.p.income = 'low'; c.money(-Math.min(c.p.money, c.krw(300_000))); c.stat('happiness', -3); c.theme('family'); return '엄마가 몰래 울었다. 나도 몰래 울었다.'; } },
      { label: '아르바이트를 일찍 시작한다', if: (c) => c.age >= 15, run: (c) => { c.p.income = 'low'; c.money(c.krw(2_000_000), '알바비'); c.stat('stress', 8); c.theme('city'); return '편의점 야간 알바. 새벽 세 시의 형광등 아래서 가사가 떠올랐다.'; } },
    ],
  },
  {
    id: 'fate_grandma', scene: 'home', title: '할머니의 노래', once: true, chance: 0.5,
    when: (c) => !!c.s.flags.grandparents && between(c, 6, 14),
    text: () => '할머니가 빨래를 개며 옛날 노래를 흥얼거린다.\n가끔 장단을 맞추라며 무릎을 두드리신다.',
    choices: [
      { label: '장단을 배운다', run: (c) => { c.skill('drums', 5); c.set('gugak'); c.theme('family'); return '‘덩 기덕 쿵 더러러러.’ 이상하게 몸이 먼저 알았다.'; } },
      { label: '할머니 노래를 녹음해 둔다', run: (c) => { c.skill('compose', 3); c.set('grandmaTape'); c.theme('family'); return '휴대폰 녹음 파일 이름: “할머니 3분 12초”.'; } },
    ],
  },
  {
    id: 'fate_gugak_fusion', scene: 'festival', title: '국악 퓨전 제안', once: true, chance: 0.4,
    when: (c) => !!c.flag('gugak') && !!c.band && c.age >= 20,
    text: () => '어린 시절 할머니에게 배운 장단을 합주에 넣어 봤다.\n공연 기획자가 말했다. “이거 해외에서 엄청 좋아할 소리예요.”',
    choices: [
      { label: '국악 퓨전 곡을 만든다', odds: (c) => c.dc(13, '작곡 판정', [['작곡', c.m(c.p.skills.compose)], ['어릴 적 장단', 2]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.rep(6); c.p.globalFans += 400; c.line('해외 팬 +400', 'good'); c.theme('family'); c.chron('할머니의 장단으로 만든 국악 퓨전 곡', 'big'); return '꽹과리 소리 위로 기타 노이즈가 깔렸다. 객석에서 누군가 “얼쑤!” 했다.'; } return '어색하게 붙은 두 소리. 아직은 시간이 필요하다.'; } },
      { label: '우리 색이 아니다', run: (c) => { c.rep(1); } },
    ],
  },
  {
    id: 'fate_pet_end', scene: 'home', title: '오래된 친구', once: true, chance: 0.5,
    when: (c) => !!c.s.flags.pet && c.age >= 13 && c.age < 30,
    text: () => '어릴 때부터 함께 자란 반려동물이 많이 늙었다.\n요즘은 하루 종일 내 방 앰프 옆에서만 잔다.',
    choices: [
      { label: '마지막 날까지 곁에서 기타를 쳐 준다', run: (c) => { c.s.flags.pet = 0; c.stat('happiness', -8); c.theme('loss'); c.skill('compose', 3); c.chron('어린 시절을 함께한 반려동물과 이별했다', 'big'); return '마지막 날, 꼬리를 한 번 흔들었다. 그 곡은 끝내 가사를 붙이지 못했다.'; } },
    ],
  },
  // ───────── 타고난 것 ─────────
  {
    id: 'fate_perfect_pitch', scene: 'musicroom', title: '절대음감', priority: 160, once: true, chance: 1,
    when: (c) => !!c.s.flags.perfectPitch && between(c, 5, 10),
    text: () => '음악 시간. 선생님이 피아노 건반 하나를 눌렀다.\n“솔.” 아무도 묻지 않았는데 대답이 먼저 나왔다. 교실이 조용해졌다.',
    choices: [
      { label: '“저 냉장고 소리도 ‘시’예요.”', run: (c) => { c.skill('keys', 6); c.skill('compose', 4); c.chron('절대음감이라는 걸 알게 됐다 — 1만 명 중 1명꼴이라고 한다', 'big'); return '선생님이 부모님께 전화를 걸었다. 그날 저녁 식탁의 화제는 내 귀였다.'; } },
    ],
  },
  {
    id: 'fate_lefty', scene: 'street', title: '왼손잡이 기타', once: true, chance: 0.7,
    when: (c) => !!c.s.flags.lefty && c.p.mainInst === 'guitar' && between(c, 9, 20),
    text: () => '악기점에 갔더니 왼손잡이용 기타는 딱 한 대뿐이었다.\n“주문하면 한 달 걸려요. 아니면 줄을 거꾸로 걸어 쳐 보든가.”',
    choices: [
      { label: '줄을 거꾸로 걸어 독특한 주법을 만든다', run: (c) => { c.skill('guitar', 3); c.skill('compose', 3); c.set('upsideDown'); return '코드 모양이 남들과 달랐다. 그래서 소리도 남들과 달랐다.'; } },
      { label: '한 달을 기다린다', run: (c) => { c.money(-c.krw(150_000), '왼손 기타 주문'); c.skill('guitar', 2); return '택배 상자를 열던 날, 처음으로 기타가 ‘내 쪽’을 보고 있었다.'; } },
      { label: '오른손으로 배운다', run: (c) => { c.skill('guitar', 1); c.stat('stress', 3); return '어색했지만 언젠가는 익숙해지겠지.'; } },
    ],
  },
  // ───────── 큰 병 (국가암등록통계 기반) ─────────
  {
    id: 'fate_cancer', scene: 'hospital', title: '진단', priority: 170, once: true, chance: 1,
    when: (c) => c.s.flags.cancerAge !== undefined && c.age >= (c.s.flags.cancerAge as number),
    text: (c) => `${c.ageInt}살. 건강검진 결과지를 받아 든 의사가 잠시 말을 고른다.\n“조직 검사를 해 봐야겠습니다.”\n우리나라 사람 셋 중 한 명은 기대수명까지 살며 한 번은 암을 만난다. 그 한 명이 나였다.`,
    choices: [
      {
        label: '치료에 집중한다',
        odds: (c) =>
          c.dc(7, '체력 판정', [['평소 건강', Math.floor((c.p.stats.health - 60) / 15)], ['나이', c.age > 75 ? -2 : c.age < 55 ? 1 : 0], ['담배', c.p.habits.smoking ? -2 : 0], ['곁의 사람들', c.p.partnerId ? 1 : 0]], '통계', '암 환자 5년 상대생존율 72.9% (2022 국가암등록통계) — 기본 성공 확률을 그 값에 맞췄다'),
        run: (c) => {
          c.money(-c.krw(8_000_000), '치료비');
          if (c.check(c.choicesOdds!)) {
            c.stat('health', -12);
            c.stat('happiness', 6);
            c.theme('age');
            c.chron('긴 치료를 이겨 냈다. 회복 후 첫 합주에서 다들 울었다', 'big');
            return '마지막 항암 날, 병원 복도에서 이어폰으로 내 옛날 노래를 들었다.';
          }
          c.stat('health', -60);
          c.theme('loss');
          c.chron('병이 깊었다. 남은 시간을 노래로 채우기로 했다', 'big');
          return '의사는 시간이 많지 않다고 했다. 그날 밤, 마지막 곡의 첫 소절을 썼다.';
        },
      },
      {
        label: '치료받으며 무대도 놓지 않는다',
        odds: (c) => c.dc(9, '체력 판정', [['평소 건강', Math.floor((c.p.stats.health - 60) / 15)], ['나이', c.age > 75 ? -2 : c.age < 55 ? 1 : 0], ['음악이 주는 힘', 1]], '통계', '5년 상대생존율 72.9% 기준, 무리하는 만큼 조금 불리하다'),
        run: (c) => {
          c.money(-c.krw(8_000_000), '치료비');
          c.fans(c.p.fans * 0.1 + 100);
          if (c.check(c.choicesOdds!)) {
            c.stat('health', -15);
            c.rep(4);
            c.chron('투병 중에도 무대에 섰다', 'big');
            return '모자를 눌러쓰고 무대에 올랐다. 관객 모두가 그 노래를 알고 있었다.';
          }
          c.stat('health', -65);
          c.chron('마지막까지 무대에 섰다', 'big');
          return '그해 겨울 공연이 마지막이었다. 앙코르를 두 번 했다.';
        },
      },
    ],
  },
  // ───────── 확률 놀이: 로또 (6/45, 실제 수학) ─────────
  {
    id: 'fate_lotto', scene: 'street', title: '편의점 로또', cooldown: 10, chance: 0.06,
    when: (c) => c.age >= 20 && c.age < 80,
    text: () => '편의점 계산대 옆 로또 용지. 천 원이면 일주일 동안 꿈을 꿀 수 있다.\n1등 확률은 814만 5,060분의 1. 번개를 맞을 확률보다 낮다고들 한다.',
    choices: [
      {
        label: '한 장 산다',
        run: (c) => {
          c.money(-1000, '로또');
          const r = c.rng.next();
          // 6/45 등수별 확률: 1등 1/8,145,060 · 2등 6/8,145,060 · 3등 1/35,724 · 4등 1/733 · 5등 1/45
          if (r < 1 / 8_145_060) { c.money(c.krw(2_000_000_000), '로또 1등'); c.chron('로또 1등에 당첨됐다 — 814만 분의 1', 'big'); c.set('lotto1'); return '숫자 여섯 개가 다 맞았다. 손이 떨려서 사진도 못 찍었다.'; }
          if (r < 7 / 8_145_060) { c.money(c.krw(60_000_000), '로또 2등'); c.chron('로또 2등 당첨 — 135만 분의 1', 'big'); return '보너스 번호까지. 장비를 전부 바꿨다.'; }
          if (r < 1 / 35_724) { c.money(c.krw(1_500_000), '로또 3등'); return '3등! 3만 5천 분의 1. 멤버들에게 고기를 샀다.'; }
          if (r < 1 / 733) { c.money(50_000, '로또 4등'); return '4등, 오만 원. 합주실비가 생겼다.'; }
          if (r < 1 / 45) { c.money(5_000, '로또 5등'); return '5등, 오천 원. 다음 주 로또를 또 샀다.'; }
          return '꽝. 일주일치 꿈값으로는 나쁘지 않았다.';
        },
      },
      { label: '그 돈으로 기타 줄을 산다', run: (c) => { c.skill(c.p.mainInst ?? 'guitar', 1); return '새 줄의 첫 소리. 이게 내 당첨금이다.'; } },
    ],
  },
  // ───────── 실제로 있었던 시대 장면 ─────────
  {
    id: 'era_2002', scene: 'street', title: '2002년 여름, 거리 응원', once: true, chance: 1, priority: 130,
    when: (c) => c.year === 2002 && c.age >= 8 && c.age < 40,
    text: () => '2002년 6월. 온 나라의 거리가 붉은 티셔츠로 가득 찼다.\n광장에서 누군가 북을 치기 시작했고, 수만 명이 같은 박자로 손뼉을 쳤다.',
    choices: [
      { label: '북 치는 사람 옆에서 박자를 맞춘다', run: (c) => { c.skill('drums', 4); c.skill('stage', 3); c.stat('happiness', 10); c.chron('2002년 거리 응원, 수만 명과 같은 박자를 쳤다', 'big'); return '그날 처음 알았다. 리듬 하나로 모르는 사람 수만 명이 하나가 될 수 있다는 걸.'; } },
      { label: '집에서 TV로 본다', run: (c) => { c.stat('happiness', 5); return '창밖에서도 함성이 들렸다.'; } },
    ],
  },
  {
    id: 'era_2008', scene: 'office', title: '2008년, 얼어붙은 지갑', once: true, chance: 0.8, priority: 115,
    when: (c) => c.year >= 2008 && c.year <= 2009 && c.age >= 19 && c.age < 45,
    text: () => '세계 금융위기. 뉴스는 매일 환율과 해고 이야기였다.\n알바 자리가 줄었고, 공연 티켓도 덜 팔렸다.',
    choices: [
      { label: '허리띠를 졸라맨다', run: (c) => { c.money(-c.krw(800_000), '생활비 상승'); c.stat('stress', 6); c.theme('city'); return '라면 봉지 뒤에 가사를 적었다.'; } },
      { label: '오히려 곡 작업에 몰두한다', run: (c) => { c.skill('compose', 4); c.stat('stress', 3); return '어려운 시절의 노래가 오래 남는다고, 누군가 말했다.'; } },
    ],
  },
];

