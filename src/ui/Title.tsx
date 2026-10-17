import { useEffect, useMemo, useState } from 'react';
import type { Gender } from '../sim/types';
import type { NewGameOptions } from '../sim/engine';
import { birthsIn } from '../sim/data/world';
import { randomName } from '../sim/names';
import { Rng } from '../sim/rng';
import { PixelScene } from '../art/PixelScene';
import { isMuted, playBgm, setMuted, sfx, stopBgm } from '../audio/player';
import { ENDINGS } from '../sim/endings';
import { count } from '../sim/korean';
import type { Meta } from './save';

const ERAS = [
  { id: 'past', label: '지난 세상', from: 1985, to: 1999, help: '1985~1999년생. 홍대 클럽데이와 CD의 마지막 시절에 청춘을 보낸다.' },
  { id: 'now', label: '지금 세상', from: 2000, to: 2012, help: '2000~2012년생. 숏폼과 밴드 붐 한가운데서 스무 살이 된다.' },
  { id: 'next', label: '다가올 세상', from: 2013, to: 2026, help: '2013~2026년생. AI 음악이 넘쳐나는 세상에서 사람의 라이브를 한다.' },
  { id: 'any', label: '아무 때나', from: 1985, to: 2026, help: '태어날 해도 운명에 맡긴다.' },
] as const;

const PACES = [
  { v: 0.7, label: '약 20분' },
  { v: 1, label: '약 30분' },
  { v: 1.6, label: '약 45분' },
];

const TICKS = [
  '지금 이 순간에도 홍대 어딘가에서 누군가 첫 합주를 한다.',
  '세 살 어린이집 단짝이 서른에 드러머가 되어 돌아왔다.',
  '밴드부 친구랑 만든 첫 곡이 20년 뒤 역주행했다.',
  '군악대 오디션에 떨어지고 쓴 노래가 첫 싱글이 됐다.',
  '우리 밴드는 유명해졌는데, 보컬이 먼저 떠났다.',
  '나는 록스타가 되지 못했지만, 마지막 앨범을 남겼다.',
];

interface Props {
  meta: Meta;
  canContinue: boolean;
  continueLabel: string;
  onContinue: () => void;
  onBorn: (o: NewGameOptions, pace: number) => void;
  onCollection: () => void;
}

export function Title({ meta, canContinue, continueLabel, onContinue, onBorn, onCollection }: Props) {
  const [era, setEra] = useState<(typeof ERAS)[number]['id']>('now');
  const [pace, setPace] = useState(1);
  const [custom, setCustom] = useState(false);
  const [gender, setGender] = useState<Gender | 'random'>('random');
  const [name, setName] = useState('');
  const [muted, setM] = useState(isMuted());
  const [tick, setTick] = useState(0);
  const [since, setSince] = useState(0);
  const t0 = useMemo(() => Date.now(), []);
  const perDay = Math.round(birthsIn(2024) / 365);

  useEffect(() => {
    const a = window.setInterval(() => setTick((x) => (x + 1) % TICKS.length), 4200);
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
    const r = new Rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const e = ERAS.find((x) => x.id === era)!;
    const birthYear = r.int(e.from, e.to);
    const g: Gender = gender === 'random' ? (r.chance(0.51) ? 'm' : 'f') : gender;
    const nm = custom && name.trim().length >= 2 ? name.trim() : randomName(r, g, birthYear);
    onBorn({ name: nm, gender: g, birthYear }, pace);
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
            오늘 대한민국에서 약 {perDay.toLocaleString()}명의 아기가 태어납니다. 그중 한 명이 되어 첫 기타부터 마지막 무대까지 살아 봅니다.
            어디서, 어떤 집에서 태어날지는 고를 수 없습니다. 당신이 그랬던 것처럼.
          </p>
          <div className="hero-frame mobile-only" style={{ margin: '4px 0 18px' }}>
            <PixelScene id="festival" people={people} crowd={0.9} night seed={7} label="페스티벌 무대" />
          </div>
          <div className="counters">
            <div className="counter">
              <b>{since.toFixed(2)}</b>
              <span>이 페이지를 연 뒤 대한민국에서 태어난 아기</span>
            </div>
            <div className="counter">
              <b>{meta.lives.length}</b>
              <span>이 기기에서 살아 본 인생 · 엔딩 {Object.keys(meta.endings).length}/{ENDINGS.length}</span>
            </div>
          </div>
          <div className="ticker" key={tick}>“{TICKS[tick]}”</div>

          <div className="opt-group">
            <span className="label">태어날 세상</span>
            <div className="seg">
              {ERAS.map((e) => (
                <button key={e.id} className={era === e.id ? 'on' : ''} onClick={() => setEra(e.id)}>{e.label}</button>
              ))}
            </div>
            <div className="seg-help">{ERAS.find((e) => e.id === era)!.help}</div>
          </div>
          <div className="opt-group">
            <span className="label">한 번의 인생 길이</span>
            <div className="seg">
              {PACES.map((p) => (
                <button key={p.v} className={pace === p.v ? 'on' : ''} onClick={() => setPace(p.v)}>{p.label}</button>
              ))}
            </div>
            <div className="seg-help">스무 살 무렵엔 1년이 약 {Math.round(22 * pace)}초. 사는 동안 멈춤과 배속이 됩니다.</div>
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
        출생아 수·기대수명·최저임금·지역 인구 분포는 통계청 자료를 반올림해 썼고, 그 밖의 확률은 게임용 가정입니다. 현실의 통계가 한 사람의 미래를 결정하지 않습니다.
        모든 곡은 플레이 중 즉석에서 작곡되며, 실존 인물·밴드와 무관합니다.
      </p>
    </div>
  );
}
