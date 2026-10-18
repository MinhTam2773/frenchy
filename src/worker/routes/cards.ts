import { and, asc, eq, gt, gte, like, lte, ne } from 'drizzle-orm';
import { NEW_CARDS_PER_DAY } from '../../shared/constants';
import { getChapter, getDeck } from '../../shared/content';
import {
  Card,
  CardCreate,
  CardStats,
  ChapterId,
  DueCardsQuery,
  DueCardsResponse,
  StarterDeckResult,
  type DeckCard,
} from '../../shared/schemas';
import { newCard } from '../../shared/srs';
import { localDateOf } from '../../shared/streak';
import { schema, type ScopedDb } from '../db';
import {
  loadProfile,
  notFound,
  parseInput,
  readJson,
  respond,
  syncRouter,
  toCard,
  toCardRow,
  userDb,
} from './sync-common';

const { cards, reviews } = schema;

/** A local day is at most 26 hours long, so this window always holds all of today's reviews. */
const TODAY_WINDOW_MS = 2 * 24 * 60 * 60_000;

/**
 * New cards the user may still start today (`NEW_CARDS_PER_DAY` minus those first graded today).
 * There is no "first reviewed at" column: a card was new this morning when every one of its
 * `reps` happened today.
 */
async function newCardsLeftToday(db: ScopedDb, now: number): Promise<number> {
  const { timeZone } = await loadProfile(db);
  const today = localDateOf(now, timeZone);
  const isToday = (at: number) => localDateOf(at, timeZone) === today;
  const since = now - TODAY_WINDOW_MS;
  const [recentReviews, recentCards] = await Promise.all([
    db.reviews.select(gte(reviews.reviewedAt, since)),
    db.cards.select(and(ne(cards.state, 'new'), gte(cards.lastReview, since))),
  ]);

  const repsToday = new Map<string, number>();
  for (const review of recentReviews) {
    if (isToday(review.reviewedAt)) {
      repsToday.set(review.cardId, (repsToday.get(review.cardId) ?? 0) + 1);
    }
  }
  const startedToday = recentCards.filter((card) => card.reps === repsToday.get(card.id)).length;
  return Math.max(0, NEW_CARDS_PER_DAY - startedToday);
}

function dueNew(db: ScopedDb, now: number) {
  return db.cards
    .select(and(eq(cards.state, 'new'), lte(cards.due, now)))
    .orderBy(asc(cards.due), asc(cards.createdAt));
}

function dueStarted(db: ScopedDb, now: number) {
  return db.cards.select(and(ne(cards.state, 'new'), lte(cards.due, now))).orderBy(asc(cards.due));
}

function deckCardCreate(deckCard: DeckCard): CardCreate {
  const { id, type, front, back, clozeAnswer, hint, note } = deckCard;
  return { type, front, back, clozeAnswer, hint, note, source: { kind: 'starter', ref: id } };
}

function cardFor(input: CardCreate, now: number): Card {
  return { id: crypto.randomUUID(), ...input, ...newCard(now), createdAt: now, updatedAt: now };
}

export const cardsRoute = syncRouter()
  .get('/due', async (c) => {
    const { limit } = parseInput(DueCardsQuery, c.req.query(), 'query');
    const db = userDb(c);
    const now = Date.now();
    const newLeft = await newCardsLeftToday(db, now);
    const [started, fresh] = await Promise.all([
      dueStarted(db, now).limit(limit),
      dueNew(db, now).limit(Math.min(limit, newLeft)),
    ]);
    // Most overdue first, new and started cards mixed.
    const due = [...started, ...fresh].sort((a, b) => a.due - b.due).slice(0, limit);
    return respond(c, DueCardsResponse, { cards: due.map(toCard) });
  })
  .get('/stats', async (c) => {
    const db = userDb(c);
    const now = Date.now();
    const [newLeft, started, fresh, next] = await Promise.all([
      newCardsLeftToday(db, now),
      dueStarted(db, now),
      dueNew(db, now),
      db.cards.select(gt(cards.due, now)).orderBy(asc(cards.due)).limit(1).get(),
    ]);
    const learning = started.filter((card) => card.state !== 'review').length;
    const review = started.length - learning;
    const newCount = Math.min(fresh.length, newLeft);
    // New cards held back by the daily cap don't move `nextDueAt` (it stays the next due time).
    return respond(c, CardStats, {
      due: newCount + learning + review,
      new: newCount,
      learning,
      review,
      nextDueAt: next?.due ?? null,
    });
  })
  .post('/', async (c) => {
    const input = parseInput(CardCreate, await readJson(c), 'body');
    const db = userDb(c);
    const [inserted] = await db.cards
      .insert(toCardRow(cardFor(input, Date.now())))
      .onConflictDoNothing()
      .returning();
    if (inserted) return respond(c, Card, toCard(inserted), 201);

    // Same type + front already exists (unique index): that card is the answer.
    const existing = await db.cards
      .select(and(eq(cards.type, input.type), eq(cards.front, input.front)))
      .get();
    if (!existing) throw new Error('Card insert conflicted but no matching card exists');
    return respond(c, Card, toCard(existing));
  })
  .post('/starter/:chapterId', async (c) => {
    const chapterId = parseInput(ChapterId, c.req.param('chapterId'), 'chapter id');
    if (!getChapter(chapterId)) throw notFound('Chapter');
    const deck = getDeck(chapterId)?.cards ?? [];

    const db = userDb(c);
    const owned = await db.cards.select(
      and(eq(cards.sourceKind, 'starter'), like(cards.sourceRef, `${chapterId}-%`)),
    );
    const ownedRefs = new Set(owned.map((card) => card.sourceRef));
    const now = Date.now();
    // One statement per card (D1's 100-parameter limit, L-23); a card whose type + front the
    // user already has is skipped by the unique index.
    const inserts = deck
      .filter((deckCard) => !ownedRefs.has(deckCard.id))
      .map((deckCard) =>
        db.cards
          .insert(toCardRow(cardFor(deckCardCreate(deckCard), now)))
          .onConflictDoNothing()
          .returning({ id: cards.id }),
      );
    const [first, ...rest] = inserts;
    const results = first ? await db.batch([first, ...rest]) : [];
    const added = results.filter((rows) => rows.length > 0).length;
    return respond(c, StarterDeckResult, { added, total: deck.length });
  });
