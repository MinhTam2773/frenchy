import { eq } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { NEW_CARDS_PER_DAY } from '../../shared/constants';
import { getDeck } from '../../shared/content/server';
import {
  ApiError,
  Card,
  CardStats,
  DueCardsResponse,
  StarterDeckResult,
  type CardCreate,
} from '../../shared/schemas';
import { newCard } from '../../shared/srs';
import { schema } from '../db';
import { toCardRow } from './sync-common';
import { newUser, type TestUser } from './sync-test-helpers';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const wordCard: CardCreate = {
  type: 'sentence_meaning',
  front: 'Nous parlons français.',
  back: 'We speak French.',
  source: { kind: 'word', ref: 'parler' },
};

/** Writes cards straight to D1 (through the user's scope) with the given FSRS overrides. */
async function insertCards(user: TestUser, overrides: Partial<Card>[]): Promise<Card[]> {
  const now = Date.now();
  const made = overrides.map((override, i): Card => ({
    id: crypto.randomUUID(),
    type: 'sentence_meaning',
    front: `Phrase ${i} ${crypto.randomUUID()}`,
    back: 'A sentence.',
    source: { kind: 'text', ref: 'ch10-au-marche' },
    ...newCard(now),
    createdAt: now,
    updatedAt: now,
    ...override,
  }));
  const [first, ...rest] = made.map((card) => user.db.cards.insert(toCardRow(card)));
  if (first) await user.db.batch([first, ...rest]);
  return made;
}

async function due(user: TestUser, query = ''): Promise<Card[]> {
  const res = await user.api(`/cards/due${query}`);
  expect(res.status).toBe(200);
  return DueCardsResponse.parse(await res.json()).cards;
}

async function stats(user: TestUser): Promise<CardStats> {
  const res = await user.api('/cards/stats');
  expect(res.status).toBe(200);
  return CardStats.parse(await res.json());
}

describe('POST /api/cards', () => {
  test('makes a new card, due now, and returns the same card for the same type + front', async () => {
    const user = await newUser();
    const before = Date.now();
    const res = await user.api('/cards', { method: 'POST', body: wordCard });
    expect(res.status).toBe(201);
    const card = Card.parse(await res.json());
    expect(card).toMatchObject({ ...wordCard, state: 'new', reps: 0, lastReview: null });
    expect(card.due).toBeGreaterThanOrEqual(before);
    expect(card).not.toHaveProperty('hint');

    const again = await user.api('/cards', { method: 'POST', body: { ...wordCard, back: 'x' } });
    expect(again.status).toBe(200);
    expect(Card.parse(await again.json())).toEqual(card);

    const flipped = await user.api('/cards', {
      method: 'POST',
      body: { ...wordCard, type: 'meaning_sentence' },
    });
    expect(flipped.status).toBe(201);
  });

  test('refuses a cloze without exactly one blank', async () => {
    const user = await newUser();
    const res = await user.api('/cards', {
      method: 'POST',
      body: { ...wordCard, type: 'cloze', clozeAnswer: 'parlons' },
    });
    expect(res.status).toBe(400);
    const { error } = ApiError.parse(await res.json());
    expect(error.issues?.map((issue) => issue.path)).toEqual(['front']);
  });

  test("dedupes per user: the same front for another user is that user's own card", async () => {
    const a = await newUser();
    const b = await newUser();
    const cardA = Card.parse(
      await (await a.api('/cards', { method: 'POST', body: wordCard })).json(),
    );
    const resB = await b.api('/cards', { method: 'POST', body: wordCard });
    expect(resB.status).toBe(201);
    expect(Card.parse(await resB.json()).id).not.toBe(cardA.id);
    expect((await due(a)).map((card) => card.id)).toEqual([cardA.id]);
  });
});

describe('GET /api/cards/due', () => {
  test('returns due cards, most overdue first, and leaves out cards due later', async () => {
    const user = await newUser();
    const now = Date.now();
    const [late, later, latest, future] = await insertCards(user, [
      { state: 'review', reps: 3, lastReview: now - 5 * DAY, due: now - 2 * DAY },
      { state: 'learning', reps: 1, lastReview: now - 2 * DAY, due: now - DAY },
      { due: now - MINUTE },
      { state: 'review', reps: 2, lastReview: now - DAY, due: now + DAY },
    ]);
    expect((await due(user)).map((card) => card.id)).toEqual([late?.id, later?.id, latest?.id]);
    expect((await due(user, '?limit=2')).map((card) => card.id)).toEqual([late?.id, later?.id]);
    expect(future).toBeDefined();
  });

  test(`starts at most ${NEW_CARDS_PER_DAY} new cards per day`, async () => {
    const user = await newUser();
    const now = Date.now();
    const fresh = await insertCards(
      user,
      Array.from({ length: NEW_CARDS_PER_DAY + 2 }, () => ({})),
    );
    expect(await due(user, '?limit=100')).toHaveLength(NEW_CARDS_PER_DAY);

    // Three of them were graded for the first time today: 7 new cards are left for today.
    const started = fresh.slice(0, 3);
    for (const card of started) {
      await user.db.batch([
        user.db.cards.update(
          { state: 'learning', reps: 1, lastReview: now - MINUTE, due: now + 10 * MINUTE },
          eq(schema.cards.id, card.id),
        ),
        user.db.reviews.insert({
          id: crypto.randomUUID(),
          cardId: card.id,
          rating: 3,
          reviewedAt: now - MINUTE,
          durationMs: 1000,
        }),
      ]);
    }
    expect(await due(user, '?limit=100')).toHaveLength(NEW_CARDS_PER_DAY - 3);
    expect(await stats(user)).toEqual({
      due: NEW_CARDS_PER_DAY - 3,
      new: NEW_CARDS_PER_DAY - 3,
      learning: 0,
      review: 0,
      nextDueAt: now + 10 * MINUTE,
    });
  });

  test('a card the learner saved starts before the starter deck under the daily cap', async () => {
    const user = await newUser();
    const now = Date.now();
    await insertCards(
      user,
      Array.from({ length: NEW_CARDS_PER_DAY + 5 }, (_, i) => ({
        source: { kind: 'starter' as const, ref: `ch1-card-${i}` },
        due: now - DAY,
        createdAt: now - DAY,
      })),
    );
    const [saved] = await insertCards(user, [{ source: { kind: 'word', ref: 'voici' } }]);
    const cards = await due(user, '?limit=100');
    expect(cards).toHaveLength(NEW_CARDS_PER_DAY);
    expect(cards.map((card) => card.id)).toContain(saved?.id);
  });

  test.each(['?limit=0', '?limit=101', '?limit=ten'])('refuses %s', async (query) => {
    const user = await newUser();
    const res = await user.api(`/cards/due${query}`);
    expect(res.status).toBe(400);
    expect(ApiError.parse(await res.json()).error.issues?.[0]?.path).toBe('limit');
  });

  test("never returns another user's cards", async () => {
    const a = await newUser();
    const b = await newUser();
    await insertCards(a, [{}, { state: 'review', reps: 1, lastReview: 0, due: 0 }]);
    expect(await due(b)).toEqual([]);
    expect(await stats(b)).toEqual({ due: 0, new: 0, learning: 0, review: 0, nextDueAt: null });
  });
});

describe('GET /api/cards/stats', () => {
  test('splits due cards by state (relearning counts as learning) and finds the next due time', async () => {
    const user = await newUser();
    const now = Date.now();
    await insertCards(user, [
      {},
      { state: 'learning', reps: 1, lastReview: now - DAY, due: now - MINUTE },
      { state: 'relearning', reps: 4, lastReview: now - DAY, due: now - MINUTE },
      { state: 'review', reps: 3, lastReview: now - 3 * DAY, due: now - DAY },
      { state: 'review', reps: 3, lastReview: now - 3 * DAY, due: now + 2 * DAY },
      { state: 'review', reps: 3, lastReview: now - 3 * DAY, due: now + DAY },
    ]);
    expect(await stats(user)).toEqual({
      due: 4,
      new: 1,
      learning: 2,
      review: 1,
      nextDueAt: now + DAY,
    });
  });
});

describe('POST /api/cards/starter/:chapterId', () => {
  const deck = getDeck('ch10');

  test("adds the chapter's deck once", async () => {
    const user = await newUser();
    const total = deck?.cards.length ?? 0;
    expect(total).toBeGreaterThan(0);

    const res = await user.api('/cards/starter/ch10', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(StarterDeckResult.parse(await res.json())).toEqual({ added: total, total });

    const again = await user.api('/cards/starter/ch10', { method: 'POST' });
    expect(StarterDeckResult.parse(await again.json())).toEqual({ added: 0, total });

    const cards = await due(user, '?limit=100');
    expect(cards).toHaveLength(Math.min(total, NEW_CARDS_PER_DAY));
    const first = deck?.cards[0];
    const stored = (await user.db.cards.select()).find((row) => row.sourceRef === first?.id);
    expect(stored).toMatchObject({ sourceKind: 'starter', front: first?.front, state: 'new' });
  });

  test('skips a deck card whose type + front the user already has', async () => {
    const user = await newUser();
    const first = deck?.cards[0];
    if (!first) throw new Error('ch10 deck is empty');
    const { type, front, back } = first;
    await user.api('/cards', {
      method: 'POST',
      body: { type, front, back, source: { kind: 'word', ref: 'x' } },
    });
    const res = await user.api('/cards/starter/ch10', { method: 'POST' });
    const total = deck.cards.length;
    expect(StarterDeckResult.parse(await res.json())).toEqual({ added: total - 1, total });
  });

  test('a chapter without a deck adds nothing; an unknown chapter is 404, a bad id 400', async () => {
    const user = await newUser();
    const noDeck = await user.api('/cards/starter/ch11', { method: 'POST' });
    expect(StarterDeckResult.parse(await noDeck.json())).toEqual({ added: 0, total: 0 });
    expect((await user.api('/cards/starter/ch99', { method: 'POST' })).status).toBe(404);
    expect((await user.api('/cards/starter/chapter-ten', { method: 'POST' })).status).toBe(400);
  });

  test("one user's starter deck doesn't count for another user", async () => {
    const a = await newUser();
    const b = await newUser();
    await a.api('/cards/starter/ch10', { method: 'POST' });
    const res = await b.api('/cards/starter/ch10', { method: 'POST' });
    const total = deck?.cards.length ?? 0;
    expect(StarterDeckResult.parse(await res.json())).toEqual({ added: total, total });
  });
});
