// 인생의 뼈대가 되는 스토리 사건. priority >= 100 은 조건이 맞으면 반드시 후보가 된다.

import type { EventDef } from '../ctx';
import type { Ctx } from '../ctx';
import type { Genre, Inst } from '../types';
import { GENRES } from '../types';
import { GENRE_INFO, INST_LABEL, REGIONS, VENUES, eraOf, serviceYears } from '../data/world';
import { GENRE_ERAS, genreLabel } from '../data/era/genres';
import { hasMedia } from '../data/era/media';
import type { CountryId } from '../data/countries';
import { actionById, addWalkIn, disband, formBand, playGig } from '../actions';
import { unreleased } from '../songs';
import { josa, won, count, given } from '../korean';
import { clamp } from '../rng';
import { CAREER_LABEL } from '../npc';

const between = (c: Ctx, a: number, b: number) => c.age >= a && c.age < b;
const mom = (c: Ctx) => c.s.npcs[c.s.flags.mom as string];
const dad = (c: Ctx) => c.s.npcs[c.s.flags.dad as string];

const TASTE_TEXT: Record<string, string> = {
  classical: '엄마는 클래식 FM을 하루 종일 켜 두는 사람',
  trot: '아빠는 운전할 때마다 트로트를 크게 트는 사람',
  ballad: '부모님은 노래방 18번이 발라드인 사람들',
  none: '부모님은 음악보다는 뉴스를 듣는 사람들',
  folk: '아빠는 젊을 때 통기타 좀 쳤다는 사람',
  indierock: '엄마는 대학 때 클럽 공연을 쫓아다니던 사람',
  metal: '아빠의 책장에는 아직도 메탈 CD가 꽂혀 있다',
  indiepop: '엄마는 플레이리스트를 만드는 게 취미인 사람',
};

export const STORY: EventDef[] = [
  // ───────── 태교 ─────────
  {
    id: 'taegyo', scene: 'nursery', title: '태교', priority: 200, once: true, chance: 1,
    when: (c) => c.age < 0,
    text: (c) =>
      `${c.year}년. 아직 세상에 나오기 전.\n${TASTE_TEXT[c.p.parentTaste] ?? ''}이다.\n부모님은 뱃속의 나에게 어떤 음악을 들려줬을까?`,
    choices: [
      { label: '엄마의 클래식 CD', run: (c) => { c.set('homeMusic', 'classical'); c.genre('folk', 3); c.theme('family'); return '모차르트가 태아 IQ를 올린다는 말은 근거가 약하다. 하지만 집에 늘 음악이 흐르는 습관은 남았다.'; } },
      { label: '아빠의 낡은 록 앨범', run: (c) => { c.set('homeMusic', 'rock'); c.genre('indierock', 6); c.genre('punk', 3); c.theme('family'); return '“태교에 록이 웬 말이야!” 엄마는 웃었지만, 그 앨범은 거실 CD장 맨 앞자리에 남았다.'; } },
      { label: '라디오에서 흘러나오는 아무 노래', run: (c) => { c.set('homeMusic', 'radio'); c.genre('indiepop', 4); c.genre('folk', 2); return '부엌 라디오는 그 뒤로도 20년 동안 꺼지지 않았다.'; } },
      { label: '조용한 게 최고', run: (c) => { c.set('homeMusic', 'none'); c.stat('stress', -5); return '조용한 집. 하지만 언젠가 이 집을 시끄럽게 만들 사람이 태어난다.'; } },
    ],
  },
  {
    id: 'birth', scene: 'nursery', title: '응애', priority: 200, once: true, chance: 1,
    when: (c) => c.age >= 0 && c.age < 1,
    text: (c) => {
      const r = REGIONS.find((x) => x.id === c.p.region)!;
      const inc = { low: '넉넉하진 않지만 웃음은 많은', mid: '평범하고 바쁜', high: '여유 있는' }[c.p.income];
      return `${c.year}년, ${r.label}의 ${inc} 집에서 ${josa(c.p.name, '이/가')} 태어났다.\n엄마 ${given(mom(c).name)}, 아빠 ${given(dad(c).name)}.\n${r.desc}.${c.p.instrumentAtHome ? '\n거실 구석에는 아무도 안 치는 악기가 하나 있다.' : ''}`;
    },
    choices: [
      { label: '세상을 향해 첫 울음을 터뜨린다', run: (c) => { c.chron(`${c.p.name}, 세상에 태어나다`, 'big'); c.skill('vocal', 2); return '폐활량 하나는 타고났다고, 간호사가 웃었다.'; } },
    ],
  },
  {
    id: 'toy', scene: 'home', title: '첫 번째 소리', priority: 190, once: true, chance: 1,
    when: (c) => between(c, 2.5, 5),
    bind: (c) => {
      c.meet('cf', { metAt: '어린이집', birthYear: c.p.birthYear, affinity: 35, skill: c.rng.int(5, 20) });
      c.set('childFriend', c.bind.cf);
      return true;
    },
    text: (c) => `세 살. 어린이집에서 단짝 ${c.nj('cf', '이/가')} 생겼다.\n둘이서 제일 좋아하는 놀이는…`,
    choices: [
      { label: '장난감 실로폰 두드리기', run: (c) => { c.skill('keys', 4); c.rel('cf', 5, '실로폰 합주'); } },
      { label: '냄비 뚜껑으로 드럼 치기', run: (c) => { c.skill('drums', 4); c.rel('cf', 5, '냄비 드럼'); c.stat('happiness', 4); return '엄마의 한숨과 함께 첫 비트가 탄생했다.'; } },
      { label: '만화 주제가 따라 부르기', run: (c) => { c.skill('vocal', 4); c.rel('cf', 5, '주제가 떼창'); } },
      { label: '거실 악기 줄 튕기기', if: (c) => c.p.instrumentAtHome, run: (c) => { c.skill('guitar', 5); c.set('touchedHomeInst'); c.rel('cf', 3); return '띵— 그 소리가 이상하게 오래 귀에 남았다.'; } },
    ],
  },
  {
    id: 'recital', scene: 'classroom', title: '유치원 학예회', priority: 190, once: true, chance: 1,
    when: (c) => between(c, 5, 7),
    bind: (c) => {
      const id = c.flag('childFriend') as string;
      if (id && c.s.npcs[id]) c.bind.cf = id;
      return !!c.bind.cf;
    },
    text: (c) => `다섯 살, 첫 무대. 엄마 아빠가 맨 앞줄에서 휴대폰을 들고 있다.\n옆에는 ${c.nj('cf', '이/가')} 긴장한 얼굴로 서 있다.`,
    choices: [
      {
        label: '맨 앞에서 큰 소리로 노래한다',
        run: (c) => {
          c.skill('stage', 5);
          if (c.roll(0.7)) { c.stat('happiness', 8); c.rel('cf', 4, '학예회 무대'); return '박수 소리. 처음 느껴 본 이상한 짜릿함.'; }
          c.stat('stress', 5); return '가사를 까먹고 울어 버렸다. 그래도 끝까지 서 있었다.';
        },
      },
      { label: '탬버린 담당', run: (c) => { c.skill('drums', 2); c.skill('stage', 2); c.rel('cf', 3, '탬버린 박자'); } },
      { label: `친구 손을 꼭 잡는다`, run: (c) => { c.rel('cf', 10, '무대에서 손잡은 날'); return `“우리 나중에 진짜 가수 하자.” ${c.nj('cf', '이/가')} 속삭였다.`; } },
    ],
  },
  {
    id: 'school_start', scene: 'classroom', title: '초등학교 입학', priority: 180, once: true, chance: 1,
    when: (c) => between(c, 7, 9),
    bind: (c) => { c.meet('pal', { metAt: '초등학교 짝꿍', birthYear: c.p.birthYear, affinity: 15, skill: c.rng.int(5, 25) }); return true; },
    text: (c) => `${c.year}년 3월. 커다란 가방을 메고 교문을 지났다.\n짝꿍은 ${c.n('pal')}. 필통에 아이돌 스티커가 붙어 있다.`,
    choices: [
      { label: '먼저 말을 건다', run: (c) => { c.rel('pal', 15, '먼저 말 건 날'); c.stat('happiness', 4); } },
      { label: '지우개를 반으로 잘라 준다', run: (c) => { c.rel('pal', 10, '반쪽 지우개'); c.stat('happiness', 2); } },
      { label: '창밖만 본다', run: (c) => { c.stat('stress', 2); c.genre('shoegaze', 3); return '창밖 운동장의 소리가 묘하게 음악 같았다.'; } },
    ],
  },
  {
    id: 'first_inst', scene: 'musicroom', title: '첫 악기', priority: 170, once: true, chance: 0.7,
    when: (c) => between(c, 9, 13) && !c.p.mainInst,
    text: (c) => `${c.ageInt}살. 방과후 수업 신청서가 나왔다.\n${c.p.instrumentAtHome ? '집에 있는 그 악기가 자꾸 눈에 밟힌다.' : '용돈을 모으면 뭔가 하나 배울 수 있을 것 같다.'}`,
    choices: [
      { label: '통기타반', run: (c) => { c.setInst('guitar'); c.skill('guitar', 8); c.genre('folk', 5); c.chron('처음으로 기타 코드를 잡았다 — G, C, D', 'music'); } },
      { label: '피아노 학원', hint: (c) => (c.p.income === 'low' ? '학원비 부담' : undefined), run: (c) => { c.setInst('keys'); c.skill('keys', 9); if (c.p.income === 'low') c.money(-c.krw(300000), '학원비'); c.chron('피아노 학원 첫날, 바이엘 상권', 'music'); } },
      { label: '학교 합창단', run: (c) => { c.setInst('vocal'); c.skill('vocal', 8); c.skill('stage', 3); c.chron('합창단 맨 뒷줄에서 노래를 시작했다', 'music'); } },
      { label: '드럼 교실', run: (c) => { c.setInst('drums'); c.skill('drums', 8); c.stat('stress', -4); c.chron('처음 스틱을 쥐었다', 'music'); } },
      { label: '아무것도 안 할래', run: (c) => { c.stat('happiness', 3); return '아직은 노는 게 더 좋다. 음악은… 나중에.'; } },
    ],
  },
  {
    id: 'middle_school', scene: 'classroom', title: '이어폰 한쪽', priority: 170, once: true, chance: 1,
    when: (c) => between(c, 13, 14.5),
    bind: (c) => {
      const mine = c.p.mainInst ?? 'guitar';
      const options: Inst[] = (['drums', 'bass', 'guitar', 'vocal'] as Inst[]).filter((i) => i !== mine);
      c.meet('mf', { metAt: '중학교 같은 반', birthYear: c.p.birthYear, inst: c.pick(options), skill: c.rng.int(20, 40), affinity: 20 });
      c.set('musicFriend', c.bind.mf);
      return true;
    },
    text: (c) => {
      const n = c.npc('mf');
      return `중학교 1학년. 뒷자리 ${c.nj('mf', '이/가')} 이어폰 한쪽을 건넸다.\n“이거 들어 봐. ${GENRE_INFO[n.genre].label}인데 진짜 좋아.”\n${c.nj('mf', '은/는')} ${josa(INST_LABEL[n.inst], '을/를')} 친다고 했다.`;
    },
    choices: [
      { label: '“와… 이거 누구야?”', run: (c) => { const g = c.npc('mf').genre; c.genre(g, 12); c.rel('mf', 15, '이어폰 한쪽'); c.theme('youth'); c.chron(`${c.n('mf')}의 이어폰 한쪽에서 ${GENRE_INFO[g].label}을 처음 들었다`, 'people', 'mf'); } },
      { label: '“나도 악기 하는데.”', if: (c) => !!c.p.mainInst, run: (c) => { c.rel('mf', 20, '같이 악기 이야기한 날'); c.theme('youth'); return '그날 이후, 쉬는 시간마다 음악 이야기만 했다.'; } },
      { label: '시큰둥하게 돌려준다', run: (c) => { c.rel('mf', -5); return '그 노래가 며칠 동안 머릿속을 맴돌았다. 괜히 돌려줬나.'; } },
    ],
  },
  {
    id: 'first_live', scene: 'club', title: '인생을 바꾼 무대', priority: 160, once: true, chance: 0.8,
    when: (c) => between(c, 14, 16),
    text: (c) => {
      const ct = (c.p.country ?? 'KR') as CountryId;
      const how = hasMedia('youtube', c.year, ct) ? '우연히 본 한 밴드의 라이브 영상' : hasMedia('tv', c.year, ct) && c.rng.chance(0.5) ? '우연히 TV에서 본 한 밴드의 공연 실황' : '라디오에서 우연히 들은 한 밴드의 노래';
      return `${c.year}년. ${how}.\n심장이 앰프처럼 울렸다. 그 장르는…`;
    },
    choices: GENRES.map((g: Genre) => ({
      label: (c: Ctx) => `${genreLabel(g, c.year, c.p.country)} — ${GENRE_ERAS[g].pitch}`,
      run: (c: Ctx) => {
        c.genre(g, 22);
        c.set('firstLove', g);
        c.stat('happiness', 6);
        c.chron(`${GENRE_INFO[g].label}에 빠졌다. 인생의 장르가 정해졌다`, 'music');
        if (!c.p.mainInst) c.setInst(g === 'folk' ? 'guitar' : g === 'indiepop' ? 'vocal' : g === 'metal' ? 'drums' : 'guitar');
        return hasMedia('youtube', c.year, (c.p.country ?? 'KR') as CountryId) ? `그날 밤, 잠들지 못하고 ${GENRE_INFO[g].label} 영상을 새벽까지 돌려 봤다.` : `그날 밤, 잠들지 못하고 그 노래를 머릿속으로 몇 번이고 되감았다.`;
      },
    })),
  },
  {
    id: 'club_audition', scene: 'musicroom', title: '밴드부 오디션', priority: 180, once: true, chance: 1,
    when: (c) => between(c, 16, 17.5) && !c.band,
    bind: (c) => {
      const id = c.flag('musicFriend') as string;
      if (id && c.s.npcs[id]?.alive) c.bind.mf = id;
      else c.meet('mf', { metAt: '고등학교 같은 반', birthYear: c.p.birthYear, inst: 'drums', skill: 35, affinity: 25 });
      const r = REGIONS.find((x) => x.id === c.p.region)!;
      c.vars.hasClub = c.rng.chance({ seoul: 0.75, gyeonggi: 0.65, metro: 0.6, local: 0.45 }[r.id]) ? 1 : 0;
      return true;
    },
    text: (c) =>
      c.vars.hasClub
        ? `고등학교 2학년. 밴드부에 ${josa(c.p.mainInst ? INST_LABEL[c.p.mainInst] : '새 멤버', '이/가')} 필요하다!\n${c.nj('mf', '이/가')} 오디션에 같이 가자고 한다.\n그런데 다음 주에는 중간고사가 있다.`
        : `우리 학교엔 밴드부가 없다.\n${c.nj('mf', '이/가')} 말했다. “그럼 우리가 만들면 되잖아. 구민회관 합주실 싸대.”\n그런데 다음 주에는 중간고사가 있다.`,
    choices: [
      {
        label: (c) => (c.vars.hasClub ? `${c.nj('mf', '과/와')} 함께 오디션 보기` : `${c.nj('mf', '과/와')} 교외 밴드 만들기`),
        odds: (c) => (c.vars.hasClub ? auditionOdds(c) : c.dc(5, '결심 판정', [['친구와의 우정', c.npc('mf').affinity >= 30 ? 2 : 0]], '가정', '교외 밴드는 만들기만 하면 된다')),
        run: (c) => {
          c.study(-4);
          if (c.check(c.choicesOdds!)) {
            const band = formBand(c, c.vars.hasClub ? `${c.pick(['한빛', '새솔', '푸른', '동명', '세화'])}고 밴드부` : `${c.pick(['방과후', '구민회관', '지하'])} ${c.pick(['소년단', '클럽', '밴드'])}`);
            if (!band.memberIds.includes(c.bind.mf)) {
              band.memberIds.push(c.bind.mf);
              const m = c.npc('mf');
              m.inBand = true;
              m.role = 'member';
            }
            addWalkIn(c);
            c.set('teenBand');
            c.rel('mf', 10, '밴드부 합격한 날');
            c.theme('band');
            c.chron(`${c.nj('mf', '과/와')} 함께 첫 밴드를 시작했다`, 'band', 'mf');
            return '첫 합주. 소리가 엉망인데 이상하게 웃음이 멈추지 않았다.';
          }
          c.rel('mf', 6);
          c.stat('happiness', -6);
          return `떨어졌다. ${c.nj('mf', '은/는')} 붙었다. 축하한다고 말하는 목소리가 조금 떨렸다.`;
        },
      },
      { label: '시험이 끝난 뒤 지원하기', run: (c) => { c.study(8); c.set('lateApply'); c.rel('mf', -4); return '시험은 잘 봤다. 하지만 밴드부 자리는 이미 찼다. 다음 기회를 노리자.'; } },
      { label: '혼자 음악을 만들어 보기', run: (c) => { c.skill('compose', 8); c.set('soloPath'); c.theme('night'); return '방문을 닫고 녹음 앱을 켰다. 첫 데모는 형편없었지만, 전부 내 것이었다.'; } },
    ],
  },
  {
    id: 'school_festival', scene: 'festival', title: '학교 축제', priority: 150, once: true, chance: 1,
    when: (c) => between(c, 16.5, 19) && !!c.flag('teenBand') && !!c.band,
    text: (c) => `축제 무대. 강당 가득 전교생.\n${c.band!.name}의 첫 공연. 셋리스트 마지막 곡을 정해야 한다.`,
    choices: [
      { label: '모두가 아는 떼창곡 커버', run: (c) => { c.skill('stage', 5); c.fans(c.rng.int(30, 60)); c.stat('happiness', 10); c.theme('youth'); c.chron('학교 축제 무대 — 강당이 떼창으로 울렸다', 'band'); return '강당이 떠나갈 듯한 떼창. 이 기분을 평생 쫓게 될 것 같다.'; } },
      {
        label: '우리가 만든 자작곡',
        hint: (c) => (c.s.songs.length ? undefined : '자작곡이 아직 없다 — 즉석으로 완성해야 한다'),
        odds: (c) => c.dc(c.s.songs.length ? 11 : 14, '작곡 판정', [['작곡 실력', c.m(c.p.skills.compose)], ['무대 경험', c.m(c.p.skills.stage)]]),
        run: (c) => {
          const ok = c.check(c.choicesOdds!, '작곡 판정');
          c.skill('compose', 3);
          c.theme('youth');
          if (ok) { c.fans(c.rng.int(50, 120)); c.rep(2); c.stat('happiness', 12); c.chron('학교 축제에서 첫 자작곡을 불렀다', 'big'); return '모르는 노래인데 다들 두 번째 후렴부터 따라 불렀다.'; }
          c.fans(10); c.stat('stress', 6); return '조용했다. 그래도 몇 명은 끝나고 “그 노래 뭐야?”라고 물었다.';
        },
      },
    ],
  },
  {
    id: 'suneung', scene: 'classroom', title: '고3, 진로', priority: 190, once: true, chance: 1,
    when: (c) => between(c, 18, 19.5) && c.p.edu === 'none',
    text: (c) => `${c.year}년 가을. 수능이 다가온다.\n학업 ${Math.round(c.p.study)} · 주 악기 실력 ${Math.round(c.mainSkill)}\n엄마는 “그래도 대학은…”이라고 말끝을 흐렸다.`,
    choices: [
      {
        label: '실용음악과 입시',
        hint: (c) => `입시 학원비 ${won(c.krw(3_000_000))}`,
        odds: (c) => c.dc(19, '실기 판정', [['주 악기 실력', c.m(c.mainSkill)], ['작곡 실력', Math.floor(c.m(c.p.skills.compose) / 2)], ['입시 레슨', c.p.income === 'high' ? 2 : c.p.income === 'low' ? -1 : 0]], '근사', '실용음악과 실기 경쟁률은 수십 대 1 — 20명 중 1~2명이 붙는 셈이라 난이도 19'),
        run: (c) => {
          c.money(-c.krw(3_000_000), '입시 학원비');
          if (c.check(c.choicesOdds!, '실용음악과 합격')) {
            c.p.edu = 'music_univ';
            c.skill(c.p.mainInst ?? 'guitar', 6);
            c.skill('compose', 5);
            c.rep(3);
            c.meet('uni', { metAt: '실용음악과 동기', birthYear: c.p.birthYear, skill: c.rng.int(45, 70), career: 'student', affinity: 25 });
            c.chron('실용음악과 합격 — 경쟁률이 수십 대 1이었다', 'big');
            return '합격 문자를 다섯 번 다시 읽었다.';
          }
          c.p.edu = 'grad_high';
          c.stat('happiness', -10);
          c.set('failedMusicExam');
          c.theme('rage');
          return '불합격. 재수할까, 아니면 무대에서 증명할까.';
        },
      },
      {
        label: '일반 대학 진학 (밴드 동아리!)',
        odds: (c) => c.dc(11, '학업 판정', [['학업', c.m(c.p.study)], ['밴드부에 쏟은 시간', c.flag('teenBand') ? -1 : 0]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!, '대학 합격')) {
            c.p.edu = 'univ';
            c.meet('uni', { metAt: '대학 밴드 동아리', birthYear: c.p.birthYear + c.rng.int(-1, 1), skill: c.rng.int(25, 55), affinity: 25 });
            c.chron('대학 입학. 밴드 동아리방 문을 두드렸다', 'life');
            return '동아리방의 낡은 앰프 냄새가 반가웠다.';
          }
          c.p.edu = 'grad_high';
          c.stat('happiness', -6);
          return '원하던 곳은 아니었다. 대신 시간이 생겼다.';
        },
      },
      { label: '바로 음악 활동 (알바하며)', run: (c) => { c.p.edu = 'grad_high'; c.skill(c.p.mainInst ?? 'guitar', 4); c.set('dropoutDream'); c.theme('dream'); c.stat('stress', 4); return '“1년만 해 보고 안 되면 그만둘게.” 그 1년이 몇 년이 될지는 아무도 몰랐다.'; } },
      { label: '취업 준비', run: (c) => { c.p.edu = 'grad_high'; c.p.job = 'part'; c.study(4); c.money(c.krw(1_000_000)); return '현실적인 선택. 기타는 침대 밑으로 들어갔다… 일단은.'; } },
    ],
  },
  {
    id: 'teen_band_end', scene: 'rooftop', title: '졸업, 그리고 밴드', priority: 170, once: true, chance: 1,
    when: (c) => between(c, 19, 21) && !!c.flag('teenBand') && !!c.band,
    text: (c) => `졸업식 날 옥상. ${c.band!.name} 멤버들이 모였다.\n“우리 이제 어떡할까?”`,
    choices: [
      {
        label: '진짜 밴드로 가자. 이름부터 새로!',
        run: (c) => {
          const old = c.band!.name;
          c.band!.name = c.band!.name.includes('밴드부') || c.band!.name.includes('소년단') ? `${c.pick(['새벽', '보라', '여름', '네온', '옥상'])} ${c.pick(['고양이', '라디오', '정류장', '극장', '세탁소'])}` : c.band!.name;
          c.band!.chemistry = clamp(c.band!.chemistry + 10);
          c.theme('friend');
          c.chron(`${old} → 〈${c.band!.name}〉, 졸업 후에도 계속하기로 했다`, 'band');
          return '옥상에서 정한 이름. 멋있는지는 모르겠지만, 우리 거다.';
        },
      },
      { label: '각자의 길로. 언젠가 다시 만나자', run: (c) => { disband(c, '졸업'); c.theme('friend'); return '“꼭 다시 하자.” 그 약속을 다들 기억할까.'; } },
    ],
  },
  {
    id: 'move_out', scene: 'rooftop', title: '독립', priority: 120, once: true, chance: 0.35,
    when: (c) => between(c, 20, 27) && !c.flag('independent') && c.p.military !== 'serving',
    text: (c) =>
      c.p.region === 'seoul'
        ? '부모님 집에서 나와 혼자 살아 볼까? 서울 원룸 월세는 만만치 않다.'
        : `${REGIONS.find((r) => r.id === c.p.region)!.label}에서 서울로 올라갈까?\n홍대 앞 라이브 클럽들이 손짓한다. 하지만 월세가…`,
    choices: [
      { label: (c) => (c.p.region === 'seoul' ? '반지하 원룸으로 독립' : '상경한다'), run: (c) => { c.set('independent'); c.money(-c.krw(5_000_000), '보증금'); c.stat('happiness', 6); c.stat('stress', 6); c.theme('city'); c.rep(2); c.chron(c.p.region === 'seoul' ? '반지하 원룸으로 독립' : '서울로 올라왔다. 막차 끊긴 홍대의 새벽', 'life'); return '첫날 밤, 벽 너머 옆집 TV 소리를 들으며 가사를 썼다.'; } },
      { label: '아직은 부모님 집에서', run: (c) => { c.stat('stress', -3); c.money(c.krw(300_000), '엄마가 몰래 준 용돈'); return '엄마 밥이 최고다. 대신 연습은 이어폰 끼고 조용히.'; } },
    ],
  },
  // ───────── 병역 ─────────
  {
    id: 'draft', scene: 'military', title: '입영통지서', priority: 190, once: true, chance: (c) => (c.age >= 21.5 ? 1 : 0.5),
    when: (c) => c.isMale && c.p.military === 'pending' && between(c, 20, 29),
    text: (c) => `${c.year}년. 우편함에 병무청 봉투가 꽂혀 있었다.\n${c.band ? `〈${c.band.name}〉${josa(c.band.name, '은/는').slice(c.band.name.length)} 어떡하지?` : `입대하면 ${Math.round(serviceYears(c.year) * 12)}개월. 음악은 잠시 멈춘다.`}`,
    choices: [
      { label: (c) => `바로 입대한다 (육군 ${Math.round(serviceYears(c.year) * 12)}개월)`, run: (c) => enlist(c, false) },
      {
        label: '군악대에 지원한다',
        hint: () => '떨어지면 일반 입대',
        if: (c) => c.mainSkill >= 35,
        odds: (c) => c.dc(17, '실기 판정', [['주 악기 실력', c.m(c.mainSkill)], ['타악·건반 수요', c.p.mainInst === 'drums' ? 2 : c.p.mainInst === 'keys' ? 1 : 0]], '가정', '군악대는 선발 인원이 적어 경쟁이 치열하다'),
        run: (c) => enlist(c, c.check(c.choicesOdds!, '군악대 선발')),
      },
      {
        label: '입영을 연기한다 (재학생)',
        if: (c) => (c.p.edu === 'univ' || c.p.edu === 'music_univ') && c.age < 24 && !c.flag('postponed'),
        run: (c) => { c.set('postponed'); c.s.fired['draft'] = -999; delete c.s.fired['draft']; return '2년 뒤에 다시 고민하자. 일단은 지금의 무대에 집중.'; },
      },
    ],
  },
  {
    id: 'discharge', scene: 'military', title: '전역', priority: 190, queued: true,
    when: () => true,
    text: (c) => `${c.year}년. 위병소를 나서며 하늘을 봤다.\n“충성!” 마지막 경례. 손가락이 기타 줄을 그리워한다.`,
    choices: [
      { label: '바로 합주실로 달려간다', run: (c) => { c.stat('happiness', 12); c.theme('military'); c.chron(`전역. ${Math.round(serviceYears(c.year - 2) * 12)}개월 만의 합주`, 'life'); if (c.band) c.band.chemistry = clamp(c.band.chemistry + 6); return '손이 굳었다. 그래도 첫 코드에서 다들 웃었다.'; } },
      { label: '일단 집에서 쉰다', run: (c) => { c.stat('stress', -15); c.stat('health', 2); c.theme('military'); c.chron('전역', 'life'); } },
    ],
  },
  // ───────── 다시 만난 친구 (재등장의 핵심) ─────────
  {
    id: 'old_friend_call', scene: 'pub', title: '오랜만이다', priority: 140, cooldown: 6, chance: 0.5,
    when: (c) => between(c, 19, 33) && !c.band && !!c.p.mainInst && c.p.military !== 'serving' && !c.flag('quitMusic'),
    bind: (c) => c.bindFrom('f', (n) => n.affinity >= 10 && n.metAge < 19 && !n.inBand && (n.career === 'student' || n.career === 'musician' || n.skill > 35)),
    text: (c) => {
      const n = c.npc('f');
      const ago = c.ageInt - n.metAge;
      return `휴대폰에 낯익은 이름: ${n.name}.\n${n.metAge}살 때 ${n.metAt}에서 만난 친구. ${ago}년이 흘렀다.\n“야, 나 아직 ${INST_LABEL[n.inst]} 친다. 우리… 밴드 할래?”`;
    },
    choices: [
      {
        label: '“하자. 당장.”',
        run: (c) => {
          const n = c.npc('f');
          formBand(c);
          if (!c.band!.memberIds.includes(n.id)) {
            c.band!.memberIds.push(n.id);
            n.inBand = true;
            n.role = 'member';
            n.career = 'musician';
          }
          c.rel('f', 15, '다시 밴드를 시작한 날');
          c.theme('friend');
          c.chron(`${n.metAge}살 때 만난 ${given(n.name)}, 밴드 멤버가 되다`, 'big', 'f');
          return '오래 돌아온 길이 여기로 이어져 있었다.';
        },
      },
      { label: '술 한잔만 하자', run: (c) => { c.rel('f', 8, '오랜만에 술 한잔'); c.stat('happiness', 5); c.theme('friend'); return '밴드 얘기는 다음에. 그래도 옛날 얘기로 새벽 세 시까지.'; } },
    ],
  },
  // ───────── 서른의 기로 ─────────
  {
    id: 'crossroads30', scene: 'rooftop', title: '서른', priority: 150, once: true, chance: 1,
    when: (c) => between(c, 29, 32) && !c.flag('quitMusic') && c.p.job !== 'office',
    text: (c) =>
      c.p.fans < 3000
        ? `서른. 통장 잔고 ${won(c.p.money)}, 팬 ${count(c.p.fans)}명.\n친구들은 승진하고, 결혼하고, 집을 알아본다.\n엄마가 전화로 물었다. “너 요즘 뭐 먹고 사니?”`
        : `서른. 팬 ${count(c.p.fans)}명. 음악으로 먹고 살 수 있을지도 모른다.\n그런데 이 속도로, 언제까지?`,
    choices: [
      { label: '음악에 인생을 건다', run: (c) => { c.set('allIn'); c.stat('stress', 6); c.theme('dream'); c.chron('서른, 음악에 인생을 걸기로 했다', 'big'); return '“10년 뒤의 내가 후회하지 않게.”'; } },
      { label: '취업하고 주말 밴드로', run: (c) => { c.p.job = 'office'; c.set('weekendBand'); if (c.band) c.band.chemistry = clamp(c.band.chemistry - 8); c.stat('stress', -4); c.theme('city'); c.chron('취업. 주말엔 여전히 합주실', 'life'); return '사원증과 피크를 같은 지갑에 넣었다.'; } },
      { label: '음악을 그만둔다', run: (c) => { c.set('quitMusic'); if (c.band) disband(c, '현실'); c.p.job = 'office'; c.theme('loss'); c.chron('음악을 그만두었다. 기타는 케이스 속으로', 'big'); return '마지막으로 기타 줄을 풀었다. 그런데 왜 케이스는 버리지 못할까.'; } },
    ],
  },
  // ───────── 레이블 ─────────
  {
    id: 'label_indie', scene: 'office', title: '레이블에서 온 메일', priority: 130, cooldown: 6, chance: 0.6,
    when: (c) => !!c.band && c.band.label === 'none' && c.p.fans >= 2500 && c.p.rep >= 18,
    text: (c) => `“${c.band!.name} 공연 잘 봤습니다. 저희랑 함께하시겠어요?”\n소규모 인디 레이블. 녹음비와 유통, 공연 섭외를 맡아 준다고 한다.\n계약금 ${won(c.krw(10_000_000))}. 수익 배분은 5:5.`,
    choices: [
      { label: '계약한다', run: (c) => { c.band!.label = 'indie'; c.money(c.krw(10_000_000) / (c.members.length + 1), '계약금'); c.rep(6); c.chron(`인디 레이블과 계약`, 'band'); return '녹음비 걱정 없는 첫 앨범. 사인하는 손이 떨렸다.'; } },
      { label: '자유가 더 중요하다', run: (c) => { c.rep(1); c.set('diy'); return 'DIY 정신. 우리가 직접 한다.'; } },
    ],
  },
  {
    id: 'label_major', scene: 'office', title: '대형 기획사의 제안', priority: 135, cooldown: 8, chance: 0.55,
    when: (c) => !!c.band && c.band.label !== 'major' && c.p.fans >= 40000,
    text: (c) => `유리 건물 회의실. 대형 기획사 이사가 서류를 내밀었다.\n“계약금 ${won(c.krw(200_000_000))}. 단, 타이틀곡은 저희 작곡팀과 같이 갑니다.\n그리고 컨셉도 조금… 대중적으로.”`,
    choices: [
      { label: '계약한다 — 더 큰 무대로', run: (c) => { c.band!.label = 'major'; c.money(c.krw(200_000_000) / (c.members.length + 1), '계약금'); c.fans(c.p.fans * 0.3); c.rep(-4); c.band!.chemistry = clamp(c.band!.chemistry - 10); c.chron('대형 기획사와 계약. 사람들은 “변했다”고 했다', 'big'); return '광고판에 우리 얼굴이 걸렸다. 낯설다.'; } },
      { label: '거절한다 — 우리 음악은 우리가', run: (c) => { c.rep(8); c.band!.chemistry = clamp(c.band!.chemistry + 8); c.set('refusedMajor'); c.chron('대형 기획사의 제안을 거절했다', 'band'); return '돌아오는 지하철에서 멤버들이 동시에 웃음을 터뜨렸다.'; } },
    ],
  },
  // ───────── 페스티벌 ─────────
  {
    id: 'fest_local', scene: 'festival', title: '페스티벌 섭외', priority: 110, cooldown: 3, chance: 0.45,
    when: (c) => !!c.band && c.p.fans >= 6000 && c.p.fans < 30000 && c.p.military !== 'serving' && eraOf(c.s.time, c.p.country).gigMul > 0.5,
    text: (c) => `지역 록 페스티벌에서 연락이 왔다.\n낮 2시 서브 스테이지. 출연료는 적지만, 관객은 3천 명.`,
    choices: [
      { label: '간다!', run: (c) => { const v = VENUES.find((x) => x.id === 'local_fest')!; playGig(c, v, true); c.theme('dream'); c.stat('energy', -15); } },
      { label: '이번엔 쉰다', run: (c) => { c.stat('stress', -5); } },
    ],
  },
  {
    id: 'fest_big', scene: 'festival', title: '메인 스테이지', priority: 115, cooldown: 3, chance: 0.5,
    when: (c) => !!c.band && c.p.fans >= 30000 && c.p.military !== 'serving' && eraOf(c.s.time, c.p.country).gigMul > 0.5,
    text: (c) => `대형 페스티벌 메인 스테이지, 해 질 녘 슬롯.\n2만 5천 명. ${c.band!.gigs}번째 공연.`,
    choices: [
      { label: '무대에 오른다', run: (c) => { const v = VENUES.find((x) => x.id === 'big_fest')!; const g = playGig(c, v, true); if (g === 'great') c.chron('대형 페스티벌 메인 스테이지 — 노을 아래 2만 5천 명의 떼창', 'big'); c.stat('energy', -15); } },
      { label: '정중히 거절', run: (c) => { c.rep(-1); } },
    ],
  },
  // ───────── 발매 갈림길 (곡이 쌓이면) ─────────
  {
    id: 'release_ready', scene: 'recording', title: '곡이 쌓였다', priority: 118, cooldown: 2, chance: (c) => (unreleased(c.s).length >= 4 ? 0.9 : 0.5),
    when: (c) => c.age >= 16 && c.p.military !== 'serving' && unreleased(c.s).length >= 2,
    text: (c) => {
      const songs = bestUnreleased(c, 7);
      return `노트북 속 데모 폴더에 ${unreleased(c.s).length}곡이 쌓였다.\n제일 자신 있는 건 〈${songs[0].title}〉(완성도 ${songs[0].quality}).\n${c.band && c.band.label !== 'none' ? '레이블이 녹음비를 대 준다.' : `녹음비는 싱글 ${won(c.krw(1_200_000))}, EP ${won(c.krw(4_000_000))}, 정규 ${won(c.krw(9_000_000))}.`}`;
    },
    choices: [
      { label: (c) => `싱글 〈${bestUnreleased(c, 1)[0].title}〉`, run: (c) => doRelease(c, 1) },
      { label: 'EP로 묶어 낸다', if: (c) => unreleased(c.s).length >= 3, run: (c) => doRelease(c, 5) },
      { label: '정규 앨범을 낸다', if: (c) => unreleased(c.s).length >= 7, run: (c) => doRelease(c, 10) },
      { label: '아직이다. 더 다듬자', run: (c) => { c.skill('compose', 2); return '서랍에 넣어 두었다. 좋은 곡은 기다려 준다.'; } },
    ],
  },
  // ───────── 시대 사건 ─────────
  {
    id: 'pandemic', scene: 'home', title: '멈춰 선 무대', priority: 160, once: true, chance: 1,
    when: (c) => c.year === 2020 && c.age >= 15,
    text: () => '2020년. 감염병 유행으로 공연장이 하나둘 문을 닫았다.\n잡혀 있던 공연이 전부 취소됐다는 문자가 쏟아진다.',
    choices: [
      { label: '온라인 라이브를 연다', run: (c) => { c.fans(c.rng.int(50, 400) + c.p.fans * 0.05); c.skill('stage', 2); c.chron('텅 빈 합주실에서 온라인 라이브', 'music'); return '카메라 너머 채팅창이 박수 이모지로 가득 찼다.'; } },
      { label: '방에 틀어박혀 곡을 쓴다', run: (c) => { c.skill('compose', 6); c.theme('night'); return '세상이 멈춘 동안, 노트에 가사가 쌓였다.'; } },
      { label: '배달 알바로 버틴다', run: (c) => { c.money(c.krw(4_000_000), '배달 수입'); c.stat('stress', 6); c.theme('city'); } },
    ],
  },
  {
    id: 'band_boom', scene: 'festival', title: '밴드 붐', priority: 120, once: true, chance: 0.6,
    when: (c) => c.year >= 2023 && c.year <= 2027 && !!c.band,
    text: () => '숏폼에서 밴드 라이브 직캠이 퍼지고, 페스티벌 라인업이 늘었다.\n사람들이 다시 밴드를 찾는다. 기회다.',
    choices: [
      { label: '직캠 맛집이 되자 — 무대 연출 강화', run: (c) => { c.skill('stage', 4); c.fans(500 + c.p.fans * 0.15); c.inc('promo', 2); } },
      { label: '유행은 지나간다. 음악에 집중', run: (c) => { c.skill('compose', 4); c.rep(3); } },
    ],
  },
  // ───────── 위기 ─────────
  {
    id: 'debt_crisis', scene: 'home', title: '통장이 바닥났다', priority: 190, queued: true,
    when: () => true,
    text: (c) => `잔고 ${won(c.p.money)}. 카드값 독촉 문자가 하루에 세 통씩 온다.`,
    choices: [
      { label: '부모님께 도움을 청한다', if: (c) => !!mom(c)?.alive || !!dad(c)?.alive, run: (c) => { const help = c.krw(c.p.income === 'high' ? 30_000_000 : c.p.income === 'mid' ? 12_000_000 : 4_000_000); c.money(help, '부모님'); c.stat('happiness', -6); c.theme('family'); return '엄마는 아무것도 묻지 않았다. 그게 더 아팠다.'; } },
      { label: '악기를 판다', run: (c) => { c.money(c.krw(3_000_000), '중고 거래'); c.stat('happiness', -10); c.skill(c.p.mainInst ?? 'guitar', -3); return '택배 상자에 악기를 넣는 손이 오래 멈췄다.'; } },
      { label: '개인회생을 신청한다', run: (c) => { c.set('bankrupt'); c.p.money = 0; c.rep(-5); c.stat('happiness', -12); c.chron('개인회생 신청. 바닥에서 다시', 'big'); c.theme('rage'); return '바닥을 쳤다. 이제 올라갈 일만 남았다… 고 믿기로 했다.'; } },
    ],
  },
  {
    id: 'burnout', scene: 'home', title: '번아웃', priority: 140, cooldown: 6, chance: 0.8,
    when: (c) => c.s.stressTurns >= 2 && c.age >= 15,
    text: () => '아침에 눈을 떴는데 아무것도 하고 싶지 않다.\n좋아하던 노래가 소음처럼 들린다.',
    choices: [
      { label: '모든 걸 내려놓고 쉰다', run: (c) => { c.stat('stress', -30); c.stat('energy', 30); c.fans(-c.p.fans * 0.05); c.s.stressTurns = 0; return '반년 동안 기타를 만지지 않았다. 그리고 어느 날, 다시 만지고 싶어졌다.'; } },
      { label: '상담을 받는다', run: (c) => { c.money(-c.krw(800_000), '상담비'); c.stat('stress', -25); c.stat('happiness', 6); c.s.stressTurns = 0; c.theme('night'); return '“괜찮지 않아도 괜찮아요.” 그 말을 가사로 적었다.'; } },
      { label: '그냥 버틴다', run: (c) => { c.stat('health', -6); c.stat('stress', -5); return '버텼다. 몸이 대신 대가를 치렀다.'; } },
    ],
  },
  // ───────── 중년 이후 ─────────
  {
    id: 'reunion', scene: 'pub', title: '재결합', priority: 130, cooldown: 8, chance: 0.3,
    when: (c) => between(c, 38, 66) && !c.band && c.s.pastBands.some((b) => b.memberIds.some((id) => c.s.npcs[id]?.alive)),
    bind: (c) => {
      const b = [...c.s.pastBands].reverse().find((x) => x.memberIds.some((id) => c.s.npcs[id]?.alive));
      if (!b) return false;
      c.vars.band = b.name;
      c.vars.bandId = b.id;
      c.bind.f = b.memberIds.find((id) => c.s.npcs[id]?.alive)!;
      return true;
    },
    text: (c) => `${c.n('f')}에게서 문자가 왔다.\n“〈${c.vars.band}〉 기억나? 다들 한번 모이자는데… 한 번만, 다시 할래?”`,
    choices: [
      {
        label: '〈재결합〉 — 다시 무대로',
        run: (c) => {
          const old = c.s.pastBands.find((b) => b.id === c.vars.bandId)!;
          const band = formBand(c, old.name, old.genre);
          for (const id of old.memberIds) {
            const n = c.s.npcs[id];
            if (n?.alive && !band.memberIds.includes(id)) {
              band.memberIds.push(id);
              n.inBand = true;
              n.role = 'member';
            }
          }
          band.chemistry = clamp(60 + c.rng.int(0, 20));
          c.set('reunion');
          c.fans(c.p.fans * 0.2 + 300);
          c.theme('age');
          c.chron(`〈${old.name}〉 재결합`, 'big', 'f');
          return '흰머리가 늘었다. 그런데 첫 합주의 그 소리는 그대로였다.';
        },
      },
      { label: '추억은 추억으로', run: (c) => { c.rel('f', 4, '옛 밴드 이야기'); c.theme('age'); return '대신 단톡방에 옛날 공연 사진이 밤새 올라왔다.'; } },
    ],
  },
  {
    id: 'producer_friend', scene: 'recording', title: '오랜 친구의 스튜디오', priority: 120, once: true, chance: 0.35,
    when: (c) => c.age >= 34 && c.p.job !== 'producer',
    bind: (c) => c.bindFrom('f', (n) => (n.career === 'producer' || n.career === 'label') && n.affinity >= 5),
    text: (c) => {
      const n = c.npc('f');
      return `${n.metAge}살 때 ${n.metAt}에서 만난 ${n.name}. 지금은 ${CAREER_LABEL[n.career]}.\n“너 같은 사람이 필요해. 우리 스튜디오에서 같이 일하자. 신인들 곡도 봐 주고.”`;
    },
    choices: [
      { label: '프로듀서의 길로', run: (c) => { c.p.job = 'producer'; c.set('mentor'); c.skill('compose', 6); c.rel('f', 10, '같이 일하기 시작한 날'); c.chron(`${c.n('f')}의 스튜디오에서 프로듀서로 일하기 시작했다`, 'music', 'f'); return '다른 사람의 첫 곡을 들으며, 내 첫 곡을 떠올렸다.'; } },
      { label: '아직은 내 음악을 하겠다', run: (c) => { c.rel('f', 2); c.rep(1); } },
    ],
  },
  {
    id: 'parent_ill', scene: 'hospital', title: '부모님', priority: 125, once: true, chance: 0.25,
    when: (c) => between(c, 45, 62) && (!!mom(c)?.alive || !!dad(c)?.alive),
    bind: (c) => {
      const p = mom(c)?.alive ? mom(c) : dad(c);
      c.bind.pa = p.id;
      return true;
    },
    text: (c) => `${c.npc('pa').gender === 'f' ? '엄마' : '아빠'}가 쓰러졌다는 전화.\n병실 창가에서 ${c.npc('pa').gender === 'f' ? '엄마' : '아빠'}가 말했다. “네 노래 한번 불러 줘.”`,
    choices: [
      { label: '작은 목소리로 노래를 부른다', run: (c) => { c.theme('family'); c.theme('loss'); c.stat('happiness', -4); c.skill('vocal', 2); c.chron(`병실에서 ${c.npc('pa').gender === 'f' ? '엄마' : '아빠'}에게 노래를 불러 드렸다`, 'big'); c.queue('parent_farewell', c.bind); return '옆 침대 할머니도 박수를 쳤다.'; } },
      { label: '병원비를 보탠다', run: (c) => { c.money(-c.krw(8_000_000), '병원비'); c.theme('family'); c.queue('parent_farewell', c.bind); } },
    ],
  },
  {
    id: 'parent_farewell', scene: 'hospital', title: '안녕', priority: 125, queued: true,
    when: () => true,
    text: (c) => `${c.npc('pa').gender === 'f' ? '엄마' : '아빠'}가 떠났다.\n유품 정리 중, 상자 하나에서 내 공연 티켓과 기사 스크랩이 쏟아졌다.`,
    choices: [
      { label: '그 상자를 안고 오래 운다', run: (c) => { c.npc('pa').alive = false; c.stat('happiness', -15); c.theme('loss'); c.chron(`${c.npc('pa').gender === 'f' ? '엄마' : '아빠'}와의 이별. 상자 속 티켓들`, 'big'); return '다 보고 있었구나. 처음부터.'; } },
    ],
  },
  {
    id: 'retire_ask', scene: 'stage_old', title: '무대에서 내려올 때', priority: 105, cooldown: 6, chance: 0.4,
    when: (c) => c.age >= 60 && !c.p.retired,
    text: (c) => `${c.ageInt}살. 무릎이 계단을 싫어하기 시작했다.\n${c.band ? `${c.band.name}의 ${c.band.gigs}번의 공연.` : ''} 이제 무대에서 내려와도 될까?`,
    choices: [
      {
        label: '마지막 공연을 하고 은퇴한다',
        run: (c) => {
          if (c.band) playGig(c, VENUES.find((v) => c.p.fans >= v.minFans && v.id !== 'arena' && !v.id.includes('fest')) ?? VENUES[0]);
          c.p.retired = true;
          c.set('farewell');
          c.chron('은퇴 공연. 마지막 곡이 끝나고 오래도록 박수가 이어졌다', 'big');
          return '조명이 꺼졌다. 그런데 귀에서는 아직 박수 소리가 들린다.';
        },
      },
      { label: '아직이다. 죽을 때까지 현역', run: (c) => { c.set('lifelong'); c.stat('happiness', 4); return '“롤링은 계속된다.”'; } },
    ],
  },
  {
    id: 'revival', scene: 'arena', title: '역주행', priority: 200, queued: true,
    when: () => true,
    text: (c) => `${c.vars.years}년 전에 낸 노래 〈${c.vars.song}〉가 갑자기 차트에 올랐다.\n누군가의 숏폼 배경음악으로 쓰이면서 퍼졌다고 한다.\n댓글: “이 노래 왜 이제 알았지?”`,
    choices: [
      { label: '“그때 그 노래, 아직 살아 있었구나”', run: (c) => { c.stat('happiness', 15); c.rep(6); c.chron(`〈${c.vars.song}〉 ${c.vars.years}년 만의 역주행`, 'big'); c.set('revivalHit'); return '라디오 DJ가 그 곡을 소개하며 울컥했다.'; } },
    ],
  },
];

function enlist(c: Ctx, band: boolean): string {
  c.p.military = 'serving';
  c.p.militaryUntil = c.s.time + serviceYears(c.year);
  c.theme('military');
  if (c.band) c.band.chemistry = clamp(c.band.chemistry - 12);
  if (band) {
    c.set('militaryBand');
    c.chron('군악대 입대', 'life');
    c.skill(c.p.mainInst ?? 'guitar', 4);
    return '군악대 합격. 행진곡이지만, 아무튼 매일 연주한다.';
  }
  c.chron('입대. 머리를 밀던 날', 'life');
  c.stat('happiness', -6);
  return '머리를 밀고 거울을 봤다. 낯선 얼굴이 웃고 있었다.';
}

function bestUnreleased(c: Ctx, n: number) {
  return [...unreleased(c.s)].sort((a, b) => b.quality - a.quality).slice(0, n);
}

function doRelease(c: Ctx, n: number): string {
  const songs = bestUnreleased(c, n);
  const title = songs.length >= 3 ? `${songs[0].title}` : songs[0].title;
  actionById('release')!.run(c, `${title}|${songs.map((x) => x.id).join(',')}`);
  return songs.length >= 7 ? '마스터링이 끝난 날, 멤버들과 처음부터 끝까지 한 번에 들었다.' : songs.length >= 3 ? '다섯 곡이 하나의 이야기가 되었다.' : '발매 버튼을 누르고, 새로고침만 백 번 했다.';
}

function auditionOdds(c: Ctx) {
  const aff = c.npc('mf').affinity;
  return c.dc(
    13,
    `${c.p.mainInst ? INST_LABEL[c.p.mainInst] : '연주'} 판정`,
    [
      ['주 악기 실력', c.m(c.mainSkill)],
      [`${c.n('mf')}의 추천`, aff >= 40 ? 2 : aff >= 20 ? 1 : 0],
      ['무대 경험', c.m(c.p.skills.stage) > 0 ? 1 : 0],
    ],
    '가정',
    aff >= 60 ? `${c.nj('mf', '이/가')} 옆에서 같이 긴장해 준다 — 유리함(주사위 2개 중 높은 값)` : '밴드부 한 자리에 몇 명이 몰린다',
    aff >= 60,
  );
}
