// 엔딩: 신문 부고면처럼. 일생을 한 문단으로, 대표곡을 틀어 두고.

import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../sim/types';
import { Cover } from '../art/Cover';
import { drawPerson } from '../art/pixel';
import { ENDINGS } from '../sim/endings';
import { biography } from '../sim/bio';
import { rarityText } from '../sim/data/fate';
import { GENRE_INFO, INST_LABEL } from '../sim/data/world';
import { count } from '../sim/korean';
import { playSong, sfx, stopBgm, stopSong } from '../audio/player';
import { ChronicleSheet, SongRow } from './Sheets';
import { shareFile } from '../platform';
import { FanGraph } from './FanGraph';
import type { Meta } from './save';

interface Props {
  state: GameState;
  meta: Meta;
  onNewLife: () => void;
  onQuit: () => void;
}

export function Ending({ state: s, meta, onNewLife, onQuit }: Props) {
  const e = s.ending!;
  const best = s.songs.find((x) => x.id === e.bestSongId) ?? null;
  const [toast, setToast] = useState<string | null>(null);
  const deathAge = s.player.deathAge ?? Math.floor(s.time - s.player.birthYear);
  const bandName = s.band?.name ?? s.pastBands[s.pastBands.length - 1]?.name ?? null;
  const genre = s.band?.genre ?? s.pastBands[0]?.genre ?? null;
  const bio = useMemo(() => biography(s), [s]);
  const tracks = useMemo(() => {
    const seen = new Set<string>();
    let singleSeen = 0;
    return s.chronicle
      .filter((c) => c.kind === 'big' || c.kind === 'band' || (c.kind === 'music' && !/^싱글/.test(c.text)) || (c.kind === 'music' && !(singleSeen++)))
      .filter((c) => (seen.has(c.text) ? false : (seen.add(c.text), true)))
      .slice(0, 14);
  }, [s.chronicle]);
  const credits = useMemo(() => {
    const ids = new Set<string>([...s.pastBands, ...(s.band ? [s.band] : [])].flatMap((b) => b.memberIds));
    const ppl = Object.values(s.npcs)
      .filter((n) => n.role !== 'parent' && (ids.has(n.id) || n.affinity >= 45 || n.role === 'partner'))
      .sort((a, b) => Number(ids.has(b.id)) - Number(ids.has(a.id)) || b.affinity - a.affinity)
      .slice(0, 8);
    return ppl.map((n) => ({
      id: n.id,
      name: n.name,
      role: ids.has(n.id) ? INST_LABEL[n.inst] : n.role === 'partner' ? '사랑' : '친구',
      how: `${n.metAge}살, ${n.metAt}`,
    }));
  }, [s]);
  const highlights = useMemo(() => s.chronicle.filter((c) => c.kind === 'big' || c.kind === 'band').slice(-8), [s.chronicle]);

  useEffect(() => {
    stopBgm();
    if (best) {
      const t = window.setTimeout(() => playSong(best), 900);
      return () => {
        window.clearTimeout(t);
        stopSong();
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    sfx('tap');
    try {
      const blob = await renderShareCard(s, bio, bandName);
      const text = `${s.player.name}(${s.player.birthYear}–${s.player.birthYear + deathAge})의 인생: ${e.title.replace(/^\S+ /, '')} · ${e.rank}랭크${best ? `\n대표곡 〈${best.title}〉` : ''}\n#인디밴드키우기`;
      const how = await shareFile(blob, `인디밴드키우기_${s.player.name}.png`, text, '인디밴드 키우기');
      if (how === 'downloaded') {
        try {
          await navigator.clipboard.writeText(text);
          setToast('카드 이미지를 저장하고 문구를 복사했어요');
        } catch {
          setToast('카드 이미지를 저장했어요');
        }
      }
    } catch {
      setToast('공유를 취소했어요');
    }
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="obit-wrap">
      {toast && <div className="toast">{toast}</div>}
      <article className="liner">
        <header className="liner-head">
          <span>LINER NOTES</span>
          <span>{s.player.birthYear}–{s.player.birthYear + deathAge}</span>
        </header>
        <div className="liner-top">
          <div className="liner-cover">
            <Cover seed={s.seed} genre={genre ?? 'indierock'} title={e.title.replace(/^\S+ /, '')} artist={s.player.name} size={140} />
            <div className="liner-sticker" aria-label={`랭크 ${e.rank}`}>{e.rank}</div>
          </div>
          <div>
            <div className="liner-artist">{s.player.name}{bandName ? ` · 〈${bandName}〉` : ''}</div>
            <h1 className="liner-album">{e.title.replace(/^\S+ /, '')}</h1>
            <div className="liner-sub">{e.subtitle}</div>
            <div className="liner-years">
              {s.player.birthYear} – {s.player.birthYear + deathAge} · {deathAge}세{genre ? ` · ${GENRE_INFO[genre].label}` : ''}
            </div>
            {s.player.rarityLog > 0 && <div className="liner-rarity">약 {rarityText(s.player.rarityLog)}의 확률로 태어난 인생</div>}
            {s.player.fate?.draws?.length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {s.player.fate.draws.slice(0, 5).map((d) => (
                  <span key={d.id} className="chip">{d.label}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <section className="liner-sec">
          <h4>TRACKLIST — 이 인생의 장면들</h4>
          <ol className="tracklist">
            {tracks.map((t, i) => (
              <li key={i}>
                <span>{t.text}</span>
                <span className="age">{t.age}세</span>
              </li>
            ))}
          </ol>
        </section>
        {credits.length > 0 && (
          <section className="liner-sec">
            <h4>CREDITS — 함께한 사람들</h4>
            <div className="credits">
              {credits.map((c) => (
                <div key={c.id}>
                  <b>{c.role}</b>
                  <span>
                    {c.name} <span className="dim">· {c.how}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="liner-sec">
          <h4>NOTES</h4>
          <p className="liner-notes">{bio}</p>
          <p className="liner-notes" style={{ color: 'var(--red-ink)', marginTop: 6 }}>“{e.text.split('\n')[0]}”</p>
        </section>
        <section className="liner-sec">
          <h4>FANS — 팬이 늘고 줄어든 모양</h4>
          <FanGraph s={s} />
        </section>
        <section className="liner-sec">
          <div className="numbers">
            <div><b>{count(s.peakFans)}</b><span>최고 팬</span></div>
            <div><b>{s.albums.length}</b><span>음반</span></div>
            <div><b>{(s.flags.gigs as number) || 0}</b><span>공연</span></div>
            <div><b>{s.songs.length}</b><span>쓴 곡</span></div>
            <div><b>{Object.keys(s.npcs).length}</b><span>인연</span></div>
            <div><b>{s.player.globalFans ? count(s.player.globalFans) : s.chronicle.length}</b><span>{s.player.globalFans ? '해외 팬' : '기억'}</span></div>
          </div>
        </section>
      </article>

      {best && (
        <div className="card">
          <div className="section-title"><h3>대표곡</h3><span className="dim">지금 흐르는 노래</span></div>
          <div className="row" style={{ marginTop: 10, alignItems: 'flex-start', gap: 14 }}>
            <Cover seed={best.coverSeed} genre={best.genre} title={best.title} artist={best.bandName ?? s.player.name} size={92} />
            <div className="grow">
              <div className="serif" style={{ fontWeight: 800, fontSize: 19 }}>〈{best.title}〉</div>
              <div className="lyric">{best.lyric.join('\n')}</div>
            </div>
          </div>
          <SongRow song={best} lyric={false} />
        </div>
      )}

      {highlights.length > 0 && (
        <div className="card">
          <div className="section-title"><h3>결정적 순간들</h3></div>
          <div className="spacer" />
          <ChronicleSheet s={{ ...s, chronicle: highlights }} />
        </div>
      )}

      <button className="btn primary block" onClick={share}>라이너 노트 카드 공유하기</button>
      <button className="btn block" onClick={() => { sfx('tap'); onNewLife(); }}>다음 인생으로 태어나기</button>
      <button className="btn ghost block" onClick={onQuit}>처음 화면으로</button>
      <div className="dim" style={{ textAlign: 'center' }}>엔딩 도감 {Object.keys(meta.endings).length}/{ENDINGS.length}</div>
    </div>
  );
}

function svgToImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
  });
}

async function renderShareCard(s: GameState, bio: string, bandName: string | null): Promise<Blob> {
  const e = s.ending!;
  const W = 1080;
  const H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  try {
    await document.fonts?.ready;
  } catch {
    /* 폰트 없이 진행 */
  }
  const serif = '"Nanum Myeongjo", serif';
  const sans = '"Noto Sans KR", sans-serif';
  const mono = '"IBM Plex Mono", monospace';
  const deathAge = s.player.deathAge ?? Math.floor(s.time - s.player.birthYear);
  g.fillStyle = '#f3eee3';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#1c1a16';
  g.lineWidth = 4;
  g.strokeRect(40, 40, W - 80, H - 80);
  g.fillStyle = '#1c1a16';
  g.font = `800 40px ${serif}`;
  g.fillText('LINER NOTES · 인디밴드 키우기', 80, 110);
  g.font = `400 24px ${mono}`;
  g.fillStyle = '#6f685b';
  g.fillText(`${Math.floor(s.time)} · #인디밴드키우기`, W - 380, 110);
  g.fillStyle = '#1c1a16';
  g.fillRect(80, 135, W - 160, 3);
  g.fillRect(80, 143, W - 160, 1);

  const pc = document.createElement('canvas');
  pc.width = 14;
  pc.height = 17;
  const pg = pc.getContext('2d')!;
  pg.fillStyle = '#ddd5c4';
  pg.fillRect(0, 0, 14, 17);
  drawPerson(pg, 2, deathAge < 12 ? 17 : 22, { look: s.player.look, gender: s.player.gender, age: deathAge, mood: 70 }, 0.2);
  g.imageSmoothingEnabled = false;
  g.drawImage(pc, 80, 180, 196, 238);
  g.strokeRect(80, 180, 196, 238);

  g.fillStyle = '#1c1a16';
  g.font = `800 88px ${serif}`;
  g.fillText(s.player.name, 310, 280);
  g.font = `400 30px ${mono}`;
  g.fillStyle = '#6f685b';
  g.fillText(`${s.player.birthYear} – ${s.player.birthYear + deathAge} · 향년 ${deathAge}세`, 312, 330);
  if (bandName) g.fillText(`〈${bandName}〉`, 312, 375);
  g.fillStyle = '#f0378f';
  g.font = `800 160px ${serif}`;
  g.fillText(e.rank, W - 210, 360);

  g.fillStyle = '#1c1a16';
  g.font = `800 72px ${serif}`;
  g.fillText(e.title.replace(/^\S+ /, ''), 80, 530);
  g.fillStyle = '#c8186e';
  g.font = `700 34px ${sans}`;
  g.fillText(e.subtitle, 80, 585);

  g.fillStyle = '#3d3a33';
  g.font = `400 31px ${serif}`;
  wrap(g, bio, 80, 660, W - 160, 50, 8);

  const best = s.songs.find((x) => x.id === e.bestSongId);
  if (best) {
    const cover = await svgToImage(renderToStaticMarkup(<Cover seed={best.coverSeed} genre={best.genre} title={best.title} artist={best.bandName ?? s.player.name} size={200} />));
    g.drawImage(cover, 80, 1060, 200, 200);
    g.fillStyle = '#6f685b';
    g.font = `400 26px ${mono}`;
    g.fillText('대표곡', 310, 1100);
    g.fillStyle = '#1c1a16';
    g.font = `800 54px ${serif}`;
    g.fillText(`〈${best.title}〉`, 300, 1170);
    g.fillStyle = '#3d3a33';
    g.font = `italic 400 28px ${serif}`;
    g.fillText(`“${best.lyric[0]}”`, 310, 1225);
  }
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  let line = '';
  let yy = y;
  let n = 0;
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW) {
      if (++n >= maxLines) {
        g.fillText(line.slice(0, -1) + '…', x, yy);
        return;
      }
      g.fillText(line, x, yy);
      line = ch;
      yy += lh;
    } else line += ch;
  }
  g.fillText(line, x, yy);
}
