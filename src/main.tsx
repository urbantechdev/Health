import '@vitejs/plugin-react/preamble';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for instant offline app caching
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('HMIS: New offline update available');
      },
      onOfflineReady() {
        console.log('HMIS: Hospital system is ready for offline operation');
      },
    });
  }
} catch {
  // Service worker optional fallback
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

