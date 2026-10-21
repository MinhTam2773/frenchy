import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';
import { apiError } from '@client/mocks/handlers/base';
import { server } from '@client/mocks/server';
import { reviewCards } from '@shared/fixtures';
import { ReviewInput } from '@shared/schemas';
import {
  clearOfflineData,
  discardReview,
  dismissDropped,
  getOfflineReviews,
  holdReview,
  loadDueCards,
  queueReview,
  syncReviews,
} from './reviews';
import { listPending, putPending, readDueCards, saveDueCards } from './store';

const USER = 'user-a';
const [first, second, third] = reviewCards;

function review(cardId: string, reviewedAt: number, rating: ReviewInput['rating'] = 3) {
  return { id: crypto.randomUUID(), cardId, rating, reviewedAt, durationMs: 3_000 };
}

/** Records every POST /api/reviews body; `answer` decides the response (a 200 by default). */
function serverReviews(answer: (review: ReviewInput) => Response | undefined = () => undefined) {
  const posted: ReviewInput[] = [];
  server.use(
    http.post('/api/reviews', async ({ request }) => {
      const body = ReviewInput.parse(await request.json());
      posted.push(body);
      return answer(body) ?? HttpResponse.json(reviewCards.find((c) => c.id === body.cardId));
    }),
  );
  return posted;
}

const networkDown = () => server.use(http.post('/api/reviews', () => HttpResponse.error()));

test('reviews queued offline sync on reconnect, oldest first', async () => {
  networkDown();
  const now = Date.now();
  const later = review(first.id, now - 60_000);
  const earlier = review(second.id, now - 120_000);
  await queueReview(USER, later);
  await queueReview(USER, earlier);
  expect(getOfflineReviews().pending).toBe(2);
  expect(await listPending(USER)).toHaveLength(2);

  server.resetHandlers();
  const posted = serverReviews();
  await syncReviews(USER);
  expect(posted.map((r) => r.id)).toEqual([earlier.id, later.id]);
  expect(posted[0]).toEqual(earlier);
  expect(getOfflineReviews().pending).toBe(0);
  expect(await listPending(USER)).toEqual([]);
});

test('a review queued twice is posted once, and one whose answer was lost is sent again with its id', async () => {
  let lose = true;
  const posted = serverReviews(() => {
    if (!lose) return undefined;
    lose = false;
    return HttpResponse.error();
  });
  const input = review(first.id, Date.now() - 1_000);
  await queueReview(USER, input);
  await queueReview(USER, input);
  // The first post reached the server but its answer didn't come back; the queue kept it.
  expect(posted.map((r) => r.id)).toEqual([input.id, input.id]);
  expect(await listPending(USER)).toEqual([]);
  await syncReviews(USER);
  expect(posted).toHaveLength(2);
});

test('a held grade waits for its release; one held by a closed page is synced', async () => {
  const posted = serverReviews();
  const held = review(first.id, Date.now() - 1_000);
  await holdReview(USER, held);
  await syncReviews(USER);
  expect(posted).toEqual([]);
  expect(getOfflineReviews().pending).toBe(0);

  await queueReview(USER, held);
  expect(posted.map((r) => r.id)).toEqual([held.id]);

  const orphan = review(second.id, Date.now() - 2_000);
  await putPending({ ...orphan, userId: USER, heldBy: 'a-page-that-was-closed' });
  await syncReviews(USER);
  expect(posted.map((r) => r.id)).toEqual([held.id, orphan.id]);
});

test('an undone held grade is never posted', async () => {
  const posted = serverReviews();
  const held = review(first.id, Date.now() - 1_000);
  await holdReview(USER, held);
  await discardReview(USER, held.id);
  await syncReviews(USER);
  expect(posted).toEqual([]);
  expect(await listPending(USER)).toEqual([]);
});

test('a review the server refuses as too old is dropped and counted, and its card stays due', async () => {
  await saveDueCards(USER, [first, second]);
  serverReviews((body) =>
    body.cardId === first.id ? apiError('bad_request', 'Invalid body', 400) : undefined,
  );
  const stale = review(first.id, Date.now() - 25 * 3_600_000);
  const fresh = review(second.id, Date.now() - 1_000);
  await queueReview(USER, stale);
  await queueReview(USER, fresh);

  expect(getOfflineReviews()).toEqual({ pending: 0, dropped: 1 });
  expect(await listPending(USER)).toEqual([]);
  expect((await readDueCards(USER))?.map((c) => c.id)).toEqual([first.id]);
  dismissDropped();
  expect(getOfflineReviews().dropped).toBe(0);
});

test('a server error stops the sync and keeps the queue in order for the next try', async () => {
  let failing = true;
  const posted = serverReviews(() =>
    failing ? apiError('internal', 'Something went wrong', 500) : undefined,
  );
  const a = review(first.id, Date.now() - 3_000);
  const b = review(second.id, Date.now() - 2_000);
  await queueReview(USER, a);
  await queueReview(USER, b);
  expect(posted.map((r) => r.id)).toEqual([a.id, a.id]);
  expect(getOfflineReviews()).toEqual({ pending: 2, dropped: 0 });

  failing = false;
  await syncReviews(USER);
  expect(posted.map((r) => r.id)).toEqual([a.id, a.id, a.id, b.id]);
  expect(getOfflineReviews().pending).toBe(0);
});

test("one user's queue is never posted for another user", async () => {
  networkDown();
  await queueReview(USER, review(first.id, Date.now() - 1_000));
  server.resetHandlers();
  const posted = serverReviews();
  await syncReviews('user-b');
  expect(posted).toEqual([]);
  expect(await listPending(USER)).toHaveLength(1);
});

test('the due list is saved online and used offline, without cards that wait to sync', async () => {
  expect((await loadDueCards(USER, 20)).map((c) => c.id)).toEqual(
    reviewCards.map((card) => card.id),
  );

  server.use(http.get('/api/cards/due', () => HttpResponse.error()));
  networkDown();
  await queueReview(USER, review(first.id, Date.now() - 1_000));
  expect((await loadDueCards(USER, 20)).map((c) => c.id)).toEqual([second.id, third.id]);
  // Nothing saved for this user: the network error stands.
  await expect(loadDueCards('user-b', 20)).rejects.toMatchObject({ status: 0 });
});

test('a server error loading the due list is not hidden by the saved list', async () => {
  await loadDueCards(USER, 20);
  server.use(http.get('/api/cards/due', () => apiError('internal', 'Something went wrong', 500)));
  await expect(loadDueCards(USER, 20)).rejects.toMatchObject({ status: 500 });
});

test('clearOfflineData forgets the queue and the saved cards', async () => {
  networkDown();
  await saveDueCards(USER, [first]);
  await queueReview(USER, review(first.id, Date.now() - 1_000));
  await clearOfflineData();
  expect(await listPending(USER)).toEqual([]);
  expect(await readDueCards(USER)).toBeUndefined();
  expect(getOfflineReviews()).toEqual({ pending: 0, dropped: 0 });
});
