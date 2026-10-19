// 음악 인생의 끝. 죽음만이 엔딩이 아니다 — 밴드 인생이 끝나면 여기서 마무리할 수 있다.
// ‘마무리’를 고르면 남은 인생은 조용히 흘러가고(자동 진행), 라이너 노트에 에필로그로 남는다.

import type { EventDef, Ctx } from '../ctx';

const lastGigYear = (c: Ctx) => (c.s.flags.lastGigYear as number) ?? (c.band ? c.year : 0);
const lastBand = (c: Ctx) => c.s.pastBands[c.s.pastBands.length - 1];

function reasonText(c: Ctx): string {
  if (c.flag('quitMusic')) return '기타는 케이스 속에 들어갔고, 합주실 단톡방은 조용해졌다.';
  if (c.p.retired) return '은퇴를 선언했다. 이제 무대는 다음 사람들의 것이다.';
  const b = lastBand(c);
  const gap = c.year - lastGigYear(c);
  return b ? `〈${b.name}〉이 멈춘 지 ${Math.max(1, c.year - (b.endedYear ?? c.year))}년, 마지막 무대에서 ${gap}년이 지났다.` : `마지막 무대에서 ${gap}년이 지났다.`;
}

export const CAREER_END: EventDef[] = [
  {
    // 현실: 마흔다섯 넘어 팬이 천 명도 안 되면 음악으로 먹고살 길은 사실상 닫힌다 — 취미로 할지, 끝까지 갈지, 내려놓을지
    id: 'hobby_turn',
    scene: 'home',
    title: '음악으로 먹고살 수 있을까',
    priority: 160,
    once: true,
    chance: 0.7,
    when: (c) => c.age >= 45 && c.age < 80 && c.p.fans < 1500 && !c.flag('hobby') && !c.flag('careerEnd') && (c.band?.label ?? 'none') === 'none' && !!c.p.mainInst,
    text: (c) => `${c.ageInt}세. 팬은 ${c.p.fans.toLocaleString()}명.\n예술인의 절반이 다른 일을 함께 한다는 통계가 있다. 이 나이에 음악만으로 먹고사는 사람은 훨씬 적다.\n이제 음악을 어떻게 할까?`,
    choices: [
      {
        label: '취미로 한다 — 일은 일대로, 주말엔 밴드',
        risk: 'safe',
        run: (c) => {
          c.set('hobby', c.ageInt);
          if (c.p.job === 'none') c.p.job = 'part';
          c.stat('stress', -10);
          c.stat('happiness', 6);
          c.chron(`${c.ageInt}세, 음악을 취미로 하기로 했다`, 'life');
          return '주말 오후 합주실. 돈 걱정 없이 치는 기타가 오랜만에 즐거웠다.';
        },
      },
      {
        label: '끝까지 전업으로 간다',
        risk: 'gamble',
        odds: (c) => c.dc(16, '버티기 판정', [['곡 완성도', c.m(Math.max(0, ...c.s.songs.map((x) => x.quality)))], ['무대', Math.floor(c.m(c.p.skills.stage) / 2)], ['나이', c.age >= 60 ? -3 : c.age >= 52 ? -1 : 0]], '근사', '중년 이후 전업 음악인으로 다시 뜨는 경우는 드물다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.fans(600 + c.p.fans); c.rep(5); c.chron(`${c.ageInt}세, 늦깎이로 다시 주목받았다`, 'big'); return '중년의 목소리가 오히려 사람들을 붙잡았다. 작은 공연장이 다시 찼다.'; }
          c.set('hobby', c.ageInt);
          c.stat('stress', 10);
          c.money(-c.krw(2_000_000), '빚진 생활비');
          return '1년을 버텼다. 통장은 바닥났고, 결국 낮에는 일을 구했다. 음악은 주말로 옮겨 갔다.';
        },
      },
      {
        label: '음악을 내려놓는다',
        risk: 'safe',
        run: (c) => { c.set('quitMusic'); c.stat('happiness', -4); return '기타를 케이스에 넣고 옷장 위에 올렸다.'; },
      },
    ],
  },
  {
    id: 'career_end',
    scene: 'stage_old',
    title: '음악 인생의 마지막 페이지',
    priority: 165,
    chance: 1,
    when: (c) => {
      if (c.flag('careerEnd') || c.age < 19) return false;
      const declined = c.s.flags.careerEndDeclined as number | undefined;
      if (declined !== undefined && c.year - declined < 8) return false;
      if (c.flag('quitMusic') || c.p.retired) return true;
      const pastBand = c.s.pastBands.length > 0;
      return !c.band && pastBand && c.age >= 35 && c.year - lastGigYear(c) >= 6;
    },
    text: (c) => `${reasonText(c)}\n\n여기서 이 음악 인생의 이야기를 마무리할까?\n마무리하면 남은 삶은 조용히 흘러가고, 라이너 노트에 에필로그로 남는다.`,
    choices: [
      {
        label: '여기서 마무리한다 — 남은 인생은 조용히',
        run: (c) => {
          c.set('careerEnd', c.ageInt);
          c.set('careerEndNow');
          c.chron(`${c.ageInt}세, 음악 인생의 막을 내렸다`, 'big');
          return '마지막으로 오래된 셋리스트를 꺼내 읽었다. 첫 곡부터 앙코르까지, 다 기억났다.';
        },
      },
      {
        label: '아직 끝나지 않았다',
        run: (c) => {
          c.set('careerEndDeclined', c.year);
          if (c.flag('quitMusic')) c.set('quitMusic', false);
          c.stat('happiness', 4);
          return '먼지 쌓인 케이스를 열었다. 줄은 녹슬었지만, 손가락은 코드를 기억하고 있었다.';
        },
      },
    ],
  },
];
