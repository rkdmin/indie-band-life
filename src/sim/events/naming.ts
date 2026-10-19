// 밴드 이름 짓기 — 결성하면 멤버를 고르기 전에 이름부터. 화면에서 직접 쓰거나 추천 이름을 고른다.
// 자동 진행(맡기기)이면 처음 만들어진 이름 그대로 간다. 이름이 정해진 뒤에 결성 기록·연출이 남는다.

import type { EventDef } from '../ctx';
import { GENRE_INFO } from '../data/world';
import { josa, given } from '../korean';

export const NAMING_EVENTS: EventDef[] = [
  {
    id: 'name_band', scene: 'studio', title: '밴드 이름', priority: 199, queued: true,
    when: (c) => !!c.band,
    text: (c) => `합주실 화이트보드에 후보 이름이 빼곡하다.\n장르는 ${GENRE_INFO[c.band!.genre].label}. 포스터에, 티켓에, 언젠가 무대 뒤 현수막에 걸릴 이름.`,
    choices: [
      {
        // 조사는 이름 끝 글자에 맞춘다 (‘합주단’ → 으로, ‘클럽’ → 으로, ‘숲’ → 으로, ‘바다’ → 로)
        label: (c) => `${josa(c.band!.name, '으로/로').replace(c.band!.name, `〈${c.band!.name}〉`)} 간다`,
        run: (c) => {
          const b = c.band!;
          // 같은 밴드의 결성 기록은 한 번만
          if (c.flag(`named:${b.id}:${b.formedYear}`)) return '이름은 이미 정해져 있다.';
          c.set(`named:${b.id}:${b.formedYear}`);
          const g = GENRE_INFO[b.genre].label;
          c.chron(`밴드 〈${b.name}〉 결성 (${g})`, 'band');
          c.line(`밴드 〈${b.name}〉 결성!`, 'big');
          c.s.cine.push({ kind: 'band', scene: 'studio', kicker: `${c.year} · ${c.ageInt}세 · ${g}`, title: `〈${b.name}〉`, sub: c.members.length ? `${josa(c.members.map((m) => given(m.name)).join(', '), '과/와')} 함께 밴드를 시작했다.` : '이름부터 정했다. 이제 함께할 사람을 고를 차례.', at: c.s.time });
          return '화이트보드의 다른 이름들을 지웠다. 이제 이게 우리 이름이다.';
        },
      },
    ],
  },
];
