// 시트·갈림길·카드·연출이 떠 있는 동안 뒤 페이지가 스크롤되지 않게 잠근다.
// 여러 개가 겹쳐 떠도 마지막 하나가 닫힐 때 풀리도록 개수를 센다.
// 모바일(특히 iOS)에서는 overflow 만으로는 바닥이 끌려가서, 화면을 그 자리에 고정해 두었다가 되돌린다.

import { useEffect } from 'react';

let locks = 0;
let savedY = 0;

function lock() {
  if (locks++ > 0) return;
  savedY = window.scrollY;
  const b = document.body.style;
  b.position = 'fixed';
  b.top = `-${savedY}px`;
  b.left = '0';
  b.right = '0';
  b.width = '100%';
  document.documentElement.style.overflow = 'hidden';
}

function unlock() {
  if (--locks > 0) return;
  locks = 0;
  const b = document.body.style;
  b.position = '';
  b.top = '';
  b.left = '';
  b.right = '';
  b.width = '';
  document.documentElement.style.overflow = '';
  window.scrollTo(0, savedY);
}

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
