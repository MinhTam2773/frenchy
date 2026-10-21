import { describe, expect, test } from 'vitest';
import { reviewCards, wordCardCreate } from '@shared/fixtures';
import { CLIENT_INSTANT_WINDOW } from '@shared/constants';
import { api, ApiClientError } from '@client/lib/api';

// The base mock follows the real routes' rules (T-22 notes for T-26), so screens see the same
// answers in tests as against the Worker.

const rejection = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (error: unknown) => {
      if (!(error instanceof ApiClientError)) throw error;
      return error;
    },
  );

describe('cards', () => {
  test('POST /api/cards dedupes on type + front', async () => {
    const card = await api.cards.create(wordCardCreate);
    await expect(api.cards.create(wordCardCreate)).resolves.toEqual(card);
  });

  test('the starter deck is added once, and an unknown chapter is a 404', async () => {
    await expect(api.cards.addStarterDeck('ch10')).resolves.toEqual({ added: 3, total: 3 });
    await expect(api.cards.addStarterDeck('ch10')).resolves.toEqual({ added: 0, total: 3 });
    const error = await rejection(api.cards.addStarterDeck('ch99'));
    expect(error).toMatchObject({ status: 404, code: 'not_found' });
  });
});

describe('client instants (G-61)', () => {
  const review = (reviewedAt: number) =>
    api.reviews.create({
      id: crypto.randomUUID(),
      cardId: reviewCards[0].id,
      rating: 3,
      reviewedAt,
      durationMs: 1,
    });

  test('a review older than 24 h is a 400 naming the field', async () => {
    const error = await rejection(review(Date.now() - CLIENT_INSTANT_WINDOW.pastMs - 60_000));
    expect(error).toMatchObject({ status: 400, code: 'bad_request' });
    expect(error.issues).toEqual([{ path: 'reviewedAt', message: expect.any(String) }]);
  });

  test('a review more than 5 min ahead is a 400, a slightly-ahead one is graded', async () => {
    await expect(
      rejection(review(Date.now() + CLIENT_INSTANT_WINDOW.futureMs + 60_000)),
    ).resolves.toMatchObject({ status: 400 });
    const graded = await review(Date.now() + 60_000);
    expect(graded.reps).toBe(reviewCards[0].reps + 1);
  });

  test('pings and readings use the same window', async () => {
    const old = Date.now() - CLIENT_INSTANT_WINDOW.pastMs - 60_000;
    await expect(rejection(api.activity.ping(old))).resolves.toMatchObject({ status: 400 });
    const error = await rejection(
      api.activity.addReading({ textId: 'ch10-au-cafe', finishedAt: old }),
    );
    expect(error.issues).toEqual([{ path: 'finishedAt', message: expect.any(String) }]);
  });
});

test('a bad body is a 400 with issues', async () => {
  const error = await rejection(api.words.put('aller', 'bogus' as 'known'));
  expect(error).toMatchObject({ status: 400, code: 'bad_request' });
  expect(error.issues?.[0]?.path).toBe('status');
});

test('unknown chapters and texts are 404s', async () => {
  await expect(rejection(api.profile.patch({ currentChapterId: 'ch99' }))).resolves.toMatchObject({
    status: 404,
  });
  await expect(
    rejection(api.activity.addReading({ textId: 'ch1-nowhere', finishedAt: Date.now() })),
  ).resolves.toMatchObject({ status: 404 });
});
