import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { StoreProvider } from './store'

// PWA: register service worker + track updates
let swUpdateReady: (() => void) | null = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/discipline-diary/sw.js').then(reg => {
      // Check if a new SW is waiting to activate
      if (reg.waiting) {
        swUpdateReady = () => {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        };
      }

      // Listen for new SW found while page is open
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              swUpdateReady = () => {
                newSW.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              };
            }
          });
        }
      });
    });
  });

  // When a new SW takes over, reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// Expose for App.tsx to use
export function getSWUpdateReady() {
  const fn = swUpdateReady;
  swUpdateReady = null;
  return fn;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
