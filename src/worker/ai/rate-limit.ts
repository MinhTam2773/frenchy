import { lt, sql } from 'drizzle-orm';
import { schema, type ScopedDb } from '../db';

/** Provider calls allowed per user per clock hour (G-10: the only AI cost control for now). */
export const AI_REQUESTS_PER_HOUR = 60;

const HOUR_MS = 3_600_000;

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
