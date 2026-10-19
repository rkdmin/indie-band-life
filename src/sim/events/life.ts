// 인생·관계 랜덤 사건 (유년기~노년). 스토리(story.ts)가 뼈대라면, 이쪽은 살결이다.

import type { EventDef } from '../ctx';
import type { Ctx } from '../ctx';
import type { Npc } from '../types';
import { josa } from '../korean';

const between = (c: Ctx, a: number, b: number) => c.age >= a && c.age < b;
const free = (c: Ctx) => c.p.military !== 'serving';
const parentAlive = (c: Ctx, k: 'mom' | 'dad') => {
  const n = c.s.npcs[c.s.flags[k] as string];
  return !!n && n.alive;
};
const anyParent = (c: Ctx) => parentAlive(c, 'mom') || parentAlive(c, 'dad');
/** 엄마(없으면 아빠)를 'pa' 역할에 묶는다 */
const bindParent = (c: Ctx): boolean => {
  for (const k of ['mom', 'dad'] as const) {
    const id = c.s.flags[k] as string;
    if (id && c.s.npcs[id]?.alive) {
      c.bind.pa = id;
      return true;
    }
  }
  return false;
};
const paName = (c: Ctx) => (c.npc('pa').gender === 'f' ? '엄마' : '아빠');
const hasPartner = (c: Ctx) => !!c.p.partnerId && !!c.s.npcs[c.p.partnerId]?.alive;
const bindPartner = (c: Ctx): boolean => {
  if (!hasPartner(c)) return false;
  c.bind.pt = c.p.partnerId!;
  return true;
};
/** 평범한 친구 후보 — 밴드 멤버·연인 제외 */
const plainFriend = (n: Npc) => !n.inBand && n.role !== 'partner';
const addDrink = (c: Ctx, d: number) => {
  c.p.habits.drinking = Math.max(0, Math.min(3, c.p.habits.drinking + d));
};
const breakUp = (c: Ctx, d: number, memory: string) => {
  c.npc('pt').role = 'friend';
  c.p.partnerId = null;
  c.rel('pt', d, memory);
  c.theme('breakup');
  c.chron(`${c.nj('pt', '과/와')} 헤어졌다`, 'people', 'pt');
};

export const LIFE: EventDef[] = [
  // ───────── 초등학생 ─────────
  {
    id: 'life_friend_fight', scene: 'classroom', title: '절교 선언', chance: 0.2, cooldown: 3,
    when: (c) => between(c, 7, 13),
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.metAge < 13 && n.affinity > 0),
    text: (c) => `“너랑 이제 안 놀아!”\n딱지 한 장 때문이었다. ${c.nj('f', '은/는')} 쉬는 시간 내내 등을 돌리고 앉아 있다.\n급식 줄에서도 일부러 멀리 섰다.`,
    choices: [
      { label: '아끼는 스티커를 내밀며 먼저 사과한다', run: (c) => { c.rel('f', 12, '스티커로 화해한 날'); c.stat('happiness', 4); return `${c.nj('f', '이/가')} 스티커를 받더니 반을 떼서 돌려줬다. “같이 쓰자.”`; } },
      { label: '편지를 써서 사물함에 넣는다', run: (c) => { c.rel('f', 9, '사물함 편지'); c.skill('compose', 1); return '맞춤법은 엉망이었지만, 다음 날 답장이 와 있었다.'; } },
      { label: '나도 끝까지 버틴다', run: (c) => { c.rel('f', -8); c.stat('stress', 4); return '일주일 뒤, 둘 다 왜 싸웠는지 기억도 안 났다. 그래도 어색함은 조금 남았다.'; } },
    ],
  },
  {
    id: 'life_talent_show', scene: 'classroom', title: '장기자랑', chance: 0.25, once: true,
    when: (c) => between(c, 8, 13),
    text: (c) => `${c.ageInt}살, 반 장기자랑 날.\n선생님이 출석부를 펼치며 말했다. “자, 다음은 ${c.me}!”\n교실 뒤편에서 누가 박수를 미리 쳤다.`,
    choices: [
      {
        label: '목청껏 노래한다',
        odds: (c) => c.fromP(c.chance(0.55, (c.p.skills.vocal - 15) / 10), '보컬 판정'),
        run: (c) => {
          c.skill('stage', 3);
          if (c.check(c.choicesOdds!)) { c.skill('vocal', 3); c.stat('happiness', 8); return '반 전체가 후렴을 따라 불렀다. 그날 하굣길이 유난히 짧았다.'; }
          c.stat('stress', 5); return '음이 하늘로 날아갔다. 다들 웃었지만, 이상하게 기분 나쁜 웃음은 아니었다.';
        },
      },
      { label: '리코더 연주', run: (c) => { c.skill('keys', 2); c.skill('stage', 2); c.stat('happiness', 3); return '삑사리 두 번. 선생님은 생활기록부에 “음악에 관심이 많음”이라고 적어 주셨다.'; } },
      { label: '성대모사로 웃긴다', run: (c) => { c.skill('stage', 4); c.stat('happiness', 6); return '교실이 뒤집어졌다. 무대란 결국 사람을 보는 일이라는 걸, 그때 처음 알았다.'; } },
      { label: '배가 아프다고 한다', run: (c) => { c.stat('stress', -2); c.stat('happiness', -3); return '보건실 침대에서 교실 박수 소리를 들었다. 조금 부러웠다.'; } },
    ],
  },
  {
    id: 'life_first_guitar', scene: 'home', title: '거실의 기타 케이스', chance: 0.2, once: true,
    when: (c) => between(c, 9, 15) && !c.p.instrumentAtHome && anyParent(c),
    bind: bindParent,
    text: (c) => `학원에서 돌아오니 소파 위에 검은 기타 케이스가 누워 있다.\n${c.p.income === 'low' ? '모서리가 조금 해진, 중고 거래로 구한 것이다.' : '아직 비닐 냄새가 난다.'}\n${paName(c)}가 괜히 딴청을 피우며 말했다. “그냥… 너 요즘 기타 영상만 보길래.”`,
    choices: [
      { label: '케이스를 열고 줄부터 튕겨 본다', run: (c) => { c.setInst('guitar'); c.skill('guitar', 5); c.rel('pa', 8, '기타를 사 준 날'); c.theme('family'); c.chron(`${paName(c)}가 첫 기타를 사 주었다`, 'music', 'pa'); return '조율이 엉망인 개방현 소리. 세상에서 제일 좋은 소리였다.'; } },
      { label: '“고마워.” 하고 꼭 안는다', run: (c) => { c.rel('pa', 12, '처음으로 꼭 안아 준 날'); c.skill('guitar', 3); c.stat('happiness', 8); c.theme('family'); return `${paName(c)}의 어깨가 생각보다 작았다.`; } },
      { label: '“이거 비싼 거 아니야?” 걱정부터 한다', run: (c) => { c.rel('pa', 5); c.skill('guitar', 3); c.stat('stress', 2); return '“그런 건 어른이 걱정하는 거야.” 그날 밤 기타를 안고 잤다.'; } },
    ],
  },
  {
    id: 'life_report_card', scene: 'home', title: '성적표', chance: 0.18, cooldown: 4,
    when: (c) => between(c, 10, 19) && anyParent(c),
    bind: bindParent,
    text: (c) => `성적표가 나왔다. 학업 ${Math.round(c.p.study)}.\n${c.p.study >= 60 ? '생각보다 잘 나왔다.' : c.p.study >= 35 ? '애매하다. 혼나기도, 칭찬받기도 애매한 숫자.' : '접어서 가방 제일 밑에 넣었다.'}\n식탁 위에 ${paName(c)}의 돋보기안경이 놓여 있다.`,
    choices: [
      { label: '먼저 꺼내서 보여 준다', run: (c) => { if (c.p.study >= 50) { c.rel('pa', 6, '성적표를 자랑한 날'); c.stat('happiness', 5); return '저녁 반찬에 계란말이가 하나 더 올라왔다.'; } c.rel('pa', 3); c.stat('stress', 3); return '한숨 한 번, 그리고 “다음엔 잘하자.” 생각보다 짧았다.'; } },
      { label: '“음악 하는 사람은 성적 안 봐.”', run: (c) => { c.rel('pa', -6); c.stat('stress', 5); c.skill(c.p.mainInst ?? 'guitar', 1); return '그날 밤, 방문 너머로 부모님의 낮은 목소리가 오래 들렸다.'; } },
      { label: '이번 방학엔 학원을 다니겠다고 한다', req: (c) => (c.p.income === 'low' ? '학원비가 부담인 걸 안다 — 형편상 어렵다' : null), run: (c) => { c.study(8); c.stat('stress', 6); c.rel('pa', 4); if (c.p.income === 'mid') c.line('학원비 고지서를 보는 엄마의 한숨을 들었다.'); return '학원 셔틀버스 창가 자리에서, 이어폰으로 연습곡을 들었다.'; } },
    ],
  },
  {
    id: 'life_transfer', scene: 'classroom', title: '전학생', chance: 0.18, once: true,
    when: (c) => between(c, 10, 16),
    bind: (c) => { c.meet('t', { metAt: '전학 온 친구', birthYear: c.p.birthYear, affinity: 5, skill: c.rng.int(10, 40) }); return true; },
    text: (c) => `“오늘 새 친구가 왔어요.”\n칠판 앞에 선 ${c.nj('t', '은/는')} 사투리가 조금 섞인 말투로 이름만 말하고 고개를 숙였다.\n빈자리는 하필 내 옆이다.`,
    choices: [
      { label: '교과서를 같이 보자고 한다', run: (c) => { c.rel('t', 15, '교과서를 같이 본 날'); c.theme('friend'); return `쉬는 시간, ${c.nj('t', '이/가')} 작게 말했다. “여기 애들 다 무서운 줄 알았어.”`; } },
      { label: '좋아하는 노래를 물어본다', run: (c) => { c.rel('t', 12, '좋아하는 노래 이야기'); c.genre(c.npc('t').genre, 5); return '대답을 듣고, 처음 들어 본 장르를 집에 가서 찾아 들었다.'; } },
      { label: '그냥 지켜본다', run: (c) => { c.rel('t', 2); return '한 달쯤 지나니 자연스럽게 인사하는 사이가 됐다.'; } },
    ],
  },
  // ───────── 중·고등학생 ─────────
  {
    id: 'life_allowance', scene: 'street', title: '저금통을 깨는 날', chance: 0.15, once: true,
    when: (c) => between(c, 12, 18),
    text: () => `1년 넘게 모은 용돈. 세뱃돈, 심부름값, 급식비 남은 돈까지.\n저금통을 흔들면 묵직한 소리가 난다.\n악기점 진열장 속 그것이 계속 아른거린다.`,
    choices: [
      { label: '중고 이펙터 페달을 산다', run: (c) => { c.money(-c.krw(80000), '중고 페달'); c.skill('guitar', 3); c.genre('shoegaze', 4); c.stat('happiness', 6); return '발로 밟자마자 소리가 구름처럼 번졌다. 방이 우주가 됐다.'; } },
      { label: '연습용 스틱과 패드를 산다', run: (c) => { c.money(-c.krw(50000), '연습 패드'); c.skill('drums', 4); c.stat('happiness', 4); return '아래층에서 민원이 들어오기 전까지, 일주일은 행복했다.'; } },
      { label: '좋은 이어폰을 산다', run: (c) => { c.money(-c.krw(60000), '이어폰'); c.skill('compose', 2); c.genre('indiepop', 3); return '같은 노래인데 베이스 라인이 처음으로 들렸다.'; } },
      { label: '저금통은 두고, 부모님께 사 달라고 한다', req: (c) => (c.p.income === 'low' ? '형편이 어려운 걸 안다 — 차마 말을 꺼내지 못했다' : null), run: (c) => { c.skill('guitar', 3); c.stat('happiness', 5); return c.p.income === 'high' ? '“그 정도야 뭐.” 다음 날 택배가 왔다. 저금통은 그대로 남았다.' : '“이번 한 번이다.” 대신 다음 시험은 꼭 잘 봐야 한다.'; } },
      { label: '엄마 생일 선물을 산다', if: (c) => parentAlive(c, 'mom'), run: (c) => { c.money(-c.krw(40000), '선물'); c.stat('happiness', 7); c.theme('family'); return '“이걸 왜 샀어.” 엄마는 그 말을 하면서 세 번이나 웃었다.'; } },
    ],
  },
  {
    id: 'life_noraebang', scene: 'club', title: '코인노래방', chance: 0.2, cooldown: 4,
    when: (c) => between(c, 12, 20) && free(c),
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.affinity >= 5),
    text: (c) => `학원 끝나고 ${c.nj('f', '과/와')} 코인노래방.\n천 원에 몇 곡. 화면 속 점수는 늘 이상하다.\n${c.nj('f', '이/가')} 마이크를 내밀었다. “고음 되는 사람이 해.”`,
    choices: [
      {
        label: '고음에 도전한다',
        odds: (c) => c.fromP(c.chance(0.4, (c.p.skills.vocal - 25) / 10), '보컬 판정'),
        run: (c) => {
          c.money(-c.krw(2000));
          c.skill('vocal', 2);
          if (c.check(c.choicesOdds!)) { c.rel('f', 6, '노래방 100점'); c.stat('happiness', 6); return '100점. 둘이 부둥켜안고 소리를 질렀다. 옆 방에서 벽을 쳤다.'; }
          c.rel('f', 4, '노래방 삑사리'); return '목이 갈라졌다. 친구는 바닥에 누워서 웃었다.';
        },
      },
      { label: '듀엣곡을 고른다', run: (c) => { c.money(-c.krw(2000)); c.rel('f', 8, '노래방 듀엣'); c.skill('vocal', 1); c.theme('youth'); return '화음은 엉망이었지만 둘 다 끝까지 진지했다.'; } },
      { label: '탬버린으로 분위기만 띄운다', run: (c) => { c.money(-c.krw(2000)); c.skill('drums', 1); c.rel('f', 5); c.stat('stress', -6); return '손바닥이 빨개질 때까지 박자를 쪼갰다.'; } },
    ],
  },
  {
    id: 'life_crush', scene: 'classroom', title: '두근두근', chance: 0.2, once: true,
    when: (c) => between(c, 13, 18),
    bind: (c) => { c.meet('cr', { metAt: '첫사랑', birthYear: c.p.birthYear, gender: c.isMale ? 'f' : 'm', affinity: 10 }); return true; },
    text: (c) => `비 오는 날 우산을 같이 쓰게 된 뒤로, 자꾸 ${c.n('cr')} 쪽만 보인다.\n체육 시간에도, 급식실에서도.\n교과서 귀퉁이에 이름을 썼다가 지우개로 박박 지웠다.`,
    choices: [
      {
        label: '쪽지를 건넨다',
        odds: (c) => c.fromP(c.chance(0.4, c.p.stats.happiness / 60 - 0.5), '운 판정'),
        run: (c) => {
          c.theme('firstlove');
          if (c.check(c.choicesOdds!)) { c.rel('cr', 20, '쪽지에 답장이 온 날'); c.stat('happiness', 12); c.chron(`${c.n('cr')}에게 쪽지를 건넸다. 답장이 왔다`, 'people', 'cr'); return '답장에는 딱 한 줄. “나도.”\n그날 세상이 형광색이었다.'; }
          c.rel('cr', 3); c.stat('happiness', -6); return '“고마워… 근데 우리 그냥 친구 하자.”\n그 밤, 처음으로 슬픈 노래를 이해했다.';
        },
      },
      { label: '그 마음을 노래로 만든다', run: (c) => { c.theme('firstlove'); c.skill('compose', 4); c.stat('happiness', 3); return '부르지 못한 이름이 후렴이 됐다. 아무에게도 들려주지 않았다.'; } },
      { label: '그냥 멀리서 본다', run: (c) => { c.theme('firstlove'); c.stat('stress', 3); return '졸업식 날까지 결국 말하지 못했다. 그 아쉬움은 오래 남았다.'; } },
    ],
  },
  {
    id: 'life_school_trip', scene: 'rooftop', title: '수학여행의 밤', chance: 0.3, once: true,
    when: (c) => between(c, 14, 18),
    text: () => `수학여행 마지막 밤. 숙소 복도엔 선생님 발소리.\n누군가 몰래 가져온 통기타가 이불 속에서 나왔다.\n“야, 너 칠 줄 알지?”`,
    choices: [
      { label: '불 끄고 조용히 한 곡', if: (c) => c.p.skills.guitar >= 15, run: (c) => { c.skill('guitar', 2); c.skill('stage', 4); c.stat('happiness', 9); c.fans(c.rng.int(5, 15)); c.theme('youth'); c.chron('수학여행 밤, 이불 속 기타로 반 전체가 노래했다', 'music'); return '속삭이듯 시작한 노래가 결국 떼창이 됐다. 선생님도 문 앞에서 끝까지 들으셨다.'; } },
      { label: '노래만 부른다', run: (c) => { c.skill('vocal', 2); c.stat('happiness', 6); c.theme('youth'); return '서툰 반주에 맞춰 부른 노래. 이상하게 그 밤의 냄새까지 기억난다.'; } },
      { label: '베개 싸움이 더 좋다', run: (c) => { c.stat('happiness', 7); c.stat('energy', -5); return '새벽 세 시, 걸려서 전원 복도에 앉아 있었다. 그것마저 웃겼다.'; } },
    ],
  },
  {
    id: 'life_nagging', scene: 'home', title: '식탁 위의 공방', chance: 0.18, cooldown: 4,
    when: (c) => between(c, 13, 19) && !!c.p.mainInst && anyParent(c),
    bind: bindParent,
    text: (c) => `저녁 식탁. ${paName(c)}가 숟가락을 내려놓았다.\n“너 요즘 학원 숙제는 하니? 맨날 그 소리만 나던데.”\n방 안의 ${c.p.mainInst === 'drums' ? '연습 패드' : '악기'}가 괜히 미안해진다.`,
    choices: [
      {
        label: '“딱 1년만 믿어 줘.”',
        odds: (c) => c.fromP(c.chance(0.45, (c.npc('pa').affinity - 40) / 25, (c.p.study - 40) / 20), '설득 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.rel('pa', 6, '1년만 믿어 달라고 한 날'); c.stat('happiness', 7); c.set('parentSupport'); return `“…성적 떨어지면 끝이다.”\n${paName(c)}는 그렇게 말하고 내 밥그릇에 고기를 올려 줬다.`; }
          c.rel('pa', -3); c.stat('stress', 6); return '“1년이 10년 되는 거 많이 봤다.” 대화는 거기서 끝났다.';
        },
      },
      { label: '공부도 하겠다고 약속한다', run: (c) => { c.study(6); c.stat('stress', 4); c.rel('pa', 4); return '책상 위에 문제집과 악보를 나란히 펼쳐 두었다. 둘 다 반쯤만 했다.'; } },
      { label: '대답 없이 방문을 닫는다', run: (c) => { c.rel('pa', -6); c.stat('stress', 5); c.skill(c.p.mainInst ?? 'guitar', 2); c.theme('rage'); return '헤드폰 볼륨을 끝까지 올렸다. 그날 친 리프는 유난히 날이 서 있었다.'; } },
    ],
  },
  {
    id: 'life_puberty', scene: 'street', title: '이유 없는 밤', chance: 0.15, once: true,
    when: (c) => between(c, 14, 17),
    text: () => `요즘은 다 싫다.\n거울 속 얼굴도, 단톡방 알림도, 내일도.\n밤 열한 시, 아파트 놀이터 그네에 혼자 앉아 있다.`,
    choices: [
      { label: '이어폰을 끼고 동네를 한 바퀴 걷는다', run: (c) => { c.stat('stress', -6); c.theme('night'); c.genre('shoegaze', 3); return '가로등 아래 그림자가 길어졌다 짧아졌다. 노래가 끝날 때쯤 조금 괜찮아졌다.'; } },
      { label: '노트에 마구 적는다', run: (c) => { c.skill('compose', 4); c.theme('rage'); c.stat('stress', -3); return '말이 안 되는 문장들. 몇 년 뒤, 그중 한 줄이 가사가 된다.'; } },
      { label: '친구에게 전화한다', if: (c) => Object.values(c.s.npcs).some((n) => n.alive && n.role !== 'parent' && n.affinity >= 20), run: (c) => { c.stat('stress', -8); c.stat('happiness', 4); return '“그냥 심심해서.” 둘 다 그게 아니라는 걸 알았지만, 아무도 묻지 않았다.'; } },
    ],
  },
  {
    id: 'life_pcbang', scene: 'street', title: 'PC방의 유혹', chance: 0.15, cooldown: 4,
    when: (c) => between(c, 13, 19),
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.affinity >= 0),
    text: (c) => `하굣길. ${c.nj('f', '이/가')} 가방끈을 잡아끈다.\n“딱 한 시간만. 오늘 새 시즌 열렸대.”\n오늘 연습하기로 한 곡이 머릿속에서 작게 울린다.`,
    choices: [
      { label: '한 시간만… (세 시간이 된다)', run: (c) => { c.money(-c.krw(4000)); c.rel('f', 6, 'PC방에서 실컷 웃은 날'); c.stat('stress', -6); c.stat('energy', -4); return '나오니 하늘이 깜깜했다. 엄마의 부재중 전화 일곱 통.'; } },
      { label: '“나 연습해야 돼.”', run: (c) => { c.skill(c.p.mainInst ?? 'guitar', 2); c.rel('f', -2); return '“너 진짜 뭐라도 될 거냐?” 웃으며 한 말이 이상하게 오래 남았다.'; } },
      { label: '대신 분식집에서 떡볶이를 먹는다', run: (c) => { c.money(-c.krw(5000)); c.rel('f', 5, '분식집 떡볶이'); c.stat('happiness', 3); return '국물에 튀김까지 찍어 먹고 각자 집으로. 적당한 타협이었다.'; } },
    ],
  },
  {
    id: 'life_cup_ramen', scene: 'street', title: '편의점 앞 파라솔', chance: 0.18, cooldown: 5,
    when: (c) => between(c, 16, 24) && free(c),
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.affinity >= 15),
    text: (c) => `밤 열 시. 편의점 앞 플라스틱 의자.\n컵라면 두 개에서 김이 피어오른다.\n${c.nj('f', '이/가')} 젓가락으로 면을 휘저으며 말했다. “너는 나중에 뭐 할 거야?”`,
    choices: [
      { label: '“음악. 계속.”', run: (c) => { c.money(-c.krw(3000)); c.rel('f', 8, '편의점 앞에서 꿈 이야기'); c.theme('dream'); c.stat('happiness', 4); return `${c.nj('f', '은/는')} 웃지 않았다. 그냥 고개를 끄덕였다. 그게 좋았다.`; } },
      { label: '“모르겠어. 너는?”', run: (c) => { c.money(-c.krw(3000)); c.rel('f', 6, '서로의 미래를 몰랐던 밤'); c.theme('youth'); return '둘 다 모른다는 게 이상하게 위로가 됐다. 국물이 식을 때까지 앉아 있었다.'; } },
      { label: '대답 대신 삼각김밥을 하나 더 산다', run: (c) => { c.money(-c.krw(2000)); c.rel('f', 4); c.stat('stress', -4); return '“역시 넌 말보다 김밥이야.” 그것도 대답이었다.'; } },
    ],
  },
  // ───────── 담배·술 ─────────
  {
    id: 'life_smoke_offer', scene: 'rooftop', title: '한 대 할래?', chance: 0.12, cooldown: 8,
    when: (c) => between(c, 16, 30) && !c.p.habits.smoking,
    text: (c) => `${c.age < 19 ? '학교 뒤 쓰레기장 옆' : '공연장 뒷문 골목'}.\n${c.age < 19 ? '선배' : '처음 본 다른 팀 멤버'}가 담뱃갑을 내밀었다.\n“목 풀린다니까. 다들 한다.”`,
    choices: [
      { label: '“괜찮아요.” 거절한다', run: (c) => { c.stat('health', 1); return '어색한 3초. 그다음엔 아무도 신경 쓰지 않았다. 생각보다 별일 아니었다.'; } },
      { label: '“목 써야 돼서요.” 핑계를 댄다', run: (c) => { c.skill('vocal', 1); return '“아, 보컬이야?” 그 뒤로 그 사람은 내 앞에서 불을 붙이지 않았다.'; } },
      { label: '받아 든다', run: (c) => { c.p.habits.smoking = true; c.stat('health', -4); c.chron('처음 담배를 받아 들었다', 'health'); return '목이 타들어 가고 기침이 났다. 머리가 핑 돌았다.\n그런데 다음 날, 그 냄새가 또 생각났다.'; } },
    ],
  },
  {
    id: 'life_quit_smoking', scene: 'hospital', title: '금연', chance: 0.25, cooldown: 4,
    when: (c) => c.age >= 20 && c.p.habits.smoking,
    text: (c) => `계단 두 층에 숨이 찬다.\n${c.p.habits.smokeYears >= 10 ? `피운 지 ${c.p.habits.smokeYears}년. 고음이 예전 같지 않다.` : '아침마다 목이 칼칼하다.'}\n${c.flag('doctorWarned') ? '의사의 말이 자꾸 떠오른다.' : '주머니 속 담뱃갑이 오늘따라 무겁다.'}`,
    choices: [
      {
        label: '금연 클리닉에 등록한다',
        odds: (c) => c.fromP(c.chance(0.35, c.p.habits.exercise * 0.3, c.flag('doctorWarned') ? 0.8 : 0, -c.p.stats.stress / 60), '멘탈 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            c.p.habits.smoking = false; c.stat('health', 6); c.skill('vocal', 2); c.chron('담배를 끊었다', 'health');
            return '석 달째. 밥맛이 돌아오고 숨이 길어졌다. 고음 끝이 다시 맑아졌다.';
          }
          c.stat('stress', 6); return '열흘 만에 편의점 카운터 앞에 섰다. 다음엔 꼭.';
        },
      },
      {
        label: '오늘부로 그냥 끊는다',
        odds: (c) => c.fromP(c.chance(0.2, c.flag('doctorWarned') ? 0.6 : 0, -c.p.stats.stress / 50), '멘탈 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            c.p.habits.smoking = false; c.stat('health', 5); c.stat('stress', 4); c.chron('담배를 끊었다', 'health');
            return '사탕 봉지가 쌓여 갔다. 그래도 버텼다.';
          }
          c.stat('stress', 8); return '사흘째 밤, 손이 떨렸다. 결국 다시.';
        },
      },
      { label: '아직은… 다음에', run: (c) => { c.stat('health', -2); return '다음은 늘 내일이었다.'; } },
    ],
  },
  {
    id: 'life_drink_offer', scene: 'pub', title: '원샷', chance: 0.15, cooldown: 6,
    when: (c) => between(c, 19, 45) && free(c),
    text: (c) => `${c.age < 24 ? '신입생 환영회' : c.p.job === 'office' ? '부서 회식' : '공연 뒤풀이'}.\n테이블 위에 초록 병이 줄지어 섰다.\n누군가 잔을 들고 외쳤다. “자, 원샷!”`,
    choices: [
      { label: '음료수로 건배만 한다', run: (c) => { c.stat('energy', 3); return '“분위기 깨네~” 소리는 딱 한 번. 다음 날 아침 멀쩡한 건 나뿐이었다.'; } },
      { label: '적당히 두 잔만', run: (c) => { addDrink(c, 0.2); c.stat('happiness', 3); c.stat('stress', -3); return '적당히 웃고, 적당히 떠들고, 막차를 탔다.'; } },
      { label: '끝까지 달린다', run: (c) => { addDrink(c, 0.6); c.stat('health', -4); c.stat('energy', -8); c.money(-c.krw(40000), '술값'); return '기억은 2차에서 끊겼다. 단톡방에 내 노래 영상이 올라와 있었다.\n음정이 처참했다. 머리는 하루 종일 깨질 듯했다.'; } },
    ],
  },
  // ───────── 20대~ ─────────
  {
    id: 'life_holiday_nag', scene: 'home', title: '명절', chance: 0.2, cooldown: 4,
    when: (c) => between(c, 22, 40) && free(c) && c.p.job !== 'office',
    text: (c) => `명절. 큰집 거실에 전 부치는 냄새가 가득하다.\n작은아버지가 귤을 까며 물었다.\n“그래서 ${josa(c.me, '은/는')} 언제 취직하니? 음악은 아직도 하고?”`,
    choices: [
      { label: '“네, 하고 있어요.” 웃으며 넘긴다', run: (c) => { c.stat('stress', 4); return '“그래, 젊을 때 해 봐야지.” 그 말 뒤에 붙은 침묵이 길었다.'; } },
      { label: '휴대폰으로 공연 영상을 보여 준다', if: (c) => c.p.fans >= 300, run: (c) => { c.stat('happiness', 6); c.rep(1); return '“어머, 사람이 이렇게 많이 왔어?” 할머니가 화면을 자꾸 넘겨 보셨다.'; } },
      { label: '전 부치는 쪽으로 도망간다', run: (c) => { c.stat('stress', -2); c.theme('family'); return '기름 냄새 속에서 엄마가 작게 말했다. “신경 쓰지 마. 너 하고 싶은 거 해.”'; } },
      { label: '“취직하면 말씀드릴게요.” 정색한다', run: (c) => { c.stat('stress', -3); c.stat('happiness', -2); c.theme('rage'); return '거실 공기가 1도 내려갔다. 그래도 할 말은 했다.'; } },
    ],
  },
  {
    id: 'life_mom_food', scene: 'home', title: '엄마 밥', chance: 0.18, cooldown: 6,
    when: (c) => between(c, 20, 50) && !!c.flag('independent') && parentAlive(c, 'mom') && free(c),
    bind: (c) => { c.bind.pa = c.s.flags.mom as string; return true; },
    text: () => `오랜만에 본가. 현관문을 열자마자 된장찌개 냄새.\n엄마는 “밥 먹었어?”를 인사 대신 했다.\n돌아가는 길, 손에 들린 반찬 통이 네 개다.`,
    choices: [
      { label: '두 그릇 먹는다', run: (c) => { c.stat('health', 3); c.stat('happiness', 7); c.rel('pa', 6, '두 그릇 먹은 날'); c.theme('family'); return '“살 빠졌네.” 엄마는 그 말을 세 번 했다. 하나도 안 빠졌는데.'; } },
      { label: '설거지를 하고 간다', run: (c) => { c.rel('pa', 9, '설거지하고 간 날'); c.stat('happiness', 4); return '물 흐르는 소리 너머로 엄마가 흥얼거리는 노래가 들렸다. 내 노래였다.'; } },
      { label: '반찬 통은 사양한다', run: (c) => { c.rel('pa', -2); c.stat('stress', 2); return '“냉장고 자리 없어.” 결국 두 개는 들고 왔다.'; } },
    ],
  },
  {
    id: 'life_dating', scene: 'street', title: '인연', chance: 0.14, cooldown: 6,
    when: (c) => between(c, 20, 42) && !hasPartner(c) && !c.flag('married') && free(c),
    bind: (c) => {
      c.meet('pt', {
        metAt: c.pick(['친구 소개', '공연장 앞 줄', '동네 단골 카페', '합주실 복도']),
        role: 'partner',
        gender: c.isMale ? 'f' : 'm',
        birthYear: c.p.birthYear + c.rng.int(-3, 3),
        affinity: 20,
        career: c.pick(['office', 'cafe', 'teacher', 'musician'] as const),
      });
      return true;
    },
    text: (c) => `${c.npc('pt').metAt}에서 만난 ${c.n('pt')}.\n두 번째 만남, 해 질 녘 천변을 걸었다.\n“음악 한다고 했죠? 나중에 한 곡 들려줘요.”`,
    choices: [
      { label: '그 자리에서 허밍으로 불러 준다', run: (c) => { c.p.partnerId = c.bind.pt; c.rel('pt', 15, '천변에서 허밍한 날'); c.stat('happiness', 10); c.theme('firstlove'); c.chron(`${c.nj('pt', '과/와')} 만나기 시작했다`, 'people', 'pt'); return `${c.nj('pt', '이/가')} 웃었다. 노을보다 그게 더 오래 기억에 남았다.`; } },
      { label: '공연에 초대한다', if: (c) => !!c.band, run: (c) => { c.p.partnerId = c.bind.pt; c.rel('pt', 12, '처음 공연에 온 날'); c.stat('happiness', 8); c.skill('stage', 2); c.chron(`${c.nj('pt', '과/와')} 만나기 시작했다`, 'people', 'pt'); return '맨 뒷줄에서 손을 흔드는 사람. 그날 공연은 한 사람을 위한 것이었다.'; } },
      { label: '“지금은 음악에만 집중하고 싶어요.”', run: (c) => { c.npc('pt').role = 'friend'; c.rel('pt', -5); c.skill(c.p.mainInst ?? 'guitar', 2); return '돌아오는 버스 안, 괜히 창밖만 봤다.'; } },
    ],
  },
  {
    id: 'life_breakup', scene: 'rooftop', title: '이별', chance: 0.1, cooldown: 8,
    when: (c) => between(c, 20, 50) && hasPartner(c) && !c.flag('married'),
    bind: bindPartner,
    text: (c) => `“우리 요즘 너무 엇갈리는 것 같아.”\n${c.nj('pt', '은/는')} 커피잔만 만지작거렸다.\n공연, 합주, 밤샘. 그 사이 어디쯤에서 우리는 길을 잃었다.`,
    choices: [
      {
        label: '붙잡는다',
        odds: (c) => c.fromP(c.chance(0.4, (c.npc('pt').affinity - 50) / 20), '설득 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.rel('pt', 6, '다시 붙잡은 날'); c.stat('stress', 4); return '“…그럼 이번 주말은 비워 둬.” 아직 끝이 아니었다.'; }
          breakUp(c, -15, '헤어진 날'); c.stat('happiness', -12); return '카페 문이 닫히는 종소리가 이상하게 길게 울렸다.';
        },
      },
      { label: '“그동안 고마웠어.”', run: (c) => { breakUp(c, -5, '고맙다고 말하고 헤어진 날'); c.stat('happiness', -8); return '울지 않았다. 집에 와서 기타를 잡았을 때, 그때 울었다.'; } },
      { label: '음악을 줄이겠다고 약속한다', run: (c) => { c.rel('pt', 10, '음악보다 너를 고른 날'); c.skill(c.p.mainInst ?? 'guitar', -2); c.stat('stress', 5); return '악기 케이스가 한동안 열리지 않았다. 대신 둘이 저녁을 먹는 날이 늘었다.'; } },
    ],
  },
  {
    id: 'life_proposal', scene: 'rooftop', title: '같이 살자', chance: 0.2, once: true,
    when: (c) => between(c, 25, 50) && hasPartner(c) && !c.flag('married') && free(c) && (c.s.npcs[c.p.partnerId!]?.affinity ?? 0) >= 45,
    bind: bindPartner,
    text: (c) => `옥상 평상에 나란히 누워 별 없는 하늘을 본다.\n${c.nj('pt', '이/가')} 불쑥 말했다. “우리… 그냥 같이 살까?”\n주머니 속엔 아무것도 없다. 반지도, 계획도.`,
    choices: [
      { label: '“응.” 그리고 노래 한 곡', run: (c) => { c.set('married'); c.set('independent'); c.rel('pt', 15, '같이 살자고 한 밤'); c.stat('happiness', 15); c.money(-c.krw(8_000_000), '작은 결혼식'); c.theme('family'); c.chron(`${c.nj('pt', '과/와')} 결혼했다. 축가는 직접 불렀다`, 'big', 'pt'); return '하객 마흔 명의 작은 결혼식. 축가는 둘이 직접 불렀다.\n음이 조금 나갔고, 모두가 울었다.'; } },
      { label: '“조금만 더 자리 잡고.”', run: (c) => { c.rel('pt', -6); c.stat('stress', 4); return `“그 조금이 언제인데.” ${c.nj('pt', '은/는')} 웃었지만 눈은 웃지 않았다.`; } },
    ],
  },
  {
    id: 'life_baby', scene: 'hospital', title: '작은 울음', chance: 0.2, once: true,
    when: (c) => between(c, 27, 46) && !!c.flag('married') && !c.flag('child') && free(c),
    bind: bindPartner,
    text: () => `새벽 네 시의 분만실 복도.\n자판기 커피는 식은 지 오래다.\n문이 열리고, 작은 울음소리가 들렸다.`,
    choices: [
      { label: '작은 손에 내 손가락을 쥐여 본다', run: (c) => { c.set('child'); c.rel('pt', 12, '아이가 태어난 날'); c.stat('happiness', 15); c.stat('energy', -10); c.theme('family'); c.chron('아이가 태어났다', 'big'); return '세상에서 가장 작은 악력. 그게 앞으로 모든 것의 이유가 됐다.'; } },
      { label: '자장가를 만든다', run: (c) => { c.set('child'); c.set('lullaby'); c.rel('pt', 10, '자장가를 만든 밤'); c.skill('compose', 4); c.stat('happiness', 12); c.theme('family'); c.chron('아이가 태어났다. 첫 자장가를 만들었다', 'big'); return '코드 세 개짜리 자장가. 지금까지 만든 곡 중 가장 많이 불렀다.'; } },
    ],
  },
  {
    id: 'life_wedding_song', scene: 'stage_old', title: '축가 부탁', chance: 0.15, cooldown: 6,
    when: (c) => between(c, 25, 48) && free(c),
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.affinity >= 25),
    text: (c) => `${c.nj('f', '이/가')} 결혼한다.\n“축가는 무조건 너지. 사례는… 밥은 맛있대.”\n예식장 홀 조명은 생각보다 밝고, 음향은 생각보다 나쁘다.`,
    choices: [
      { label: '정성껏 준비한 커버', run: (c) => { c.money(c.krw(300000), '축가 사례'); c.money(-c.krw(100000), '축의금'); c.skill('stage', 3); c.rel('f', 10, '결혼식 축가'); c.stat('happiness', 5); return '2절에서 신부 어머니가 우셨다. 뷔페는 정말 맛있었다.'; } },
      {
        label: '두 사람을 위한 자작곡',
        odds: (c) => c.fromP(c.chance(0.5, (c.p.skills.compose - 35) / 12), '작곡 판정'),
        run: (c) => {
          c.money(-c.krw(100000), '축의금');
          c.skill('compose', 3);
          if (c.check(c.choicesOdds!)) { c.rel('f', 18, '나를 위해 만든 노래'); c.fans(c.rng.int(10, 40)); c.theme('friend'); return '하객 중 누가 영상을 올렸다. “이 노래 제목이 뭐예요?” 댓글이 달렸다.'; }
          c.rel('f', 8); return '가사를 반쯤 까먹었다. 신랑이 대신 불러 줬다. 그게 더 감동이었다.';
        },
      },
      { label: '정중히 사양하고 축의금을 넉넉히', run: (c) => { c.money(-c.krw(200000), '축의금'); c.rel('f', 2); return '다른 사람의 축가를 들으며, 조금 아쉬웠다.'; } },
    ],
  },
  {
    id: 'life_class_reunion', scene: 'pub', title: '동창회', chance: 0.12, cooldown: 8,
    when: (c) => between(c, 27, 60) && free(c),
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.metAge < 19 && c.ageInt - n.metAge >= 10, (n) => 1 + Math.max(0, 50 - Math.abs(n.affinity))),
    text: (c) => {
      const n = c.npc('f');
      return `단톡방 공지 하나에 스무 명이 모였다.\n배 나온 반장, 머리 짧아진 부반장, 그리고 ${c.ageInt - n.metAge}년 만에 보는 ${c.n('f')}.\n${n.metAt}에서 만났던 그 얼굴이 맞다.\n“야, 너 아직 음악 해?”`;
    },
    choices: [
      { label: '옛날 이야기로 밤을 샌다', run: (c) => { c.money(-c.krw(50000), '회비'); c.rel('f', 14, '동창회에서 다시 만난 밤'); c.stat('happiness', 7); c.theme('friend'); c.chron(`동창회에서 ${c.nj('f', '과/와')} 다시 만났다`, 'people', 'f'); return '그때 그 선생님, 그 매점, 그 노래. 둘이 기억하는 게 서로 조금씩 달랐다.'; } },
      { label: '2차 노래방에서 한 곡 뽑는다', run: (c) => { c.money(-c.krw(50000), '회비'); c.rel('f', 8); c.skill('stage', 2); c.fans(c.rng.int(3, 12)); return '“와, 진짜 가수네.” 다음 공연에 동창 셋이 왔다.'; } },
      { label: '1차만 하고 일찍 나온다', run: (c) => { c.money(-c.krw(30000), '회비'); c.rel('f', 3); c.stat('energy', 4); return '연락처 하나가 늘었다. 그걸로 충분했다.'; } },
    ],
  },
  {
    id: 'life_group_chat', scene: 'home', title: '단톡방 알림 999+', chance: 0.12, cooldown: 8,
    when: (c) => between(c, 22, 60) && free(c),
    text: (c) => `조용하던 고등학교 단톡방이 갑자기 불타고 있다.\n누가 졸업 앨범 사진을 올렸다.\n${c.ageInt}살의 나는 지금, 열여덟 살 내 앞머리를 보고 있다.`,
    choices: [
      { label: '내 공연 홍보를 슬쩍 올린다', run: (c) => { c.fans(c.rng.int(5, 25)); c.stat('happiness', 3); return '읽음 숫자가 줄어들었다. 답은 이모티콘 두 개. 그래도 두 명은 왔다.'; } },
      { label: '그 시절 사진을 더 찾아 올린다', run: (c) => { c.stat('happiness', 6); c.theme('youth'); return '사진 한 장에 대화가 새벽까지 이어졌다. 다들 늙었는데, 말투는 그대로다.'; } },
      { label: '알림을 끈다', run: (c) => { c.stat('stress', -4); return '조용해진 휴대폰. 가끔 몰래 들어가서 읽기만 했다.'; } },
    ],
  },
  {
    id: 'life_moving', scene: 'home', title: '이삿날', chance: 0.12, cooldown: 10,
    when: (c) => between(c, 23, 60) && !!c.flag('independent') && free(c),
    text: (c) => `계약 만료. 또 이사다.\n박스 스무 개, 그중 다섯 개가 케이블과 악보.\n${c.flag('married') ? '같이 쌀 짐이 늘었다.' : '혼자 테이프 뜯는 소리가 방에 울린다.'}`,
    choices: [
      { label: '방음 되는 집으로 무리해서 간다', run: (c) => { c.money(-c.krw(3_000_000), '이사·보증금 차액'); c.skill(c.p.mainInst ?? 'guitar', 3); c.stat('happiness', 6); c.theme('city'); return '새벽 두 시에 기타를 쳐도 아무도 벽을 두드리지 않는다. 그 사실에 조금 울컥했다.'; } },
      { label: '싸고 볕 드는 외곽으로', run: (c) => { c.money(c.krw(1_000_000), '보증금 차액'); c.stat('stress', -5); c.stat('energy', -3); return '합주실까지 한 시간 반. 대신 창밖으로 산이 보였다.'; } },
      { label: '버리지 못한 물건을 정리한다', run: (c) => { c.stat('stress', -3); c.theme('loss'); return '박스 맨 밑에서 첫 공연 티켓이 나왔다. 그건 다시 넣었다.'; } },
    ],
  },
  {
    id: 'life_cat', scene: 'street', title: '골목의 작은 울음', chance: 0.12, once: true,
    when: (c) => between(c, 20, 65) && !!c.flag('independent') && free(c),
    text: () => `비 오는 밤, 합주 끝나고 돌아오는 골목.\n재활용 박스 옆에서 손바닥만 한 고양이가 떨고 있다.\n눈이 마주쳤다. 놓아주지 않는 눈이다.`,
    choices: [
      { label: '외투 안에 품고 집에 간다', run: (c) => { c.set('cat'); c.set('catAge', c.ageInt); c.money(-c.krw(300000), '병원비·모래·사료'); c.stat('happiness', 10); c.stat('stress', -6); c.theme('night'); c.chron('비 오는 밤, 고양이를 데려왔다', 'life'); return '그날부터 앰프 위는 고양이 자리가 됐다. 연습할 때마다 꼬리로 박자를 맞춘다.'; } },
      { label: '구조 단체에 연락한다', run: (c) => { c.stat('happiness', 3); return '임시 보호처가 정해졌다. 가끔 사진이 온다. 잘 크고 있다.'; } },
      { label: '편의점에서 참치캔만 사다 준다', run: (c) => { c.money(-c.krw(2000)); c.stat('happiness', -2); c.theme('night'); return '다음 날 그 자리엔 빈 캔만 있었다. 오래 마음에 걸렸다.'; } },
    ],
  },
  {
    id: 'life_cat_old', scene: 'home', title: '오래된 고양이', chance: 0.25, once: true,
    when: (c) => !!c.flag('cat') && c.age >= ((c.flag('catAge') as number) || 0) + 14,
    text: () => `앰프 위로 뛰어오르지 못한 지 꽤 됐다.\n고양이는 요즘 하루 종일 볕 드는 창가에서 잔다.\n기타 소리가 나면, 눈만 가늘게 뜬다.`,
    choices: [
      { label: '창가에서 조용히 기타를 쳐 준다', run: (c) => { c.set('cat', false); c.stat('happiness', -6); c.skill('compose', 3); c.theme('loss'); c.chron('함께 살던 고양이를 떠나보냈다', 'life'); return '마지막 날까지 그 곡을 들었다. 앰프 위 털 몇 가닥은 치우지 않았다.'; } },
      { label: '좋아하던 간식을 실컷 준다', run: (c) => { c.set('cat', false); c.stat('happiness', -5); c.theme('loss'); c.chron('함께 살던 고양이를 떠나보냈다', 'life'); return '배부른 얼굴로 잠들었다. 그게 마지막이었다.'; } },
    ],
  },
  {
    id: 'life_sea_trip', scene: 'street', title: '바다', chance: 0.12, cooldown: 8,
    when: (c) => between(c, 19, 75) && free(c),
    text: (c) => `${hasPartner(c) ? '둘이서' : '혼자'} 새벽 기차를 탔다.\n종점에서 내려 십 분 걸으니 바다.\n파도 소리가 생각보다 크고, 생각보다 규칙적이다.`,
    choices: [
      { label: '파도 소리를 녹음한다', run: (c) => { c.money(-c.krw(150000), '여행비'); c.skill('compose', 3); c.theme('sea'); c.stat('stress', -8); return '녹음 파일 이름: “바다_새벽_03”. 언젠가 인트로가 될 소리.'; } },
      { label: '모래사장에서 기타를 친다', run: (c) => { c.money(-c.krw(150000), '여행비'); c.theme('sea'); c.stat('happiness', 8); c.fans(c.rng.int(0, 8)); return '지나가던 아이 하나가 끝까지 앉아서 들었다. 박수는 그 아이 혼자였다.'; } },
      { label: '아무것도 안 하고 바다만 본다', run: (c) => { c.money(-c.krw(150000), '여행비'); c.theme('sea'); c.stat('stress', -12); c.stat('energy', 6); return '해가 질 때까지. 돌아오는 기차에서 아주 오랜만에 깊게 잤다.'; } },
    ],
  },
  {
    id: 'life_jjimjilbang', scene: 'home', title: '찜질방', chance: 0.12, cooldown: 8,
    when: (c) => between(c, 18, 80) && free(c),
    text: () => `양머리 수건, 맥반석 계란, 식혜 한 잔.\n뜨끈한 바닥에 누우니 몸이 녹는다.\n옆 매트 아주머니들의 대화가 라디오처럼 흘러간다.`,
    choices: [
      { label: '불가마에서 땀을 뺀다', run: (c) => { c.money(-c.krw(15000)); c.stat('health', 3); c.stat('stress', -8); return '나와서 마신 식혜가 인생 최고의 음료였다.'; } },
      { label: '대화를 몰래 받아 적는다', run: (c) => { c.money(-c.krw(15000)); c.skill('compose', 3); c.theme('family'); return '“우리 아들은 전화를 안 해.” 그 한 줄이 마음에 오래 걸렸다.'; } },
      { label: '그냥 잔다', run: (c) => { c.money(-c.krw(15000)); c.stat('energy', 10); c.stat('stress', -5); return '눈 떠 보니 다음 날 아침. 열두 시간을 잤다.'; } },
    ],
  },
  {
    id: 'life_exercise', scene: 'street', title: '운동을 시작하다', chance: 0.14, cooldown: 6,
    when: (c) => between(c, 22, 80) && free(c) && c.p.habits.exercise < 3,
    text: (c) => `공연 한 시간에 숨이 턱까지 찬다.\n${c.age >= 50 ? '무릎이 날씨를 먼저 알려 준다.' : '거울 속 자세가 기타처럼 휘어 있다.'}\n집 앞 공원에서 사람들이 뛰고 있다.`,
    choices: [
      { label: '매일 아침 30분 걷기', run: (c) => { c.p.habits.exercise = Math.min(3, c.p.habits.exercise + 1); c.stat('health', 4); c.stat('stress', -4); return '걸음 수가 쌓일수록 멜로디가 쌓였다. 걷는 박자는 대체로 BPM 110.'; } },
      {
        label: '동네 헬스장 3개월 등록',
        odds: (c) => c.fromP(0.5, '운 판정'),
        run: (c) => {
          c.money(-c.krw(240000), '헬스장');
          if (c.check(c.choicesOdds!)) { c.p.habits.exercise = Math.min(3, c.p.habits.exercise + 1); c.stat('health', 6); c.skill('stage', 2); return '석 달 뒤, 앙코르까지 숨이 남았다.'; }
          c.stat('happiness', -2); return '세 번 갔다. 회원권은 지갑 속 기부 영수증이 됐다.';
        },
      },
      { label: '내일부터 하자', run: (c) => { c.stat('energy', 3); return '내일은 늘 내일에 있었다.'; } },
    ],
  },
  {
    id: 'life_health_signal', scene: 'hospital', title: '몸이 보내는 신호', chance: 0.15, cooldown: 4,
    when: (c) => c.age >= 38 && (c.p.stats.health < 55 || c.p.habits.drinking >= 2 || c.p.habits.smoking),
    text: (c) => `${c.p.habits.drinking >= 2 ? '아침마다 속이 쓰리다.' : c.p.habits.smoking ? '계단을 오르다 가슴이 답답했다.' : '자다가 이유 없이 깼다. 손끝이 저리다.'}\n별일 아니겠지, 하고 넘긴 게 벌써 몇 달째다.`,
    choices: [
      { label: '병원에 간다', run: (c) => { c.money(-c.krw(250000), '검사비'); c.stat('health', 6); c.stat('stress', 3); if (c.p.habits.smoking) c.set('doctorWarned'); if (c.p.habits.drinking >= 2) addDrink(c, -0.8); return '“지금 오셔서 다행이에요.” 의사의 그 말이 무섭고, 고마웠다.'; } },
      { label: '술부터 줄인다', if: (c) => c.p.habits.drinking >= 1, run: (c) => { addDrink(c, -1); c.stat('health', 4); c.stat('happiness', -2); return '뒤풀이에서 처음으로 탄산수를 시켰다. 아무도 뭐라 하지 않았다.'; } },
      { label: '버틴다', run: (c) => { c.stat('health', -6); c.stat('stress', 4); return '진통제 한 알로 무대에 섰다. 몸은 다 기억한다.'; } },
    ],
  },
  {
    id: 'life_midlife', scene: 'rooftop', title: '중년의 밤', chance: 0.18, once: true,
    when: (c) => between(c, 42, 56) && free(c),
    text: (c) => `${c.ageInt}살. 새벽 세 시에 깼다.\n거울 속에 ${c.flag('child') ? '아이 학원비 고지서를 쥔' : '흰머리가 부쩍 늘어난'} 사람이 서 있다.\n‘나는 뭘 하려고 했더라.’`,
    choices: [
      { label: '스무 살 때 만든 데모를 다시 듣는다', run: (c) => { c.theme('age'); c.skill('compose', 4); c.stat('happiness', 4); return '엉망인 녹음. 그런데 거기엔 지금의 내가 잃어버린 뭔가가 있었다.'; } },
      { label: '충동적으로 비싼 악기를 산다', run: (c) => { c.money(-c.krw(3_500_000), '빈티지 악기'); c.skill(c.p.mainInst ?? 'guitar', 4); c.stat('happiness', 8); c.theme('age'); return '소리는 정말 좋았다. 카드 명세서는 정말 나빴다.'; } },
      { label: '가족과 아침을 먹는다', if: (c) => !!c.flag('married'), run: (c) => { c.stat('stress', -8); c.stat('happiness', 6); c.theme('family'); return '토스트 굽는 냄새. 답은 거창하지 않았다.'; } },
      { label: '옥상에 올라가 담담하게 받아들인다', run: (c) => { c.stat('stress', -5); c.theme('age'); return '도시의 불빛이 하나씩 꺼졌다. 나이 드는 것도 노래가 될 수 있다.'; } },
    ],
  },
  {
    id: 'life_friend_funeral', scene: 'hospital', title: '부고', chance: 0.06, cooldown: 12,
    when: (c) => c.age >= 35 && free(c),
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.affinity >= 20 && c.s.time - n.birthYear >= 35),
    text: (c) => `새벽에 온 문자 한 통.\n[부고] ${c.npc('f').name} 님께서…\n${c.npc('f').metAt}에서 처음 만난 그 얼굴이 영정 사진 속에서 웃고 있다.`,
    choices: [
      { label: '밤새 빈소를 지킨다', run: (c) => { c.npc('f').alive = false; c.money(-c.krw(100000), '조의금'); c.rel('f', 5, '마지막 밤을 지킨 날'); c.stat('happiness', -12); c.theme('loss'); c.chron(`${c.n('f')}의 장례식. 밤새 빈소를 지켰다`, 'people', 'f'); return '육개장 국물이 식어 가는 동안, 둘만 아는 이야기들을 하나씩 꺼냈다.'; } },
      { label: '그 친구가 좋아하던 노래를 부른다', run: (c) => { c.npc('f').alive = false; c.money(-c.krw(100000), '조의금'); c.stat('happiness', -10); c.skill('compose', 3); c.theme('loss'); c.chron(`${c.nj('f', '을/를')} 보냈다. 그를 위한 노래를 만들기 시작했다`, 'people', 'f'); return '목이 막혀서 2절은 부르지 못했다. 그 노래는 아직 미완성이다.'; } },
      { label: '멀리서 조용히 명복을 빈다', run: (c) => { c.npc('f').alive = false; c.stat('happiness', -8); c.theme('loss'); return '연락 한 번 더 할걸. 그 생각이 오래 따라왔다.'; } },
    ],
  },
  // ───────── 노년 ─────────
  {
    id: 'life_grandchild', scene: 'home', title: '손주', chance: 0.25, once: true,
    when: (c) => c.age >= 62 && !!c.flag('child'),
    text: (c) => `손주가 태어났다.\n조그만 손이 내 검지를 꽉 쥔다. 그 악력, 어디서 본 것 같다.\n“${c.isMale ? '할아버지' : '할머니'}는 옛날에 무대에 섰대.” 아이 엄마가 웃으며 말한다.`,
    choices: [
      { label: '자장가를 불러 준다', run: (c) => { c.set('grandchild'); c.skill('vocal', 1); c.stat('happiness', 14); c.theme('family'); c.chron(c.flag('lullaby') ? '손주가 태어났다. 오래전 그 자장가를 다시 불렀다' : '손주가 태어났다. 처음으로 자장가를 불렀다', 'big'); return c.flag('lullaby') ? '수십 년 전 만든 코드 세 개짜리 자장가. 손주도 그 노래에 잠들었다.' : '쉰 목소리로 부른 자장가. 노래가 끝나기도 전에 잠들었다.'; } },
      { label: '작은 장난감 실로폰을 선물한다', run: (c) => { c.set('grandchild'); c.money(-c.krw(30000)); c.stat('happiness', 12); c.theme('family'); c.chron('손주가 태어났다', 'big'); return '띵. 띵. 띵. 어디선가 들어 본 첫 번째 소리.'; } },
    ],
  },
  {
    id: 'life_culture_center', scene: 'musicroom', title: '문화센터 통기타 교실', chance: 0.25, cooldown: 2,
    when: (c) => c.age >= 60 && c.age < 88 && c.mainSkill >= 25,
    text: () => `구민 문화센터 3층, 화요일 오전 10시.\n수강생은 일곱 명. 평균 연령 일흔.\n“선생님, F 코드는 손이 안 닿아요.”`,
    choices: [
      { label: '손가락을 하나씩 잡아 준다', run: (c) => { c.inc('teachCount'); c.money(c.krw(400000), '강사료'); c.stat('happiness', 8); c.skill('stage', 1); return '석 달 만에 F 코드가 울렸다. 교실 전체가 박수를 쳤다.\n그 소리가 어떤 공연 박수보다 좋았다.'; } },
      { label: '쉬운 코드로 바꾼 노래부터 가르친다', run: (c) => { c.inc('teachCount'); c.money(c.krw(400000), '강사료'); c.stat('stress', -6); c.theme('age'); return '종강 날 다 같이 부른 노래. 누군가는 울었고, 누군가는 박자를 놓쳤다. 완벽했다.'; } },
      { label: '수강생들과 발표회를 연다', run: (c) => { c.inc('teachCount', 2); c.skill('stage', 2); c.stat('happiness', 10); c.rep(1); c.chron('문화센터 통기타 교실 발표회를 열었다', 'music'); return '로비에 접이식 의자 서른 개. 객석 맨 앞줄에 수강생들의 손주들이 앉아 있었다.'; } },
    ],
  },
  {
    id: 'life_last_call', scene: 'home', title: '마지막 통화', chance: 0.18, once: true,
    when: (c) => c.age >= 74,
    bind: (c) => c.bindFrom('f', (n) => plainFriend(n) && n.affinity >= 25 && n.metAge < 30, (n) => 1 + Math.max(0, n.affinity) + Math.max(0, 30 - n.metAge)),
    text: (c) => {
      const n = c.npc('f');
      return `저녁, 오래된 이름으로 전화가 왔다. ${n.name}.\n${n.metAge}살 때 ${n.metAt}에서 만난 친구.\n목소리가 많이 가늘어졌다. “그냥… 네 목소리 듣고 싶어서.”`;
    },
    choices: [
      { label: '옛날 노래를 같이 흥얼거린다', run: (c) => { c.npc('f').alive = false; c.rel('f', 10, '전화로 같이 부른 노래'); c.stat('happiness', 10); c.theme('friend'); c.theme('age'); c.chron(`${c.nj('f', '과/와')}의 마지막 통화. 둘이 옛 노래를 불렀다`, 'people', 'f'); return '수화기 너머 숨소리 섞인 화음. 그게 둘의 마지막 합주였다.'; } },
      { label: '“고마웠다”고 말한다', run: (c) => { c.npc('f').alive = false; c.rel('f', 12, '고맙다고 말한 날'); c.stat('happiness', 8); c.stat('stress', -6); c.theme('friend'); c.chron(`${c.n('f')}에게 고마웠다고 말했다`, 'people', 'f'); return '“뭘, 새삼스럽게.” 웃음소리가 예전 그대로였다.'; } },
      { label: '“다음 주에 보러 갈게.”', run: (c) => { c.npc('f').alive = false; c.rel('f', 6); c.theme('loss'); return '다음 주는 오지 않았다. 대신 짧은 문자가 왔다. 그 통화가 마지막이었다.'; } },
    ],
  },
];
