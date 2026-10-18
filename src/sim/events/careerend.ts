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
