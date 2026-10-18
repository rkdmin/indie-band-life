// 사람마다 다른 장면. 성격(trait)·주 악기·부모님 직업에 따라서만 열리는 사건들이라
// 같은 게임이라도 인생마다 겪는 일이 달라진다.

import type { EventDef, Ctx } from '../ctx';

const free = (c: Ctx) => c.p.military !== 'serving';
const between = (c: Ctx, a: number, b: number) => c.age >= a && c.age < b;
const has = (c: Ctx, t: string) => (c.p.traits ?? []).includes(t as never);
const job = (c: Ctx) => c.s.flags.parentJob as string | undefined;
const bindMember = (c: Ctx, role: string) => {
  const ids = c.s.band?.memberIds ?? [];
  return ids.length > 0 && c.bindFrom(role, (n) => ids.includes(n.id));
};

export const PERSON: EventDef[] = [
  // ───────── 성격 ─────────
  {
    id: 'ps_diligent_dawn', scene: 'musicroom', title: '새벽 다섯 시의 루틴', cooldown: 10, chance: 0.15,
    when: (c) => has(c, 'diligent') && between(c, 13, 40) && free(c) && !!c.p.mainInst,
    text: () => '알람보다 먼저 눈이 떠졌다. 메트로놈 60부터 시작하는 새벽 연습은 벌써 백일째다.\n오늘은 몸이 무겁다.',
    choices: [
      {
        label: '그래도 루틴을 지킨다',
        odds: (c) => c.dc(11, '체력 판정', [['컨디션', c.m(c.p.stats.energy)], ['체력', c.m(c.p.talents.stamina)]], '가정', '피곤한 날의 연습은 몸이 버텨 줘야 효과가 있다'),
        run: (c) => {
          const i = c.p.mainInst!;
          if (c.check(c.choicesOdds!)) { c.skill(i, 4); c.stat('happiness', 3); c.set('dawnRoutine'); return '마지막 마디에서 손가락이 저절로 움직였다. 백일의 보상이었다.'; }
          c.skill(i, 1); c.stat('health', -4); c.stat('energy', -6);
          return '손이 굳은 채로 한 시간을 버텼다. 오후 내내 꾸벅꾸벅 졸았다.';
        },
      },
      { label: '오늘은 쉬어 간다', run: (c) => { c.stat('stress', -5); c.stat('energy', 6); return '쉬는 것도 연습이라고, 수첩에 처음으로 ‘휴식’이라고 적었다.'; } },
    ],
  },
  {
    id: 'ps_free_trip', scene: 'street', title: '충동 버스표', cooldown: 12, chance: 0.15,
    when: (c) => has(c, 'free') && between(c, 17, 45) && free(c),
    text: () => '터미널 앞을 지나다 전광판에 뜬 바닷가 도시 이름이 눈에 꽂혔다.\n주머니엔 카드 한 장, 등엔 악기 가방.',
    choices: [
      {
        label: '바로 표를 끊고 바닷가에서 버스킹한다',
        odds: (c) => c.dc(12, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['존재감', c.m(c.p.talents.presence)]], '가정', '낯선 동네 버스킹은 행인의 발걸음을 붙잡아야 한다'),
        run: (c) => {
          c.money(-c.krw(120_000), '여행 경비');
          c.theme('sea');
          if (c.check(c.choicesOdds!)) { c.fans(30); c.skill('stage', 3); c.stat('happiness', 8); return '파도 소리에 맞춰 부른 노래에 동네 사람들이 모여들었다. 누군가 찍은 영상이 돌았다.'; }
          c.stat('happiness', 4);
          return '아무도 멈추지 않았지만, 방파제에 앉아 먹은 컵라면은 인생 최고였다.';
        },
      },
      { label: '사진만 찍고 집에 간다', run: (c) => { c.stat('stress', 2); return '전광판 사진은 한동안 휴대폰 배경화면이 됐다.'; } },
    ],
  },
  {
    id: 'ps_sensitive_comment', scene: 'home', title: '댓글 한 줄', cooldown: 10, chance: 0.18,
    when: (c) => has(c, 'sensitive') && c.p.fans >= 50 && c.age >= 15 && free(c),
    text: () => '영상에 달린 백 개의 칭찬 사이에 한 줄이 있었다.\n“이 정도면 노래방 수준 아님?”\n그 한 줄만 계속 다시 읽게 된다.',
    choices: [
      {
        label: '그 감정을 곡으로 옮긴다',
        odds: (c) => c.dc(12, '작곡 판정', [['작곡', c.m(c.p.skills.compose)], ['가사 감각', c.m(c.p.talents.lyric)]], '가정'),
        run: (c) => {
          c.theme('night');
          if (c.check(c.choicesOdds!)) { c.skill('compose', 4); c.stat('stress', -6); return '새벽에 완성한 곡 제목은 ‘노래방 수준’. 오히려 그 곡이 제일 좋다는 말을 들었다.'; }
          c.stat('stress', 8);
          return '쓰다 만 가사가 노트 세 장을 채웠다. 아직은 아프다.';
        },
      },
      { label: '앱을 지우고 며칠 잠수한다', run: (c) => { c.stat('stress', -3); c.fans(-10); return '사흘 만에 켠 휴대폰에는 “요즘 왜 안 올려요?”라는 메시지가 와 있었다.'; } },
      { label: '친구에게 털어놓는다', run: (c) => { c.stat('stress', -6); c.stat('happiness', 3); return '“그 사람 아이디 보니까 하루에 댓글 이백 개 달더라.” 웃음이 터졌다.'; } },
    ],
  },
  {
    id: 'ps_warm_junior', scene: 'musicroom', title: '후배의 떨리는 손', once: true, chance: 0.2,
    when: (c) => has(c, 'warm') && between(c, 16, 40) && free(c) && !!c.p.mainInst,
    text: () => '합주실 복도에서 처음 보는 후배가 악기 케이스를 끌어안고 서 있다.\n“첫 공연인데… 손이 너무 떨려서요.”',
    choices: [
      {
        label: '같이 리허설을 봐 준다',
        odds: (c) => c.dc(10, '가르침 판정', [['무대 경험', c.m(c.p.skills.stage)], ['주 악기', c.m(c.p.skills[c.p.mainInst!])]], '가정'),
        run: (c) => {
          const n = c.meet('jr', { metAt: '첫 공연 전 복도에서 만난 후배', birthYear: c.p.birthYear + 3, affinity: 30 });
          void n;
          if (c.check(c.choicesOdds!)) { c.rel('jr', 12, '첫 공연 리허설을 봐 준 선배'); c.rep(2); c.stat('happiness', 5); return `무대에서 내려온 ${c.nj('jr', '이/가')} 제일 먼저 나를 찾았다. “선배 덕분이에요.”`; }
          c.rel('jr', 5, '복도에서 받은 응원');
          return `${c.nj('jr', '은/는')} 두 번 틀렸지만 끝까지 쳤다. 그거면 충분했다.`;
        },
      },
      { label: '따뜻한 음료만 쥐여 준다', run: (c) => { c.stat('happiness', 2); return '“심호흡 세 번.” 그 말만 하고 돌아섰다. 어쩐지 내가 더 뿌듯했다.'; } },
    ],
  },
  {
    id: 'ps_ambitious_bigshow', scene: 'club', title: '오백 석짜리 꿈', once: true, chance: 0.2,
    when: (c) => has(c, 'ambitious') && !!c.band && free(c) && c.p.fans >= 100 && c.p.fans < 5000,
    text: (c) => `아직 팬은 ${c.p.fans}명 남짓. 그런데 오백 석짜리 공연장 대관 공고가 눈에 들어왔다.\n“여기서 단독 하면 판이 바뀐다.” 심장이 빨리 뛴다.`,
    choices: [
      {
        label: '대관을 지른다',
        odds: (c) => c.dc(16, '흥행 판정', [['무대', c.m(c.p.skills.stage)], ['평판', c.m(c.p.rep)], ['팬 규모', c.p.fans >= 1000 ? 3 : c.p.fans >= 400 ? 1 : -1]], '가정', '팬 수에 비해 큰 공연장은 표가 남기 쉽다'),
        run: (c) => {
          c.money(-c.krw(3_000_000), '대관');
          if (c.check(c.choicesOdds!)) { c.money(c.krw(4_500_000), '공연 수익'); c.fans(300); c.rep(5); c.chron('무리한 단독 공연이 매진됐다', 'band'); return '마지막 곡에서 오백 명이 함께 불렀다. 무모함이 맞았다.'; }
          c.stat('stress', 10); c.rep(-2);
          return '객석의 절반이 비었다. 그래도 앞줄 사람들은 끝까지 뛰었다.';
        },
      },
      { label: '작은 곳부터 매진시킨다', run: (c) => { c.skill('stage', 2); c.stat('stress', 3); return '백 석 공연장에 ‘매진’ 표지가 붙었다. 다음엔 이백 석이다.'; } },
    ],
  },
  {
    id: 'ps_funny_viral', scene: 'club', title: '멘트가 터졌다', cooldown: 15, chance: 0.18,
    when: (c) => has(c, 'funny') && c.age >= 16 && free(c) && !!c.p.mainInst,
    text: () => '공연 중 줄이 끊어졌다. 줄을 갈 동안 마이크를 잡았다.\n관객 몇이 휴대폰을 들어 올린다.',
    choices: [
      {
        label: '즉석 토크쇼를 연다',
        odds: (c) => c.dc(12, '입담 판정', [['무대', c.m(c.p.skills.stage)], ['존재감', c.m(c.p.talents.presence)], ['타고난 입담', 2]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.fans(150); c.rep(2); c.stat('happiness', 6); return '“줄도 저를 떠나네요.” 그 한마디 영상이 밤새 퍼졌다. 노래보다 멘트로 먼저 유명해졌다.'; }
          c.stat('stress', 3);
          return '농담 세 개가 연달아 미끄러졌다. 그게 또 웃겼는지 누군가 박수를 쳤다.';
        },
      },
      { label: '조용히 줄만 간다', run: (c) => { c.skill('stage', 1); return '침묵 속에 줄을 감는 소리가 유난히 크게 들렸다.'; } },
    ],
  },
  {
    id: 'ps_stubborn_arrange', scene: 'studio', title: '이 코드는 못 바꿔', cooldown: 12, chance: 0.18,
    when: (c) => has(c, 'stubborn') && !!c.band && free(c),
    bind: (c) => bindMember(c, 'mb'),
    text: (c) => `${c.nj('mb', '이/가')} 브리지 편곡을 바꾸자고 했다.\n“여기 너무 길어. 반으로 줄이자.” 내 머릿속엔 이 여덟 마디가 곡의 심장이다.`,
    choices: [
      {
        label: '연주로 설득한다',
        odds: (c) => c.dc(13, '설득 판정', [['작곡', c.m(c.p.skills.compose)], ['멤버와의 사이', c.npc('mb').affinity >= 50 ? 2 : -1]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('compose', 3); c.rel('mb', 4, '브리지를 지킨 날'); return `끝까지 들은 ${c.nj('mb', '이/가')} 말했다. “…인정. 길어야 하네.”`; }
          c.rel('mb', -8, '편곡 다툼'); c.conflict('mb', 10); c.stat('stress', 6);
          return '합주실 문이 쾅 닫혔다. 그날 연습은 거기서 끝났다.';
        },
      },
      { label: '한발 물러서 반반 섞는다', run: (c) => { c.rel('mb', 5, '편곡 타협'); c.skill('compose', 1); return '반반 섞은 브리지가 의외로 좋았다. 조금 분했다.'; } },
    ],
  },
  {
    id: 'ps_shy_stagefright', scene: 'stage_old', title: '조명이 너무 밝다', once: true, chance: 0.22,
    when: (c) => has(c, 'shy') && between(c, 12, 30) && free(c) && !!c.p.mainInst,
    text: () => '무대 옆 커튼 뒤. 손바닥이 땀으로 젖었다.\n사회자가 내 이름을 부른다. 다리가 움직이지 않는다.',
    choices: [
      {
        label: '눈을 감고 첫 음만 생각한다',
        odds: (c) => c.dc(13, '담력 판정', [['무대', c.m(c.p.skills.stage)], ['주 악기', c.m(c.p.skills[c.p.mainInst!])]], '가정', '수줍은 성격이라 첫 무대가 유난히 무겁다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('stage', 5); c.stat('happiness', 8); c.set('stageFearBeaten'); c.chron('무대 공포증을 처음 이겨 냈다', 'life'); return '첫 음이 나오자 몸이 기억했다. 끝나고서야 다리가 후들거렸다.'; }
          c.skill('stage', 1); c.stat('stress', 8);
          return '목소리가 반쯤 갈라졌다. 그래도 도망치지 않고 끝까지 섰다.';
        },
      },
      { label: '객석 맨 뒤 한 사람만 보고 친다', run: (c) => { c.skill('stage', 2); c.stat('stress', 2); return '맨 뒤에서 고개를 끄덕이는 사람이 있었다. 그 사람을 위한 공연이었다.'; } },
    ],
  },

  // ───────── 주 악기 ─────────
  {
    id: 'ps_vocal_throat', scene: 'hospital', title: '목이 잠겼다', cooldown: 15, chance: 0.15,
    when: (c) => c.p.mainInst === 'vocal' && c.age >= 15 && free(c),
    text: () => '공연 사흘 전, 아침에 일어나니 목소리가 쉰 소리로 나온다.\n이비인후과 의사가 말한다. “성대가 많이 부었네요. 일주일은 쉬셔야 해요.”',
    choices: [
      { label: '공연을 미루고 완전히 쉰다', run: (c) => { c.stat('health', 6); c.rep(-2); c.stat('stress', 4); return '일주일간 필담으로 살았다. 메모장에 “ㅇㅇ” “ㄴㄴ”만 가득했다.'; } },
      {
        label: '키를 낮춰서 무대에 선다',
        odds: (c) => c.dc(14, '보컬 판정', [['보컬', c.m(c.p.skills.vocal)], ['음감', c.m(c.p.talents.pitch)]], '가정', '부은 성대로 부르면 고음이 위험하다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('vocal', 3); c.fans(40); return '반음 낮춘 노래가 더 쓸쓸하게 들렸다. 그 버전이 더 좋다는 사람도 있었다.'; }
          c.stat('health', -8); c.skill('vocal', -2);
          return '세 번째 곡에서 목이 완전히 닫혔다. 관객들이 대신 불러 줬다.';
        },
      },
      { label: '꿀물과 가습기로 버틴다', run: (c) => { c.money(-c.krw(60_000), '가습기'); c.stat('health', 2); return '방 안이 안개처럼 촉촉해졌다. 목은 반쯤 돌아왔다.'; } },
    ],
  },
  {
    id: 'ps_guitar_gas', scene: 'street', title: '이펙터 하나만 더', cooldown: 12, chance: 0.18,
    when: (c) => c.p.mainInst === 'guitar' && c.age >= 14 && free(c),
    text: () => '중고 장터에 오래 찾던 빈티지 퍼즈 페달이 올라왔다.\n페달보드엔 자리가 없는데, 손은 이미 채팅창을 열고 있다.',
    choices: [
      {
        label: '사고, 그 소리로 곡을 쓴다',
        odds: (c) => c.dc(12, '톤 메이킹 판정', [['기타', c.m(c.p.skills.guitar)], ['작곡', c.m(c.p.skills.compose)]], '가정', '좋은 장비도 쓸 줄 알아야 소리가 된다'),
        run: (c) => {
          c.money(-c.krw(350_000), '이펙터');
          if (c.check(c.choicesOdds!)) { c.skill('guitar', 3); c.skill('compose', 2); return '첫 코드를 긁자마자 리프 하나가 쏟아졌다. 이건 투자였다.'; }
          c.stat('stress', 3);
          return '설레던 소리는 사흘 만에 익숙해졌고, 페달은 서랍으로 들어갔다.';
        },
      },
      { label: '있는 장비로 소리를 찾는다', run: (c) => { c.skill('guitar', 2); return '노브를 이리저리 돌리다 비슷한 소리를 찾았다. 장비병이 잠시 나았다.'; } },
      { label: '안 쓰는 페달을 팔고 바꾼다', run: (c) => { c.money(-c.krw(80_000), '이펙터'); c.stat('happiness', 3); return '정든 페달을 보내며 잠깐 쓸쓸했다. 새 페달은 금방 정이 들었다.'; } },
    ],
  },
  {
    id: 'ps_bass_joke', scene: 'club', title: '“베이스 소리 들려요?”', cooldown: 15, chance: 0.18,
    when: (c) => c.p.mainInst === 'bass' && c.age >= 15 && free(c),
    text: () => '공연 뒤풀이. 친구가 웃으며 말한다. “근데 베이스는 원래 안 들리는 거 아냐?”\n테이블이 웃음바다가 됐다.',
    choices: [
      {
        label: '다음 공연에 베이스 솔로를 넣는다',
        odds: (c) => c.dc(13, '베이스 판정', [['베이스', c.m(c.p.skills.bass)], ['리듬감', c.m(c.p.talents.rhythm)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('bass', 4); c.fans(60); c.rep(2); return '여덟 마디 솔로가 끝나자 함성이 터졌다. 그 친구가 제일 크게 소리쳤다.'; }
          c.stat('stress', 4);
          return '솔로 중간에 박이 밀렸다. 다들 “그래도 이번엔 들렸어”라고 했다.';
        },
      },
      { label: '“빠져 봐야 아쉬운 소리야.”', run: (c) => { c.stat('happiness', 3); c.skill('bass', 1); return '다음 합주에서 베이스를 빼고 쳐 보니, 다들 바로 조용해졌다.'; } },
    ],
  },
  {
    id: 'ps_drums_noise', scene: 'home', title: '아랫집 쪽지', once: true, chance: 0.22,
    when: (c) => c.p.mainInst === 'drums' && between(c, 12, 35) && free(c),
    text: () => '현관문에 쪽지가 붙었다. “밤마다 쿵쿵… 아기가 깨요. 부탁드립니다.”\n연습 패드로는 감이 안 온다.',
    choices: [
      { label: '전자드럼을 들인다', run: (c) => { c.money(-c.krw(900_000), '장비'); c.skill('drums', 3); c.set('eDrum'); return '헤드폰 속에서만 울리는 드럼. 아랫집에서 귤 한 봉지가 왔다.'; } },
      {
        label: '사과 편지와 함께 연습 시간을 정한다',
        odds: (c) => c.dc(11, '설득 판정', [['평판', c.m(c.p.rep)], ['진심', 2]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('drums', 2); c.stat('happiness', 4); return '“저녁 여섯 시까지는 괜찮아요. 우리 애가 드럼 소리를 좋아해요.”'; }
          c.stat('stress', 6);
          return '관리실 방송이 나왔다. 그날부터 스틱 대신 젓가락으로 책상을 두드렸다.';
        },
      },
      { label: '합주실 월 정액을 끊는다', run: (c) => { c.money(-c.krw(200_000), '합주실'); c.skill('drums', 2); return '버스 두 번 갈아타는 거리. 대신 마음껏 칠 수 있었다.'; } },
    ],
  },
  {
    id: 'ps_keys_carry', scene: 'street', title: '신디사이저는 무겁다', cooldown: 15, chance: 0.18,
    when: (c) => c.p.mainInst === 'keys' && c.age >= 16 && free(c),
    text: () => '88건반 신디와 스탠드를 메고 지하철 계단 앞에 섰다.\n공연장까지 남은 거리 1.2킬로미터, 엘리베이터는 점검 중.',
    choices: [
      {
        label: '이 악물고 들고 간다',
        odds: (c) => c.dc(12, '체력 판정', [['체력', c.m(c.p.talents.stamina)], ['건강', c.m(c.p.stats.health)]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.skill('stage', 2); c.stat('happiness', 3); return '땀범벅으로 도착했지만 사운드체크엔 늦지 않았다. 팔뚝이 조금 굵어졌다.'; }
          c.stat('health', -6); c.stat('energy', -8);
          return '다음 날 허리가 펴지지 않았다. 파스 냄새가 합주실을 채웠다.';
        },
      },
      { label: '택시를 부른다', run: (c) => { c.money(-c.krw(25_000), '택시비'); return '기사님이 “피아노 치세요?” 하며 트렁크를 열어 줬다.'; } },
      { label: '61건반 가벼운 걸로 바꿀까 고민한다', run: (c) => { c.money(-c.krw(400_000), '장비'); c.skill('keys', 1); c.stat('stress', -4); return '건반은 줄었지만 어깨는 살았다. 옥타브 버튼과 친해졌다.'; } },
    ],
  },

  // ───────── 부모님 직업 ─────────
  {
    id: 'ps_pj_office', scene: 'home', title: '안정적인 직장', once: true, chance: 0.2,
    when: (c) => job(c) === 'office' && between(c, 17, 25) && free(c),
    text: () => '퇴근한 아빠가 넥타이를 풀며 식탁에 앉았다.\n“음악 좋지. 그래도 공채 시즌인데 원서 한 장만 넣어 보면 어떨까.” 걱정이 묻어나는 목소리다.',
    choices: [
      {
        label: '내 계획을 숫자로 보여 준다',
        odds: (c) => c.dc(13, '설득 판정', [['무대', c.m(c.p.skills.stage)], ['팬', c.p.fans >= 500 ? 2 : 0], ['통장', c.p.money >= c.krw(3_000_000) ? 1 : 0]], '가정'),
        run: (c) => {
          c.theme('family');
          if (c.check(c.choicesOdds!)) { c.stat('happiness', 6); c.set('parentBlessing'); return '한참 표를 보던 아빠가 말했다. “엑셀은 제법 하네.” 그걸로 충분했다.'; }
          c.stat('stress', 6);
          return '“그래, 좀 더 생각해 보자.” 대화는 거기서 멈췄지만 아빠는 내 공연 날짜를 달력에 적어 두었다.';
        },
      },
      { label: '원서 한 장은 넣어 본다', run: (c) => { c.stat('stress', 3); c.study(3); return '면접장에서 자기소개를 하다가 무대 멘트 말투가 튀어나왔다.'; } },
    ],
  },
  {
    id: 'ps_pj_pro', scene: 'home', title: '기대라는 무게', once: true, chance: 0.2,
    when: (c) => job(c) === 'pro' && between(c, 14, 20),
    text: () => '엄마가 상담 자료를 식탁 위에 펼쳤다. 의대, 로스쿨, 약대.\n“네 성적이면 충분히 가능해. 음악은 취미로 하면 되잖아.”',
    choices: [
      {
        label: '연주를 직접 들려드린다',
        odds: (c) => c.dc(14, '설득 판정', [['주 악기', c.p.mainInst ? c.m(c.p.skills[c.p.mainInst]) : -2], ['학업', c.m(c.p.study)]], '가정', '성적을 지키고 있으면 이야기가 더 잘 들린다'),
        run: (c) => {
          c.theme('family');
          if (c.check(c.choicesOdds!)) { c.stat('happiness', 8); c.set('parentBlessing'); return '연주가 끝나자 엄마가 안경을 벗었다. “…언제 이렇게 늘었니.”'; }
          c.stat('stress', 8);
          return '엄마는 고개를 저었지만, 그날 밤 내 방 앞에 과일 접시를 두고 갔다.';
        },
      },
      { label: '공부도 음악도 다 해 본다', run: (c) => { c.study(5); c.stat('stress', 6); c.stat('energy', -5); return '문제집 사이에 악보를 끼워 두는 이중생활이 시작됐다.'; } },
      { label: '일단 대답을 미룬다', run: (c) => { c.stat('stress', 3); return '“생각해 볼게요.” 방문을 닫고 볼륨을 조금 높였다.'; } },
    ],
  },
  {
    id: 'ps_pj_shop', scene: 'street', title: '가게 앞 첫 무대', once: true, chance: 0.25,
    when: (c) => job(c) === 'shop' && between(c, 8, 18),
    text: () => '주말마다 부모님 가게 일을 돕는다. 손님이 뜸한 오후,\n엄마가 말했다. “심심한데 노래 한 곡 해 봐. 손님 오면 더 좋고.”',
    choices: [
      {
        label: '가게 앞에서 노래한다',
        odds: (c) => c.dc(10, '무대 판정', [['보컬', c.m(c.p.skills.vocal)], ['배짱', has(c, 'shy') ? -2 : 1]], '가정'),
        run: (c) => {
          c.theme('family');
          if (c.check(c.choicesOdds!)) { c.skill('stage', 4); c.stat('happiness', 8); c.chron('부모님 가게 앞에서 첫 공연을 했다', 'life'); return '지나가던 할머니가 박수를 치고 물건을 두 개나 사 갔다. 엄마가 엄지를 들었다.'; }
          c.skill('stage', 1);
          return '가사를 까먹었다. 단골 아저씨가 “다음 주에 다시 와서 들을게” 했다.';
        },
      },
      { label: '계산대 뒤에서 흥얼거리기만 한다', run: (c) => { c.skill('vocal', 2); return '손님 한 명이 “그 노래 뭐예요?” 하고 물었다. 내가 지은 거라고 말하진 못했다.'; } },
    ],
  },
  {
    id: 'ps_pj_factory', scene: 'home', title: '엇갈린 저녁', once: true, chance: 0.2,
    when: (c) => job(c) === 'factory' && between(c, 8, 18),
    text: () => '이번 주 아빠는 야간조다. 내가 학교에서 돌아오면 아빠는 작업복을 입고 나간다.\n현관에서 딱 오 분, 마주치는 시간.',
    choices: [
      { label: '오 분 동안 새로 배운 곡을 들려 드린다', run: (c) => { c.skill(c.p.mainInst ?? 'vocal', 2); c.theme('family'); c.stat('happiness', 5); return '신발을 신다 말고 끝까지 들은 아빠가 말했다. “이거 들으면서 일하면 안 졸겠다.”'; } },
      {
        label: '아빠 휴대폰에 노래를 녹음해 보낸다',
        odds: (c) => c.dc(11, '녹음 판정', [['작곡', c.m(c.p.skills.compose)], ['음감', c.m(c.p.talents.pitch)]], '가정'),
        run: (c) => {
          c.theme('family');
          if (c.check(c.choicesOdds!)) { c.skill('compose', 3); c.set('dadPlaylist'); return '새벽 쉬는 시간마다 아빠가 그걸 돌려 들었다고, 한참 뒤에야 알았다.'; }
          c.skill('compose', 1);
          return '잡음투성이 녹음이었지만, 답장은 엄지 이모티콘 세 개였다.';
        },
      },
      { label: '아빠 몫의 저녁을 랩으로 싸 둔다', run: (c) => { c.stat('happiness', 3); return '아침에 보니 빈 그릇 옆에 “잘 먹었다”라는 쪽지가 있었다.'; } },
    ],
  },
  {
    id: 'ps_pj_driver', scene: 'street', title: '조수석 라디오', once: true, chance: 0.22,
    when: (c) => job(c) === 'driver' && between(c, 8, 16),
    text: () => '방학이라 아빠 차 조수석에 탔다. 하루 종일 라디오가 흘렀다.\n옛날 노래가 나오면 아빠는 핸들을 두드리며 따라 불렀다.',
    choices: [
      {
        label: '아빠와 화음을 맞춰 본다',
        odds: (c) => c.dc(10, '음감 판정', [['음감', c.m(c.p.talents.pitch)], ['보컬', c.m(c.p.skills.vocal)]], '가정'),
        run: (c) => {
          c.theme('family');
          if (c.check(c.choicesOdds!)) { c.skill('vocal', 4); c.genre('folk', 6); c.stat('happiness', 6); return '신호 대기 중에 옆 차 아저씨가 창문을 내리고 박수를 쳤다.'; }
          c.skill('vocal', 1);
          return '음이 계속 엇나갔다. 아빠는 “원래 그렇게 부르는 거야” 하며 웃었다.';
        },
      },
      { label: '노래 제목을 전부 받아 적는다', run: (c) => { c.genre('folk', 4); c.skill('compose', 2); c.set('radioNotebook'); return '수첩 한 권이 옛날 노래 제목으로 채워졌다. 내 첫 플레이리스트였다.'; } },
    ],
  },
  {
    id: 'ps_pj_farm', scene: 'festival', title: '마을 잔치 무대', once: true, chance: 0.25,
    when: (c) => job(c) === 'farm' && between(c, 9, 20),
    text: (c) => `가을걷이가 끝나고 마을 회관 앞에 천막 무대가 섰다.\n이장님이 마이크를 내밀었다. “${c.me}, 너 악기 한다며? 한 곡 해 봐라.”`,
    choices: [
      {
        label: '어르신들 앞에서 한 곡 한다',
        odds: (c) => c.dc(11, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['존재감', c.m(c.p.talents.presence)]], '가정'),
        run: (c) => {
          c.theme('family');
          if (c.check(c.choicesOdds!)) { c.skill('stage', 4); c.money(c.krw(50_000), '출연료'); c.stat('happiness', 8); c.chron('마을 잔치에서 첫 출연료(용돈 봉투)를 받았다', 'life'); return '어르신들이 어깨춤을 췄다. 하얀 봉투에 ‘출연료’라고 적혀 있었다.'; }
          c.skill('stage', 1);
          return '스피커가 웅웅거려 내 소리가 묻혔다. 그래도 막걸리 잔이 높이 들렸다.';
        },
      },
      { label: '부모님과 같이 무대에 오른다', run: (c) => { c.theme('family'); c.skill('stage', 2); c.stat('happiness', 6); return '엄마는 박자를 놓쳤고 아빠는 가사를 틀렸다. 마을에서 제일 크게 웃은 무대였다.'; } },
    ],
  },
];
