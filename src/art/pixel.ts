// 픽셀 아트 렌더러. 240×135 캔버스에 장면·인물·관객·조명을 그리고 CSS 로 선명하게 키운다.
// 모든 그림은 시드로 결정된다 — 같은 인물은 평생 같은 머리·옷·피부색으로 나이 든다.

import { Rng } from '../sim/rng';
import type { Gender, SceneId } from '../sim/types';

export const PW = 240;
export const PH = 135;
const FLOOR = 112;

export interface PixelPerson {
  look: number;
  gender: Gender;
  age: number;
  mood?: number;
  military?: boolean;
  inst?: 'vocal' | 'guitar' | 'bass' | 'drums' | 'keys' | null;
  lead?: boolean;
}

export interface SceneOpts {
  people: PixelPerson[];
  crowd: number; // 0~1
  night: boolean;
  seed: number;
}

type G = CanvasRenderingContext2D;

const SKIN = ['#f6d3b3', '#efc29c', '#e3ae84', '#d39a6c', '#bd8257', '#9c6a46'];
const HAIR = ['#1a1414', '#251b17', '#2f221c', '#3d2b20', '#4b3324'];
const DYE = ['#d94a64', '#6d5be0', '#2fb3b8', '#e9b53c', '#e8e2d8'];
const SHIRT = ['#e2471f', '#2f5bd8', '#f2c14e', '#2a9d78', '#8e44ad', '#ecebe4', '#1e1e24', '#d9567a', '#5a7d3a'];
const PANTS = ['#2b3142', '#1d1d23', '#4a5a78', '#5b4636', '#3a3a3a'];

const px = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};

function bands(g: G, colors: string[], y0 = 0, y1 = PH) {
  const h = (y1 - y0) / colors.length;
  colors.forEach((c, i) => {
    px(g, 0, y0 + i * h, PW, Math.ceil(h) + 1, c);
    // 디더 경계
    if (i < colors.length - 1) {
      g.fillStyle = colors[i + 1];
      for (let x = (i % 2) * 2; x < PW; x += 4) g.fillRect(x, Math.round(y0 + (i + 1) * h - 1), 2, 1);
    }
  });
}

function stars(g: G, rng: Rng, n: number, maxY: number, t: number) {
  for (let i = 0; i < n; i++) {
    const x = rng.int(0, PW);
    const y = rng.int(0, maxY);
    const ph = rng.next() * 6;
    if (Math.sin(t * 2 + ph) > -0.4) px(g, x, y, 1, 1, i % 7 === 0 ? '#ffe9a8' : '#f4f1ea');
  }
}

function city(g: G, rng: Rng, base: number, color: string, lit: string | null, t: number) {
  let x = -4;
  while (x < PW) {
    const w = rng.int(14, 30);
    const h = rng.int(18, 52);
    px(g, x, base - h, w, h + 40, color);
    if (lit)
      for (let wy = base - h + 4; wy < base - 3; wy += 6)
        for (let wx = x + 3; wx < x + w - 3; wx += 5) {
          const on = rng.chance(0.35);
          const flick = rng.chance(0.06) && Math.sin(t * 3 + wx) > 0.7;
          if (on && !flick) px(g, wx, wy, 2, 3, lit);
        }
    x += w + rng.int(0, 3);
  }
}

function beam(g: G, x: number, y: number, ang: number, len: number, spread: number, color: string, a: number) {
  g.save();
  g.globalAlpha = a;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + Math.sin(ang - spread) * len, y + Math.cos(ang - spread) * len);
  g.lineTo(x + Math.sin(ang + spread) * len, y + Math.cos(ang + spread) * len);
  g.closePath();
  g.fill();
  g.restore();
}

function glow(g: G, x: number, y: number, r: number, color: string, a: number) {
  g.save();
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = a;
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

function notes(g: G, rng: Rng, n: number, t: number, color: string) {
  for (let i = 0; i < n; i++) {
    const x0 = rng.int(20, PW - 20);
    const sp = rng.range(0.15, 0.3);
    const ph = rng.next();
    const k = (t * sp + ph) % 1;
    const y = FLOOR - 10 - k * 70;
    const x = x0 + Math.sin(k * 6) * 4;
    g.globalAlpha = Math.sin(k * Math.PI);
    px(g, x, y, 2, 2, color);
    px(g, x + 1, y - 5, 1, 5, color);
    px(g, x + 2, y - 5, 2, 1, color);
    g.globalAlpha = 1;
  }
}

// ───────────────────────── 인물 ─────────────────────────

function lookOf(p: PixelPerson) {
  const r = new Rng(p.look);
  return {
    skin: r.pick(SKIN),
    hair: r.pick(HAIR),
    dye: r.pick(DYE),
    dyed: r.chance(0.18),
    shirt: r.pick(SHIRT),
    pants: r.pick(PANTS),
    style: r.int(0, 3),
    glasses: r.chance(0.2),
    beard: r.chance(0.3),
  };
}

/** (x, 발끝 y) 에 인물을 그린다. 폭 10px 기준 */
export function drawPerson(g: G, x: number, feet: number, p: PixelPerson, t: number, onStage = false) {
  const L = lookOf(p);
  const a = p.age;
  const baby = a < 3;
  const kid = a < 12;
  const old = a >= 62;
  const hair = p.military ? '#2b2b2b' : a >= 70 ? '#e6e3dc' : a >= 55 ? '#a9a49b' : L.dyed && a >= 17 && a < 40 ? L.dye : L.hair;
  const bob = onStage ? (Math.sin(t * 9 + p.look) > 0 ? 1 : 0) : Math.sin(t * 2 + p.look) > 0.95 ? 1 : 0;
  const bodyH = baby ? 3 : kid ? 5 : 7;
  const legH = baby ? 0 : kid ? 4 : 6;
  const top = feet - (6 + bodyH + legH + 1) - bob + (old ? 1 : 0);
  // 다리·신발
  if (legH) {
    px(g, x + 2, top + 6 + bodyH, 2, legH, L.pants);
    px(g, x + 6, top + 6 + bodyH, 2, legH, L.pants);
    px(g, x + 1, feet - 1, 3, 1, '#151515');
    px(g, x + 6, feet - 1, 3, 1, '#151515');
  }
  // 몸
  const shirt = p.military ? '#56663f' : baby ? '#f3e7c9' : L.shirt;
  px(g, x + 1, top + 6, 8, bodyH, shirt);
  px(g, x, top + 7, 1, Math.max(2, bodyH - 2), L.skin);
  px(g, x + 9, top + 7, 1, Math.max(2, bodyH - 2), L.skin);
  // 머리
  px(g, x + 2, top, 6, 6, L.skin);
  // 머리카락
  const bald = p.gender === 'm' && a >= 60 && L.style === 0;
  if (p.military) px(g, x + 2, top, 6, 1, hair);
  else if (baby) px(g, x + 4, top, 2, 1, hair);
  else if (!bald) {
    px(g, x + 2, top - 1, 6, 2, hair);
    px(g, x + 1, top, 1, 3, hair);
    px(g, x + 8, top, 1, 3, hair);
    if (p.gender === 'f') {
      if (L.style === 0) { px(g, x + 1, top + 2, 1, 6, hair); px(g, x + 8, top + 2, 1, 6, hair); }
      if (L.style === 1) { px(g, x + 1, top + 2, 1, 3, hair); px(g, x + 8, top + 2, 1, 3, hair); }
      if (L.style === 2) px(g, x + 8, top + 1, 2, 3, hair);
      if (L.style === 3) { px(g, x + 1, top + 2, 1, 8, hair); px(g, x + 8, top + 2, 1, 8, hair); }
    } else if (L.style === 2) px(g, x + 2, top - 2, 5, 1, hair);
  } else px(g, x + 1, top + 1, 1, 2, hair);
  // 눈 (깜빡임)
  const blink = Math.sin(t * 1.3 + p.look % 13) > 0.985;
  const eye = blink ? L.skin : '#1a1414';
  px(g, x + 3, top + 3, 1, 1, eye);
  px(g, x + 6, top + 3, 1, 1, eye);
  if (L.glasses && a >= 10) {
    g.globalAlpha = 0.85;
    px(g, x + 2, top + 2, 3, 1, '#1a1414');
    px(g, x + 5, top + 2, 3, 1, '#1a1414');
    g.globalAlpha = 1;
  }
  // 입
  const mood = p.mood ?? 60;
  if (mood >= 65) px(g, x + 4, top + 5, 2, 1, '#8a3b3b');
  else if (mood < 35) px(g, x + 4, top + 5, 2, 1, '#5a3030');
  if (p.gender === 'm' && L.beard && a >= 30 && !p.military) px(g, x + 3, top + 5, 4, 1, a >= 60 ? '#bbb' : '#2a201b');
  if (kid && !baby) { px(g, x + 2, top + 4, 1, 1, '#f29a9a'); px(g, x + 7, top + 4, 1, 1, '#f29a9a'); }
  if (old) px(g, x + 10, top + 8, 1, feet - top - 8, '#6b4f36'); // 지팡이
  // 악기
  const strum = onStage && Math.sin(t * 12 + p.look) > 0;
  switch (p.inst) {
    case 'guitar':
    case 'bass': {
      const body = p.inst === 'guitar' ? '#b5651d' : '#2a2a2a';
      px(g, x + 1, top + 9, 5, 4, body);
      px(g, x + 3, top + 10, 1, 1, '#1a1414');
      for (let i = 0; i < (p.inst === 'bass' ? 8 : 7); i++) px(g, x + 6 + i, top + 9 - Math.floor(i / 2), 1, 1, '#d8c39a');
      px(g, x + (strum ? 4 : 3), top + 11, 2, 1, L.skin);
      break;
    }
    case 'vocal':
      px(g, x + 11, top + 4, 1, feet - top - 4, '#777');
      px(g, x + 10, top + 3, 3, 2, '#c9c9c9');
      break;
    case 'keys':
      px(g, x - 3, top + 9, 16, 3, '#1d1d1d');
      for (let i = 0; i < 7; i++) px(g, x - 2 + i * 2, top + 9, 1, 2, '#f2f2f2');
      px(g, x, top + 12, 1, feet - top - 12, '#555');
      px(g, x + 10, top + 12, 1, feet - top - 12, '#555');
      break;
    case 'drums': {
      px(g, x - 2, feet - 9, 14, 9, '#b0203a');
      px(g, x, feet - 7, 10, 5, '#e8e2d8');
      px(g, x - 7, top + 5, 7, 1, '#e3b341');
      px(g, x + 11, top + 7, 7, 1, '#e3b341');
      const hit = Math.sin(t * 10) > 0;
      px(g, x - 1, top + (hit ? 6 : 8), 1, 3, '#d8c39a');
      px(g, x + 10, top + (hit ? 8 : 6), 1, 3, '#d8c39a');
      break;
    }
  }
}

function crowd(g: G, rng: Rng, density: number, t: number, sticks: boolean, tint: string) {
  const rows = [
    { y: PH - 4, n: Math.round(14 + density * 24), r: 6 },
    { y: PH - 13, n: Math.round(8 + density * 22), r: 5 },
  ];
  for (const row of rows.reverse()) {
    for (let i = 0; i < row.n; i++) {
      const x = rng.range(-6, PW + 6);
      const ph = rng.next() * 6;
      const jump = Math.max(0, Math.sin(t * 7 + ph)) * (2 + density * 2);
      const y = row.y - jump;
      g.fillStyle = tint;
      g.beginPath();
      g.arc(Math.round(x), Math.round(y - row.r), row.r * 0.55, 0, Math.PI * 2);
      g.fill();
      px(g, x - row.r * 0.8, y - row.r * 0.4, row.r * 1.6, row.r * 2, tint);
      if (rng.chance(0.25 + density * 0.3)) {
        px(g, x + row.r * 0.5, y - row.r * 2.4, 1, row.r * 1.6, tint);
        if (sticks) {
          const c = ['#ff7ab6', '#6fd3ff', '#ffd166', '#b49cff'][i % 4];
          px(g, x + row.r * 0.5 - 1, y - row.r * 2.4 - 3, 3, 3, Math.sin(t * 5 + ph) > 0 ? c : '#ffffff');
        }
      }
    }
  }
}

// ───────────────────────── 장면 ─────────────────────────

type Painter = (g: G, rng: Rng, t: number, o: SceneOpts) => { stage?: boolean; floor?: number };

const SCENES: Record<string, Painter> = {
  nursery: (g, rng, t) => {
    bands(g, ['#f6d6dc', '#f3ccd5', '#efc2cd']);
    px(g, 0, FLOOR - 2, PW, PH, '#e7b6c2');
    px(g, 168, 18, 44, 34, '#2c2a55');
    px(g, 166, 16, 48, 2, '#fff');
    px(g, 166, 52, 48, 2, '#fff');
    g.fillStyle = '#fff3c4';
    g.beginPath();
    g.arc(198, 30, 6, 0, Math.PI * 2);
    g.fill();
    stars(g, rng, 0, 0, t);
    for (let i = 0; i < 5; i++) px(g, 172 + i * 8, 22 + (i % 2) * 14, 1, 1, '#fff');
    // 모빌
    const sw = Math.sin(t) * 3;
    px(g, 70, 0, 1, 16, '#9a6b7c');
    px(g, 56 + sw, 16, 30, 1, '#9a6b7c');
    px(g, 55 + sw, 18, 4, 4, '#f2c14e');
    px(g, 69 + sw, 19, 4, 4, '#6fd3ff');
    px(g, 83 + sw, 18, 4, 4, '#b49cff');
    // 아기 침대
    px(g, 40, 76, 70, 3, '#fff');
    px(g, 40, 100, 70, 3, '#fff');
    for (let i = 0; i < 9; i++) px(g, 42 + i * 8, 76, 2, 26, '#fff');
    notes(g, rng, 4, t, '#c2577f');
    return {};
  },
  home: (g, rng, t, o) => {
    bands(g, o.night ? ['#2b2540', '#30294a'] : ['#efe2cc', '#ead9bf']);
    px(g, 140, 14, 76, 52, o.night ? '#0f1330' : '#9fd0f2');
    if (o.night) stars(g, rng, 14, 0, t);
    g.save();
    g.beginPath();
    g.rect(140, 14, 76, 52);
    g.clip();
    city(g, new Rng(o.seed), 66, o.night ? '#1d1f3b' : '#7aa0c4', o.night ? '#ffd98a' : null, t);
    g.restore();
    px(g, 138, 12, 80, 2, '#5a4636');
    px(g, 138, 66, 80, 3, '#5a4636');
    px(g, 177, 12, 2, 56, '#5a4636');
    px(g, 0, FLOOR - 6, PW, PH, o.night ? '#3a2f4f' : '#b8946b');
    px(g, 20, 20, 30, 40, '#e2471f');
    px(g, 24, 26, 22, 4, '#f4f1ea');
    // 턴테이블
    px(g, 60, 84, 36, 22, '#3d2e25');
    px(g, 64, 80, 22, 4, '#111');
    px(g, 74 + Math.round(Math.sin(t * 4) * 6), 81, 2, 1, '#e2471f');
    if (o.night) glow(g, 110, 60, 50, '#ffd98a', 0.18);
    notes(g, rng, 2, t, o.night ? '#ffd98a' : '#8b5e3c');
    return {};
  },
  classroom: (g, rng, t) => {
    bands(g, ['#f1e7d3', '#ece0c8']);
    px(g, 10, 12, 120, 56, '#2f5d46');
    px(g, 8, 10, 124, 2, '#a87b4f');
    px(g, 8, 68, 124, 3, '#a87b4f');
    for (let i = 0; i < 5; i++) px(g, 20, 24 + i * 4, 100, 1, '#cfe3d6');
    px(g, 34, 26, 2, 2, '#fff');
    px(g, 35, 21, 1, 6, '#fff');
    px(g, 56, 30, 2, 2, '#fff');
    px(g, 57, 25, 1, 6, '#fff');
    px(g, 150, 12, 70, 70, '#bfe3ff');
    const cx = (t * 4) % 90;
    px(g, 150 + cx, 26, 16, 5, '#fff');
    px(g, 190 - cx / 2, 44, 12, 4, '#fff');
    px(g, 148, 10, 74, 2, '#a87b4f');
    px(g, 148, 82, 74, 3, '#a87b4f');
    for (let i = 0; i < 8; i++) {
      const k = (t * 0.2 + i * 0.13) % 1;
      px(g, 200 - k * 40 + Math.sin(k * 10 + i) * 6, 12 + k * 90, 2, 2, '#ffb7c9');
    }
    px(g, 0, FLOOR - 6, PW, PH, '#c8a679');
    for (const x of [20, 100, 180]) px(g, x, FLOOR + 4, 46, 4, '#8a6440');
    void rng;
    return {};
  },
  musicroom: (g, rng, t) => {
    bands(g, ['#3a2a35', '#3f2e3b']);
    px(g, 0, FLOOR - 6, PW, PH, '#5b3d2e');
    px(g, 12, 60, 64, 40, '#111');
    for (let i = 0; i < 10; i++) px(g, 15 + i * 6, 86, 5, 12, '#f2f2f2');
    px(g, 96, 18, 40, 52, '#b49cff');
    px(g, 100, 26, 32, 6, '#2c2a55');
    px(g, 100, 36, 22, 3, '#2c2a55');
    glow(g, 120, 0, 110, '#ffe7b0', 0.25);
    notes(g, rng, 3, t, '#ffd166');
    return {};
  },
  street: (g, rng, t) => {
    bands(g, ['#0f1230', '#141737', '#1a1c40']);
    stars(g, rng, 20, 40, t);
    city(g, new Rng(rng.int(1, 999)), 92, '#20234a', '#ffd98a', t);
    city(g, new Rng(rng.int(1, 999)), 104, '#2a2d58', '#ffcf7a', t);
    const on = Math.sin(t * 5) > -0.9 || Math.sin(t * 13) > 0;
    px(g, 20, 52, 46, 14, '#0b0b16');
    if (on) {
      g.strokeStyle = '#ff4fa0';
      g.strokeRect(20.5, 52.5, 46, 14);
      glow(g, 43, 59, 30, '#ff4fa0', 0.3);
    }
    px(g, 160, 46, 50, 14, '#0b0b16');
    g.strokeStyle = '#6fd3ff';
    g.strokeRect(160.5, 46.5, 50, 14);
    glow(g, 185, 53, 30, '#6fd3ff', 0.25);
    px(g, 0, FLOOR - 4, PW, PH, '#1d1d2b');
    for (const x of [40, 200]) {
      px(g, x, 56, 2, 56, '#333');
      px(g, x - 2, 54, 6, 3, '#ffe7b0');
      glow(g, x + 1, 56, 34, '#ffd98a', 0.28);
    }
    const wx = ((t * 14) % 280) - 20;
    px(g, wx, FLOOR - 16, 6, 16, '#0a0a14');
    notes(g, rng, 3, t, '#ffd98a');
    return {};
  },
  studio: (g, rng, t) => {
    bands(g, ['#3a3e4e', '#353948']);
    for (let y = 0; y < 90; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < PW; x += 8) px(g, x, y, 4, 4, '#2f3341');
    px(g, 100, 6, 40, 10, '#3a0f0f');
    if (Math.sin(t * 3) > 0) px(g, 106, 9, 4, 4, '#ff4d4d');
    px(g, 114, 9, 20, 4, '#ff9a9a');
    px(g, 0, FLOOR - 6, PW, PH, '#2a2633');
    px(g, 8, 74, 34, 32, '#1b1b1b');
    px(g, 11, 77, 28, 6, '#c8b48a');
    px(g, 200, 78, 32, 28, '#1b1b1b');
    glow(g, 120, 0, 120, '#ffffff', 0.12);
    notes(g, rng, 2, t, '#9be6ff');
    return { stage: true };
  },
  club: (g, rng, t, o) => {
    bands(g, ['#120c1f', '#160f26', '#1b1230']);
    const cols = ['#ff4fa0', '#b49cff', '#6fd3ff', '#ffd166'];
    cols.forEach((c, i) => beam(g, 40 + i * 54, 4, Math.sin(t * 0.9 + i * 1.3) * 0.5, 140, 0.16, c, 0.16 + o.crowd * 0.08));
    for (let i = 0; i < 6; i++) px(g, 20 + i * 40, 2, 4, 3, Math.sin(t * 4 + i) > 0 ? cols[i % 4] : '#444');
    px(g, 0, FLOOR - 2, PW, 6, '#4a3a66');
    px(g, 0, FLOOR + 4, PW, PH, '#241a36');
    glow(g, 120, 90, 90, '#b49cff', 0.12 + o.crowd * 0.1);
    void rng;
    return { stage: true };
  },
  festival: (g, rng, t, o) => {
    bands(g, ['#2e2463', '#5a2f6b', '#b2475f', '#ec7a52', '#f5b45a']);
    g.fillStyle = '#ffe8a8';
    g.beginPath();
    g.arc(190, 72, 16, 0, Math.PI * 2);
    g.fill();
    px(g, 16, 8, 3, FLOOR, '#1a1426');
    px(g, PW - 19, 8, 3, FLOOR, '#1a1426');
    px(g, 16, 8, PW - 32, 3, '#1a1426');
    ['#ffffff', '#ffd166', '#ff9ed2'].forEach((c, i) => beam(g, 60 + i * 60, 10, Math.sin(t * 0.7 + i) * 0.6, 150, 0.12, c, 0.18));
    for (let i = 0; i < 10; i++) px(g, 26 + i * 20, 12, 3, 3, Math.sin(t * 6 + i) > 0 ? '#fff' : '#777');
    const n = Math.round(10 + o.crowd * 30);
    for (let i = 0; i < n; i++) {
      const k = (t * 0.25 + i / n) % 1;
      px(g, ((i * 53) % PW) + Math.sin(k * 8 + i) * 5, k * PH, 2, 3, ['#ff4fa0', '#6fd3ff', '#ffd166', '#73e2c5', '#fff'][i % 5]);
    }
    px(g, 0, FLOOR - 2, PW, 6, '#2b1f3f');
    px(g, 0, FLOOR + 4, PW, PH, '#1c1428');
    void rng;
    return { stage: true };
  },
  arena: (g, rng, t) => {
    bands(g, ['#05040a', '#0a0814', '#100c1e']);
    stars(g, rng, 60, 90, t);
    ['#6fd3ff', '#ff4fa0', '#ffffff', '#b49cff', '#ffd166'].forEach((c, i) => beam(g, 20 + i * 50, 0, Math.sin(t * 1.1 + i) * 0.7, 160, 0.1, c, 0.2));
    px(g, 0, FLOOR - 2, PW, 6, '#2b2440');
    px(g, 0, FLOOR + 4, PW, PH, '#110e1c');
    return { stage: true };
  },
  recording: (g, rng, t) => {
    bands(g, ['#1d2230', '#20273a']);
    px(g, 130, 10, 100, 66, '#273049');
    px(g, 128, 8, 104, 2, '#4b5878');
    px(g, 128, 76, 104, 2, '#4b5878');
    px(g, 175, 26, 8, 8, '#666');
    px(g, 178, 34, 2, 30, '#777');
    px(g, 0, FLOOR - 6, PW, PH, '#151925');
    px(g, 10, 88, 110, 22, '#2b2f3f');
    for (let i = 0; i < 14; i++) {
      const h = 3 + Math.abs(Math.sin(t * 6 + i * 0.7)) * 14;
      px(g, 14 + i * 7, 106 - h, 5, h, i > 11 ? '#ff4d4d' : i > 9 ? '#ffd166' : '#73e2c5');
    }
    void rng;
    return {};
  },
  hospital: (g, rng, t) => {
    bands(g, ['#dfeef2', '#d6e8ed']);
    px(g, 150, 14, 70, 52, '#bfe6ff');
    px(g, 148, 12, 74, 2, '#9fb7c0');
    px(g, 0, FLOOR - 6, PW, PH, '#c6d8dc');
    px(g, 14, 18, 70, 40, '#16222b');
    const k = (t * 40) % 70;
    for (let x = 0; x < 64; x++) {
      const d = Math.abs(x - k);
      const y = d < 2 ? (x % 2 ? -8 : 6) : 0;
      if (x < k) px(g, 17 + x, 38 + y, 1, 1, '#73e2c5');
    }
    px(g, 20, 92, 110, 12, '#ffffff');
    px(g, 18, 104, 114, 3, '#b9cdd3');
    void rng;
    return {};
  },
  military: (g, rng, t) => {
    bands(g, ['#1f2a20', '#26332a', '#2c3a2b']);
    stars(g, rng, 24, 40, t);
    g.fillStyle = '#1a2319';
    g.beginPath();
    g.moveTo(0, 80);
    g.lineTo(50, 40);
    g.lineTo(90, 70);
    g.lineTo(140, 30);
    g.lineTo(190, 66);
    g.lineTo(240, 50);
    g.lineTo(240, 135);
    g.lineTo(0, 135);
    g.fill();
    px(g, 0, FLOOR - 6, PW, PH, '#3b4a35');
    px(g, 20, 70, 80, 36, '#5b6b4a');
    px(g, 18, 66, 84, 4, '#4a5a3a');
    px(g, 196, 30, 1, 76, '#999');
    const w = Math.sin(t * 3) * 2;
    px(g, 197, 30, 22 + w, 12, '#e8e8e8');
    return {};
  },
  office: (g, rng, t) => {
    bands(g, ['#d9dde3', '#d3d8de']);
    for (let i = 0; i < 9; i++) px(g, 150, 12 + i * 6, 76, 3, '#b7bec8');
    if (Math.sin(t * 17) > -0.97) px(g, 10, 0, PW - 20, 3, '#ffffff');
    px(g, 0, FLOOR - 6, PW, PH, '#a7adb6');
    for (const x of [14, 80]) {
      px(g, x, 70, 50, 32, '#20242c');
      px(g, x + 2, 72, 46, 26, '#3d6fb6');
      px(g, x + 22, 102, 6, 6, '#555');
    }
    void rng;
    return {};
  },
  rooftop: (g, rng, t, o) => {
    bands(g, ['#0d1030', '#121539', '#171a44']);
    stars(g, rng, 40, 70, t);
    g.fillStyle = '#fff5c9';
    g.beginPath();
    g.arc(40, 26, 8, 0, Math.PI * 2);
    g.fill();
    city(g, new Rng(o.seed + 7), 104, '#1b1e44', '#ffd98a', t);
    px(g, 0, FLOOR - 4, PW, PH, '#2a2d4a');
    for (let i = 0; i < 16; i++) {
      const x = i * 16 + 4;
      const y = 22 + Math.round(Math.sin(i * 0.6) * 4);
      px(g, x, y, 2, 2, Math.sin(t * 3 + i) > -0.3 ? '#ffd98a' : '#8a7a4a');
    }
    px(g, 190, 70, 30, 40, '#3b3f6a');
    return {};
  },
  pub: (g, rng, t) => {
    bands(g, ['#3b2219', '#41271c']);
    for (let i = 0; i < 14; i++) px(g, i * 18 + 6, 10 + (i % 2) * 3, 3, 3, Math.sin(t * 2 + i) > -0.5 ? '#ffcf7a' : '#a07a3a');
    px(g, 0, FLOOR - 6, PW, PH, '#5a3426');
    for (const x of [30, 120, 190]) {
      px(g, x - 14, FLOOR + 2, 40, 4, '#7a4a35');
      px(g, x - 6, FLOOR - 8, 4, 10, '#f3c34b');
      px(g, x + 2, FLOOR - 6, 3, 8, '#2e8b57');
    }
    glow(g, 120, 50, 80, '#ffb26b', 0.2);
    void rng;
    return {};
  },
  stage_old: (g, rng, t) => {
    bands(g, ['#07060b', '#0b0a10']);
    g.save();
    g.globalAlpha = 0.15;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(120, 0);
    g.lineTo(80, FLOOR + 4);
    g.lineTo(160, FLOOR + 4);
    g.fill();
    g.restore();
    px(g, 0, FLOOR - 2, PW, PH, '#151320');
    g.save();
    g.globalAlpha = 0.18;
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(120, FLOOR + 1, 46, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    for (let i = 0; i < 24; i++) {
      const k = (t * 0.08 + i / 24) % 1;
      px(g, 96 + ((i * 37) % 48) + Math.sin(k * 6) * 3, 8 + k * 100, 1, 1, '#ffffff');
    }
    void rng;
    return { stage: true };
  },
};

SCENES.airport = (g, rng, t) => {
  bands(g, ['#cfe3ef', '#c4dbea', '#b9d3e5']);
  // 큰 창 너머 활주로와 비행기
  px(g, 0, 10, PW, 62, '#8fb8d6');
  px(g, 0, 58, PW, 14, '#6c8a9e');
  const ax = ((t * 22) % 340) - 60;
  px(g, ax, 40 - Math.max(0, (ax - 120) * 0.12), 40, 6, '#f4f6f8');
  px(g, ax + 14, 34 - Math.max(0, (ax - 120) * 0.12), 8, 18, '#e3e8ec');
  px(g, ax + 36, 36 - Math.max(0, (ax - 120) * 0.12), 4, 6, '#d8401c');
  for (let x = 0; x < PW; x += 30) px(g, x, 10, 2, 62, '#5d7385');
  // 출발 안내판
  px(g, 150, 76, 80, 26, '#14161c');
  ['SEOUL→AUSTIN', 'SEOUL→TOKYO', 'SEOUL→TAIPEI'].forEach((_, i) => {
    px(g, 154, 80 + i * 7, 46, 3, Math.sin(t * 2 + i) > -0.6 ? '#ffd166' : '#8a7a4a');
    px(g, 204, 80 + i * 7, 20, 3, i === 0 && Math.sin(t * 4) > 0 ? '#73e2c5' : '#4a5a52');
  });
  px(g, 0, FLOOR - 4, PW, PH, '#d9d3c7');
  for (let x = 0; x < PW; x += 16) px(g, x, FLOOR + 6, 8, 1, '#c4bdb0');
  // 악기 케이스와 캐리어
  px(g, 30, FLOOR - 14, 8, 14, '#2a2a2a');
  px(g, 40, FLOOR - 10, 10, 10, '#d8401c');
  void rng;
  return {};
};

SCENES.abroad = (g, rng, t, o) => {
  bands(g, ['#1b1640', '#3a2160', '#7a3466', '#c4566a', '#e8935e']);
  stars(g, rng, 20, 40, t);
  // 서커스 천막 같은 대형 텐트 스테이지
  g.fillStyle = '#efe6d2';
  g.beginPath();
  g.moveTo(20, 46);
  g.lineTo(120, 8);
  g.lineTo(220, 46);
  g.fill();
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 ? '#d8401c' : '#efe6d2';
    g.beginPath();
    g.moveTo(120, 8);
    g.lineTo(20 + i * 20, 46);
    g.lineTo(40 + i * 20, 46);
    g.fill();
  }
  px(g, 20, 46, 200, 3, '#2a1f30');
  // 만국기
  for (let i = 0; i < 22; i++) {
    const x = 8 + i * 10;
    const y = 54 + Math.round(Math.sin(i * 0.5) * 3);
    px(g, x, y, 5, 4, ['#2f5bd8', '#e2471f', '#f2c14e', '#2a9d78', '#ecebe4'][i % 5]);
  }
  ['#ffffff', '#ffd166', '#6fd3ff'].forEach((c, i) => beam(g, 70 + i * 50, 48, Math.sin(t * 0.8 + i) * 0.5, 120, 0.12, c, 0.17));
  px(g, 0, FLOOR - 2, PW, 6, '#3a2a40');
  px(g, 0, FLOOR + 4, PW, PH, '#1c1428');
  for (let i = 0; i < Math.round(8 + o.crowd * 12); i++) {
    const k = (t * 0.2 + i / 20) % 1;
    px(g, (i * 37) % PW, k * 70 + 50, 2, 2, ['#ff7ab6', '#6fd3ff', '#ffd166'][i % 3]);
  }
  return { stage: true };
};

/** 한 프레임 그리기 */
export function drawFrame(g: G, id: SceneId, t: number, o: SceneOpts) {
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, PW, PH);
  const rng = new Rng(o.seed);
  const painter = SCENES[id] ?? SCENES.home;
  const info = painter(g, rng, t, o);
  const stage = !!info.stage;
  const ppl = o.people.slice(0, stage ? 5 : 4);
  const gap = ppl.length > 3 ? 30 : 38;
  const start = PW / 2 - ((ppl.length - 1) * gap) / 2 - 5;
  ppl.forEach((p, i) => {
    // 드럼은 뒤쪽 가운데로
    const isDrum = stage && p.inst === 'drums';
    const x = isDrum ? PW / 2 - 5 : start + i * gap;
    const feet = isDrum ? FLOOR - 8 : FLOOR;
    drawPerson(g, x, feet, p, t, stage && (id !== 'studio' || true));
  });
  if (id === 'club' || id === 'festival' || id === 'arena' || id === 'abroad' || (id === 'stage_old' && o.crowd > 0.2)) {
    crowd(g, new Rng(o.seed + 3), o.crowd, t, id === 'arena', id === 'festival' ? '#140e1e' : '#07060c');
  }
  // 비네트
  const v = g.createRadialGradient(PW / 2, PH / 2, PH * 0.4, PW / 2, PH / 2, PW * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = v;
  g.fillRect(0, 0, PW, PH);
}
