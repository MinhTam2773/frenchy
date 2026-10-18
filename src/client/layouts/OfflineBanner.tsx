import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * Says so when the device is offline: the MVP needs a connection for reviews, readings and
 * settings (PLAN §5; offline review is B-08). The live region is always mounted so the change is
 * announced.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  return (
    <div role="status" className="sticky top-0 z-10">
      {!online && (
        <p className="m-0 bg-gold-soft px-4 py-2 text-center text-sm font-bold text-gold-ink">
          You’re offline. Reviews, readings and settings need a connection to save.
        </p>
      )}
    </div>
  );
}
