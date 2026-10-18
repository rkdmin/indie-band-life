import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, Npc, Song } from '../sim/types';
import { SKILLS } from '../sim/types';
import { Portrait } from '../art/Portrait';
import { Cover } from '../art/Cover';
import { CAREER_LABEL, TRAIT_LABEL, npcAge, relationLabel } from '../sim/npc';
import { GENRE_INFO, INST_LABEL, MOOD_LABEL, SKILL_LABEL } from '../sim/data/world';
import { count } from '../sim/korean';
import { getAnalyser, nowPlaying, onPlaybackChange, playSong, renderWav, stopSong } from '../audio/player';
import { saveFile } from '../platform';
import { FanGraph } from './FanGraph';
import { WAVES, historyBetween } from '../sim/data/history';
import { COUNTRIES, type CountryId } from '../sim/data/countries';

// ───────────────────────── 사람들 ─────────────────────────
export function PeopleSheet({ s }: { s: GameState }) {
  const [filter, setFilter] = useState<'all' | 'band' | 'close'>('all');
  const list = Object.values(s.npcs)
    .filter((n) => (filter === 'band' ? n.inBand : filter === 'close' ? n.affinity >= 40 : true))
    .sort((a, b) => Number(b.inBand) - Number(a.inBand) || Number(b.alive) - Number(a.alive) || b.affinity - a.affinity);
  return (
    <>
      <div className="seg">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>전체 {Object.keys(s.npcs).length}</button>
        <button className={filter === 'close' ? 'on' : ''} onClick={() => setFilter('close')}>가까운 사람</button>
        <button className={filter === 'band' ? 'on' : ''} onClick={() => setFilter('band')}>밴드</button>
      </div>
      {list.map((n) => (
        <PersonRow key={n.id} s={s} n={n} />
      ))}
      {!list.length && <div className="dim">아직 아무도 없다.</div>}
    </>
  );
}

function PersonRow({ s, n }: { s: GameState; n: Npc }) {
  const a = npcAge(s, n);
  const affColor = n.affinity >= 40 ? 'var(--mint)' : n.affinity >= 0 ? 'var(--sky)' : 'var(--bad)';
  return (
    <div className="person" style={{ opacity: n.alive ? 1 : 0.5 }}>
      <div className="av">
        <Portrait person={{ look: n.look, gender: n.gender, age: Math.max(0, a), mood: 50 + n.affinity / 2 }} />
      </div>
      <div>
        <div className="nm">
          {n.name} {!n.alive && '🕊️'} <span className="chip">{relationLabel(n)}</span>
        </div>
        <div className="meta">
          {a}세 · {n.role === 'parent' ? '가족' : `${INST_LABEL[n.inst]} ${Math.round(n.skill)}`} · {CAREER_LABEL[n.career]}
          <br />
          {n.metAge}세 때 {n.metAt}에서 · {n.traits.map((t) => TRAIT_LABEL[t]).join(', ')}
        </div>
        {n.role !== 'parent' && (
          <div className="aff">
            친밀도
            <div className="bar">
              <i style={{ width: `${(n.affinity + 100) / 2}%`, background: affColor }} />
            </div>
            <b>{Math.round(n.affinity)}</b>
          </div>
        )}
        {n.memories[0] && <div className="mem">“{n.memories[0]}”</div>}
        {n.affinity >= 40 && n.role !== 'parent' && <div className="mem">꿈: {n.dream}</div>}
      </div>
    </div>
  );
}

// ───────────────────────── 밴드 ─────────────────────────
export function BandSheet({ s }: { s: GameState }) {
  const p = s.player;
  const b = s.band;
  return (
    <>
      {b ? (
        <div className="band-hero">
          <div className="dim">{GENRE_INFO[b.genre].label} · {b.formedYear}년 결성 · {b.label === 'none' ? '무소속' : b.label === 'indie' ? '인디 레이블' : '대형 기획사'}</div>
          <h2>{b.name}</h2>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="chip big">팀워크 {Math.round(b.chemistry)}</span>
            <span className="chip">공연 {b.gigs}회</span>
            <span className="chip">팬 {count(p.fans)}</span>
          </div>
          {b.bestGig && <div className="dim" style={{ marginTop: 6 }}>최고의 공연: {b.bestGig}</div>}
          <div className="spacer" />
          <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <Member look={p.look} gender={p.gender} age={s.time - p.birthYear} name={p.name + ' (나)'} inst={INST_LABEL[b.playerInst]} skill={p.skills[b.playerInst]} />
            {b.memberIds.map((id) => {
              const n = s.npcs[id];
              return n ? <Member key={id} look={n.look} gender={n.gender} age={s.time - n.birthYear} name={n.name} inst={INST_LABEL[n.inst]} skill={n.skill} sat={n.sat ?? 60} genre={GENRE_INFO[n.genre].label} fit={n.genre === b.genre} /> : null;
            })}
          </div>
        </div>
      ) : (
        <div className="card">
          <b>아직 밴드가 없다.</b>
          <div className="dim">16세 이후 ‘밴드 결성’ 행동이나, 오랜 친구의 연락으로 시작할 수 있다. 친한 음악 친구가 많을수록 좋은 멤버가 모인다.</div>
        </div>
      )}
      <div className="card">
        <div className="section-title"><h3>팬의 증감</h3><span className="dim">지금 {count(p.fans)}명 · 최고 {count(s.peakFans)}명</span></div>
        <FanGraph s={s} />
      </div>
      <div className="card">
        <div className="section-title"><h3>나의 실력</h3><span className="dim">평판 {Math.round(p.rep)}</span></div>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {SKILLS.map((k) => (
            <div key={k} className="skill-row">
              <span>{SKILL_LABEL[k]}{p.mainInst === k ? ' ★' : ''}</span>
              <div className="bar"><i style={{ width: `${p.skills[k]}%`, background: k === 'compose' ? 'var(--violet)' : k === 'stage' ? 'var(--pink)' : 'var(--coral)' }} /></div>
              <b>{Math.round(p.skills[k])}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="section-title"><h3>장르 친숙도</h3></div>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {Object.values(GENRE_INFO).map((g) => (
            <div key={g.id} className="skill-row">
              <span>{g.label}</span>
              <div className="bar"><i style={{ width: `${p.genre[g.id]}%`, background: g.color }} /></div>
              <b>{Math.round(p.genre[g.id])}</b>
            </div>
          ))}
        </div>
      </div>
      {s.pastBands.length > 0 && (
        <div className="card">
          <div className="section-title"><h3>지나간 밴드</h3></div>
          {s.pastBands.map((pb) => (
            <div key={pb.id} className="dim" style={{ marginTop: 6 }}>
              〈{pb.name}〉 {pb.formedYear}–{pb.endedYear} · {GENRE_INFO[pb.genre].label} · 공연 {pb.gigs}회
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Member({ look, gender, age, name, inst, skill, sat, genre, fit }: { look: number; gender: 'm' | 'f'; age: number; name: string; inst: string; skill: number; sat?: number; genre?: string; fit?: boolean }) {
  return (
    <div style={{ textAlign: 'center', width: 72 }}>
      <div style={{ overflow: 'hidden', width: 48, height: 58, margin: '0 auto', border: '1px solid #f3eee3' }}>
        <Portrait person={{ look, gender, age, mood: 70 }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, lineHeight: 1.2 }}>{name}</div>
      <div className="dim">{inst} {Math.round(skill)}</div>
      {sat !== undefined && (
        <>
          <div className="dim" style={{ color: fit ? '#9fe0b4' : '#ffb3a8' }}>{genre}</div>
          <div className="sat" title={`만족도 ${Math.round(sat)}`}>
            <i style={{ width: `${sat}%`, background: sat < 30 ? '#ff6a6a' : sat < 55 ? '#ffd166' : '#73e2c5' }} />
          </div>
          <div className="dim" style={{ fontSize: 10.5 }}>만족도 {Math.round(sat)}</div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── 음반 ─────────────────────────
export function RecordsSheet({ s }: { s: GameState }) {
  const unrel = s.songs.filter((x) => !x.released);
  return (
    <>
      <NowPlaying />
      {!s.songs.length && (
        <div className="card">
          <b>아직 쓴 곡이 없다.</b>
          <div className="dim">14세부터 ‘작곡’을 할 수 있다. 인생에서 겪은 일이 곡의 주제가 되고, 직접 겪은 주제로 쓴 곡은 더 좋아진다. 모든 곡은 실제로 재생된다.</div>
        </div>
      )}
      {[...s.albums].reverse().map((al) => (
        <div key={al.id} className="album">
          <Cover seed={al.coverSeed} genre={al.genre} title={al.title} artist={al.bandName} size={96} />
          <div>
            <div style={{ fontWeight: 900 }}>{al.title}</div>
            <div className="dim">
              {al.bandName} · {al.year} · {{ single: '싱글', ep: 'EP', full: '정규' }[al.kind]} · ★ {al.score}
            </div>
            <div className="dim">{al.songIds.length}곡 · 판매 {count(al.sales)}장</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            {al.songIds.map((id) => {
              const song = s.songs.find((x) => x.id === id);
              return song ? <SongRow key={id} song={song} /> : null;
            })}
          </div>
        </div>
      ))}
      {unrel.length > 0 && (
        <div className="card">
          <div className="section-title"><h3>데모 · 미발매</h3><span className="dim">‘녹음·발매’로 세상에 내보내자</span></div>
          {unrel.map((x) => (
            <SongRow key={x.id} song={x} />
          ))}
        </div>
      )}
    </>
  );
}

export function SongRow({ song, lyric = true }: { song: Song; lyric?: boolean }) {
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const off = onPlaybackChange(() => force((x) => x + 1));
    return () => {
      off();
    };
  }, []);
  const playing = nowPlaying().id === song.id;
  const download = async () => {
    setBusy(true);
    try {
      await saveFile(await renderWav(song), `${song.title}.wav`);
    } catch {
      // 네이티브 공유 시트를 닫은 경우 — 조용히 무시
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="song">
      <button className={`play ${playing ? 'on' : ''}`} onClick={() => (playing ? stopSong() : playSong(song))} aria-label={playing ? '정지' : '재생'}>
        {playing ? '■' : '▶'}
      </button>
      <div className="grow">
        <div className="t">
          {song.title} {song.hit && <span className="chip big">{song.revival ? '역주행' : 'HIT'}{song.peak ? ` ${song.peak}위` : ''}</span>}
        </div>
        <div className="m">
          {GENRE_INFO[song.genre].label} · {MOOD_LABEL[song.mood]} · {song.theme} · {song.writtenAge}세{song.released ? ` · ${count(song.streams)}회 재생` : ''}
        </div>
        {playing && lyric && <div className="lyric">{song.lyric.join('\n')}</div>}
      </div>
      <span className={`q ${song.quality >= 70 ? 'hi' : ''}`}>{song.quality}</span>
      <button className="btn small ghost" disabled={busy} onClick={download} aria-label="WAV로 저장" title="WAV로 저장">
        {busy ? '…' : '⤓'}
      </button>
    </div>
  );
}

function NowPlaying() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [, force] = useState(0);
  useEffect(() => {
    const off = onPlaybackChange(() => force((x) => x + 1));
    return () => {
      off();
    };
  }, []);
  const np = nowPlaying();
  useEffect(() => {
    if (!np.id) return;
    let raf = 0;
    const an = getAnalyser();
    const data = new Uint8Array(an?.frequencyBinCount ?? 256);
    const draw = () => {
      const cv = canvas.current;
      if (cv && an) {
        const g = cv.getContext('2d')!;
        const w = (cv.width = cv.clientWidth * devicePixelRatio);
        const h = (cv.height = cv.clientHeight * devicePixelRatio);
        an.getByteFrequencyData(data);
        g.clearRect(0, 0, w, h);
        const bars = 48;
        for (let i = 0; i < bars; i++) {
          const v = data[Math.floor((i / bars) * data.length * 0.7)] / 255;
          const bh = Math.max(2, v * h);
          const grad = g.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#ff7a59');
          grad.addColorStop(1, '#a98bff');
          g.fillStyle = grad;
          g.fillRect((i * w) / bars + 1, h - bh, w / bars - 2, bh);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [np.id]);
  if (!np.id) return null;
  return (
    <div className="card" style={{ padding: 10 }}>
      <div className="dim">♪ 재생 중 · {np.pb?.score.key} · {np.pb?.score.bpm} BPM</div>
      <canvas ref={canvas} className="viz" />
    </div>
  );
}

// ───────────────────────── 연대기 ─────────────────────────
export function ChronicleSheet({ s }: { s: GameState }) {
  const [mode, setMode] = useState<'all' | 'me' | 'world'>('all');
  const ct = (s.player.country ?? 'KR') as CountryId;
  const born = s.player.birthYear;
  // 내 인생과 그 시절 실제 음악사를 한 줄에 엮는다
  const rows = useMemo(() => {
    const mine = s.chronicle.map((e) => ({ t: e.year + 0.5, mine: true as const, e }));
    const world = historyBetween(born - 15, s.time, ct).map((h) => ({ t: h.y + ((h.m ?? 6) - 0.5) / 12, mine: false as const, h }));
    const list = mode === 'me' ? mine : mode === 'world' ? world : [...mine, ...world];
    return list.sort((a, b) => b.t - a.t);
  }, [s.chronicle, s.time, born, ct, mode]);
  const waves = WAVES.filter((w) => w.c === ct && w.from <= s.time && w.to >= born);
  return (
    <div>
      <div className="seg" role="tablist">
        {([['all', '전부'], ['me', '내 인생'], ['world', '그 시절 음악사']] as const).map(([k, l]) => (
          <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      {mode !== 'me' && waves.length > 0 && (
        <div className="waves">
          {waves.map((w) => (
            <div key={w.id} className={`wave-chip ${s.flags.rodeWave === w.id ? 'rode' : ''}`}>
              <b>{w.name}</b> <span>{w.from}–{w.to}</span>
              {s.flags.rodeWave === w.id && <em>그 물결의 한가운데 있었다</em>}
            </div>
          ))}
        </div>
      )}
      <div className="timeline">
        {rows.map((r, i) =>
          r.mine ? (
            <div key={i} className={`tl ${r.e.kind}`}>
              <div className="when">{r.e.year}년 · {r.e.age}세</div>
              <div className="what">{r.e.text}</div>
            </div>
          ) : (
            <div key={i} className="tl world">
              <div className="when">
                {r.h.y}{r.h.m ? `.${String(r.h.m).padStart(2, '0')}` : ''} · {r.h.c === 'GLOBAL' ? '🌐' : COUNTRIES[r.h.c].flag}
                {r.h.y >= born ? ` · 나는 ${r.h.y - born}세` : ' · 태어나기 전'}
              </div>
              <div className="what">{r.h.text}</div>
              <div className="src">출처: {r.h.src}</div>
            </div>
          ),
        )}
        {!rows.length && <div className="dim">아직 기록이 없다.</div>}
      </div>
    </div>
  );
}
