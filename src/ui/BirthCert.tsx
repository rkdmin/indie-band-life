import type { GameState } from '../sim/types';
import { FateCode } from './FateCode';
import { moneyAt } from '../sim/money';
import { REGIONS, birthsIn, eraOf, minWage } from '../sim/data/world';
import { Portrait } from '../art/Portrait';
import { given, josa } from '../sim/korean';
import { periodText } from '../sim/data/anachronism';
import { birthsAt, countryOf, hasMinWage, lifeExpAt, successStars } from '../sim/data/countries';
import { TALENTS, TALENT_LABEL, rarityText, stars } from '../sim/data/fate';
import { TRAIT_LABEL } from '../sim/npc';
import { sfx } from '../audio/player';
import { playerAppearance } from '../sim/appearance';
import { describe, npcAppearance } from '../sim/appearance';
import { Flag } from './Flag';

const TASTE: Record<string, string> = {
  classical: '클래식 라디오', trot: '트로트', ballad: '발라드', none: '음악보다 뉴스', folk: '통기타 포크',
  indierock: '인디록', metal: '메탈', indiepop: '인디팝', punk: '펑크', shoegaze: '슈게이즈',
};
const INCOME = { low: '넉넉하지 않은 집', mid: '평범하고 바쁜 집', high: '여유 있는 집' };
const INCOME_DOTS = { low: '●○○○○', mid: '●●●○○', high: '●●●●●' };

export function BirthCert({ s, onStart, onReroll }: { s: GameState; onStart: () => void; onReroll: () => void }) {
  const p = s.player;
  const y = p.birthYear;
  const region = { ...REGIONS.find((r) => r.id === p.region)!, label: periodText(countryOf(p.country).regions[p.region], p.birthYear, p.country) };
  const ct = countryOf(p.country);
  const births = birthsIn(y);
  const era20 = eraOf(y + 20, ct.id);
  const mom = s.npcs[s.flags.mom as string];
  const dad = s.npcs[s.flags.dad as string];
  // 외모: 아빠·엄마 키에서 예상 키를 보여 준다 (키는 부모 평균으로 회귀)
  const app = playerAppearance({ ...p, country: p.country });
  const momApp = mom ? npcAppearance(mom, p.country) : null;
  const dadApp = dad ? npcAppearance(dad, p.country) : null;
  const inherited = `${momApp && dadApp ? `아빠 ${dadApp.height}cm · 엄마 ${momApp.height}cm → ` : ''}다 크면 약 ${app.height}cm · ${describe(app, 30, p.gender).split(' · ').slice(1).join(' · ')}`;
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
            <div className="tape-time">{y} · {lifeExpAt(ct, y)}Y</div>
          </div>
          <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <div className="portrait" style={{ width: 70, height: 84 }}>
              <Portrait person={{ look: p.look, gender: p.gender, age: 0, mood: 80, app: playerAppearance({ ...p, country: p.country }) }} />
            </div>
            <div className="grow">
              <span className="label">이름</span>
              <div className="cert-name">{p.name}</div>
            </div>
          </div>
          <p className="cert-story">
            {y}년 {month}월, {region.label}의 {INCOME[p.income]}에서 {p.gender === 'm' ? '남자' : '여자'}아이로 태어났습니다.
            엄마 {mom ? given(mom.name) : ''}, 아빠 {dad ? given(dad.name) : ''}. 집에는 늘 {josa(TASTE[p.parentTaste] ?? '라디오', '이/가')} 흐릅니다.
            {p.instrumentAtHome ? ' 거실 구석에는 아무도 치지 않는 악기가 하나 있습니다.' : ''}
          </p>
          {p.birth && (p.birth.moments.length > 0 || p.birth.dream) && (
            <ul className="cert-moments">
              {p.birth.moments.map((m) => <li key={m}>{m}</li>)}
              {p.birth.dream && <li><b>태몽</b> {p.birth.dream.label}</li>}
            </ul>
          )}
          <div className="country-box">
            <span className="cflag"><Flag c={ct.id} size={28} /></span>
            <div className="grow">
              <b>{periodText(ct.name, y, ct.id)}</b>
              <div className="dim">{y + 20 < 2015 ? `스무 살 무렵: ${era20.desc}` : periodText(ct.scene, y + 20, ct.id)}</div>
              <div className="country-stats">
                <span>음악 시장 세계 <b>{ct.marketRank}위</b>{y < 2000 ? ' (2024)' : ''}</span>
                <span>기대수명 <b>{lifeExpAt(ct, y)}세</b></span>
                <span>{hasMinWage(ct, y + 16) ? '최저시급' : '시급(추정)'} 약 <b>{moneyAt(minWage(y + 16) * ct.wageMul, y + 16, ct.id)}</b></span>
                <span>생활비 <b>×{ct.costMul}</b></span>
              </div>
              <div className="country-stars">
                음악으로 성공하기 <span className="stars">{'★'.repeat(successStars(ct))}<i>{'★'.repeat(5 - successStars(ct))}</i></span>
                <span className="dim">이 나라에서 태어난 시뮬레이션 인생의 {ct.simReach10k}%가 팬 1만 명에 닿았다</span>
              </div>
            </div>
          </div>
          <div className="cert-grid">
            <div><span className="label">성별</span><div className="v">{p.gender === 'm' ? '남성' : '여성'}</div></div>
            <div><span className="label">출생</span><div className="v">{y}년 {month}월</div></div>
            <div><span className="label">출생지</span><div className="v">{region.label}</div></div>
            <div><span className="label">가정 형편</span><div className="v"><span className="dots">{INCOME_DOTS[p.income]}</span></div></div>
            <div><span className="label">부모님 음악</span><div className="v">{TASTE[p.parentTaste] ?? '—'}</div></div>
            <div><span className="label">집의 악기</span><div className="v">{p.instrumentAtHome ? '있음' : '없음'}</div></div>
            {p.birth && <div><span className="label">혈액형</span><div className="v">{p.birth.blood}형</div></div>}
            {p.birth && <div><span className="label">태어난 곳</span><div className="v">{p.birth.place === 'home' ? '집' : '병원'}{p.birth.preterm ? ' · 조산' : p.birth.lowWeight ? ' · 저체중' : ''}</div></div>}
            <div className="wide"><span className="label">물려받은 외모</span><div className="v">{inherited}</div></div>
            <div><span className="label">기대수명</span><div className="v">{lifeExpAt(ct, y)}세</div></div>
            <div><span className="label">스무 살의 세상</span><div className="v">{era20.name}</div></div>
            <div><span className="label">16세 알바 시급{hasMinWage(ct, y + 16) ? '' : ' (추정)'}</span><div className="v">{moneyAt(minWage(y + 16) * ct.wageMul, y + 16, ct.id)}</div></div>
            {p.birth && <div><span className="label">엄마 나이</span><div className="v">{p.birth.motherAge}세</div></div>}
          </div>
          <div className="fate-box">
            <div className="fate-rarity">
              <span className="label">이렇게 태어날 확률</span>
              <b>약 {rarityText(p.rarityLog)}</b>
            </div>
            <div className="fate-cols">
              <div>
                <span className="label">타고난 재능</span>
                {TALENTS.map((t) => (
                  <div key={t} className="talent">
                    <span>{TALENT_LABEL[t]}</span>
                    <span className="stars">{'★'.repeat(stars(p.talents[t]))}<i>{'★'.repeat(5 - stars(p.talents[t]))}</i></span>
                  </div>
                ))}
                <span className="label" style={{ marginTop: 8, display: 'block' }}>성격</span>
                <div className="row" style={{ flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {p.traits.map((t) => (
                    <span key={t} className="chip">{TRAIT_LABEL[t]}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">이 인생의 변수</span>
                <ul className="fate-list">
                  {p.fate.draws.map((d) => (
                    <li key={d.id}>
                      <b>{d.label}</b>
                      <span className="fate-p">
                        {d.p >= 0.01 ? `${Math.round(d.p * 1000) / 10}%` : `${Math.round(1 / d.p).toLocaleString()}분의 1`}
                        <span className={`src src-${d.kind}`}>{d.kind}</span>
                      </span>
                      <small>{d.src}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="cert-note">
            {ct.id === 'KR' ? <>{y}년 대한민국에서 태어난 아기는 약 {Math.floor(births / 10000)}만 {Math.round((births % 10000) / 1000) ? `${Math.round((births % 10000) / 1000)}천` : ''}명. 그중 한 명입니다.</> : <>{y}년 {ct.name}에서 태어난 아기는 약 {Math.round(birthsAt(ct, y) / 10000).toLocaleString()}만 명. 그중 한 명입니다.</>}
            <br />
            스무 살이 되는 {y + 20}년 무렵은 ‘{era20.name}’ — {era20.desc}.
          </div>
        </div>
        <FateCode s={s} />
        <div className="cert-foot">
          <button className="btn ghost" onClick={() => { sfx('tap'); onReroll(); }}>다시 태어나기</button>
          <button className="btn primary" onClick={() => { sfx('good'); onStart(); }}>삶을 시작하기 →</button>
        </div>
      </div>
    </div>
  );
}
