import { eq, sql } from 'drizzle-orm';
import { Card, ReviewInput } from '../../shared/schemas';
import { grade } from '../../shared/srs';
import { localDateOf } from '../../shared/streak';
import { schema, type ScopedDb } from '../db';
import {
  clientInstant,
  loadProfile,
  notFound,
  parseInput,
  readJson,
  respond,
  syncRouter,
  toCard,
  userDb,
} from './sync-common';

const { cards, dailyActivity, reviews } = schema;

async function loadCard(db: ScopedDb, id: string) {
  const row = await db.cards.select(eq(cards.id, id)).get();
  if (!row) throw notFound('Card');
  return row;
}

/** A review id that was already applied: answer with its card as it is now. */
async function alreadyApplied(db: ScopedDb, reviewId: string): Promise<Card | undefined> {
  const done = await db.reviews.select(eq(reviews.id, reviewId)).get();
  return done && toCard(await loadCard(db, done.cardId));
}

export const reviewsRoute = syncRouter().post('/', async (c) => {
  const input = parseInput(ReviewInput, await readJson(c), 'body');
  const db = userDb(c);
  const repeat = await alreadyApplied(db, input.id);
  if (repeat) return respond(c, Card, repeat);

  const row = await loadCard(db, input.cardId);
  const { timeZone } = await loadProfile(db);
  const now = Date.now();
  // Graded at `reviewedAt`, the instant the client previewed the buttons at, so fuzz matches
  // (G-29). Never before the card's last review: ts-fsrs refuses a negative elapsed time.
  const at = Math.max(clientInstant(input.reviewedAt, now, 'reviewedAt'), row.lastReview ?? 0);
  const { card: next } = grade(toCard(row), input.rating, at);

  let updated: typeof cards.$inferSelect | undefined;
  try {
    [, [updated]] = await db.batch([
      db.reviews.insert({
        id: input.id,
        cardId: row.id,
        rating: input.rating,
        reviewedAt: at,
        durationMs: input.durationMs,
      }),
      db.cards.update({ ...next, updatedAt: now }, eq(cards.id, row.id)).returning(),
      db.dailyActivity.insert({ date: localDateOf(at, timeZone), reviews: 1 }).onConflictDoUpdate({
        target: [dailyActivity.userId, dailyActivity.date],
        set: { reviews: sql`${dailyActivity.reviews} + 1` },
      }),
    ]);
  } catch (err) {
    // A retry of the same review that ran at the same time won; this batch rolled back.
    const raced = await alreadyApplied(db, input.id);
    if (raced) return respond(c, Card, raced);
    throw err;
  }
  if (!updated) throw notFound('Card');
  return respond(c, Card, toCard(updated));
});
