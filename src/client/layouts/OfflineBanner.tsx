import { useSyncExternalStore } from 'react';
import { dismissDropped, useOfflineReviews } from '@client/lib/offline';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const reviews = (count: number) => (count === 1 ? '1 review' : `${count} reviews`);

/**
 * Says so when the device is offline, how many reviews wait to sync (B-08), and when the server
 * refused a queued review. Reviews work offline; readings and settings still need a connection
 * (PLAN §5). The live region is always mounted so a change is announced.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  const { pending, dropped } = useOfflineReviews();
  const waiting = pending > 0 ? `${reviews(pending)} waiting to sync.` : null;
  return (
    <div role="status" className="sticky top-0 z-10">
      {!online ? (
        <p className="m-0 bg-gold-soft px-4 py-2 text-center text-sm font-bold text-gold-ink">
          You’re offline. {waiting ?? 'Reviews will sync when you’re back online.'} Readings and
          settings need a connection to save.
        </p>
      ) : (
        waiting && (
          <p className="m-0 bg-gold-soft px-4 py-2 text-center text-sm font-bold text-gold-ink">
            {waiting}
          </p>
        )
      )}
      {dropped > 0 && (
        <div className="flex items-center gap-3 bg-danger-soft py-1 pr-1 pl-4 text-sm font-bold text-danger-ink">
          <p className="m-0 flex-1">
            {dropped === 1 ? 'One review' : `${dropped} reviews`} couldn’t be saved. Those cards
            will come back in your next review.
          </p>
          <button
            type="button"
            onClick={dismissDropped}
            className="h-11 shrink-0 rounded-xl px-3 font-extrabold hover:bg-surface"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
