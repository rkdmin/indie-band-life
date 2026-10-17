// 엔딩: 신문 부고면처럼. 일생을 한 문단으로, 대표곡을 틀어 두고.

import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../sim/types';
import { Cover } from '../art/Cover';
import { Portrait } from '../art/Portrait';
import { drawPerson } from '../art/pixel';
import { ENDINGS } from '../sim/endings';
import { biography } from '../sim/bio';
import { GENRE_INFO } from '../sim/data/world';
import { count } from '../sim/korean';
import { playSong, sfx, stopBgm, stopSong } from '../audio/player';
import { ChronicleSheet, SongRow } from './Sheets';
import { shareFile } from '../platform';
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
      <article className="obit">
        <header className="obit-head">
          <span className="paper">인디 음악 신문 · 부고</span>
          <span className="mono">{Math.floor(s.time)}년 · 제{String(s.seed).slice(0, 4)}호</span>
        </header>
        <div className="obit-body">
          <div className="obit-top">
            <div className="portrait">
              <Portrait person={{ look: s.player.look, gender: s.player.gender, age: deathAge, mood: 70 }} bg="#ddd5c4" />
            </div>
            <div>
              <div className="obit-name">{s.player.name}</div>
              <div className="obit-years">
                {s.player.birthYear} – {s.player.birthYear + deathAge} · 향년 {deathAge}세
                {genre ? ` · ${GENRE_INFO[genre].label}` : ''}
              </div>
            </div>
            <div className="rank" aria-label={`랭크 ${e.rank}`}>{e.rank}</div>
          </div>
          <div>
            <h1 className="ending-title">{e.title.replace(/^\S+ /, '')}</h1>
            <div className="ending-sub">{e.subtitle}</div>
          </div>
          <p className="bio">{bio}</p>
          <div className="epitaph">“{e.text.split('\n')[0]}”</div>
          <div className="numbers">
            <div><b>{count(s.peakFans)}</b><span>최고 팬</span></div>
            <div><b>{s.albums.length}</b><span>음반</span></div>
            <div><b>{(s.flags.gigs as number) || 0}</b><span>공연</span></div>
            <div><b>{s.songs.length}</b><span>쓴 곡</span></div>
            <div><b>{Object.keys(s.npcs).length}</b><span>인연</span></div>
            <div><b>{s.chronicle.length}</b><span>기억</span></div>
          </div>
        </div>
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

      <button className="btn primary block" onClick={share}>부고 카드 공유하기</button>
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
  g.fillText('인디 음악 신문 · 부고', 80, 110);
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
  g.fillStyle = '#d8401c';
  g.font = `800 160px ${serif}`;
  g.fillText(e.rank, W - 210, 360);

  g.fillStyle = '#1c1a16';
  g.font = `800 72px ${serif}`;
  g.fillText(e.title.replace(/^\S+ /, ''), 80, 530);
  g.fillStyle = '#b33214';
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
