// 선택지 없는 작은 순간들. 인생 기록이 숫자가 아니라 ‘살아지는 것’처럼 보이게 한다.
// 조건이 맞는 줄 중에서 무작위로 고른다. 실존 인물·브랜드 금지.

import type { GameState } from './types';
import type { Rng } from './rng';
import { age } from './state';
import { given, josa } from './korean';
import { textMinYear } from './data/anachronism';
import { eraLines } from './data/era/life';
import type { CountryId } from './data/countries';
import { isFresh, livingCost, remember } from './state';
import { priceIndex } from './data/world';
import moreJson from '../data/text/flavor_more.json';

type More = { t: string; age?: [number, number]; band?: boolean; solo?: boolean; fans?: [number, number]; broke?: boolean; rich?: boolean; job?: string; from?: number; to?: number; c?: string[] };
const MORE = moreJson.data as More[];
/** 지금 처지(돈·팬·직업·밴드·나라)에 맞는 줄 */
function situational(s: GameState, a: number): string[] {
  const p = s.player;
  const rich = p.money > livingCost(s, priceIndex(s.time)) * 4;
  const ct = p.country ?? 'KR';
  return MORE.filter(
    (l) =>
      (!l.age || (a >= l.age[0] && a < l.age[1])) &&
      (!l.band || !!s.band) &&
      (!l.solo || !s.band) &&
      (!l.fans || (p.fans >= l.fans[0] && p.fans < l.fans[1])) &&
      (!l.broke || p.money < 0) &&
      (!l.rich || rich) &&
      (!l.job || p.job === l.job) &&
      (!l.from || s.time >= l.from) &&
      (!l.to || s.time <= l.to) &&
      (!l.c || l.c.includes(ct)),
  ).map((l) => l.t);
}

type Flavor = { when: (s: GameState, a: number) => boolean; lines: string[] };

const friendName = (s: GameState, rng: Rng) => {
  const f = Object.values(s.npcs).filter((n) => n.alive && n.role !== 'parent' && n.affinity > 20);
  return f.length ? given(rng.pick(f).name) : null;
};

const FLAVORS: Flavor[] = [
  { when: (_, a) => a < 1, lines: ['처음으로 뒤집기에 성공했다.', '밤마다 우는 통에 온 가족이 잠을 설쳤다.', '모빌을 한참 바라보며 옹알이를 했다.', '엄마의 콧노래를 들으면 울음을 그쳤다.'] },
  { when: (_, a) => a >= 1 && a < 3, lines: ['첫걸음마를 뗐다. 세 걸음 만에 주저앉았다.', '“엄마”보다 “빠빠”를 먼저 말했다.', '냄비 뚜껑을 두드리며 깔깔 웃었다.', '텔레비전에서 노래가 나오면 엉덩이를 흔들었다.'] },
  { when: (_, a) => a >= 3 && a < 7, lines: ['어린이집 소풍에서 장기자랑 노래를 불렀다.', '동요를 개사해서 부르는 버릇이 생겼다.', '할머니 댁 마당에서 하루 종일 뛰어놀았다.', '피아노 학원 간판 앞에서 한참 서 있었다.', '세발자전거를 처음 탔다.'] },
  { when: (_, a) => a >= 7 && a < 13, lines: ['받아쓰기 100점을 받았다.', '방학 숙제를 개학 전날 몰아서 했다.', '학교 앞 문방구에서 뽑기를 했다. 꽝이었다.', '리코더 시험에서 삑사리를 냈다.', '운동회 계주에서 바통을 놓쳤다.', '음악 시간에 처음으로 선생님께 칭찬받았다.', '라디오에서 나온 노래 제목을 몰라 하루 종일 흥얼거렸다.'] },
  { when: (_, a) => a >= 13 && a < 19, lines: ['야자 시간에 이어폰을 몰래 꽂았다.', '시험이 끝난 날, 노래방에서 목이 쉬었다.', '체육복을 안 가져와서 혼났다.', '새벽 두 시까지 기타 영상을 돌려 봤다.', '첫 용돈으로 산 이어폰 한쪽이 고장 났다.', '수학여행 버스에서 다 같이 떼창을 했다.', '교복 소매 끝이 기타 줄 때문에 해졌다.', '좋아하는 밴드의 라이브 영상을 백 번째 다시 봤다.'] },
  { when: (s, a) => a >= 13 && a < 19 && !!s.band, lines: ['합주 끝나고 편의점 앞에서 컵라면을 먹었다.', '음악실 열쇠를 빌리려고 선생님께 아부했다.', '축제 셋리스트를 두고 밤새 단톡방이 시끄러웠다.'] },
  { when: (s, a) => a >= 19 && a < 30 && s.player.military !== 'serving', lines: ['막차를 놓쳐 첫차를 기다렸다.', '월세 날짜가 다가오자 잔고를 세 번 확인했다.', '편의점 도시락으로 저녁을 때웠다.', '새벽에 쓴 가사를 아침에 읽고 지웠다.', '동네 고양이에게 이름을 붙여 줬다.', '봄비가 오는 날, 우산 없이 합주실까지 뛰었다.', '친구 자취방에서 밤새 음악 얘기를 했다.', '중고 거래로 이펙터를 샀다. 판매자도 밴드를 한다고 했다.'] },
  { when: (s, a) => a >= 19 && !!s.band && s.player.military !== 'serving', lines: ['합주실 에어컨이 또 고장 났다.', '베이스 앰프에서 이상한 잡음이 났다.', '공연 포스터를 직접 그려서 붙였다.', '뒤풀이에서 처음 보는 밴드와 연락처를 주고받았다.', '1톤 트럭에 앰프를 싣다가 허리를 삐끗했다.', '셋리스트 순서로 멤버들과 한 시간을 싸웠다.', '굿즈 택배를 밤새 포장했다.', '연습 영상을 올렸더니 모르는 사람이 댓글을 달았다.', '드럼 스틱이 또 부러졌다. 이번 달만 세 번째.', '합주실 사장님이 남은 시간을 서비스로 줬다.', '케이블 한 줄이 말썽이라 리허설이 한 시간 밀렸다.', '멤버 생일에 합주실에서 컵케이크를 나눠 먹었다.', '새 이펙터 소리에 다들 한참 웃었다.', '공연 사진 속 내 표정이 너무 진지했다.', '첫차를 기다리며 밴드 이름을 다시 지을까 진지하게 고민했다.', '데모 테이프 라벨을 손으로 하나하나 썼다.', '공연장 화장실 거울 앞에서 가사를 중얼거렸다.', '빗속 공연. 관객 열 명이 끝까지 우산을 쓰고 있었다.', '오래된 기타 줄을 갈았더니 소리가 달라졌다.', '공연 끝나고 관객 한 명이 손편지를 건넸다.'] },
  { when: (s) => s.player.military === 'serving', lines: ['불침번을 서며 머릿속으로 곡을 썼다.', '휴가 날짜를 손가락으로 세었다.', '생활관 라디오에서 아는 노래가 나왔다.', 'PX에서 산 초코파이를 나눠 먹었다.', '행군 중에 속으로 드럼 비트를 셌다.'] },
  { when: (_, a) => a >= 30 && a < 45, lines: ['동창 결혼식에서 오랜만에 친구들을 만났다.', '허리가 예전 같지 않다는 걸 처음 느꼈다.', '명절에 “그래서 앞으로 뭐 할 거니”라는 말을 들었다.', '새벽 세 시에 깨서 옛날 노래를 들었다.', '처음으로 건강검진 결과지를 꼼꼼히 읽었다.', '이사하며 오래된 공연 티켓 뭉치를 발견했다.'] },
  { when: (_, a) => a >= 45 && a < 65, lines: ['돋보기 없이는 악보가 잘 안 보이기 시작했다.', '후배 밴드의 공연에 몰래 가서 맨 뒤에 섰다.', '아침 산책이 습관이 됐다.', '오래된 기타의 넥을 손봤다.', '라디오에서 옛 동료의 노래가 흘러나왔다.', '흰머리를 세다가 포기했다.'] },
  { when: (_, a) => a >= 65, lines: ['손주에게 기타 코드 세 개를 가르쳤다.', '동네 공원 벤치에서 하모니카를 불었다.', '오래된 사진첩을 넘기다 한참을 웃었다.', '병원 대기실에서 옛날 노래를 흥얼거렸다.', '창가에 앉아 비 오는 소리를 들었다.'] },
];

const FRIEND_LINES: ((f: string) => string)[] = [
  (f) => `${f}에게서 안부 문자가 왔다.`,
  (f) => `${josa(f, '과/와')} 오랜만에 통화했다.`,
  (f) => `${f}의 SNS에서 옛날 사진을 봤다.`,
  (f) => `길에서 ${josa(f, '을/를')} 닮은 사람을 봤다.`,
];

export function flavorLines(s: GameState, rng: Rng): string[] {
  const a = age(s);
  const recentAll = new Set(s.feed.slice(-300).map((e) => e.text));
  const pool = [...FLAVORS.filter((f) => f.when(s, a)).flatMap((f) => f.lines), ...(a >= 13 ? situational(s, a) : [])].filter((l) => textMinYear(l, s.player.country) <= s.time && !recentAll.has(l) && isFresh(s, l));
  const out: string[] = [];
  const n = a < 7 ? 2 : rng.chance(0.6) ? 2 : 1;
  // 그 시대·그 나라에서만 자연스러운 순간 (data/era/life.ts) 이 있으면 자주 섞는다
  const recent = new Set(s.feed.slice(-300).map((e) => e.text));
  const era = eraLines(s.time, a, (s.player.country ?? 'KR') as CountryId, !!s.band).filter((l) => !recent.has(l) && isFresh(s, l));
  for (let i = 0; i < n && (pool.length || era.length); i++) {
    const line = era.length && (rng.chance(0.4) || !pool.length) ? rng.pick(era) : rng.pick(pool);
    if (!out.includes(line)) {
      out.push(line);
      remember(s, line);
    }
  }
  if (a >= 13 && rng.chance(0.25)) {
    const f = friendName(s, rng);
    if (f) out.push(rng.pick(FRIEND_LINES)(f));
  }
  return out;
}
