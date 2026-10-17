import type { GameState } from '../sim/types';
import { REGIONS, birthsIn, eraOf, lifeExpectancy, minWage } from '../sim/data/world';
import { Portrait } from '../art/Portrait';
import { sfx } from '../audio/player';

const TASTE: Record<string, string> = {
  classical: '클래식 FM', trot: '트로트', ballad: '발라드', none: '음악보다 뉴스', folk: '통기타 포크',
  indierock: '인디록', metal: '메탈', indiepop: '인디팝', punk: '펑크', shoegaze: '슈게이즈',
};
const INCOME = { low: '넉넉하지 않은 집', mid: '평범하고 바쁜 집', high: '여유 있는 집' };
const INCOME_DOTS = { low: '●○○○○', mid: '●●●○○', high: '●●●●●' };

export function BirthCert({ s, onStart, onReroll }: { s: GameState; onStart: () => void; onReroll: () => void }) {
  const p = s.player;
  const y = p.birthYear;
  const region = REGIONS.find((r) => r.id === p.region)!;
  const births = birthsIn(y);
  const era20 = eraOf(y + 20);
  const mom = s.npcs[s.flags.mom as string];
  const dad = s.npcs[s.flags.dad as string];
  const month = 1 + (s.seed % 12);
  return (
    <div className="cert-wrap">
      <div className="cert" role="document">
        <div className="cert-head">
          <span>SIDE A · 탄생</span>
          <span className="mono">No. IBL-{y}-{String(s.seed).slice(0, 7)}</span>
        </div>
        <div className="cert-body">
          <div className="tape" aria-hidden>
            <div className="tape-label">{p.name} — 첫 번째 트랙</div>
            <div className="tape-window"><span className="reel" /><span className="reel" /></div>
            <div className="tape-side">SIDE A</div>
            <div className="tape-time">{y} · {lifeExpectancy(y)}Y</div>
          </div>
          <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <div className="portrait" style={{ width: 70, height: 84 }}>
              <Portrait person={{ look: p.look, gender: p.gender, age: 0, mood: 80 }} />
            </div>
            <div className="grow">
              <span className="label">이름</span>
              <div className="cert-name">{p.name}</div>
            </div>
          </div>
          <p className="cert-story">
            {y}년 {month}월, {region.label}의 {INCOME[p.income]}에서 {p.gender === 'm' ? '남자' : '여자'}아이로 태어났습니다.
            엄마 {mom?.name.slice(1)}, 아빠 {dad?.name.slice(1)}. 집에는 늘 {TASTE[p.parentTaste] ?? '라디오'}가 흐릅니다.
            {p.instrumentAtHome ? ' 거실 구석에는 아무도 치지 않는 악기가 하나 있습니다.' : ''}
          </p>
          <div className="cert-grid">
            <div><span className="label">성별</span><div className="v">{p.gender === 'm' ? '남성' : '여성'}</div></div>
            <div><span className="label">출생</span><div className="v">{y}년 {month}월</div></div>
            <div><span className="label">출생지</span><div className="v">{region.label}</div></div>
            <div><span className="label">가정 형편</span><div className="v"><span className="dots">{INCOME_DOTS[p.income]}</span></div></div>
            <div><span className="label">부모님 음악</span><div className="v">{TASTE[p.parentTaste] ?? '—'}</div></div>
            <div><span className="label">집의 악기</span><div className="v">{p.instrumentAtHome ? '있음' : '없음'}</div></div>
            <div><span className="label">기대수명</span><div className="v">{lifeExpectancy(y)}세</div></div>
            <div><span className="label">스무 살의 세상</span><div className="v">{era20.name}</div></div>
            <div><span className="label">16세 알바 시급</span><div className="v">{minWage(y + 16).toLocaleString()}원</div></div>
          </div>
          <div className="cert-note">
            {y}년 대한민국에서 태어난 아기는 약 {Math.floor(births / 10000)}만 {Math.round((births % 10000) / 1000) ? `${Math.round((births % 10000) / 1000)}천` : ''}명. 그중 한 명입니다.
            <br />
            스무 살이 되는 {y + 20}년 무렵은 ‘{era20.name}’ — {era20.desc}.
          </div>
        </div>
        <div className="cert-foot">
          <button className="btn ghost" onClick={() => { sfx('tap'); onReroll(); }}>다시 태어나기</button>
          <button className="btn primary" onClick={() => { sfx('good'); onStart(); }}>삶을 시작하기 →</button>
        </div>
      </div>
    </div>
  );
}
