import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '../sim/types';
import { Avatar } from '../art/Avatar';
import { Cover } from '../art/Cover';
import { ENDINGS } from '../sim/endings';
import { GENRE_INFO } from '../sim/data/world';
import { count } from '../sim/korean';
import { playSong, sfx, stopBgm } from '../audio/player';
import { ChronicleSheet, SongRow } from './Sheets';
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
  const genre = s.band?.genre ?? s.pastBands[0]?.genre ?? null;
  const bandName = s.band?.name ?? s.pastBands[s.pastBands.length - 1]?.name ?? null;
  const highlights = useMemo(() => s.chronicle.filter((c) => c.kind === 'big').slice(-5), [s.chronicle]);

  useEffect(() => {
    stopBgm();
    sfx('big');
    if (best) {
      const t = window.setTimeout(() => playSong(best), 1400);
      return () => window.clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    sfx('tap');
    try {
      const blob = await renderShareCard(s, best?.title ?? null, bandName);
      const file = new File([blob], `인디밴드키우기_${s.player.name}.png`, { type: 'image/png' });
      const text = `${s.player.name}의 인생: ${e.title.replace(/^\S+ /, '')} (${e.rank}랭크)\n${best ? `대표곡 〈${best.title}〉` : ''}\n#인디밴드키우기`;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text, title: '인디밴드 키우기' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
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

  const got = Object.keys(meta.endings).length;

  return (
    <div className="app no-tabs">
      {toast && <div className="toast">{toast}</div>}
      <div className="ending">
        <div className="ending-card">
          <div className="rank">{e.rank}</div>
          <div className="row">
            <div style={{ borderRadius: '50%', overflow: 'hidden', background: '#ffffff14' }}>
              <Avatar look={s.player.look} gender={s.player.gender} age={deathAge} size={72} mood={70} />
            </div>
            <div>
              <div className="dim">THE END · {s.player.name}</div>
              <div className="sub" style={{ fontSize: 13 }}>
                {s.player.birthYear} – {s.player.birthYear + deathAge} ({deathAge}세)
              </div>
            </div>
          </div>
          <h1>{e.title}</h1>
          <div className="subt">{e.subtitle}</div>
          <div className="body">{e.text}</div>
          <div className="epitaph">{e.epitaph}</div>
        </div>

        {best && (
          <div className="card">
            <div className="section-title"><h3>대표곡</h3><span className="dim">이 노래가 당신을 기억합니다</span></div>
            <div className="row" style={{ marginTop: 8, alignItems: 'flex-start' }}>
              <Cover seed={best.coverSeed} genre={best.genre} title={best.title} artist={best.bandName ?? s.player.name} size={84} />
              <div className="grow">
                <div style={{ fontWeight: 900, fontSize: 17 }}>〈{best.title}〉</div>
                <div className="lyric">{best.lyric.join('\n')}</div>
              </div>
            </div>
            <SongRow song={best} lyric={false} />
          </div>
        )}

        <div className="card">
          <div className="section-title"><h3>숫자로 본 인생</h3></div>
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
            <span className="chip big">최고 팬 {count(s.peakFans)}</span>
            <span className="chip">곡 {s.songs.length}</span>
            <span className="chip">앨범 {s.albums.length}</span>
            <span className="chip">공연 {(s.flags.gigs as number) || 0}회</span>
            <span className="chip">인연 {Object.keys(s.npcs).length}명</span>
            {genre && <span className="chip" style={{ color: GENRE_INFO[genre].color }}>{GENRE_INFO[genre].label}</span>}
            {bandName && <span className="chip">〈{bandName}〉</span>}
          </div>
        </div>

        {highlights.length > 0 && (
          <div className="card">
            <div className="section-title"><h3>결정적 순간들</h3></div>
            <div className="spacer" />
            <ChronicleSheet s={{ ...s, chronicle: highlights }} />
          </div>
        )}

        <button className="btn primary block" onClick={share}>📤 인생 카드 공유하기</button>
        <button className="btn block" onClick={() => { sfx('tap'); onNewLife(); }}>✨ 다음 인생 시작</button>
        <button className="btn ghost block" onClick={onQuit}>🏠 타이틀로</button>
        <div className="dim" style={{ textAlign: 'center' }}>엔딩 도감 {got}/{ENDINGS.length}</div>
      </div>
    </div>
  );
}

function svgToImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const withNs = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withNs);
  });
}

async function renderShareCard(s: GameState, bestTitle: string | null, bandName: string | null): Promise<Blob> {
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
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2a1f4a');
  bg.addColorStop(0.55, '#0e0f1a');
  bg.addColorStop(1, '#3a1730');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // 장식 음표
  g.fillStyle = '#ffffff08';
  g.font = '520px serif';
  g.fillText('♪', 600, 720);

  const display = '"Black Han Sans", "Noto Sans KR", sans-serif';
  const body = '"Noto Sans KR", sans-serif';
  const deathAge = s.player.deathAge ?? Math.floor(s.time - s.player.birthYear);

  const av = await svgToImage(renderToStaticMarkup(<Avatar look={s.player.look} gender={s.player.gender} age={deathAge} size={220} mood={70} blink={false} />));
  g.save();
  g.beginPath();
  g.arc(190, 230, 110, 0, Math.PI * 2);
  g.fillStyle = '#ffffff14';
  g.fill();
  g.clip();
  g.drawImage(av, 80, 120, 220, 220);
  g.restore();

  g.fillStyle = '#73e2c5';
  g.font = `700 30px ${body}`;
  g.fillText('인디밴드 키우기 · LIFE CARD', 340, 175);
  g.fillStyle = '#f4f1ea';
  g.font = `72px ${display}`;
  g.fillText(s.player.name, 340, 265);
  g.fillStyle = '#a7adc4';
  g.font = `400 34px ${body}`;
  g.fillText(`${s.player.birthYear} – ${s.player.birthYear + deathAge}  ·  ${deathAge}세`, 340, 320);

  g.fillStyle = '#ffd166';
  g.font = `200px ${display}`;
  g.fillText(e.rank, 860, 330);

  g.fillStyle = '#f4f1ea';
  g.font = `110px ${display}`;
  g.fillText(e.title.replace(/^\S+ /, ''), 80, 520);
  g.fillStyle = '#ff9ed2';
  g.font = `500 40px ${body}`;
  g.fillText(e.subtitle, 80, 590);

  g.fillStyle = '#e6e3f0';
  g.font = `400 34px ${body}`;
  wrap(g, e.text.split('\n')[0], 80, 680, W - 160, 50);

  if (bestTitle) {
    const best = s.songs.find((x) => x.id === e.bestSongId)!;
    const cover = await svgToImage(renderToStaticMarkup(<Cover seed={best.coverSeed} genre={best.genre} title={best.title} artist={best.bandName ?? s.player.name} size={260} />));
    g.drawImage(cover, 80, 880, 260, 260);
    g.fillStyle = '#a7adc4';
    g.font = `700 30px ${body}`;
    g.fillText('대표곡', 380, 930);
    g.fillStyle = '#f4f1ea';
    g.font = `64px ${display}`;
    g.fillText(`〈${bestTitle}〉`, 370, 1010);
    g.fillStyle = '#a7adc4';
    g.font = `400 32px ${body}`;
    g.fillText(`${bandName ?? ''}  ·  “${best.lyric[0]}”`.slice(0, 34), 380, 1070);
    g.fillText(`최고 팬 ${count(s.peakFans)}명 · 앨범 ${s.albums.length}장`, 380, 1120);
  } else {
    g.fillStyle = '#a7adc4';
    g.font = `400 36px ${body}`;
    g.fillText(`인연 ${Object.keys(s.npcs).length}명 · 기억 ${s.chronicle.length}개`, 80, 960);
  }
  g.fillStyle = '#6f7594';
  g.font = `400 28px ${body}`;
  g.fillText('#인디밴드키우기  — 당신은 어떤 음악을 남기고 살아갈까?', 80, 1270);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = '';
  let yy = y;
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW) {
      g.fillText(line, x, yy);
      line = ch;
      yy += lh;
      if (yy > y + lh * 3) break;
    } else line += ch;
  }
  g.fillText(line, x, yy);
}
