// 초상화 렌더러 — 신분증·카드·사람 목록에 쓰는 24×28 도트 흉상.
// 외모(키·체형·얼굴형·머리 색·결·피부·쌍꺼풀·주근깨·매력)와 나이, 장르별 옷차림, 소품으로 사람마다 확연히 다르게 그린다.
// 모든 선택은 시드(look)로 결정된다 — 같은 사람은 평생 같은 얼굴로 나이 든다.

import { Rng } from '../sim/rng';
import type { Appearance } from '../sim/appearance';
import type { Gender, Genre } from '../sim/types';

type G = CanvasRenderingContext2D;
export const BW = 24;
export const BH = 28;

export interface BustPerson {
  look: number;
  gender: Gender;
  age: number;
  mood?: number;
  military?: boolean;
  app?: Appearance;
  /** 옷차림을 정하는 장르 (밴드 멤버·나) */
  style?: Genre | null;
}

const SKIN = ['#f8dcc2', '#f0c7a2', '#e2ad84', '#cf9468', '#b07850', '#8a5a3b'];
const SKIN_SH = ['#e9bfa0', '#dcab84', '#c99269', '#b57b52', '#94603f', '#6e452c'];
const HAIR: Record<string, string> = { black: '#1d1a1f', darkbrown: '#3b2a20', brown: '#6b4428', blond: '#d9b65f', red: '#a8462a' };
const DYE = ['#ff4fa3', '#5ad1ff', '#a98bff', '#f4f1e8', '#7cf0b0', '#ff7a3d'];

const OUTFIT: Record<string, { main: string; alt: string; detail: string }> = {
  indierock: { main: '#3d6fb6', alt: '#2c5490', detail: '#f5f0e6' }, // 데님 재킷 + 흰 티
  punk: { main: '#1b1b20', alt: '#e2364a', detail: '#c9c9d1' }, // 가죽 재킷 + 지퍼
  shoegaze: { main: '#c9b7e8', alt: '#a996d0', detail: '#f5f0e6' }, // 오버사이즈 카디건
  folk: { main: '#9b4a2e', alt: '#6b3420', detail: '#e8d6a8' }, // 체크 셔츠
  metal: { main: '#151518', alt: '#3a3a42', detail: '#bdbdc6' }, // 검은 티 + 프린트
  indiepop: { main: '#ffe14d', alt: '#ff4fa3', detail: '#2357e6' }, // 줄무늬
};
const PLAIN = ['#e9e4d8', '#6e8bb3', '#b35d5d', '#5d8a6b', '#8a7bb3', '#c9a45c', '#4a4a55'];

function px(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

export function drawBust(g: G, p: BustPerson, bg = '#e9e2d2') {
  px(g, 0, 0, BW, BH, bg);
  const r = new Rng(p.look ^ 0x2468ace);
  const app = p.app;
  const a = p.age;
  const baby = a < 3;
  const kid = a < 13;
  const teen = a >= 13 && a < 19;
  const old = a >= 60;
  const skinI = app?.skin ?? r.int(0, 2);
  const skin = SKIN[skinI];
  const shade = SKIN_SH[skinI];
  let hair = HAIR[app?.hairColor ?? 'black'];
  if (a >= 70) hair = '#e6e3dc';
  else if (a >= 52) hair = r.chance(0.5) ? '#a9a49b' : hair;
  const dyed = !p.military && a >= 16 && a < 42 && r.chance(p.style === 'punk' || p.style === 'indiepop' ? 0.45 : 0.15);
  if (dyed) hair = r.pick(DYE);
  const style = app?.hairStyle ?? r.int(0, 9);
  const tex = app?.hairTex ?? 'straight';
  const face = app?.face ?? 'oval';

  // ── 옷 (어깨) ──
  const school = (kid && !baby && a >= 7) || teen;
  const o = p.military
    ? { main: '#56663f', alt: '#465433', detail: '#2d3522' }
    : school
      ? { main: '#2a3550', alt: '#1f2840', detail: '#f5f0e6' }
      : p.style
        ? OUTFIT[p.style]
        : { main: r.pick(PLAIN), alt: '#00000033', detail: '#f5f0e6' };
  const broad = app?.build === 'broad' ? 1 : app?.build === 'slim' ? -1 : 0;
  const sx = 3 - broad;
  const sw = 18 + broad * 2;
  if (!baby) {
    px(g, sx, 22, sw, 6, o.main);
    px(g, sx + 1, 21, sw - 2, 1, o.main);
    // 옷의 개성
    if (p.military) px(g, 11, 22, 2, 6, o.alt);
    else if (school) { px(g, 10, 21, 4, 3, o.detail); px(g, 11, 23, 2, 4, '#b0203a'); }
    else if (p.style === 'indierock') { px(g, 9, 21, 6, 7, o.detail); px(g, sx + 2, 24, 1, 4, o.alt); px(g, sx + sw - 3, 24, 1, 4, o.alt); }
    else if (p.style === 'punk') { px(g, 11, 21, 1, 7, o.detail); px(g, sx + 1, 22, 2, 1, o.detail); px(g, sx + sw - 3, 22, 2, 1, o.detail); px(g, 14, 25, 1, 1, o.alt); }
    else if (p.style === 'shoegaze') { px(g, 9, 21, 6, 7, o.alt); for (let y = 23; y < 28; y += 2) px(g, 12, y, 1, 1, o.detail); }
    else if (p.style === 'folk') { for (let x = sx; x < sx + sw; x += 3) px(g, x, 22, 1, 6, o.alt); for (let y = 23; y < 28; y += 3) px(g, sx, y, sw, 1, o.alt); px(g, 10, 21, 4, 2, o.detail); }
    else if (p.style === 'metal') { px(g, 9, 23, 6, 4, o.alt); px(g, 10, 24, 4, 2, o.detail); }
    else if (p.style === 'indiepop') { for (let y = 23; y < 28; y += 2) px(g, sx, y, sw, 1, o.alt); px(g, 10, 21, 4, 1, o.detail); }
    else px(g, 10, 21, 4, 1, o.detail);
    // 목
    px(g, 10, 19, 4, 3, skin);
    px(g, 10, 21, 4, 1, shade);
  } else {
    px(g, 4, 22, 16, 6, '#f3e7c9');
  }

  // ── 얼굴 ──
  const fx = face === 'long' || face === 'oval' ? 7 : 6;
  const fw = face === 'long' || face === 'oval' ? 10 : 12;
  const fy = baby ? 7 : 5;
  const fh = baby ? 13 : face === 'long' ? 15 : face === 'round' ? 13 : 14;
  px(g, fx, fy, fw, fh, skin);
  // 둥근 모서리 / 턱
  px(g, fx + fw - 2, fy + 2, 1, fh - 4, shade);
  // 턱선: 사각턱이 아니면 아래 모서리를 깎는다 (목·옷 위면 그 색으로)
  const under = (y: number) => (y >= 21 && !baby ? o.main : y >= 19 && !baby ? skin : bg);
  if (face !== 'square') { px(g, fx, fy + fh - 1, 1, 1, under(fy + fh - 1)); px(g, fx + fw - 1, fy + fh - 1, 1, 1, under(fy + fh - 1)); }
  if (face === 'oval' || face === 'long') { px(g, fx, fy + fh - 2, 1, 1, under(fy + fh - 2)); px(g, fx + fw - 1, fy + fh - 2, 1, 1, under(fy + fh - 2)); }
  // 귀
  px(g, fx - 1, fy + 5, 1, 3, skin);
  px(g, fx + fw, fy + 5, 1, 3, skin);
  const earring = !kid && !p.military && r.chance(p.gender === 'f' ? 0.45 : p.style === 'punk' || p.style === 'metal' ? 0.4 : 0.12);
  if (earring) px(g, fx + fw, fy + 8, 1, 1, r.chance(0.5) ? '#e3b341' : '#d9dce3');

  // ── 눈·눈썹 ──
  const ey = fy + (baby ? 6 : 6);
  const exL = fx + (fw >= 12 ? 3 : 2);
  const exR = fx + fw - (fw >= 12 ? 5 : 4);
  const blinkClosed = false;
  const brow = a >= 70 ? '#cfcac0' : HAIR[app?.hairColor ?? 'black'];
  if (!baby) {
    const browY = ey - 2 + (p.mood !== undefined && p.mood < 35 ? 0 : 0);
    px(g, exL, browY, 2, 1, brow);
    px(g, exR, browY, 2, 1, brow);
    if (p.mood !== undefined && p.mood < 35) { px(g, exL + 1, browY - 1, 1, 1, brow); px(g, exR, browY - 1, 1, 1, brow); }
  }
  if (!blinkClosed) {
    px(g, exL, ey, 2, 2, '#ffffff');
    px(g, exR, ey, 2, 2, '#ffffff');
    const look = r.chance(0.5) ? 1 : 0;
    px(g, exL + look, ey, 1, 2, '#1a1414');
    px(g, exR + look, ey, 1, 2, '#1a1414');
    if (app?.doubleEyelid !== false && !baby) { px(g, exL, ey - 1, 2, 1, shade); px(g, exR, ey - 1, 2, 1, shade); }
  }
  // 안경
  const glasses = !baby && !p.military && r.chance(old ? 0.6 : 0.22);
  if (glasses) {
    const gc = r.pick(['#1a1414', '#7a4a2a', '#c9a45c']);
    px(g, exL - 1, ey - 1, 4, 1, gc);
    px(g, exR - 1, ey - 1, 4, 1, gc);
    px(g, exL - 1, ey + 2, 4, 1, gc);
    px(g, exR - 1, ey + 2, 4, 1, gc);
    px(g, exL - 1, ey - 1, 1, 4, gc);
    px(g, exR + 2, ey - 1, 1, 4, gc);
    px(g, exL + 3, ey, exR - exL - 3, 1, gc);
  }
  // 코
  if (!baby) px(g, fx + Math.floor(fw / 2) - 1, ey + 3, 1, 2, shade);
  // 입
  const my = ey + 6;
  const mx = fx + Math.floor(fw / 2) - 2;
  const mood = p.mood ?? 60;
  if (mood >= 66) { px(g, mx, my, 4, 1, '#8a3b3b'); px(g, mx + 1, my + 1, 2, 1, '#c35c5c'); }
  else if (mood < 35) { px(g, mx + 1, my, 2, 1, '#5a3030'); px(g, mx, my + 1, 1, 1, '#5a3030'); px(g, mx + 3, my + 1, 1, 1, '#5a3030'); }
  else px(g, mx + 1, my, 2, 1, '#7a3a3a');
  // 볼·주근깨·주름·수염
  if (kid) { px(g, exL - 1, ey + 3, 2, 1, '#f29a9a'); px(g, exR + 1, ey + 3, 2, 1, '#f29a9a'); }
  if (app?.freckles && !baby) { px(g, exL, ey + 3, 1, 1, '#b07850'); px(g, exL + 2, ey + 4, 1, 1, '#b07850'); px(g, exR + 1, ey + 3, 1, 1, '#b07850'); px(g, exR - 1, ey + 4, 1, 1, '#b07850'); }
  if (old) { px(g, exL - 1, ey + 1, 1, 1, shade); px(g, exR + 2, ey + 1, 1, 1, shade); px(g, mx - 1, my - 1, 1, 2, shade); px(g, mx + 4, my - 1, 1, 2, shade); }
  if (p.gender === 'm' && a >= 28 && !p.military && r.chance(0.3)) {
    const bc = a >= 60 ? '#bbb6ad' : HAIR[app?.hairColor ?? 'black'];
    if (r.chance(0.5)) px(g, mx - 1, my - 1, 6, 1, bc); // 콧수염
    else { px(g, fx + 1, my + 1, fw - 2, 2, bc); px(g, mx, my, 4, 1, '#7a3a3a'); }
  }

  // ── 머리카락 ──
  const bald = p.gender === 'm' && a >= 55 && style === 0;
  if (p.military) {
    px(g, fx, fy - 1, fw, 2, hair);
    return;
  }
  if (baby) {
    px(g, fx + 3, fy - 1, 4, 1, hair);
    px(g, fx + 5, fy - 2, 1, 1, hair);
    return;
  }
  if (bald) {
    px(g, fx - 1, fy + 3, 2, 3, hair);
    px(g, fx + fw - 1, fy + 3, 2, 3, hair);
    return;
  }
  // 정수리
  const top = fy - 2;
  const curly = tex === 'curly';
  const wavy = tex === 'wavy';
  const volume = curly ? 2 : wavy ? 1 : 0;
  px(g, fx - 1 - volume, top - volume, fw + 2 + volume * 2, 3 + volume, hair);
  // 앞머리 (스타일별)
  const bangs = style % 3;
  if (bangs === 0) px(g, fx, fy, fw, 2, hair);
  else if (bangs === 1) { px(g, fx, fy, Math.ceil(fw * 0.6), 2, hair); px(g, fx, fy + 2, 2, 1, hair); }
  else { px(g, fx + Math.floor(fw / 2), fy, Math.ceil(fw / 2), 2, hair); }
  // 옆·뒷머리 길이: 여성·메탈·슈게이즈는 길게, 짧은 스타일도 있다
  const long = (p.gender === 'f' && style % 4 !== 3) || (p.style === 'metal' && style % 2 === 0) || (p.style === 'shoegaze' && style % 3 === 0);
  const sideLen = long ? (style >= 6 ? 16 : 12) : p.gender === 'f' ? 6 : 3;
  px(g, fx - 1 - volume, fy, 1 + volume, sideLen, hair);
  px(g, fx + fw, fy, 1 + volume, sideLen, hair);
  if (long && style >= 6 && !teen && !kid) px(g, fx - 2 - volume, fy + 6, 1, sideLen - 6, hair);
  // 곱슬 질감: 바깥선에 들쭉날쭉한 점
  if (curly) for (let i = 0; i < 7; i++) px(g, fx - 3 + i * 3 + (i % 2), top - 3 + (i % 2), 2, 2, hair);
  // 스타일 포인트
  if (p.style === 'punk' && style % 4 === 0 && a >= 15 && a < 50) {
    // 모히칸
    px(g, fx - 1, top, fw + 2, 3, skin);
    px(g, fx + Math.floor(fw / 2) - 1, top - 5, 3, 8, hair);
  } else if (p.gender === 'f' && style === 5 && a >= 7) {
    // 포니테일
    px(g, fx + fw + 1, fy + 1, 2, 7, hair);
  } else if (p.gender === 'm' && style === 4 && a >= 15) {
    // 투블럭: 옆을 짧게
    px(g, fx - 1, fy + 2, 1, 2, shade);
    px(g, fx + fw, fy + 2, 1, 2, shade);
  }
  // 모자·헤드폰 (소품)
  const hat = !kid && r.chance(0.16);
  if (hat) {
    const hc = r.pick(['#e2364a', '#1a1830', '#c9a45c', '#5d8a6b', '#2357e6']);
    if (r.chance(0.5)) { px(g, fx - 2, top - 2, fw + 4, 4, hc); px(g, fx - 2, top + 1, fw + 4, 1, '#0003'); } // 비니
    else { px(g, fx - 1, top - 1, fw + 2, 3, hc); px(g, fx + fw - 1, top + 1, 5, 1, hc); } // 캡
  } else if (!kid && a < 45 && r.chance(0.1)) {
    px(g, fx - 2, top + 1, 1, 8, '#2a2a2a');
    px(g, fx + fw + 1, top + 1, 1, 8, '#2a2a2a');
    px(g, fx - 1, top - 2, fw + 2, 1, '#2a2a2a');
    px(g, fx - 3, fy + 5, 2, 4, '#ff4fa3');
    px(g, fx + fw + 1, fy + 5, 2, 4, '#ff4fa3');
  }
}
