import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for instant offline app caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('HMIS: New offline update available');
  },
  onOfflineReady() {
    console.log('HMIS: Hospital system is ready for offline operation');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

