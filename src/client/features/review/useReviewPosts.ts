import { useCallback, useRef, useState } from 'react';
import { api, ApiClientError } from '@client/lib/api';
import type { ReviewInput } from '@shared/schemas';

const RETRY_DELAYS_MS = [500, 2000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A network failure or a 5xx may pass; a 4xx will not. The client-made id makes a retry safe. */
async function postWithRetry(review: ReviewInput): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await api.reviews.create(review);
      return;
    } catch (error) {
      const retryable =
        error instanceof ApiClientError && (error.status === 0 || error.status >= 500);
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw error;
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * Posts graded reviews in the background so the next card never waits on the network. Each review
 * id is posted once, however many times `post` is called with it.
 */
export function useReviewPosts() {
  const sent = useRef(new Set<string>());
  const inFlight = useRef(new Set<Promise<void>>());
  const [failed, setFailed] = useState(0);

  const post = useCallback((review: ReviewInput) => {
    if (sent.current.has(review.id)) return;
    sent.current.add(review.id);
    const request = postWithRetry(review)
      .catch(() => setFailed((count) => count + 1))
      .finally(() => inFlight.current.delete(request));
    inFlight.current.add(request);
  }, []);

  /** Resolves when every review posted so far has finished, successfully or not. */
  const settled = useCallback(async () => {
    await Promise.all([...inFlight.current]);
  }, []);

  return { post, settled, failed };
}
