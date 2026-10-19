// 카드 고르기 사건 — 선택지를 카드로 펼쳐 놓고 하나를 집는다.
// 카드마다 위험도(안정·모험·도박)와 최선·최악 범위가 보인다. 숫자는 data/fate/money.json·jobs.json 의 실제 통계·근사에서 온다.
//  · 생계 직업 카드 · 돈 굴리기(예금·주식·코인·동업) · 공연 기회 · 레이블 제안 비교 · 타이틀곡 고르기 · 협찬 제안 · 장비 사기

import type { EventDef, Ctx } from '../ctx';
import type { CardInfo, Job, Song } from '../types';
import { release, unreleased } from '../songs';
import { minWage, INST_LABEL, MOOD_LABEL } from '../data/world';
import { won, count, josa } from '../korean';
import { clamp } from '../rng';
import type { CountryId } from '../data/countries';
import { hasMedia } from '../data/era/media';
import moneyJson from '../../data/fate/money.json';
import jobsJson from '../../data/fate/jobs.json';

const ct = (c: Ctx) => (c.p.country ?? 'KR') as CountryId;
const busy = (c: Ctx) => c.p.military === 'serving';
const M = moneyJson.data;

function lerp(t: number[][], y: number): number {
  if (y <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (y <= t[i][0]) return t[i - 1][1] + ((y - t[i - 1][0]) / (t[i][0] - t[i - 1][0])) * (t[i][1] - t[i - 1][1]);
  return t[t.length - 1][1];
}
const pct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

// ───────── 생계 직업 ─────────
interface JobCard {
  id: string;
  title: string;
  icon: string;
  job: Job;
  pay: number;
  hours: number;
  music: number;
  from: number;
  to: number;
  c?: CountryId[];
  need?: { study?: number; skill?: number; compose?: number };
  note: string;
}
const JOBS = jobsJson.data as JobCard[];

function jobsFor(c: Ctx): JobCard[] {
  return JOBS.filter((j) => {
    if (c.year < j.from || c.year > j.to) return false;
    if (j.c && !j.c.includes(ct(c))) return false;
    if (j.need?.study && c.p.study < j.need.study) return false;
    if (j.need?.skill && c.mainSkill < j.need.skill) return false;
    if (j.need?.compose && c.p.skills.compose < j.need.compose) return false;
    return true;
  });
}
/** 한 달 수입 (원, 그 해 물가) — 최저시급 × 배수 × 주당 시간 × 4.3주 × 나라 임금 배율 */
const monthlyPay = (c: Ctx, j: JobCard) => Math.round(minWage(c.year) * j.pay * j.hours * 4.3 * c.country.wageMul);
const MUSIC = ['거의 없음', '조금', '넉넉함', '전부 음악'];

// ───────── 돈 굴리기 ─────────
type Invest = 'save' | 'stock' | 'crypto' | 'house' | 'shop';
/** 그 해 그 나라의 평균 집값 (원) */
const housePrice = (c: Ctx) => Math.round(lerp(M.realEstate.price.table, c.year) * c.country.costMul);
const houseLoan = (c: Ctx) => Math.max(0, housePrice(c) - c.p.money * 0.9);
function investOptions(c: Ctx): Invest[] {
  const out: Invest[] = ['save'];
  if (c.year >= M.stocks.since[ct(c)]) out.push('stock');
  // 집은 대출(LTV 70%)을 끼고 사도 집값의 30%는 내 돈이어야 한다
  if (c.p.money * 0.9 >= housePrice(c) * (1 - M.realEstate.ltv)) out.push('house');
  if (c.year >= M.crypto.since[ct(c)]) out.push('crypto');
  out.push('shop');
  return out;
}
const stake = (c: Ctx) => Math.round(c.p.money * 0.5);

/** 그 해의 주식 1년 수익률 — 실제로 크게 움직인 해면 그 해 등락률 근처, 아니면 평소 분포 */
function stockReturn(c: Ctx): number {
  const y = (M.stocks.years as Record<string, Record<string, number>>)[ct(c)]?.[String(Math.floor(c.year))];
  return y !== undefined ? c.rng.normal(y, M.stocks.yearSd) : c.rng.normal(M.stocks.mean, M.stocks.sd);
}
function cryptoReturn(c: Ctx): number {
  const y = (M.crypto.years as Record<string, number>)[String(Math.floor(c.year))];
  return Math.exp(c.rng.normal(y ?? M.crypto.logMean, M.crypto.logSd)) - 1;
}
/** 집값 1년 변동 — 그 나라 그 해의 흐름 + 흔들림 */
function houseReturn(c: Ctx): number {
  const t = (M.realEstate.table as Record<string, number[][]>)[ct(c)];
  return c.rng.normal(lerp(t, c.year), M.realEstate.sd);
}
/** 작년 시장 — 지난 일은 알 수 있다 (올해는 모른다) */
const lastYearStock = (c: Ctx) => (M.stocks.years as Record<string, Record<string, number>>)[ct(c)]?.[String(Math.floor(c.year) - 1)];
const smartphone = (c: Ctx) => hasMedia('smartphone', c.year, ct(c));

// ───────── 타이틀곡 ─────────
const topSongs = (c: Ctx): Song[] => [...unreleased(c.s)].sort((a, b) => b.quality - a.quality).slice(0, 3);
/** 대충의 히트 가능성 — 품질이 80을 넘기 시작하면 가파르게 오른다 [가정] */
const hitGuess = (q: number) => Math.round(100 / (1 + Math.exp(-(q - 82) / 6)));

export const CARD_EVENTS: EventDef[] = [
  {
    id: 'c_jobs', scene: 'street', title: '생계를 정하자', kicker: 'JOB CARDS', cards: true, cooldown: 10, chance: 0.35,
    when: (c) => c.age >= 19 && c.age < 62 && !busy(c) && (c.p.job === 'none' || c.p.job === 'part') && c.p.money < c.krw(3_000_000) && jobsFor(c).length >= 3,
    bind: (c) => {
      const pool = [...jobsFor(c)];
      const picks: JobCard[] = [];
      while (picks.length < 3 && pool.length) picks.push(pool.splice(c.rng.int(0, pool.length - 1), 1)[0]);
      picks.forEach((j, i) => (c.vars[`j${i}`] = j.id));
      return true;
    },
    text: (c) => `통장 잔고 ${won(c.p.money)}. 음악만으로는 월세를 못 낸다.\n무엇으로 먹고살까? 카드에 그 일의 시급과 음악에 남는 여력이 적혀 있다.`,
    choices: [0, 1, 2].map((i) => ({
      label: (c: Ctx) => JOBS.find((j) => j.id === c.vars[`j${i}`])?.title ?? '',
      if: (c: Ctx) => !!c.vars[`j${i}`],
      risk: 'safe' as const,
      card: (c: Ctx): CardInfo => {
        const j = JOBS.find((x) => x.id === c.vars[`j${i}`])!;
        return {
          title: j.title,
          icon: j.icon,
          tag: j.job === 'office' ? '정규직' : j.job === 'session' || j.job === 'teacher' ? '음악 일' : '알바',
          stats: [
            ['한 달 수입', `약 ${won(monthlyPay(c, j))}`],
            ['주당 시간', `${j.hours}시간`],
            ['음악에 남는 여력', MUSIC[j.music]],
          ],
          sub: j.note,
          data: `최저시급 ${minWage(c.year).toLocaleString()}원 × ${j.pay}배 기준 [근사]`,
        };
      },
      run: (c: Ctx) => {
        const j = JOBS.find((x) => x.id === c.vars[`j${i}`])!;
        c.p.job = j.job;
        c.set('jobTitle', j.title);
        c.money(monthlyPay(c, j) * 2, `${j.title} 첫 두 달`);
        c.stat('stress', j.music === 0 ? 8 : j.music === 1 ? 4 : 1);
        if (j.music >= 2) c.skill(c.p.mainInst ?? 'guitar', 1.5);
        if (j.id === 'lesson' || j.id === 'session') c.skill(c.p.mainInst ?? 'guitar', 3);
        if (j.id === 'engineer') c.skill('compose', 3);
        c.chron(`${josa(j.title, '으로/로')} 생계를 꾸리기 시작했다`, 'life');
        return j.note + '.';
      },
    })),
  },
  {
    id: 'c_invest', scene: 'office', title: '목돈을 어떻게 할까', kicker: 'MONEY CARDS', cards: true, cooldown: 12, chance: 0.3,
    when: (c) => c.age >= 22 && c.age < 75 && c.p.money >= c.krw(4_000_000) && c.p.debt === 0,
    text: (c) => `통장에 ${won(c.p.money)}이 있다. 이 돈을 굴려 볼까?\n예금은 확실하지만 작고, 나머지는 그 해의 흐름과 운에 달렸다 — 무조건 오르는 건 없다.`,
    choices: [
      ...(['save', 'stock', 'house', 'crypto', 'shop'] as Invest[]).map((kind) => ({
        label: { save: '정기예금', stock: '주식', house: '대출 끼고 집 사기', crypto: '암호화폐', shop: '친구 가게에 동업' }[kind],
        if: (c: Ctx) => investOptions(c).includes(kind),
        risk: ({ save: 'safe', stock: 'risky', house: 'risky', crypto: 'gamble', shop: 'gamble' } as const)[kind],
        range: (c: Ctx) => {
          const v = stake(c);
          if (kind === 'save') return `1년 뒤 +${won(v * lerp(M.savingsRate.table, c.year))} 확정`;
          if (kind === 'stock') return `보통 ${won(v * -0.15)} ~ +${won(v * 0.29)}, 나쁜 해엔 반토막`;
          if (kind === 'crypto') return `−${won(v * 0.7)} ~ +${won(v * 3)}`;
          if (kind === 'house') { const h = housePrice(c); return `1년 뒤 −${won(h * 0.15)} ~ +${won(h * 0.25)} · 이자 −${won(houseLoan(c) * 0.05)}`; }
          return `망하면 −${won(v * 0.8)}, 살아남으면 +${won(v * 0.5)}`;
        },
        card: (c: Ctx): CardInfo => {
          const r = lerp(M.savingsRate.table, c.year);
          const base = {
            save: { title: '정기예금', icon: '🏦', tag: '은행', stats: [['1년 금리', `${(r * 100).toFixed(1)}%`], ['원금 손실', '없음']] as [string, string][], data: M.savingsRate.about },
            stock: { title: '주식', icon: '📈', tag: '시장', stats: [['평균 수익', '연 7%'], ['흔들림', '±22%'], ...(lastYearStock(c) !== undefined ? ([['작년 시장', pct(lastYearStock(c)!)]] as [string, string][]) : [])] as [string, string][], data: M.stocks.about },
            crypto: { title: '암호화폐', icon: '🪙', tag: '코인', stats: [['반토막 확률', '약 21%'], ['세 배 확률', '약 6%']] as [string, string][], data: M.crypto.about },
            house: { title: '대출 끼고 집 사기', icon: '🏠', tag: '레버리지', stats: [['평균 집값', won(housePrice(c))], ['대출', won(houseLoan(c))], ['작년 집값', pct(lerp((M.realEstate.table as Record<string, number[][]>)[ct(c)], c.year - 1))]] as [string, string][], data: `${M.realEstate.about} · ${M.realEstate.price.about}` },
            shop: { title: '친구 가게 동업', icon: '🍜', tag: '사업', stats: [['1년 생존율', '64%'], ['5년 생존율', '34%']] as [string, string][], data: M.shop.about },
          }[kind];
          return { ...base, sub: kind === 'house' ? `내 돈 ${won(housePrice(c) - houseLoan(c))} + 대출 ${won(houseLoan(c))}` : `${won(stake(c))} 투입` };
        },
        run: (c: Ctx) => {
          if (kind === 'house') {
            // 1년 뒤 되판다고 치고: 집값 변동은 전부 내 몫, 대출 이자(연 5%)는 내가 낸다 — 오르면 크게, 내리면 크게
            const h = housePrice(c);
            const loan = houseLoan(c);
            const r = houseReturn(c);
            c.money(Math.round(h * r), `집값 ${pct(r)}`);
            if (loan) c.money(-Math.round(loan * 0.05), '대출 이자');
            if (r >= 0.15) c.chron(`산 집이 1년 새 ${pct(r)} — 음악보다 집이 돈을 벌었다`, 'big');
            if (r <= -0.08) { c.stat('stress', 12); c.chron(`집값이 ${pct(r)} — 대출 이자만 남았다`, 'life'); }
            return r >= 0.15 ? '부동산 사장님이 축하 전화를 했다. 기분이 묘했다.' : r <= -0.05 ? '매일 밤 시세를 확인했다. 노래가 안 써졌다.' : '집값은 크게 움직이지 않았다. 이자만 꼬박꼬박 나갔다.';
          }
          const v = stake(c);
          let ret = 0;
          if (kind === 'save') ret = lerp(M.savingsRate.table, c.year);
          if (kind === 'stock') ret = stockReturn(c);
          if (kind === 'crypto') ret = cryptoReturn(c);
          if (kind === 'shop') ret = c.rng.chance(M.shop.survive1y) ? c.rng.range(0.1, 0.6) : -c.rng.range(0.6, 0.95);
          ret = Math.max(-0.95, ret);
          const d = Math.round(v * ret);
          c.money(d, `${({ save: '예금 이자', stock: '주식', crypto: '코인', shop: '동업' } as const)[kind]} ${pct(ret)}`);
          if (ret >= 1) c.chron(`${({ stock: '주식', crypto: '코인', shop: '동업', save: '예금' } as const)[kind]}으로 ${pct(ret)} — 인생 역전의 해`, 'big');
          if (ret <= -0.5) { c.stat('stress', 12); c.chron(`굴린 돈이 ${pct(ret)} — 그해 겨울은 길었다`, 'life'); }
          if (kind === 'save') return '숫자가 조금 늘었다. 마음이 편했다.';
          if (ret >= 1) return smartphone(c) ? '화면을 몇 번이나 새로 확인했다. 진짜였다.' : '증권사 객장 전광판을 몇 번이나 다시 봤다. 진짜였다.';
          if (ret >= 0.15) return '생각보다 잘 됐다. 새 앰프를 볼까 잠깐 고민했다.';
          if (ret >= -0.1) return '오르락내리락하다 제자리 근처에서 멈췄다.';
          return kind === 'shop' ? '가게는 1년을 못 버텼다. 간판을 내리던 날 친구와 소주를 마셨다.' : smartphone(c) ? '빨간 숫자를 보지 않으려고 앱을 지웠다.' : '신문 경제면을 펼치지 않게 됐다.';
        },
      })),
      { label: '그냥 통장에 둔다', risk: 'safe' as const, card: () => ({ title: '그냥 둔다', icon: '🛏', tag: '안정', stats: [['변화', '없음']] }), run: () => '돈은 가만히 있었다. 나도 가만히 있었다.' },
    ],
  },
  {
    id: 'c_gig_offers', scene: 'club', title: '이번 달 공연 제안', kicker: 'GIG CARDS', cards: true, cooldown: 4, chance: 0.3,
    when: (c) => !!c.band && !busy(c) && c.age >= 17 && c.age < 60 && c.p.fans >= 60,
    text: (c) => `〈${c.band!.name}〉 앞으로 공연 제안이 세 장 들어왔다.\n확실한 무대, 판을 키우는 무대, 길 위의 무대.`,
    choices: [
      {
        label: '단골 클럽 정기 공연',
        risk: 'safe',
        range: (c) => `팬 +${count(20 + c.p.fans * 0.03)} · 출연료 소액`,
        card: (c) => ({ title: '단골 클럽 정기 공연', icon: '🎟', tag: '안정', stats: [['관객', `약 ${Math.round(40 + c.p.fans * 0.05)}명`], ['수입', '출연료 조금'], ['위험', '없음']] }),
        run: (c) => { c.fans(20 + c.p.fans * 0.03); c.money(c.krw(250_000) / (c.members.length + 1), '정기 공연 출연료'); c.skill('stage', 2); c.band!.gigs++; return '늘 오는 얼굴들이 늘 서는 자리에 있었다.'; },
      },
      {
        label: '큰 공연장을 자비로 빌린다',
        risk: 'gamble',
        range: (c) => `매진이면 +${won(c.krw(4_000_000) * 1.6)}·팬 +${count(c.p.fans * 0.5 + 400)} / 텅 비면 −${won(c.krw(4_000_000))}`,
        odds: (c) => c.dc(15, '매진 판정', [['팬 규모', c.p.fans >= 5000 ? 3 : c.p.fans >= 1500 ? 1 : c.p.fans < 400 ? -2 : 0], ['무대', c.m(c.p.skills.stage)], ['홍보', Math.min(3, Number(c.s.flags.promo ?? 0))]], '가정', '대관료를 먼저 내고, 표가 팔려야 돌려받는다'),
        card: (c) => ({ title: '큰 공연장 자비 대관', icon: '🏟', tag: '도박', stats: [['대관료', won(c.krw(4_000_000))], ['좌석', '700석'], ['손익분기', '좌석의 60%']] }),
        run: (c) => {
          const cost = c.krw(4_000_000);
          c.money(-cost, '대관료');
          c.band!.gigs++;
          const crit = c.preset?.crit === 'success';
          if (c.check(c.choicesOdds!)) {
            c.money(cost * (crit ? 3.2 : 2.6), '티켓 매진');
            c.fans(c.p.fans * (crit ? 0.8 : 0.5) + 400);
            c.rep(crit ? 8 : 5);
            c.chron(crit ? '자비로 빌린 700석이 매진, 추가 공연까지 열었다' : '자비로 빌린 공연장이 매진됐다', 'big');
            return crit ? '매진. 그리고 추가 공연. 대관료 영수증을 액자에 넣었다.' : '마지막 표가 팔린 순간 멤버들이 소리를 질렀다.';
          }
          c.money(cost * 0.25, '티켓 판매');
          c.fans(40);
          c.stat('stress', 12);
          c.band!.chemistry = clamp(c.band!.chemistry - 4);
          return '빈 의자가 더 많았다. 그래도 온 사람들을 위해 앙코르까지 했다.';
        },
      },
      {
        label: '지방 소도시 투어',
        risk: 'risky',
        range: (c) => `팬 +${count(c.p.fans * 0.05)} ~ +${count(c.p.fans * 0.45 + 200)} · 수입은 0 근처`,
        card: (c) => ({ title: '지방 소도시 투어', icon: '🚐', tag: '모험', stats: [['도시', '5곳'], ['수입', '본전 근처'], ['팬', '운에 따라']] }),
        run: (c) => {
          const luck = c.rng.next();
          c.fans(c.p.fans * (0.05 + luck * 0.4) + luck * 200);
          c.money(c.krw(c.rng.range(-600_000, 600_000)) / (c.members.length + 1), '투어 정산');
          c.skill('stage', 3);
          c.stat('health', -3);
          c.band!.gigs += 5;
          c.theme('band');
          return luck > 0.7 ? '마지막 도시에서 관객이 따라 불렀다. 그 도시 이름을 노래 제목으로 썼다.' : luck < 0.25 ? '관객보다 멤버가 많은 밤도 있었다.' : '휴게소 우동과 차 안의 쪽잠. 그래도 매일 무대가 있었다.';
        },
      },
    ],
  },
  {
    id: 'c_label_offers', scene: 'office', title: '계약 제안서 세 장', kicker: 'CONTRACT CARDS', cards: true, once: true, chance: 0.55, priority: 128,
    when: (c) => !!c.band && c.band.label === 'none' && c.p.fans >= 1800 && c.age < 48 && !busy(c),
    text: (c) => `〈${c.band!.name}〉 앞으로 제안서가 세 장 도착했다.\n돈을 먼저 받을지, 음악을 지킬지, 전부 우리가 책임질지.`,
    choices: [
      {
        label: '인디 레이블',
        risk: 'safe',
        range: (c) => `계약금 ${won(c.krw(10_000_000))} · 발매 도달 ×1.4`,
        card: (c) => ({ title: '작은 인디 레이블', icon: '💿', tag: '균형', stats: [['계약금', won(c.krw(10_000_000))], ['수익 배분', '밴드 50%'], ['음악 간섭', '거의 없음'], ['발매 도달', '×1.4']] }),
        run: (c) => { c.band!.label = 'indie'; c.money(c.krw(10_000_000) / (c.members.length + 1), '계약금'); c.rep(3); c.chron('인디 레이블과 계약', 'band'); return '사무실 겸 창고에서 사장님과 컵라면으로 계약을 축하했다.'; },
      },
      {
        label: '대형 기획사',
        risk: 'risky',
        range: (c) => `계약금 ${won(c.krw(60_000_000))} · 도달 ×2.2 · 멤버 반발 위험`,
        card: (c) => ({ title: '대형 기획사', icon: '🏢', tag: '큰돈', stats: [['계약금', won(c.krw(60_000_000))], ['수익 배분', '밴드 20%'], ['음악 간섭', '많음'], ['발매 도달', '×2.2']] }),
        run: (c) => {
          c.band!.label = 'major';
          c.money(c.krw(60_000_000) / (c.members.length + 1), '계약금');
          c.rep(-2);
          c.band!.chemistry = clamp(c.band!.chemistry - 10);
          for (const m of c.members) m.sat = clamp((m.sat ?? 60) - 10);
          c.chron('대형 기획사와 계약', 'big');
          return '계약서는 두꺼웠다. 첫 회의에서 “곡 길이를 3분으로 줄이자”는 말을 들었다.';
        },
      },
      {
        label: '우리끼리 레이블을 차린다',
        risk: 'gamble',
        range: (c) => `계약금 0 · 수익 100% · 실패하면 −${won(c.krw(8_000_000))}`,
        odds: (c) => c.dc(14, '자립 판정', [['팬 규모', c.p.fans >= 8000 ? 3 : c.p.fans >= 3000 ? 1 : 0], ['작곡', Math.floor(c.m(c.p.skills.compose) / 2)], ['밴드 합', (c.band?.chemistry ?? 50) >= 65 ? 2 : 0]], '가정', '유통·홍보·정산을 전부 직접 한다'),
        card: (c) => ({ title: '자체 레이블', icon: '🏴', tag: '도박', stats: [['계약금', '0원'], ['수익 배분', '밴드 100%'], ['초기 비용', won(c.krw(8_000_000))], ['발매 도달', '성공하면 ×1.8']] }),
        run: (c) => {
          c.money(-c.krw(8_000_000) / (c.members.length + 1), '레이블 차리기');
          if (c.check(c.choicesOdds!)) {
            c.band!.label = 'indie';
            c.set('selfLabel');
            c.money(c.krw(18_000_000) / (c.members.length + 1), '첫해 음반 수익');
            c.rep(6);
            c.band!.chemistry = clamp(c.band!.chemistry + 8);
            c.chron('직접 레이블을 차렸다 — 첫해부터 흑자', 'big');
            return '사업자 등록증에 밴드 이름이 찍혔다. 첫 정산서를 다 같이 읽었다.';
          }
          c.stat('stress', 12);
          c.band!.chemistry = clamp(c.band!.chemistry - 5);
          c.chron('직접 차린 레이블이 1년 만에 문을 닫았다', 'band');
          return '창고에 안 팔린 음반 상자가 쌓였다. 그래도 전부 우리 음악이었다.';
        },
      },
    ],
  },
  {
    id: 'c_title_track', scene: 'recording', title: '타이틀곡을 고르자', kicker: 'TRACK CARDS', cards: true, cooldown: 5, chance: 0.4,
    when: (c) => c.age >= 16 && !busy(c) && unreleased(c.s).length >= 3,
    bind: (c) => {
      topSongs(c).forEach((x, i) => (c.vars[`s${i}`] = x.id));
      return true;
    },
    text: () => '데모가 쌓였다. 이번에 세상에 내놓을 한 곡을 고르자.\n이 곡이 터질지는 아무도 모른다 — 하지만 확률은 있다.',
    choices: [0, 1, 2].map((i) => ({
      label: (c: Ctx) => { const x = c.s.songs.find((y) => y.id === c.vars[`s${i}`]); return x ? `〈${x.title}〉` : ''; },
      if: (c: Ctx) => !!c.vars[`s${i}`],
      risk: 'risky' as const,
      range: (c: Ctx) => { const x = c.s.songs.find((y) => y.id === c.vars[`s${i}`])!; return `차트 진입 가능성 약 ${hitGuess(x.quality)}%`; },
      card: (c: Ctx): CardInfo => {
        const x = c.s.songs.find((y) => y.id === c.vars[`s${i}`])!;
        return {
          title: `〈${x.title}〉`,
          icon: '💽',
          tag: x.quality >= 85 ? '히트 후보' : x.quality >= 70 ? '좋은 곡' : '데모',
          stats: [['완성도', String(Math.round(x.quality))], ['분위기', MOOD_LABEL[x.mood]], ['주제', x.theme], ['히트 가능성', `${hitGuess(x.quality)}%`]],
          sub: `“${x.lyric[0]}”`,
          data: '완성도 80을 넘기면 가능성이 가파르게 오른다 [가정]',
        };
      },
      run: (c: Ctx) => {
        const x = c.s.songs.find((y) => y.id === c.vars[`s${i}`])!;
        const cost = c.band?.label && c.band.label !== 'none' ? 0 : c.krw(1_200_000);
        if (cost) c.money(-cost, '녹음·마스터링');
        release(c.s, c.rng, [x.id], x.title);
        return `〈${x.title}〉을 세상에 내놓았다.`;
      },
    })),
  },
  {
    id: 'c_sponsor', scene: 'office', title: '광고 제안', kicker: 'SPONSOR CARDS', cards: true, cooldown: 8, chance: 0.35,
    when: (c) => !!c.band && c.p.fans >= 6000 && !busy(c) && c.age < 60 && hasMedia('tv', c.year, ct(c)),
    text: () => '광고 대행사에서 연락이 왔다. 우리 노래를 광고에 쓰고 싶단다.\n돈은 크다. 하지만 팬들이 어떻게 볼까.',
    choices: [
      {
        label: '대기업 광고에 곡을 판다',
        risk: 'risky',
        range: (c) => `+${won(c.krw(30_000_000))} · 팬 −5%~+20%`,
        card: (c) => ({ title: '대기업 광고', icon: '📺', tag: '큰돈', stats: [['광고비', won(c.krw(30_000_000))], ['노출', '전국'], ['팬 반응', '반반']] }),
        run: (c) => {
          c.money(c.krw(30_000_000) / (c.members.length + 1), '광고 음악');
          const r = c.rng.range(-0.05, 0.2);
          c.fans(c.p.fans * r);
          c.rep(r < 0 ? -4 : 2);
          c.chron('우리 노래가 광고에 흘렀다', 'music');
          return r < 0 ? '“변했다”는 말을 들었다. 통장은 든든했다.' : '광고를 보고 찾아온 새 팬들이 생겼다.';
        },
      },
      {
        label: '동네 가게 협찬만',
        risk: 'safe',
        range: () => '소액 · 평판 +',
        card: (c) => ({ title: '동네 가게 협찬', icon: '☕', tag: '안정', stats: [['협찬', won(c.krw(2_000_000))], ['팬 반응', '좋음']] }),
        run: (c) => { c.money(c.krw(2_000_000) / (c.members.length + 1), '협찬'); c.rep(2); return '공연 포스터 구석에 단골 카페 로고가 들어갔다.'; },
      },
      { label: '거절한다', risk: 'safe', card: () => ({ title: '거절', icon: '✋', tag: '고집', stats: [['평판', '+3']] }), run: (c) => { c.rep(3); c.theme('rage'); return '“우리 노래는 우리 무대에서만.” 다들 고개를 끄덕였다.'; } },
    ],
  },
  {
    id: 'c_gear', scene: 'studio', title: '악기 가게', kicker: 'GEAR CARDS', cards: true, cooldown: 8, chance: 0.25,
    when: (c) => !!c.p.mainInst && c.age >= 15 && c.age < 70 && c.p.money >= c.krw(800_000) && !busy(c),
    text: (c) => `악기 가게 벽에 ${INST_LABEL[c.p.mainInst!]}가 걸려 있다. 손이 근질거린다.`,
    choices: [
      {
        label: '믿을 만한 중고',
        risk: 'safe',
        range: (c) => `−${won(c.krw(600_000))} · 실력 +2`,
        card: (c) => ({ title: '믿을 만한 중고', icon: '🎸', tag: '안정', stats: [['가격', won(c.krw(600_000))], ['실력', '+2']] }),
        run: (c) => { c.money(-c.krw(600_000), '중고 악기'); c.skill(c.p.mainInst!, 2); return '손때 묻은 넥이 금방 손에 익었다.'; },
      },
      {
        label: '출처 모를 빈티지 매물',
        risk: 'gamble',
        range: (c) => `진품이면 실력 +6·되팔면 +${won(c.krw(5_000_000))} / 가짜면 −${won(c.krw(1_500_000))}`,
        card: (c) => ({ title: '빈티지 매물', icon: '🕰', tag: '도박', stats: [['가격', won(c.krw(1_500_000))], ['진품일 확률', '약 30%']], sub: '“60년대 거라던데요. 서류는 없고요.”' }),
        run: (c) => {
          c.money(-c.krw(1_500_000), '빈티지 매물');
          if (c.rng.chance(0.3)) { c.skill(c.p.mainInst!, 6); c.set('vintageGear'); c.money(c.krw(1_000_000), '감정 후 되판 부속'); c.chron('빈티지 매물이 진품이었다', 'music'); return '감정사가 휘파람을 불었다. 진짜였다. 소리가 달랐다.'; }
          c.stat('happiness', -6);
          return '집에 와서 뜯어 보니 부품이 전부 요즘 거였다.';
        },
      },
      {
        label: '할부로 최고급',
        risk: 'risky',
        range: (c) => `빚 +${won(c.krw(3_000_000))} · 실력 +4 · 무대 +2`,
        card: (c) => ({ title: '할부 최고급', icon: '💳', tag: '빚', stats: [['가격', `${won(c.krw(3_000_000))} 할부`], ['이자', '연 15%'], ['실력', '+4']] }),
        run: (c) => { c.borrow(c.krw(3_000_000), 0.15, '악기 할부'); c.money(-c.krw(3_000_000), '최고급 악기'); c.skill(c.p.mainInst!, 4); c.skill('stage', 2); return '새 악기의 냄새. 할부 문자는 매달 온다.'; },
      },
      {
        label: '한 달 빌려 써 본다',
        risk: 'safe',
        range: (c) => `−${won(c.krw(150_000))} · 실력 +1 · 나와 맞는지 알게 된다`,
        card: (c) => ({ title: '한 달 대여', icon: '📦', tag: '안정', stats: [['대여료', won(c.krw(150_000))], ['실력', '+1']], sub: '사기 전에 손에 맞는지부터' }),
        run: (c) => { c.money(-c.krw(150_000), '악기 대여'); c.skill(c.p.mainInst!, 1); c.stat('happiness', 3); return '한 달 써 보니 알았다. 비싼 게 다 내 소리는 아니었다.'; },
      },
      {
        label: '고장 난 걸 사서 직접 고친다',
        risk: 'risky',
        range: (c) => `−${won(c.krw(250_000))} · 고치면 실력 +3, 못 고치면 공구만 남는다`,
        card: (c) => ({ title: '수리용 매물', icon: '🔧', tag: '모험', stats: [['가격', won(c.krw(250_000))], ['수리 성공', '약 50%']], sub: '“소리는 나는데 가끔 안 나요.”' }),
        run: (c) => {
          c.money(-c.krw(250_000), '수리용 매물');
          if (c.rng.chance(0.5)) { c.skill(c.p.mainInst!, 3); c.chron('고장 난 악기를 직접 고쳐 썼다', 'music'); return '납땜 냄새 나는 일주일. 다시 소리가 났을 때 소리를 질렀다.'; }
          c.stat('stress', 4); return '고치다가 더 망가뜨렸다. 대신 악기 속 구조는 다 알게 됐다.';
        },
      },
      {
        label: '멤버 악기와 바꿔 쳐 본다',
        risk: 'safe',
        if: (c) => !!c.band && c.members.length > 0,
        range: () => '돈 0원 · 다른 악기 감각 +1',
        card: () => ({ title: '악기 바꿔 치기', icon: '🔄', tag: '안정', stats: [['가격', '0원'], ['감각', '+1']] }),
        run: (c) => { c.skill('compose', 2); c.skill(c.p.mainInst!, 1); return '남의 악기로 치니 내 버릇이 보였다. 그리고 다른 사람 파트를 이해하게 됐다.'; },
      },
    ],
  },
];
