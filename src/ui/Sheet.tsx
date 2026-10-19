import { useEffect, useRef, type ReactNode } from 'react';
import { useBackButton } from '../platform';
import { useScrollLock } from './useScrollLock';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useBackButton(onClose);
  // 시트가 떠 있는 동안 뒤 페이지는 움직이지 않는다
  useScrollLock();
  // 다른 탭으로 바꾸면 맨 위부터 (이전 탭의 스크롤 위치가 남아 중간부터 보이던 문제)
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [title]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <div className="sheet-body" ref={body}>{children}</div>
      </div>
    </>
  );
}
