import { Workbox } from 'workbox-window';

/**
 * Registers the service worker (production builds only; dev has none). `onUpdateReady` fires when
 * a new version has installed and is waiting. Returns the function that activates it and reloads,
 * or null when service workers are unavailable.
 */
export function registerServiceWorker(onUpdateReady: () => void): (() => void) | null {
  // G-27: a mock build runs MSW's worker, which has the same scope; a page gets only one.
  const mocks = import.meta.env.VITE_USE_MOCKS === 'true';
  if (!import.meta.env.PROD || mocks || !('serviceWorker' in navigator)) return null;
  const wb = new Workbox('/sw.js');
  wb.addEventListener('waiting', onUpdateReady);
  // The reload waits for the new worker to take control, so the page never mixes versions.
  wb.addEventListener('controlling', () => window.location.reload());
  void wb.register();
  return () => wb.messageSkipWaiting();
}
