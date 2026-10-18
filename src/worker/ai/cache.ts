import type { z } from 'zod';
import { translationCacheDb, type Db } from '../db';

// Bump when a prompt changes, so answers to the old prompt stop being served.
const PROMPT_VERSION = 'v1';

/** Variants that can't change the meaning share one cache entry. Case and accents are kept. */
export function normalizeText(text: string): string {
  return text.normalize('NFC').replace(/['ʼ]/g, '’').replace(/\s+/g, ' ').trim();
}

/** SHA-256 (hex) of prompt version + task + normalized text + level. */
export async function cacheKey(task: string, text: string, level: string): Promise<string> {
  const input = [PROMPT_VERSION, task, normalizeText(text), level].join('\u0000');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface CacheEntry<T> {
  task: string;
  text: string;
  level: string;
  schema: z.ZodType<T>;
}

/**
 * The cached result for this entry, or the provider's (then stored). Each text costs at most
 * one provider call per task and level. A cached row that no longer matches the schema is
 * treated as a miss.
 */
export async function cached<T>(
  db: Db,
  entry: CacheEntry<T>,
  onMiss: () => Promise<{ result: T; provider: string }>,
): Promise<T> {
  const cache = translationCacheDb(db);
  const key = await cacheKey(entry.task, entry.text, entry.level);
  const row = await cache.get(key);
  const hit = row && entry.schema.safeParse(row.result);
  if (hit?.success) return hit.data;

  const { result, provider } = await onMiss();
  await cache.put({
    key,
    task: entry.task,
    text: normalizeText(entry.text),
    result,
    provider,
    createdAt: Date.now(),
  });
  return result;
}
