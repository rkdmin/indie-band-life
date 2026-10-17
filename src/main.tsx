import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initBackButton, isNative } from './platform';
import './styles.css';
import './theme.css';

initBackButton();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 네이티브 앱은 번들된 자산을 쓰므로 서비스 워커가 필요 없다 (업데이트 뒤 낡은 캐시 방지)
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
