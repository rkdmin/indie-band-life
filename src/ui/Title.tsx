import { useEffect, useMemo, useState } from 'react';
import { decodeFate, fateName } from '../sim/fatecode';
import type { Gender } from '../sim/types';
import type { NewGameOptions } from '../sim/engine';
import { birthsIn } from '../sim/data/world';
import { COUNTRIES, COUNTRY_IDS, rollCountry, countryBirthShare, type CountryId } from '../sim/data/countries';
import { Rng } from '../sim/rng';
import { PixelScene } from '../art/PixelScene';
import { isMuted, playBgm, setMuted, sfx, stopBgm } from '../audio/player';
import { ENDINGS } from '../sim/endings';
import { count } from '../sim/korean';
import type { Meta } from './save';
import { Flag } from './Flag';
import titleCopy from '../data/world/title_copy.json';

const ERAS = [
  { id: 'old', label: '옛 시절', from: 1950, to: 1984 },
  { id: 'past', label: '지난 세상', from: 1985, to: 1999 },
  { id: 'now', label: '지금 세상', from: 2000, to: 2012 },
  { id: 'next', label: '다가올 세상', from: 2013, to: 2026 },
  { id: 'any', label: '아무 때나', from: 1950, to: 2026 },
] as const;

// 나라·시대에 맞는 문구 (data/world/title_copy.json) — 브라질을 골랐는데 ‘대한민국에서 태어난 아기’, ‘홍대’가 나오지 않게
type Copy = { name: string; hub: string; eras: Record<string, string> };
const COPY = titleCopy.data as unknown as Record<CountryId | 'random', Copy>;
const eraHelp = (country: CountryId | 'random', era: string) => (era === 'any' ? '태어날 해도 운명에 맡긴다.' : COPY[country].eras[era]);
/** 하루 출생아 수 — 한국은 연도별 통계, 다른 나라는 연간 출생아 수 [근사], 운명에 맡기면 여섯 나라 합 */
const perDayOf = (country: CountryId | 'random') =>
  Math.round((country === 'KR' ? birthsIn(2024) : country === 'random' ? COUNTRY_IDS.reduce((a, c) => a + (c === 'KR' ? birthsIn(2024) : COUNTRIES[c].births), 0) : COUNTRIES[country].births) / 365);

const PACES = [
  { v: 0.5, label: '약 30분' },
  { v: 1, label: '약 1시간' },
  { v: 1.5, label: '약 1시간 30분' },
];

const ticksFor = (country: CountryId | 'random') => [
  `지금 이 순간에도 ${COPY[country].hub} 어딘가에서 누군가 첫 합주를 한다.`,
  '세 살 때 단짝이 서른에 드러머가 되어 돌아왔다.',
  '학교 친구랑 만든 첫 곡이 20년 뒤 역주행했다.',
  country === 'KR' ? '군악대 오디션에 떨어지고 쓴 노래가 첫 싱글이 됐다.' : '오디션에 떨어지고 쓴 노래가 첫 싱글이 됐다.',
  '우리 밴드는 유명해졌는데, 보컬이 먼저 떠났다.',
  '나는 록스타가 되지 못했지만, 마지막 앨범을 남겼다.',
];

interface Props {
  meta: Meta;
  canContinue: boolean;
  continueLabel: string;
  onContinue: () => void;
  onBorn: (o: NewGameOptions, pace: number, set: BornSettings) => void;
  onCollection: () => void;
}

/** 타이틀에서 고른 설정 — ‘운명에 맡김’·‘아무 때나’·성별 무작위는 굴릴 때마다 새로 정해진다 */
export interface BornSettings {
  era: (typeof ERAS)[number]['id'];
  country: CountryId | 'random';
  gender: Gender | 'random';
  /** 직접 정한 이름 (없으면 운명 코드에서 정해지는 그 시대·나라의 흔한 이름) */
  name: string | null;
  /** 운명 코드·‘같은 운명’처럼 해가 정해져 있으면 */
  birthYear?: number;
}

/** 설정대로 한 번 굴린다. ‘다시 태어나기’도 이걸 다시 부른다 (첫 결과를 그대로 쓰면 해·나라·이름이 고정된다) */
export function rollOptions(set: BornSettings): NewGameOptions {
  const r = new Rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const e = ERAS.find((x) => x.id === set.era)!;
  const birthYear = set.birthYear ?? r.int(e.from, e.to);
  const g: Gender = set.gender === 'random' ? (r.chance(0.51) ? 'm' : 'f') : set.gender;
  const ct: CountryId = set.country === 'random' ? rollCountry(r) : set.country;
  // 시드를 먼저 정해 두면 출생증명서의 운명 코드로 친구도 같은 출생을 할 수 있다 (sim/fatecode.ts)
  const seed = r.int(1, 0x7fffffff);
  const nm = set.name ?? fateName({ country: ct, birthYear, gender: g, seed });
  return { name: nm, gender: g, birthYear, country: ct, seed };
}

export function Title({ meta, canContinue, continueLabel, onContinue, onBorn, onCollection }: Props) {
  const [era, setEra] = useState<(typeof ERAS)[number]['id']>('now');
  const [country, setCountry] = useState<CountryId | 'random'>('KR');
  const [pace, setPace] = useState(1);
  const [custom, setCustom] = useState(false);
  const [gender, setGender] = useState<Gender | 'random'>('random');
  const [name, setName] = useState('');
  const [muted, setM] = useState(isMuted());
  const [tick, setTick] = useState(0);
  const [since, setSince] = useState(0);
  const t0 = useMemo(() => Date.now(), []);
  const perDay = perDayOf(country);
  const TICKS = ticksFor(country);
  const where = COPY[country].name;

  useEffect(() => {
    const a = window.setInterval(() => setTick((x) => (x + 1) % 6), 4200);
    const b = window.setInterval(() => setSince(Math.floor(((Date.now() - t0) / 86_400_000) * perDay * 1000) / 1000), 500);
    const startMusic = () => playBgm('title', 'indierock', 'wistful', 20261018);
    window.addEventListener('pointerdown', startMusic, { once: true });
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
      window.removeEventListener('pointerdown', startMusic);
      stopBgm();
    };
  }, [t0, perDay]);

  const born = () => {
    sfx('big');
    const set: BornSettings = { era, country, gender, name: custom && name.trim().length >= 2 ? name.trim() : null };
    onBorn(rollOptions(set), pace, set);
  };
  const [fateOpen, setFateOpen] = useState(false);
  const [fateIn, setFateIn] = useState('');
  const [fateErr, setFateErr] = useState(false);
  const bornFrom = () => {
    const f = decodeFate(fateIn);
    if (!f) {
      setFateErr(true);
      sfx('bad');
      return;
    }
    sfx('big');
    // 운명 코드로 태어나면 ‘다시 태어나기’는 같은 나라·해·성별에서 운명만 다시
    onBorn({ name: fateName(f), gender: f.gender, birthYear: f.birthYear, country: f.country, seed: f.seed }, pace, { era: 'any', country: f.country, gender: f.gender, name: null, birthYear: f.birthYear });
  };

  const people = [
    { look: 4242, gender: 'f' as const, age: 24, mood: 80, inst: 'guitar' as const },
    { look: 1717, gender: 'm' as const, age: 25, mood: 80, inst: 'vocal' as const },
    { look: 9001, gender: 'f' as const, age: 23, mood: 80, inst: 'drums' as const },
    { look: 3131, gender: 'm' as const, age: 26, mood: 80, inst: 'bass' as const },
  ];

  return (
    <div className="title-page">
      <div className="title-top">
        <span>v0.2 · 무료 인생 시뮬레이션 · 실제 통계 기반</span>
        <button className="linkbtn" onClick={() => { const m = !muted; setMuted(m); setM(m); }}>{muted ? '소리 꺼짐' : '소리 켜짐'}</button>
      </div>
      <div className="title-grid">
        <div>
          <h1 className="logo">
            인디밴드<br />키우기<em>.</em>
          </h1>
          <p className="lede">
            오늘 {where}에서 약 {perDay.toLocaleString()}명의 아기가 태어납니다. 그중 한 명이 되어 첫 기타부터 마지막 무대까지 살아 봅니다.
            어디서, 어떤 집에서 태어날지는 고를 수 없습니다. 당신이 그랬던 것처럼.
          </p>
          <div className="hero-frame mobile-only" style={{ margin: '4px 0 18px' }}>
            <PixelScene id="festival" people={people} crowd={0.9} night seed={7} label="페스티벌 무대" />
          </div>
          <div className="counters">
            <div className="counter">
              <b>{since.toFixed(2)}</b>
              <span>이 페이지를 연 뒤 {where}에서 태어난 아기</span>
            </div>
            <div className="counter">
              <b>{meta.lives.length}</b>
              <span>살아 본 인생 · 엔딩 도감 {ENDINGS.filter((e) => meta.endings[e.id]).length}/{ENDINGS.length} 단계</span>
            </div>
          </div>
          <div className="ticker" key={tick}>“{TICKS[tick]}”</div>

          <div className="opt-group">
            <span className="label">태어날 나라</span>
            <div className="country-pick">
              {COUNTRY_IDS.map((id) => (
                <button key={id} className={country === id ? 'on' : ''} onClick={() => setCountry(id)}>
                  <span className="cf"><Flag c={id} size={14} /></span>
                  {COUNTRIES[id].name}
                </button>
              ))}
              <button className={`wide ${country === 'random' ? 'on' : ''}`} onClick={() => setCountry('random')}>
                <span className="cf">🎲</span>운명에 맡김
              </button>
            </div>
            <div className="seg-help">
              {country === 'random'
                ? `여섯 나라 중 실제 연간 출생아 수에 비례해 뽑는다 — 미국 ${Math.round(countryBirthShare('US') * 100)}% · 브라질 ${Math.round(countryBirthShare('BR') * 100)}% · 한국 ${Math.round(countryBirthShare('KR') * 100)}%.`
                : `${COUNTRIES[country].quirk} 시뮬레이션상 팬 1만 명 도달 ${COUNTRIES[country].simReach10k}%.`}
            </div>
          </div>
          <div className="opt-group">
            <span className="label">태어날 세상</span>
            <div className="era-pick">
              {ERAS.map((e) => (
                <button key={e.id} className={`${era === e.id ? 'on' : ''} ${e.id === 'any' ? 'wide' : ''}`} onClick={() => setEra(e.id)}>
                  <b>{e.label}</b>
                  <span>{e.id === 'any' ? `${e.from}–${e.to}` : `${e.from}–${String(e.to).slice(2)}년생`}</span>
                </button>
              ))}
            </div>
            <div className="seg-help">{eraHelp(country, era)}</div>
          </div>
          <div className="opt-group">
            <span className="label">한 번의 인생 길이</span>
            <div className="seg">
              {PACES.map((p) => (
                <button key={p.v} className={pace === p.v ? 'on' : ''} onClick={() => setPace(p.v)}>{p.label}</button>
              ))}
            </div>
            <div className="seg-help">스무 살 무렵엔 1년이 약 {Math.round(55 * pace)}초. 사는 동안 멈춤·배속·‘다음 결정까지’ 빨리 감기가 됩니다.</div>
          </div>
          <div className="opt-group">
            <button className="linkbtn" onClick={() => setCustom(!custom)}>{custom ? '운명에 맡기기' : '이름과 성별을 직접 정하기 (선택)'}</button>
            {custom && (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <input className="text-input" placeholder="이름 (성 포함, 비우면 무작위)" maxLength={6} value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, ''))} />
                <div className="seg">
                  {(['random', 'f', 'm'] as const).map((g) => (
                    <button key={g} className={gender === g ? 'on' : ''} onClick={() => setGender(g)}>{g === 'random' ? '무작위' : g === 'f' ? '여성' : '남성'}</button>
                  ))}
                </div>
                <div className="seg-help">남성은 병역 이벤트가 있습니다.</div>
              </div>
            )}
          </div>
          <div className="opt-group">
            <button className="linkbtn" onClick={() => setFateOpen(!fateOpen)}>{fateOpen ? '닫기' : '운명 코드로 태어나기 (친구와 같은 출생)'}</button>
            {fateOpen && (
              <form className="fate-form" onSubmit={(e) => { e.preventDefault(); bornFrom(); }}>
                <div className="row">
                  <input className="text-input" placeholder="예: BR-1967M-3KQ9Z1" maxLength={20} value={fateIn} autoComplete="off" autoCapitalize="characters" enterKeyHint="go" onChange={(e) => { setFateIn(e.target.value); setFateErr(false); }} />
                  <button type="submit" className="btn" disabled={!fateIn.trim()}>태어나기</button>
                </div>
                {fateErr ? <div className="fate-err">코드를 읽을 수 없어요. 나라-연도성별-코드 모양인지 확인해 주세요.</div> : <div className="seg-help">같은 집·재능·외모로 태어나고, 그 뒤는 각자의 선택으로 갈라진다.</div>}
              </form>
            )}
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
            <button className="btn primary block" onClick={born} style={{ fontSize: 17, padding: '15px 18px' }}>태어나기</button>
            {canContinue && <button className="btn block" onClick={onContinue}>{continueLabel.endsWith('보기') ? continueLabel : `이어서 살기 · ${continueLabel}`}</button>}
          </div>
        </div>

        <div>
          <div className="hero-frame desk-only">
            <PixelScene id="festival" people={people} crowd={0.9} night seed={7} label="페스티벌 무대" />
          </div>
          <div className="hero-cap desk-only">FIG.1 — 어느 밴드의 여름 페스티벌. 모든 인물은 가상입니다.</div>
          <div style={{ marginTop: 22 }}>
            <div className="section-title">
              <h3>지난 인생들</h3>
              <button className="linkbtn" onClick={onCollection}>엔딩 도감</button>
            </div>
            <div className="past-lives">
              {meta.lives.slice(0, 5).map((l) => (
                <div key={l.id} className="past">
                  <b>{l.name}</b>
                  <span className="r">{l.rank}</span>
                  <span className="dim">{l.born}–{l.died} · {l.endingTitle.replace(/^\S+ /, '')} · 팬 {count(l.fans)}{l.bestSong ? ` · 〈${l.bestSong}〉` : ''}</span>
                </div>
              ))}
              {!meta.lives.length && <div className="dim">아직 아무도 살지 않았다. 첫 인생을 시작해 보세요.</div>}
            </div>
          </div>
        </div>
      </div>
      <p className="dim" style={{ marginTop: 30 }}>
        {country === 'KR' ? '출생아 수·기대수명·최저임금·지역 인구 분포는 통계청 자료를' : '한국은 통계청, 다른 나라는 각국 통계·국제기구 자료를'} 반올림해 썼고, 그 밖의 확률은 게임용 가정입니다. 현실의 통계가 한 사람의 미래를 결정하지 않습니다.
        주인공과 주변 인물, 모든 곡은 가상입니다(곡은 플레이 중 즉석에서 작곡). 그 시대 음악사를 보여 주려고 실존 밴드의 이름·활동 기간·스타일이 나오지만, 그 밴드들과는 아무 관계가 없고 그들의 곡을 재생하지 않습니다.
      </p>
    </div>
  );
}
