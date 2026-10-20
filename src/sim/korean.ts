// 한국어 조사 처리. "민재이가" 같은 어색한 문장을 막는다.

function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  // 숫자·영문 끝: 대략적인 발음 기준
  if (/[0136789]$/.test(ch)) return true;
  if (/[lmnr]$/i.test(ch)) return true;
  return false;
}

function rieulBatchim(word: string): boolean {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
}

/** josa('민재', '이/가') → '민재가' */
export function josa(word: string, pair: '이/가' | '은/는' | '을/를' | '과/와' | '으로/로' | '아/야' | '이/'): string {
  const b = hasBatchim(word);
  switch (pair) {
    case '이/가':
      return word + (b ? '이' : '가');
    case '은/는':
      return word + (b ? '은' : '는');
    case '을/를':
      return word + (b ? '을' : '를');
    case '과/와':
      return word + (b ? '과' : '와');
    case '으로/로':
      return word + (b && !rieulBatchim(word) ? '으로' : '로');
    case '아/야':
      return word + (b ? '아' : '야');
    case '이/':
      return word + (b ? '이' : '');
  }
}

// 외국 성씨 — ‘이름 성’(서양)과 ‘성 이름’(일본)을 구분하는 데 쓴다
const SURNAME_FIRST = new Set(['사토', '스즈키', '다카하시', '다나카', '와타나베', '이토', '야마모토', '나카무라', '고바야시', '가토']);

/** 이름에서 성을 뗀 부르는 이름: 김민재 → 민재, 리암 존슨 → 리암, 사토 하루토 → 하루토 */
export function given(name: string): string {
  if (name.includes(' ')) {
    const parts = name.split(' ');
    return SURNAME_FIRST.has(parts[0]) ? parts[parts.length - 1] : parts[0];
  }
  return name.length >= 3 ? name.slice(1) : name;
}

/** 가족의 성을 물려받게 이름을 고친다 */
export function withFamilyName(playerName: string, npcName: string): string {
  if (!playerName.includes(' ')) return playerName[0] + npcName.slice(1);
  const pp = playerName.split(' ');
  const np = npcName.split(' ');
  return SURNAME_FIRST.has(pp[0]) ? `${pp[0]} ${np[np.length - 1]}` : `${np[0]} ${pp[pp.length - 1]}`;
}

/** 친근하게 부르는 이름: 민재 → 민재, 서준 → 서준이 */
export function callName(name: string): string {
  return josa(given(name), '이/');
}

/**
 * 돈 표시 — 한국 인생은 원화 그대로, 다른 나라 인생은 그 나라 돈의 지금 가치로 (sim/money.ts 가 정해 둔다).
 * 게임 안의 계산은 언제나 원화다.
 */
let MONEY: { unit: string; factor: number; decimals: number } | null = null;
export function setMoneyDisplay(d: { unit: string; factor: number; decimals: number } | null) {
  MONEY = d;
}
export function won(n: number): string {
  if (MONEY) return localMoney(n * MONEY.factor, MONEY.unit, MONEY.decimals);
  return krwText(n);
}
/** 18,500 → ‘1.9만 달러’, 9.73 → ‘9.7달러’, 1,250,000 → ‘125만 엔’ */
export function localMoney(v: number, unit: string, decimals = 1): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  const sp = ' ';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1).replace(/\.0$/, '')}억${sp}${unit}`;
  if (abs >= 10_000) return `${sign}${abs >= 100_000 ? Math.round(abs / 10_000).toLocaleString('ko-KR') : (abs / 10_000).toFixed(1).replace(/\.0$/, '')}만${sp}${unit}`;
  if (abs < 100 && decimals > 0 && Math.round(abs * 10) % 10 !== 0) return `${sign}${abs.toFixed(1)}${unit}`;
  return `${sign}${Math.round(abs).toLocaleString('ko-KR')}${unit}`;
}
function krwText(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(abs >= 1_000_000_000 ? 0 : 1)}억원`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString('ko-KR')}만원`;
  return `${sign}${Math.round(abs).toLocaleString('ko-KR')}원`;
}

export function count(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}만`;
  return Math.round(n).toLocaleString('ko-KR');
}
