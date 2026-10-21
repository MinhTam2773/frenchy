import { describe, expect, test } from 'vitest';
import { ApiError, Card, type ReviewInput } from '../../shared/schemas';
import { grade } from '../../shared/srs';
import { localDateOf } from '../../shared/streak';
import { newUser, type TestUser } from './sync-test-helpers';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

async function addCard(user: TestUser, front = 'Je parle français.'): Promise<Card> {
  const res = await user.api('/cards', {
    method: 'POST',
    body: {
      type: 'sentence_meaning',
      front,
      back: 'I speak French.',
      source: { kind: 'word', ref: 'parler' },
    },
  });
  return Card.parse(await res.json());
}

function review(card: Card, overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    id: crypto.randomUUID(),
    cardId: card.id,
    rating: 3,
    reviewedAt: Date.now() - 5_000,
    durationMs: 4_000,
    ...overrides,
  };
}

function postReview(user: TestUser, body: unknown) {
  return user.api('/reviews', { method: 'POST', body });
}

async function reviewsToday(user: TestUser, timeZone = 'UTC'): Promise<number> {
  const rows = await user.db.dailyActivity.select();
  return rows.find((row) => row.date === localDateOf(Date.now(), timeZone))?.reviews ?? 0;
}

describe('POST /api/reviews', () => {
  test('grades on the server at reviewedAt, stores the review and counts it for the day', async () => {
    const user = await newUser();
    const card = await addCard(user);
    // A client that claims an easy, far-off due date: only the rating and time are used.
    const input = { ...review(card), due: Date.now() + 365 * DAY, state: 'review' };
    const res = await postReview(user, input);
    expect(res.status).toBe(200);

    const graded = Card.parse(await res.json());
    const expected = grade(card, 3, input.reviewedAt).card;
    expect(graded).toMatchObject({ ...expected, id: card.id, front: card.front });
    expect(graded.lastReview).toBe(input.reviewedAt);
    expect(await user.db.reviews.select()).toEqual([
      {
        id: input.id,
        userId: user.id,
        cardId: card.id,
        rating: 3,
        reviewedAt: input.reviewedAt,
        durationMs: 4_000,
      },
    ]);
    expect(await reviewsToday(user)).toBe(1);
  });

  test('a repeated review id returns the card without grading it again', async () => {
    const user = await newUser();
    const card = await addCard(user);
    const input = review(card);
    const first = Card.parse(await (await postReview(user, input)).json());
    const again = await postReview(user, { ...input, rating: 1 });
    expect(again.status).toBe(200);
    expect(Card.parse(await again.json())).toEqual(first);
    expect(first.reps).toBe(1);
    expect(await reviewsToday(user)).toBe(1);
  });

  test("another user's review with the same id is applied for them too (G-79)", async () => {
    const a = await newUser();
    const b = await newUser();
    const id = crypto.randomUUID();
    const cardA = await addCard(a);
    const cardB = await addCard(b);
    expect((await postReview(a, review(cardA, { id }))).status).toBe(200);

    const res = await postReview(b, review(cardB, { id, rating: 1 }));
    expect(res.status).toBe(200);
    expect(Card.parse(await res.json())).toMatchObject({ id: cardB.id, reps: 1, lapses: 0 });
    expect(await b.db.reviews.select()).toMatchObject([{ id, cardId: cardB.id, rating: 1 }]);
    expect(await a.db.reviews.select()).toMatchObject([{ id, cardId: cardA.id, rating: 3 }]);
    expect(await reviewsToday(a)).toBe(1);
    expect(await reviewsToday(b)).toBe(1);
  });

  test('a session replayed after going offline, with repeats, counts each review once', async () => {
    const user = await newUser();
    const cards = [
      await addCard(user, 'Je parle.'),
      await addCard(user, 'Tu parles.'),
      await addCard(user, 'Il parle.'),
    ];
    const now = Date.now();
    const queued = cards.map((card, i) => review(card, { reviewedAt: now - (3 - i) * MINUTE }));
    // The first two reached the server but their answers were lost, so the queue sends them again.
    for (const input of queued.slice(0, 2)) await postReview(user, input);
    for (const input of queued) expect((await postReview(user, input)).status).toBe(200);

    const rows = await user.db.cards.select();
    expect(rows.map((row) => row.reps)).toEqual([1, 1, 1]);
    expect(await user.db.reviews.select()).toHaveLength(3);
    expect(await reviewsToday(user)).toBe(3);
  });

  test('an out-of-order replay never moves the last review back', async () => {
    const user = await newUser();
    const card = await addCard(user);
    const now = Date.now();
    const later = review(card, { reviewedAt: now - MINUTE, rating: 3 });
    const earlier = review(card, { reviewedAt: now - 3 * MINUTE, rating: 1 });
    await postReview(user, later);
    const res = await postReview(user, earlier);
    expect(res.status).toBe(200);
    expect(Card.parse(await res.json()).lastReview).toBe(later.reviewedAt);
    const stored = await user.db.reviews.select();
    expect(stored.map((row) => row.reviewedAt).sort()).toEqual([
      later.reviewedAt,
      later.reviewedAt,
    ]);
  });

  test('counts the review on the local day of the profile time zone', async () => {
    const user = await newUser();
    await user.api('/profile', { method: 'PATCH', body: { timeZone: 'Pacific/Kiritimati' } });
    const card = await addCard(user);
    await postReview(user, review(card));
    expect(await reviewsToday(user, 'Pacific/Kiritimati')).toBe(1);
  });

  test('grades a review older than the last one at the last review time', async () => {
    const user = await newUser();
    const card = await addCard(user);
    const now = Date.now();
    await postReview(user, review(card, { reviewedAt: now - MINUTE }));
    const res = await postReview(user, review(card, { reviewedAt: now - 2 * MINUTE }));
    expect(res.status).toBe(200);
    const graded = Card.parse(await res.json());
    expect(graded.reps).toBe(2);
    expect(graded.lastReview).toBe(now - MINUTE);
  });

  test('clamps a client clock a little ahead to the server time', async () => {
    const user = await newUser();
    const card = await addCard(user);
    const res = await postReview(user, review(card, { reviewedAt: Date.now() + MINUTE }));
    expect(res.status).toBe(200);
    expect(Card.parse(await res.json()).lastReview).toBeLessThanOrEqual(Date.now());
  });

  test.each([
    ['rating', { rating: 5 }],
    ['rating', { rating: 0 }],
    ['id', { id: 'not-a-uuid' }],
    ['reviewedAt', { reviewedAt: Date.now() - 2 * DAY }],
    ['reviewedAt', { reviewedAt: Date.now() + DAY }],
  ])('refuses a bad %s', async (path, overrides) => {
    const user = await newUser();
    const card = await addCard(user);
    const res = await postReview(user, { ...review(card), ...overrides });
    expect(res.status).toBe(400);
    expect(ApiError.parse(await res.json()).error.issues?.map((issue) => issue.path)).toEqual([
      path,
    ]);
    expect(await user.db.reviews.select()).toEqual([]);
  });

  test("answers 404 for an unknown card and for another user's card, which stays as it was", async () => {
    const a = await newUser();
    const b = await newUser();
    const cardA = await addCard(a);
    expect((await postReview(a, { ...review(cardA), cardId: crypto.randomUUID() })).status).toBe(
      404,
    );

    const res = await postReview(b, review(cardA));
    expect(res.status).toBe(404);
    expect(ApiError.parse(await res.json()).error.code).toBe('not_found');
    const [row] = await a.db.cards.select();
    expect(row).toMatchObject({ id: cardA.id, reps: 0, state: 'new' });
    expect(await b.db.reviews.select()).toEqual([]);
    expect(await b.db.dailyActivity.select()).toEqual([]);
  });
});
