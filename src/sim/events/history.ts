// 음악사 사건. 그 해에 실제로 일어난 일 위에서 내 인생이 흘러간다.
//  - 영향: 라디오에서 실제 명반이 흘러나오고, 그 소리에 빠지면 장르 친숙도와 곡 주제가 생긴다
//  - 물결: 그런지·브릿팝·조선 펑크처럼 실제로 있었던 유행의 한복판에 내 밴드가 서면, 언론이 ‘제2의 ○○’라 부를 기회
//  - 현장: 1995년 홍대 앞 추모공연, 1999년 폭우 속 페스티벌처럼 실제 사건 속에 들어간다
// 실존 음악가는 발매·공연 같은 사실로만 등장한다. 그들의 말이나 행동은 지어내지 않는다.

import type { EventDef, Ctx } from '../ctx';
import type { Genre } from '../types';
import { GENRE_INFO, VENUES } from '../data/world';
import { HISTORY, activeWave, historyBetween, type HistoryItem } from '../data/history';
import type { CountryId } from '../data/countries';
import { playGig } from '../actions';
import { BILLS } from '../data/era/acts';

const ONE_OFF = new Set(['대학가요제', '부도칸 공연', '라이브 에이드', '우드스톡']);

/** 올해 내 나라에서 처음 열린 페스티벌 — 라인업 데이터가 있는 회차는 a_fest_bill 이, 대학가요제는 h_kr_campus 가 맡는다 */
function firstFest(c: Ctx): HistoryItem | undefined {
  const k = (c.p.country ?? 'KR') as CountryId;
  return HISTORY.find(
    (h) =>
      h.kind === 'festival' && !!h.name && h.c === k && Math.floor(c.year) === h.y && !c.flag(`fest:${h.name}`) &&
      !ONE_OFF.has(h.name) && !HISTORY.some((o) => o.name === h.name && o.y < h.y) && !BILLS.some((b) => b.c === h.c && b.y === h.y),
  );
}
import { clamp } from '../rng';
import { josa } from '../korean';

const ct = (c: Ctx) => (c.p.country ?? 'KR') as CountryId;
const keyOf = (h: HistoryItem) => `${h.y}:${h.who ?? h.name ?? h.text.slice(0, 8)}`;
const item = (c: Ctx) => HISTORY[Number(c.vars.h)];
const busy = (c: Ctx) => c.p.military === 'serving';

/** 그 시절 음악을 듣던 곳 */
function listenPlace(y: number): string {
  if (y < 1975) return '친구 형 방의 전축';
  if (y < 1990) return '심야 라디오';
  if (y < 2000) return '레코드 가게 스피커';
  if (y < 2010) return 'MP3 플레이어';
  return '스트리밍 추천 목록';
}

function influences(c: Ctx): HistoryItem[] {
  return historyBetween(c.year - 1.5, c.year + 0.01, (c.p.country ?? 'KR') as CountryId).filter((h) => h.kind === 'release' && h.who && h.genre && !c.flag(`heard:${h.y}:${h.who}`));
}

function bestSong(c: Ctx) {
  return Math.max(0, ...c.s.songs.map((x) => x.quality));
}

export const HISTORY_EVENTS: EventDef[] = [
  // ───────── 영향: 그 해의 명반 ─────────
  {
    id: 'h_influence', scene: 'home', title: (c) => `${item(c).y}년, 그 음반`, cooldown: 2, chance: 0.45,
    when: (c) => c.age >= 9 && c.age < 32 && !busy(c) && influences(c).length > 0,
    bind: (c) => {
      const hits = historyBetween(c.year - 1.5, c.year + 0.01, ct(c)).filter((h) => h.kind === 'release' && h.who && h.genre && !c.flag(`heard:${keyOf(h)}`));
      if (!hits.length) return false;
      const h = c.pick(hits);
      c.vars.h = HISTORY.indexOf(h);
      return true;
    },
    text: (c) => {
      const h = item(c);
      return `${h.text}\n그 소리가 ${listenPlace(h.y)}에서 처음 흘러나왔다.`;
    },
    choices: [
      {
        label: '완전히 빠진다',
        run: (c) => {
          const h = item(c);
          c.set(`heard:${keyOf(h)}`);
          c.genre(h.genre as Genre, 12);
          c.skill('compose', 2);
          c.set('influence', h.who!);
          c.theme(h.genre === 'punk' || h.genre === 'metal' ? 'rage' : 'dream');
          c.chron(`${h.y}년, ${h.who}의 음반에 빠졌다`, 'music');
          return c.age < 15 ? '테이프가 늘어질 때까지 들었다. 방문을 닫고 거울 앞에서 기타 치는 시늉을 했다.' : '그날 밤 잠이 오지 않았다. 나도 이런 소리를 내고 싶었다.';
        },
      },
      {
        label: '악기를 들고 따라 쳐 본다',
        if: (c) => !!c.p.mainInst,
        odds: (c) => c.dc(12, '카피 판정', [['주 악기 실력', c.m(c.mainSkill)], ['리듬감', c.m(c.p.talents?.rhythm ?? 50)]], '가정'),
        run: (c) => {
          const h = item(c);
          c.set(`heard:${keyOf(h)}`);
          c.genre(h.genre as Genre, 6);
          if (c.check(c.choicesOdds!)) { c.skill(c.p.mainInst ?? 'guitar', 4); return '한 곡을 통째로 따라 쳤다. 손끝이 얼얼했다.'; }
          c.skill(c.p.mainInst ?? 'guitar', 1.5);
          return '도입부에서 막혔다. 그래도 매일 조금씩 늘었다.';
        },
      },
      { label: '내 취향은 아니다', run: (c) => { c.set(`heard:${keyOf(item(c))}`); return '다들 그 얘기뿐이었지만, 나는 다른 노래를 찾았다.'; } },
    ],
  },
  // ───────── 물결: 그 시대의 주인공이 될 기회 ─────────
  {
    id: 'h_wave', scene: 'club', title: (c) => activeWave(ct(c), c.year, c.band?.genre)?.name ?? '물결', priority: 135, chance: 0.7,
    when: (c) => {
      if (!c.band || busy(c) || c.age < 16 || c.age > 42 || c.p.fans < 30 || c.p.fans >= 80_000) return false;
      const w = activeWave(ct(c), c.year, c.band.genre);
      return !!w && !c.flag(`wave:${w.id}`) && c.s.songs.length >= 2;
    },
    text: (c) => {
      const w = activeWave(ct(c), c.year, c.band!.genre)!;
      return `${c.year}년. ${w.text}\n지금 〈${c.band!.name}〉의 소리가 딱 그 소리다. 물결이 우리 쪽으로 오고 있다.`;
    },
    choices: [
      {
        label: '물결에 올라탄다 — 쇼케이스 공연',
        odds: (c) => {
          const w = activeWave(ct(c), c.year, c.band!.genre)!;
          return c.dc(15, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['곡 완성도', c.m(bestSong(c))], ['밴드 합', (c.band?.chemistry ?? 50) >= 65 ? 2 : 0], ['물결의 힘', 2]], '가정', `${w.ref} 같은 밴드가 주목받던 시기 — 비슷한 소리를 찾는 사람이 많았다`);
        },
        run: (c) => {
          const w = activeWave(ct(c), c.year, c.band!.genre)!;
          c.set(`wave:${w.id}`);
          const crit = c.preset?.crit === 'success';
          if (c.check(c.choicesOdds!)) {
            const gain = (c.p.fans * (crit ? 1.2 : 0.6) + (crit ? 9000 : 3500)) * c.country.marketMul;
            c.fans(gain);
            c.rep(crit ? 12 : 7);
            c.band!.chemistry = clamp(c.band!.chemistry + 6);
            c.set('rodeWave', w.id);
            c.chron(`${w.name}의 한가운데 — 음악 잡지가 〈${c.band!.name}〉${josa(c.band!.name, '을/를').slice(c.band!.name.length)} ‘제2의 ${w.ref}’라 불렀다`, 'big');
            c.theme('band');
            return crit ? `기사 제목은 ‘제2의 ${w.ref}’. 다음 날 공연은 표가 10분 만에 동났다.` : `공연장 맨 뒤에 레이블 사람들이 서 있었다. 다음 주 음악 잡지 한 귀퉁이에 우리 이름이 실렸다 — ‘제2의 ${w.ref}?’`;
          }
          c.fans(150 + c.p.fans * 0.05);
          return '좋은 공연이었다. 하지만 그날 밤의 주인공은 다른 밴드였다. 물결은 그들을 태우고 지나갔다.';
        },
      },
      {
        label: '유행은 따르지 않는다',
        run: (c) => {
          const w = activeWave(ct(c), c.year, c.band!.genre)!;
          c.set(`wave:${w.id}`);
          c.rep(2);
          c.theme('rage');
          return '모두가 그 소리를 낼 때, 우리는 우리 소리를 냈다. 몇 년 뒤 그게 더 오래 남았다.';
        },
      },
    ],
  },
  {
    id: 'h_wave_switch', scene: 'studio', title: '다들 그 소리를 낸다', chance: 0.35,
    when: (c) => {
      if (!c.band || busy(c) || c.age < 16 || c.age > 40) return false;
      const w = activeWave(ct(c), c.year, undefined);
      return !!w && !w.genres.includes(c.band.genre) && !c.flag(`waveSw:${w.id}`);
    },
    text: (c) => {
      const w = activeWave(ct(c), c.year, undefined)!;
      return `${w.name}. ${w.text}\n합주가 끝나고 멤버 하나가 말했다. “우리도 ${GENRE_INFO[w.genres[0]].label} 해 보면 어때?”`;
    },
    choices: [
      {
        label: (c) => `${GENRE_INFO[activeWave(ct(c), c.year, undefined)!.genres[0]].label}${josa(GENRE_INFO[activeWave(ct(c), c.year, undefined)!.genres[0]].label, '으로/로').slice(GENRE_INFO[activeWave(ct(c), c.year, undefined)!.genres[0]].label.length)} 방향을 튼다`,
        run: (c) => {
          const w = activeWave(ct(c), c.year, undefined)!;
          c.set(`waveSw:${w.id}`);
          c.band!.genre = w.genres[0];
          c.band!.chemistry = clamp(c.band!.chemistry - 8);
          c.genre(w.genres[0], 8);
          for (const m of c.members) if (m.genre !== w.genres[0]) m.sat = clamp((m.sat ?? 60) - 12);
          c.chron(`${w.name}에 맞춰 ${GENRE_INFO[w.genres[0]].label}${josa(GENRE_INFO[w.genres[0]].label, '으로/로').slice(GENRE_INFO[w.genres[0]].label.length)} 장르를 바꿨다`, 'band');
          return '첫 합주는 어색했다. 원래 장르를 좋아하던 멤버의 표정이 굳었다.';
        },
      },
      { label: '우리 장르를 지킨다', run: (c) => { c.set(`waveSw:${activeWave(ct(c), c.year, undefined)!.id}`); c.band!.chemistry = clamp(c.band!.chemistry + 3); return '“유행은 지나가도 우리는 남는다.” 다들 고개를 끄덕였다.'; } },
    ],
  },
  // ───────── 현장: 처음 열린 페스티벌 ─────────
  {
    id: 'h_first_fest', scene: 'festival', title: (c) => `제1회 ${item(c).name}`, priority: 125, chance: 0.8, cooldown: 1,
    when: (c) => c.age >= 15 && c.age < 50 && !busy(c) && !!firstFest(c),
    bind: (c) => {
      const f = firstFest(c);
      if (!f) return false;
      c.vars.h = HISTORY.indexOf(f);
      return true;
    },
    text: (c) => `${item(c).text}\n${c.band && c.p.fans >= 300 ? `〈${c.band.name}〉에게도 신인 무대 공모 소식이 들려왔다.` : '표를 구할 수 있을까?'}`,
    choices: [
      {
        label: '신인 무대에 지원한다',
        if: (c) => !!c.band && c.p.fans >= 300,
        odds: (c) => c.dc(14, '섭외 판정', [['팬 규모', c.p.fans >= 3000 ? 3 : c.p.fans >= 1000 ? 1 : 0], ['무대', c.m(c.p.skills.stage)], ['곡 완성도', Math.floor(c.m(bestSong(c)) / 2)]], '가정', '첫 회 페스티벌은 신인 자리가 좁다'),
        run: (c) => {
          const h = item(c);
          c.set(`fest:${h.name}`);
          if (!c.check(c.choicesOdds!)) return '답장은 오지 않았다. 그해 여름, 우리는 관객석 맨 뒤에 있었다.';
          c.chron(`${h.y}년 제1회 ${h.name} 무대에 섰다`, 'big');
          if (h.storm) {
            c.fans(400 + c.p.fans * 0.15);
            c.rep(5);
            c.stat('health', -3);
            c.theme('band');
            return '첫날 무대는 진흙탕 속에서 끝났다. 다음 날 폭풍우로 남은 일정이 취소됐다. 그래도 그 진흙 속 관객들의 얼굴은 평생 잊지 못한다.';
          }
          playGig(c, VENUES.find((v) => v.id === 'local_fest')!, true);
          return '역사의 첫 페이지에 우리 이름이 작게 적혔다.';
        },
      },
      {
        label: '관객으로 간다',
        run: (c) => {
          const h = item(c);
          c.set(`fest:${h.name}`);
          c.money(-c.krw(150_000), '페스티벌 티켓');
          c.stat('happiness', 10);
          c.genre(c.band?.genre ?? 'indierock', 5);
          c.meet('fx', { metAt: `${h.y}년 ${h.name}`, career: 'musician', affinity: 20, skill: c.rng.int(25, 60) });
          c.chron(`${h.y}년 제1회 ${h.name}에 관객으로 갔다`, 'music');
          return h.storm ? '비에 젖은 채로 끝까지 버텼다. 옆에서 같이 버틴 사람과 연락처를 주고받았다.' : '수만 명이 같은 노래를 불렀다. 나도 언젠가 저 무대에.';
        },
      },
      { label: '이번엔 못 간다', run: (c) => { c.set(`fest:${item(c).name}`); return '뉴스로만 봤다.'; } },
    ],
  },
  // ───────── 한국 음악사의 현장 ─────────
  {
    id: 'h_kr_8army', scene: 'club', title: '미8군 클럽 오디션', once: true, chance: 0.35, minYear: 1957, maxYear: 1975,
    when: (c) => ct(c) === 'KR' && c.age >= 17 && c.age < 35 && !!c.p.mainInst && !busy(c),
    text: () => '미군 부대 클럽 무대에 서는 오디션이 열린다. 심사 등급에 따라 출연료가 달라진다.\n당시 한국에서 밴드 음악을 가장 많이 연주하던 곳이다.',
    choices: [
      {
        label: '오디션을 본다',
        odds: (c) => c.dc(14, '실기 판정', [['주 악기 실력', c.m(c.mainSkill)], ['팝 레퍼토리', c.m(c.p.skills.stage)]], '근사', '미8군 쇼 무대는 등급 심사를 거쳐 출연했다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            c.money(c.krw(2_500_000), '미8군 무대 출연료');
            c.skill(c.p.mainInst ?? 'guitar', 4);
            c.skill('stage', 3);
            c.genre('indierock', 6);
            c.chron('미8군 클럽 오디션 합격 — 매일 밤 미군 앞에서 팝을 연주했다', 'music');
            return '하루에 세 번 무대. 손이 부르텄지만 귀가 트였다.';
          }
          c.stat('stress', 5);
          return '등급 미달. 레퍼토리를 더 외워 오라는 말을 들었다.';
        },
      },
      { label: '음악다방에서 통기타를 친다', run: (c) => { c.genre('folk', 8); c.skill('vocal', 2); c.theme('night'); return '연기 자욱한 다방 구석, 손님 몇이 고개를 끄덕였다.'; } },
    ],
  },
  {
    id: 'h_kr_1975', scene: 'office', title: '금지곡의 해', once: true, chance: 1, priority: 140, minYear: 1975.4, maxYear: 1976.5,
    when: (c) => ct(c) === 'KR' && c.age >= 15 && (c.s.songs.length > 0 || !!c.band),
    text: () => '정부가 ‘공연활동 정화대책’을 발표했다. 신문마다 금지곡 목록이 실렸다.\n‘퇴폐’, ‘불신 조장’ — 이유는 다양했다. 우리 노래도 심의를 받아야 한다.',
    choices: [
      { label: '가사를 고쳐서 낸다', run: (c) => { c.rep(-1); c.stat('stress', 6); c.theme('rage'); c.set('censored'); return '빨간 줄이 그어진 가사지를 한참 바라봤다. 하고 싶은 말은 노래 밑으로 숨었다.'; } },
      {
        label: '그대로 부른다',
        odds: (c) => c.fromP(0.55, '심의 판정', '1975년 6~10월에만 223곡이 금지됐다'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) { c.rep(3); c.theme('rage'); return '다행히 목록에서 빠졌다. 공연장의 박수가 유난히 컸다.'; }
          c.fans(-Math.round(c.p.fans * 0.3));
          c.stat('happiness', -12);
          c.chron('우리 노래가 금지곡이 됐다', 'big');
          c.theme('rage');
          return '방송에서도 무대에서도 그 노래를 부를 수 없게 됐다.';
        },
      },
    ],
  },
  {
    id: 'h_kr_campus', scene: 'festival', title: '대학가요제', once: true, chance: 0.5, priority: 115, minYear: 1977.5, maxYear: 2012,
    when: (c) => ct(c) === 'KR' && c.age >= 18 && c.age < 26 && (c.p.edu === 'univ' || c.p.edu === 'music_univ') && c.s.songs.length > 0 && !busy(c),
    text: (c) => `${c.year}년 대학가요제 예선 공고가 붙었다.${c.year < 1995 ? '\n본선 무대는 전국에 생방송된다. 여기서 스타가 나온다.' : '\n예전만큼은 아니지만, 아직 꿈의 무대다.'}`,
    choices: [
      {
        label: '자작곡으로 나간다',
        odds: (c) => c.dc(16, '본선 판정', [['곡 완성도', c.m(bestSong(c))], ['보컬', Math.floor(c.m(c.p.skills.vocal) / 2)], ['무대', Math.floor(c.m(c.p.skills.stage) / 2)]], '가정', '전국 대학에서 예선을 거쳐 본선 10여 팀'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            const big = c.year < 1995;
            c.fans(big ? 8000 : 1500);
            c.rep(big ? 10 : 5);
            c.chron(`${c.year}년 대학가요제 입상`, 'big');
            const champ = HISTORY.find((h) => h.name === '대학가요제' && h.y === Math.floor(c.year) && h.c === 'KR');
            if (champ) c.line(`그해 ${champ.text.replace(/^제\d+회 [^.]*\. /, '')}`, 'neutral');
            return big ? '다음 날부터 라디오에서 우리 노래가 나왔다. 동네 레코드 가게 주인이 알아봤다.' : '입상. 학교 게시판에 이름이 붙었다.';
          }
          c.skill('stage', 2);
          return '예선 탈락. 대기실에서 만난 다른 학교 팀과 술잔을 기울였다.';
        },
      },
      { label: '구경만 한다', run: (c) => { c.stat('happiness', 4); c.genre('folk', 4); } },
    ],
  },
  {
    id: 'h_kr_1995', scene: 'club', title: '1995년 4월, 홍대 앞 클럽', once: true, chance: 1, priority: 145, minYear: 1995.1, maxYear: 1995.6,
    when: (c) => ct(c) === 'KR' && c.age >= 14 && c.age < 40 && !busy(c),
    text: () => '홍대 앞 작은 클럽에서 커트 코베인 1주기 추모공연이 열린다고 한다.\n훗날 사람들은 이날을 한국 인디 신이 시작된 날로 꼽는다.',
    choices: [
      {
        label: '우리도 무대에 서겠다고 한다',
        if: (c) => !!c.band,
        odds: (c) => c.dc(12, '무대 판정', [['무대', c.m(c.p.skills.stage)], ['밴드 합', (c.band?.chemistry ?? 50) >= 60 ? 2 : 0]], '가정'),
        run: (c) => {
          if (c.check(c.choicesOdds!)) {
            c.fans(120);
            c.rep(5);
            c.genre('punk', 8);
            c.set('day1Indie');
            c.chron('1995년 4월, 한국 인디의 첫날로 불리는 그 무대에 섰다', 'big');
            c.theme('band');
            return '땀으로 젖은 지하 클럽. 관객이 무대로 올라와 같이 뛰었다. 뭔가 시작되고 있었다.';
          }
          return '순서가 밀려 결국 못 올라갔다. 그래도 그 방 안에 있었다.';
        },
      },
      { label: '관객으로 간다', run: (c) => { c.genre('punk', 10); c.genre('indierock', 6); c.theme('rage'); c.meet('pk', { metAt: '1995년 홍대 앞 추모공연', career: 'musician', inst: 'drums', affinity: 25, skill: c.rng.int(30, 55) }); c.chron('1995년 4월, 홍대 앞 클럽의 추모공연에 갔다', 'music'); return '천장이 낮은 지하. 스피커가 찢어질 듯 울렸다. 옆에서 같이 뛰던 드러머와 친구가 됐다.'; } },
      { label: '그런 데는 무섭다', run: () => '나중에 그날 얘기를 들을 때마다 조금 후회했다.' },
    ],
  },
  {
    id: 'h_kr_1996', scene: 'street', title: '스트리트 펑크쇼', once: true, chance: 1, priority: 140, minYear: 1996.3, maxYear: 1996.7,
    when: (c) => ct(c) === 'KR' && !!c.band && (c.band.genre === 'punk' || c.band.genre === 'indierock') && c.age >= 15 && c.age < 40 && !busy(c),
    text: () => '홍대와 명동 거리 한복판에서 펑크 밴드들이 공연을 한다. 허가도 무대도 없다.\n“우리도 끼워 줘.”',
    choices: [
      { label: '거리로 나간다', odds: (c) => c.dc(11, '배짱 판정', [['무대', c.m(c.p.skills.stage)]], '가정'), run: (c) => { if (c.check(c.choicesOdds!)) { c.fans(250); c.rep(4); c.chron('1996년 거리의 스트리트 펑크쇼에 섰다', 'band'); return '지나가던 사람들이 멈춰 섰다. 경찰이 오기 전까지 다섯 곡.'; } c.fans(40); return '앰프가 꺼졌다. 마지막 곡은 육성으로 불렀다.'; } },
      { label: '클럽 공연에 집중한다', run: (c) => { c.skill('stage', 2); } },
    ],
  },
  {
    id: 'h_kr_2005', scene: 'home', title: '방송 사고 이후', once: true, chance: 1, priority: 140, minYear: 2005.6, maxYear: 2006.5,
    when: (c) => ct(c) === 'KR' && !!c.band && c.p.fans >= 150 && !busy(c),
    text: () => '음악 방송 생방송 사고 이후, 인디 밴드의 방송 출연 길이 막혔다.\n클럽 관객도 눈에 띄게 줄었다. 씬 전체가 겨울을 맞았다.',
    choices: [
      { label: '그래도 클럽을 지킨다', run: (c) => { c.fans(-Math.round(c.p.fans * 0.1)); c.skill('stage', 3); c.rep(3); c.band!.chemistry = clamp(c.band!.chemistry + 4); c.chron('인디 신의 겨울에도 클럽 무대를 지켰다', 'band'); return '관객 열두 명 앞에서 한 공연. 그래도 한 명도 먼저 나가지 않았다.'; } },
      { label: '잠시 쉬어 간다', run: (c) => { c.stat('stress', -6); c.band!.chemistry = clamp(c.band!.chemistry - 6); return '합주실 예약을 한 달 비웠다. 다시 모이자고 먼저 말하는 사람이 없었다.'; } },
    ],
  },
  // ───────── 다른 나라 음악사의 현장 ─────────
  {
    id: 'h_us_mtv', scene: 'studio', title: '뮤직비디오의 시대', once: true, chance: 0.5, minYear: 1981.6, maxYear: 1986,
    when: (c) => ct(c) === 'US' && !!c.band && c.s.songs.length > 0 && !busy(c),
    text: () => '음악 전문 TV 채널이 생겼다. 이제 음악은 ‘보는 것’이다.\n친구가 빌려 온 비디오카메라로 뮤직비디오를 찍어 볼까?',
    choices: [
      { label: '찍는다', odds: (c) => c.dc(13, '연출 판정', [['무대', c.m(c.p.skills.stage)], ['외모 자신감', c.p.traits?.includes('shy') ? -2 : 1]], '가정'), run: (c) => { c.money(-c.krw(1_000_000), '뮤직비디오 촬영'); if (c.check(c.choicesOdds!)) { c.fans(900 + c.p.fans * 0.2); c.rep(3); c.chron('첫 뮤직비디오가 지역 방송에 걸렸다', 'music'); return '심야 시간대, 지역 채널에 우리 얼굴이 나왔다.'; } return '조명이 엉망이었다. 테이프는 서랍으로 들어갔다.'; } },
      { label: '라이브로 승부한다', run: (c) => { c.skill('stage', 3); } },
    ],
  },
];
