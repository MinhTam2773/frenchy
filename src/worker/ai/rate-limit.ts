import { lt, sql } from 'drizzle-orm';
import { aiDailyUsageDb, schema, type Db, type ScopedDb } from '../db';
import type { AiSettings } from './config';

/** Provider calls allowed per user per clock hour. */
export const AI_REQUESTS_PER_HOUR = 60;

/**
 * Provider calls allowed for the whole app per UTC day, unless `AI_DAILY_LIMIT` says otherwise
 * (G-10): many accounts can't run up a bill beyond this × the driver's `max_tokens`.
 */
export const AI_REQUESTS_PER_DAY = 1000;

/** Share of the daily cap at which one warning is logged. */
const WARN_AT = 0.8;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Counts one provider call for the user and says whether it is within this hour's limit. */
export async function consumeAiRequest(user: ScopedDb, now: number): Promise<RateLimitResult> {
  const windowStart = now - (now % HOUR_MS);
  const { aiUsage } = schema;
  const [, counted] = await user.batch([
    user.aiUsage.delete(lt(aiUsage.windowStart, windowStart)),
    user.aiUsage
      .insert({ windowStart, requests: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.windowStart],
        set: { requests: sql`${aiUsage.requests} + 1` },
      })
      .returning({ requests: aiUsage.requests }),
  ]);
  const requests = counted[0]?.requests ?? 1;
  if (requests <= AI_REQUESTS_PER_HOUR) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.ceil((windowStart + HOUR_MS - now) / 1000) };
}

/** The app-wide daily cap: `AI_DAILY_LIMIT` when it is a positive integer, else the default. */
export function dailyLimit(env: AiSettings): number {
  const fromEnv = Number(env.AI_DAILY_LIMIT);
  return Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : AI_REQUESTS_PER_DAY;
}

/** Counts one provider call for the whole app and says whether today's (UTC) cap allows it. */
export async function consumeAppAiRequest(
  db: Db,
  now: number,
  limit: number,
): Promise<RateLimitResult> {
  const dayStart = now - (now % DAY_MS);
  const requests = await aiDailyUsageDb(db).count(new Date(dayStart).toISOString().slice(0, 10));
  if (requests === Math.ceil(limit * WARN_AT)) {
    console.warn(`AI daily cap: ${requests} of ${limit} provider calls used today (UTC)`);
  }
  if (requests <= limit) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.ceil((dayStart + DAY_MS - now) / 1000) };
}
