import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { initPwaSettingsSync } from './lib/pwaSettingsSyncService';
import { ErrorBoundary } from './components/ErrorBoundary';

// Initialize PWA manifest & branding synchronization with Cloud Firestore
initPwaSettingsSync();

// Service Worker handling:
// Only register in production to prevent stale cache conflicts with Vite in dev.
// In development, ensure any previously registered service workers are cleaned up.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('HMIS: New offline update available');
    },
    onOfflineReady() {
      console.log('HMIS: Hospital system is ready for offline operation');
    },
    onRegisterError(error) {
      console.debug('HMIS: Service worker registration bypassed:', error);
    },
  });
} else {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
