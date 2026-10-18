import { env } from 'cloudflare:workers';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, test } from 'vitest';
import { Card, DailyActivity, Profile, WordStatus } from '../../shared/schemas';
import { createDb, schema, scopedDb, translationCacheDb } from './index';
import { app } from '../index';
import { buildDemoData, DEMO_LOGIN, DEMO_USER_ID, seedDemo } from './seed';

const db = createDb(env.DB);
const NOW = Date.UTC(2026, 9, 18, 12, 0);

function newUserId(): string {
  return `user-${crypto.randomUUID()}`;
}

function cardContent(front: string) {
  return {
    type: 'sentence_meaning' as const,
    front,
    back: 'back',
    sourceKind: 'word' as const,
    sourceRef: 'chat',
    due: NOW,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: 'new' as const,
    lastReview: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe('migrations', () => {
  test('create every table', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%' AND name != 'd1_migrations' ORDER BY name",
    ).all<{ name: string }>();
    expect(results.map((row) => row.name)).toEqual([
      'account',
      'activity_minutes',
      'ai_daily_usage',
      'ai_usage',
      'cards',
      'daily_activity',
      'profiles',
      'rate_limit',
      'reviews',
      'session',
      'text_reads',
      'translation_cache',
      'user',
      'verification',
      'word_status',
    ]);
  });

  test('create the indexes routes rely on', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex%' ORDER BY name",
    ).all<{ name: string }>();
    expect(results.map((row) => row.name)).toEqual([
      'account_userId_idx',
      'cards_user_due_idx',
      'cards_user_type_front_uq',
      'rate_limit_key_unique',
      'reviews_user_reviewed_at_idx',
      'session_token_unique',
      'session_userId_idx',
      'user_email_unique',
      'verification_identifier_idx',
    ]);
  });
});

describe('scopedDb', () => {
  test("user A can't read, change or delete user B's rows", async () => {
    const a = scopedDb(db, newUserId());
    const b = scopedDb(db, newUserId());
    const id = crypto.randomUUID();
    await b.cards.insert({ id, ...cardContent('le chat') });
    await b.wordStatus.insert({ lemma: 'chat', status: 'known', updatedAt: NOW });

    expect(await a.cards.select()).toEqual([]);
    expect(await a.cards.select(eq(schema.cards.id, id))).toEqual([]);
    expect(await a.wordStatus.select()).toEqual([]);

    await a.cards.update({ front: 'hacked' }, eq(schema.cards.id, id));
    await a.cards.delete(eq(schema.cards.id, id));
    await a.wordStatus.delete();

    const [card] = await b.cards.select(eq(schema.cards.id, id));
    expect(card?.front).toBe('le chat');
    expect(await b.wordStatus.select()).toHaveLength(1);
  });

  test('insert always writes the scoped user id', async () => {
    const userId = newUserId();
    const user = scopedDb(db, userId);
    // A stray userId from a request body must not win over the scope.
    const forged = {
      lemma: 'chat',
      status: 'new',
      updatedAt: NOW,
      userId: 'someone-else',
    } as const;
    await user.wordStatus.insert(forged);
    const [row] = await user.wordStatus.select();
    expect(row?.userId).toBe(userId);
  });

  test('the same lemma and date are unique per user, not globally', async () => {
    const a = scopedDb(db, newUserId());
    const b = scopedDb(db, newUserId());
    for (const user of [a, b]) {
      await user.wordStatus.insert({ lemma: 'chat', status: 'new', updatedAt: NOW });
      await user.dailyActivity.insert({ date: '2026-10-18' });
      await user.cards.insert({ id: crypto.randomUUID(), ...cardContent('le chat') });
    }
    await expect(
      a.wordStatus.insert({ lemma: 'chat', status: 'known', updatedAt: NOW }),
    ).rejects.toThrow();
    await expect(
      a.cards.insert({ id: crypto.randomUUID(), ...cardContent('le chat') }),
    ).rejects.toThrow();
  });

  test('a ping counts at most one minute per clock minute', async () => {
    const user = scopedDb(db, newUserId());
    const minute = NOW - (NOW % 60_000);
    const first = await user.activityMinutes.insert({ minute }).onConflictDoNothing().returning();
    const again = await user.activityMinutes.insert({ minute }).onConflictDoNothing().returning();
    expect(first).toHaveLength(1);
    expect(again).toHaveLength(0);
  });

  test('batch runs scoped queries together, with SQL updates', async () => {
    const user = scopedDb(db, newUserId());
    await user.batch([
      user.dailyActivity.insert({ date: '2026-10-18' }),
      user.dailyActivity.update(
        { reviews: sql`${schema.dailyActivity.reviews} + 1` },
        eq(schema.dailyActivity.date, '2026-10-18'),
      ),
    ]);
    const [row] = await user.dailyActivity.select();
    expect(row).toMatchObject({ date: '2026-10-18', reviews: 1, minutes: 0, freezeUsed: false });
  });
});

describe('translationCacheDb', () => {
  test('stores one result per key', async () => {
    const cache = translationCacheDb(db);
    const row = {
      key: `k-${crypto.randomUUID()}`,
      task: 'translate',
      text: 'Le chat dort.',
      result: { translation: 'The cat sleeps.' },
      provider: 'mock',
      createdAt: NOW,
    };
    await cache.put(row);
    await cache.put({ ...row, result: { translation: 'other' } });
    expect((await cache.get(row.key))?.result).toEqual({ translation: 'The cat sleeps.' });
  });
});

describe('demo seed', () => {
  test('matches the mockups and the shared schemas', () => {
    const data = buildDemoData(NOW);
    expect(Profile.parse(data.profile).currentChapterId).toBe('ch10');
    for (const card of data.cards) Card.parse(card);
    for (const word of data.words) WordStatus.parse(word);
    for (const day of data.activity) DailyActivity.parse(day);

    expect(data.cards.filter((card) => card.due <= NOW)).toHaveLength(18);
    const states = data.cards.map((card) => card.state);
    expect(states.filter((s) => s === 'review')).toHaveLength(9);
    expect(states.filter((s) => s === 'learning')).toHaveLength(4);
    expect(states.filter((s) => s === 'new')).toHaveLength(5);

    // 11 practiced days in a row plus one freeze, ending yesterday (2026-10-17 in Toronto).
    const practiced = data.activity.filter((day) => day.reviews > 0 || day.readings > 0);
    expect(practiced.at(-1)?.date).toBe('2026-10-17');
    expect(data.activity.filter((day) => day.freezeUsed)).toEqual([
      expect.objectContaining({ date: '2026-10-12' }),
    ]);
    expect(data.activity.at(-1)).toMatchObject({ date: '2026-10-18', minutes: 8, reviews: 0 });
  });

  test('loads into D1 and can run twice', async () => {
    await seedDemo(db, NOW);
    await seedDemo(db, NOW);
    const demo = scopedDb(db, DEMO_USER_ID);
    expect(await demo.profiles.select()).toHaveLength(1);
    expect(await demo.cards.select()).toHaveLength(18);
    expect(await demo.dailyActivity.select()).toHaveLength(15);
    expect(await demo.wordStatus.select()).toHaveLength(12);
    expect(await demo.textReads.select()).toHaveLength(1);
  });

  test('makes a demo login the app can sign in with', async () => {
    await seedDemo(db, NOW);
    await seedDemo(db, NOW);
    const res = await app.request(
      'https://frenchy.test/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://frenchy.test',
          'cf-connecting-ip': `10.0.${Math.floor(Math.random() * 250)}.1`,
        },
        body: JSON.stringify({ email: DEMO_LOGIN.email, password: DEMO_LOGIN.password }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ user: { id: DEMO_USER_ID } });
  });
});
