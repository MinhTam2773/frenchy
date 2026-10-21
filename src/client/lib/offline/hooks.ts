import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@client/lib/query';
import { DUE_LIMIT } from '@shared/constants';
import { getOfflineReviews, loadDueCards, subscribeOfflineReviews, syncReviews } from './reviews';

/** Queued and refused review counts, for the offline banner. */
export function useOfflineReviews() {
  return useSyncExternalStore(subscribeOfflineReviews, getOfflineReviews);
}

/**
 * While someone is signed in: syncs queued reviews on start and on reconnect, refreshes the counts
 * they change, then saves a fresh due list, so a session can start later without a network.
 */
export function useOfflineSync(userId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const run = async () => {
      if ((await syncReviews(userId)) > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cardStats });
        void queryClient.invalidateQueries({ queryKey: queryKeys.streak });
      }
      await loadDueCards(userId, DUE_LIMIT.default).catch(() => undefined);
    };
    const onOnline = () => void run();
    onOnline();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [userId, queryClient]);
}
