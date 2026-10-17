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

/** 이름에서 성을 뗀 부르는 이름: 김민재 → 민재 */
export function given(name: string): string {
  return name.length >= 3 ? name.slice(1) : name;
}

/** 친근하게 부르는 이름: 민재 → 민재, 서준 → 서준이 */
export function callName(name: string): string {
  return josa(given(name), '이/');
}

export function won(n: number): string {
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
