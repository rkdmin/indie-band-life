// 실존 밴드와 같은 무대에 서는 사건. 데이터는 data/era/acts.ts.
// 문장은 언제나 ‘내가’ 겪은 일이다 — 실존 인물의 말이나 행동은 지어내지 않는다.

import type { EventDef, Ctx } from '../ctx';
import { VENUES } from '../data/world';
import { BILLS, SCENES, TOURS, billAt, scenesAt, toursAt } from '../data/era/acts';
import { bandsAt } from '../data/era/bands';
import { hasMedia } from '../data/era/media';
import { genreLabel } from '../data/era/genres';
import type { CountryId } from '../data/countries';
import { playGig } from '../actions';
import { clamp } from '../rng';
import { josa } from '../korean';

const ct = (c: Ctx) => (c.p.country ?? 'KR') as CountryId;
const busy = (c: Ctx) => c.p.military === 'serving';
const bestSong = (c: Ctx) => Math.max(0, ...c.s.songs.map((x) => x.quality));
const list = (acts: string[]) => acts.join(' · ');

/** 같은 무대에 선 밴드를 엔딩용으로 모아 둔다: "1995|크라잉넛|홍대 앞 클럽 드럭;…" */
export function addShared(c: Ctx, acts: string[], where: string) {
  const prev = String(c.s.flags.sharedStages ?? '');
  const row = `${Math.floor(c.year)}|${acts.join(', ')}|${where}`;
  c.s.flags.sharedStages = prev ? `${prev};${row}` : row;
}

export function sharedStages(flags: Record<string, unknown>): { year: number; acts: string; where: string }[] {
  const raw = String(flags.sharedStages ?? '');
  if (!raw) return [];
  return raw.split(';').map((r) => {
    const [y, acts, where] = r.split('|');
    return { year: Number(y), acts, where };
  });
}

function festStage(c: Ctx): string {
  const b = BILLS.find((x) => x.id === c.vars.bl)!;
  c.set(`bill:${b.id}`);
  addShared(c, b.top, `${b.y} ${b.event}`);
  c.chron(`${b.y}년 ${b.event} — ${josa(b.top[0], '과/와')} 같은 라인업에 이름을 올렸다`, 'big');
  playGig(c, VENUES.find((v) => v.id === 'local_fest')!, true);
  return b.note ? `그해 ${b.note}. 우리는 그 페스티벌의 작은 무대에 섰다.` : '헤드라이너 이름 아래, 작은 글씨의 우리 이름. 그 포스터를 지금도 갖고 있다.';
}


/** 그 해에 노래를 처음 듣는 곳 (data/era/media.ts 기준) */
function heardOn(c: Ctx): string {
  const y = c.year;
  const k = ct(c);
  if (hasMedia('streaming', y, k)) return '스트리밍 추천 목록';
  if (hasMedia('mp3', y, k)) return '친구가 보내 준 MP3';
  if (hasMedia('cassette', y, k) && y < 1995) return c.age < 20 ? '친구가 녹음해 준 테이프' : '심야 라디오';
  if (hasMedia('cd', y, k)) return '레코드 가게 스피커';
  if (hasMedia('tv', y, k) && c.rng.chance(0.4)) return '텔레비전';
  return '라디오';
}

/** 내 나라 밴드 + 영미권 밴드(어느 나라에서든 들렸다) 중 그 해 활동하던 밴드 */
function audible(c: Ctx) {
  const mine = bandsAt(ct(c), c.year);
  const big = ct(c) === 'US' || ct(c) === 'UK' ? [] : [...bandsAt('US', c.year), ...bandsAt('UK', c.year)];
  return [...mine, ...mine, ...big].filter((b) => !c.flag(`heardBand:${b.name}`));
}

export const ACT_EVENTS: EventDef[] = [
  // ───────── 클럽 씬: 같은 포스터에 이름이 오른다 ─────────
  {
    id: 'a_scene_bill', scene: 'club', title: (c) => SCENES.find((x) => x.id === c.vars.sc)?.place ?? '그날의 포스터', chance: 0.45, cooldown: 3,
    when: (c) => !!c.band && !busy(c) && c.age >= 16 && c.age < 46 && c.p.fans >= 20 && c.p.fans < 20_000 && scenesAt(ct(c), c.year).some((x) => !c.flag(`scene:${x.id}`)),
    bind: (c) => {
      // 작은 클럽 합동 공연은 장르가 섞인다 — 같은 장르를 먼저 고르고, 없으면 아무나
      const all = scenesAt(ct(c), c.year).filter((x) => !c.flag(`scene:${x.id}`));
      const same = all.filter((x) => x.genres.includes(c.band!.genre));
      const opts = same.length ? same : all;
      if (!opts.length) return false;
      c.vars.sc = c.pick(opts).id;
      return true;
    },
    text: (c) => {
      const sc = SCENES.find((x) => x.id === c.vars.sc)!;
      return `${c.year}년, ${sc.place}.\n오늘 밤 공연 포스터에 ${list(sc.acts)} — 그리고 맨 아래 작은 글씨로 〈${c.band!.name}〉.`;
    },
    choices: [
      {
        label: '온 힘을 다해 무대에 선다',
        odds: (c) => c.dc(13, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['곡 완성도', Math.floor(c.m(bestSong(c)) / 2)], ['밴드 합', (c.band?.chemistry ?? 50) >= 65 ? 2 : 0]], '가정', '같은 밤 같은 무대 — 관객은 이미 뜨거워져 있다'),
        run: (c) => {
          const sc = SCENES.find((x) => x.id === c.vars.sc)!;
          c.set(`scene:${sc.id}`);
          c.band!.gigs++;
          if (c.check(c.choicesOdds!)) {
            c.fans(40 + c.p.fans * 0.06);
            c.rep(2);
            c.skill('stage', 3);
            addShared(c, sc.acts, sc.place);
            c.chron(`${Math.floor(c.year)}년 ${sc.place}, ${josa(list(sc.acts), '과/와')} 같은 포스터에 이름을 올렸다`, 'big');
            return '땀에 젖은 셔츠로 무대를 내려오는데, 다음 순서를 기다리던 관객들이 우리 노래 후렴을 흥얼거리고 있었다.';
          }
          c.fans(15);
          c.skill('stage', 1.5);
          addShared(c, sc.acts, sc.place);
          return '긴장해서 템포가 계속 빨라졌다. 우리 차례엔 다들 다음 밴드를 기다리는 눈치였다.';
        },
      },
      {
        label: '그들의 무대를 맨 앞에서 본다',
        run: (c) => {
          const sc = SCENES.find((x) => x.id === c.vars.sc)!;
          c.set(`scene:${sc.id}`);
          c.genre(c.band!.genre, 8);
          c.skill('compose', 2);
          c.theme('band');
          c.chron(`${sc.place}에서 ${sc.acts[0]}의 무대를 맨 앞에서 봤다`, 'music');
          return '스피커 바로 앞. 귀가 멍했지만 머릿속엔 새 곡의 리프가 맴돌았다.';
        },
      },
    ],
  },
  // ───────── 투어: 오프닝 무대 ─────────
  {
    id: 'a_support', scene: 'arena', title: (c) => `${TOURS.find((x) => x.id === c.vars.tr)?.act ?? ''} 공연 오프닝`, chance: 0.4, cooldown: 4,
    when: (c) => !!c.band && !busy(c) && c.age >= 17 && c.age < 46 && c.p.fans >= 400 && c.p.fans < 60_000 && c.s.songs.length >= 2 && toursAt(ct(c), c.year).some((x) => !c.flag(`tour:${x.id}`)),
    bind: (c) => {
      const all = toursAt(ct(c), c.year).filter((x) => !c.flag(`tour:${x.id}`));
      const same = all.filter((x) => x.genres.includes(c.band!.genre));
      const opts = same.length ? same : all;
      if (!opts.length) return false;
      c.vars.tr = c.pick(opts).id;
      return true;
    },
    text: (c) => {
      const t = TOURS.find((x) => x.id === c.vars.tr)!;
      return `공연 기획사에서 연락이 왔다.\n${t.act}의 공연 오프닝 무대에 설 밴드를 찾는다고 한다.\n관객은 우리를 모른다. 30분 안에 그들의 마음을 얻어야 한다.`;
    },
    choices: [
      {
        label: '오프닝 무대에 선다',
        odds: (c) => c.dc(15, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['곡 완성도', c.m(bestSong(c))], ['밴드 합', (c.band?.chemistry ?? 50) >= 70 ? 2 : (c.band?.chemistry ?? 50) < 40 ? -2 : 0]], '가정', '남의 관객 앞 — 오프닝 밴드는 대개 잊힌다'),
        run: (c) => {
          const t = TOURS.find((x) => x.id === c.vars.tr)!;
          c.set(`tour:${t.id}`);
          c.band!.gigs++;
          addShared(c, [t.act], `${t.act} 공연 오프닝`);
          const crit = c.preset?.crit === 'success';
          if (c.check(c.choicesOdds!)) {
            c.fans((crit ? 1200 : 400) + c.p.fans * (crit ? 0.25 : 0.1));
            c.rep(crit ? 10 : 6);
            c.band!.chemistry = clamp(c.band!.chemistry + 5);
            c.chron(`${t.act} 공연의 오프닝 무대에 섰다${crit ? ' — 앙코르 요청이 나왔다' : ''}`, 'big');
            c.s.cine.push({ kind: 'gig', scene: 'arena', kicker: `${Math.floor(c.year)} · ${c.ageInt}세`, title: `${t.act} 공연 오프닝`, sub: crit ? '오프닝 밴드에게 앙코르가 쏟아졌다.' : '모르는 얼굴들이 우리 후렴을 따라 부르기 시작했다.', at: c.s.time });
            return crit ? '마지막 곡이 끝나자 객석에서 앙코르가 터졌다. 오프닝 밴드에게는 거의 없는 일이다.' : '첫 곡엔 팔짱을 끼고 있던 관객들이 세 번째 곡부터 고개를 흔들기 시작했다.';
          }
          c.fans(60);
          c.chron(`${t.act} 공연의 오프닝 무대에 섰다`, 'band');
          return '관객 대부분은 아직 입구에 줄을 서 있었다. 그래도 그 무대에 섰다는 건 사실이다.';
        },
      },
      {
        label: '우리 공연에 집중한다',
        run: (c) => {
          c.set(`tour:${c.vars.tr}`);
          c.rep(-1);
          c.band!.chemistry = clamp(c.band!.chemistry + 2);
          return '“남의 무대보다 우리 무대.” 멤버들은 고개를 끄덕였지만, 다들 조금 아쉬운 얼굴이었다.';
        },
      },
    ],
  },
  // ───────── 페스티벌 라인업 (실제 그 회차) ─────────
  {
    id: 'a_fest_bill', scene: 'festival', title: (c) => { const b = BILLS.find((x) => x.id === c.vars.bl); return b ? `${b.y} ${b.event}` : '페스티벌'; }, chance: 0.9, priority: 126,
    when: (c) => { if (busy(c) || c.age < 15 || c.age >= 55) return false; const b = billAt(ct(c), c.year); return !!b && !c.flag(`bill:${b.id}`); },
    bind: (c) => {
      const b = billAt(ct(c), c.year);
      if (!b || c.flag(`bill:${b.id}`)) return false;
      c.vars.bl = b.id;
      return true;
    },
    text: (c) => {
      const b = BILLS.find((x) => x.id === c.vars.bl)!;
      const invited = !!c.band && c.p.fans >= 1500;
      const apply = !!c.band && c.p.fans >= 300;
      return `${b.y}년 ${b.event}.\n라인업 포스터 맨 위엔 ${list(b.top)}.\n${invited ? `그리고 맨 아래 작은 글씨로 — 〈${c.band!.name}〉. 섭외 연락이 왔다.` : apply ? '신인 무대 공모가 열렸다.' : '표를 구할 수 있을까?'}`;
    },
    choices: [
      {
        label: '섭외에 응한다',
        if: (c) => !!c.band && c.p.fans >= 1500,
        run: (c) => festStage(c),
      },
      {
        label: '신인 무대에 지원한다',
        if: (c) => !!c.band && c.p.fans >= 300 && c.p.fans < 1500,
        odds: (c) => c.dc(15, '섭외 판정', [['팬 규모', c.p.fans >= 1000 ? 1 : 0], ['무대', c.m(c.p.skills.stage)], ['곡 완성도', Math.floor(c.m(bestSong(c)) / 2)]], '가정', '신인 무대 공모는 경쟁이 세다'),
        run: (c) => {
          if (!c.check(c.choicesOdds!)) {
            c.set(`bill:${c.vars.bl}`);
            return '답장은 오지 않았다. 그해 여름, 우리는 관객석 맨 뒤에 있었다.';
          }
          return festStage(c);
        },
      },
      {
        label: '관객으로 간다',
        run: (c) => {
          const b = BILLS.find((x) => x.id === c.vars.bl)!;
          c.set(`bill:${b.id}`);
          c.money(-c.krw(150_000), '페스티벌 티켓');
          c.stat('happiness', 10);
          c.genre(c.band?.genre ?? 'indierock', 6);
          c.theme('dream');
          c.meet('fx', { metAt: `${b.y}년 ${b.event}`, career: 'musician', affinity: 20, skill: c.rng.int(25, 60) });
          c.chron(`${b.y}년 ${b.event}에서 ${b.top[0]}의 무대를 봤다`, 'music');
          return b.note ? `그해 ${b.note}. 그 자리에 있었다는 게 평생의 이야깃거리가 됐다.` : '수만 명 사이에서 같은 노래를 불렀다. 나도 언젠가 저 무대에.';
        },
      },
      { label: '이번엔 못 간다', run: (c) => { c.set(`bill:${c.vars.bl}`); return '나중에 그날 얘기를 들을 때마다 조금 아쉬웠다.'; } },
    ],
  },
  // ───────── 그 시절 흘러나오던 노래 ─────────
  {
    id: 'a_heard_band', scene: 'home', title: (c) => `${c.vars.band}의 노래`, cooldown: 2, chance: 0.4,
    when: (c) => c.age >= 8 && c.age < 40 && !busy(c) && audible(c).length > 0,
    bind: (c) => {
      const opts = audible(c);
      if (!opts.length) return false;
      const b = c.pick(opts);
      c.vars.band = b.name;
      c.vars.g = c.pick(b.genres);
      c.vars.on = heardOn(c);
      return true;
    },
    text: (c) => `${c.year}년. ${c.vars.on}에서 ${c.vars.band}의 노래가 흘러나왔다.\n${genreLabel(c.vars.g as never, c.year, ct(c))}. 처음 듣는 소리였다.`,
    choices: [
      {
        label: '그 밴드에 빠진다',
        run: (c) => {
          c.set(`heardBand:${c.vars.band}`);
          c.set('fanOf', String(c.vars.band));
          c.genre(c.vars.g as never, 10);
          c.skill('compose', 1.5);
          c.theme(c.age < 18 ? 'youth' : 'dream');
          c.chron(`${c.vars.band}의 노래에 빠졌다`, 'music');
          return c.age < 15 ? '방 벽에 그 밴드 이름을 적은 종이를 붙였다.' : '그 주 내내 같은 노래만 들었다. 그 소리를 내고 싶었다.';
        },
      },
      {
        label: '악기로 따라 쳐 본다',
        if: (c) => !!c.p.mainInst,
        odds: (c) => c.dc(12, '카피 판정', [['주 악기 실력', c.m(c.mainSkill)], ['리듬감', c.m(c.p.talents?.rhythm ?? 50)]], '가정'),
        run: (c) => {
          c.set(`heardBand:${c.vars.band}`);
          c.genre(c.vars.g as never, 5);
          if (c.check(c.choicesOdds!)) { c.skill(c.p.mainInst ?? 'guitar', 3.5); return '한 곡을 통째로 따라 쳤다. 손끝이 얼얼했다.'; }
          c.skill(c.p.mainInst ?? 'guitar', 1.5);
          return '도입부에서 막혔다. 그래도 매일 조금씩 늘었다.';
        },
      },
      { label: '그냥 흘려듣는다', run: (c) => { c.set(`heardBand:${c.vars.band}`); return '다들 그 노래 얘기뿐이었지만, 나는 다른 노래를 찾았다.'; } },
    ],
  },
  // ───────── 관객으로: 그 밴드의 공연 ─────────
  {
    id: 'a_concert', scene: 'arena', title: (c) => `${c.vars.band} 공연`, cooldown: 4, chance: 0.3,
    when: (c) => c.age >= 14 && c.age < 65 && !busy(c) && bandsAt(ct(c), c.year).some((b) => !c.flag(`saw:${b.name}`)),
    bind: (c) => {
      const fav = String(c.s.flags.fanOf ?? '');
      const opts = bandsAt(ct(c), c.year).filter((b) => !c.flag(`saw:${b.name}`));
      if (!opts.length) return false;
      const b = opts.find((x) => x.name === fav) ?? c.pick(opts);
      c.vars.band = b.name;
      c.vars.g = c.pick(b.genres);
      return true;
    },
    text: (c) => `${c.vars.band}의 공연 표를 구할 수 있을 것 같다.${c.s.flags.fanOf === c.vars.band ? '\n오래 좋아한 밴드다.' : ''}`,
    choices: [
      {
        label: '간다',
        run: (c) => {
          c.set(`saw:${c.vars.band}`);
          c.money(-c.krw(90_000), '공연 티켓');
          c.stat('happiness', 10);
          c.stat('stress', -6);
          c.genre(c.vars.g as never, 6);
          c.theme('dream');
          if (c.band) c.skill('stage', 2);
          c.chron(`${c.vars.band}의 공연을 보러 갔다`, 'music');
          return c.band ? '무대 위 그들의 동선과 조명을 몰래 메모했다. 다음 합주 때 다 따라 해 봤다.' : '앞사람 어깨 너머로 본 무대. 집에 오는 내내 귀가 울렸다.';
        },
      },
      { label: '돈이 없어 포기한다', run: (c) => { c.set(`saw:${c.vars.band}`); c.stat('happiness', -2); return '공연장 밖에서 새어 나오는 소리만 들었다.'; } },
    ],
  },
];
