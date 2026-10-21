import { useCallback, useRef } from 'react';
import { discardReview, holdReview, queueReview } from '@client/lib/offline';
import type { ReviewInput } from '@shared/schemas';

/**
 * Saves graded reviews on the device and syncs them in the background, so the next card never
 * waits on the network and a session works offline (B-08). Each review id is queued once, however
 * many times `post` is called with it; the server ignores an id it has already applied.
 */
export function useReviewPosts(userId: string) {
  const sent = useRef(new Set<string>());
  const work = useRef(new Set<Promise<void>>());

  const track = useCallback((promise: Promise<void>) => {
    work.current.add(promise);
    void promise.finally(() => work.current.delete(promise));
  }, []);

  /** The session's last grade: kept on the device, but not synced while it can be undone. */
  const hold = useCallback(
    (review: ReviewInput) => track(holdReview(userId, review)),
    [track, userId],
  );

  const discard = useCallback((id: string) => track(discardReview(userId, id)), [track, userId]);

  const post = useCallback(
    (review: ReviewInput) => {
      if (sent.current.has(review.id)) return;
      sent.current.add(review.id);
      track(queueReview(userId, review));
    },
    [track, userId],
  );

  /** Resolves when every review posted so far is queued and has had one try at syncing. */
  const settled = useCallback(async () => {
    await Promise.all([...work.current]);
  }, []);

  return { hold, discard, post, settled };
}
