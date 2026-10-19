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

initBackButton();

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
