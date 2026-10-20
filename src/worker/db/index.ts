import { and, eq, getTableName, is, sql, type SQL } from 'drizzle-orm';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { getTableConfig, SQLiteTable, type SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core';
import { account, session, user } from '../auth/schema';
import * as schema from './schema';
import {
  activityMinutes,
  aiDailyUsage,
  aiUsage,
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
  | typeof textReads
  | typeof aiUsage;

/**
 * Every table of ours with a `user_id` column, found in the schema so that a new user table is
 * exported and deleted with the account without anyone remembering (B-16, G-36).
 */
export const USER_TABLES = Object.values(schema).filter(
  (table): table is UserTable =>
    is(table, SQLiteTable) && getTableConfig(table).columns.some((c) => c.name === 'user_id'),
);

type BatchQueries = Parameters<Db['batch']>[0];

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
    aiUsage: scopedTable(db, aiUsage, userId),
    /** Runs the queries in one D1 transaction. */
    batch: db.batch.bind(db),
    /** Every row of this user in every user table, keyed by table name, read in one transaction. */
    async exportAll(): Promise<Record<string, Record<string, unknown>[]>> {
      const queries = USER_TABLES.map((table) => scopedTable(db, table, userId).select());
      const results = (await db.batch(queries as unknown as BatchQueries)) as unknown as Record<
        string,
        unknown
      >[][];
      return Object.fromEntries(USER_TABLES.map((table, i) => [getTableName(table), results[i]]));
    },
    /**
     * Deletes the account in one D1 transaction: every user table's rows, then Better Auth's
     * sessions, accounts and the user. Nothing links our tables to `user` (G-36), so each is
     * named here.
     */
    async deleteAccount(): Promise<void> {
      const queries = [
        ...USER_TABLES.map((table) => scopedTable(db, table, userId).delete()),
        db.delete(session).where(eq(session.userId, userId)),
        db.delete(account).where(eq(account.userId, userId)),
        db.delete(user).where(eq(user.id, userId)),
      ];
      await db.batch(queries as unknown as BatchQueries);
    },
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

/** Not user data: provider calls per UTC day for the whole app (T-29 daily cap). */
export function aiDailyUsageDb(db: Db) {
  return {
    /** Adds one provider call to `day` (`YYYY-MM-DD`, UTC) and returns that day's total. */
    async count(day: string): Promise<number> {
      const [row] = await db
        .insert(aiDailyUsage)
        .values({ day, requests: 1 })
        .onConflictDoUpdate({
          target: aiDailyUsage.day,
          set: { requests: sql`${aiDailyUsage.requests} + 1` },
        })
        .returning({ requests: aiDailyUsage.requests });
      return row?.requests ?? 1;
    },
  };
}
