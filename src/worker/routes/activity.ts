import { asc, eq, sql } from 'drizzle-orm';
import { getText } from '../../shared/content';
import {
  ActivityPing,
  DailyActivity,
  Reading,
  ReadingsResponse,
  StreakResponse,
  type LocalDate,
} from '../../shared/schemas';
import { computeStreak, localDateOf } from '../../shared/streak';
import { schema, type ScopedDb } from '../db';
import {
  clientInstant,
  loadProfile,
  notFound,
  parseInput,
  readJson,
  respond,
  syncRouter,
  userDb,
} from './sync-common';

const { dailyActivity, textReads } = schema;
const MINUTE = 60_000;

/** Adds 1 to one counter of the day's row, creating the row if needed. */
function bumpDay(db: ScopedDb, date: LocalDate, counter: 'minutes' | 'readings') {
  return db.dailyActivity
    .insert({ date, [counter]: 1 })
    .onConflictDoUpdate({
      target: [dailyActivity.userId, dailyActivity.date],
      set: { [counter]: sql`${dailyActivity[counter]} + 1` },
    })
    .returning();
}

export const activityRoute = syncRouter()
  .post('/ping', async (c) => {
    const ping = parseInput(ActivityPing, await readJson(c), 'body');
    const at = clientInstant(ping.at, Date.now(), 'at');
    const db = userDb(c);
    const { timeZone } = await loadProfile(db);
    const date = localDateOf(at, timeZone);

    // At most one minute per clock minute: a retry or a second tab finds the minute taken.
    // Two statements, not one batch: the second depends on the first. A failure in between
    // loses that minute rather than counting it twice.
    const [newMinute] = await db.activityMinutes
      .insert({ minute: at - (at % MINUTE) })
      .onConflictDoNothing()
      .returning();
    const day = newMinute
      ? (await bumpDay(db, date, 'minutes'))[0]
      : await db.dailyActivity.select(eq(dailyActivity.date, date)).get();
    const empty = { date, minutes: 0, reviews: 0, readings: 0, freezeUsed: false };
    return respond(c, DailyActivity, day ?? empty);
  })
  .get('/readings', async (c) => {
    const rows = await userDb(c).textReads.select().orderBy(asc(textReads.finishedAt));
    const first = new Map<string, number>();
    for (const row of rows) if (!first.has(row.textId)) first.set(row.textId, row.finishedAt);
    return respond(c, ReadingsResponse, {
      readings: [...first].map(([textId, finishedAt]) => ({ textId, finishedAt })),
    });
  })
  .post('/readings', async (c) => {
    const input = parseInput(Reading, await readJson(c), 'body');
    if (!getText(input.textId)) throw notFound('Text');
    const finishedAt = clientInstant(input.finishedAt, Date.now(), 'finishedAt');
    const db = userDb(c);
    const { timeZone } = await loadProfile(db);
    const date = localDateOf(finishedAt, timeZone);

    // One `text_reads` row per text per day, so a reading counts once per text per day.
    const [newToday] = await db.textReads
      .insert({ textId: input.textId, date, finishedAt })
      .onConflictDoNothing()
      .returning();
    if (newToday) await bumpDay(db, date, 'readings');

    const first = await db.textReads
      .select(eq(textReads.textId, input.textId))
      .orderBy(asc(textReads.finishedAt))
      .limit(1)
      .get();
    return respond(c, Reading, {
      textId: input.textId,
      finishedAt: first?.finishedAt ?? finishedAt,
    });
  });

export const streakRoute = syncRouter().get('/', async (c) => {
  const db = userDb(c);
  const { timeZone } = await loadProfile(db);
  const today = localDateOf(Date.now(), timeZone);
  // Every row, not a recent window: freezes depend on the whole run (G-31, L-39). There is one
  // row per active day, so this stays small. `freezeUsed` is ignored (L-38).
  const rows = (await db.dailyActivity.select()).map((row) => DailyActivity.parse(row));
  const { calendar, ...summary } = computeStreak(rows, today);
  return respond(c, StreakResponse, {
    ...summary,
    today,
    todayMinutes: rows.find((row) => row.date === today)?.minutes ?? 0,
    calendar,
  });
});
