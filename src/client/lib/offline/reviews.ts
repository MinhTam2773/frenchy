import { api, ApiClientError } from '@client/lib/api';
import type { Card, ReviewInput } from '@shared/schemas';
import {
  clearStores,
  deletePending,
  listPending,
  putPending,
  readDueCards,
  saveDueCards,
  settlePending,
  type PendingReview,
} from './store';

/** Marks the reviews this page load may still undo; any other page's held review is free to go. */
const PAGE_ID = crypto.randomUUID();

export const RETRY_MS = 30_000;

/** What the offline banner shows: reviews still queued, and reviews the server refused. */
export type OfflineReviews = { pending: number; dropped: number };

let snapshot: OfflineReviews = { pending: 0, dropped: 0 };
const listeners = new Set<() => void>();

function update(next: Partial<OfflineReviews>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

export function subscribeOfflineReviews(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineReviews(): OfflineReviews {
  return snapshot;
}

export function dismissDropped(): void {
  update({ dropped: 0 });
}

const noop = () => undefined;

// One sync at a time, in order, so the queue is replayed oldest first and never twice at once.
let chain: Promise<void> = Promise.resolve();
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function enqueue<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  const run = chain.then(work).catch(() => fallback);
  chain = run.then(noop);
  return run;
}

function scheduleRetry(userId: string) {
  // A flaky connection may never fire an `online` event, so try again on a timer as well.
  retryTimer ??= setTimeout(() => {
    retryTimer = undefined;
    void syncReviews(userId);
  }, RETRY_MS);
}

type Outcome = 'saved' | 'dropped' | 'retry';

async function send({
  id,
  cardId,
  rating,
  reviewedAt,
  durationMs,
}: PendingReview): Promise<Outcome> {
  try {
    await api.reviews.create({ id, cardId, rating, reviewedAt, durationMs });
    return 'saved';
  } catch (error) {
    // A 400 (held offline for more than 24 h, G-61) or a 404 (the card is gone) will never pass.
    const refused = error instanceof ApiClientError && [400, 404].includes(error.status);
    return refused ? 'dropped' : 'retry';
  }
}

async function flush(userId: string): Promise<number> {
  let saved = 0;
  const ready = (await listPending(userId))
    .filter((review) => review.heldBy !== PAGE_ID)
    .sort((a, b) => a.reviewedAt - b.reviewedAt);
  update({ pending: ready.length });
  for (const [index, review] of ready.entries()) {
    const outcome = await send(review);
    if (outcome === 'retry') {
      scheduleRetry(userId);
      break;
    }
    await settlePending(review, outcome === 'saved');
    if (outcome === 'saved') saved += 1;
    update({
      pending: ready.length - index - 1,
      dropped: snapshot.dropped + (outcome === 'dropped' ? 1 : 0),
    });
  }
  return saved;
}

/**
 * Posts this user's queued reviews, oldest `reviewedAt` first, one at a time. The server ignores a
 * review id it has already applied, so a replay after a lost answer counts once. Stops at the
 * first network or server error and keeps the rest for the next try. Resolves with how many
 * reviews the server saved; never rejects.
 */
export function syncReviews(userId: string): Promise<number> {
  return enqueue(() => flush(userId), 0);
}

/** Keeps a session's last grade on the device while it can still be undone (G-20). */
export async function holdReview(userId: string, review: ReviewInput): Promise<void> {
  await putPending({ ...review, userId, heldBy: PAGE_ID }).catch(noop);
}

/** Drops a held grade that was undone. */
export async function discardReview(userId: string, id: string): Promise<void> {
  await deletePending(userId, id).catch(noop);
}

/** Queues a graded review and tries to sync. Resolves once that try is over. Never rejects. */
export async function queueReview(userId: string, review: ReviewInput): Promise<void> {
  try {
    await putPending({ ...review, userId });
  } catch {
    // No IndexedDB on this device: post it now, as before B-08, and say so if that fails.
    const outcome = await send({ ...review, userId });
    if (outcome !== 'saved') update({ dropped: snapshot.dropped + 1 });
    return;
  }
  await syncReviews(userId);
}

/**
 * The due list for a session. Online it is `/api/cards/due`, saved for later; without a network
 * it is the last saved list. Cards with a review still queued are left out either way.
 */
export async function loadDueCards(userId: string, limit: number): Promise<Card[]> {
  let cards: Card[];
  try {
    ({ cards } = await api.cards.due(limit));
    await saveDueCards(userId, cards).catch(noop);
  } catch (error) {
    const offline = error instanceof ApiClientError && error.status === 0;
    const saved = offline ? await readDueCards(userId).catch(noop) : undefined;
    if (!saved) throw error;
    cards = saved;
  }
  const queued = new Set((await listPending(userId).catch(() => [])).map((r) => r.cardId));
  return cards.filter((card) => !queued.has(card.id));
}

/**
 * Forgets every queued review and saved card on this device, for sign-out (B-47, G-87). Runs after
 * a sync in progress, so it can't post a review after the clear.
 */
export function clearOfflineData(): Promise<void> {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  return enqueue(async () => {
    update({ pending: 0, dropped: 0 });
    await clearStores();
  }, undefined);
}
