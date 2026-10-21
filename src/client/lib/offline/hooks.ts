import { useEffect, useSyncExternalStore } from 'react';
import { DUE_LIMIT } from '@shared/constants';
import { getOfflineReviews, loadDueCards, subscribeOfflineReviews, syncReviews } from './reviews';

/** Queued and refused review counts, for the offline banner. */
export function useOfflineReviews() {
  return useSyncExternalStore(subscribeOfflineReviews, getOfflineReviews);
}

/**
 * While someone is signed in: syncs queued reviews on start and on reconnect, then saves a fresh
 * due list, so a session can start later without a network.
 */
export function useOfflineSync(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const run = () =>
      void syncReviews(userId).then(() =>
        loadDueCards(userId, DUE_LIMIT.default).catch(() => undefined),
      );
    run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [userId]);
}
