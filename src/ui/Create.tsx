import { useMemo, useState } from 'react';
import type { Gender, Region } from '../sim/types';
import type { NewGameOptions } from '../sim/engine';
import { REGIONS, eraOf, minWage } from '../sim/data/world';
import { randomName } from '../sim/names';
import { Rng } from '../sim/rng';
import { Avatar } from '../art/Avatar';
import { sfx } from '../audio/player';
import type { Meta } from './save';

interface Props {
  onStart: (o: NewGameOptions) => void;
  onBack: () => void;
  meta: Meta;
}

export function Create({ onStart, onBack, meta }: Props) {
  const [gender, setGender] = useState<Gender>(() => (Math.random() < 0.5 ? 'm' : 'f'));
  const [birthYear, setBirthYear] = useState(2003);
  const [name, setName] = useState(() => randomName(new Rng(Date.now() % 1e9), gender, 2003));
  const [region, setRegion] = useState<Region | 'random'>('random');
  const look = useMemo(() => Math.floor(Math.random() * 1e6), []);

  const reroll = () => {
    sfx('tap');
    setName(randomName(new Rng(Date.now() % 1e9), gender, birthYear));
  };
  const twenty = eraOf(birthYear + 22);
  const valid = name.trim().length >= 2 && name.trim().length <= 6;

  return (
    <div className="app no-tabs">
      <div className="create">
        <div className="row">
          <button className="x" onClick={onBack} aria-label="뒤로">←</button>
          <span className="dim">{meta.lives.length ? `${meta.lives.length + 1}번째 인생` : '첫 번째 인생'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ borderRadius: '50%', overflow: 'hidden', background: '#ffffff10' }}>
            <Avatar look={look} gender={gender} age={0} size={80} mood={80} />
          </div>
          <div>
            <h2>새로운 인생</h2>
            <div className="sub" style={{ fontSize: 13 }}>어떤 음악을 남기고 살아갈까?</div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="nm">이름</label>
          <div className="row">
            <input id="nm" className="text-input grow" value={name} maxLength={6} onChange={(e) => setName(e.target.value.replace(/\s/g, ''))} />
            <button className="btn" onClick={reroll} aria-label="이름 다시 뽑기">🎲</button>
          </div>
          {!valid && <div className="dim" style={{ color: 'var(--bad)' }}>2~6글자로 지어 주세요 (성 포함)</div>}
        </div>

        <div className="field">
          <label>성별 <span className="dim">· 남성은 병역 이벤트가 있습니다</span></label>
          <div className="seg">
            <button className={gender === 'f' ? 'on' : ''} onClick={() => setGender('f')}>여성</button>
            <button className={gender === 'm' ? 'on' : ''} onClick={() => setGender('m')}>남성</button>
          </div>
        </div>

        <div className="field">
          <label>태어난 해 · <b style={{ color: 'var(--ink)' }}>{birthYear}년</b></label>
          <input className="range" type="range" min={1985} max={2015} value={birthYear} onChange={(e) => setBirthYear(+e.target.value)} />
          <div className="era-box">
            스무 살 무렵은 <b>{twenty.name}</b> — {twenty.desc}.<br />
            {birthYear + 16}년 알바 최저시급 {minWage(birthYear + 16).toLocaleString()}원
          </div>
        </div>

        <div className="field">
          <label>태어난 곳</label>
          <div className="seg" style={{ gridAutoFlow: 'row', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <button className={region === 'random' ? 'on' : ''} onClick={() => setRegion('random')}>🎲 운명에 맡김</button>
            {REGIONS.map((r) => (
              <button key={r.id} className={region === r.id ? 'on' : ''} onClick={() => setRegion(r.id)}>{r.label}</button>
            ))}
          </div>
          <div className="dim" style={{ marginTop: 6 }}>
            {region === 'random' ? '실제 인구 분포 비율로 정해집니다. 가정 형편과 부모님 취향도 운명이에요.' : REGIONS.find((r) => r.id === region)!.desc}
          </div>
        </div>

        <button
          className="btn primary block"
          disabled={!valid}
          onClick={() => {
            sfx('big');
            onStart({ name: name.trim(), gender, birthYear, region: region === 'random' ? undefined : region });
          }}
        >
          👶 태어나기
        </button>
      </div>
    </div>
  );
}
