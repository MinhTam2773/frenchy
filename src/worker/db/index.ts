import { and, eq, type SQL } from 'drizzle-orm';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';
import {
  activityMinutes,
  cards,
  dailyActivity,
  profiles,
  reviews,
  textReads,
  translationCache,
  wordStatus,
} from './schema';

export { schema };
export type Db = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}

type UserTable =
  | typeof profiles
  | typeof cards
  | typeof reviews
  | typeof wordStatus
  | typeof dailyActivity
  | typeof activityMinutes
  | typeof textReads;

/** Insert values without `userId`: the scope fills it in. */
export type ScopedInsert<T extends UserTable> = Omit<T['$inferInsert'], 'userId'>;

/**
 * Query builders for one user table, every one pinned to `userId`. They are not awaited, so the
 * caller can `await` one or pass several to `batch()`. Extra conditions are AND-ed with the
 * user filter, and drizzle's types don't allow a second `.where()` that could replace it.
 */
function scopedTable<T extends UserTable>(db: Db, table: T, userId: string) {
  // The union's `userId` columns are all `text NOT NULL`; TypeScript can't pick one generically.
  const userColumn = table.userId as typeof cards.userId;
  const own = (where?: SQL) => and(eq(userColumn, userId), where);
  const withUser = (row: ScopedInsert<T>) => ({ ...row, userId }) as T['$inferInsert'];

  return {
    select: (where?: SQL) => db.select().from(table).where(own(where)),
    insert: (rows: ScopedInsert<T> | ScopedInsert<T>[]) =>
      db.insert(table).values(Array.isArray(rows) ? rows.map(withUser) : [withUser(rows)]),
    /** `set` values may be SQL expressions, e.g. minutes: sql`minutes + 1`. */
    update: (set: Omit<SQLiteUpdateSetSource<T>, 'userId'>, where?: SQL) =>
      db
        .update(table)
        .set(set as SQLiteUpdateSetSource<T>)
        .where(own(where)),
    delete: (where?: SQL) => db.delete(table).where(own(where)),
  };
}

/**
 * The only way routes reach user data (CLAUDE.md: D1 has no row-level security). `userId`
 * comes from the session, never from the request.
 */
export function scopedDb(db: Db, userId: string) {
  return {
    userId,
    profiles: scopedTable(db, profiles, userId),
    cards: scopedTable(db, cards, userId),
    reviews: scopedTable(db, reviews, userId),
    wordStatus: scopedTable(db, wordStatus, userId),
    dailyActivity: scopedTable(db, dailyActivity, userId),
    activityMinutes: scopedTable(db, activityMinutes, userId),
    textReads: scopedTable(db, textReads, userId),
    /** Runs the queries in one D1 transaction. */
    batch: db.batch.bind(db),
  };
}
export type ScopedDb = ReturnType<typeof scopedDb>;

/** Not user data: one AI result per key, shared by everyone (T-23). */
export function translationCacheDb(db: Db) {
  return {
    get: (key: string) =>
      db.select().from(translationCache).where(eq(translationCache.key, key)).get(),
    put: (row: typeof translationCache.$inferInsert) =>
      db.insert(translationCache).values(row).onConflictDoNothing(),
  };
}
