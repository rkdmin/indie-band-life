// 행동의 세부 선택: 악기·장르·작곡 주제·공연장·발매 곡·만날 친구

import { useMemo, useState } from 'react';
import type { GameState, Genre, Inst, Mood } from '../sim/types';
import { GENRES, INSTRUMENTS } from '../sim/types';
import type { ActionDef, ParamKind } from '../sim/actions';
import { venuesFor } from '../sim/actions';
import { Ctx } from '../sim/ctx';
import { Rng } from '../sim/rng';
import { GENRE_INFO, INST_LABEL, MOOD_LABEL, VENUES } from '../sim/data/world';
import { availableThemes, themeByKey, unreleased } from '../sim/songs';
import { won } from '../sim/korean';
import { relationLabel } from '../sim/npc';
import { Sheet } from './Sheet';
import { Avatar } from '../art/Avatar';
import { sfx } from '../audio/player';

export function paramLabel(s: GameState, kind: ParamKind, v: string): string {
  switch (kind) {
    case 'inst':
      return INST_LABEL[v as Inst];
    case 'genre':
      return GENRE_INFO[v as Genre].label;
    case 'compose': {
      const [t, m] = v.split(':');
      return `${themeByKey(t).label} · ${MOOD_LABEL[m as Mood]}`;
    }
    case 'venue':
      return VENUES.find((x) => x.id === v)?.label ?? v;
    case 'release': {
      const [title, ids] = v.split('|');
      const n = ids.split(',').length;
      return `〈${title}〉 ${n >= 7 ? '정규' : n >= 3 ? 'EP' : '싱글'}`;
    }
    case 'friend':
      return s.npcs[v]?.name ?? '';
  }
}

interface Props {
  s: GameState;
  def: ActionDef;
  onPick: (param: string) => void;
  onCancel: () => void;
}

export function ParamSheet({ s, def, onPick, onCancel }: Props) {
  const c = useMemo(() => new Ctx(s, new Rng(s.rng)), [s]);
  const pick = (v: string) => {
    sfx('tap');
    onPick(v);
  };
  const title = `${def.emoji} ${def.label}`;
  switch (def.param) {
    case 'inst':
      return (
        <Sheet title={title} onClose={onCancel}>
          <div className="dim">어떤 악기를 파고들까?</div>
          <div className="picker-grid">
            {INSTRUMENTS.map((i) => (
              <button key={i} className={`pick ${s.player.mainInst === i ? 'on' : ''}`} onClick={() => pick(i)}>
                {INST_LABEL[i]} {s.player.mainInst === i && '★'}
                <small>현재 {Math.round(s.player.skills[i])}</small>
              </button>
            ))}
          </div>
        </Sheet>
      );
    case 'genre':
      return (
        <Sheet title={title} onClose={onCancel}>
          <div className="picker-grid">
            {GENRES.map((g) => (
              <button key={g} className="pick" onClick={() => pick(g)} style={{ borderLeft: `4px solid ${GENRE_INFO[g].color}` }}>
                {GENRE_INFO[g].label}
                <small>친숙도 {Math.round(s.player.genre[g])} · {GENRE_INFO[g].path}</small>
              </button>
            ))}
          </div>
        </Sheet>
      );
    case 'compose':
      return <ComposePicker s={s} title={title} onPick={pick} onCancel={onCancel} />;
    case 'venue':
      return (
        <Sheet title={title} onClose={onCancel}>
          <div className="dim">팬 {s.player.fans.toLocaleString()}명 · 잔고 {won(s.player.money)}</div>
          {venuesFor(c).map((v) => (
            <button key={v.id} className="pick" disabled={!!v.locked} onClick={() => pick(v.id)}>
              {v.label} <span className="dim">· {v.capacity.toLocaleString()}석</span>
              <small>
                {v.locked ? `🔒 ${v.locked}` : v.cost ? `대관·운영 ${won(c.krw(v.cost))} · 티켓 ${won(c.krw(v.ticket))}` : '무료 · 경험치와 새 팬'}
              </small>
            </button>
          ))}
        </Sheet>
      );
    case 'release':
      return <ReleasePicker s={s} title={title} onPick={pick} onCancel={onCancel} />;
    case 'friend': {
      const list = Object.values(s.npcs)
        .filter((n) => n.alive && n.role !== 'parent' && n.affinity > (def.id === 'write_letter' ? 10 : 0))
        .sort((a, b) => b.affinity - a.affinity);
      return (
        <Sheet title={title} onClose={onCancel}>
          {list.map((n) => (
            <button key={n.id} className="pick row" onClick={() => pick(n.id)}>
              <Avatar look={n.look} gender={n.gender} age={s.time - n.birthYear} size={40} blink={false} />
              <span className="grow">
                {n.name}
                <small>{relationLabel(n)} · 친밀도 {Math.round(n.affinity)} · {n.metAt}</small>
              </span>
            </button>
          ))}
        </Sheet>
      );
    }
    default:
      return null;
  }
}

function ComposePicker({ s, title, onPick, onCancel }: { s: GameState; title: string; onPick: (v: string) => void; onCancel: () => void }) {
  const themes = availableThemes(s);
  const [theme, setTheme] = useState<string | null>(null);
  const t = theme ? themeByKey(theme) : null;
  const moods: Mood[] = t ? [...t.moods, ...(['bright', 'wistful', 'angry', 'dreamy', 'calm', 'epic'] as Mood[]).filter((m) => !t.moods.includes(m))] : [];
  return (
    <Sheet title={title} onClose={onCancel}>
      {!t && (
        <>
          <div className="dim">무엇에 대한 노래를 쓸까? ✦ 표시는 직접 겪은 일 — 진정성 보너스</div>
          <div className="picker-grid">
            {themes.map((x) => {
              const lived = !!s.flags[`theme:${x.key}`];
              return (
                <button key={x.key} className={`pick ${lived ? 'on' : ''}`} onClick={() => { sfx('tap'); setTheme(x.key); }}>
                  {lived ? '✦ ' : ''}{x.label}
                  <small>{x.words.slice(0, 3).join(' · ')}</small>
                </button>
              );
            })}
          </div>
        </>
      )}
      {t && (
        <>
          <div className="dim">〈{t.label}〉 — 어떤 분위기로?</div>
          <div className="picker-grid">
            {moods.map((m, i) => (
              <button key={m} className={`pick ${i < t.moods.length ? 'on' : ''}`} onClick={() => onPick(`${t.key}:${m}`)}>
                {MOOD_LABEL[m]}
                <small>{i < t.moods.length ? '주제와 잘 어울림' : '의외의 조합'}</small>
              </button>
            ))}
          </div>
          <button className="btn small ghost" onClick={() => setTheme(null)}>← 주제 다시 고르기</button>
        </>
      )}
    </Sheet>
  );
}

function ReleasePicker({ s, title, onPick, onCancel }: { s: GameState; title: string; onPick: (v: string) => void; onCancel: () => void }) {
  const songs = [...unreleased(s)].sort((a, b) => b.quality - a.quality);
  const [sel, setSel] = useState<string[]>(songs.slice(0, 1).map((x) => x.id));
  const [name, setName] = useState(songs[0]?.title ?? '');
  const n = sel.length;
  const kind = n >= 7 ? '정규 앨범' : n >= 3 ? 'EP' : '싱글';
  const labelPays = !!s.band && s.band.label !== 'none';
  const cost = labelPays ? 0 : (n >= 7 ? 9_000_000 : n >= 3 ? 4_000_000 : 1_200_000) * (new Ctx(s, new Rng(1)).price);
  const avg = n ? Math.round(songs.filter((x) => sel.includes(x.id)).reduce((a, x) => a + x.quality, 0) / n) : 0;
  return (
    <Sheet title={title} onClose={onCancel}>
      <div className="dim">1~2곡 싱글 · 3~6곡 EP · 7곡 이상 정규. 좋은 곡만 모으면 평점이 오른다.</div>
      {songs.map((x) => (
        <label key={x.id} className="pick row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={sel.includes(x.id)} onChange={(e) => setSel(e.target.checked ? [...sel, x.id] : sel.filter((y) => y !== x.id))} />
          <span className="grow">
            〈{x.title}〉
            <small>{x.theme} · {MOOD_LABEL[x.mood]} · {x.writtenAge}세</small>
          </span>
          <span className={`q ${x.quality >= 70 ? 'hi' : ''}`}>{x.quality}</span>
        </label>
      ))}
      <div className="field">
        <label>타이틀</label>
        <input className="text-input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="era-box">
        {kind} · 평균 완성도 <b>{avg}</b> · 제작비 {labelPays ? '레이블 부담' : won(cost)}
        {!labelPays && s.player.money < cost && <div style={{ color: 'var(--bad)' }}>잔고가 부족해 빚이 생깁니다</div>}
      </div>
      <button className="btn primary block" disabled={!n || !name.trim()} onClick={() => onPick(`${name.trim().replace(/\|/g, '')}|${sel.join(',')}`)}>
        💿 {kind} 발매 준비
      </button>
    </Sheet>
  );
}
