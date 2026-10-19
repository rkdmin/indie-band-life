import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CrashGuard } from './ui/Crash';
import { initBackButton, isNative } from './platform';
import './styles/fonts.css';
import './styles.css';
import './theme.css';
import './styles/turntable.css';
import './styles/deck.css';
import './styles/cards.css';
import './styles/data.css';
import './styles/interact.css';
import './styles/ending.css';

initBackButton();

// 게임 화면은 확대·축소되지 않게 — 두 손가락 확대(iOS 는 viewport 설정을 무시해서 제스처를 직접 막는다)·두 번 탭·Ctrl+휠·Ctrl+±
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) e.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashGuard>
      <App />
    </CrashGuard>
  </StrictMode>,
);

// 네이티브 앱은 번들된 자산을 쓰므로 서비스 워커가 필요 없다 (업데이트 뒤 낡은 캐시 방지)
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
