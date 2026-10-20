// 나라 맞춤 문장: 한국 밖에서 태어난 인생에 한국 고유의 말(학원·노래방·소주·명절·반지하·홍대·경기·인천…)이 섞이지 않는다.

import { describe, expect, it } from 'vitest';
import { localize, replaceWithJosa, draftFor, monthsWord } from '../src/sim/data/localize';
import { periodText } from '../src/sim/data/anachronism';
import { newGame, runPeriodAuto } from '../src/sim/engine';
import type { GameState } from '../src/sim/types';

const KR_ONLY = /홍대|노래방|소주|포장마차|국밥|삼각김밥|삼겹살|명절|고3|반지하|서울살이|경기·인천|광역버스|전세|한국어 후렴|(?<!대)학원비/;

describe('나라 맞춤 문장', () => {
  it('바꾼 말에 조사를 맞춘다', () => {
    expect(localize('서울이 아니라 지구 반대편이다', 'BR')).toBe('상파울루가 아니라 지구 반대편이다');
    expect(localize('서울이 아니라 지구 반대편이다', 'US')).toBe('뉴욕이 아니라 지구 반대편이다');
    expect(localize('노래방에서 목이 쉬었다', 'JP')).toBe('카라오케에서 목이 쉬었다');
    expect(localize('처음 봤을 때가 고3이었어요', 'UK')).toBe('처음 봤을 때가 고등학생이었어요');
    expect(localize('대학원 입시와 학원 숙제', 'DE')).toBe('대학원 입시와 학교 숙제');
    // 한국은 그대로, 〈이름〉 안도 그대로
    expect(localize('노래방에서 〈반지하 비행〉을 불렀다', 'KR')).toBe('노래방에서 〈반지하 비행〉을 불렀다');
    expect(localize('〈반지하 비행〉의 반지하 공연', 'BR')).toBe('〈반지하 비행〉의 다락방 공연');
    // 조사로 보이지만 말의 일부인 경우(‘가게’)는 건드리지 않는다
    expect(replaceWithJosa('카세트테이프를 켰다, 카세트테이프가게', /카세트테이프/g, '카세트')).toBe('카세트를 켰다, 카세트가게');
  });

  it('시대 말 바꾸기도 조사를 맞춘다 (‘카세트을’ 같은 깨진 조사가 없다)', () => {
    for (const y of [1960, 1975, 1985, 1995, 2005]) {
      const t = periodText('녹음 앱을 켰다. 문자가 왔다.', y, 'KR');
      expect(t).not.toMatch(/[가-힣]*[^가-힣\s]?(카세트을|녹음기을|디지털 녹음기을)/);
    }
  });

  it('징병은 나라·시대마다 다르다', () => {
    expect(draftFor('KR', 2000)).not.toBeNull();
    expect(draftFor('JP', 1970)).toBeNull();
    expect(draftFor('US', 1968)).not.toBeNull();
    expect(draftFor('US', 1990)).toBeNull();
    expect(draftFor('UK', 1965)).toBeNull();
    expect(draftFor('DE', 2015)).toBeNull();
    expect(monthsWord(18)).toBe('1년 반');
    expect(monthsWord(24)).toBe('2년');
    expect(monthsWord(9)).toBe('9개월');
  });

  it('브라질·미국·영국·독일 인생에 한국 고유의 말이 나오지 않는다', () => {
    const bad: string[] = [];
    const scan = (s: GameState, text: string | undefined) => {
      const m = text?.match(KR_ONLY);
      if (m) bad.push(`${s.player.country} ${Math.floor(s.time)} [${m[0]}] ${text!.replace(/\n/g, ' ').slice(0, 90)}`);
    };
    for (const ct of ['BR', 'US', 'UK', 'DE'] as const) {
      for (let i = 0; i < 6; i++) {
        let s = newGame({ name: '하늘 테스트', gender: i % 2 ? 'm' : 'f', birthYear: 1955 + i * 11, seed: 70000 + i * 17, country: ct });
        let g = 0;
        while (s.phase !== 'ending' && g++ < 400) {
          s = runPeriodAuto(s, (st) => {
            const a = st.active!;
            scan(st, `${a.title}\n${a.text}`);
            for (const c of a.choices) if (!c.hidden) [c.label, c.lock, c.why, c.card?.title, c.card?.sub, c.card?.data].forEach((x) => scan(st, x));
            return a.choices.findIndex((c) => !c.disabled && !c.hidden);
          });
        }
        for (const f of s.feed) scan(s, f.text);
        for (const c of s.chronicle) scan(s, c.text);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 120_000);
});
