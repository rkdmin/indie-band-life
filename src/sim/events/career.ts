import type { EventDef } from '../ctx';
import type { Ctx } from '../ctx';
import type { Npc } from '../types';
import { GENRE_INFO, INST_LABEL, VENUES, eraOf } from '../data/world';
import { leaveBand, playGig, addWalkIn } from '../actions';
import { josa, won } from '../korean';
import { clamp } from '../rng';
import { npcAge } from '../npc';
import { draftFor, monthsWord } from '../data/localize';

// 밴드·음악 산업·건강 랜덤 사건
// 실존 인물·밴드·곡·방송·페스티벌·공연장·레이블·브랜드 이름은 쓰지 않는다. 전부 가상의 이름이다.

const free = (c: Ctx) => c.p.military !== 'serving' && !c.p.retired;
/** 멤버가 한 명 이상 있는 밴드에서 활동 중 */
const inBand = (c: Ctx) => free(c) && !!c.band && c.members.length > 0;
const chem = (c: Ctx, d: number) => {
  if (c.band) c.band.chemistry = clamp(c.band.chemistry + d);
};
const fanBump = (c: Ctx, ratio: number, base: number) => c.fans(c.p.fans * ratio + base);
const released = (c: Ctx) => c.s.songs.filter((x) => x.released);
const genreIs = (c: Ctx, ...g: string[]) => !!c.band && g.includes(c.band.genre);
const share = (c: Ctx) => c.members.length + 1;
const gigs = (c: Ctx) => (c.flag('gigs') as number) || 0;
const bumpNpc = (n: Npc, d: number) => {
  n.skill = clamp(n.skill + d, 0, 98);
};
// 징병은 나라·시대마다 다르다 (data/world/localize.json draft) — 한국은 늘, 미국은 1973년까지, 영국은 1960년까지, 서독은 2011년까지
const isDrafteeOf = (c: Ctx) => (n: Npc) =>
  !!draftFor(c.p.country, c.year) && n.inBand && n.gender === 'm' && npcAge(c.s, n) >= 20 && npcAge(c.s, n) <= 28 && !c.s.flags[`npcMil:${n.id}`];

const SETTLE_REASONS: [string, string][] = [
  ['회사 붙었어. 정규직. 엄마가 울더라.', '취업'],
  ['결혼해. 내년 봄에.', '결혼'],
  ['아기가 생겼어.', '육아'],
  ['고향 내려가서 아버지 가게 맡기로 했어.', '귀향'],
];

export const CAREER: EventDef[] = [
  // ───────────────────────── 밴드 내부 ─────────────────────────
  {
    id: 'car_creative_clash', scene: 'studio', title: '음악적 차이', cooldown: 6, chance: 0.18,
    when: (c) => inBand(c) && c.age >= 16,
    bind: (c) => c.bindFrom('m', (n) => n.inBand),
    text: (c) =>
      `합주실, 시간당 만오천 원짜리 B룸. 신곡 브릿지에서 또 멈췄다.\n${c.nj('m', '이/가')} 악기를 내려놓는다.\n“솔직히 이 곡은 ${GENRE_INFO[c.npc('m').genre].label} 쪽으로 가야 살아. 지금은 너무 뻔해.”`,
    choices: [
      { label: '“곡 쓴 사람은 나야.” 내 방식대로', run: (c) => { c.skill('compose', 2); c.rel('m', -8, '브릿지 때문에 싸운 날'); c.conflict('m', 15); chem(c, -6); return '곡은 원래대로 완성됐다. 합주실 공기는 남은 40분 내내 무거웠다.'; } },
      { label: (c) => `${c.n('m')}의 방식대로 해 본다`, run: (c) => { c.genre(c.npc('m').genre, 5); c.rel('m', 6, '네 방식대로 해 본 날'); chem(c, 3); return '어색했던 코드가 세 번째 반복에서 갑자기 맞물렸다. 둘 다 말없이 웃었다.'; } },
      {
        label: '둘 다 섞은 버전을 밤새 만들어 온다',
        odds: (c) => c.fromP(c.chance(0.45, (c.p.skills.compose - 40) / 15), '작곡 판정'),
        run: (c) => {
          c.stat('energy', -8);
          if (c.check(c.choicesOdds!)) {
            c.skill('compose', 4); chem(c, 6); c.rel('m', 8, '밤새 섞어 만든 브릿지');
            return '새벽 다섯 시에 보낸 데모. 아침 아홉 시에 답장이 왔다. “이거다.”';
          }
          c.stat('stress', 6); c.skill('compose', 2);
          return '섞었더니 이도 저도 아닌 곡이 됐다. 그래도 둘이 같은 고민을 하고 있다는 건 알았다.';
        },
      },
    ],
  },
  {
    id: 'car_money_fight', scene: 'pub', title: '정산의 밤', cooldown: 8, chance: 0.15,
    when: (c) => inBand(c) && c.age >= 19 && (c.band?.gigs ?? 0) >= 3,
    bind: (c) => c.bindFrom('m', (n) => n.inBand),
    text: (c) =>
      `뒤풀이 자리, 식은 닭발 앞에서 ${c.nj('m', '이/가')} 휴대폰 메모장을 내밀었다.\n“합주실비, 대관비, 기름값… 내가 석 달째 먼저 냈거든.”\n테이블이 조용해졌다.`,
    choices: [
      { label: '공용 통장과 공개 장부를 만든다', run: (c) => { c.money(-c.krw(60_000), '밀린 회비'); chem(c, 5); c.rel('m', 5, '공용 통장 만든 날'); c.set('bandLedger'); return '다음 날 밴드 단톡방에 엑셀 파일이 올라왔다. 이름은 “우리돈_최종_진짜최종”.'; } },
      { label: '밀린 돈을 내가 다 메운다', run: (c) => { c.money(-c.krw(250_000), '대신 정산'); c.rel('m', 8, '대신 갚아 준 돈'); c.stat('stress', 3); return '통장이 가벼워진 만큼 분위기도 가벼워졌다. 다음 달이 걱정이지만.'; } },
      { label: '“다음 공연 수익 나오면 그때 하자.”', run: (c) => { chem(c, -6); c.rel('m', -6); c.conflict('m', 10); c.stat('stress', 4); return '그 “다음”이 몇 번째인지, 아무도 세지 않았지만 다들 알고 있었다.'; } },
    ],
  },
  {
    id: 'car_late_member', scene: 'studio', title: '또 지각', cooldown: 6, chance: 0.16,
    when: (c) => inBand(c),
    bind: (c) => c.bindFrom('m', (n) => n.inBand, (n) => (n.traits.includes('free') ? 3 : 1)),
    text: (c) => `합주 시작 40분째. ${c.n('m')}의 자리만 비어 있다.\n단톡방 마지막 메시지: “거의 다 옴 ㅋㅋ”\n그건 30분 전이었다.`,
    choices: [
      { label: '지각 벌금제 도입 (10분에 오천 원)', run: (c) => { c.rel('m', -3); chem(c, 2); c.set('lateFine'); return '석 달 뒤, 벌금 통으로 뒤풀이 삼겹살을 먹었다. 낸 사람은 거의 한 명이었다.'; } },
      { label: '도착하자마자 화를 낸다', run: (c) => { c.rel('m', -10, '지각해서 혼난 날'); c.conflict('m', 12); chem(c, -4); c.stat('stress', 3); return '그날 합주는 유난히 박자가 빨랐다. 다들 화가 나 있었으니까.'; } },
      { label: (c) => `“${c.call('m')}, 요즘 무슨 일 있어?”`, run: (c) => { c.rel('m', 9, '무슨 일 있냐고 물어 준 날'); c.theme('friend'); chem(c, 3); return '알바를 두 개 뛰고 있었다고 했다. 다음 합주부터 시간을 한 시간 늦췄다.'; } },
    ],
  },
  {
    id: 'car_member_romance', scene: 'pub', title: '우리 사귀어', cooldown: 12, chance: 0.08,
    when: (c) => inBand(c) && c.members.length >= 2 && c.age >= 18,
    bind: (c) => c.bindFrom('m', (n) => n.inBand) && c.bindFrom('m2', (n) => n.inBand && n.id !== c.bind.m),
    text: (c) => `MT 다녀온 다음 주. ${josa(c.n('m'), '과/와')} ${c.nj('m2', '이/가')} 손을 잡고 합주실에 들어왔다.\n“저기… 우리 사귀어.”\n드럼 스틱이 바닥에 떨어지는 소리가 났다.`,
    choices: [
      { label: '박수 치며 축하한다', run: (c) => { c.rel('m', 4); c.rel('m2', 4); chem(c, 3); c.set('bandCouple'); c.theme('firstlove'); return '그날 신곡 제목은 만장일치로 정해졌다. 둘은 귀까지 빨개졌다.'; } },
      { label: '“헤어져도 밴드는 계속한다고 약속해.”', run: (c) => { c.rel('m', 1, '밴드 연애 서약'); c.rel('m2', 1, '밴드 연애 서약'); chem(c, 1); c.set('bandCouple'); return '냅킨에 쓴 각서 한 장. 지장 대신 케첩을 찍었다.'; } },
      { label: '솔직히 걱정된다고 말한다', run: (c) => { c.rel('m', -5); c.rel('m2', -5); chem(c, -3); c.stat('stress', 3); return '틀린 말은 아니었다. 그래서 더 서운했을 거다.'; } },
    ],
  },
  {
    id: 'car_member_draft', scene: 'military', title: '멤버의 입영 통지서', cooldown: 4, chance: (c) => 0.22 * (draftFor(c.p.country, c.year)?.rate ?? 0),
    when: (c) => inBand(c) && c.members.some(isDrafteeOf(c)),
    bind: (c) => c.bindFrom('m', isDrafteeOf(c)),
    text: (c) =>
      `${c.nj('m', '이/가')} 합주실 소파에 흰 봉투를 내려놓았다.\n“나 다음 달에 간다.”\n${INST_LABEL[c.npc('m').inst]} 자리가 ${monthsWord(draftFor(c.p.country, c.year)?.months ?? 18)} 동안 빈다.`,
    choices: [
      {
        label: '기다린다 — 그 자리는 비워 둔다',
        run: (c) => {
          c.set(`npcMil:${c.bind.m}`);
          chem(c, 5); c.rel('m', 12, '자리 비워 두겠다고 한 날'); c.fans(-(c.p.fans * 0.05)); c.theme('military');
          c.chron(`${c.n('m')} 입대. 밴드는 그 자리를 비워 두기로 했다`, 'band', 'm');
          return '입영 전날, 노래방에서 목이 쉬도록 불렀다. 훈련소 앞에서는 아무도 울지 않기로 했는데.';
        },
      },
      {
        label: '객원 세션으로 버틴다',
        run: (c) => {
          c.set(`npcMil:${c.bind.m}`);
          c.money(-c.krw(300_000), '세션비'); c.rel('m', 4); chem(c, -3);
          return '객원 연주자는 잘했다. 다만 곡이 끝날 때마다 다들 빈 자리를 한 번씩 봤다.';
        },
      },
      {
        label: '정식으로 새 멤버를 뽑는다',
        run: (c) => {
          c.set(`npcMil:${c.bind.m}`);
          c.rel('m', -8, '입대하자 대체된 일');
          leaveBand(c, c.bind.m, '입대');
          addWalkIn(c);
          return '현실적인 선택이었다. 휴가 나온 그가 공연을 보러 왔을 때, 무대에서 눈을 못 마주쳤다.';
        },
      },
    ],
  },
  {
    id: 'car_member_settle', scene: 'pub', title: '평범한 삶', cooldown: 8, chance: 0.12,
    when: (c) => inBand(c) && c.age >= 26 && c.members.some((n) => npcAge(c.s, n) >= 27),
    bind: (c) => {
      if (!c.bindFrom('m', (n) => n.inBand && npcAge(c.s, n) >= 27)) return false;
      const [why, short] = c.pick(SETTLE_REASONS);
      c.vars.why = why;
      c.vars.short = short;
      return true;
    },
    text: (c) =>
      `포장마차, 막차 30분 전. ${c.nj('m', '이/가')} 소주잔을 오래 돌렸다.\n“나… ${c.vars.why}”\n“그래서, 밴드는 이제 못 할 것 같아.”`,
    choices: [
      {
        label: '웃으며 보내 준다',
        run: (c) => {
          c.rel('m', 12, '웃으며 보내 준 밤'); c.theme('friend'); c.stat('happiness', -6);
          leaveBand(c, c.bind.m, c.vars.short as string);
          return '“축가는 우리가 한다.” 그게 그와 우리 밴드의 마지막 약속이었다.';
        },
      },
      {
        label: '붙잡는다',
        odds: (c) => c.fromP(c.chance(0.35, c.npc('m').affinity / 40), '설득 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            c.rel('m', 6, '붙잡아 준 밤'); chem(c, 4);
            return '“…주말만이라도 할게.” 그날 막차는 놓쳤고, 둘이서 첫차까지 걸었다.';
          }
          c.rel('m', -6); c.stat('stress', 5);
          leaveBand(c, c.bind.m, c.vars.short as string);
          return '돌아오지 않을 걸 알면서도 말했다. 그도 미안해하면서 끝내 고개를 저었다.';
        },
      },
    ],
  },
  {
    id: 'car_member_plateau', scene: 'recording', title: '제자리걸음', cooldown: 8, chance: 0.12,
    when: (c) => inBand(c) && c.members.some((n) => n.skill + 15 < c.mainSkill),
    bind: (c) => c.bindFrom('m', (n) => n.inBand && n.skill + 15 < c.mainSkill),
    text: (c) => `녹음실 모니터 스피커 앞. 엔지니어가 조심스럽게 말했다.\n“${INST_LABEL[c.npc('m').inst]} 트랙은… 몇 번 더 가 볼까요?”\n벌써 열네 번째 테이크다. ${c.n('m')}의 손이 떨린다.`,
    choices: [
      { label: '매일 밤 같이 메트로놈 연습', run: (c) => { c.stat('energy', -8); bumpNpc(c.npc('m'), 5); c.rel('m', 8, '메트로놈 60부터 다시 한 밤'); c.skill(c.p.mainInst ?? 'guitar', 1); chem(c, 3); return '메트로놈 60부터 다시. 한 달 뒤, 열네 번이 세 번으로 줄었다.'; } },
      { label: '레슨비를 보태 준다', run: (c) => { c.money(-c.krw(400_000), '레슨비 지원'); bumpNpc(c.npc('m'), 7); c.rel('m', 6, '레슨비를 보태 준 일'); return '“갚을게.” “됐어, 무대에서 갚아.”'; } },
      {
        label: '실력 좋은 연주자로 교체한다',
        run: (c) => {
          c.rel('m', -20, '밴드에서 잘린 날');
          leaveBand(c, c.bind.m, '실력 차이');
          addWalkIn(c);
          c.stat('happiness', -5);
          return '소리는 좋아졌다. 단톡방은 한동안 조용했다.';
        },
      },
    ],
  },
  {
    id: 'car_audition', scene: 'studio', title: '멤버 오디션', cooldown: 6, chance: 0.15,
    when: (c) => free(c) && !!c.band && c.members.length < 4 && c.p.fans >= 80 && c.age >= 17,
    text: () => `멤버 모집 공고를 올렸더니 지원자가 다섯 명.\n합주실 2시간 대관, 한 사람당 20분.\n누구를 뽑을까?`,
    choices: [
      { label: '실력이 제일 좋은 사람', run: (c) => { addWalkIn(c); bumpNpc(c.npc('r'), 8); chem(c, -2); return '첫 합주에서 그가 말했다. “템포가 좀 흔들리네요.” 맞는 말이라 더 아팠다.'; } },
      { label: '같이 있으면 웃긴 사람', run: (c) => { addWalkIn(c); chem(c, 7); c.rel('r', 8, '오디션 날 웃겨 준 사람'); return '연주는 조금 서툴렀지만, 오디션 중에 다 같이 세 번 웃었다.'; } },
      { label: '이번엔 아무도 안 뽑는다', run: (c) => { c.stat('stress', 2); return '맞는 사람은 결국 나타난다고, 다들 그렇게 말한다.'; } },
    ],
  },
  {
    id: 'car_solo_offer', scene: 'office', title: '솔로 제안', cooldown: 10, chance: 0.1,
    when: (c) => inBand(c) && c.p.fans >= 1500 && c.members.some((n) => n.skill >= 45),
    bind: (c) => c.bindFrom('m', (n) => n.inBand && n.skill >= 45, (n) => n.skill),
    text: (c) => `${c.nj('m', '이/가')} 머뭇거리며 말을 꺼냈다.\n“어떤 회사에서 나한테 솔로 앨범 내 보자고 연락이 왔어.”\n“밴드 그만두라는 건 아니래. 근데… 어떻게 생각해?”`,
    choices: [
      { label: '“해. 넌 그럴 자격 있어.”', run: (c) => { c.rel('m', 12, '솔로를 응원해 준 날'); chem(c, -3); fanBump(c, 0.03, 30); return '솔로 쇼케이스 맨 앞줄에서 제일 크게 소리 지른 사람이 나였다.'; } },
      { label: '서운한 마음을 솔직히 말한다', run: (c) => { c.rel('m', -4); chem(c, 2); c.stat('stress', 4); return '그는 결국 제안을 거절했다. 고마운데, 마음 한쪽이 무거웠다.'; } },
      {
        label: '그 곡들, 밴드로 같이 하자고 한다',
        odds: (c) => c.fromP(c.chance(0.5, (c.band!.chemistry - 50) / 20), '팀워크 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { chem(c, 6); c.skill('compose', 2); c.rel('m', 5); return '그의 곡에 우리 소리를 입혔다. 그 곡이 이번 앨범 타이틀이 됐다.'; }
          c.rel('m', -6); chem(c, -5);
          return '“그건 내 얘기야. 밴드 곡이 아니라.” 그 말에 아무도 대답하지 못했다.';
        },
      },
    ],
  },
  {
    id: 'car_flooded_room', scene: 'studio', title: '지하 합주실이 잠겼다', cooldown: 8, chance: 0.1,
    when: (c) => free(c) && !!c.band && c.age >= 16,
    text: (c) => `장마 사흘째. 합주실 사장님한테서 사진이 왔다.\n발목까지 찬 흙탕물, 그 위에 둥둥 뜬 이펙터 박스. 전기도 나갔다.\n${c.members.length ? '단톡방이 순식간에 불이 났다.' : '혼자 쓰던 방이라 더 서러웠다.'}`,
    choices: [
      { label: '다 같이 가서 물을 퍼낸다', run: (c) => { c.stat('energy', -10); chem(c, 6); c.money(-c.krw(150_000), '젖은 케이블 교체'); return '양동이를 들고 계단을 몇 번이나 오르내렸다. 사장님이 짜장면을 시켜 줬다.'; } },
      { label: '정전된 김에 촛불 켜고 어쿠스틱 합주', run: (c) => { c.skill('compose', 3); chem(c, 4); c.theme('night'); return '앰프 없는 소리가 이렇게 작고 예뻤던가. 그날 만든 곡은 아직도 셋리스트에 있다.'; } },
      { label: '새 합주실을 알아본다 (비싸지만 지상층)', run: (c) => { c.money(-c.krw(300_000), '보증금 차액'); c.stat('stress', -3); return '창문이 있는 합주실. 햇빛이 드니까 다들 표정이 밝아졌다.'; } },
    ],
  },
  {
    id: 'car_gear_stolen', scene: 'street', title: '장비 도난', cooldown: 12, chance: 0.08,
    when: (c) => free(c) && !!c.band && c.age >= 17 && (c.band?.gigs ?? 0) >= 2,
    text: (c) => `공연 끝나고 1톤 트럭에 앰프를 싣다가 잠깐 편의점에 다녀왔다.\n돌아오니 짐칸이 허전하다.\n${c.p.mainInst ? INST_LABEL[c.p.mainInst] : '악기'} 케이스가 없다.`,
    choices: [
      {
        label: '경찰에 신고하고 SNS에 사진을 올린다',
        odds: (c) => c.fromP(c.chance(0.3, c.p.fans / 5000), '인지도 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { fanBump(c, 0.04, 40); c.stat('happiness', 8); return '공유가 수천 번. 사흘 뒤 중고 거래 사이트에서 팬이 찾아냈다. 케이스 안 스티커가 증거였다.'; }
          c.stat('happiness', -8); c.money(-c.krw(800_000), '새 악기');
          return '돌아오지 않았다. 대신 낯선 사람들의 위로 댓글이 잔뜩 달렸다.';
        },
      },
      { label: '적금 깨서 새 걸 산다', run: (c) => { c.money(-c.krw(1_200_000), '새 장비'); c.stat('stress', 4); c.skill('stage', 1); return '새 악기는 소리가 좋았다. 손에 붙기까지 반년은 걸릴 것 같지만.'; } },
      { label: '친구 악기를 빌려 버틴다', run: (c) => { c.skill(c.p.mainInst ?? 'guitar', -1); c.stat('stress', 5); c.theme('rage'); return '남의 악기로 치는 내 곡. 그 분노로 곡을 하나 썼다.'; } },
    ],
  },
  {
    id: 'car_amp_dead', scene: 'club', title: '앰프가 죽었다', cooldown: 6, chance: 0.12,
    when: (c) => free(c) && !!c.band && (c.band?.gigs ?? 0) >= 1,
    text: () => `리허설 10분 전. 퍽, 하는 소리와 함께 앰프에서 탄내가 났다.\n클럽 백스테이지는 좁고, 다음 팀은 벌써 케이블을 감고 있다.`,
    choices: [
      { label: '옆 밴드에 앰프를 빌려 달라고 한다', run: (c) => { c.meet('x', { metAt: '앰프 빌려준 옆 밴드', career: 'musician', affinity: 25, skill: c.rng.int(30, 60) }); c.rel('x', 6, '앰프를 빌려준 날'); c.rep(1); return '“우리도 지난달에 그랬어요.” 뒤풀이에서 그 밴드랑 술값을 반씩 냈다.'; } },
      {
        label: '앰프 없이 언플러그드로 간다',
        odds: (c) => c.fromP(c.chance(0.5, (c.p.skills.stage - 40) / 15), '무대 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('stage', 4); fanBump(c, 0.03, 30); c.rep(2); return '“앰프 고장 났어요. 그냥 할게요.” 객석이 조용해지더니, 마지막 후렴에서 다 같이 불렀다.'; }
          c.stat('stress', 6); c.skill('stage', 2);
          return '맨 뒷줄까지 소리가 닿지 않았다. 그래도 맨 앞 다섯 명은 끝까지 들어 줬다.';
        },
      },
      { label: '대여료 내고 클럽 앰프를 빌린다', run: (c) => { c.money(-c.krw(100_000), '대여료'); return '익숙하지 않은 톤. 그래도 공연은 무사히 끝났다.'; } },
    ],
  },
  {
    id: 'car_name_dispute', scene: 'office', title: '밴드 이름의 주인', once: true, chance: 0.1,
    when: (c) => free(c) && !!c.band && c.p.fans >= 600 && (c.band?.gigs ?? 0) >= 5,
    text: (c) => `내용증명이 날아왔다.\n어느 작은 의류 회사가 〈${c.band!.name}〉 상표를 먼저 등록해 두었다고 한다.\n“해당 명칭의 공연·음반 사용을 중단해 주시기 바랍니다.”`,
    choices: [
      {
        label: '변호사와 상의해 이름을 지킨다',
        hint: (c) => `비용 ${won(c.krw(2_000_000))}`,
        odds: (c) => c.dc(11, '증거 판정', [['오래 써 온 이름', c.band!.formedYear < c.year - 2 ? 3 : 0]], '가정', '먼저, 오래 써 온 쪽이 유리하다'),
        run: (c) => {
          c.money(-c.krw(2_000_000), '법률 상담');
          if (c.check(c.choicesOdds!)) { c.rep(3); c.chron('밴드 이름을 지켜 냈다', 'band'); return '공연 기록과 포스터가 증거가 됐다. 먼저 쓴 사람이 우리라는 게 인정됐다.'; }
          const old = c.band!.name;
          c.stat('stress', 8); c.band!.name = `${old} 밴드`; c.fans(-(c.p.fans * 0.03));
          c.chron(`밴드 이름 변경: 〈${old}〉 → 〈${c.band!.name}〉 (상표 합의)`, 'band');
          return '결국 이름 뒤에 한 단어를 붙이는 걸로 합의했다. 어색하지만, 우리는 우리다.';
        },
      },
      {
        label: '깔끔하게 새 이름으로 바꾼다',
        run: (c) => {
          const old = c.band!.name;
          c.band!.name = `${c.pick(['느린', '젖은', '오후의', '푸른', '낡은', '두 번째'])} ${c.pick(['우체국', '고래', '정류장', '여름', '라디오', '소음'])}`;
          c.fans(-(c.p.fans * 0.08)); chem(c, 3);
          c.chron(`밴드 이름 변경: 〈${old}〉 → 〈${c.band!.name}〉`, 'band');
          return `새 이름은 〈${c.band!.name}〉. 팬들이 “구 ${old}” 소리를 그만하는 데 1년이 걸렸다.`;
        },
      },
      { label: '그 회사에 협업 굿즈를 제안한다', run: (c) => { c.money(c.krw(500_000), '협업 수익'); c.rep(1); return '티셔츠에 우리 이름이 크게 박혔다. 싸울 줄 알았는데 친구가 됐다.'; } },
    ],
  },
  {
    id: 'car_band_vote', scene: 'studio', title: '밴드 회의', cooldown: 8, chance: 0.14,
    when: (c) => inBand(c) && c.members.length >= 2,
    text: () => `화이트보드에 세 줄.\n① 정규 앨범 ② 전국 투어 ③ 한 달 쉬기\n포스트잇 투표 결과는 동점. 결정권이 나한테 넘어왔다.`,
    choices: [
      { label: '① 앨범에 올인', run: (c) => { c.skill('compose', 4); c.money(-c.krw(500_000), '녹음 준비'); chem(c, 2); return '가사 노트가 두 권째로 넘어갔다.'; } },
      { label: '② 투어를 돈다', run: (c) => { c.skill('stage', 4); c.stat('energy', -12); fanBump(c, 0.04, 40); c.theme('city'); return '여섯 도시, 휴게소 호두과자 여섯 봉지. 매일 밤 다른 천장 아래에서 잤다.'; } },
      { label: '③ 쉬자. 진짜로', run: (c) => { c.stat('stress', -10); c.stat('happiness', 5); chem(c, 4); return '한 달 동안 악기 사진 하나 안 올렸다. 그리고 다들 먼저 합주하자고 연락이 왔다.'; } },
    ],
  },
  {
    id: 'car_band_mt', scene: 'rooftop', title: '밴드 MT', cooldown: 8, chance: 0.13,
    when: (c) => inBand(c) && c.age >= 18,
    text: () => `“우리 너무 일만 했다. MT 가자.”\n렌터카 한 대, 장 본 봉지 여섯 개, 그리고 어쿠스틱 기타 하나.`,
    choices: [
      { label: '강가 펜션에서 고기 굽기', run: (c) => { c.money(-c.krw(120_000), 'MT 회비'); chem(c, 8); c.stat('happiness', 6); c.stat('health', -1); return '새벽 세 시, 모닥불 앞에서 누군가 데뷔곡을 불렀다. 다 따라 불렀다.'; } },
      { label: '바다로 간다', run: (c) => { c.money(-c.krw(150_000), 'MT 회비'); chem(c, 6); c.theme('sea'); c.stat('stress', -6); return '파도 소리를 휴대폰으로 녹음했다. 다음 앨범 첫 트랙 인트로가 됐다.'; } },
      { label: '돈 없으니 합주실에서 밤샘', run: (c) => { chem(c, 4); c.skill('stage', 1); c.skill('compose', 2); c.stat('energy', -6); return '컵라면 열두 개와 잼 세션 네 시간. 이것도 MT라고 우겼다.'; } },
    ],
  },

  // ───────────────────────── 업계 ─────────────────────────
  {
    id: 'car_interview', scene: 'pub', title: '음악 기자의 인터뷰', cooldown: 6, chance: 0.15,
    when: (c) => free(c) && c.p.fans >= 300 && c.age >= 18 && (!!c.band || c.s.songs.length > 0),
    bind: (c) => {
      if (c.bindFrom('j', (n) => n.career === 'journalist')) return true;
      c.meet('j', { metAt: '인터뷰', career: 'journalist', affinity: 10, birthYear: c.p.birthYear - c.rng.int(2, 10) });
      return true;
    },
    text: (c) => `음악 웹진 기자 ${c.nj('j', '이/가')} 녹음기를 테이블에 올렸다.\n“밴드 이름은 어떻게 지으셨어요? 아, 그 질문 지겨우시죠.”`,
    choices: [
      {
        label: '솔직하게, 망한 이야기까지 다 한다',
        odds: (c) => c.fromP(c.chance(0.6, (c.p.rep - 30) / 25), '평판 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.rep(5); fanBump(c, 0.03, 40); c.rel('j', 8, '솔직했던 인터뷰'); return '제목은 “망해 본 사람들의 노래”. 그 기사가 생각보다 멀리 퍼졌다.'; }
          c.rep(-2); c.rel('j', 3);
          return '헤드라인에 실수로 한 말이 박혔다. 단톡방에서 한참 놀림받았다.';
        },
      },
      { label: '준비해 간 모범 답안', run: (c) => { c.rep(2); c.rel('j', 2); return '무난한 기사가 나왔다. 엄마가 캡처해서 가족 단톡방에 올렸다.'; } },
      { label: '멤버들에게 말할 기회를 넘긴다', if: (c) => c.members.length > 0, run: (c) => { c.rep(2); chem(c, 6); c.rel('j', 4); return '말수 적던 멤버가 처음으로 길게 말했다. 기사에서 제일 좋은 문장이 그 말이었다.'; } },
    ],
  },
  {
    id: 'car_harsh_review', scene: 'home', title: '혹평', cooldown: 8, chance: 0.18,
    when: (c) => free(c) && c.s.albums.length > 0,
    text: (c) => `새 음반 리뷰가 올라왔다. 평점 4.5/10.\n“성실하지만 새롭지 않다. 이 밴드는 아직 자기 목소리를 찾지 못했다.”\n${c.members.length ? '멤버들은 아무도 그 링크 얘기를 꺼내지 않았다.' : '새벽 세 시에 그 리뷰를 다섯 번 읽었다.'}`,
    choices: [
      {
        label: '반박 글을 쓴다',
        odds: (c) => c.fromP(c.chance(0.35, (c.p.rep - 40) / 20), '평판 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.rep(3); fanBump(c, 0.02, 20); return '정중하고 날카로운 글이었다. 평론가가 짧게 답했다. “좋은 반론입니다. 다음 음반 기대하겠습니다.”'; }
          c.rep(-4); c.stat('stress', 6);
          return '감정이 묻어난 글은 캡처되어 돌았다. 지우고 싶었지만 이미 늦었다.';
        },
      },
      { label: '아무 말 없이 연습실로 간다', run: (c) => { c.skill('compose', 3); c.skill(c.p.mainInst ?? 'guitar', 2); c.stat('stress', 4); return '“새롭지 않다.” 그 다섯 글자를 연습실 벽에 붙였다.'; } },
      { label: '그 분노를 가사로 쓴다', run: (c) => { c.theme('rage'); c.skill('compose', 2); c.stat('stress', -3); return '“성실하지만 새롭지 않은 놈이 부르는 노래” — 첫 줄부터 이상하게 잘 써졌다.'; } },
    ],
  },
  {
    id: 'car_rumor', scene: 'home', title: '악플과 루머', cooldown: 8, chance: 0.12,
    when: (c) => free(c) && c.p.fans >= 1500,
    text: () => `익명 게시판에 글이 올라왔다.\n“그 밴드 뒤풀이 때 스태프한테 막 대한다던데.”\n사실이 아니다. 근데 조회수가 벌써 2만이다.`,
    choices: [
      { label: '차분하게 공식 입장을 낸다', run: (c) => { c.rep(2); c.stat('stress', 5); return '사실관계 몇 줄과 함께 일했던 스태프들의 댓글이 달렸다. 루머는 사흘 만에 식었다.'; } },
      { label: '법적 대응을 한다', run: (c) => { c.money(-c.krw(1_500_000), '법률 비용'); c.rep(3); c.stat('stress', 8); return '작성자는 결국 사과문을 올렸다. 이겼는데, 이긴 기분은 아니었다.'; } },
      { label: '휴대폰을 끄고 상담을 받는다', run: (c) => { c.money(-c.krw(200_000), '상담비'); c.stat('stress', -8); c.stat('happiness', 3); return '“당신이 그런 사람이 아니라는 건 당신이 제일 잘 알잖아요.” 그 말이 오래 남았다.'; } },
    ],
  },
  {
    id: 'car_plagiarism', scene: 'office', title: '비슷하다는 의혹', cooldown: 16, chance: 0.06,
    when: (c) => free(c) && c.p.fans >= 2000 && released(c).length >= 2,
    text: (c) => {
      const list = released(c);
      const s = list[list.length - 1];
      return `누군가 영상을 올렸다. 우리 곡 〈${s.title}〉의 후렴과 어느 외국 인디 곡의 후렴을 나란히 붙여 놓고.\n제목: “이거 우연 맞음?”\n듣고 보니… 코드 진행이 좀 비슷하긴 하다.`;
    },
    choices: [
      {
        label: '작업 과정과 데모 파일을 공개한다',
        odds: (c) => c.fromP(c.chance(0.55, (c.p.skills.compose - 45) / 15), '작곡 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.rep(4); fanBump(c, 0.02, 30); return '날짜가 찍힌 음성 메모 열두 개. 흔한 진행이라는 음악가들의 해설이 이어졌고, 의혹은 정리됐다.'; }
          c.rep(-3); c.stat('stress', 8);
          return '설명은 했지만, 한번 붙은 꼬리표는 잘 떨어지지 않았다.';
        },
      },
      { label: '편곡을 바꾼 개정판을 낸다', run: (c) => { c.rep(-1); c.skill('compose', 3); c.stat('happiness', -4); return '조금 아까웠다. 하지만 바뀐 후렴이 원래보다 낫다는 팬도 있었다.'; } },
      { label: '아무 대응도 하지 않는다', run: (c) => { c.rep(-4); c.stat('stress', 4); return '시간이 지나자 잊혔다. 검색창 연관검색어만 빼고.'; } },
    ],
  },
  {
    id: 'car_grant', scene: 'office', title: '음반 제작 지원사업 공모', cooldown: 4, chance: 0.2,
    when: (c) => free(c) && c.age >= 19 && c.s.songs.length >= 2,
    text: (c) => `시 문화재단의 “지역 뮤지션 음반 제작 지원사업” 공고가 떴다.\n지원금 ${won(c.krw(5_000_000))}. 마감은 일주일 뒤.\n제출 서류: 사업계획서, 예산표, 활동 증빙, 데모 3곡.`,
    choices: [
      {
        label: '밤새 사업계획서를 쓴다',
        odds: (c) => c.fromP(c.chance(0.3, (c.p.rep - 25) / 20, (c.p.skills.compose - 45) / 20), '작곡 판정'),
        run: (c) => {
          c.stat('energy', -8);
          if (c.check(c.choicesOdds!)) {
            c.money(c.krw(5_000_000) / share(c), '지원금'); c.stat('happiness', 8); c.chron('음반 제작 지원사업에 선정됐다', 'music');
            return '선정 메일 제목을 세 번 다시 읽었다. 정산 서류가 앨범보다 두꺼울 거라는 건 아직 몰랐다.';
          }
          c.stat('stress', 4);
          return '탈락. 심사평 한 줄: “음악적 방향성은 좋으나 예산 계획이 불명확함.” 엑셀을 배워야겠다.';
        },
      },
      { label: '서류는 체질이 아니다. 패스', run: (c) => { c.stat('stress', -2); return '대신 그 일주일 동안 곡을 하나 더 썼다.'; } },
    ],
  },
  {
    id: 'car_drama_ost', scene: 'recording', title: 'OST 제안', cooldown: 10,
    chance: (c) => (genreIs(c, 'folk', 'indiepop') ? 0.2 : 0.07),
    when: (c) => free(c) && c.p.fans >= 1000 && c.age >= 20 && c.p.skills.compose >= 30,
    text: () => `드라마 음악감독에게서 전화가 왔다.\n“주인공들이 비 오는 버스 정류장에서 헤어지는 장면이 있는데요. 거기 들어갈 곡이 필요해서요.”\n마감은 3주. 주문은 “아련하게, 그런데 너무 슬프지 않게”.`,
    choices: [
      { label: '요청대로 맞춰 쓴다', run: (c) => { c.money(c.krw(3_000_000), 'OST 작곡료'); fanBump(c, 0.08, 150); c.skill('compose', 3); c.theme('breakup'); return '방송 다음 날, 드라마 클립 댓글에 우리 이름이 처음 등장했다.'; } },
      {
        label: '서랍 속 우리 곡을 내민다',
        odds: (c) => c.fromP(c.chance(0.4, (c.p.skills.compose - 50) / 15), '작곡 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(2_500_000), 'OST 사용료'); fanBump(c, 0.1, 200); c.rep(3); return '음악감독이 말했다. “이거 그대로 갑시다.” 몇 년 묵힌 곡이 드디어 세상에 나갔다.'; }
          c.stat('happiness', -4);
          return '“분위기가 좀 달라서요.” 정중한 거절. 서랍은 다시 닫혔다.';
        },
      },
      { label: '거절한다', run: (c) => { c.rep(1); return '우리는 우리 앨범부터. 아쉽지 않다고 하면 거짓말이다.'; } },
    ],
  },
  {
    id: 'car_ad_jingle', scene: 'recording', title: '광고 음악 의뢰', cooldown: 8, chance: 0.12,
    when: (c) => free(c) && c.p.fans >= 500 && c.p.skills.compose >= 35 && c.age >= 20,
    text: () => `대행사 메일: “신제품 음료 광고, 15초. 청량하고 인디 감성 있는 느낌으로요.”\n예산은 꽤 된다.\n첨부된 레퍼런스는… 음, 우리랑 하나도 안 닮았다.`,
    choices: [
      { label: '한다. 월세는 소중하니까', run: (c) => { c.money(c.krw(2_000_000), '광고 음악'); c.skill('compose', 2); c.stat('stress', 5); if (genreIs(c, 'punk')) c.rep(-3); return '수정 요청 열한 번. 최종본은 1차 시안이었다. 광고 일이란 그런 거다.'; } },
      {
        label: '우리 스타일대로만 하겠다고 조건을 건다',
        odds: (c) => c.fromP(c.chance(0.35, (c.p.rep - 40) / 20), '평판 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(2_500_000), '광고 음악'); c.rep(3); fanBump(c, 0.04, 80); return '“오히려 좋네요.” 광고가 나가자 “이 노래 뭐예요?” 댓글이 줄줄이 달렸다.'; }
          c.stat('happiness', -2);
          return '답장이 오지 않았다. 대행사는 다른 팀을 골랐다.';
        },
      },
      { label: '정중히 거절한다', run: (c) => { c.rep(genreIs(c, 'punk') ? 3 : 1); return '그 광고는 다른 노래로 나왔다. 편의점 TV에서 볼 때마다 조금 웃겼다.'; } },
    ],
  },
  {
    id: 'car_overseas_fest', scene: 'festival', title: '해외 초청장', cooldown: 10,
    chance: (c) => (genreIs(c, 'shoegaze', 'metal') ? 0.22 : 0.06),
    when: (c) => free(c) && !!c.band && c.p.fans >= 1500 && c.age >= 20,
    bind: (c) => {
      c.vars.where = c.pick(['일본 지방 도시의 여름 록 페스티벌', '타이베이의 인디 음악 축제', '유럽 작은 도시의 노이즈 음악 페스티벌', '일본 세 도시 소규모 클럽 투어']);
      return true;
    },
    text: (c) => `영어로 된 메일이 왔다.\n“We love your sound.” — ${c.vars.where} 초청이다.\n체류비는 지원, 항공권은 각자.\n${genreIs(c, 'shoegaze', 'metal') ? '해외 리스너들이 먼저 알아봐 준 거다.' : '어떻게 우리를 알았을까.'}`,
    choices: [
      {
        label: '간다! 악기 무게를 1kg 단위로 잰다',
        run: (c) => {
          c.money(-c.krw(900_000), '항공권');
          c.skill('stage', 5); c.rep(4); fanBump(c, 0.08, 200); chem(c, 6); c.stat('energy', -10); c.theme('dream');
          c.chron(`해외 무대에 처음 섰다 — ${c.vars.where}`, 'big');
          return '말은 안 통했는데 후렴은 다 같이 불렀다. 공항 수하물 벨트에서 기타 케이스가 나오던 순간이 아직도 떨린다.';
        },
      },
      {
        label: '항공권은 팬 펀딩으로',
        odds: (c) => c.fromP(c.chance(0.4, (c.p.fans - 3000) / 4000), '인지도 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('stage', 4); c.rep(4); fanBump(c, 0.07, 150); chem(c, 4); c.chron(`팬들이 보내 준 해외 무대 — ${c.vars.where}`, 'big'); return '목표 금액 112% 달성. 후원자 이름을 전부 적은 현수막을 무대 뒤에 걸었다.'; }
          c.stat('happiness', -6);
          return '펀딩은 68%에서 멈췄다. 후원금은 전액 환불됐고, 미안하다는 글을 길게 썼다.';
        },
      },
      { label: '아직은 무리다. 다음 기회에', run: (c) => { c.stat('happiness', -3); return '“Maybe next year!”라고 답장을 보냈다. 진심이었다.'; } },
    ],
  },
  {
    id: 'car_shortform', scene: 'street', title: '숏폼 챌린지', cooldown: 6, chance: 0.18,
    when: (c) => free(c) && c.year >= 2019 && c.s.songs.length > 0 && c.age >= 15,
    text: (c) => `요즘 숏폼 앱에서 “합주실 15초 챌린지”가 유행이다.\n후렴 한 소절, 멤버들 각자 한 컷씩.\n${c.age >= 40 ? '조카가 말했다. “요즘은 그런 아날로그 감성이 오히려 먹혀요.”' : '팔로워 300명짜리 계정이 조용히 우리를 쳐다보고 있다.'}`,
    choices: [
      {
        label: '각 잡고 찍는다',
        odds: (c) => c.fromP(c.chance(0.12, c.year >= 2022 ? 0.8 : 0, genreIs(c, 'indiepop') ? 0.7 : 0, (c.p.skills.stage - 50) / 20), '무대 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            fanBump(c, 0.25, 1500); c.stat('happiness', 10); c.chron('숏폼 챌린지 영상이 터졌다', 'music');
            return '자고 일어나니 조회수 280만. 모르는 나라 사람들이 우리 후렴을 립싱크하고 있었다.';
          }
          fanBump(c, 0.01, 20); c.stat('energy', -3);
          return '조회수 1,204. 그중 400은 엄마 같다.';
        },
      },
      { label: '편집 없이 라이브 원테이크만 올린다', run: (c) => { fanBump(c, 0.03, 60); c.rep(2); return '“요즘 이런 거 귀하다.” 짧지만 오래 남는 댓글들이 달렸다.'; } },
      { label: '우리는 안 한다', run: (c) => { c.stat('stress', -2); return '알고리즘은 우리를 몰라도, 다음 주 공연 오는 사람들은 안다.'; } },
    ],
  },
  {
    id: 'car_radio', scene: 'recording', title: '심야 라디오', cooldown: 6, chance: 0.14,
    when: (c) => free(c) && c.p.fans >= 500 && c.age >= 18,
    text: () => `심야 라디오 〈새벽 두 시의 음악실〉 출연 섭외.\n라이브 한 곡, 사연 하나, 그리고 DJ의 짓궂은 질문 몇 개.\n스튜디오 유리창 너머로 빨간 ON AIR 불이 켜졌다.`,
    choices: [
      {
        label: '라이브로 승부한다',
        odds: (c) => c.fromP(c.chance(0.55, (c.mainSkill - 45) / 15), '연주 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { fanBump(c, 0.05, 120); c.rep(2); c.skill('stage', 2); return '노래가 끝나고 3초 동안 DJ가 말을 안 했다. “…아, 죄송해요. 듣고 있었어요.”'; }
          c.stat('stress', 4); c.skill('stage', 2);
          return '음 이탈 한 번. 새벽이라 다들 졸고 있었길 바란다.';
        },
      },
      { label: '청취자 사연을 진심으로 읽는다', run: (c) => { fanBump(c, 0.03, 80); c.theme('night'); c.stat('happiness', 4); return '퇴근길 택시 기사님이 보낸 사연이었다. 다음 날 그 사연으로 곡을 썼다.'; } },
      { label: '멤버 폭로전으로 웃긴다', if: (c) => c.members.length > 0, run: (c) => { fanBump(c, 0.04, 100); chem(c, 4); return '“얘가 첫 공연 때 바지 지퍼를…” 문자 게시판이 폭주했다.'; } },
    ],
  },
  {
    id: 'car_tv_live', scene: 'arena', title: 'TV 음악 프로그램', cooldown: 8, chance: 0.12,
    when: (c) => free(c) && !!c.band && c.p.fans >= 3000 && c.age >= 18,
    text: () => `밴드 라이브 전문 TV 프로그램 〈심야 라이브 공방〉에서 출연 제안이 왔다.\n녹화는 단 한 번. 다시 갈 수 없다.\n작가가 덧붙였다. “편곡은 4분 이내로 부탁드려요.”`,
    choices: [
      {
        label: '대표곡을 4분 안에 압축한다',
        odds: (c) => c.fromP(c.chance(0.55, ((c.band?.chemistry ?? 50) - 50) / 20, (c.p.skills.stage - 50) / 20), '무대 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            fanBump(c, 0.12, 500); c.rep(5); chem(c, 4); c.chron('TV 음악 프로그램에 출연했다', 'music');
            return '방송 다음 날 음원 순위가 조금, 아주 조금 움직였다. 고향 동네 슈퍼에 사인이 걸렸다.';
          }
          fanBump(c, 0.03, 100); c.stat('stress', 6);
          return '조명 열기에 기타 튜닝이 나갔다. 방송은 됐다. 편집으로 많이 살려 줬다.';
        },
      },
      { label: '실험적인 신곡으로 간다', run: (c) => { c.rep(4); fanBump(c, 0.05, 150); c.skill('compose', 2); return '시청률은 모르겠다. 하지만 업계 사람들한테서 연락이 몇 통 왔다.'; } },
      { label: '편곡 제한이 싫어 거절한다', run: (c) => { c.rep(1); chem(c, 2); return '대신 그 4분짜리 고민을 다음 앨범에 쏟았다.'; } },
    ],
  },
  {
    id: 'car_survival_show', scene: 'arena', title: '밴드 서바이벌 섭외', cooldown: 10,
    chance: (c) => (eraOf(c.year, c.p.country).name === '오디션의 시대' ? 0.25 : 0.07),
    when: (c) => free(c) && !!c.band && c.p.fans >= 300 && c.p.fans < 40000 && c.age >= 18 && c.age < 40,
    text: () => `방송국 작가에게서 연락이 왔다.\n밴드 서바이벌 프로그램 〈지하에서 무대로〉 새 시즌 섭외.\n“캐릭터가 확실하셔서요. 갈등 장면도 좀… 자연스럽게 나오면 좋고요.”`,
    choices: [
      {
        label: '출연한다',
        odds: (c) => c.fromP(c.chance(0.35, (c.mainSkill - 55) / 12, ((c.band?.chemistry ?? 50) - 50) / 25), '팀워크 판정'),
        run: (c) => {
          c.stat('stress', 10); chem(c, -6);
          if (c.check(c.choicesOdds!)) {
            fanBump(c, 0.4, 3000); c.rep(4); c.chron('밴드 서바이벌 결승 진출', 'big');
            return '결승 무대. 생방송 문자 투표 화면 위로 우리 이름이 올라갔다. 편집이 만든 “악역 멤버”는 지금도 억울해한다.';
          }
          fanBump(c, 0.1, 500); c.stat('happiness', -5);
          return '3라운드 탈락. 방송에 나간 건 5분, 그중 2분은 멤버끼리 언성 높인 장면이었다.';
        },
      },
      { label: '거절한다. 경연하려고 음악하는 게 아니다', run: (c) => { c.rep(3); chem(c, 4); return '그 시즌 우승팀이 부럽지 않았다면 거짓말. 그래도 후회는 없다.'; } },
    ],
  },
  {
    id: 'car_club_closing', scene: 'club', title: '클럽이 문을 닫는다', cooldown: 16, chance: 0.1,
    when: (c) => free(c) && c.age >= 20 && gigs(c) >= 5,
    text: (c) => `처음 무대에 섰던 그 지하 클럽이 다음 달에 문을 닫는다.\n임대료가 두 배가 됐다고 한다.\n계단 벽에 덕지덕지 붙은 포스터 중에 ${c.band ? '우리 것도' : '옛날 우리 것도'} 있다.`,
    choices: [
      { label: '마지막 공연에 선다', run: (c) => { c.skill('stage', 3); c.stat('happiness', 6); c.theme('loss'); fanBump(c, 0.02, 30); c.chron('첫 무대였던 클럽의 마지막 밤에 공연했다', 'music'); return '앙코르가 끝나고 사장님이 조명을 하나씩 껐다. 마지막 불이 꺼질 때까지 아무도 나가지 않았다.'; } },
      {
        label: '모금 공연을 기획한다',
        odds: (c) => c.fromP(c.chance(0.25, (c.p.rep - 40) / 15, c.p.fans / 20000), '평판 판정'),
        run: (c) => {
          c.money(-c.krw(300_000), '기획비'); c.theme('loss');
          if (c.check(c.choicesOdds!)) { c.rep(6); c.chron('모금 공연으로 클럽을 1년 더 살렸다', 'big'); return '열두 팀이 무료로 섰다. 1년. 딱 1년을 더 벌었다. 그걸로 충분했다.'; }
          c.rep(3);
          return '모인 돈으로는 부족했다. 그래도 그날 밤만큼은 클럽이 꽉 찼다.';
        },
      },
      { label: '포스터 한 장만 떼어 온다', run: (c) => { c.theme('loss'); c.stat('happiness', -4); return '테이프 자국까지 그대로인 포스터. 지금도 작업실 벽에 붙어 있다.'; } },
    ],
  },
  {
    id: 'car_stage_accident', scene: 'club', title: '공연 중 사고', cooldown: 12, chance: 0.08,
    when: (c) => free(c) && !!c.band && (c.band?.gigs ?? 0) >= 3,
    text: () => `세 번째 곡 중간. 마이크에 입술이 닿는 순간 찌릿했다.\n동시에 객석 앞쪽에서 누군가 넘어졌다. 슬램하던 무리 사이였다.\n음악은 아직 돌아가고 있다.`,
    choices: [
      { label: '즉시 공연을 멈추고 안전부터 확인한다', run: (c) => { c.rep(4); fanBump(c, 0.02, 30); c.stat('happiness', -3); c.set('safetyFirst'); return '불을 켜고, 넘어진 관객을 앉히고, 클럽에 접지 점검을 요청했다. 크게 다친 사람은 없었다. 20분 뒤 다시 시작한 첫 곡에 박수가 가장 컸다.'; } },
      { label: '공연을 멈추고 관객과 병원까지 동행한다', run: (c) => { c.rep(5); c.stat('energy', -8); c.meet('x', { metAt: '공연 중 다친 관객', role: 'fan', affinity: 35 }); c.rel('x', 10, '응급실까지 같이 간 밤'); return '가벼운 손목 염좌였다. 대기실에서 그가 말했다. “다음 공연 또 갈게요. 대신 앞에서 조심할게요.”'; } },
      { label: '못 본 척 끝까지 한다', run: (c) => { c.rep(-6); c.stat('stress', 8); c.stat('health', -2); return '공연은 끝났지만 후기 게시판이 시끄러웠다. 다음부터는 멈추자고, 그날 밤 멤버들과 약속했다.'; } },
    ],
  },
  {
    id: 'car_fan_letter', scene: 'home', title: '팬레터', cooldown: 6, chance: 0.18,
    when: (c) => free(c) && c.p.fans >= 100 && c.age >= 15,
    text: () => `공연장 굿즈 테이블에 놓고 간 편지 한 통.\n“시험 망치고 매일 밤 이 노래 들으면서 버텼어요. 올해 다시 도전해요. 이번엔 붙을 거예요.”\n꾹꾹 눌러 쓴 글씨.`,
    choices: [
      { label: '손편지로 답장한다', run: (c) => { c.stat('happiness', 8); fanBump(c, 0.01, 10); return '세 번 고쳐 쓴 답장. 1년 뒤, 합격 소식과 함께 또 편지가 왔다.'; } },
      { label: '작업실 벽에 붙여 둔다', run: (c) => { c.stat('stress', -6); c.stat('happiness', 4); return '그만두고 싶은 날마다 그 편지를 봤다. 아직 안 그만뒀다.'; } },
      { label: '그 마음을 노래로 만든다', run: (c) => { c.theme('dream'); c.skill('compose', 2); c.stat('happiness', 5); return '가사에 이름은 넣지 않았다. 그래도 그 사람은 알아들을 거다.'; } },
    ],
  },
  {
    id: 'car_fanclub', scene: 'club', title: '팬클럽 창단', once: true, chance: 0.25,
    when: (c) => free(c) && !!c.band && c.p.fans >= 2500,
    text: () => `공연 끝나고 팬 몇 명이 쭈뼛쭈뼛 다가왔다.\n“저희… 팬클럽 만들어도 될까요? 이름 후보도 정해 왔어요.”\n종이에 적힌 이름 세 개가 다 너무 귀엽다.`,
    choices: [
      { label: '“우리가 영광이죠.” 같이 이름을 고른다', run: (c) => { fanBump(c, 0.05, 100); c.stat('happiness', 8); c.set('fanclub'); c.chron('팬클럽이 생겼다', 'band'); return '팬클럽 1기 회원 87명. 회원증은 손으로 코팅했다고 했다.'; } },
      { label: '공식 팬카페를 직접 운영한다', run: (c) => { fanBump(c, 0.04, 80); c.stat('energy', -5); c.set('fanclub'); return '공지 쓰고, 댓글 달고, 생일 축하하고… 밴드 하나 더 하는 기분이다.'; } },
      { label: '조금 부담스럽다고 말한다', run: (c) => { c.stat('stress', -2); c.fans(-(c.p.fans * 0.01)); return '거리를 두는 게 서로를 위한 거라고 생각했다. 그들은 서운했지만 이해해 줬다.'; } },
    ],
  },
  {
    id: 'car_merch', scene: 'home', title: '굿즈를 만들자', cooldown: 8, chance: 0.15,
    when: (c) => free(c) && !!c.band && c.p.fans >= 500 && c.age >= 18,
    text: () => `“공연 수익으로는 안 돼. 굿즈를 팔아야 해.”\n원룸 바닥에 시안 세 개가 펼쳐져 있다.`,
    choices: [
      {
        label: '티셔츠 200장을 찍는다',
        hint: (c) => `제작비 ${won(c.krw(1_600_000))}`,
        odds: (c) => c.dc(13, '인지도 판정', [['팬 규모', Math.max(-3, Math.min(6, Math.floor((c.p.fans - 2000) / 1500)))]], '가정', '팬 2천 명이면 반반'),
        run: (c) => {
          c.money(-c.krw(1_600_000), '제작비');
          if (c.check(c.choicesOdds!)) { c.money(c.krw(4_000_000), '굿즈 판매'); fanBump(c, 0.02, 20); return '완판. 택배 포장하느라 일주일 동안 손가락에 박스 테이프 자국이 남았다.'; }
          c.money(c.krw(800_000), '굿즈 판매');
          return '반쯤 팔렸다. 남은 티셔츠는 이제 멤버들의 잠옷이 됐다.';
        },
      },
      { label: '손글씨 엽서와 스티커만 소량으로', run: (c) => { c.money(c.krw(200_000), '굿즈 순수익'); c.stat('happiness', 3); return '작고 귀여운 것들이 의외로 제일 먼저 팔렸다.'; } },
      { label: '아직은 음악만', run: (c) => { c.skill('compose', 1); return '굿즈 대신 새 곡 데모를 무료로 풀었다.'; } },
    ],
  },
  {
    id: 'car_crowdfund', scene: 'recording', title: '크라우드펀딩 앨범', cooldown: 10, chance: 0.12,
    when: (c) => free(c) && c.p.fans >= 800 && c.s.songs.filter((x) => !x.released).length >= 3,
    text: () => `만들어 둔 곡은 있는데 녹음할 돈이 없다.\n“펀딩 해 보자. 리워드는 친필 사인 CD랑, 합주실 초대권.”\n목표 금액을 정해야 한다.`,
    choices: [
      {
        label: '목표를 소박하게',
        odds: (c) => c.fromP(c.chance(0.7, (c.p.fans - 1500) / 2000), '인지도 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(3_000_000), '펀딩'); c.stat('happiness', 6); return '사흘 만에 달성. 후원자 명단을 앨범 속지에 빼곡히 넣었다.'; }
          c.stat('happiness', -4);
          return '마감 1시간 전 92%. 아쉽게 실패했다. 응원 댓글은 남았다.';
        },
      },
      {
        label: '크게 간다 — 뮤직비디오까지',
        odds: (c) => c.fromP(c.chance(0.3, (c.p.fans - 4000) / 3000), '인지도 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(12_000_000), '펀딩'); fanBump(c, 0.05, 100); c.chron('크라우드펀딩으로 앨범 제작비를 모았다', 'music'); return '목표의 140%. 이제 정말 잘 만들어야 한다는 무게가 생겼다.'; }
          c.stat('stress', 8); c.rep(-1);
          return '목표의 41%. 숫자가 멈춘 그래프를 한참 들여다봤다.';
        },
      },
      { label: '아직은 아니다', run: (c) => { c.stat('stress', -2); return '조금 더 모으고, 조금 더 다듬기로 했다.'; } },
    ],
  },
  {
    id: 'car_royalty', scene: 'office', title: '저작권 정산', cooldown: 10, chance: 0.12,
    when: (c) => free(c) && released(c).length >= 2 && c.age >= 20,
    text: () => `음원 정산 내역서를 처음으로 꼼꼼히 봤다.\n어떤 곡은 작곡자 이름이 비어 있고, 어떤 곡은 지분이 이상하게 나뉘어 있다.\n몇 년 치 정산이 어딘가에서 새고 있었던 것 같다.`,
    choices: [
      { label: '밤새 서류를 하나하나 맞춘다', run: (c) => { c.money(c.krw(700_000), '미정산분'); c.stat('stress', 6); c.stat('energy', -5); return '등록번호, 지분율, 공동작곡자 서명. 숫자를 맞추다 보니 해가 떴다.'; } },
      { label: '저작권 단체에 정식으로 신탁한다', run: (c) => { c.money(-c.krw(200_000), '가입비'); c.set('royaltyTrust'); c.rep(1); return '처음부터 이렇게 할 걸. 다음 분기부터 작은 숫자가 꼬박꼬박 들어왔다.'; } },
      { label: '골치 아프다. 그냥 둔다', run: (c) => { c.stat('stress', -2); c.money(-c.krw(100_000), '누락분'); return '모르는 게 약이라지만, 그 약값은 생각보다 비쌌다.'; } },
    ],
  },
  {
    id: 'car_session_job', scene: 'recording', title: '세션 의뢰', cooldown: 4, chance: 0.18,
    when: (c) => free(c) && c.age >= 19 && c.mainSkill >= 45 && !!c.p.mainInst && c.p.mainInst !== 'vocal',
    text: (c) => `아는 프로듀서에게서 연락이 왔다.\n“내일 오후에 ${INST_LABEL[c.p.mainInst!]} 세션 하나 가능해? 발라드 앨범인데 세 곡.”\n악보는 이미 메일로 와 있다.`,
    choices: [
      {
        label: '간다. 원테이크로 끝낸다',
        odds: (c) => c.fromP(c.chance(0.5, (c.mainSkill - 55) / 10), '연주 판정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.money(c.krw(600_000), '세션비'); c.skill(c.p.mainInst!, 3); c.rep(2); return '“세 곡 다 첫 테이크로 갑시다.” 그 뒤로 같은 번호에서 연락이 자주 왔다.'; }
          c.money(c.krw(450_000), '세션비'); c.skill(c.p.mainInst!, 4); c.stat('stress', 4);
          return '열 번 넘게 다시 갔다. 남의 곡을 치는 일은 생각보다 훨씬 어렵다.';
        },
      },
      { label: '밴드 합주와 겹친다. 거절', run: (c) => { chem(c, 2); c.stat('stress', -1); return '돈보다 합주. 이번만은.'; } },
    ],
  },
  {
    id: 'car_compose_request', scene: 'recording', title: '곡 좀 써 주실래요?', cooldown: 8, chance: 0.12,
    when: (c) => free(c) && c.p.skills.compose >= 45 && c.age >= 20,
    text: () => `신인 가수의 소속사에서 연락이 왔다.\n“작가님 곡 분위기가 너무 좋아서요. 저희 친구 데뷔곡을 맡아 주실 수 있을까요?”\n작가님. 처음 들어 보는 호칭이다.`,
    choices: [
      { label: '아껴 둔 서랍 속 곡을 넘긴다', if: (c) => c.s.songs.some((x) => !x.released), run: (c) => { c.money(c.krw(1_500_000), '작곡료'); c.rep(2); c.stat('happiness', -3); return '내 노래가 남의 목소리로 나오는 걸 들었다. 이상하게, 그 사람이 더 잘 불렀다.'; } },
      { label: '그 가수에 맞춰 새로 쓴다', run: (c) => { c.money(c.krw(1_200_000), '작곡료'); c.skill('compose', 4); c.stat('energy', -6); return '남의 목소리를 상상하며 쓰는 곡. 내 곡에서는 못 쓰던 멜로디가 나왔다.'; } },
      { label: '내 곡은 내가 부른다', run: (c) => { c.stat('happiness', 2); return '고집일지도 모른다. 하지만 아직은 이 고집이 필요하다.'; } },
    ],
  },
  {
    id: 'car_ai_flood', scene: 'studio', title: 'AI 음악의 범람', once: true, chance: 0.3,
    when: (c) => free(c) && c.year >= 2028 && c.age >= 18 && c.s.songs.length > 0,
    text: (c) => `스트리밍 신곡 목록의 절반이 AI가 만든 곡이라는 기사가 나왔다.\n누군가 우리 곡 스타일을 흉내 낸 “비슷한 노래”도 수십 개 올라와 있다.\n${c.members.length ? '밴드 단톡방에서 의견이 갈렸다.' : '혼자 작업실에서 한참 그 목록을 내려 봤다.'}`,
    choices: [
      { label: '사람의 라이브로 승부한다', run: (c) => { c.skill('stage', 4); c.rep(3); c.set('aiStance', 'live'); fanBump(c, 0.04, 80); return '“여기서만 들을 수 있는 소리.” 공연 포스터 문구를 바꿨다. 객석이 조금씩 늘었다.'; } },
      { label: '도구로 받아들이고 작업에 쓴다', run: (c) => { c.skill('compose', 4); c.set('aiStance', 'tool'); if (genreIs(c, 'punk', 'metal')) c.rep(-3); return '데모 만드는 시간이 반으로 줄었다. 그 시간에 가사를 더 오래 붙잡았다.'; } },
      { label: '창작자 연대 성명에 이름을 올린다', run: (c) => { c.rep(4); c.set('aiStance', 'against'); c.theme('rage'); c.stat('stress', 3); return '몇백 명의 이름 사이에 우리 이름도 있었다. 세상은 천천히 바뀐다.'; } },
    ],
  },

  // ───────────────────────── 건강·몸 ─────────────────────────
  {
    id: 'car_wrist', scene: 'hospital', title: '손목이 시큰하다', cooldown: 10, chance: 0.12,
    when: (c) => free(c) && c.age >= 18 && !!c.p.mainInst && c.p.mainInst !== 'vocal' && c.mainSkill >= 30,
    text: (c) => `${INST_LABEL[c.p.mainInst!]} 연습 세 시간째. 손목 안쪽이 찌릿하다.\n정형외과 의사가 초음파를 보며 말했다.\n“건초염이네요. 한 달은 쉬세요. 진짜로요.”`,
    choices: [
      { label: '의사 말대로 쉰다', run: (c) => { c.skill(c.p.mainInst!, -2); c.stat('health', 4); c.stat('stress', 3); return '악기를 케이스에 넣고 한 달. 대신 머릿속으로 곡을 썼다.'; } },
      { label: '테이핑하고 공연은 강행한다', run: (c) => { c.stat('health', -6); c.skill(c.p.mainInst!, -4); c.skill('stage', 1); c.stat('stress', 5); return '무대에선 버텼다. 그 뒤 석 달 동안 젓가락질이 힘들었다.'; } },
      { label: '자세 교정 레슨을 받는다', run: (c) => { c.money(-c.krw(300_000), '레슨비'); c.stat('health', 3); c.skill(c.p.mainInst!, 1); return '십 년 넘게 잘못 쥐고 있었다. 힘을 빼니 소리가 오히려 커졌다.'; } },
    ],
  },
  {
    id: 'car_vocal_nodule', scene: 'hospital', title: '목소리가 갈라진다', cooldown: 12, chance: 0.12,
    when: (c) => free(c) && c.age >= 18 && (c.band?.playerInst === 'vocal' || c.p.mainInst === 'vocal' || c.p.skills.vocal >= 50),
    text: () => `고음에서 소리가 두 갈래로 갈라졌다.\n이비인후과 내시경 화면에 작은 혹 두 개.\n“성대 결절 초기예요. 말도 줄이셔야 합니다.”`,
    choices: [
      { label: '침묵 요법 — 한 달 필담으로 산다', run: (c) => { c.stat('health', 5); c.skill('vocal', -1); c.stat('happiness', -3); return '화이트보드에 “ㅇㅇ”, “ㄴㄴ”, “밥?”만 쓰며 한 달을 버텼다. 목소리는 돌아왔다.'; } },
      { label: '음성 치료를 받는다', run: (c) => { c.money(-c.krw(500_000), '치료비'); c.stat('health', 3); c.skill('vocal', 2); return '목이 아니라 몸 전체로 소리 내는 법을 처음부터 다시 배웠다.'; } },
      { label: '공연은 키를 낮춰서 한다', run: (c) => { c.skill('vocal', -3); c.stat('health', -3); c.skill('stage', 1); return '반음 내린 후렴. 아는 팬들은 알아챘고, 아무도 뭐라 하지 않았다.'; } },
    ],
  },
  {
    id: 'car_tinnitus', scene: 'hospital', title: '삐— 소리', cooldown: 14,
    chance: (c) => (c.p.mainInst === 'drums' || genreIs(c, 'metal') ? 0.15 : 0.05),
    when: (c) => free(c) && c.age >= 20 && gigs(c) >= 5,
    text: () => `공연 다음 날 아침, 조용한 방 안에서 계속 삐— 소리가 난다.\n이틀이 지나도 사라지지 않는다.\n청력 검사표의 고음역 그래프가 살짝 꺼져 있다.`,
    choices: [
      { label: '음악가용 귀마개를 맞춘다', run: (c) => { c.money(-c.krw(250_000), '맞춤 귀마개'); c.stat('health', 5); c.set('earplugs'); return '처음엔 답답했다. 일주일 뒤엔 모니터 소리가 더 선명하게 들렸다.'; } },
      { label: '합주 볼륨을 다 같이 낮추자고 한다', if: (c) => c.members.length > 0, run: (c) => { c.stat('health', 3); chem(c, 2); return '“우리 그동안 너무 시끄러웠네.” 드러머가 제일 먼저 웃었다.'; } },
      { label: '대수롭지 않게 넘긴다', run: (c) => { c.stat('health', -6); c.stat('stress', 4); return '소리는 조금 작아졌지만 완전히 사라지진 않았다. 조용한 밤마다 생각난다.'; } },
    ],
  },
  {
    id: 'car_back_pain', scene: 'hospital', title: '허리', cooldown: 10, chance: 0.14,
    when: (c) => free(c) && c.age >= 40 && !!c.band,
    text: () => `1톤 트럭에서 베이스 앰프를 내리다 허리에서 뚝 소리가 났다.\n“디스크가 살짝 나왔네요. 무거운 거 들지 마세요.”\n밴드에서 무거운 거 안 드는 사람은 없다.`,
    choices: [
      { label: '재활 운동을 꾸준히 한다', run: (c) => { c.p.habits.exercise = Math.min(3, c.p.habits.exercise + 1); c.stat('health', 5); c.stat('energy', -4); return '매일 아침 플랭크 1분. 일흔에도 무대에 서려면 지금부터다.'; } },
      { label: '짐 나르는 스태프를 쓴다', run: (c) => { c.money(-c.krw(400_000), '인건비'); c.stat('health', 3); return '처음으로 빈손으로 공연장에 들어갔다. 어색하고 고마웠다.'; } },
      { label: '파스 붙이고 버틴다', run: (c) => { c.stat('health', -6); c.stat('stress', 4); return '파스 냄새가 백스테이지에 진동했다. 후배들이 웃다가, 조용히 앰프를 대신 들어 줬다.'; } },
    ],
  },
  {
    id: 'car_collapse', scene: 'hospital', title: '쓰러지다', cooldown: 10, chance: 0.25,
    when: (c) => free(c) && c.age >= 18 && (c.p.stats.stress >= 70 || c.p.stats.energy <= 20),
    text: () => `알바, 합주, 녹음, 또 알바.\n공연장 계단을 오르다가 눈앞이 하얘졌다.\n눈을 떠 보니 응급실 천장. 수액이 한 방울씩 떨어지고 있다.`,
    choices: [
      { label: '일정을 전부 비우고 쉰다', run: (c) => { c.stat('energy', 12); c.stat('stress', -10); c.stat('health', 3); c.fans(-(c.p.fans * 0.02)); return '공연 두 개를 취소했다. 사과문 아래 달린 첫 댓글은 “푹 쉬고 오세요”였다.'; } },
      { label: '퇴원하자마자 공연장으로 간다', run: (c) => { c.stat('health', -8); c.skill('stage', 2); c.rep(1); return '링거 자국을 소매로 가리고 무대에 섰다. 박수는 컸고, 무서웠다.'; } },
      { label: '부모님께 연락한다', run: (c) => { c.stat('happiness', 4); c.stat('stress', -6); c.theme('family'); return '엄마는 아무 말 없이 반찬통을 여섯 개 들고 왔다.'; } },
    ],
  },
  {
    id: 'car_tour_food', scene: 'street', title: '투어 밥', cooldown: 6, chance: 0.15,
    when: (c) => inBand(c) && (c.band?.gigs ?? 0) >= 4 && c.age >= 19,
    text: () => `지방 투어 둘째 날. 리허설과 본공연 사이 딱 한 시간.\n공연장 근처 선택지는 셋: 30년 된 국밥집, 편의점, 그리고 기획자가 추천한 맛집(차로 20분).`,
    choices: [
      { label: '국밥집에서 다 같이 한 그릇', run: (c) => { c.money(-c.krw(40_000), '밥값'); c.stat('energy', 6); chem(c, 3); return '사장님이 “밴드여? 많이 먹어” 하며 공깃밥을 하나 더 줬다.'; } },
      { label: '편의점 삼각김밥으로 때운다', run: (c) => { c.stat('health', -2); c.stat('energy', -3); return '투어 사흘째, 편의점 신상 리뷰는 전문가 수준이 됐다.'; } },
      { label: '무리해서 맛집까지 간다', run: (c) => { c.money(-c.krw(80_000), '밥값'); c.stat('happiness', 6); c.stat('stress', 3); c.theme('city'); return '리허설에 7분 늦었다. 그래도 그 집 칼국수 이야기는 10년 뒤에도 한다.'; } },
    ],
  },

  // ───────────────────────── 중년 이후의 음악 ─────────────────────────
  {
    id: 'car_tribute_cover', scene: 'club', title: '후배들의 헌정', cooldown: 10, chance: 0.15,
    when: (c) => !c.p.retired && c.age >= 38 && released(c).length >= 3 && c.p.fans >= 1000,
    text: (c) => {
      const s = released(c).reduce((a, b) => (b.streams > a.streams ? b : a));
      return `스무 살 남짓한 밴드가 우리 곡 〈${s.title}〉의 커버 영상을 올렸다.\n설명란: “저희가 밴드를 시작하게 만든 노래.”\n템포는 두 배 빠르고, 기타는 훨씬 시끄럽다. 그런데 좋다.`;
    },
    choices: [
      { label: '그들의 공연을 몰래 보러 간다', run: (c) => { c.stat('happiness', 10); c.theme('age'); c.meet('x', { metAt: '헌정 커버를 한 후배 밴드', career: 'musician', birthYear: c.p.birthYear + 20, affinity: 30, skill: c.rng.int(35, 60) }); c.rel('x', 10, '헌정 커버 공연'); return '맨 뒷줄에 서 있었는데 결국 들켰다. 후배들이 무대에서 고개를 숙였다. 눈가가 뜨거웠다.'; } },
      { label: '합동 공연을 제안한다', run: (c) => { fanBump(c, 0.06, 150); c.rep(3); c.skill('stage', 2); c.chron('후배 밴드와 헌정 합동 공연을 했다', 'music'); return '같은 곡을 두 버전으로, 그리고 마지막엔 다 같이. 나이 차이가 하나도 안 느껴졌다.'; } },
      { label: '댓글 하나만 남긴다', run: (c) => { c.stat('happiness', 6); return '“우리보다 잘하네.” 그 댓글이 고정됐다.'; } },
    ],
  },
  {
    id: 'car_senior_advice', scene: 'pub', title: '선배의 술잔', cooldown: 12, chance: 0.12,
    when: (c) => free(c) && c.age >= 25 && c.age < 55 && gigs(c) >= 3,
    bind: (c) => {
      c.meet('sr', { metAt: '은퇴한 1세대 밴드 선배', career: 'cafe', role: 'mentor', birthYear: c.p.birthYear - c.rng.int(18, 28), affinity: 20, skill: c.rng.int(55, 80) });
      return true;
    },
    text: (c) => `홍대 뒷골목 작은 바. 사장님이 알고 보니 왕년의 밴드 기타리스트란다.\n${c.nj('sr', '이/가')} 잔을 채우며 물었다.\n“너는 왜 아직 하냐, 이거.”`,
    choices: [
      { label: '“아직 좋은 곡을 못 썼거든요.”', run: (c) => { c.rel('sr', 10, '왜 하냐고 물은 밤'); c.skill('compose', 3); c.theme('age'); return '“그럼 평생 하겠네.” 선배는 웃으며 자기 옛 데모 테이프를 하나 건넸다.'; } },
      { label: '“솔직히 그만둘까 고민 중이에요.”', run: (c) => { c.rel('sr', 8, '그만둘까 털어놓은 밤'); c.stat('stress', -8); return '“그만둬도 돼. 근데 그만둬도 음악은 안 떠나더라.” 가게 벽에 걸린 기타가 그 증거였다.'; } },
      { label: '선배의 옛 공연 이야기를 듣는다', run: (c) => { c.rel('sr', 6, '옛날 클럽 이야기'); c.skill('stage', 2); c.genre(c.npc('sr').genre, 4); return '공중전화로 공연 섭외하던 시절 이야기. 장비는 달라도 고민은 똑같았다.'; } },
    ],
  },
  {
    id: 'car_club_reopen', scene: 'stage_old', title: '재개관 기념 공연', once: true, chance: 0.2,
    when: (c) => !c.p.retired && c.age >= 45 && gigs(c) >= 10,
    text: () => `오래전 문을 닫았던 그 클럽이 다시 문을 연다.\n새 사장은 그 시절 맨 앞줄에 서던 관객이었다고 한다.\n“재개관 첫날, 꼭 서 주셨으면 해요.”`,
    choices: [
      {
        label: '그 시절 셋리스트 그대로',
        run: (c) => {
          const v = VENUES.find((x) => x.id === 'club_group')!;
          playGig(c, v);
          c.scene('stage_old');
          c.theme('age'); c.stat('happiness', 8);
          c.chron('옛 클럽의 재개관 첫 무대에 섰다', 'big');
          return '같은 계단, 같은 냄새. 객석엔 흰머리와 앳된 얼굴이 섞여 있었다. 다 같이 늙어 버린 걸 알았고, 다 같이 웃었다.';
        },
      },
      { label: '신곡으로 간다 — 우리는 아직 현재형', run: (c) => { c.skill('compose', 2); c.rep(3); fanBump(c, 0.03, 60); c.theme('age'); return '“옛날 노래 해 주세요!” 외침에 앙코르로 한 곡. 그 정도면 됐다.'; } },
      { label: '객석에서 조용히 본다', run: (c) => { c.stat('happiness', 5); c.stat('stress', -5); return '무대 위 후배들을 보며 맥주 한 병을 천천히 비웠다. 나쁘지 않은 밤이었다.'; } },
    ],
  },
  {
    id: 'car_vinyl_reissue', scene: 'recording', title: 'LP로 다시', once: true, chance: 0.2,
    when: (c) => !c.p.retired && c.age >= 35 && c.year >= 2016 && c.s.albums.some((a) => a.year <= c.year - 8),
    text: (c) => {
      const a = c.s.albums.find((x) => x.year <= c.year - 8)!;
      return `바이닐 레이블에서 연락이 왔다.\n${a.year}년 앨범 〈${a.title}〉, LP로 재발매하고 싶다고.\n“요즘 젊은 친구들이 그 앨범을 중고로 비싸게 사더라고요.”`;
    },
    choices: [
      { label: '리마스터링까지 직접 챙긴다', run: (c) => { c.money(c.krw(2_000_000), 'LP 선인세'); c.stat('energy', -6); fanBump(c, 0.05, 150); c.rep(3); c.chron('옛 앨범이 LP로 재발매됐다', 'music'); return '턴테이블 위에서 바늘이 내려앉는 순간, 스물 몇 살의 내가 방 안을 가득 채웠다.'; } },
      { label: '원본 그대로, 그 시절 소리로', run: (c) => { c.money(c.krw(1_500_000), 'LP 선인세'); fanBump(c, 0.04, 100); c.theme('youth'); return '서툰 믹싱까지 그대로. “이게 이 앨범의 맛”이라는 리뷰가 달렸다.'; } },
      { label: '부끄러워서 거절한다', run: (c) => { c.stat('happiness', -2); return '다시 듣기엔 너무 어렸다. 그래도 중고 가격이 올랐다는 말엔 조금 웃었다.'; } },
    ],
  },
];
